/**
 * session_checkpoint tool implementation
 *
 * Saves resumable state for session recovery.
 */

import { z } from 'zod';
import { SessionCheckpoint, SessionCheckpointParamsSchema, StepResult } from '../../types/session.js';
import { SessionStorageProvider } from '../../providers/session-storage.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';

export const sessionCheckpointSchema = SessionCheckpointParamsSchema;

export type SessionCheckpointParams = z.infer<typeof sessionCheckpointSchema>;

export async function sessionCheckpointTool(
  params: SessionCheckpointParams,
  storageProvider: SessionStorageProvider
) {
  try {
    const session = await storageProvider.getSession(params.sessionId);

    if (!session) {
      return createErrorResponse(
        MCPErrorCode.RESOURCE_NOT_FOUND,
        `Session not found: ${params.sessionId}`
      );
    }

    const now = new Date().toISOString();
    const checkpointId = storageProvider.generateCheckpointId();

    const checkpoint: SessionCheckpoint = {
      sessionId: params.sessionId,
      checkpointId,
      createdAt: now,
      currentPhase: session.currentPhase,
      tasksCompleted: params.tasksCompleted,
      tasksPending: params.tasksPending,
      variables: params.variables || {},
      lastAction: params.lastAction,
      resumeInstructions: params.resumeInstructions,
      stepResults: params.stepResults as StepResult[] | undefined,
    };

    await storageProvider.saveCheckpoint(checkpoint);

    let message = `Checkpoint saved: ${checkpointId}\nTasks completed: ${params.tasksCompleted.length}\nTasks pending: ${params.tasksPending.length}`;
    if (params.stepResults && params.stepResults.length > 0) {
      message += `\nSteps reported: ${params.stepResults.length}`;
    }

    return createSuccessResponse(
      message,
      {
        sessionId: params.sessionId,
        checkpointId,
        tasksCompleted: params.tasksCompleted.length,
        tasksPending: params.tasksPending.length,
        timestamp: now,
        stepResults: params.stepResults,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(
      MCPErrorCode.TOOL_EXECUTION_ERROR,
      `Failed to save checkpoint: ${message}`,
      { details: { sessionId: params.sessionId } }
    );
  }
}
