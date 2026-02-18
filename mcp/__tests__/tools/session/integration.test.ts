/**
 * Integration tests for session tools workflow
 *
 * Tests the complete session lifecycle: start -> phase -> checkpoint -> complete -> get
 */

import * as path from 'path';
import * as fsExtra from 'fs-extra';
import { jest } from '@jest/globals';

// ESM compat
const fs = (fsExtra as any).default || fsExtra;

import { sessionStartTool } from '../../../src/tools/session/start';
import { sessionPhaseTool } from '../../../src/tools/session/phase';
import { sessionCheckpointTool } from '../../../src/tools/session/checkpoint';
import { sessionCompleteTool } from '../../../src/tools/session/complete';
import { sessionGetTool } from '../../../src/tools/session/get';
import { SessionStorageProvider } from '../../../src/providers/session-storage';
import { createTempDir, cleanupTempDir, createMockSpecFile } from './test-utils';

describe('Session Tools Integration Tests', () => {
  jest.setTimeout(30000);
  let tempDir: string;
  let storageProvider: SessionStorageProvider;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storageProvider = new SessionStorageProvider({ basePath: tempDir });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('Complete Session Lifecycle', () => {
    it('should handle a complete workflow: start -> phases -> checkpoint -> complete', async () => {
      // Step 1: Start session
      const specPath = await createMockSpecFile(tempDir, 'feature-auth.md');

      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );

      expect(startResult.isError).toBe(false);
      const sessionId = startResult.metadata?.sessionId as string;
      expect(sessionId).toBeDefined();

      // Verify session started
      let session = await storageProvider.getSession(sessionId);
      expect(session?.status).toBe('running');
      expect(session?.currentPhase).toBe('init');
      expect(session?.phasesCompleted).toContain('init');

      // Step 2: Plan phase
      const planStartResult = await sessionPhaseTool(
        { sessionId, phase: 'plan', status: 'started' },
        storageProvider
      );
      expect(planStartResult.isError).toBe(false);

      session = await storageProvider.getSession(sessionId);
      expect(session?.currentPhase).toBe('plan');

      const planCompleteResult = await sessionPhaseTool(
        {
          sessionId,
          phase: 'plan',
          status: 'complete',
          metadata: { issues_created: ['ISS-001', 'ISS-002', 'ISS-003'], total_tasks: 3 },
        },
        storageProvider
      );
      expect(planCompleteResult.isError).toBe(false);

      session = await storageProvider.getSession(sessionId);
      expect(session?.phasesCompleted).toContain('plan');

      // Step 3: Execute phase with checkpoints
      await sessionPhaseTool(
        { sessionId, phase: 'execute', status: 'started' },
        storageProvider
      );

      // Checkpoint after first task
      const checkpoint1Result = await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['ISS-001'],
          tasksPending: ['ISS-002', 'ISS-003'],
          lastAction: 'Implemented ISS-001: User login endpoint',
          resumeInstructions: 'Continue with ISS-002: Password reset flow',
          variables: { lastCommit: 'abc123' },
        },
        storageProvider
      );
      expect(checkpoint1Result.isError).toBe(false);

      session = await storageProvider.getSession(sessionId);
      expect(session?.tasksCompleted).toContain('ISS-001');
      expect(session?.tasksPending).toContain('ISS-002');

      // Checkpoint after second task
      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['ISS-001', 'ISS-002'],
          tasksPending: ['ISS-003'],
          lastAction: 'Implemented ISS-002: Password reset',
          resumeInstructions: 'Continue with ISS-003: Session management',
          variables: { lastCommit: 'def456' },
        },
        storageProvider
      );

      // Complete execute phase
      await sessionPhaseTool(
        { sessionId, phase: 'execute', status: 'complete' },
        storageProvider
      );

      // Step 4: Verify phase
      await sessionPhaseTool(
        { sessionId, phase: 'verify', status: 'started' },
        storageProvider
      );
      await sessionPhaseTool(
        {
          sessionId,
          phase: 'verify',
          status: 'complete',
          metadata: { tests_passed: 42, tests_failed: 0 },
        },
        storageProvider
      );

      // Step 5: Complete session
      const completeResult = await sessionCompleteTool(
        {
          sessionId,
          status: 'completed',
          prUrl: 'https://github.com/org/repo/pull/123',
          prNumber: 123,
        },
        storageProvider
      );

      expect(completeResult.isError).toBe(false);
      expect(completeResult.metadata?.status).toBe('completed');
      expect(completeResult.metadata?.prUrl).toBe('https://github.com/org/repo/pull/123');

      // Verify final session state
      const finalSession = await storageProvider.getSession(sessionId);
      expect(finalSession?.status).toBe('completed');
      expect(finalSession?.currentPhase).toBe('complete');
      expect(finalSession?.prUrl).toBe('https://github.com/org/repo/pull/123');
      expect(finalSession?.prNumber).toBe(123);
      expect(finalSession?.completedAt).toBeDefined();

      // Verify audit trail
      const auditEntries = await storageProvider.getAuditEntries(sessionId);
      const phases = auditEntries.map(e => e.phase);
      expect(phases).toContain('init');
      expect(phases).toContain('plan');
      expect(phases).toContain('execute');
      expect(phases).toContain('checkpoint');
      expect(phases).toContain('verify');
      expect(phases).toContain('complete');
    });

    it('should handle session recovery via get tool', async () => {
      // Create a session with checkpoint
      const specPath = await createMockSpecFile(tempDir, 'recovery-test.md');

      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );
      const sessionId = startResult.metadata?.sessionId as string;

      await sessionPhaseTool(
        { sessionId, phase: 'execute', status: 'started' },
        storageProvider
      );

      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1', 'task-2'],
          tasksPending: ['task-3', 'task-4', 'task-5'],
          lastAction: 'Completed task-2 implementation',
          resumeInstructions: 'Run tests for task-2, then continue with task-3',
          variables: { testsPassed: 15, lastFile: 'auth/service.ts' },
        },
        storageProvider
      );

      // Simulate recovery - get session without ID (finds incomplete)
      const getResult = await sessionGetTool({}, storageProvider);
      const getMeta = getResult.metadata as any;

      expect(getResult.isError).toBe(false);
      expect(getMeta.found).toBe(true);
      expect(getMeta.session.id).toBe(sessionId);
      expect(getMeta.session.status).toBe('running');
      expect(getMeta.checkpoint).toBeDefined();
      expect(getMeta.checkpoint.lastAction).toBe('Completed task-2 implementation');
      expect(getMeta.checkpoint.resumeInstructions).toBe(
        'Run tests for task-2, then continue with task-3'
      );
      expect(getMeta.checkpoint.variables.lastFile).toBe('auth/service.ts');
    });

    it('should handle failed session', async () => {
      const specPath = await createMockSpecFile(tempDir, 'failing-feature.md');

      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );
      const sessionId = startResult.metadata?.sessionId as string;

      // Start execute phase
      await sessionPhaseTool(
        { sessionId, phase: 'execute', status: 'started' },
        storageProvider
      );

      // Phase fails
      await sessionPhaseTool(
        {
          sessionId,
          phase: 'execute',
          status: 'failed',
          metadata: { error: 'Tests failed with 5 failures' },
        },
        storageProvider
      );

      // Complete session as failed
      const completeResult = await sessionCompleteTool(
        { sessionId, status: 'failed' },
        storageProvider
      );

      expect(completeResult.isError).toBe(false);
      expect(completeResult.metadata?.status).toBe('failed');

      const session = await storageProvider.getSession(sessionId);
      expect(session?.status).toBe('failed');
    });

    it('should support multiple concurrent sessions', async () => {
      // Start multiple sessions
      const spec1 = await createMockSpecFile(tempDir, 'feature-1.md');
      const spec2 = await createMockSpecFile(tempDir, 'feature-2.md');

      const start1 = await sessionStartTool(
        { specFile: spec1, workingDirectory: tempDir },
        storageProvider
      );
      const start2 = await sessionStartTool(
        { specFile: spec2, workingDirectory: tempDir },
        storageProvider
      );

      expect(start1.isError).toBe(false);
      expect(start2.isError).toBe(false);

      const sessionId1 = start1.metadata?.sessionId as string;
      const sessionId2 = start2.metadata?.sessionId as string;
      expect(sessionId1).not.toBe(sessionId2);

      // Work on both sessions independently
      await sessionPhaseTool(
        { sessionId: sessionId1, phase: 'plan', status: 'complete' },
        storageProvider
      );

      await sessionPhaseTool(
        { sessionId: sessionId2, phase: 'execute', status: 'started' },
        storageProvider
      );

      // Complete first session
      await sessionCompleteTool(
        { sessionId: sessionId1, status: 'completed' },
        storageProvider
      );

      // Verify states are independent
      const session1 = await storageProvider.getSession(sessionId1);
      const session2 = await storageProvider.getSession(sessionId2);

      expect(session1?.status).toBe('completed');
      expect(session2?.status).toBe('running');
      expect(session2?.currentPhase).toBe('execute');

      // Get incomplete should return session2
      const getIncomplete = await sessionGetTool({}, storageProvider);
      expect((getIncomplete.metadata as any)?.session.id).toBe(sessionId2);
    });

    it('should track task progress through checkpoints', async () => {
      const specPath = await createMockSpecFile(tempDir, 'task-tracking.md');

      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );
      const sessionId = startResult.metadata?.sessionId as string;

      // Initial state - no tasks
      let session = await storageProvider.getSession(sessionId);
      expect(session?.tasksCompleted).toEqual([]);
      expect(session?.tasksPending).toEqual([]);

      // First checkpoint - 1 task done
      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1'],
          tasksPending: ['task-2', 'task-3', 'task-4'],
          lastAction: 'Completed task-1',
          resumeInstructions: 'Continue with task-2',
        },
        storageProvider
      );

      session = await storageProvider.getSession(sessionId);
      expect(session?.tasksCompleted).toEqual(['task-1']);
      expect(session?.tasksPending).toEqual(['task-2', 'task-3', 'task-4']);

      // Second checkpoint - 2 more tasks done
      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1', 'task-2', 'task-3'],
          tasksPending: ['task-4'],
          lastAction: 'Completed task-3',
          resumeInstructions: 'Continue with task-4',
        },
        storageProvider
      );

      session = await storageProvider.getSession(sessionId);
      expect(session?.tasksCompleted).toEqual(['task-1', 'task-2', 'task-3']);
      expect(session?.tasksPending).toEqual(['task-4']);

      // Final checkpoint - all done
      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1', 'task-2', 'task-3', 'task-4'],
          tasksPending: [],
          lastAction: 'Completed all tasks',
          resumeInstructions: 'Proceed to verification',
        },
        storageProvider
      );

      session = await storageProvider.getSession(sessionId);
      expect(session?.tasksCompleted).toHaveLength(4);
      expect(session?.tasksPending).toHaveLength(0);
    });
  });

  describe('File System Integration', () => {
    it('should persist session data to filesystem', async () => {
      const specPath = await createMockSpecFile(tempDir, 'persist-test.md');

      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );
      const sessionId = startResult.metadata?.sessionId as string;

      // Verify files were created
      const sessionDir = path.join(tempDir, '.wrangler', 'sessions', sessionId);
      expect(await fs.pathExists(sessionDir)).toBe(true);
      expect(await fs.pathExists(path.join(sessionDir, 'context.json'))).toBe(true);
      expect(await fs.pathExists(path.join(sessionDir, 'audit.jsonl'))).toBe(true);

      // Add checkpoint
      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: [],
          tasksPending: [],
          lastAction: 'Test',
          resumeInstructions: 'Continue',
        },
        storageProvider
      );

      expect(await fs.pathExists(path.join(sessionDir, 'checkpoint.json'))).toBe(true);

      // Verify data can be read back
      const contextData = await fs.readJson(path.join(sessionDir, 'context.json'));
      expect(contextData.id).toBe(sessionId);
      expect(contextData.status).toBe('running');

      const checkpointData = await fs.readJson(path.join(sessionDir, 'checkpoint.json'));
      expect(checkpointData.sessionId).toBe(sessionId);
    });

    it('should recover from filesystem on new provider instance', async () => {
      const specPath = await createMockSpecFile(tempDir, 'recovery-fs.md');

      // Create session with first provider
      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );
      const sessionId = startResult.metadata?.sessionId as string;

      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1'],
          tasksPending: ['task-2'],
          lastAction: 'Work in progress',
          resumeInstructions: 'Keep going',
          variables: { important: 'data' },
        },
        storageProvider
      );

      // Create new provider instance (simulating restart)
      const newProvider = new SessionStorageProvider({ basePath: tempDir });

      // Should be able to read session from new provider
      const session = await newProvider.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.tasksCompleted).toEqual(['task-1']);

      // Should be able to read checkpoint
      const checkpoint = await newProvider.getCheckpoint(sessionId);
      expect(checkpoint).toBeDefined();
      expect(checkpoint?.variables.important).toBe('data');

      // Should be able to find incomplete session
      const incomplete = await newProvider.findIncompleteSession();
      expect(incomplete?.id).toBe(sessionId);
    });
  });

  describe('Error Recovery', () => {
    it('should allow resuming from checkpoint after simulated crash', async () => {
      const specPath = await createMockSpecFile(tempDir, 'crash-recovery.md');

      // Start session and create checkpoint
      const startResult = await sessionStartTool(
        { specFile: specPath, workingDirectory: tempDir },
        storageProvider
      );
      const sessionId = startResult.metadata?.sessionId as string;

      await sessionPhaseTool(
        { sessionId, phase: 'execute', status: 'started' },
        storageProvider
      );

      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1', 'task-2'],
          tasksPending: ['task-3'],
          lastAction: 'Finished task-2, about to start task-3',
          resumeInstructions: 'Pick up from task-3: implement validation logic',
          variables: {
            currentFile: 'src/validators.ts',
            lastTestRun: 'all passed',
          },
        },
        storageProvider
      );

      // Simulate crash by creating new provider
      const recoveryProvider = new SessionStorageProvider({ basePath: tempDir });

      // Get session state for recovery
      const getResult = await sessionGetTool({ sessionId }, recoveryProvider);
      const getResultMeta = getResult.metadata as any;

      expect(getResult.isError).toBe(false);
      expect(getResultMeta.session.currentPhase).toBe('execute');
      // The session should have the task data from the checkpoint save
      expect(getResultMeta.session.tasksCompleted).toEqual(['task-1', 'task-2']);
      expect(getResultMeta.session.tasksPending).toEqual(['task-3']);
      // Checkpoint should be available
      expect(getResultMeta.checkpoint).toBeDefined();
      if (getResultMeta.checkpoint) {
        expect(getResultMeta.checkpoint.resumeInstructions).toContain('task-3');
      }

      // Continue from checkpoint
      await sessionCheckpointTool(
        {
          sessionId,
          tasksCompleted: ['task-1', 'task-2', 'task-3'],
          tasksPending: [],
          lastAction: 'Finished task-3',
          resumeInstructions: 'All tasks done, ready for verify phase',
        },
        recoveryProvider
      );

      // Complete successfully
      await sessionCompleteTool(
        { sessionId, status: 'completed' },
        recoveryProvider
      );

      const finalSession = await recoveryProvider.getSession(sessionId);
      expect(finalSession?.status).toBe('completed');
      expect(finalSession?.tasksCompleted).toEqual(['task-1', 'task-2', 'task-3']);
    });
  });
});
