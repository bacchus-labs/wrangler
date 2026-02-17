import type { WorkflowAuditEntry } from '../types.js';
import type { ExecutionSummary } from '../state.js';

/**
 * Step visibility for reporter rendering.
 * - visible: shown in live updates and final summary
 * - silent: never shown
 * - summary: shown only in final summary
 */
export type StepVisibility = 'visible' | 'silent' | 'summary';

/**
 * Context provided to reporters at initialization.
 */
export interface ReporterContext {
  sessionId: string;
  specFile: string;
  branchName: string;
  worktreePath: string;
  steps: Array<{ name: string; visibility: StepVisibility }>;
  prNumber?: number;
  prUrl?: string;
}

/**
 * Interface that all workflow reporters must implement.
 */
export interface WorkflowReporter {
  /** Reporter type identifier (e.g., 'github-pr-comment') */
  readonly type: string;

  /** Initialize the reporter (e.g., create initial PR comment) */
  initialize(context: ReporterContext): Promise<void>;

  /** Handle an audit entry (step started/completed/failed/skipped) */
  onAuditEntry(entry: WorkflowAuditEntry): Promise<void>;

  /** Handle workflow completion */
  onComplete(summary: ExecutionSummary): Promise<void>;

  /** Handle workflow error */
  onError(error: Error): Promise<void>;

  /** Clean up resources */
  dispose(): Promise<void>;
}

/**
 * Factory function type for creating reporter instances.
 */
export type ReporterFactory = (config: Record<string, unknown>) => WorkflowReporter;
