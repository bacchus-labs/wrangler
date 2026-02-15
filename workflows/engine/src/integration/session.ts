/**
 * Integration with the existing MCP session storage system.
 * Bridges the workflow engine's audit log with the MCP session audit trail.
 */

import * as path from 'path';
import * as crypto from 'crypto';
import * as fsExtra from 'fs-extra';
import type { WorkflowAuditEntry } from '../types.js';
import type { WorkflowResult } from '../state.js';

// ESM compat
const fs = (fsExtra as any).default || fsExtra;

export interface SessionConfig {
  /** Base path for the project (where .wrangler/ lives) */
  basePath: string;
  /** Spec file being implemented */
  specFile: string;
  /** Working directory / worktree path */
  worktreePath: string;
  /** Git branch name */
  branchName: string;
}

/**
 * Manages workflow session state using the same directory structure
 * as the existing MCP SessionStorageProvider.
 */
export class WorkflowSessionManager {
  private sessionsDir: string;
  private sessionId: string | null = null;

  constructor(private config: SessionConfig) {
    this.sessionsDir = path.join(config.basePath, '.wrangler', 'sessions');
  }

  /**
   * Create a new session for this workflow run.
   */
  async createSession(): Promise<string> {
    const id = this.generateSessionId();
    this.sessionId = id;

    const sessionDir = path.join(this.sessionsDir, id);
    await fs.ensureDir(sessionDir);

    const context = {
      id,
      specFile: this.config.specFile,
      status: 'running',
      currentPhase: 'init',
      worktreePath: this.config.worktreePath,
      branchName: this.config.branchName,
      phasesCompleted: [],
      tasksCompleted: [],
      tasksPending: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fs.writeJson(path.join(sessionDir, 'context.json'), context, { spaces: 2 });

    // Write init audit entry
    await this.appendAuditEntry({
      step: 'init',
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: {
        session_id: id,
        worktree: this.config.worktreePath,
        branch: this.config.branchName,
        spec_file: this.config.specFile,
      },
    });

    return id;
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Append a workflow audit entry to the session's audit.jsonl.
   */
  async appendAuditEntry(entry: WorkflowAuditEntry): Promise<void> {
    if (!this.sessionId) return;

    const auditPath = path.join(this.sessionsDir, this.sessionId, 'audit.jsonl');
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(auditPath, line);
  }

  /**
   * Save a checkpoint for resumability.
   */
  async saveCheckpoint(data: {
    currentPhase: string;
    variables: Record<string, unknown>;
    completedPhases?: string[];
    changedFiles?: string[];
    tasksCompleted: string[];
    tasksPending: string[];
  }): Promise<void> {
    if (!this.sessionId) return;

    const checkpointId = `chk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const checkpoint = {
      sessionId: this.sessionId,
      checkpointId,
      createdAt: new Date().toISOString(),
      ...data,
      lastAction: data.currentPhase,
      resumeInstructions: `Resume from phase "${data.currentPhase}" using --resume ${this.sessionId}`,
    };

    const checkpointPath = path.join(this.sessionsDir, this.sessionId, 'checkpoint.json');
    await fs.writeJson(checkpointPath, checkpoint, { spaces: 2 });

    // Update session context
    const contextPath = path.join(this.sessionsDir, this.sessionId, 'context.json');
    if (await fs.pathExists(contextPath)) {
      const context = await fs.readJson(contextPath);
      context.currentPhase = data.currentPhase;
      context.tasksCompleted = data.tasksCompleted;
      context.tasksPending = data.tasksPending;
      if (data.completedPhases) {
        context.phasesCompleted = data.completedPhases;
      }
      context.updatedAt = new Date().toISOString();
      await fs.writeJson(contextPath, context, { spaces: 2 });
    }
  }

  /**
   * Load checkpoint data for resuming.
   */
  async loadCheckpoint(sessionId: string): Promise<{
    currentPhase: string;
    variables: Record<string, unknown>;
    completedPhases?: string[];
    changedFiles?: string[];
    tasksCompleted: string[];
    tasksPending: string[];
  } | null> {
    const checkpointPath = path.join(this.sessionsDir, sessionId, 'checkpoint.json');
    if (!await fs.pathExists(checkpointPath)) {
      return null;
    }

    const checkpoint = await fs.readJson(checkpointPath);
    return {
      currentPhase: checkpoint.currentPhase ?? checkpoint.lastAction,
      variables: checkpoint.variables ?? {},
      completedPhases: checkpoint.completedPhases ?? [],
      changedFiles: checkpoint.changedFiles ?? [],
      tasksCompleted: checkpoint.tasksCompleted ?? [],
      tasksPending: checkpoint.tasksPending ?? [],
    };
  }

  /**
   * Mark session as complete.
   */
  async completeSession(result: WorkflowResult): Promise<void> {
    if (!this.sessionId) return;

    const contextPath = path.join(this.sessionsDir, this.sessionId, 'context.json');
    if (await fs.pathExists(contextPath)) {
      const context = await fs.readJson(contextPath);
      context.status = result.status === 'completed' ? 'completed' : 'failed';
      context.phasesCompleted = result.completedPhases;
      context.completedAt = new Date().toISOString();
      context.updatedAt = new Date().toISOString();
      await fs.writeJson(contextPath, context, { spaces: 2 });
    }

    await this.appendAuditEntry({
      step: 'complete',
      status: result.status === 'completed' ? 'completed' : 'failed',
      timestamp: new Date().toISOString(),
      metadata: {
        completedPhases: result.completedPhases,
        error: result.error,
      },
    });
  }

  /**
   * Write blocker details when workflow is paused.
   */
  async writeBlocker(blockerDetails: string): Promise<void> {
    if (!this.sessionId) return;

    const blockerPath = path.join(this.sessionsDir, this.sessionId, 'blocker.json');
    await fs.writeJson(blockerPath, {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      details: blockerDetails,
    }, { spaces: 2 });

    // Update session status
    const contextPath = path.join(this.sessionsDir, this.sessionId, 'context.json');
    if (await fs.pathExists(contextPath)) {
      const context = await fs.readJson(contextPath);
      context.status = 'paused';
      context.updatedAt = new Date().toISOString();
      await fs.writeJson(contextPath, context, { spaces: 2 });
    }
  }

  /**
   * Get all audit entries for a session.
   */
  async getAuditEntries(sessionId?: string): Promise<WorkflowAuditEntry[]> {
    const id = sessionId ?? this.sessionId;
    if (!id) return [];

    const auditPath = path.join(this.sessionsDir, id, 'audit.jsonl');
    if (!await fs.pathExists(auditPath)) {
      return [];
    }

    const content = await fs.readFile(auditPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line: string) => JSON.parse(line));
  }

  private generateSessionId(): string {
    const date = new Date().toISOString().slice(0, 10);
    const random = crypto.randomBytes(4).toString('hex');
    return `wf-${date}-${random}`;
  }
}
