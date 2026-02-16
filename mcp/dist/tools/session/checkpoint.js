/**
 * session_checkpoint tool implementation
 *
 * Saves resumable state for session recovery.
 */
import { SessionCheckpointParamsSchema } from '../../types/session.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';
export const sessionCheckpointSchema = SessionCheckpointParamsSchema;
export async function sessionCheckpointTool(params, storageProvider) {
    try {
        const session = await storageProvider.getSession(params.sessionId);
        if (!session) {
            return createErrorResponse(MCPErrorCode.RESOURCE_NOT_FOUND, `Session not found: ${params.sessionId}`);
        }
        const now = new Date().toISOString();
        const checkpointId = storageProvider.generateCheckpointId();
        const checkpoint = {
            sessionId: params.sessionId,
            checkpointId,
            createdAt: now,
            currentPhase: session.currentPhase,
            tasksCompleted: params.tasksCompleted,
            tasksPending: params.tasksPending,
            variables: params.variables || {},
            lastAction: params.lastAction,
            resumeInstructions: params.resumeInstructions,
            stepResults: params.stepResults,
        };
        await storageProvider.saveCheckpoint(checkpoint);
        let message = `Checkpoint saved: ${checkpointId}\nTasks completed: ${params.tasksCompleted.length}\nTasks pending: ${params.tasksPending.length}`;
        if (params.stepResults && params.stepResults.length > 0) {
            message += `\nSteps reported: ${params.stepResults.length}`;
        }
        return createSuccessResponse(message, {
            sessionId: params.sessionId,
            checkpointId,
            tasksCompleted: params.tasksCompleted.length,
            tasksPending: params.tasksPending.length,
            timestamp: now,
            stepResults: params.stepResults,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(MCPErrorCode.TOOL_EXECUTION_ERROR, `Failed to save checkpoint: ${message}`, { details: { sessionId: params.sessionId } });
    }
}
//# sourceMappingURL=checkpoint.js.map