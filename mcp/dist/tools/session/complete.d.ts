/**
 * session_complete tool implementation
 *
 * Finalizes a session after workflow completion.
 */
import { z } from 'zod';
import { SessionStorageProvider } from '../../providers/session-storage.js';
export declare const sessionCompleteSchema: z.ZodObject<{
    sessionId: z.ZodString;
    status: z.ZodEnum<["completed", "failed"]>;
    prUrl: z.ZodOptional<z.ZodString>;
    prNumber: z.ZodOptional<z.ZodNumber>;
    summary: z.ZodOptional<z.ZodString>;
    stepExecutionSummary: z.ZodOptional<z.ZodObject<{
        totalSteps: z.ZodNumber;
        executed: z.ZodNumber;
        skipped: z.ZodNumber;
        skippedSteps: z.ZodArray<z.ZodString, "many">;
        stepDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
            stepName: z.ZodString;
            status: z.ZodEnum<["passed", "failed", "skipped"]>;
            agent: z.ZodOptional<z.ZodString>;
            prompt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }, {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        skipped: number;
        totalSteps: number;
        executed: number;
        skippedSteps: string[];
        stepDetails?: {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }[] | undefined;
    }, {
        skipped: number;
        totalSteps: number;
        executed: number;
        skippedSteps: string[];
        stepDetails?: {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "failed";
    sessionId: string;
    summary?: string | undefined;
    prUrl?: string | undefined;
    prNumber?: number | undefined;
    stepExecutionSummary?: {
        skipped: number;
        totalSteps: number;
        executed: number;
        skippedSteps: string[];
        stepDetails?: {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }[] | undefined;
    } | undefined;
}, {
    status: "completed" | "failed";
    sessionId: string;
    summary?: string | undefined;
    prUrl?: string | undefined;
    prNumber?: number | undefined;
    stepExecutionSummary?: {
        skipped: number;
        totalSteps: number;
        executed: number;
        skippedSteps: string[];
        stepDetails?: {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }[] | undefined;
    } | undefined;
}>;
export type SessionCompleteParams = z.infer<typeof sessionCompleteSchema>;
export declare function sessionCompleteTool(params: SessionCompleteParams, storageProvider: SessionStorageProvider): Promise<import("../../types/errors.js").MCPErrorResponse | import("../../types/errors.js").MCPSuccessResponse<{
    sessionId: string;
    status: "completed" | "failed";
    durationMs: number;
    tasksCompleted: number;
    prUrl: string | undefined;
    prNumber: number | undefined;
    stepExecutionSummary: {
        skipped: number;
        totalSteps: number;
        executed: number;
        skippedSteps: string[];
        stepDetails?: {
            status: "failed" | "passed" | "skipped";
            stepName: string;
            agent?: string | undefined;
            prompt?: string | undefined;
        }[] | undefined;
    } | undefined;
}>>;
//# sourceMappingURL=complete.d.ts.map