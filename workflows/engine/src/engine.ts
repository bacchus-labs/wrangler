/**
 * WorkflowEngine: Generic interpreter for YAML workflow definitions.
 *
 * Recursively executes 5 step types:
 * - agent:      Single query() call using a markdown agent definition
 * - code:       Runs a registered TypeScript handler function
 * - per-task:   Iterates over a list, runs nested steps for each item
 * - gate-group: Discovers all .md files in a directory, runs each as query()
 * - loop:       Repeats nested steps while condition is true, up to maxRetries
 */

import * as path from 'path';
import { z } from 'zod';
import {
  loadWorkflowYaml,
  loadAgentMarkdown,
  loadGateMarkdown,
  discoverGates,
  renderTemplate,
  resolveSchemaReference,
} from './loader.js';
import { WorkflowContext, type WorkflowResult } from './state.js';
import { type HandlerRegistry, createDefaultRegistry } from './handlers/index.js';
import {
  type StepDefinition,
  type PerTaskStep,
  type LoopStep,
  type TaskDefinition,
} from './schemas/index.js';
import { aggregateGateResults, ReviewResultSchema, type ReviewResult } from './schemas/review.js';
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
  private auditLog: WorkflowAuditEntry[] = [];
  private onAuditEntry?: (entry: WorkflowAuditEntry) => Promise<void>;
  private activeDefaults: { model: string; permissionMode: string; settingSources: string[] };

  constructor(options: {
    config: EngineConfig;
    queryFn: QueryFunction;
    handlerRegistry?: HandlerRegistry;
    onAuditEntry?: (entry: WorkflowAuditEntry) => Promise<void>;
  }) {
    this.config = options.config;
    this.queryFn = options.queryFn;
    this.handlerRegistry = options.handlerRegistry ?? createDefaultRegistry();
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

    const context = new WorkflowContext({ specPath });

    try {
      for (const phase of definition.phases) {
        // In dry-run mode, stop after plan phase
        if (this.config.dryRun && phase.name === 'execute') {
          break;
        }

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
          blockerDetails: error.blockerDetails,
        };
      }
      if (error instanceof WorkflowFailure) {
        return {
          status: 'failed',
          outputs: context.getTemplateVars(),
          completedPhases: context.getCompletedPhases(),
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
          blockerDetails: error.blockerDetails,
        };
      }
      if (error instanceof WorkflowFailure) {
        return {
          status: 'failed',
          outputs: context.getTemplateVars(),
          completedPhases: context.getCompletedPhases(),
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Recursively execute a step based on its type.
   */
  async executeStep(
    step: StepDefinition,
    ctx: WorkflowContext
  ): Promise<void> {
    await this.auditStepStart(step.name);

    try {
      const type = ('type' in step && step.type) ? step.type : 'agent';

      switch (type) {
        case 'agent':
          await this.runAgent(step as StepDefinition & { agent: string }, ctx);
          break;

        case 'code':
          await this.runHandler(step as StepDefinition & { handler: string }, ctx);
          break;

        case 'per-task':
          await this.runPerTask(step as PerTaskStep, ctx);
          break;

        case 'gate-group':
          await this.runGateGroup(step as StepDefinition & { gates: string }, ctx);
          break;

        case 'loop':
          await this.runLoop(step as LoopStep, ctx);
          break;

        default:
          throw new Error(`Unknown step type: ${type}`);
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
    step: StepDefinition & { agent: string; model?: string; input?: string; failWhen?: string; output?: string },
    ctx: WorkflowContext
  ): Promise<void> {
    const agentPath = path.resolve(this.config.workflowBaseDir, step.agent);
    this.assertWithinWorkflowDir(agentPath);
    const agentDef = await loadAgentMarkdown(agentPath);

    // Resolve input into template vars
    const templateVars = ctx.getTemplateVars();
    if (step.input) {
      const inputValue = ctx.resolve(step.input);
      if (inputValue !== undefined) {
        // Make the input available directly in template vars
        const inputParts = step.input.split('.');
        const leafKey = inputParts[inputParts.length - 1];
        templateVars[leafKey] = inputValue;
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
   * Execute a code handler step.
   */
  private async runHandler(
    step: StepDefinition & { handler: string; input?: string },
    ctx: WorkflowContext
  ): Promise<void> {
    const handler = this.handlerRegistry.get(step.handler);

    let input: unknown;
    if (step.input) {
      input = ctx.resolve(step.input);
    }

    await handler(ctx, input);
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

    for (const item of sorted) {
      const taskCtx = ctx.withTask(item);

      for (const childStep of step.steps) {
        await this.executeStep(childStep, taskCtx);
      }

      // Merge task results back to parent
      ctx.mergeTaskResults(taskCtx);
    }
  }

  /**
   * Execute a gate-group step: discover gates, run each, aggregate results.
   */
  private async runGateGroup(
    step: StepDefinition & { gates: string; output?: string },
    ctx: WorkflowContext
  ): Promise<void> {
    const gatesDir = path.resolve(this.config.workflowBaseDir, step.gates);
    this.assertWithinWorkflowDir(gatesDir);
    const gateFiles = await discoverGates(gatesDir);

    if (gateFiles.length === 0) {
      // No gates found, set empty result
      if (step.output) {
        ctx.set(step.output, {
          assessment: 'approved',
          issues: [],
          strengths: [],
          hasActionableIssues: false,
          gateResults: [],
        });
      }
      return;
    }

    const gateResults: Array<{ gate: string } & ReviewResult> = [];

    for (const gateFile of gateFiles) {
      const gateDef = await loadGateMarkdown(gateFile);

      // Check enabled flag
      if (gateDef.enabled === false) continue;

      // Check runCondition
      if (gateDef.runCondition === 'changed-files-match' && gateDef.filePatterns) {
        if (!ctx.changedFilesMatch(gateDef.filePatterns)) continue;
      }

      // Run the gate agent
      const result = await this.runSingleGate(gateDef, ctx);
      gateResults.push({ gate: gateDef.name, ...result });
    }

    // Aggregate results
    const aggregated = aggregateGateResults(gateResults);

    if (step.output) {
      ctx.set(step.output, aggregated);
    }
  }

  /**
   * Run a single review gate as a query() call.
   */
  private async runSingleGate(
    gateDef: { name: string; tools: string[]; model?: string; prompt: string },
    ctx: WorkflowContext
  ): Promise<ReviewResult> {
    const prompt = renderTemplate(gateDef.prompt, ctx.getTemplateVars());
    const model = gateDef.model ?? this.activeDefaults.model;

    const jsonSchema = z.toJSONSchema(ReviewResultSchema);

    let result: ReviewResult | null = null;

    const generator = this.queryFn({
      prompt,
      options: {
        allowedTools: gateDef.tools,
        outputFormat: {
          type: 'json_schema',
          schema: jsonSchema as Record<string, unknown>,
        },
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
        result = ReviewResultSchema.parse(message.structured_output);
      }
    }

    return result ?? {
      assessment: 'approved',
      issues: [],
      strengths: [],
      hasActionableIssues: false,
    };
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
    const entry: WorkflowAuditEntry = {
      step: stepName,
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata,
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
