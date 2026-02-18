/**
 * Tests for session_phase tool
 */

import { sessionPhaseTool, sessionPhaseSchema, SessionPhaseParams } from '../../../src/tools/session/phase';
import { MockSessionStorageProvider, createTestSession } from './test-utils';

describe('sessionPhaseTool', () => {
  let mockProvider: MockSessionStorageProvider;

  beforeEach(() => {
    mockProvider = new MockSessionStorageProvider();
    mockProvider.reset();
  });

  describe('schema validation', () => {
    it('should validate valid params', () => {
      const params: SessionPhaseParams = {
        sessionId: 'test-session-001',
        phase: 'plan',
        status: 'started',
      };

      const result = sessionPhaseSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with metadata', () => {
      const params: SessionPhaseParams = {
        sessionId: 'test-session-001',
        phase: 'execute',
        status: 'complete',
        metadata: {
          issues_created: ['ISS-001', 'ISS-002'],
          total_tasks: 5,
        },
      };

      const result = sessionPhaseSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject empty sessionId', () => {
      const params = {
        sessionId: '',
        phase: 'plan',
        status: 'started',
      };

      const result = sessionPhaseSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject empty phase', () => {
      const params = {
        sessionId: 'test-session-001',
        phase: '',
        status: 'started',
      };

      const result = sessionPhaseSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const params = {
        sessionId: 'test-session-001',
        phase: 'plan',
        status: 'invalid',
      };

      const result = sessionPhaseSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should accept all valid status values', () => {
      const statuses = ['started', 'complete', 'failed'];
      for (const status of statuses) {
        const params = {
          sessionId: 'test-session-001',
          phase: 'plan',
          status,
        };
        const result = sessionPhaseSchema.safeParse(params);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('tool execution', () => {
    it('should record phase transition started', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'plan',
        status: 'started',
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Phase plan started');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sessionId).toBe('session-123');
      expect(result.metadata?.phase).toBe('plan');
      expect(result.metadata?.status).toBe('started');
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should record phase transition complete', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'plan',
        phasesCompleted: ['init'],
      });
      mockProvider.addSession(session);

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'plan',
        status: 'complete',
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Phase plan complete');

      // Verify session was updated
      const updatedSession = await mockProvider.getSession('session-123');
      expect(updatedSession?.currentPhase).toBe('plan');
      expect(updatedSession?.phasesCompleted).toContain('plan');
    });

    it('should record phase transition failed', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'execute',
      });
      mockProvider.addSession(session);

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'execute',
        status: 'failed',
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Phase execute failed');
    });

    it('should include metadata in audit entry', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'plan',
        status: 'complete',
        metadata: {
          issues_created: ['ISS-001', 'ISS-002'],
          total_tasks: 5,
        },
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(false);

      // Verify audit entry was created with metadata
      const auditEntries = await mockProvider.getAuditEntries('session-123');
      const lastEntry = auditEntries[auditEntries.length - 1];
      expect(lastEntry.phase).toBe('plan');
      expect((lastEntry as any).issues_created).toEqual(['ISS-001', 'ISS-002']);
      expect((lastEntry as any).total_tasks).toBe(5);
    });

    it('should handle all standard phases', async () => {
      const phases = ['plan', 'execute', 'task', 'verify', 'publish'];

      for (const phase of phases) {
        const session = createTestSession({ id: `session-${phase}` });
        mockProvider.addSession(session);

        const params: SessionPhaseParams = {
          sessionId: `session-${phase}`,
          phase,
          status: 'complete',
        };

        const result = await sessionPhaseTool(params, mockProvider);
        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(`Phase ${phase} complete`);
      }
    });

    it('should update currentPhase in session', async () => {
      const session = createTestSession({
        id: 'session-123',
        currentPhase: 'init',
      });
      mockProvider.addSession(session);

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'execute',
        status: 'started',
      };

      await sessionPhaseTool(params, mockProvider);

      const updatedSession = await mockProvider.getSession('session-123');
      expect(updatedSession?.currentPhase).toBe('execute');
    });

    it('should not add to phasesCompleted when status is not complete', async () => {
      const session = createTestSession({
        id: 'session-123',
        phasesCompleted: ['init'],
      });
      mockProvider.addSession(session);

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'plan',
        status: 'started',
      };

      await sessionPhaseTool(params, mockProvider);

      const updatedSession = await mockProvider.getSession('session-123');
      expect(updatedSession?.phasesCompleted).not.toContain('plan');
    });

    it('should return error for non-existent session', async () => {
      const params: SessionPhaseParams = {
        sessionId: 'non-existent',
        phase: 'plan',
        status: 'started',
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });
  });

  describe('error handling', () => {
    it('should handle storage provider errors gracefully', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnUpdate = true;

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'plan',
        status: 'complete',
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to record phase');
    });

    it('should handle audit append errors gracefully', async () => {
      const session = createTestSession({ id: 'session-123' });
      mockProvider.addSession(session);
      mockProvider.shouldThrowOnAppendAudit = true;

      const params: SessionPhaseParams = {
        sessionId: 'session-123',
        phase: 'plan',
        status: 'started',
      };

      const result = await sessionPhaseTool(params, mockProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to record phase');
    });
  });
});
