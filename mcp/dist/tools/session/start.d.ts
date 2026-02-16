/**
 * session_start tool implementation
 *
 * Initializes a new orchestration session for spec implementation.
 */
import { z } from 'zod';
import { SessionStorageProvider } from '../../providers/session-storage.js';
export declare const sessionStartSchema: z.ZodObject<{
    specFile: z.ZodString;
    workingDirectory: z.ZodOptional<z.ZodString>;
    workflow: z.ZodOptional<z.ZodString>;
    skipChecks: z.ZodOptional<z.ZodBoolean>;
    skipStepNames: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    specFile: string;
    workingDirectory?: string | undefined;
    workflow?: string | undefined;
    skipChecks?: boolean | undefined;
    skipStepNames?: string[] | undefined;
}, {
    specFile: string;
    workingDirectory?: string | undefined;
    workflow?: string | undefined;
    skipChecks?: boolean | undefined;
    skipStepNames?: string[] | undefined;
}>;
export type SessionStartParams = z.infer<typeof sessionStartSchema>;
export declare function sessionStartTool(params: SessionStartParams, storageProvider: SessionStorageProvider): Promise<import("../../types/errors.js").MCPErrorResponse | import("../../types/errors.js").MCPSuccessResponse<{
    sessionId: string;
    status: string;
    currentPhase: string;
    auditPath: string;
    worktreePath: string;
    branchName: string;
    worktreeCreated: boolean;
    workflow: string;
}>>;
//# sourceMappingURL=start.d.ts.map