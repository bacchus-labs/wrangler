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

// --- Condition Validation ---

/**
 * Validate a condition expression at load time without executing it.
 * Returns an array of error strings (empty if valid).
 */
export function validateCondition(expr: string): string[] {
  const errors: string[] = [];

  const trimmed = expr.trim();
  if (trimmed.length === 0) {
    errors.push('Empty condition expression');
    return errors;
  }

  // Check balanced parentheses
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth < 0) {
      errors.push('Unbalanced parentheses: unexpected closing paren');
      break;
    }
  }
  if (depth > 0) {
    errors.push('Unbalanced parentheses: missing closing paren');
  }

  // Check for empty operands around || and &&
  // Split on || first, then && within each clause
  const orParts = splitTopLevel(trimmed, '||');
  for (const orPart of orParts) {
    const stripped = orPart.trim();
    if (stripped.length === 0) {
      errors.push('Empty operand in expression');
      continue;
    }
    const andParts = splitTopLevel(stripped, '&&');
    for (const andPart of andParts) {
      const andStripped = andPart.trim();
      if (andStripped.length === 0) {
        errors.push('Empty operand in expression');
        continue;
      }
      // Strip leading ! and parens, check if there is content
      const leaf = stripOuterParens(andStripped).replace(/^!+/, '').trim();
      if (leaf.length === 0) {
        errors.push('Empty operand after negation');
      }
    }
  }

  return errors;
}

/**
 * Split a string on a delimiter, respecting parenthesis nesting.
 * Only splits at the top level (not inside parentheses).
 */
function splitTopLevel(expr: string, delimiter: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;

    if (depth === 0 && expr.substring(i, i + delimiter.length) === delimiter) {
      parts.push(current);
      current = '';
      i += delimiter.length - 1;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/**
 * Strip matching outer parentheses from an expression.
 * e.g., "(a || b)" -> "a || b", but "(a) || (b)" stays as-is.
 */
function stripOuterParens(expr: string): string {
  const trimmed = expr.trim();
  if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) return trimmed;

  // Verify the outer parens actually match each other
  let depth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '(') depth++;
    if (trimmed[i] === ')') depth--;
    // If depth hits 0 before the end, the outer parens don't wrap the whole expression
    if (depth === 0 && i < trimmed.length - 1) return trimmed;
  }
  return trimmed.slice(1, -1).trim();
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
   * Supports boolean operators (&&, ||, !), parentheses, comparisons,
   * and simple truthy checks. Missing/undefined properties evaluate to
   * falsy rather than throwing errors.
   *
   * Operator precedence: ! > && > ||
   *
   * Examples:
   * - "review.hasActionableIssues" -> truthy check
   * - "verification.testSuite.exitCode != 0" -> comparison
   * - "a.x || b.y" -> boolean OR
   * - "a.x && b.y" -> boolean AND
   * - "!review.allPassed" -> negation
   * - "missing.prop" -> false (falsy-on-missing, no throw)
   */
  evaluate(condition: string): boolean {
    try {
      return this.evaluateExpr(condition.trim());
    } catch {
      // Falsy-on-missing: any resolution error returns false
      return false;
    }
  }

  /**
   * Recursively evaluate an expression respecting operator precedence:
   * || (lowest) > && > ! (highest), with parentheses for grouping.
   */
  private evaluateExpr(expr: string): boolean {
    const trimmed = stripOuterParens(expr);

    // Split on || at top level (lowest precedence)
    const orClauses = splitTopLevel(trimmed, '||');
    if (orClauses.length > 1) {
      return orClauses.some(clause => this.evaluateExpr(clause.trim()));
    }

    // Split on && at top level (next precedence)
    const andClauses = splitTopLevel(trimmed, '&&');
    if (andClauses.length > 1) {
      return andClauses.every(clause => this.evaluateExpr(clause.trim()));
    }

    // Handle ! prefix (highest precedence)
    if (trimmed.startsWith('!')) {
      return !this.evaluateExpr(trimmed.slice(1).trim());
    }

    // Leaf expression: comparison or truthy check
    return this.evaluateLeaf(trimmed);
  }

  /**
   * Evaluate a leaf expression (no boolean operators).
   * Handles comparisons (==, !=, >, <, etc.) and simple truthy checks.
   * Returns false for missing/undefined properties instead of throwing.
   */
  private evaluateLeaf(condition: string): boolean {
    try {
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
    } catch {
      // Falsy-on-missing
      return false;
    }
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
