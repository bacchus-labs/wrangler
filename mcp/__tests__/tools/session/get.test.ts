/**
 * Tests for session_get tool
 */

import { sessionGetTool, sessionGetSchema, SessionGetParams } from '../../../src/tools/session/get';
import { MockSessionStorageProvider, createTestSession, createTestCheckpoint } from './test-utils';

describe('sessionGetTool', () => {
  let mockProvider: MockSessionStorageProvider;

  beforeEach(() => {
    mockProvider = new MockSessionStorageProvider();
    mockProvider.reset();
  });

  describe('schema validation', () => {
    it('should validate params with sessionId', () => {
      const params: SessionGetParams = {
        sessionId: 'test-session-001',
      };

      const result = sessionGetSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params without sessionId (for finding incomplete)', () => {
      const params: SessionGetParams = {};

      const result = sessionGetSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should allow undefined sessionId', () => {
      const params: SessionGetParams = {
        sessionId: undefined,
      };

      const result = sessionGetSchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });

  describe('get specific session', () => {
    it('should get session by ID', async () => {
      const session = createTestSession({
        id: 'session-123',
        specFile: 'my-feature.md',
        status: 'running',
        currentPhase: 'execute',
        worktreePath: '/path/to/worktree',
        branchName: 'wrangler/my-feature/session-123',
        phasesCompleted: ['init', 'plan'],
        tasksCompleted: ['task-1', 'task-2'],
        tasksPending: ['task-3'],
      });
      mockProvider.addSession(session);

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Session: session-123');
      expect(result.content[0].text).toContain('Status: running');
      expect(result.content[0].text).toContain('Phase: execute');
      expect(result.content[0].text).toContain('Tasks completed: 2');
      expect(result.content[0].text).toContain('Tasks pending: 1');

      expect(meta).toBeDefined();
      expect(meta.found).toBe(true);
      expect(meta.session).toBeDefined();
      expect(meta.session.id).toBe('session-123');
      expect(meta.session.specFile).toBe('my-feature.md');
      expect(meta.session.status).toBe('running');
      expect(meta.session.currentPhase).toBe('execute');
      expect(meta.session.worktreePath).toBe('/path/to/worktree');
      expect(meta.session.branchName).toBe('wrangler/my-feature/session-123');
      expect(meta.session.phasesCompleted).toEqual(['init', 'plan']);
      expect(meta.session.tasksCompleted).toEqual(['task-1', 'task-2']);
      expect(meta.session.tasksPending).toEqual(['task-3']);
    });

    it('should return session with checkpoint when available', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      // Add a checkpoint
      const checkpoint = createTestCheckpoint('session-123', {
        checkpointId: 'chk-test-123',
        lastAction: 'Implemented feature X',
        resumeInstructions: 'Continue with integration tests',
        variables: { lastCommit: 'abc123' },
      });
      await mockProvider.saveCheckpoint(checkpoint);

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.checkpoint).toBeDefined();
      expect(meta.checkpoint.checkpointId).toBe('chk-test-123');
      expect(meta.checkpoint.lastAction).toBe('Implemented feature X');
      expect(meta.checkpoint.resumeInstructions).toBe('Continue with integration tests');
      expect(meta.checkpoint.variables).toEqual({ lastCommit: 'abc123' });
    });

    it('should return null checkpoint when none exists', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.checkpoint).toBeNull();
    });

    it('should return error for non-existent session', async () => {
      const params: SessionGetParams = {
        sessionId: 'non-existent',
      };

      const result = await sessionGetTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('should include timing information', async () => {
      const startTime = new Date(Date.now() - 600000).toISOString(); // 10 minutes ago
      const updateTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const session = createTestSession({
        id: 'session-123',
        startedAt: startTime,
        updatedAt: updateTime,
      });
      mockProvider.addSession(session);

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.session.startedAt).toBe(startTime);
      expect(meta.session.updatedAt).toBe(updateTime);
    });

    it('should include completedAt for finished sessions', async () => {
      const completedTime = new Date().toISOString();
      const session = createTestSession({
        id: 'session-123',
        status: 'completed',
        completedAt: completedTime,
      });
      mockProvider.addSession(session);

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.session.completedAt).toBe(completedTime);
    });

    it('should include PR info when available', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'completed',
        prUrl: 'https://github.com/org/repo/pull/456',
        prNumber: 456,
      });
      mockProvider.addSession(session);

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.session.prUrl).toBe('https://github.com/org/repo/pull/456');
      expect(meta.session.prNumber).toBe(456);
    });
  });

  describe('find incomplete session', () => {
    it('should find most recent incomplete session when no sessionId provided', async () => {
      // Add completed session (older)
      const completedSession = createTestSession({
        id: 'session-old',
        status: 'completed',
        startedAt: '2024-01-01T10:00:00Z',
      });
      mockProvider.addSession(completedSession);

      // Add running session (newer)
      const runningSession = createTestSession({
        id: 'session-new',
        status: 'running',
        startedAt: '2024-01-02T10:00:00Z',
      });
      mockProvider.addSession(runningSession);

      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.found).toBe(true);
      expect(meta.session.id).toBe('session-new');
    });

    it('should find paused session', async () => {
      const pausedSession = createTestSession({
        id: 'session-paused',
        status: 'paused',
        startedAt: '2024-01-02T10:00:00Z',
      });
      mockProvider.addSession(pausedSession);

      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.found).toBe(true);
      expect(meta.session.id).toBe('session-paused');
      expect(meta.session.status).toBe('paused');
    });

    it('should return found: false when no incomplete sessions exist', async () => {
      // Add only completed session
      const completedSession = createTestSession({
        id: 'session-done',
        status: 'completed',
      });
      mockProvider.addSession(completedSession);

      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No incomplete sessions found');
      expect(result.metadata?.found).toBe(false);
    });

    it('should return found: false when no sessions exist', async () => {
      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('No incomplete sessions found');
      expect(result.metadata?.found).toBe(false);
    });

    it('should prefer most recent running session', async () => {
      // Add multiple running sessions with different start times
      const older = createTestSession({
        id: 'session-older',
        status: 'running',
        startedAt: '2024-01-01T10:00:00Z',
      });
      mockProvider.addSession(older);

      const newer = createTestSession({
        id: 'session-newer',
        status: 'running',
        startedAt: '2024-01-03T10:00:00Z',
      });
      mockProvider.addSession(newer);

      const middle = createTestSession({
        id: 'session-middle',
        status: 'running',
        startedAt: '2024-01-02T10:00:00Z',
      });
      mockProvider.addSession(middle);

      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.session.id).toBe('session-newer');
    });

    it('should include checkpoint for found incomplete session', async () => {
      const session = createTestSession({
        id: 'session-with-checkpoint',
        status: 'running',
      });
      mockProvider.addSession(session);

      const checkpoint = createTestCheckpoint('session-with-checkpoint', {
        checkpointId: 'chk-resume',
        resumeInstructions: 'Pick up where you left off',
      });
      await mockProvider.saveCheckpoint(checkpoint);

      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.checkpoint).toBeDefined();
      expect(meta.checkpoint.resumeInstructions).toBe('Pick up where you left off');
    });
  });

  describe('error handling', () => {
    it('should handle storage provider errors when getting session', async () => {
      mockProvider.shouldThrowOnGet = true;

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get session');
    });

    it('should handle storage provider errors when finding incomplete', async () => {
      mockProvider.shouldThrowOnFindIncomplete = true;

      const params: SessionGetParams = {};

      const result = await sessionGetTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get session');
    });

    it('should handle checkpoint retrieval errors gracefully', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnGetCheckpoint = true;

      const params: SessionGetParams = {
        sessionId: 'session-123',
      };

      const result = await sessionGetTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get session');
    });
  });
});
