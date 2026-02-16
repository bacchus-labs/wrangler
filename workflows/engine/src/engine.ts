/**
 * WorkflowEngine: Generic interpreter for YAML workflow definitions.
 *
 * Recursively executes step types:
 * - agent+prompt: Composed agent/prompt step via WorkflowResolver
 * - agent (legacy): Single query() call using a markdown agent definition
 * - code:       Runs a registered TypeScript handler function
 * - per-task:   Iterates over a list, runs nested steps for each item
 * - parallel:   Runs nested steps concurrently
 * - loop:       Repeats nested steps while condition is true, up to maxRetries
 */

import * as path from 'path';
import { z } from 'zod';
import {
  loadWorkflowYaml,
  loadAgentMarkdown,
  renderTemplate,
  resolveSchemaReference,
} from './loader.js';
import { WorkflowContext, type WorkflowResult } from './state.js';
import { type HandlerRegistry, createDefaultRegistry } from './handlers/index.js';
import {
  type StepDefinition,
  type PerTaskStep,
  type ParallelStep,
  type LoopStep,
  type TaskDefinition,
} from './schemas/index.js';
import { WorkflowResolver } from './resolver.js';
import { loadAgentFile, loadPromptFile } from './loaders.js';
import {
  type QueryFunction,
  type SDKMessage,
  type EngineConfig,
  type WorkflowAuditEntry,
  WorkflowFailure,
  WorkflowPaused,
} from './types.js';

export class WorkflowEngine {
  private config: EngineConfig;
  private queryFn: QueryFunction;
  private handlerRegistry: HandlerRegistry;
  private resolver?: WorkflowResolver;
  private auditLog: WorkflowAuditEntry[] = [];
  private onAuditEntry?: (entry: WorkflowAuditEntry) => Promise<void>;
  private activeDefaults: { model: string; permissionMode: string; settingSources: string[] };
  private activeDefaultAgent?: string;

  constructor(options: {
    config: EngineConfig;
    queryFn: QueryFunction;
    handlerRegistry?: HandlerRegistry;
    resolver?: WorkflowResolver;
    onAuditEntry?: (entry: WorkflowAuditEntry) => Promise<void>;
  }) {
    this.config = options.config;
    this.queryFn = options.queryFn;
    this.handlerRegistry = options.handlerRegistry ?? createDefaultRegistry();
    this.resolver = options.resolver;
    this.onAuditEntry = options.onAuditEntry;
    this.activeDefaults = { ...options.config.defaults };
  }

  /**
   * Assert that a resolved path is within the workflow base directory.
   * Prevents path traversal attacks (e.g., agent: "../../etc/passwd").
   */
  private assertWithinWorkflowDir(resolvedPath: string): void {
    const relative = path.relative(this.config.workflowBaseDir, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Path "${resolvedPath}" escapes workflow directory "${this.config.workflowBaseDir}"`);
    }
  }

  /**
   * Run a workflow from a YAML definition file.
   */
  async run(definitionPath: string, specPath: string): Promise<WorkflowResult> {
    const fullDefPath = path.resolve(this.config.workflowBaseDir, definitionPath);
    const definition = await loadWorkflowYaml(fullDefPath);

    // Apply defaults from workflow definition without mutating this.config.defaults
    this.activeDefaults = {
      model: definition.defaults?.model ?? this.config.defaults.model,
      permissionMode: definition.defaults?.permissionMode ?? this.config.defaults.permissionMode,
      settingSources: definition.defaults?.settingSources ?? this.config.defaults.settingSources,
    };
    this.activeDefaultAgent = definition.defaults?.agent;

    const context = new WorkflowContext({ specPath });

    try {
      for (const phase of definition.phases) {
        // In dry-run mode, stop after plan phase
        if (this.config.dryRun && phase.name === 'execute') {
          break;
        }

        context.setCurrentPhase(phase.name);
        await this.executeStep(phase, context);
        context.markPhaseCompleted(phase.name);

        if (this.config.onPhaseComplete) {
          await this.config.onPhaseComplete(phase.name, context);
        }
      }

      return context.getResult();
    } catch (error) {
      if (error instanceof WorkflowPaused) {
        return {
          status: 'paused',
          outputs: context.getTemplateVars(),
          completedPhases: context.getCompletedPhases(),
          changedFiles: context.getChangedFiles(),
          pausedAtPhase: context.getCurrentPhase() ?? undefined,
          blockerDetails: error.blockerDetails,
        };
      }
      if (error instanceof WorkflowFailure) {
        return {
          status: 'failed',
          outputs: context.getTemplateVars(),
          completedPhases: context.getCompletedPhases(),
          changedFiles: context.getChangedFiles(),
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Resume a workflow from a checkpoint.
   */
  async resume(
    definitionPath: string,
    checkpointData: Record<string, unknown>,
    resumeFromPhase: string
  ): Promise<WorkflowResult> {
    const fullDefPath = path.resolve(this.config.workflowBaseDir, definitionPath);
    const definition = await loadWorkflowYaml(fullDefPath);

    // Apply defaults from workflow definition without mutating this.config.defaults
    this.activeDefaults = {
      model: definition.defaults?.model ?? this.config.defaults.model,
      permissionMode: definition.defaults?.permissionMode ?? this.config.defaults.permissionMode,
      settingSources: definition.defaults?.settingSources ?? this.config.defaults.settingSources,
    };
    this.activeDefaultAgent = definition.defaults?.agent;

    const context = WorkflowContext.fromCheckpoint(checkpointData);

    // Find the phase to resume from
    const startIdx = definition.phases.findIndex(p => p.name === resumeFromPhase);
    if (startIdx === -1) {
      throw new Error(`Phase "${resumeFromPhase}" not found in workflow definition`);
    }

    try {
      for (let i = startIdx; i < definition.phases.length; i++) {
        const phase = definition.phases[i];
        if (this.config.dryRun && phase.name === 'execute') break;
        context.setCurrentPhase(phase.name);
        await this.executeStep(phase, context);
        context.markPhaseCompleted(phase.name);

        if (this.config.onPhaseComplete) {
          await this.config.onPhaseComplete(phase.name, context);
        }
      }

      return context.getResult();
    } catch (error) {
      if (error instanceof WorkflowPaused) {
        return {
          status: 'paused',
          outputs: context.getTemplateVars(),
          completedPhases: context.getCompletedPhases(),
          changedFiles: context.getChangedFiles(),
          pausedAtPhase: context.getCurrentPhase() ?? undefined,
          blockerDetails: error.blockerDetails,
        };
      }
      if (error instanceof WorkflowFailure) {
        return {
          status: 'failed',
          outputs: context.getTemplateVars(),
          completedPhases: context.getCompletedPhases(),
          changedFiles: context.getChangedFiles(),
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Determine if a step is a "check" step (for skipChecks).
   * A step is a check if it uses the reviewer agent or its name contains "review" or "check".
   */
  private isCheckStep(step: StepDefinition): boolean {
    const nameLower = step.name.toLowerCase();
    if (nameLower.includes('review') || nameLower.includes('check')) {
      return true;
    }
    // Check if the step uses a reviewer agent
    if ('agent' in step && typeof (step as Record<string, unknown>).agent === 'string') {
      const agentPath = (step as Record<string, unknown>).agent as string;
      if (agentPath.toLowerCase().includes('review')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a step should be skipped, returning the skip reason or null.
   * Priority: enabled:false > skipStepNames > skipChecks
   */
  private getSkipReason(step: StepDefinition): string | null {
    // 1. enabled: false (workflow-level disable)
    if ('enabled' in step && step.enabled === false) {
      return 'disabled in workflow definition';
    }

    // 2. skipStepNames (runtime skip by name)
    if (this.config.skipStepNames?.includes(step.name)) {
      return `--skip-step=${step.name}`;
    }

    // 3. skipChecks (runtime skip all check steps)
    // Code steps are never skipped by skipChecks
    if (this.config.skipChecks) {
      const type = ('type' in step ? step.type : undefined) as string | undefined;
      if (type !== 'code' && this.isCheckStep(step)) {
        return '--skip-checks';
      }
    }

    return null;
  }

  /**
   * Recursively execute a step based on its type.
   */
  async executeStep(
    step: StepDefinition,
    ctx: WorkflowContext
  ): Promise<void> {
    // Check for skip conditions before any execution
    const skipReason = this.getSkipReason(step);
    if (skipReason !== null) {
      await this.auditStepSkipped(step.name, skipReason);
      return;
    }

    await this.auditStepStart(step.name);

    try {
      const type = ('type' in step ? step.type : undefined) as string | undefined;

      if (!type) {
        // Check if this is a new-style composed step (has prompt field) or legacy agent step
        const stepAny = step as Record<string, unknown>;
        if (stepAny.prompt && this.resolver) {
          await this.runComposedAgent(step as StepDefinition & { agent?: string; prompt: string; model?: string; output?: string; failWhen?: string }, ctx);
        } else {
          // Legacy agent step (agent field is a file path)
          await this.runAgent(step as StepDefinition & { agent: string }, ctx);
        }
      } else {
        switch (type) {
          case 'code':
            await this.runHandler(step as StepDefinition & { handler: string }, ctx);
            break;

          case 'parallel':
            await this.runParallel(step as ParallelStep, ctx);
            break;

          case 'per-task':
            await this.runPerTask(step as PerTaskStep, ctx);
            break;

          case 'loop':
            await this.runLoop(step as LoopStep, ctx);
            break;

          default:
            throw new Error(`Unknown step type: ${type}`);
        }
      }

      await this.auditStepComplete(step.name);
    } catch (error) {
      await this.auditStepFailed(step.name, error);
      throw error;
    }
  }

  /**
   * Execute an agent step: load markdown definition, render template, call query().
   */
  private async runAgent(
    step: StepDefinition & { agent: string; model?: string; input?: string | Record<string, unknown>; failWhen?: string; output?: string },
    ctx: WorkflowContext
  ): Promise<void> {
    const agentPath = path.resolve(this.config.workflowBaseDir, step.agent);
    this.assertWithinWorkflowDir(agentPath);
    const agentDef = await loadAgentMarkdown(agentPath);

    // Resolve input into template vars
    const templateVars = ctx.getTemplateVars();
    if (step.input) {
      if (typeof step.input === 'string') {
        const inputValue = ctx.resolve(step.input);
        if (inputValue !== undefined) {
          // Make the input available directly in template vars
          const inputParts = step.input.split('.');
          const leafKey = inputParts[inputParts.length - 1];
          templateVars[leafKey] = inputValue;
        }
      } else {
        // Object input - resolve each value and merge into template vars
        for (const [key, val] of Object.entries(step.input)) {
          if (typeof val === 'string') {
            const resolved = ctx.resolve(val);
            if (resolved !== undefined) {
              templateVars[key] = resolved;
            }
          } else {
            templateVars[key] = val;
          }
        }
      }
    }

    const prompt = renderTemplate(agentDef.prompt, templateVars);

    // Resolve output schema to JSON Schema
    let outputFormat: { type: 'json_schema'; schema: Record<string, unknown> } | undefined;
    const schemaRef = agentDef.outputSchema;
    if (schemaRef) {
      const zodSchema = await resolveSchemaReference(schemaRef);
      if (zodSchema && zodSchema instanceof z.ZodType) {
        const jsonSchema = z.toJSONSchema(zodSchema);
        outputFormat = {
          type: 'json_schema',
          schema: jsonSchema as Record<string, unknown>,
        };
      }
    }

    const model = step.model ?? agentDef.model ?? this.activeDefaults.model;

    let result: unknown = null;

    const generator = this.queryFn({
      prompt,
      options: {
        allowedTools: agentDef.tools,
        outputFormat,
        model,
        cwd: this.config.workingDirectory,
        permissionMode: this.activeDefaults.permissionMode,
        allowDangerouslySkipPermissions: this.activeDefaults.permissionMode === 'bypassPermissions',
        mcpServers: this.config.mcpServers,
        settingSources: this.activeDefaults.settingSources,
      },
    });

    for await (const message of generator) {
      if (isResultMessage(message) && message.subtype === 'success' && message.structured_output != null) {
        result = message.structured_output;
      }
      if (isResultMessage(message) && message.subtype !== 'success') {
        const errors = message.errors?.join(', ') ?? 'unknown error';
        throw new Error(`Agent "${step.name}" failed: ${message.subtype} - ${errors}`);
      }
    }

    if (step.output && result != null) {
      ctx.set(step.output, result);

      // Track changed files if result has them
      if (typeof result === 'object' && result !== null) {
        ctx.addChangedFilesFromResult(result as { filesChanged?: Array<{ path: string }> });
      }
    }

    // Check failWhen condition
    if (step.failWhen && ctx.evaluate(step.failWhen)) {
      throw new WorkflowFailure(step.name, step.failWhen);
    }
  }


  /**
   * Execute a composed agent+prompt step using WorkflowResolver.
   * Resolves agent and prompt files by name, loads definitions,
   * renders the prompt body with template variables, and dispatches
   * via queryFn with the agent's systemPrompt as the system prompt.
   */
  private async runComposedAgent(
    step: StepDefinition & { agent?: string; prompt: string; model?: string; output?: string; failWhen?: string; input?: string | Record<string, unknown> },
    ctx: WorkflowContext
  ): Promise<void> {
    if (!this.resolver) {
      throw new Error(`Step "${step.name}": resolver is required for agent+prompt composition`);
    }

    // Resolve agent name: step.agent > defaults.agent > error
    const agentName = step.agent ?? this.activeDefaultAgent;
    if (!agentName) {
      throw new Error(
        `Step "${step.name}": no agent specified and no defaults.agent in workflow definition`
      );
    }

    // Resolve and load agent file
    const agentResolved = await this.resolver.resolveAgent(agentName);
    const agentDef = await loadAgentFile(agentResolved.path);

    // Resolve and load prompt file
    const promptResolved = await this.resolver.resolvePrompt(step.prompt);
    const promptDef = await loadPromptFile(promptResolved.path);

    // Build template vars and resolve input
    const templateVars = ctx.getTemplateVars();
    if (step.input) {
      if (typeof step.input === 'string') {
        const inputValue = ctx.resolve(step.input);
        if (inputValue !== undefined) {
          const inputParts = step.input.split('.');
          const leafKey = inputParts[inputParts.length - 1];
          templateVars[leafKey] = inputValue;
        }
      } else {
        for (const [key, val] of Object.entries(step.input)) {
          if (typeof val === 'string') {
            const resolved = ctx.resolve(val);
            if (resolved !== undefined) {
              templateVars[key] = resolved;
            }
          } else {
            templateVars[key] = val;
          }
        }
      }
    }

    // Render prompt body with template variables
    const renderedPrompt = renderTemplate(promptDef.body, templateVars);

    // Model priority: step > agent > workflow default
    const model = step.model ?? agentDef.model ?? this.activeDefaults.model;

    let result: unknown = null;

    const generator = this.queryFn({
      prompt: renderedPrompt,
      options: {
        systemPrompt: agentDef.systemPrompt,
        allowedTools: agentDef.tools,
        model,
        cwd: this.config.workingDirectory,
        permissionMode: this.activeDefaults.permissionMode,
        allowDangerouslySkipPermissions: this.activeDefaults.permissionMode === 'bypassPermissions',
        mcpServers: this.config.mcpServers,
        settingSources: this.activeDefaults.settingSources,
      },
    });

    for await (const message of generator) {
      if (isResultMessage(message) && message.subtype === 'success' && message.structured_output != null) {
        result = message.structured_output;
      }
      if (isResultMessage(message) && message.subtype !== 'success') {
        const errors = message.errors?.join(', ') ?? 'unknown error';
        throw new Error(`Agent "${step.name}" failed: ${message.subtype} - ${errors}`);
      }
    }

    if (step.output && result != null) {
      ctx.set(step.output, result);

      // Track changed files if result has them
      if (typeof result === 'object' && result !== null) {
        ctx.addChangedFilesFromResult(result as { filesChanged?: Array<{ path: string }> });
      }
    }

    // Record composition metadata for audit trail
    await this.auditComposedStep(step.name, agentResolved.path, promptResolved.path);

    // Check failWhen condition
    if (step.failWhen && ctx.evaluate(step.failWhen)) {
      throw new WorkflowFailure(step.name, step.failWhen);
    }
  }

  /**
   * Record audit metadata for a composed agent+prompt step.
   * Overwrites the 'completed' entry that executeStep will write
   * so we capture the source file paths.
   */
  private composedStepMeta: Map<string, { agentSource: string; promptSource: string }> = new Map();

  private async auditComposedStep(stepName: string, agentPath: string, promptPath: string): Promise<void> {
    this.composedStepMeta.set(stepName, { agentSource: agentPath, promptSource: promptPath });
  }

  /**
   * Execute a code handler step.
   */
  private async runHandler(
    step: StepDefinition & { handler: string; input?: string | Record<string, unknown> },
    ctx: WorkflowContext
  ): Promise<void> {
    const handler = this.handlerRegistry.get(step.handler);

    let input: unknown;
    if (step.input) {
      if (typeof step.input === 'string') {
        input = ctx.resolve(step.input);
      } else {
        // Object input - resolve each string value
        const resolved: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(step.input)) {
          resolved[key] = typeof val === 'string' ? ctx.resolve(val) ?? val : val;
        }
        input = resolved;
      }
    }

    await handler(ctx, input, { queryFn: this.queryFn, config: this.config });
  }

  /**
   * Execute a per-task step: iterate over items and run nested steps for each.
   */
  private async runPerTask(
    step: PerTaskStep,
    ctx: WorkflowContext
  ): Promise<void> {
    const items = ctx.resolve(step.source) as TaskDefinition[] | undefined;
    if (!items || !Array.isArray(items)) {
      throw new Error(`per-task source "${step.source}" did not resolve to an array`);
    }

    const sorted = this.topologicalSort(items);

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const taskCtx = ctx.withTask(item, i, sorted.length);

      try {
        for (const childStep of step.steps) {
          await this.executeStep(childStep, taskCtx);
        }
      } catch (error) {
        if (error instanceof WorkflowPaused) {
          // Before propagating the pause, ensure the current task's
          // checkpoint data is captured on the PARENT context
          // (ISS-000116: checkpoint step never runs when a loop
          // exhausts and escalates). We save on the parent because
          // mergeTaskResults won't overwrite existing parent variables.
          this.saveTaskCheckpointData(ctx, item.id);
          ctx.mergeTaskResults(taskCtx);
          throw error;
        }
        // For other errors, still merge what we have and re-throw
        ctx.mergeTaskResults(taskCtx);
        throw error;
      }

      // Merge task results back to parent
      ctx.mergeTaskResults(taskCtx);
    }
  }

  /**
   * Execute a parallel step: run all nested steps concurrently.
   */
  private async runParallel(
    step: ParallelStep,
    ctx: WorkflowContext
  ): Promise<void> {
    // Run all nested steps in parallel
    await Promise.all(
      step.steps.map(nestedStep => this.executeStep(nestedStep, ctx))
    );
  }


  /**
   * Execute a loop step: repeat nested steps while condition is true.
   */
  private async runLoop(
    step: LoopStep,
    ctx: WorkflowContext
  ): Promise<void> {
    for (let attempt = 0; attempt < step.maxRetries; attempt++) {
      // Check condition BEFORE running steps (after first iteration)
      if (attempt > 0 && !ctx.evaluate(step.condition)) {
        break; // condition cleared
      }

      for (const childStep of step.steps) {
        await this.executeStep(childStep, ctx);
      }

      // After running steps, check if condition is cleared
      if (!ctx.evaluate(step.condition)) {
        break;
      }
    }

    // If condition is still true after all retries, handle exhaustion
    if (ctx.evaluate(step.condition)) {
      await this.handleExhausted(step, ctx);
    }
  }

  /**
   * Handle exhausted retries for a loop step.
   */
  private async handleExhausted(
    step: LoopStep,
    _ctx: WorkflowContext
  ): Promise<void> {
    const action = step.onExhausted ?? 'escalate';

    switch (action) {
      case 'escalate':
        throw new WorkflowPaused(
          step.name,
          `Loop exhausted ${step.maxRetries} retries. Condition "${step.condition}" still true.`
        );

      case 'fail':
        throw new WorkflowFailure(
          step.name,
          step.condition,
          `Loop exhausted ${step.maxRetries} retries`
        );

      case 'warn':
        // Log warning but continue
        await this.auditStepComplete(step.name, {
          warning: `Loop exhausted ${step.maxRetries} retries, continuing`,
        });
        break;
    }
  }

  /**
   * Topological sort of tasks by their dependencies.
   * Tasks with no dependencies come first.
   */
  topologicalSort(tasks: TaskDefinition[]): TaskDefinition[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const inProgress = new Set<string>();
    const result: TaskDefinition[] = [];

    const visit = (task: TaskDefinition): void => {
      if (visited.has(task.id)) return;
      if (inProgress.has(task.id)) {
        throw new WorkflowFailure(
          'topological-sort',
          `Circular dependency detected involving task "${task.id}"`
        );
      }
      inProgress.add(task.id);

      for (const depId of task.dependencies) {
        const dep = taskMap.get(depId);
        if (dep) visit(dep);
      }

      inProgress.delete(task.id);
      visited.add(task.id);
      result.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return result;
  }

  /**
   * Save checkpoint data for a per-task context when the workflow pauses.
   * Replicates what the save-checkpoint handler does: moves the given
   * task from pending to completed. Operates on the parent context
   * directly because mergeTaskResults does not overwrite existing keys.
   */
  private saveTaskCheckpointData(ctx: WorkflowContext, taskId: string): void {
    const completed = (ctx.get('tasksCompleted') as string[]) ?? [];
    const pending = (ctx.get('tasksPending') as string[]) ?? [];

    if (!completed.includes(taskId)) {
      completed.push(taskId);
    }

    const updatedPending = pending.filter(id => id !== taskId);

    ctx.set('tasksCompleted', completed);
    ctx.set('tasksPending', updatedPending);
  }

  // --- Audit logging ---

  private async auditStepStart(stepName: string): Promise<void> {
    const entry: WorkflowAuditEntry = {
      step: stepName,
      status: 'started',
      timestamp: new Date().toISOString(),
    };
    this.auditLog.push(entry);
    if (this.onAuditEntry) await this.onAuditEntry(entry);
  }

  private async auditStepComplete(stepName: string, metadata?: Record<string, unknown>): Promise<void> {
    // Merge any composed step metadata (agent/prompt source paths)
    const composedMeta = this.composedStepMeta.get(stepName);
    const mergedMetadata = composedMeta
      ? { ...metadata, ...composedMeta }
      : metadata;
    // Clean up after use
    if (composedMeta) this.composedStepMeta.delete(stepName);

    const entry: WorkflowAuditEntry = {
      step: stepName,
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: mergedMetadata,
    };
    this.auditLog.push(entry);
    if (this.onAuditEntry) await this.onAuditEntry(entry);
  }

  private async auditStepFailed(stepName: string, error: unknown): Promise<void> {
    const entry: WorkflowAuditEntry = {
      step: stepName,
      status: 'failed',
      timestamp: new Date().toISOString(),
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
    this.auditLog.push(entry);
    if (this.onAuditEntry) await this.onAuditEntry(entry);
  }

  private async auditStepSkipped(stepName: string, reason: string): Promise<void> {
    const entry: WorkflowAuditEntry = {
      step: stepName,
      status: 'skipped',
      timestamp: new Date().toISOString(),
      metadata: { reason },
    };
    this.auditLog.push(entry);
    if (this.onAuditEntry) await this.onAuditEntry(entry);
  }

  /**
   * Get the full audit log.
   */
  getAuditLog(): WorkflowAuditEntry[] {
    return [...this.auditLog];
  }
}

/**
 * Type guard for SDK result messages.
 */
function isResultMessage(msg: SDKMessage): msg is import('./types.js').SDKResultMessage {
  return msg.type === 'result';
}
