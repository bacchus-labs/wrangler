/**
 * Core types for the workflow engine.
 * Defines the QueryFunction interface for testability and
 * message types for the Agent SDK integration.
 */

/**
 * Minimal representation of an SDK message.
 * We only care about 'result' messages for structured output.
 */
export interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns' | 'error_max_budget_usd' | 'error_max_structured_output_retries';
  result?: string;
  structured_output?: unknown;
  is_error: boolean;
  num_turns: number;
  total_cost_usd: number;
  session_id: string;
  errors?: string[];
}

export interface SDKOtherMessage {
  type: string;
  [key: string]: unknown;
}

export type SDKMessage = SDKResultMessage | SDKOtherMessage;

/**
 * Options passed to the query function.
 */
export interface QueryOptions {
  prompt: string;
  options?: {
    allowedTools?: string[];
    disallowedTools?: string[];
    outputFormat?: {
      type: 'json_schema';
      schema: Record<string, unknown>;
    };
    model?: string;
    cwd?: string;
    permissionMode?: string;
    allowDangerouslySkipPermissions?: boolean;
    mcpServers?: Record<string, unknown>;
    settingSources?: string[];
    maxTurns?: number;
    systemPrompt?: string | { type: 'preset'; preset: 'claude_code'; append?: string };
  };
}

/**
 * Injectable query function type.
 * In production, this wraps the Agent SDK's query().
 * In tests, this is replaced with a mock.
 */
export type QueryFunction = (params: QueryOptions) => AsyncGenerator<SDKMessage, void>;

/**
 * Engine configuration.
 */
export interface EngineConfig {
  /** Working directory for the workflow */
  workingDirectory: string;
  /** Base directory for resolving relative paths in workflow definitions */
  workflowBaseDir: string;
  /** Default settings from workflow definition */
  defaults: {
    model: string;
    permissionMode: string;
    settingSources: string[];
  };
  /** Dry-run mode: only execute analyze + plan */
  dryRun: boolean;
  /** MCP server configuration for agents */
  mcpServers?: Record<string, unknown>;
  /** Callback invoked after each top-level phase completes */
  onPhaseComplete?: (phaseName: string, context: import('./state.js').WorkflowContext) => Promise<void>;
}

/**
 * Error thrown when a workflow step fails due to a failWhen condition.
 */
export class WorkflowFailure extends Error {
  constructor(
    public readonly stepName: string,
    public readonly condition: string,
    message?: string
  ) {
    super(message ?? `Step "${stepName}" failed: condition "${condition}" evaluated to true`);
    this.name = 'WorkflowFailure';
  }
}

/**
 * Error thrown when a workflow is paused due to blocker escalation.
 */
export class WorkflowPaused extends Error {
  constructor(
    public readonly stepName: string,
    public readonly blockerDetails: string
  ) {
    super(`Workflow paused at step "${stepName}": ${blockerDetails}`);
    this.name = 'WorkflowPaused';
  }
}

/**
 * Audit entry for workflow step transitions.
 */
export interface WorkflowAuditEntry {
  step: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  timestamp: string;
  metadata?: Record<string, unknown>;
}
