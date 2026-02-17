/**
 * ReporterManager: manages reporter lifecycle, resolves step visibility,
 * fans out audit entries to all active reporters, and catches errors
 * per-reporter so they never block workflow execution.
 */

import type { WorkflowReporter, StepVisibility, ReporterContext } from './types.js';
import type { ReporterRegistry } from './registry.js';
import type { WorkflowDefinition, StepDefinition } from '../schemas/workflow.js';
import type { WorkflowAuditEntry } from '../types.js';
import type { ExecutionSummary } from '../state.js';

export interface ReporterManagerInitOptions {
  sessionId: string;
  specFile: string;
  branchName: string;
  worktreePath: string;
  prNumber?: number;
  prUrl?: string;
}

export class ReporterManager {
  private reporters: WorkflowReporter[] = [];
  private visibilityMap: Map<string, StepVisibility>;

  constructor(
    private readonly workflow: WorkflowDefinition,
    private readonly registry: ReporterRegistry,
  ) {
    this.visibilityMap = this.buildVisibilityMap(workflow.phases);
  }

  /** Get the computed visibility map (useful for testing and reporter context). */
  getVisibilityMap(): Map<string, StepVisibility> {
    return this.visibilityMap;
  }

  /**
   * Create reporters from workflow config, initialize each one.
   * Failed reporters are logged and skipped -- they do not block the workflow.
   */
  async initializeReporters(opts: ReporterManagerInitOptions): Promise<void> {
    const reporterConfigs = this.workflow.reporters;
    const context: ReporterContext = {
      sessionId: opts.sessionId,
      specFile: opts.specFile,
      branchName: opts.branchName,
      worktreePath: opts.worktreePath,
      prNumber: opts.prNumber,
      prUrl: opts.prUrl,
      steps: this.buildStepVisibilityArray(),
    };

    for (const rc of reporterConfigs) {
      if (!this.registry.has(rc.type)) {
        console.warn(`[ReporterManager] Unknown reporter type "${rc.type}", skipping.`);
        continue;
      }

      let reporter: WorkflowReporter;
      try {
        const resolvedConfig = this.resolveReporterConfig(rc.config ?? {}, opts);
        reporter = this.registry.create(rc.type, resolvedConfig);
      } catch (err) {
        console.warn(`[ReporterManager] Failed to create reporter "${rc.type}": ${(err as Error).message}`);
        continue;
      }

      try {
        await reporter.initialize(context);
        this.reporters.push(reporter);
      } catch (err) {
        console.warn(`[ReporterManager] Reporter "${rc.type}" failed to initialize: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Fan out an audit entry to all active reporters, respecting visibility.
   *
   * Design: Debounce is owned by individual reporters, not the manager.
   * The manager fans out every audit entry immediately. Each reporter
   * decides whether to debounce its own updates (e.g., GitHubPRCommentReporter
   * has configurable debounceMs). This avoids double-debounce confusion.
   */
  async onAuditEntry(entry: WorkflowAuditEntry): Promise<void> {
    const visibility = this.visibilityMap.get(entry.step) ?? 'visible';
    if (visibility === 'silent') {
      return;
    }

    await this.fanOut(r => r.onAuditEntry(entry), 'onAuditEntry');
  }

  /** Notify all reporters of workflow completion. */
  async onComplete(summary: ExecutionSummary): Promise<void> {
    await this.fanOut(r => r.onComplete(summary), 'onComplete');
  }

  /** Notify all reporters of a workflow error. */
  async onError(error: Error): Promise<void> {
    await this.fanOut(r => r.onError(error), 'onError');
  }

  /** Dispose all reporters, catching errors per-reporter. */
  async dispose(): Promise<void> {
    await this.fanOut(r => r.dispose(), 'dispose');
    this.reporters = [];
  }

  // --- Private helpers ---

  private async fanOut(
    fn: (reporter: WorkflowReporter) => Promise<void>,
    methodName: string,
  ): Promise<void> {
    for (const reporter of this.reporters) {
      try {
        await fn(reporter);
      } catch (err) {
        console.warn(
          `[ReporterManager] Reporter "${reporter.type}" error in ${methodName}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Build a map from step name to effective visibility.
   *
   * Propagation rule: only `silent` parents force children to `silent`.
   * A `summary` parent does NOT force children to `summary` -- `summary`
   * means the parent row itself only appears in the final summary, but
   * its children can still be individually visible during execution.
   */
  private buildVisibilityMap(
    steps: StepDefinition[],
    parentSilent: boolean = false,
  ): Map<string, StepVisibility> {
    const map = new Map<string, StepVisibility>();

    for (const step of steps) {
      const ownVisibility = step.reportAs ?? 'visible';
      const effective: StepVisibility = parentSilent ? 'silent' : ownVisibility;
      map.set(step.name, effective);

      // Recurse into nested steps
      const children = this.getChildSteps(step);
      if (children.length > 0) {
        const childMap = this.buildVisibilityMap(children, effective === 'silent');
        for (const [k, v] of childMap) {
          map.set(k, v);
        }
      }
    }

    return map;
  }

  private getChildSteps(step: StepDefinition): StepDefinition[] {
    // Steps with children use a discriminated 'type' field.
    // parallel, loop, and per-task steps all have a 'steps' array.
    if ('type' in step) {
      if (step.type === 'parallel' || step.type === 'loop' || step.type === 'per-task') {
        return step.steps;
      }
    }
    return [];
  }

  /**
   * Resolve template variables in reporter config.
   * Supports {{env.VAR}} (from process.env) and {{context.KEY}} (from init options).
   * Only resolves top-level string values. After resolution, attempts numeric
   * coercion for strings that represent integers.
   */
  private resolveReporterConfig(
    config: Record<string, unknown>,
    opts: ReporterManagerInitOptions,
  ): Record<string, unknown> {
    const contextMap: Record<string, string | undefined> = {
      sessionId: opts.sessionId,
      specFile: opts.specFile,
      branchName: opts.branchName,
      worktreePath: opts.worktreePath,
      prNumber: opts.prNumber != null ? String(opts.prNumber) : undefined,
      prUrl: opts.prUrl,
    };

    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value !== 'string') {
        resolved[key] = value;
        continue;
      }

      const replaced = value.replace(/\{\{(env|context)\.([^}]+)\}\}/g, (_match, source: string, varName: string) => {
        if (source === 'env') {
          return process.env[varName] ?? '';
        }
        if (source === 'context') {
          return contextMap[varName] ?? '';
        }
        return '';
      });

      // Attempt numeric coercion for pure integer strings
      if (/^\d+$/.test(replaced)) {
        resolved[key] = Number(replaced);
      } else {
        resolved[key] = replaced;
      }
    }
    return resolved;
  }

  private buildStepVisibilityArray(): Array<{ name: string; visibility: StepVisibility }> {
    const result: Array<{ name: string; visibility: StepVisibility }> = [];
    for (const [name, visibility] of this.visibilityMap) {
      result.push({ name, visibility });
    }
    return result;
  }
}
