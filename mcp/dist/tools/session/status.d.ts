/**
 * session_status tool implementation
 *
 * Provides detailed workflow session status including active step,
 * progress, duration, and blocker information. Derives state from
 * audit entries (reliable) rather than context.json (which has known bugs).
 */
import { z } from 'zod';
import { SessionStorageProvider } from '../../providers/session-storage.js';
export declare const sessionStatusSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId?: string | undefined;
}, {
    sessionId?: string | undefined;
}>;
export type SessionStatusParams = z.infer<typeof sessionStatusSchema>;
export declare function sessionStatusTool(params: SessionStatusParams, storageProvider: SessionStorageProvider): Promise<import("../../types/errors.js").MCPErrorResponse | import("../../types/errors.js").MCPSuccessResponse<{
    sessionId: string;
    status: import("../../types/session.js").SessionStatus;
    activeStep: string;
    phasesCompleted: string[];
    tasksCompleted: number;
    tasksPending: number;
    tasksTotal: number;
    duration: string;
    specFile: string;
    worktreePath: string;
    branchName: string;
    auditEntryCount: number;
    lastActivity: {
        phase: "error" | "init" | "plan" | "execute" | "task" | "verify" | "publish" | "complete" | "checkpoint";
        status: import("../../types/session.js").PhaseStatus;
        timestamp: string;
    } | null;
    checkpoint: {
        checkpointId: string;
        createdAt: string;
        lastAction: string;
        resumeInstructions: string;
    } | null;
    blocker: Record<string, unknown> | null;
}>>;
//# sourceMappingURL=status.d.ts.map