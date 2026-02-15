/**
 * Workflow state management.
 * WorkflowContext: Variable storage, expression evaluation, template vars.
 * WorkflowState: State machine tracking workflow progress.
 */

import picomatch from 'picomatch';
import { resolveExpression } from './loader.js';
import type { TaskDefinition } from './schemas/index.js';

// --- Workflow Status ---

export type WorkflowStatus =
  | 'init'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

// --- Workflow Result ---

export interface WorkflowResult {
  status: WorkflowStatus;
  outputs: Record<string, unknown>;
  completedPhases: string[];
  changedFiles?: string[];
  pausedAtPhase?: string;
  error?: string;
  blockerDetails?: string;
}

// --- Workflow Context ---

/**
 * WorkflowContext holds all state during a workflow execution.
 * It stores named outputs from each step and provides
 * expression evaluation and template variable resolution.
 */
export class WorkflowContext {
  private variables: Record<string, unknown>;
  private completedPhases: string[];
  private currentTaskId: string | null;
  private changedFiles: string[];
  private currentPhase: string | null;

  constructor(initialVars: Record<string, unknown> = {}) {
    this.variables = { ...initialVars };
    this.completedPhases = [];
    this.currentTaskId = null;
    this.changedFiles = [];
    this.currentPhase = null;
  }

  /**
   * Set a named output in the context.
   */
  set(name: string, value: unknown): void {
    this.variables[name] = value;
  }

  /**
   * Get a named output from the context.
   */
  get(name: string): unknown {
    return this.variables[name];
  }

  /**
   * Resolve a dot-notation expression against the context variables.
   * e.g., "analysis.tasks" resolves this.variables.analysis.tasks
   */
  resolve(expr: string): unknown {
    return resolveExpression(expr, this.variables);
  }

  /**
   * Evaluate a condition expression.
   * Supports simple truthy checks and basic comparisons.
   *
   * Examples:
   * - "review.hasActionableIssues" -> truthy check
   * - "verification.testSuite.exitCode != 0" -> comparison
   */
  evaluate(condition: string): boolean {
    // Check for comparison operators
    const compMatch = condition.match(/^(.+?)\s*(!==|===|!=|==|>=|<=|>|<)\s*(.+)$/);
    if (compMatch) {
      const [, leftExpr, operator, rightExpr] = compMatch;
      const left = this.resolveValue(leftExpr.trim());
      const right = this.resolveValue(rightExpr.trim());

      switch (operator) {
        case '==': return left == right;   // eslint-disable-line eqeqeq
        case '!=': return left != right;   // eslint-disable-line eqeqeq
        case '===': return left === right;
        case '!==': return left !== right;
        case '>': return Number(left) > Number(right);
        case '<': return Number(left) < Number(right);
        case '>=': return Number(left) >= Number(right);
        case '<=': return Number(left) <= Number(right);
        default: return false;
      }
    }

    // Simple truthy check
    const value = this.resolve(condition);
    return Boolean(value);
  }

  /**
   * Resolve a value that could be a literal or an expression.
   */
  private resolveValue(expr: string): unknown {
    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return Number(expr);
    }
    // String literal (quoted)
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }
    // Boolean literals
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    // Expression (dot notation)
    return this.resolve(expr);
  }

  /**
   * Create a child context for a per-task iteration.
   * The child inherits all parent variables and adds the current task.
   */
  withTask(task: TaskDefinition): WorkflowContext {
    const child = new WorkflowContext({ ...this.variables });
    child.set('task', task);
    child.completedPhases = [...this.completedPhases];
    child.currentTaskId = task.id;
    child.changedFiles = [...this.changedFiles];
    child.currentPhase = this.currentPhase;
    return child;
  }

  /**
   * Merge results from a child task context back into the parent.
   */
  mergeTaskResults(child: WorkflowContext): void {
    // Propagate any outputs the child set
    for (const [key, value] of Object.entries(child.variables)) {
      if (key !== 'task' && !(key in this.variables)) {
        this.variables[key] = value;
      }
    }
    // Merge changed files
    this.changedFiles = [...new Set([...this.changedFiles, ...child.changedFiles])];
    // Merge completed phases
    for (const phase of child.completedPhases) {
      if (!this.completedPhases.includes(phase)) {
        this.completedPhases.push(phase);
      }
    }
  }

  /**
   * Check if changed files match any of the given glob patterns.
   * Uses picomatch for robust, ReDoS-safe glob matching.
   */
  changedFilesMatch(patterns: string[]): boolean {
    if (this.changedFiles.length === 0) return false;
    const isMatch = picomatch(patterns);
    return this.changedFiles.some(file => isMatch(file));
  }

  /**
   * Record a file as changed.
   */
  addChangedFile(filePath: string): void {
    if (!this.changedFiles.includes(filePath)) {
      this.changedFiles.push(filePath);
    }
  }

  /**
   * Record that files from an implementation result were changed.
   */
  addChangedFilesFromResult(result: { filesChanged?: Array<{ path: string }> }): void {
    if (result.filesChanged) {
      for (const f of result.filesChanged) {
        this.addChangedFile(f.path);
      }
    }
  }

  /**
   * Set the currently executing top-level phase.
   */
  setCurrentPhase(phaseName: string): void {
    this.currentPhase = phaseName;
  }

  /**
   * Get the currently executing top-level phase.
   */
  getCurrentPhase(): string | null {
    return this.currentPhase;
  }

  /**
   * Mark a phase as completed.
   */
  markPhaseCompleted(phaseName: string): void {
    if (!this.completedPhases.includes(phaseName)) {
      this.completedPhases.push(phaseName);
    }
  }

  /**
   * Get all template variables for rendering agent prompts.
   */
  getTemplateVars(): Record<string, unknown> {
    return { ...this.variables };
  }

  /**
   * Get the completed phases list.
   */
  getCompletedPhases(): string[] {
    return [...this.completedPhases];
  }

  /**
   * Get the current task ID (if in per-task execution).
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  /**
   * Get the list of changed files.
   */
  getChangedFiles(): string[] {
    return [...this.changedFiles];
  }

  /**
   * Build the final workflow result.
   */
  getResult(): WorkflowResult {
    return {
      status: 'completed',
      outputs: { ...this.variables },
      completedPhases: [...this.completedPhases],
      changedFiles: [...this.changedFiles],
    };
  }

  /**
   * Serialize context to a checkpoint-friendly format.
   */
  toCheckpoint(): Record<string, unknown> {
    return {
      variables: this.variables,
      completedPhases: this.completedPhases,
      currentTaskId: this.currentTaskId,
      changedFiles: this.changedFiles,
      currentPhase: this.currentPhase,
    };
  }

  /**
   * Restore context from a checkpoint.
   */
  static fromCheckpoint(data: Record<string, unknown>): WorkflowContext {
    const ctx = new WorkflowContext(data.variables as Record<string, unknown> ?? {});
    ctx.completedPhases = (data.completedPhases as string[]) ?? [];
    ctx.currentTaskId = (data.currentTaskId as string) ?? null;
    ctx.changedFiles = (data.changedFiles as string[]) ?? [];
    ctx.currentPhase = (data.currentPhase as string) ?? null;
    return ctx;
  }
}

