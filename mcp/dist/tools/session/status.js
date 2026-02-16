/**
 * session_status tool implementation
 *
 * Provides detailed workflow session status including active step,
 * progress, duration, and blocker information. Derives state from
 * audit entries (reliable) rather than context.json (which has known bugs).
 */
import { SessionStatusParamsSchema } from '../../types/session.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';
export const sessionStatusSchema = SessionStatusParamsSchema;
/** Phases that count as "workflow phases" for completion tracking */
const TRACKED_PHASES = new Set(['plan', 'execute', 'verify', 'publish']);
/**
 * Derive the active step description from the last audit entry.
 */
function deriveActiveStep(lastEntry) {
    if (!lastEntry) {
        return 'unknown';
    }
    const phase = lastEntry.phase;
    const status = lastEntry.status;
    if (status === 'started') {
        return `${phase} (in progress)`;
    }
    else if (status === 'complete' || status === 'completed') {
        return `${phase} just completed, waiting for next step`;
    }
    else if (status === 'failed') {
        return `${phase} FAILED`;
    }
    return `${phase} (${status})`;
}
/**
 * Count completed workflow phases from audit entries.
 * Only tracks: plan, execute, verify, publish
 */
function getCompletedPhases(entries) {
    const completed = new Set();
    for (const entry of entries) {
        if (TRACKED_PHASES.has(entry.phase) &&
            (entry.status === 'complete' || entry.status === 'completed')) {
            completed.add(entry.phase);
        }
    }
    return Array.from(completed).sort();
}
/**
 * Calculate a human-readable duration from a start timestamp.
 */
function calculateDuration(startedAt) {
    try {
        const startMs = new Date(startedAt).getTime();
        const nowMs = Date.now();
        const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
        if (elapsedSeconds < 0) {
            return 'unknown';
        }
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }
    catch {
        return 'unknown';
    }
}
export async function sessionStatusTool(params, storageProvider) {
    try {
        let sessionId = params.sessionId;
        // Auto-detect: find most recent wf-* session
        if (!sessionId) {
            const allSessions = await storageProvider.listSessions();
            const wfSessions = allSessions.filter(s => s.id.startsWith('wf-'));
            if (wfSessions.length === 0) {
                return createErrorResponse(MCPErrorCode.RESOURCE_NOT_FOUND, 'No workflow sessions found');
            }
            // Already sorted by startedAt descending from listSessions
            sessionId = wfSessions[0].id;
        }
        const session = await storageProvider.getSession(sessionId);
        if (!session) {
            return createErrorResponse(MCPErrorCode.RESOURCE_NOT_FOUND, `Session not found: ${sessionId}`);
        }
        // Read audit entries (source of truth)
        const auditEntries = await storageProvider.getAuditEntries(sessionId);
        const lastEntry = auditEntries.length > 0 ? auditEntries[auditEntries.length - 1] : undefined;
        // Derive status fields from audit (not context.json)
        const activeStep = deriveActiveStep(lastEntry);
        const phasesCompleted = getCompletedPhases(auditEntries);
        const duration = calculateDuration(session.startedAt);
        // Task counts from context.json (these are kept up to date by checkpoint)
        const tasksCompleted = session.tasksCompleted.length;
        const tasksPending = session.tasksPending.length;
        const tasksTotal = tasksCompleted + tasksPending;
        // Optional: checkpoint
        const checkpoint = await storageProvider.getCheckpoint(sessionId);
        // Optional: blocker
        const blocker = await storageProvider.getBlocker(sessionId);
        // Last activity summary
        const lastActivity = lastEntry
            ? {
                phase: lastEntry.phase,
                status: lastEntry.status,
                timestamp: lastEntry.timestamp,
            }
            : null;
        // Build text summary
        const textLines = [
            `=== Workflow Status: ${sessionId} ===`,
            '',
            `  Status:        ${session.status}`,
            `  Active Step:   ${activeStep}`,
            `  Phases Done:   ${phasesCompleted.length > 0 ? phasesCompleted.join(', ') : 'none'} (from audit log)`,
            `  Tasks:         ${tasksCompleted}/${tasksTotal} completed`,
            `  Duration:      ${duration}`,
            '',
            `  Spec:          ${session.specFile}`,
            `  Worktree:      ${session.worktreePath}`,
            `  Branch:        ${session.branchName}`,
            '',
            `  Audit Entries: ${auditEntries.length}`,
        ];
        if (lastActivity) {
            textLines.push(`  Last Activity: ${lastActivity.phase} (${lastActivity.status}) at ${lastActivity.timestamp}`);
        }
        if (blocker) {
            textLines.push('');
            textLines.push(`  BLOCKER: ${blocker.details || 'unknown reason'}`);
        }
        return createSuccessResponse(textLines.join('\n'), {
            sessionId,
            status: session.status,
            activeStep,
            phasesCompleted,
            tasksCompleted,
            tasksPending,
            tasksTotal,
            duration,
            specFile: session.specFile,
            worktreePath: session.worktreePath,
            branchName: session.branchName,
            auditEntryCount: auditEntries.length,
            lastActivity,
            checkpoint: checkpoint
                ? {
                    checkpointId: checkpoint.checkpointId,
                    createdAt: checkpoint.createdAt,
                    lastAction: checkpoint.lastAction,
                    resumeInstructions: checkpoint.resumeInstructions,
                }
                : null,
            blocker: blocker || null,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(MCPErrorCode.TOOL_EXECUTION_ERROR, `Failed to get session status: ${message}`, { details: { sessionId: params.sessionId } });
    }
}
//# sourceMappingURL=status.js.map