/**
 * Session storage provider for orchestration workflows
 */

import * as path from 'path';
import * as crypto from 'crypto';
import fs from 'fs-extra';
import { Dirent } from 'fs';

import { Session, SessionCheckpoint, AuditEntry } from '../types/session.js';

export interface SessionStorageConfig {
  basePath: string;
}

/**
 * Provides file-based storage for orchestration sessions
 */
export class SessionStorageProvider {
  private basePath: string;
  private sessionsDir: string;

  constructor(config: SessionStorageConfig) {
    this.basePath = config.basePath;
    this.sessionsDir = path.join(this.basePath, '.wrangler', 'sessions');
  }

  /**
   * Get the directory path for a session
   */
  getSessionDir(sessionId: string): string {
    return path.join(this.sessionsDir, sessionId);
  }

  /**
   * Create a new session
   */
  async createSession(session: Session): Promise<void> {
    const sessionDir = this.getSessionDir(session.id);
    await fs.ensureDir(sessionDir);

    // Write session context
    const contextPath = path.join(sessionDir, 'context.json');
    await fs.writeJson(contextPath, session, { spaces: 2 });

    // Write initial audit entry
    await this.appendAuditEntry(session.id, {
      phase: 'init',
      timestamp: session.startedAt,
      status: 'complete',
      session_id: session.id,
      worktree: session.worktreePath,
      branch: session.branchName,
      spec_file: session.specFile,
    });
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const contextPath = path.join(this.getSessionDir(sessionId), 'context.json');

    if (!await fs.pathExists(contextPath)) {
      return null;
    }

    return await fs.readJson(contextPath);
  }

  /**
   * Update a session
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const updated: Session = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const contextPath = path.join(this.getSessionDir(sessionId), 'context.json');
    await fs.writeJson(contextPath, updated, { spaces: 2 });

    return updated;
  }

  /**
   * Save a checkpoint for session recovery
   */
  async saveCheckpoint(checkpoint: SessionCheckpoint): Promise<void> {
    const sessionDir = this.getSessionDir(checkpoint.sessionId);
    await fs.ensureDir(sessionDir);

    // Write checkpoint
    const checkpointPath = path.join(sessionDir, 'checkpoint.json');
    await fs.writeJson(checkpointPath, checkpoint, { spaces: 2 });

    // Update session with checkpoint info
    await this.updateSession(checkpoint.sessionId, {
      tasksCompleted: checkpoint.tasksCompleted,
      tasksPending: checkpoint.tasksPending,
      currentPhase: checkpoint.currentPhase,
    });

    // Write audit entry
    await this.appendAuditEntry(checkpoint.sessionId, {
      phase: 'checkpoint',
      timestamp: checkpoint.createdAt,
      status: 'complete',
      checkpoint_id: checkpoint.checkpointId,
      tasks_completed: checkpoint.tasksCompleted.length,
      tasks_pending: checkpoint.tasksPending.length,
    });
  }

  /**
   * Get the latest checkpoint for a session
   */
  async getCheckpoint(sessionId: string): Promise<SessionCheckpoint | null> {
    const checkpointPath = path.join(this.getSessionDir(sessionId), 'checkpoint.json');

    if (!await fs.pathExists(checkpointPath)) {
      return null;
    }

    return await fs.readJson(checkpointPath);
  }

  /**
   * Get the blocker for a session (if paused)
   */
  async getBlocker(sessionId: string): Promise<Record<string, unknown> | null> {
    const blockerPath = path.join(this.getSessionDir(sessionId), 'blocker.json');

    if (!await fs.pathExists(blockerPath)) {
      return null;
    }

    return await fs.readJson(blockerPath);
  }

  /**
   * Append an audit entry to the session's audit log
   */
  async appendAuditEntry(sessionId: string, entry: AuditEntry): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);
    await fs.ensureDir(sessionDir);

    const auditPath = path.join(sessionDir, 'audit.jsonl');
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(auditPath, line);
  }

  /**
   * Get all audit entries for a session
   */
  async getAuditEntries(sessionId: string): Promise<AuditEntry[]> {
    const auditPath = path.join(this.getSessionDir(sessionId), 'audit.jsonl');

    if (!await fs.pathExists(auditPath)) {
      return [];
    }

    const content = await fs.readFile(auditPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line: string) => JSON.parse(line));
  }

  /**
   * Find the most recent incomplete session
   */
  async findIncompleteSession(): Promise<Session | null> {
    if (!await fs.pathExists(this.sessionsDir)) {
      return null;
    }

    const entries: Dirent[] = await fs.readdir(this.sessionsDir, { withFileTypes: true });
    const sessionDirs = entries
      .filter((e: Dirent) => e.isDirectory())
      .map((e: Dirent) => e.name)
      .sort()
      .reverse(); // Most recent first (IDs start with date)

    for (const sessionId of sessionDirs) {
      const session = await this.getSession(sessionId);
      if (session && (session.status === 'running' || session.status === 'paused')) {
        return session;
      }
    }

    return null;
  }

  /**
   * List all sessions
   */
  async listSessions(filters?: { status?: string[] }): Promise<Session[]> {
    if (!await fs.pathExists(this.sessionsDir)) {
      return [];
    }

    const entries: Dirent[] = await fs.readdir(this.sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e: Dirent) => e.isDirectory()).map((e: Dirent) => e.name);

    const sessions: Session[] = [];
    for (const sessionId of sessionDirs) {
      const session = await this.getSession(sessionId);
      if (session) {
        if (filters?.status && !filters.status.includes(session.status)) {
          continue;
        }
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  /**
   * Generate a unique checkpoint ID
   */
  generateCheckpointId(): string {
    return `chk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}
