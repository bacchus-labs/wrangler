/**
 * Session management types for orchestration workflows
 */
import { z } from 'zod';
// Zod Schemas
export const SessionStatusSchema = z.enum(['running', 'paused', 'completed', 'failed']);
export const AuditPhaseSchema = z.enum([
    'init', 'plan', 'execute', 'task', 'verify', 'publish', 'complete', 'error', 'checkpoint'
]);
export const PhaseStatusSchema = z.enum(['started', 'complete', 'failed']);
export const SessionSchema = z.object({
    id: z.string().min(1),
    specFile: z.string().min(1),
    status: SessionStatusSchema,
    currentPhase: z.string(),
    worktreePath: z.string(),
    branchName: z.string(),
    phasesCompleted: z.array(z.string()),
    tasksCompleted: z.array(z.string()),
    tasksPending: z.array(z.string()),
    startedAt: z.string(),
    updatedAt: z.string(),
    completedAt: z.string().optional(),
    prUrl: z.string().optional(),
    prNumber: z.number().int().positive().optional(),
});
export const SessionCheckpointSchema = z.object({
    sessionId: z.string().min(1),
    checkpointId: z.string().min(1),
    createdAt: z.string(),
    currentPhase: z.string(),
    tasksCompleted: z.array(z.string()),
    tasksPending: z.array(z.string()),
    variables: z.record(z.unknown()),
    lastAction: z.string(),
    resumeInstructions: z.string(),
});
// Tool parameter schemas
export const StepResultSchema = z.object({
    stepName: z.string().min(1).describe('Step name'),
    status: z.enum(['passed', 'failed', 'skipped']).describe('Step execution status'),
    outputSummary: z.string().optional().describe('Summary of output or reason'),
});
export const StepExecutionSummarySchema = z.object({
    totalSteps: z.number().int().min(0).describe('Total number of steps in the workflow'),
    executed: z.number().int().min(0).describe('Number of steps that were executed'),
    skipped: z.number().int().min(0).describe('Number of steps that were skipped'),
    skippedSteps: z.array(z.string()).describe('Names of steps that were skipped'),
    stepDetails: z.array(z.object({
        stepName: z.string().min(1),
        status: z.enum(['passed', 'failed', 'skipped']),
        agent: z.string().optional(),
        prompt: z.string().optional(),
    })).optional().describe('Per-step details including agent and prompt used'),
});
export const SessionStartParamsSchema = z.object({
    specFile: z.string().min(1).describe('Path to spec file'),
    workingDirectory: z.string().optional().describe('Override working directory'),
    workflow: z.string().optional().describe('Workflow name (defaults to "spec-implementation")'),
    skipChecks: z.boolean().optional().describe('Whether to skip pre/post checks'),
    skipStepNames: z.array(z.string()).optional().describe('Step names to skip'),
});
export const SessionPhaseParamsSchema = z.object({
    sessionId: z.string().min(1).describe('Session ID'),
    phase: z.string().min(1).describe('Phase name (plan, execute, verify, publish)'),
    status: PhaseStatusSchema.describe('Phase status'),
    metadata: z.record(z.unknown()).optional().describe('Phase-specific metadata'),
});
export const SessionCheckpointParamsSchema = z.object({
    sessionId: z.string().min(1).describe('Session ID'),
    tasksCompleted: z.array(z.string()).describe('Completed task IDs'),
    tasksPending: z.array(z.string()).describe('Pending task IDs'),
    lastAction: z.string().describe('What was just done'),
    resumeInstructions: z.string().describe('How to continue if interrupted'),
    variables: z.record(z.unknown()).optional().describe('Variables to preserve'),
    stepResults: z.array(StepResultSchema).optional().describe('Step results since last checkpoint'),
});
export const SessionCompleteParamsSchema = z.object({
    sessionId: z.string().min(1).describe('Session ID'),
    status: z.enum(['completed', 'failed']).describe('Final session status'),
    prUrl: z.string().optional().describe('PR URL if created'),
    prNumber: z.number().int().positive().optional().describe('PR number if created'),
    summary: z.string().optional().describe('Completion summary'),
    stepExecutionSummary: StepExecutionSummarySchema.optional().describe('Step execution summary'),
});
export const SessionGetParamsSchema = z.object({
    sessionId: z.string().optional().describe('Session ID (omit for most recent incomplete)'),
});
export const SessionStatusParamsSchema = z.object({
    sessionId: z.string().optional().describe('Session ID. If omitted, finds the most recent workflow session.'),
});
//# sourceMappingURL=session.js.map