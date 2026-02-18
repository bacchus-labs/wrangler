/**
 * Session management types for orchestration workflows
 */

import { z } from 'zod';

// Session status
export type SessionStatus = 'running' | 'paused' | 'completed' | 'failed';

// Phase types for audit entries
export type AuditPhase =
  | 'init'
  | 'plan'
  | 'execute'
  | 'task'
  | 'verify'
  | 'publish'
  | 'complete'
  | 'error'
  | 'checkpoint';

// Phase status
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

  // Context
  /** Absolute path to worktree */
  worktreePath: string;
  /** Git branch name */
  branchName: string;

  // Workflow context
  /** Workflow name (e.g., "spec-implementation") */
  workflow?: string;
  /** Whether to skip pre/post checks */
  skipChecks?: boolean;
  /** Step names to skip */
  skipStepNames?: string[];

  // Tracking
  /** Phases that have completed */
  phasesCompleted: string[];
  /** Issue IDs that have been completed */
  tasksCompleted: string[];
  /** Issue IDs still pending */
  tasksPending: string[];

  // Timing
  /** When session started (ISO timestamp) */
  startedAt: string;
  /** When session was last updated (ISO timestamp) */
  updatedAt: string;
  /** When session completed (ISO timestamp) */
  completedAt?: string;

  // Output
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

  // Resumable state
  /** Current phase when checkpoint was taken */
  currentPhase: string;
  /** Tasks completed at checkpoint time */
  tasksCompleted: string[];
  /** Tasks still pending at checkpoint time */
  tasksPending: string[];
  /** Arbitrary variables to preserve */
  variables: Record<string, unknown>;

  // Context for resume
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
export type AuditEntry =
  | InitAuditEntry
  | PlanAuditEntry
  | ExecuteAuditEntry
  | TaskAuditEntry
  | VerifyAuditEntry
  | PublishAuditEntry
  | CompleteAuditEntry
  | ErrorAuditEntry
  | CheckpointAuditEntry;

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
export type SessionStatusParams = z.infer<typeof SessionStatusParamsSchema>;

// Type exports from schemas
export type SessionStartParams = z.infer<typeof SessionStartParamsSchema>;
export type SessionPhaseParams = z.infer<typeof SessionPhaseParamsSchema>;
export type SessionCheckpointParams = z.infer<typeof SessionCheckpointParamsSchema>;
export type SessionCompleteParams = z.infer<typeof SessionCompleteParamsSchema>;
export type SessionGetParams = z.infer<typeof SessionGetParamsSchema>;
