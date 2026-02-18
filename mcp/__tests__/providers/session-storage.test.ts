/**
 * Tests for SessionStorageProvider
 */

import * as path from 'path';
import * as fsExtra from 'fs-extra';

// ESM compat
const fs = (fsExtra as any).default || fsExtra;

import { SessionStorageProvider, SessionStorageConfig } from '../../src/providers/session-storage';
import { Session, SessionCheckpoint, AuditEntry } from '../../src/types/session';

describe('SessionStorageProvider', () => {
  let tempDir: string;
  let provider: SessionStorageProvider;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(process.cwd(), 'test-temp', `session-storage-${Date.now()}`);
    await fs.ensureDir(tempDir);

    const config: SessionStorageConfig = {
      basePath: tempDir,
    };
    provider = new SessionStorageProvider(config);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  function createSession(overrides?: Partial<Session>): Session {
    const now = new Date().toISOString();
    return {
      id: 'test-session-001',
      specFile: 'test-spec.md',
      status: 'running',
      currentPhase: 'init',
      worktreePath: '/tmp/worktree',
      branchName: 'wrangler/test/session-001',
      phasesCompleted: ['init'],
      tasksCompleted: [],
      tasksPending: [],
      startedAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  describe('getSessionDir', () => {
    it('should return correct session directory path', () => {
      const sessionDir = provider.getSessionDir('my-session-123');
      expect(sessionDir).toBe(path.join(tempDir, '.wrangler', 'sessions', 'my-session-123'));
    });
  });

  describe('createSession', () => {
    it('should create session directory and context file', async () => {
      const session = createSession();
      await provider.createSession(session);

      const contextPath = path.join(
        tempDir,
        '.wrangler',
        'sessions',
        session.id,
        'context.json'
      );
      expect(await fs.pathExists(contextPath)).toBe(true);

      const savedSession = await fs.readJson(contextPath);
      expect(savedSession.id).toBe(session.id);
      expect(savedSession.specFile).toBe(session.specFile);
      expect(savedSession.status).toBe(session.status);
    });

    it('should create initial audit entry', async () => {
      const session = createSession();
      await provider.createSession(session);

      const auditPath = path.join(
        tempDir,
        '.wrangler',
        'sessions',
        session.id,
        'audit.jsonl'
      );
      expect(await fs.pathExists(auditPath)).toBe(true);

      const content = await fs.readFile(auditPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.phase).toBe('init');
      expect(entry.status).toBe('complete');
      expect(entry.session_id).toBe(session.id);
    });

    it('should preserve all session fields', async () => {
      const session = createSession({
        id: 'session-full',
        specFile: 'specs/feature.md',
        status: 'running',
        currentPhase: 'plan',
        worktreePath: '/custom/worktree',
        branchName: 'feature/my-branch',
        phasesCompleted: ['init', 'plan'],
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2', 'task-3'],
      });
      await provider.createSession(session);

      const saved = await provider.getSession('session-full');
      expect(saved).toEqual(session);
    });
  });

  describe('getSession', () => {
    it('should return session when it exists', async () => {
      const session = createSession({ id: 'session-get-test' });
      await provider.createSession(session);

      const retrieved = await provider.getSession('session-get-test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('session-get-test');
    });

    it('should return null when session does not exist', async () => {
      const result = await provider.getSession('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const session = createSession({ id: 'session-update-test' });
      await provider.createSession(session);

      const updated = await provider.updateSession('session-update-test', {
        status: 'paused',
        currentPhase: 'execute',
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('paused');
      expect(updated?.currentPhase).toBe('execute');
      expect(updated?.updatedAt).not.toBe(session.updatedAt);
    });

    it('should preserve unchanged fields', async () => {
      const session = createSession({
        id: 'session-preserve-test',
        specFile: 'my-spec.md',
      });
      await provider.createSession(session);

      await provider.updateSession('session-preserve-test', {
        status: 'completed',
      });

      const retrieved = await provider.getSession('session-preserve-test');
      expect(retrieved?.specFile).toBe('my-spec.md');
      expect(retrieved?.worktreePath).toBe(session.worktreePath);
    });

    it('should return null when session does not exist', async () => {
      const result = await provider.updateSession('non-existent', {
        status: 'completed',
      });
      expect(result).toBeNull();
    });

    it('should update tasksCompleted and tasksPending arrays', async () => {
      const session = createSession({ id: 'session-tasks-test' });
      await provider.createSession(session);

      await provider.updateSession('session-tasks-test', {
        tasksCompleted: ['task-1', 'task-2'],
        tasksPending: ['task-3'],
      });

      const retrieved = await provider.getSession('session-tasks-test');
      expect(retrieved?.tasksCompleted).toEqual(['task-1', 'task-2']);
      expect(retrieved?.tasksPending).toEqual(['task-3']);
    });
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint file', async () => {
      const session = createSession({ id: 'session-checkpoint' });
      await provider.createSession(session);

      const checkpoint: SessionCheckpoint = {
        sessionId: 'session-checkpoint',
        checkpointId: 'chk-test-001',
        createdAt: new Date().toISOString(),
        currentPhase: 'execute',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        variables: { commit: 'abc123' },
        lastAction: 'Completed task-1',
        resumeInstructions: 'Continue with task-2',
      };

      await provider.saveCheckpoint(checkpoint);

      const checkpointPath = path.join(
        tempDir,
        '.wrangler',
        'sessions',
        'session-checkpoint',
        'checkpoint.json'
      );
      expect(await fs.pathExists(checkpointPath)).toBe(true);

      const saved = await fs.readJson(checkpointPath);
      expect(saved.checkpointId).toBe('chk-test-001');
      expect(saved.variables.commit).toBe('abc123');
    });

    it('should update session with checkpoint data', async () => {
      const session = createSession({ id: 'session-checkpoint-update' });
      await provider.createSession(session);

      const checkpoint: SessionCheckpoint = {
        sessionId: 'session-checkpoint-update',
        checkpointId: 'chk-test-002',
        createdAt: new Date().toISOString(),
        currentPhase: 'verify',
        tasksCompleted: ['task-1', 'task-2'],
        tasksPending: ['task-3'],
        variables: {},
        lastAction: 'Ran tests',
        resumeInstructions: 'Check test results',
      };

      await provider.saveCheckpoint(checkpoint);

      const updatedSession = await provider.getSession('session-checkpoint-update');
      expect(updatedSession?.currentPhase).toBe('verify');
      expect(updatedSession?.tasksCompleted).toEqual(['task-1', 'task-2']);
      expect(updatedSession?.tasksPending).toEqual(['task-3']);
    });

    it('should write checkpoint audit entry', async () => {
      const session = createSession({ id: 'session-checkpoint-audit' });
      await provider.createSession(session);

      const checkpoint: SessionCheckpoint = {
        sessionId: 'session-checkpoint-audit',
        checkpointId: 'chk-audit-001',
        createdAt: new Date().toISOString(),
        currentPhase: 'execute',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2', 'task-3'],
        variables: {},
        lastAction: 'Test',
        resumeInstructions: 'Continue',
      };

      await provider.saveCheckpoint(checkpoint);

      const auditEntries = await provider.getAuditEntries('session-checkpoint-audit');
      const checkpointEntry = auditEntries.find(e => e.phase === 'checkpoint');
      expect(checkpointEntry).toBeDefined();
      expect((checkpointEntry as any).checkpoint_id).toBe('chk-audit-001');
      expect((checkpointEntry as any).tasks_completed).toBe(1);
      expect((checkpointEntry as any).tasks_pending).toBe(2);
    });
  });

  describe('getCheckpoint', () => {
    it('should return checkpoint when it exists', async () => {
      const session = createSession({ id: 'session-get-checkpoint' });
      await provider.createSession(session);

      const checkpoint: SessionCheckpoint = {
        sessionId: 'session-get-checkpoint',
        checkpointId: 'chk-get-001',
        createdAt: new Date().toISOString(),
        currentPhase: 'execute',
        tasksCompleted: ['task-1'],
        tasksPending: [],
        variables: { key: 'value' },
        lastAction: 'Done',
        resumeInstructions: 'All done',
      };

      await provider.saveCheckpoint(checkpoint);

      const retrieved = await provider.getCheckpoint('session-get-checkpoint');
      expect(retrieved).toBeDefined();
      expect(retrieved?.checkpointId).toBe('chk-get-001');
      expect(retrieved?.variables).toEqual({ key: 'value' });
    });

    it('should return null when no checkpoint exists', async () => {
      const session = createSession({ id: 'session-no-checkpoint' });
      await provider.createSession(session);

      const result = await provider.getCheckpoint('session-no-checkpoint');
      expect(result).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      const result = await provider.getCheckpoint('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('appendAuditEntry', () => {
    it('should append audit entry to file', async () => {
      const session = createSession({ id: 'session-audit' });
      await provider.createSession(session);

      const entry: AuditEntry = {
        phase: 'plan',
        timestamp: new Date().toISOString(),
        status: 'complete',
        issues_created: ['ISS-001', 'ISS-002'],
        total_tasks: 5,
      } as any;

      await provider.appendAuditEntry('session-audit', entry);

      const entries = await provider.getAuditEntries('session-audit');
      expect(entries.length).toBe(2); // init + plan
      expect(entries[1].phase).toBe('plan');
      expect((entries[1] as any).issues_created).toEqual(['ISS-001', 'ISS-002']);
    });

    it('should handle multiple audit entries', async () => {
      const session = createSession({ id: 'session-multi-audit' });
      await provider.createSession(session);

      const entries: AuditEntry[] = [
        { phase: 'plan', timestamp: new Date().toISOString(), status: 'complete' } as any,
        { phase: 'execute', timestamp: new Date().toISOString(), status: 'started' } as any,
        { phase: 'task', timestamp: new Date().toISOString(), status: 'complete', task_id: 'task-1' } as any,
      ];

      for (const entry of entries) {
        await provider.appendAuditEntry('session-multi-audit', entry);
      }

      const retrieved = await provider.getAuditEntries('session-multi-audit');
      expect(retrieved.length).toBe(4); // init + 3 added
      expect(retrieved[1].phase).toBe('plan');
      expect(retrieved[2].phase).toBe('execute');
      expect(retrieved[3].phase).toBe('task');
    });
  });

  describe('getAuditEntries', () => {
    it('should return empty array when no audit file exists', async () => {
      const entries = await provider.getAuditEntries('non-existent-session');
      expect(entries).toEqual([]);
    });

    it('should parse JSONL format correctly', async () => {
      const session = createSession({ id: 'session-jsonl' });
      await provider.createSession(session);

      const entries = await provider.getAuditEntries('session-jsonl');
      expect(entries.length).toBe(1);
      expect(entries[0]).toHaveProperty('phase');
      expect(entries[0]).toHaveProperty('timestamp');
      expect(entries[0]).toHaveProperty('status');
    });
  });

  describe('findIncompleteSession', () => {
    it('should find running session', async () => {
      const session = createSession({
        id: 'session-running',
        status: 'running',
      });
      await provider.createSession(session);

      const found = await provider.findIncompleteSession();
      expect(found).toBeDefined();
      expect(found?.id).toBe('session-running');
    });

    it('should find paused session', async () => {
      const session = createSession({
        id: 'session-paused',
        status: 'paused',
      });
      await provider.createSession(session);

      const found = await provider.findIncompleteSession();
      expect(found).toBeDefined();
      expect(found?.id).toBe('session-paused');
    });

    it('should return null when only completed sessions exist', async () => {
      const session = createSession({
        id: 'session-done',
        status: 'completed',
      });
      await provider.createSession(session);

      const found = await provider.findIncompleteSession();
      expect(found).toBeNull();
    });

    it('should return null when no sessions exist', async () => {
      const found = await provider.findIncompleteSession();
      expect(found).toBeNull();
    });

    it('should prefer most recent incomplete session', async () => {
      // Create sessions with different dates in their IDs (sorted by ID)
      const older = createSession({
        id: '2024-01-01-aaa-0001',
        status: 'running',
        startedAt: '2024-01-01T10:00:00Z',
      });
      await provider.createSession(older);

      const newer = createSession({
        id: '2024-01-03-ccc-0003',
        status: 'running',
        startedAt: '2024-01-03T10:00:00Z',
      });
      await provider.createSession(newer);

      const found = await provider.findIncompleteSession();
      expect(found?.id).toBe('2024-01-03-ccc-0003');
    });

    it('should skip completed and failed sessions', async () => {
      await provider.createSession(createSession({
        id: 'session-completed',
        status: 'completed',
      }));

      await provider.createSession(createSession({
        id: 'session-failed',
        status: 'failed',
      }));

      await provider.createSession(createSession({
        id: 'session-running',
        status: 'running',
      }));

      const found = await provider.findIncompleteSession();
      expect(found?.id).toBe('session-running');
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      await provider.createSession(createSession({ id: 'session-1' }));
      await provider.createSession(createSession({ id: 'session-2' }));
      await provider.createSession(createSession({ id: 'session-3' }));

      const sessions = await provider.listSessions();
      expect(sessions.length).toBe(3);
    });

    it('should filter sessions by status', async () => {
      await provider.createSession(createSession({ id: 'session-running', status: 'running' }));
      await provider.createSession(createSession({ id: 'session-completed', status: 'completed' }));
      await provider.createSession(createSession({ id: 'session-paused', status: 'paused' }));

      const running = await provider.listSessions({ status: ['running'] });
      expect(running.length).toBe(1);
      expect(running[0].status).toBe('running');

      const completed = await provider.listSessions({ status: ['completed'] });
      expect(completed.length).toBe(1);
      expect(completed[0].status).toBe('completed');

      const active = await provider.listSessions({ status: ['running', 'paused'] });
      expect(active.length).toBe(2);
    });

    it('should return empty array when no sessions exist', async () => {
      const sessions = await provider.listSessions();
      expect(sessions).toEqual([]);
    });

    it('should sort sessions by startedAt descending', async () => {
      await provider.createSession(createSession({
        id: 'session-old',
        startedAt: '2024-01-01T10:00:00Z',
      }));
      await provider.createSession(createSession({
        id: 'session-new',
        startedAt: '2024-01-03T10:00:00Z',
      }));
      await provider.createSession(createSession({
        id: 'session-mid',
        startedAt: '2024-01-02T10:00:00Z',
      }));

      const sessions = await provider.listSessions();
      expect(sessions[0].id).toBe('session-new');
      expect(sessions[1].id).toBe('session-mid');
      expect(sessions[2].id).toBe('session-old');
    });
  });

  describe('generateCheckpointId', () => {
    it('should generate unique IDs', () => {
      const id1 = provider.generateCheckpointId();
      const id2 = provider.generateCheckpointId();
      expect(id1).not.toBe(id2);
    });

    it('should start with chk- prefix', () => {
      const id = provider.generateCheckpointId();
      expect(id.startsWith('chk-')).toBe(true);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const id = provider.generateCheckpointId();
      const after = Date.now();

      // Extract timestamp from ID (format: chk-{timestamp}-{random})
      const parts = id.split('-');
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
