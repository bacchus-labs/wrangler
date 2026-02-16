/**
 * session_complete tool implementation
 *
 * Finalizes a session after workflow completion.
 */
import { SessionCompleteParamsSchema } from '../../types/session.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';
export const sessionCompleteSchema = SessionCompleteParamsSchema;
export async function sessionCompleteTool(params, storageProvider) {
    try {
        const session = await storageProvider.getSession(params.sessionId);
        if (!session) {
            return createErrorResponse(MCPErrorCode.RESOURCE_NOT_FOUND, `Session not found: ${params.sessionId}`);
        }
        const now = new Date().toISOString();
        const startTime = new Date(session.startedAt).getTime();
        const endTime = new Date(now).getTime();
        const durationMs = endTime - startTime;
        // Update session to completed/failed
        await storageProvider.updateSession(params.sessionId, {
            status: params.status,
            completedAt: now,
            currentPhase: 'complete',
            prUrl: params.prUrl,
            prNumber: params.prNumber,
        });
        // Write completion audit entry
        await storageProvider.appendAuditEntry(params.sessionId, {
            phase: 'complete',
            timestamp: now,
            status: 'complete',
            session_id: params.sessionId,
            duration_ms: durationMs,
            tasks_completed: session.tasksCompleted.length,
            pr_url: params.prUrl,
        });
        const durationSec = Math.round(durationMs / 1000);
        const durationMin = Math.round(durationSec / 60);
        let message = `Session ${params.status}: ${params.sessionId}\nDuration: ${durationMin} minutes\nTasks completed: ${session.tasksCompleted.length}`;
        if (params.prUrl) {
            message += `\nPR: ${params.prUrl}`;
        }
        if (params.stepExecutionSummary) {
            const s = params.stepExecutionSummary;
            message += `\nSteps: ${s.executed}/${s.totalSteps} executed, ${s.skipped} skipped`;
        }
        return createSuccessResponse(message, {
            sessionId: params.sessionId,
            status: params.status,
            durationMs,
            tasksCompleted: session.tasksCompleted.length,
            prUrl: params.prUrl,
            prNumber: params.prNumber,
            stepExecutionSummary: params.stepExecutionSummary,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(MCPErrorCode.TOOL_EXECUTION_ERROR, `Failed to complete session: ${message}`, { details: { sessionId: params.sessionId } });
    }
}
//# sourceMappingURL=complete.js.map