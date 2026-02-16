/**
 * Session management types for orchestration workflows
 */
import { z } from 'zod';
export type SessionStatus = 'running' | 'paused' | 'completed' | 'failed';
export type AuditPhase = 'init' | 'plan' | 'execute' | 'task' | 'verify' | 'publish' | 'complete' | 'error' | 'checkpoint';
export type PhaseStatus = 'started' | 'complete' | 'failed';
/**
 * Step result from workflow execution
 */
export interface StepResult {
    /** Step name */
    stepName: string;
    /** Step execution status */
    status: 'passed' | 'failed' | 'skipped';
    /** Summary of output or reason */
    outputSummary?: string;
}
/**
 * Step execution summary for session completion
 */
export interface StepExecutionSummary {
    /** Total number of steps in the workflow */
    totalSteps: number;
    /** Number of steps that were executed */
    executed: number;
    /** Number of steps that were skipped */
    skipped: number;
    /** Names of steps that were skipped */
    skippedSteps: string[];
    /** Per-step details including agent and prompt used */
    stepDetails?: Array<{
        stepName: string;
        status: 'passed' | 'failed' | 'skipped';
        agent?: string;
        prompt?: string;
    }>;
}
/**
 * Main session state interface
 */
export interface Session {
    /** Session ID (e.g., "2025-12-07-abc123-f8d2") */
    id: string;
    /** Spec file being implemented */
    specFile: string;
    /** Current session status */
    status: SessionStatus;
    /** Current phase ID */
    currentPhase: string;
    /** Absolute path to worktree */
    worktreePath: string;
    /** Git branch name */
    branchName: string;
    /** Workflow name (e.g., "spec-implementation") */
    workflow?: string;
    /** Whether to skip pre/post checks */
    skipChecks?: boolean;
    /** Step names to skip */
    skipStepNames?: string[];
    /** Phases that have completed */
    phasesCompleted: string[];
    /** Issue IDs that have been completed */
    tasksCompleted: string[];
    /** Issue IDs still pending */
    tasksPending: string[];
    /** When session started (ISO timestamp) */
    startedAt: string;
    /** When session was last updated (ISO timestamp) */
    updatedAt: string;
    /** When session completed (ISO timestamp) */
    completedAt?: string;
    /** PR URL when published */
    prUrl?: string;
    /** PR number when published */
    prNumber?: number;
}
/**
 * Checkpoint for session recovery
 */
export interface SessionCheckpoint {
    /** Session ID this checkpoint belongs to */
    sessionId: string;
    /** Unique checkpoint ID */
    checkpointId: string;
    /** When checkpoint was created */
    createdAt: string;
    /** Current phase when checkpoint was taken */
    currentPhase: string;
    /** Tasks completed at checkpoint time */
    tasksCompleted: string[];
    /** Tasks still pending at checkpoint time */
    tasksPending: string[];
    /** Arbitrary variables to preserve */
    variables: Record<string, unknown>;
    /** What was being done when checkpoint was taken */
    lastAction: string;
    /** Instructions for how to continue */
    resumeInstructions: string;
    /** Step results since last checkpoint */
    stepResults?: StepResult[];
}
/**
 * Base audit entry interface
 */
export interface BaseAuditEntry {
    /** Phase type */
    phase: AuditPhase;
    /** ISO-8601 timestamp */
    timestamp: string;
    /** Phase status */
    status: PhaseStatus;
}
/**
 * Init phase audit entry
 */
export interface InitAuditEntry extends BaseAuditEntry {
    phase: 'init';
    session_id: string;
    worktree: string;
    branch: string;
    spec_file: string;
}
/**
 * Plan phase audit entry
 */
export interface PlanAuditEntry extends BaseAuditEntry {
    phase: 'plan';
    issues_created: string[];
    total_tasks: number;
}
/**
 * Execute phase audit entry (similar to plan but for tracking execution)
 */
export interface ExecuteAuditEntry extends BaseAuditEntry {
    phase: 'execute';
    issues_created: string[];
    total_tasks: number;
}
/**
 * Task audit entry
 */
export interface TaskAuditEntry extends BaseAuditEntry {
    phase: 'task';
    task_id: string;
    tests_passed: boolean;
    commit: string;
    tdd_certified: boolean;
    code_review: 'approved' | 'changes_requested';
    files_changed: string[];
}
/**
 * Verify phase audit entry
 */
export interface VerifyAuditEntry extends BaseAuditEntry {
    phase: 'verify';
    tests_exit_code: number;
    tests_total: number;
    tests_passed: number;
    git_clean: boolean;
}
/**
 * Publish phase audit entry
 */
export interface PublishAuditEntry extends BaseAuditEntry {
    phase: 'publish';
    pr_url: string;
    pr_number: number;
    branch_pushed: boolean;
}
/**
 * Complete audit entry
 */
export interface CompleteAuditEntry extends BaseAuditEntry {
    phase: 'complete';
    session_id: string;
    duration_ms: number;
    tasks_completed: number;
    pr_url?: string;
}
/**
 * Error audit entry
 */
export interface ErrorAuditEntry extends BaseAuditEntry {
    phase: 'error';
    error_message: string;
    error_code?: string;
    recoverable: boolean;
}
/**
 * Checkpoint audit entry
 */
export interface CheckpointAuditEntry extends BaseAuditEntry {
    phase: 'checkpoint';
    checkpoint_id: string;
    tasks_completed: number;
    tasks_pending: number;
}
/**
 * Union type for all audit entries
 */
export type AuditEntry = InitAuditEntry | PlanAuditEntry | ExecuteAuditEntry | TaskAuditEntry | VerifyAuditEntry | PublishAuditEntry | CompleteAuditEntry | ErrorAuditEntry | CheckpointAuditEntry;
export declare const SessionStatusSchema: z.ZodEnum<["running", "paused", "completed", "failed"]>;
export declare const AuditPhaseSchema: z.ZodEnum<["init", "plan", "execute", "task", "verify", "publish", "complete", "error", "checkpoint"]>;
export declare const PhaseStatusSchema: z.ZodEnum<["started", "complete", "failed"]>;
export declare const SessionSchema: z.ZodObject<{
    id: z.ZodString;
    specFile: z.ZodString;
    status: z.ZodEnum<["running", "paused", "completed", "failed"]>;
    currentPhase: z.ZodString;
    worktreePath: z.ZodString;
    branchName: z.ZodString;
    phasesCompleted: z.ZodArray<z.ZodString, "many">;
    tasksCompleted: z.ZodArray<z.ZodString, "many">;
    tasksPending: z.ZodArray<z.ZodString, "many">;
    startedAt: z.ZodString;
    updatedAt: z.ZodString;
    completedAt: z.ZodOptional<z.ZodString>;
    prUrl: z.ZodOptional<z.ZodString>;
    prNumber: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "running" | "paused" | "completed" | "failed";
    id: string;
    updatedAt: string;
    specFile: string;
    currentPhase: string;
    worktreePath: string;
    branchName: string;
    phasesCompleted: string[];
    tasksCompleted: string[];
    tasksPending: string[];
    startedAt: string;
    completedAt?: string | undefined;
    prUrl?: string | undefined;
    prNumber?: number | undefined;
}, {
    status: "running" | "paused" | "completed" | "failed";
    id: string;
    updatedAt: string;
    specFile: string;
    currentPhase: string;
    worktreePath: string;
    branchName: string;
    phasesCompleted: string[];
    tasksCompleted: string[];
    tasksPending: string[];
    startedAt: string;
    completedAt?: string | undefined;
    prUrl?: string | undefined;
    prNumber?: number | undefined;
}>;
export declare const SessionCheckpointSchema: z.ZodObject<{
    sessionId: z.ZodString;
    checkpointId: z.ZodString;
    createdAt: z.ZodString;
    currentPhase: z.ZodString;
    tasksCompleted: z.ZodArray<z.ZodString, "many">;
    tasksPending: z.ZodArray<z.ZodString, "many">;
    variables: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    lastAction: z.ZodString;
    resumeInstructions: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    currentPhase: string;
    tasksCompleted: string[];
    tasksPending: string[];
    sessionId: string;
    checkpointId: string;
    variables: Record<string, unknown>;
    lastAction: string;
    resumeInstructions: string;
}, {
    createdAt: string;
    currentPhase: string;
    tasksCompleted: string[];
    tasksPending: string[];
    sessionId: string;
    checkpointId: string;
    variables: Record<string, unknown>;
    lastAction: string;
    resumeInstructions: string;
}>;
export declare const StepResultSchema: z.ZodObject<{
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
}>;
export declare const StepExecutionSummarySchema: z.ZodObject<{
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
}>;
export declare const SessionStartParamsSchema: z.ZodObject<{
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
export declare const SessionPhaseParamsSchema: z.ZodObject<{
    sessionId: z.ZodString;
    phase: z.ZodString;
    status: z.ZodEnum<["started", "complete", "failed"]>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "failed" | "complete" | "started";
    sessionId: string;
    phase: string;
    metadata?: Record<string, unknown> | undefined;
}, {
    status: "failed" | "complete" | "started";
    sessionId: string;
    phase: string;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const SessionCheckpointParamsSchema: z.ZodObject<{
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
export declare const SessionCompleteParamsSchema: z.ZodObject<{
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
export declare const SessionGetParamsSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId?: string | undefined;
}, {
    sessionId?: string | undefined;
}>;
export declare const SessionStatusParamsSchema: z.ZodObject<{
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sessionId?: string | undefined;
}, {
    sessionId?: string | undefined;
}>;
export type SessionStatusParams = z.infer<typeof SessionStatusParamsSchema>;
export type SessionStartParams = z.infer<typeof SessionStartParamsSchema>;
export type SessionPhaseParams = z.infer<typeof SessionPhaseParamsSchema>;
export type SessionCheckpointParams = z.infer<typeof SessionCheckpointParamsSchema>;
export type SessionCompleteParams = z.infer<typeof SessionCompleteParamsSchema>;
export type SessionGetParams = z.infer<typeof SessionGetParamsSchema>;
//# sourceMappingURL=session.d.ts.map