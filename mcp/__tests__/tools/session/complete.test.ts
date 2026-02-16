/**
 * Tests for session_complete tool
 */

import { sessionCompleteTool, sessionCompleteSchema, SessionCompleteParams } from '../../../tools/session/complete';
import { MockSessionStorageProvider, createTestSession } from './test-utils';

describe('sessionCompleteTool', () => {
  let mockProvider: MockSessionStorageProvider;

  beforeEach(() => {
    mockProvider = new MockSessionStorageProvider();
    mockProvider.reset();
  });

  describe('schema validation', () => {
    it('should validate valid params with completed status', () => {
      const params: SessionCompleteParams = {
        sessionId: 'test-session-001',
        status: 'completed',
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate valid params with failed status', () => {
      const params: SessionCompleteParams = {
        sessionId: 'test-session-001',
        status: 'failed',
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with PR info', () => {
      const params: SessionCompleteParams = {
        sessionId: 'test-session-001',
        status: 'completed',
        prUrl: 'https://github.com/org/repo/pull/123',
        prNumber: 123,
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with summary', () => {
      const params: SessionCompleteParams = {
        sessionId: 'test-session-001',
        status: 'completed',
        summary: 'Successfully implemented authentication feature',
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject empty sessionId', () => {
      const params = {
        sessionId: '',
        status: 'completed',
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const params = {
        sessionId: 'test-session-001',
        status: 'running',
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should validate params with stepExecutionSummary', () => {
      const params = {
        sessionId: 'test-session-001',
        status: 'completed',
        stepExecutionSummary: {
          totalSteps: 5,
          executed: 4,
          skipped: 1,
          skippedSteps: ['lint'],
          stepDetails: [
            { stepName: 'plan', status: 'passed', agent: 'planner', prompt: 'plan-spec' },
            { stepName: 'implement', status: 'passed', agent: 'implementer', prompt: 'implement-task' },
          ],
        },
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate stepExecutionSummary without stepDetails', () => {
      const params = {
        sessionId: 'test-session-001',
        status: 'completed',
        stepExecutionSummary: {
          totalSteps: 3,
          executed: 3,
          skipped: 0,
          skippedSteps: [],
        },
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject negative PR number', () => {
      const params = {
        sessionId: 'test-session-001',
        status: 'completed',
        prNumber: -1,
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject zero PR number', () => {
      const params = {
        sessionId: 'test-session-001',
        status: 'completed',
        prNumber: 0,
      };

      const result = sessionCompleteSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('tool execution', () => {
    it('should complete session with status completed', async () => {
      const startTime = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        startedAt: startTime,
        tasksCompleted: ['task-1', 'task-2', 'task-3'],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Session completed');
      expect(result.content[0].text).toContain('session-123');
      expect(result.content[0].text).toContain('Tasks completed: 3');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sessionId).toBe('session-123');
      expect(result.metadata?.status).toBe('completed');
      expect(result.metadata?.tasksCompleted).toBe(3);
      expect(result.metadata?.durationMs).toBeGreaterThan(0);
    });

    it('should complete session with status failed', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: ['task-1'],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'failed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Session failed');
      expect(result.metadata?.status).toBe('failed');
    });

    it('should include PR info when provided', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: ['task-1'],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
        prUrl: 'https://github.com/org/repo/pull/456',
        prNumber: 456,
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('PR: https://github.com/org/repo/pull/456');
      expect(result.metadata?.prUrl).toBe('https://github.com/org/repo/pull/456');
      expect(result.metadata?.prNumber).toBe(456);
    });

    it('should update session in storage', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        currentPhase: 'verify',
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
        prUrl: 'https://github.com/org/repo/pull/789',
        prNumber: 789,
      };

      await sessionCompleteTool(params, mockProvider);

      const updatedSession = await mockProvider.getSession('session-123');
      expect(updatedSession?.status).toBe('completed');
      expect(updatedSession?.currentPhase).toBe('complete');
      expect(updatedSession?.completedAt).toBeDefined();
      expect(updatedSession?.prUrl).toBe('https://github.com/org/repo/pull/789');
      expect(updatedSession?.prNumber).toBe(789);
    });

    it('should write completion audit entry', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: ['task-1', 'task-2'],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      await sessionCompleteTool(params, mockProvider);

      const auditEntries = await mockProvider.getAuditEntries('session-123');
      const completeEntry = auditEntries.find(e => e.phase === 'complete');
      expect(completeEntry).toBeDefined();
      expect(completeEntry?.status).toBe('complete');
      expect((completeEntry as any).session_id).toBe('session-123');
      expect((completeEntry as any).tasks_completed).toBe(2);
      expect((completeEntry as any).duration_ms).toBeDefined();
    });

    it('should calculate duration correctly', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        startedAt: fiveMinutesAgo,
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      // Duration should be approximately 5 minutes (300000ms)
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(300000 - 1000); // Allow 1s tolerance
      expect(result.metadata?.durationMs).toBeLessThan(310000); // Allow some overhead
    });

    it('should display duration in minutes', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        startedAt: tenMinutesAgo,
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Duration:');
      expect(result.content[0].text).toContain('minutes');
    });

    it('should include stepExecutionSummary in metadata when provided', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: ['task-1', 'task-2'],
      });
      mockProvider.addSession(session);

      const stepExecutionSummary = {
        totalSteps: 5,
        executed: 4,
        skipped: 1,
        skippedSteps: ['lint'],
        stepDetails: [
          { stepName: 'plan', status: 'passed' as const, agent: 'planner', prompt: 'plan-spec' },
          { stepName: 'implement', status: 'passed' as const },
        ],
      };

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
        stepExecutionSummary,
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect((result.metadata as any)?.stepExecutionSummary).toBeDefined();
      expect((result.metadata as any)?.stepExecutionSummary.totalSteps).toBe(5);
      expect((result.metadata as any)?.stepExecutionSummary.executed).toBe(4);
      expect((result.metadata as any)?.stepExecutionSummary.skipped).toBe(1);
      expect((result.metadata as any)?.stepExecutionSummary.skippedSteps).toEqual(['lint']);
    });

    it('should include step summary in response text', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: ['task-1'],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
        stepExecutionSummary: {
          totalSteps: 5,
          executed: 4,
          skipped: 1,
          skippedSteps: ['lint'],
        },
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Steps: 4/5 executed');
      expect(result.content[0].text).toContain('1 skipped');
    });

    it('should work without stepExecutionSummary (backward compatible)', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: ['task-1'],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect((result.metadata as any)?.stepExecutionSummary).toBeUndefined();
    });

    it('should return error for non-existent session', async () => {
      const params: SessionCompleteParams = {
        sessionId: 'non-existent',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('should handle session with no completed tasks', async () => {
      const session = createTestSession({
        id: 'session-123',
        status: 'running',
        tasksCompleted: [],
      });
      mockProvider.addSession(session);

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'failed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Tasks completed: 0');
      expect(result.metadata?.tasksCompleted).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle storage provider errors gracefully', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnUpdate = true;

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to complete session');
    });

    it('should handle audit append errors gracefully', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnAppendAudit = true;

      const params: SessionCompleteParams = {
        sessionId: 'session-123',
        status: 'completed',
      };

      const result = await sessionCompleteTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to complete session');
    });
  });
});
