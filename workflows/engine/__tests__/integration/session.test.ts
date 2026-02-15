/**
 * Tests for WorkflowSessionManager.
 *
 * Uses REAL filesystem operations -- no mocks except for the passage of time.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { WorkflowSessionManager, type SessionConfig } from '../../src/integration/session.js';
import type { WorkflowAuditEntry } from '../../src/types.js';
import type { WorkflowResult } from '../../src/state.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wf-session-test-'));
}

function makeSessionConfig(basePath: string, overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    basePath,
    specFile: '/tmp/spec.md',
    worktreePath: '/tmp/worktree',
    branchName: 'wf-test-branch',
    ...overrides,
  };
}

/** Read a JSON file and parse it. */
async function readJson(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/** Check if a file exists. */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('WorkflowSessionManager', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // createSession
  // -----------------------------------------------------------------------
  describe('createSession', () => {
    it('should create a session directory with context.json and audit.jsonl', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^wf-\d{4}-\d{2}-\d{2}-[a-f0-9]+$/);

      const sessionDir = path.join(tmpDir, '.wrangler', 'sessions', sessionId);

      // context.json should exist
      const contextPath = path.join(sessionDir, 'context.json');
      expect(await fileExists(contextPath)).toBe(true);

      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.id).toBe(sessionId);
      expect(context.status).toBe('running');
      expect(context.currentPhase).toBe('init');
      expect(context.specFile).toBe('/tmp/spec.md');
      expect(context.worktreePath).toBe('/tmp/worktree');
      expect(context.branchName).toBe('wf-test-branch');
      expect(context.phasesCompleted).toEqual([]);
      expect(context.startedAt).toBeDefined();
      expect(context.updatedAt).toBeDefined();

      // audit.jsonl should exist with init entry
      const auditPath = path.join(sessionDir, 'audit.jsonl');
      expect(await fileExists(auditPath)).toBe(true);

      const auditContent = await fs.readFile(auditPath, 'utf-8');
      const lines = auditContent.trim().split('\n');
      expect(lines).toHaveLength(1);

      const initEntry = JSON.parse(lines[0]) as WorkflowAuditEntry;
      expect(initEntry.step).toBe('init');
      expect(initEntry.status).toBe('completed');
      expect(initEntry.metadata?.session_id).toBe(sessionId);
      expect(initEntry.metadata?.spec_file).toBe('/tmp/spec.md');
    });

    it('should return the session ID via getSessionId()', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      // Before creating, should be null
      expect(manager.getSessionId()).toBeNull();

      const sessionId = await manager.createSession();
      expect(manager.getSessionId()).toBe(sessionId);
    });
  });

  // -----------------------------------------------------------------------
  // appendAuditEntry
  // -----------------------------------------------------------------------
  describe('appendAuditEntry', () => {
    it('should append entries to audit.jsonl', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'started',
        timestamp: new Date().toISOString(),
      });

      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'completed',
        timestamp: new Date().toISOString(),
        metadata: { taskCount: 5 },
      });

      const auditPath = path.join(tmpDir, '.wrangler', 'sessions', sessionId, 'audit.jsonl');
      const content = await fs.readFile(auditPath, 'utf-8');
      const lines = content.trim().split('\n');

      // 1 init entry + 2 appended = 3
      expect(lines).toHaveLength(3);

      const entries = lines.map(l => JSON.parse(l));
      expect(entries[1].step).toBe('analyze');
      expect(entries[1].status).toBe('started');
      expect(entries[2].step).toBe('analyze');
      expect(entries[2].status).toBe('completed');
      expect(entries[2].metadata.taskCount).toBe(5);
    });

    it('should silently do nothing when no session is created', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      // Should not throw even without a session
      await expect(manager.appendAuditEntry({
        step: 'test',
        status: 'started',
        timestamp: new Date().toISOString(),
      })).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // saveCheckpoint
  // -----------------------------------------------------------------------
  describe('saveCheckpoint', () => {
    it('should write checkpoint.json and update context.json', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      await manager.saveCheckpoint({
        currentPhase: 'execute',
        variables: { analysis: { tasks: ['t1', 't2'] } },
        tasksCompleted: ['t1'],
        tasksPending: ['t2'],
      });

      const sessionDir = path.join(tmpDir, '.wrangler', 'sessions', sessionId);

      // checkpoint.json should exist
      const checkpointPath = path.join(sessionDir, 'checkpoint.json');
      expect(await fileExists(checkpointPath)).toBe(true);

      const checkpoint = await readJson(checkpointPath) as Record<string, unknown>;
      expect(checkpoint.sessionId).toBe(sessionId);
      expect(checkpoint.currentPhase).toBe('execute');
      expect(checkpoint.variables).toEqual({ analysis: { tasks: ['t1', 't2'] } });
      expect(checkpoint.tasksCompleted).toEqual(['t1']);
      expect(checkpoint.tasksPending).toEqual(['t2']);
      expect(checkpoint.lastAction).toBe('execute');
      expect(checkpoint.resumeInstructions).toContain('Resume from phase "execute"');
      expect((checkpoint.checkpointId as string)).toMatch(/^chk-/);

      // context.json should be updated
      const contextPath = path.join(sessionDir, 'context.json');
      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.currentPhase).toBe('execute');
      expect(context.tasksCompleted).toEqual(['t1']);
      expect(context.tasksPending).toEqual(['t2']);
    });

    it('should silently do nothing when no session is created', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      await expect(manager.saveCheckpoint({
        currentPhase: 'test',
        variables: {},
        tasksCompleted: [],
        tasksPending: [],
      })).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // loadCheckpoint
  // -----------------------------------------------------------------------
  describe('loadCheckpoint', () => {
    it('should load checkpoint data from a session', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const checkpointData = {
        currentPhase: 'review',
        variables: { key1: 'value1', key2: 42 },
        tasksCompleted: ['t1', 't2'],
        tasksPending: ['t3'],
      };

      await manager.saveCheckpoint(checkpointData);

      // Load checkpoint (using the same session ID)
      const loaded = await manager.loadCheckpoint(sessionId);

      expect(loaded).not.toBeNull();
      expect(loaded!.currentPhase).toBe('review');
      expect(loaded!.variables).toEqual({ key1: 'value1', key2: 42 });
      expect(loaded!.tasksCompleted).toEqual(['t1', 't2']);
      expect(loaded!.tasksPending).toEqual(['t3']);
    });

    it('should return null when no checkpoint exists', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      const loaded = await manager.loadCheckpoint('nonexistent-session-id');
      expect(loaded).toBeNull();
    });

    it('should handle checkpoint with missing fields gracefully', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      // Write a minimal checkpoint manually
      const checkpointPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'checkpoint.json'
      );
      await fs.writeFile(
        checkpointPath,
        JSON.stringify({ lastAction: 'analyze' }),
        'utf-8'
      );

      const loaded = await manager.loadCheckpoint(sessionId);

      expect(loaded).not.toBeNull();
      expect(loaded!.currentPhase).toBe('analyze'); // falls back to lastAction
      expect(loaded!.variables).toEqual({});
      expect(loaded!.tasksCompleted).toEqual([]);
      expect(loaded!.tasksPending).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // completeSession
  // -----------------------------------------------------------------------
  describe('completeSession', () => {
    it('should update context.json status to completed', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const result: WorkflowResult = {
        status: 'completed',
        outputs: { analysis: {} },
        completedPhases: ['analyze', 'plan', 'execute'],
      };

      await manager.completeSession(result);

      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;

      expect(context.status).toBe('completed');
      expect(context.completedAt).toBeDefined();
      expect(context.updatedAt).toBeDefined();
    });

    it('should update context.json status to failed for non-completed result', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const result: WorkflowResult = {
        status: 'failed',
        outputs: {},
        completedPhases: ['analyze'],
        error: 'Something went wrong',
      };

      await manager.completeSession(result);

      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;

      expect(context.status).toBe('failed');
    });

    it('should append a completion audit entry', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const result: WorkflowResult = {
        status: 'completed',
        outputs: {},
        completedPhases: ['analyze', 'plan'],
      };

      await manager.completeSession(result);

      const entries = await manager.getAuditEntries(sessionId);
      const completeEntry = entries.find(e => e.step === 'complete');

      expect(completeEntry).toBeDefined();
      expect(completeEntry!.status).toBe('completed');
      expect(completeEntry!.metadata?.completedPhases).toEqual(['analyze', 'plan']);
    });

    it('should silently do nothing when no session is created', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      await expect(manager.completeSession({
        status: 'completed',
        outputs: {},
        completedPhases: [],
      })).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // writeBlocker
  // -----------------------------------------------------------------------
  describe('writeBlocker', () => {
    it('should write blocker.json and update context status to paused', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      await manager.writeBlocker('Loop exhausted 3 retries. Review issues remain.');

      const sessionDir = path.join(tmpDir, '.wrangler', 'sessions', sessionId);

      // blocker.json should exist
      const blockerPath = path.join(sessionDir, 'blocker.json');
      expect(await fileExists(blockerPath)).toBe(true);

      const blocker = await readJson(blockerPath) as Record<string, unknown>;
      expect(blocker.sessionId).toBe(sessionId);
      expect(blocker.details).toBe('Loop exhausted 3 retries. Review issues remain.');
      expect(blocker.timestamp).toBeDefined();

      // context.json should be updated to paused
      const contextPath = path.join(sessionDir, 'context.json');
      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.status).toBe('paused');
    });

    it('should silently do nothing when no session is created', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      await expect(
        manager.writeBlocker('Some blocker')
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // getAuditEntries
  // -----------------------------------------------------------------------
  describe('getAuditEntries', () => {
    it('should return all audit entries for a session', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'started',
        timestamp: new Date().toISOString(),
      });

      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

      const entries = await manager.getAuditEntries(sessionId);

      // init + 2 appended = 3
      expect(entries).toHaveLength(3);
      expect(entries[0].step).toBe('init');
      expect(entries[1].step).toBe('analyze');
      expect(entries[1].status).toBe('started');
      expect(entries[2].step).toBe('analyze');
      expect(entries[2].status).toBe('completed');
    });

    it('should return entries using current session when sessionId omitted', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      await manager.createSession();

      await manager.appendAuditEntry({
        step: 'test',
        status: 'started',
        timestamp: new Date().toISOString(),
      });

      // Call without explicit sessionId
      const entries = await manager.getAuditEntries();

      expect(entries).toHaveLength(2); // init + test
    });

    it('should return empty array when no session exists', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      const entries = await manager.getAuditEntries();
      expect(entries).toEqual([]);
    });

    it('should return empty array for nonexistent session ID', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      const entries = await manager.getAuditEntries('nonexistent');
      expect(entries).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Round-trip: create -> checkpoint -> load -> complete
  // -----------------------------------------------------------------------
  describe('round-trip lifecycle', () => {
    it('should support full session lifecycle: create -> checkpoint -> load -> complete', async () => {
      const config = makeSessionConfig(tmpDir, {
        specFile: '/project/specs/auth.md',
        worktreePath: '/project/worktrees/auth',
        branchName: 'wf-auth-impl',
      });

      const manager = new WorkflowSessionManager(config);

      // Step 1: Create session
      const sessionId = await manager.createSession();
      expect(sessionId).toBeTruthy();

      // Step 2: Append some audit entries
      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'started',
        timestamp: new Date().toISOString(),
      });

      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'completed',
        timestamp: new Date().toISOString(),
        metadata: { taskCount: 3 },
      });

      // Step 3: Save checkpoint
      await manager.saveCheckpoint({
        currentPhase: 'execute',
        variables: {
          analysis: { tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] },
        },
        tasksCompleted: ['t1'],
        tasksPending: ['t2', 't3'],
      });

      // Step 4: Load checkpoint (simulating a new manager instance)
      const manager2 = new WorkflowSessionManager(config);
      const checkpoint = await manager2.loadCheckpoint(sessionId);

      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.currentPhase).toBe('execute');
      expect(checkpoint!.tasksCompleted).toEqual(['t1']);
      expect(checkpoint!.tasksPending).toEqual(['t2', 't3']);
      expect(checkpoint!.variables.analysis).toBeDefined();

      // Step 5: Complete session (back on original manager)
      await manager.completeSession({
        status: 'completed',
        outputs: { analysis: checkpoint!.variables.analysis },
        completedPhases: ['analyze', 'plan', 'execute'],
      });

      // Verify final state
      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const finalContext = await readJson(contextPath) as Record<string, unknown>;
      expect(finalContext.status).toBe('completed');
      expect(finalContext.completedAt).toBeDefined();

      // Verify audit trail
      const entries = await manager.getAuditEntries(sessionId);
      expect(entries.length).toBeGreaterThanOrEqual(4); // init + analyze start + analyze complete + session complete
      expect(entries[entries.length - 1].step).toBe('complete');
    });

    it('should support session pause via writeBlocker', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      // Simulate work
      await manager.appendAuditEntry({
        step: 'analyze',
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

      // Save checkpoint before pause
      await manager.saveCheckpoint({
        currentPhase: 'review',
        variables: { review: { hasIssues: true } },
        tasksCompleted: ['t1', 't2'],
        tasksPending: [],
      });

      // Write blocker
      await manager.writeBlocker('Critical review issues need human attention');

      // Verify session is paused
      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.status).toBe('paused');

      // Verify blocker file
      const blockerPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'blocker.json'
      );
      const blocker = await readJson(blockerPath) as Record<string, unknown>;
      expect(blocker.details).toBe('Critical review issues need human attention');

      // Checkpoint should still be loadable
      const checkpoint = await manager.loadCheckpoint(sessionId);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.currentPhase).toBe('review');
    });
  });

  // -----------------------------------------------------------------------
  // Bug fix: ISS-000114 - phasesCompleted populated in context.json
  // -----------------------------------------------------------------------
  describe('phasesCompleted in context.json (ISS-000114)', () => {
    it('should populate phasesCompleted in context.json on completeSession', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const result: WorkflowResult = {
        status: 'completed',
        outputs: {},
        completedPhases: ['analyze', 'plan', 'execute', 'verify'],
      };

      await manager.completeSession(result);

      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;

      expect(context.phasesCompleted).toEqual(['analyze', 'plan', 'execute', 'verify']);
    });

    it('should populate phasesCompleted in context.json on saveCheckpoint', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      await manager.saveCheckpoint({
        currentPhase: 'execute',
        variables: {},
        completedPhases: ['analyze', 'plan'],
        tasksCompleted: [],
        tasksPending: [],
      });

      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;

      expect(context.phasesCompleted).toEqual(['analyze', 'plan']);
    });

    it('should persist completedPhases and changedFiles through checkpoint round-trip', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      await manager.saveCheckpoint({
        currentPhase: 'execute',
        variables: { someData: 'value' },
        completedPhases: ['analyze', 'plan'],
        changedFiles: ['src/foo.ts', 'src/bar.ts'],
        tasksCompleted: ['t1'],
        tasksPending: ['t2'],
      });

      const loaded = await manager.loadCheckpoint(sessionId);

      expect(loaded).not.toBeNull();
      expect(loaded!.completedPhases).toEqual(['analyze', 'plan']);
      expect(loaded!.changedFiles).toEqual(['src/foo.ts', 'src/bar.ts']);
    });
  });

  // -----------------------------------------------------------------------
  // ISS-000112: Filesystem error handling
  // -----------------------------------------------------------------------
  describe('filesystem error handling (ISS-000112)', () => {
    it('should throw a clear error when checkpoint.json contains corrupted JSON', async () => {
      // Observed behavior: fs-extra's readJson throws a SyntaxError when the
      // file contains invalid JSON. This is the expected behavior -- callers
      // should handle or propagate the error rather than getting a null back.
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const checkpointPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'checkpoint.json'
      );
      await fs.writeFile(checkpointPath, '{corrupted json!!!', 'utf-8');

      await expect(manager.loadCheckpoint(sessionId)).rejects.toThrow();
    });

    it('should return null when loading checkpoint for a session ID with no directory', async () => {
      // Observed behavior: When no session directory exists, pathExists
      // returns false and loadCheckpoint returns null. This is intentional --
      // a missing session is not an error, it just means no checkpoint was saved.
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      const loaded = await manager.loadCheckpoint('nonexistent-session-id-abc123');
      expect(loaded).toBeNull();
    });

    it('should handle missing audit log file by recreating it on appendAuditEntry', async () => {
      // Observed behavior: fs.appendFile creates the file if it does not
      // exist, so deleting the audit log mid-session and appending a new
      // entry simply recreates the file. This is intentional resilient behavior.
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const auditPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'audit.jsonl'
      );

      // Verify audit file exists after creation
      expect(await fileExists(auditPath)).toBe(true);

      // Delete the audit file
      await fs.unlink(auditPath);
      expect(await fileExists(auditPath)).toBe(false);

      // Append a new entry -- should not throw
      await manager.appendAuditEntry({
        step: 'test-recovery',
        status: 'started',
        timestamp: new Date().toISOString(),
      });

      // File should be recreated
      expect(await fileExists(auditPath)).toBe(true);
      const content = await fs.readFile(auditPath, 'utf-8');
      const entries = content.trim().split('\n').map(l => JSON.parse(l));
      expect(entries).toHaveLength(1);
      expect(entries[0].step).toBe('test-recovery');
    });

    it('should throw when session directory is deleted before saveCheckpoint', async () => {
      // Observed behavior: When the session directory is removed after
      // creation, fs-extra's writeJson fails because the parent directory
      // no longer exists. This surfaces as an ENOENT error. This is the
      // expected behavior -- the engine should not silently swallow
      // directory-level filesystem failures.
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      // Delete the session directory
      const sessionDir = path.join(tmpDir, '.wrangler', 'sessions', sessionId);
      await fs.rm(sessionDir, { recursive: true, force: true });

      // saveCheckpoint should throw because the directory is gone
      await expect(manager.saveCheckpoint({
        currentPhase: 'execute',
        variables: {},
        tasksCompleted: [],
        tasksPending: [],
      })).rejects.toThrow();
    });

    it('should handle double completeSession calls idempotently', async () => {
      // Observed behavior: Calling completeSession twice works without
      // error -- the second call simply overwrites the status in
      // context.json with the same value. This is intentional -- the
      // operation is idempotent and does not throw on repeat invocation.
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const result: WorkflowResult = {
        status: 'completed',
        outputs: {},
        completedPhases: ['analyze', 'plan'],
      };

      // First completion
      await manager.completeSession(result);

      // Second completion -- should not throw
      await expect(manager.completeSession(result)).resolves.toBeUndefined();

      // Verify final state is still correct
      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.status).toBe('completed');
      expect(context.phasesCompleted).toEqual(['analyze', 'plan']);

      // Verify two completion audit entries were appended (one per call)
      const entries = await manager.getAuditEntries(sessionId);
      const completeEntries = entries.filter(e => e.step === 'complete');
      expect(completeEntries).toHaveLength(2);
    });

    it('should throw a clear error when context.json contains corrupted JSON', async () => {
      // Observed behavior: When context.json is corrupted, saveCheckpoint
      // calls readJson on it, which throws a SyntaxError. This is the
      // expected behavior -- filesystem corruption should surface as an
      // error, not be silently ignored.
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      await fs.writeFile(contextPath, 'NOT-VALID-JSON{{{', 'utf-8');

      // saveCheckpoint reads context.json to update it, so it should throw
      await expect(manager.saveCheckpoint({
        currentPhase: 'execute',
        variables: {},
        tasksCompleted: [],
        tasksPending: [],
      })).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Session ID format
  // -----------------------------------------------------------------------
  describe('session ID generation', () => {
    it('should generate unique session IDs', async () => {
      const manager1 = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const manager2 = new WorkflowSessionManager(makeSessionConfig(tmpDir));

      const id1 = await manager1.createSession();
      const id2 = await manager2.createSession();

      expect(id1).not.toBe(id2);
    });

    it('should include current date in session ID', async () => {
      const manager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await manager.createSession();

      const today = new Date().toISOString().slice(0, 10);
      expect(sessionId).toContain(today);
    });
  });
});
