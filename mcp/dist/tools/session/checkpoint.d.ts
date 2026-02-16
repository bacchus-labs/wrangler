/**
 * session_checkpoint tool implementation
 *
 * Saves resumable state for session recovery.
 */
import { z } from 'zod';
import { SessionStorageProvider } from '../../providers/session-storage.js';
export declare const sessionCheckpointSchema: z.ZodObject<{
    sessionId: z.ZodString;
    tasksCompleted: z.ZodArray<z.ZodString, "many">;
    tasksPending: z.ZodArray<z.ZodString, "many">;
    lastAction: z.ZodString;
    resumeInstructions: z.ZodString;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    stepResults: z.ZodOptional<z.ZodArray<z.ZodObject<{
        stepName: z.ZodString;
        status: z.ZodEnum<["passed", "failed", "skipped"]>;
        outputSummary: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "failed" | "passed" | "skipped";
        stepName: string;
        outputSummary?: string | undefined;
    }, {
        status: "failed" | "passed" | "skipped";
        stepName: string;
        outputSummary?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    tasksCompleted: string[];
    tasksPending: string[];
    sessionId: string;
    lastAction: string;
    resumeInstructions: string;
    variables?: Record<string, unknown> | undefined;
    stepResults?: {
        status: "failed" | "passed" | "skipped";
        stepName: string;
        outputSummary?: string | undefined;
    }[] | undefined;
}, {
    tasksCompleted: string[];
    tasksPending: string[];
    sessionId: string;
    lastAction: string;
    resumeInstructions: string;
    variables?: Record<string, unknown> | undefined;
    stepResults?: {
        status: "failed" | "passed" | "skipped";
        stepName: string;
        outputSummary?: string | undefined;
    }[] | undefined;
}>;
export type SessionCheckpointParams = z.infer<typeof sessionCheckpointSchema>;
export declare function sessionCheckpointTool(params: SessionCheckpointParams, storageProvider: SessionStorageProvider): Promise<import("../../types/errors.js").MCPErrorResponse | import("../../types/errors.js").MCPSuccessResponse<{
    sessionId: string;
    checkpointId: string;
    tasksCompleted: number;
    tasksPending: number;
    timestamp: string;
    stepResults: {
        status: "failed" | "passed" | "skipped";
        stepName: string;
        outputSummary?: string | undefined;
    }[] | undefined;
}>>;
//# sourceMappingURL=checkpoint.d.ts.map