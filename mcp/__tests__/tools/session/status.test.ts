/**
 * Tests for session_status tool
 */

import { sessionStatusTool, sessionStatusSchema, SessionStatusParams } from '../../../src/tools/session/status';
import { MockSessionStorageProvider, createTestSession, createTestCheckpoint } from './test-utils';
import { AuditEntry } from '../../../src/types/session';

describe('sessionStatusTool', () => {
  let mockProvider: MockSessionStorageProvider;

  beforeEach(() => {
    mockProvider = new MockSessionStorageProvider();
    mockProvider.reset();
  });

  describe('schema validation', () => {
    it('should validate params with sessionId', () => {
      const params: SessionStatusParams = { sessionId: 'wf-abc123' };
      const result = sessionStatusSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params without sessionId', () => {
      const params: SessionStatusParams = {};
      const result = sessionStatusSchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });

  describe('specific session by ID', () => {
    it('should return status for a specific session ID', async () => {
      const session = createTestSession({
        id: 'wf-session-001',
        specFile: 'SPEC-000045.md',
        status: 'running',
        currentPhase: 'execute',
        worktreePath: '/tmp/worktree-001',
        branchName: 'wrangler/spec-045/wf-session-001',
        phasesCompleted: ['init'],
        tasksCompleted: ['ISS-001', 'ISS-002'],
        tasksPending: ['ISS-003', 'ISS-004'],
        startedAt: '2026-02-16T10:00:00.000Z',
      });
      mockProvider.addSession(session);

      // Add audit entries
      await mockProvider.appendAuditEntry('wf-session-001', {
        phase: 'init',
        timestamp: '2026-02-16T10:00:00.000Z',
        status: 'complete',
        session_id: 'wf-session-001',
        worktree: '/tmp/worktree-001',
        branch: 'wrangler/spec-045/wf-session-001',
        spec_file: 'SPEC-000045.md',
      } as AuditEntry);
      await mockProvider.appendAuditEntry('wf-session-001', {
        phase: 'plan',
        timestamp: '2026-02-16T10:01:00.000Z',
        status: 'complete',
        issues_created: ['ISS-001', 'ISS-002', 'ISS-003', 'ISS-004'],
        total_tasks: 4,
      } as AuditEntry);
      await mockProvider.appendAuditEntry('wf-session-001', {
        phase: 'execute',
        timestamp: '2026-02-16T10:02:00.000Z',
        status: 'started',
        issues_created: [],
        total_tasks: 4,
      } as AuditEntry);

      const result = await sessionStatusTool({ sessionId: 'wf-session-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.sessionId).toBe('wf-session-001');
      expect(meta.status).toBe('running');
      expect(meta.specFile).toBe('SPEC-000045.md');
      expect(meta.worktreePath).toBe('/tmp/worktree-001');
      expect(meta.branchName).toBe('wrangler/spec-045/wf-session-001');
      expect(meta.tasksCompleted).toBe(2);
      expect(meta.tasksPending).toBe(2);
      expect(meta.tasksTotal).toBe(4);
      expect(meta.auditEntryCount).toBe(3);
    });

    it('should return error for non-existent session', async () => {
      const result = await sessionStatusTool({ sessionId: 'wf-nonexistent' }, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });
  });

  describe('auto-detect most recent wf-* session', () => {
    it('should find most recent wf-* session when no ID provided', async () => {
      // Add a non-wf session (should be ignored)
      const regularSession = createTestSession({
        id: 'test-session-001',
        status: 'running',
        startedAt: '2026-02-16T12:00:00.000Z',
      });
      mockProvider.addSession(regularSession);

      // Add wf-* sessions
      const olderWf = createTestSession({
        id: 'wf-older',
        status: 'running',
        startedAt: '2026-02-16T09:00:00.000Z',
      });
      mockProvider.addSession(olderWf);

      const newerWf = createTestSession({
        id: 'wf-newer',
        status: 'running',
        startedAt: '2026-02-16T11:00:00.000Z',
      });
      mockProvider.addSession(newerWf);

      const result = await sessionStatusTool({}, mockProvider);
      const meta = result.metadata as any;

      expect(result.isError).toBe(false);
      expect(meta.sessionId).toBe('wf-newer');
    });

    it('should return error when no wf-* sessions exist', async () => {
      // Add only non-wf sessions
      const session = createTestSession({
        id: 'test-session-001',
        status: 'running',
      });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({}, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No workflow sessions found');
    });

    it('should return error when no sessions exist at all', async () => {
      const result = await sessionStatusTool({}, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No workflow sessions found');
    });
  });

  describe('active step derivation from audit', () => {
    it('should derive active step from last audit entry with started status', async () => {
      const session = createTestSession({ id: 'wf-test-001', currentPhase: 'stale-phase' });
      mockProvider.addSession(session);

      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'execute',
        timestamp: '2026-02-16T10:05:00.000Z',
        status: 'started',
        issues_created: [],
        total_tasks: 3,
      } as AuditEntry);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.activeStep).toBe('execute (in progress)');
    });

    it('should derive active step from last audit entry with complete status', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'plan',
        timestamp: '2026-02-16T10:05:00.000Z',
        status: 'complete',
        issues_created: [],
        total_tasks: 3,
      } as AuditEntry);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.activeStep).toBe('plan just completed, waiting for next step');
    });

    it('should derive active step from last audit entry with failed status', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'verify',
        timestamp: '2026-02-16T10:05:00.000Z',
        status: 'failed',
        tests_exit_code: 1,
        tests_total: 10,
        tests_passed: 7,
        git_clean: true,
      } as AuditEntry);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.activeStep).toBe('verify FAILED');
    });

    it('should report unknown when no audit entries exist', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.activeStep).toBe('unknown');
    });
  });

  describe('completed phases from audit entries', () => {
    it('should count completed phases from audit entries', async () => {
      const session = createTestSession({
        id: 'wf-test-001',
        phasesCompleted: [], // context.json has bug - empty
      });
      mockProvider.addSession(session);

      // Add completed phases
      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'init',
        timestamp: '2026-02-16T10:00:00.000Z',
        status: 'complete',
        session_id: 'wf-test-001',
        worktree: '/tmp/wt',
        branch: 'b',
        spec_file: 's.md',
      } as AuditEntry);
      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'plan',
        timestamp: '2026-02-16T10:01:00.000Z',
        status: 'complete',
        issues_created: [],
        total_tasks: 3,
      } as AuditEntry);
      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'execute',
        timestamp: '2026-02-16T10:02:00.000Z',
        status: 'complete',
        issues_created: [],
        total_tasks: 3,
      } as AuditEntry);
      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'verify',
        timestamp: '2026-02-16T10:03:00.000Z',
        status: 'started',
        tests_exit_code: 0,
        tests_total: 10,
        tests_passed: 10,
        git_clean: true,
      } as AuditEntry);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      // plan and execute are in the tracked set; init is not
      expect(meta.phasesCompleted).toEqual(expect.arrayContaining(['plan', 'execute']));
      expect(meta.phasesCompleted).not.toContain('verify'); // only started, not complete
    });
  });

  describe('duration calculation', () => {
    it('should calculate duration correctly', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const session = createTestSession({
        id: 'wf-test-001',
        startedAt: tenMinutesAgo,
      });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      // Should be approximately "10m Xs"
      expect(meta.duration).toMatch(/^10m \d+s$/);
    });

    it('should show seconds only for short durations', async () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      const session = createTestSession({
        id: 'wf-test-001',
        startedAt: thirtySecondsAgo,
      });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.duration).toMatch(/^\d+s$/);
    });
  });

  describe('checkpoint info', () => {
    it('should include checkpoint info when checkpoint exists', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      const checkpoint = createTestCheckpoint('wf-test-001', {
        checkpointId: 'chk-resume-001',
        lastAction: 'Implemented feature X',
        resumeInstructions: 'Continue with task-3',
      });
      await mockProvider.saveCheckpoint(checkpoint);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.checkpoint).toBeDefined();
      expect(meta.checkpoint.checkpointId).toBe('chk-resume-001');
      expect(meta.checkpoint.lastAction).toBe('Implemented feature X');
      expect(meta.checkpoint.resumeInstructions).toBe('Continue with task-3');
    });

    it('should return null checkpoint when none exists', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.checkpoint).toBeNull();
    });
  });

  describe('blocker info', () => {
    it('should include blocker info when blocker.json exists', async () => {
      const session = createTestSession({
        id: 'wf-test-001',
        status: 'paused',
      });
      mockProvider.addSession(session);

      // Set blocker data on the mock provider
      mockProvider.setBlocker('wf-test-001', {
        details: 'Review gate failed: tests not passing',
        phase: 'verify',
        timestamp: '2026-02-16T10:05:00.000Z',
      });

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.blocker).toBeDefined();
      expect(meta.blocker.details).toBe('Review gate failed: tests not passing');
    });

    it('should return null blocker when none exists', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.blocker).toBeNull();
    });
  });

  describe('last activity info', () => {
    it('should include last activity from audit entries', async () => {
      const session = createTestSession({ id: 'wf-test-001' });
      mockProvider.addSession(session);

      await mockProvider.appendAuditEntry('wf-test-001', {
        phase: 'task',
        timestamp: '2026-02-16T10:10:00.000Z',
        status: 'complete',
        task_id: 'ISS-003',
        tests_passed: true,
        commit: 'abc123',
        tdd_certified: true,
        code_review: 'approved',
        files_changed: ['src/foo.ts'],
      } as AuditEntry);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);
      const meta = result.metadata as any;

      expect(meta.lastActivity).toBeDefined();
      expect(meta.lastActivity.phase).toBe('task');
      expect(meta.lastActivity.status).toBe('complete');
      expect(meta.lastActivity.timestamp).toBe('2026-02-16T10:10:00.000Z');
    });
  });

  describe('text output', () => {
    it('should include key status information in text output', async () => {
      const session = createTestSession({
        id: 'wf-test-001',
        specFile: 'SPEC-045.md',
        status: 'running',
        tasksCompleted: ['ISS-001'],
        tasksPending: ['ISS-002', 'ISS-003'],
      });
      mockProvider.addSession(session);

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);

      expect(result.content[0].text).toContain('wf-test-001');
      expect(result.content[0].text).toContain('running');
      expect(result.content[0].text).toContain('1/3');
    });
  });

  describe('error handling', () => {
    it('should handle storage provider errors gracefully', async () => {
      mockProvider.shouldThrowOnGet = true;

      const result = await sessionStatusTool({ sessionId: 'wf-test-001' }, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get session status');
    });

    it('should handle list sessions errors in auto-detect mode', async () => {
      mockProvider.shouldThrowOnListSessions = true;

      const result = await sessionStatusTool({}, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to get session status');
    });
  });
});
