/**
 * session_get tool implementation
 *
 * Retrieves session state for recovery or status check.
 */

import { z } from 'zod';
import { SessionGetParamsSchema } from '../../types/session.js';
import { SessionStorageProvider } from '../../providers/session-storage.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';

export const sessionGetSchema = SessionGetParamsSchema;

export type SessionGetParams = z.infer<typeof sessionGetSchema>;

export async function sessionGetTool(
  params: SessionGetParams,
  storageProvider: SessionStorageProvider
) {
  try {
    let session;

    if (params.sessionId) {
      // Get specific session
      session = await storageProvider.getSession(params.sessionId);

      if (!session) {
        return createErrorResponse(
          MCPErrorCode.RESOURCE_NOT_FOUND,
          `Session not found: ${params.sessionId}`
        );
      }
    } else {
      // Find most recent incomplete session
      session = await storageProvider.findIncompleteSession();

      if (!session) {
        return createSuccessResponse(
          'No incomplete sessions found',
          { found: false }
        );
      }
    }

    // Get checkpoint if available
    const checkpoint = await storageProvider.getCheckpoint(session.id);

    return createSuccessResponse(
      `Session: ${session.id}\nStatus: ${session.status}\nPhase: ${session.currentPhase}\nTasks completed: ${session.tasksCompleted.length}\nTasks pending: ${session.tasksPending.length}`,
      {
        found: true,
        session: {
          id: session.id,
          specFile: session.specFile,
          status: session.status,
          currentPhase: session.currentPhase,
          worktreePath: session.worktreePath,
          branchName: session.branchName,
          tasksCompleted: session.tasksCompleted,
          tasksPending: session.tasksPending,
          phasesCompleted: session.phasesCompleted,
          startedAt: session.startedAt,
          updatedAt: session.updatedAt,
          completedAt: session.completedAt,
          prUrl: session.prUrl,
          prNumber: session.prNumber,
        },
        checkpoint: checkpoint ? {
          checkpointId: checkpoint.checkpointId,
          createdAt: checkpoint.createdAt,
          lastAction: checkpoint.lastAction,
          resumeInstructions: checkpoint.resumeInstructions,
          variables: checkpoint.variables,
        } : null,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(
      MCPErrorCode.TOOL_EXECUTION_ERROR,
      `Failed to get session: ${message}`,
      { details: { sessionId: params.sessionId } }
    );
  }
}
