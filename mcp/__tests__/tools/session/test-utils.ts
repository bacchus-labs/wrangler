/**
 * Test utilities for session tools
 */

import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import * as fsExtra from 'fs-extra';

// ESM compat
const fs = (fsExtra as any).default || fsExtra;

import {
  Session,
  SessionCheckpoint,
  AuditEntry,
  SessionStatus,
} from '../../../src/types/session';
import { SessionStorageProvider, SessionStorageConfig } from '../../../src/providers/session-storage';

/**
 * Mock session storage provider for unit testing
 */
export class MockSessionStorageProvider extends SessionStorageProvider {
  private sessions: Map<string, Session> = new Map();
  private checkpoints: Map<string, SessionCheckpoint> = new Map();
  private auditEntries: Map<string, AuditEntry[]> = new Map();
  private blockers: Map<string, Record<string, unknown>> = new Map();
  private checkpointCounter = 1;

  // Control behavior for testing
  public shouldThrowOnCreate = false;
  public shouldThrowOnGet = false;
  public shouldThrowOnUpdate = false;
  public shouldThrowOnSaveCheckpoint = false;
  public shouldThrowOnGetCheckpoint = false;
  public shouldThrowOnAppendAudit = false;
  public shouldThrowOnFindIncomplete = false;
  public shouldThrowOnListSessions = false;

  constructor(config?: SessionStorageConfig) {
    super(config || { basePath: '/tmp/mock-sessions' });
  }

  async createSession(session: Session): Promise<void> {
    if (this.shouldThrowOnCreate) {
      throw new Error('Mock error: Failed to create session');
    }
    this.sessions.set(session.id, { ...session });
    this.auditEntries.set(session.id, []);
    // Add initial audit entry
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

  async getSession(sessionId: string): Promise<Session | null> {
    if (this.shouldThrowOnGet) {
      throw new Error('Mock error: Failed to get session');
    }
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : null;
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    if (this.shouldThrowOnUpdate) {
      throw new Error('Mock error: Failed to update session');
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const updated: Session = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, updated);
    return { ...updated };
  }

  async saveCheckpoint(checkpoint: SessionCheckpoint): Promise<void> {
    if (this.shouldThrowOnSaveCheckpoint) {
      throw new Error('Mock error: Failed to save checkpoint');
    }
    this.checkpoints.set(checkpoint.sessionId, { ...checkpoint });
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

  async getCheckpoint(sessionId: string): Promise<SessionCheckpoint | null> {
    if (this.shouldThrowOnGetCheckpoint) {
      throw new Error('Mock error: Failed to get checkpoint');
    }
    const checkpoint = this.checkpoints.get(sessionId);
    return checkpoint ? { ...checkpoint } : null;
  }

  async appendAuditEntry(sessionId: string, entry: AuditEntry): Promise<void> {
    if (this.shouldThrowOnAppendAudit) {
      throw new Error('Mock error: Failed to append audit entry');
    }
    const entries = this.auditEntries.get(sessionId) || [];
    entries.push({ ...entry });
    this.auditEntries.set(sessionId, entries);
  }

  async getAuditEntries(sessionId: string): Promise<AuditEntry[]> {
    return [...(this.auditEntries.get(sessionId) || [])];
  }

  async findIncompleteSession(): Promise<Session | null> {
    if (this.shouldThrowOnFindIncomplete) {
      throw new Error('Mock error: Failed to find incomplete session');
    }
    // Sort by startedAt descending (most recent first)
    const sorted = Array.from(this.sessions.values()).sort(
      (a, b) => b.startedAt.localeCompare(a.startedAt)
    );
    for (const session of sorted) {
      if (session.status === 'running' || session.status === 'paused') {
        return { ...session };
      }
    }
    return null;
  }

  async listSessions(filters?: { status?: string[] }): Promise<Session[]> {
    if (this.shouldThrowOnListSessions) {
      throw new Error('Mock error: Failed to list sessions');
    }
    let sessions = Array.from(this.sessions.values());
    if (filters?.status) {
      sessions = sessions.filter(s => filters.status!.includes(s.status));
    }
    return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  generateCheckpointId(): string {
    return `chk-${Date.now()}-${this.checkpointCounter++}`;
  }

  async getBlocker(sessionId: string): Promise<Record<string, unknown> | null> {
    const blocker = this.blockers.get(sessionId);
    return blocker ? { ...blocker } : null;
  }

  // Test helper methods
  setBlocker(sessionId: string, blocker: Record<string, unknown>): void {
    this.blockers.set(sessionId, { ...blocker });
  }

  reset(): void {
    this.sessions.clear();
    this.checkpoints.clear();
    this.auditEntries.clear();
    this.blockers.clear();
    this.checkpointCounter = 1;
    this.shouldThrowOnCreate = false;
    this.shouldThrowOnGet = false;
    this.shouldThrowOnUpdate = false;
    this.shouldThrowOnSaveCheckpoint = false;
    this.shouldThrowOnGetCheckpoint = false;
    this.shouldThrowOnAppendAudit = false;
    this.shouldThrowOnFindIncomplete = false;
    this.shouldThrowOnListSessions = false;
  }

  addSession(session: Session): void {
    this.sessions.set(session.id, { ...session });
    this.auditEntries.set(session.id, []);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

/**
 * Create a test session
 */
export function createTestSession(overrides?: Partial<Session>): Session {
  const now = new Date().toISOString();
  return {
    id: 'test-session-001',
    specFile: 'test-spec.md',
    status: 'running',
    currentPhase: 'init',
    worktreePath: '/tmp/test-worktree',
    branchName: 'wrangler/test-spec/test-session-001',
    phasesCompleted: ['init'],
    tasksCompleted: [],
    tasksPending: [],
    startedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test checkpoint
 */
export function createTestCheckpoint(
  sessionId: string,
  overrides?: Partial<SessionCheckpoint>
): SessionCheckpoint {
  const now = new Date().toISOString();
  return {
    sessionId,
    checkpointId: `chk-${Date.now()}-test`,
    createdAt: now,
    currentPhase: 'execute',
    tasksCompleted: ['task-1', 'task-2'],
    tasksPending: ['task-3', 'task-4'],
    variables: { lastCommit: 'abc123' },
    lastAction: 'Completed task-2',
    resumeInstructions: 'Continue with task-3',
    ...overrides,
  };
}

/**
 * Create a temporary directory for file-based tests
 */
export async function createTempDir(): Promise<string> {
  const tempDir = path.join(process.cwd(), 'test-temp', `session-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  await fs.ensureDir(tempDir);
  return tempDir;
}

/**
 * Clean up a temporary directory
 * CRITICAL: Must remove git worktrees before deleting directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  // Find and remove any git worktrees created inside the temp directory
  try {
    const result = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    });

    // Parse worktree paths from porcelain output
    const worktreePaths = result
      .split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.replace('worktree ', '').trim())
      .filter(p => p.startsWith(tempDir));

    // Remove each worktree found inside tempDir
    for (const worktreePath of worktreePaths) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          stdio: 'ignore'
        });
      } catch (e) {
        // If removal fails, try pruning and continue
        try {
          execSync('git worktree prune', { stdio: 'ignore' });
        } catch (pruneError) {
          // Ignore prune errors
        }
      }
    }

    // Prune stale worktree metadata
    execSync('git worktree prune', { stdio: 'ignore' });
  } catch (e) {
    // Not in a git repo or no worktrees - that's fine
  }

  // Now safe to remove the directory
  await fs.remove(tempDir);
}

/**
 * Create a mock spec file in the specified directory
 */
export async function createMockSpecFile(dirPath: string, specName: string = 'test-spec.md'): Promise<string> {
  const specPath = path.join(dirPath, specName);
  await fs.ensureDir(path.dirname(specPath));
  await fs.writeFile(specPath, `# Test Specification\n\nThis is a test spec file.`);
  return specPath;
}
