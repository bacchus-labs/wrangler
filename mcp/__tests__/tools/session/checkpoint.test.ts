/**
 * Tests for session_checkpoint tool
 */

import { sessionCheckpointTool, sessionCheckpointSchema, SessionCheckpointParams } from '../../../tools/session/checkpoint';
import { MockSessionStorageProvider, createTestSession } from './test-utils';

describe('sessionCheckpointTool', () => {
  let mockProvider: MockSessionStorageProvider;

  beforeEach(() => {
    mockProvider = new MockSessionStorageProvider();
    mockProvider.reset();
  });

  describe('schema validation', () => {
    it('should validate valid params', () => {
      const params: SessionCheckpointParams = {
        sessionId: 'test-session-001',
        tasksCompleted: ['task-1', 'task-2'],
        tasksPending: ['task-3'],
        lastAction: 'Completed task-2',
        resumeInstructions: 'Continue with task-3',
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with variables', () => {
      const params: SessionCheckpointParams = {
        sessionId: 'test-session-001',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2', 'task-3'],
        lastAction: 'Completed task-1',
        resumeInstructions: 'Continue with task-2',
        variables: {
          lastCommit: 'abc123',
          prNumber: 42,
          customData: { nested: 'value' },
        },
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject empty sessionId', () => {
      const params = {
        sessionId: '',
        tasksCompleted: ['task-1'],
        tasksPending: [],
        lastAction: 'Completed task-1',
        resumeInstructions: 'Done',
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject missing tasksCompleted', () => {
      const params = {
        sessionId: 'test-session-001',
        tasksPending: [],
        lastAction: 'Something',
        resumeInstructions: 'Continue',
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject missing tasksPending', () => {
      const params = {
        sessionId: 'test-session-001',
        tasksCompleted: [],
        lastAction: 'Something',
        resumeInstructions: 'Continue',
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should validate params with stepResults', () => {
      const params = {
        sessionId: 'test-session-001',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Completed task-1',
        resumeInstructions: 'Continue with task-2',
        stepResults: [
          { stepName: 'plan', status: 'passed', outputSummary: 'Created 3 issues' },
          { stepName: 'implement', status: 'failed', outputSummary: 'Build error' },
        ],
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject stepResults with invalid status', () => {
      const params = {
        sessionId: 'test-session-001',
        tasksCompleted: [],
        tasksPending: [],
        lastAction: 'Test',
        resumeInstructions: 'Continue',
        stepResults: [
          { stepName: 'plan', status: 'invalid_status' },
        ],
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should allow empty arrays for tasks', () => {
      const params: SessionCheckpointParams = {
        sessionId: 'test-session-001',
        tasksCompleted: [],
        tasksPending: [],
        lastAction: 'Initial checkpoint',
        resumeInstructions: 'Start from beginning',
      };

      const result = sessionCheckpointSchema.safeParse(params);
      expect(result.success).toBe(true);
    });
  });

  describe('tool execution', () => {
    it('should save checkpoint with minimal params', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1', 'task-2'],
        tasksPending: ['task-3', 'task-4'],
        lastAction: 'Completed task-2 implementation',
        resumeInstructions: 'Continue with task-3: Add validation logic',
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Checkpoint saved');
      expect(result.content[0].text).toContain('Tasks completed: 2');
      expect(result.content[0].text).toContain('Tasks pending: 2');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sessionId).toBe('session-123');
      expect(result.metadata?.checkpointId).toBeDefined();
      expect(result.metadata?.tasksCompleted).toBe(2);
      expect(result.metadata?.tasksPending).toBe(2);
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should save checkpoint with variables', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Committed changes',
        resumeInstructions: 'Continue with task-2',
        variables: {
          lastCommit: 'abc123def',
          branchName: 'feature/test',
          testsPassCount: 42,
        },
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(false);

      // Verify checkpoint was saved with variables
      const checkpoint = await mockProvider.getCheckpoint('session-123');
      expect(checkpoint).toBeDefined();
      expect(checkpoint?.variables).toEqual({
        lastCommit: 'abc123def',
        branchName: 'feature/test',
        testsPassCount: 42,
      });
    });

    it('should update session with checkpoint data', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
        tasksCompleted: [],
        tasksPending: ['task-1', 'task-2', 'task-3'],
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1', 'task-2'],
        tasksPending: ['task-3'],
        lastAction: 'Completed tasks 1 and 2',
        resumeInstructions: 'Continue with task-3',
      };

      await sessionCheckpointTool(params, mockProvider);

      // Verify session was updated
      const updatedSession = await mockProvider.getSession('session-123');
      expect(updatedSession?.tasksCompleted).toEqual(['task-1', 'task-2']);
      expect(updatedSession?.tasksPending).toEqual(['task-3']);
    });

    it('should generate unique checkpoint ID', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Test',
        resumeInstructions: 'Continue',
      };

      const result1 = await sessionCheckpointTool(params, mockProvider);
      const result2 = await sessionCheckpointTool(params, mockProvider);

      expect(result1.isError).toBe(false);
      expect(result2.isError).toBe(false);
      expect(result1.metadata?.checkpointId).not.toBe(result2.metadata?.checkpointId);
    });

    it('should store currentPhase from session', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'verify',
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: [],
        lastAction: 'Verifying build',
        resumeInstructions: 'Check build results',
      };

      await sessionCheckpointTool(params, mockProvider);

      const checkpoint = await mockProvider.getCheckpoint('session-123');
      expect(checkpoint?.currentPhase).toBe('verify');
    });

    it('should return error for non-existent session', async () => {
      const params: SessionCheckpointParams = {
        sessionId: 'non-existent',
        tasksCompleted: [],
        tasksPending: [],
        lastAction: 'Test',
        resumeInstructions: 'Continue',
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('should handle empty tasks arrays', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: [],
        tasksPending: [],
        lastAction: 'Initial state',
        resumeInstructions: 'Start implementation',
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Tasks completed: 0');
      expect(result.content[0].text).toContain('Tasks pending: 0');
    });

    it('should include stepResults in checkpoint', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Completed planning',
        resumeInstructions: 'Continue with execution',
        stepResults: [
          { stepName: 'plan', status: 'passed', outputSummary: 'Created 3 issues' },
          { stepName: 'review-gate', status: 'skipped', outputSummary: 'Skipped by config' },
        ],
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(false);

      const checkpoint = await mockProvider.getCheckpoint('session-123');
      expect(checkpoint?.stepResults).toHaveLength(2);
      expect(checkpoint?.stepResults?.[0]).toEqual({
        stepName: 'plan',
        status: 'passed',
        outputSummary: 'Created 3 issues',
      });
      expect(checkpoint?.stepResults?.[1].status).toBe('skipped');
    });

    it('should include stepResults count in response text', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Completed planning',
        resumeInstructions: 'Continue with execution',
        stepResults: [
          { stepName: 'plan', status: 'passed' },
        ],
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Steps reported: 1');
    });

    it('should work without stepResults (backward compatible)', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Completed task',
        resumeInstructions: 'Continue',
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(false);
      const checkpoint = await mockProvider.getCheckpoint('session-123');
      expect(checkpoint?.stepResults).toBeUndefined();
    });

    it('should preserve lastAction and resumeInstructions', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: ['task-2'],
        lastAction: 'Implemented authentication module',
        resumeInstructions: 'Next: implement the authorization middleware in auth/middleware.ts',
      };

      await sessionCheckpointTool(params, mockProvider);

      const checkpoint = await mockProvider.getCheckpoint('session-123');
      expect(checkpoint?.lastAction).toBe('Implemented authentication module');
      expect(checkpoint?.resumeInstructions).toBe(
        'Next: implement the authorization middleware in auth/middleware.ts'
      );
    });
  });

  describe('error handling', () => {
    it('should handle storage provider errors gracefully', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnSaveCheckpoint = true;

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: ['task-1'],
        tasksPending: [],
        lastAction: 'Test',
        resumeInstructions: 'Continue',
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to save checkpoint');
    });

    it('should include session ID in error details', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnSaveCheckpoint = true;

      const params: SessionCheckpointParams = {
        sessionId: 'session-123',
        tasksCompleted: [],
        tasksPending: [],
        lastAction: 'Test',
        resumeInstructions: 'Continue',
      };

      const result = await sessionCheckpointTool(params, mockProvider);

      expect(result.isError).toBe(true);
    });
  });
});
