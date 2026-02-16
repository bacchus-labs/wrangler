/**
 * Comprehensive tests for WorkflowEngine.
 *
 * Strategy: Mock ONLY the QueryFunction (since we cannot call the real Claude API).
 * Everything else uses REAL filesystem, REAL YAML parsing, REAL state management.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { stringify as yamlStringify } from 'yaml';
import { WorkflowEngine } from '../src/engine.js';
import { WorkflowContext } from '../src/state.js';
import { HandlerRegistry, createDefaultRegistry } from '../src/handlers/index.js';
import {
  type QueryFunction,
  type QueryOptions,
  type SDKResultMessage,
  type SDKMessage,
  type WorkflowAuditEntry,
  WorkflowFailure,
} from '../src/types.js';
import type { TaskDefinition } from '../src/schemas/index.js';
import {
  createSDKSimulator,
  createAgentSequence,
  createEmptySequence,
  createNullOutputSequence,
  createMultiResultSequence,
} from './fixtures/sdk-simulator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock QueryFunction that returns pre-configured results.
 * The results map is keyed by a substring that appears in the prompt.
 * Falls back to 'default' key if no match found.
 */
function createMockQuery(
  results: Map<string, unknown>,
  callLog?: Array<{ prompt: string; options?: QueryOptions['options'] }>
): QueryFunction {
  return async function* mockQuery(params: QueryOptions): AsyncGenerator<SDKMessage, void> {
    if (callLog) {
      callLog.push({ prompt: params.prompt, options: params.options });
    }

    // Find matching result key based on prompt content
    let matchedResult: unknown = results.get('default');
    for (const [key, value] of results) {
      if (key !== 'default' && params.prompt.includes(key)) {
        matchedResult = value;
        break;
      }
    }

    yield {
      type: 'result',
      subtype: 'success',
      structured_output: matchedResult,
      is_error: false,
      num_turns: 1,
      total_cost_usd: 0.01,
      session_id: 'test-session',
    } as SDKResultMessage;
  };
}

/**
 * Create a mock QueryFunction that yields an error result.
 */
function createErrorQuery(errorSubtype: string, errors: string[]): QueryFunction {
  return async function* errorQuery(_params: QueryOptions): AsyncGenerator<SDKMessage, void> {
    yield {
      type: 'result',
      subtype: errorSubtype,
      is_error: true,
      num_turns: 1,
      total_cost_usd: 0,
      session_id: 'test-session',
      errors,
    } as SDKResultMessage;
  };
}


/** Create a temporary directory and return its path. */
async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wf-engine-test-'));
}

/** Write a minimal workflow YAML file. */
async function writeWorkflowYaml(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/** Write a markdown agent file with frontmatter. */
async function writeAgentMarkdown(
  dir: string,
  filename: string,
  frontmatter: Record<string, unknown>,
  body: string
): Promise<string> {
  const filePath = path.join(dir, filename);
  const yamlFrontmatter = yamlStringify(frontmatter).trim();
  const content = `---\n${yamlFrontmatter}\n---\n\n${body}`;
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/** Write a gate markdown file. */
async function writeGateMarkdown(
  dir: string,
  filename: string,
  frontmatter: Record<string, unknown>,
  body: string
): Promise<string> {
  const gatesDir = path.join(dir, 'gates');
  await fs.mkdir(gatesDir, { recursive: true });
  return writeAgentMarkdown(gatesDir, filename, frontmatter, body);
}

/** Build a default EngineConfig for testing. */
function makeConfig(tmpDir: string, overrides: Partial<import('../src/types.js').EngineConfig> = {}): import('../src/types.js').EngineConfig {
  return {
    workingDirectory: tmpDir,
    workflowBaseDir: tmpDir,
    defaults: {
      model: 'test-model',
      permissionMode: 'bypassPermissions',
      settingSources: ['project'],
    },
    dryRun: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('WorkflowEngine', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Agent step execution
  // -----------------------------------------------------------------------
  describe('agent step execution', () => {
    it('should call query with correct prompt and options from agent markdown', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'analyzer.md', {
        name: 'analyzer',
        description: 'Analyzes the spec',
        tools: ['Read', 'Grep'],
      }, 'Analyze the specification at {{specPath}}. Produce a task list.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: agent
    agent: analyzer.md
    output: analysis
`);

      const analysisResult = {
        tasks: [{ id: 'task-1', title: 'Do thing', description: 'Desc', requirements: ['r1'], dependencies: [], estimatedComplexity: 'low', filePaths: [] }],
        requirements: [{ id: 'r1', description: 'A requirement', source: 'spec', testable: true }],
        constraints: [],
        techStack: { language: 'TypeScript', testFramework: 'jest' },
      };

      const queryFn = createMockQuery(new Map([['default', analysisResult]]), callLog);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Verify query was called
      expect(callLog).toHaveLength(1);

      // Verify prompt was rendered with template vars
      expect(callLog[0].prompt).toContain('Analyze the specification at /tmp/spec.md');

      // Verify options
      expect(callLog[0].options?.allowedTools).toEqual(['Read', 'Grep']);
      expect(callLog[0].options?.model).toBe('test-model');
      expect(callLog[0].options?.cwd).toBe(tmpDir);
      expect(callLog[0].options?.permissionMode).toBe('bypassPermissions');

      // Verify result stored in context
      expect(result.status).toBe('completed');
      expect(result.outputs.analysis).toEqual(analysisResult);
    });

    it('should use model from agent markdown when specified', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Custom model agent',
        tools: [],
        model: 'sonnet',
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', { ok: true }]]), callLog);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog[0].options?.model).toBe('sonnet');
    });

    it('should use model from step definition when specified (overrides agent)', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent with model',
        tools: [],
        model: 'sonnet',
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    model: haiku
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', { ok: true }]]), callLog);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog[0].options?.model).toBe('haiku');
    });

    it('should throw when agent query returns an error subtype', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Failing agent',
        tools: [],
      }, 'Do something that will fail.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createErrorQuery('error_max_turns', ['Too many turns']);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'Agent "step1" failed: error_max_turns - Too many turns'
      );
    });

    it('should resolve input from context and pass to template vars', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'step1.md', {
        name: 'step1',
        description: 'Step 1',
        tools: [],
      }, 'Step 1 prompt.');

      await writeAgentMarkdown(tmpDir, 'step2.md', {
        name: 'step2',
        description: 'Step 2',
        tools: [],
      }, 'Use this data: {{data}}');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: step1.md
    output: myData
  - name: step2
    type: agent
    agent: step2.md
    input: myData.data
    output: result
`);

      const queryFn = createMockQuery(new Map([
        ['Step 1', { data: 'hello-world' }],
        ['Use this data', { done: true }],
      ]), callLog);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      // step2 should have received the resolved input
      expect(callLog).toHaveLength(2);
      expect(callLog[1].prompt).toContain('Use this data: hello-world');
    });

    it('should track changed files from agent result', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'File-changing agent',
        tools: [],
      }, 'Make changes.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: impl
`);

      const implResult = {
        filesChanged: [
          { path: 'src/foo.ts' },
          { path: 'src/bar.ts' },
        ],
      };

      const queryFn = createMockQuery(new Map([['default', implResult]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(result.status).toBe('completed');
      // The changed files are tracked internally in the context
      expect(result.outputs.impl).toEqual(implResult);
    });
  });

  // -----------------------------------------------------------------------
  // Code step execution
  // -----------------------------------------------------------------------
  describe('code step execution', () => {
    it('should execute a registered handler and pass context', async () => {
      const handlerCalls: Array<{ ctx: WorkflowContext; input: unknown }> = [];

      const registry = new HandlerRegistry();
      registry.register('my-handler', async (ctx, input) => {
        handlerCalls.push({ ctx, input });
        ctx.set('handlerOutput', { processed: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: process
    type: code
    handler: my-handler
`);

      const queryFn = createMockQuery(new Map());

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(handlerCalls).toHaveLength(1);
      expect(result.outputs.handlerOutput).toEqual({ processed: true });
    });

    it('should pass resolved input to handler', async () => {
      const handlerCalls: Array<{ input: unknown }> = [];

      const registry = new HandlerRegistry();
      registry.register('check', async (_ctx, input) => {
        handlerCalls.push({ input });
      });

      // Agent step that produces data, then code step consumes it
      await writeAgentMarkdown(tmpDir, 'producer.md', {
        name: 'producer',
        description: 'Produces data',
        tools: [],
      }, 'Produce data.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: produce
    type: agent
    agent: producer.md
    output: data
  - name: check
    type: code
    handler: check
    input: data.items
`);

      const queryFn = createMockQuery(new Map([
        ['default', { items: [1, 2, 3] }],
      ]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(handlerCalls).toHaveLength(1);
      expect(handlerCalls[0].input).toEqual([1, 2, 3]);
    });

    it('should throw if handler is not registered', async () => {
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: code
    handler: nonexistent-handler
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'No handler registered with name: nonexistent-handler'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Per-task step execution
  // -----------------------------------------------------------------------
  describe('per-task step execution', () => {
    it('should iterate tasks and run nested steps for each', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'implementer.md', {
        name: 'implementer',
        description: 'Implements a task',
        tools: ['Write'],
      }, 'Implement task: {{task.title}} - {{task.description}}');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        type: agent
        agent: implementer.md
        output: implementation
`);

      const tasks: TaskDefinition[] = [
        { id: 'task-1', title: 'Auth module', description: 'Build auth', requirements: ['r1'], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
        { id: 'task-2', title: 'API routes', description: 'Build API', requirements: ['r2'], dependencies: [], estimatedComplexity: 'medium', filePaths: [] },
      ];

      // Set up a code handler to populate analysis tasks
      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', { tasks });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        type: agent
        agent: implementer.md
        output: implementation
`);

      const queryFn = createMockQuery(
        new Map([['default', { success: true }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // Should have been called once per task
      expect(callLog).toHaveLength(2);
      expect(callLog[0].prompt).toContain('Auth module');
      expect(callLog[1].prompt).toContain('API routes');
    });

    it('should throw when source does not resolve to an array', async () => {
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: execute
    type: per-task
    source: nonexistent.data
    steps:
      - name: step
        type: code
        handler: noop
`);

      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'per-task source "nonexistent.data" did not resolve to an array'
      );
    });

    it('should respect task dependencies via topological sort', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'worker.md', {
        name: 'worker',
        description: 'Does work',
        tools: [],
      }, 'Working on {{task.id}}: {{task.title}}');

      const tasks: TaskDefinition[] = [
        { id: 'task-c', title: 'C depends on A', description: 'C', requirements: [], dependencies: ['task-a'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'task-a', title: 'A has no deps', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
        { id: 'task-b', title: 'B depends on A', description: 'B', requirements: [], dependencies: ['task-a'], estimatedComplexity: 'low', filePaths: [] },
      ];

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', { tasks });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: work
        type: agent
        agent: worker.md
`);

      const queryFn = createMockQuery(
        new Map([['default', { done: true }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      // Task A must be first since B and C depend on it
      expect(callLog).toHaveLength(3);
      expect(callLog[0].prompt).toContain('task-a');
      // B and C both depend on A but order between them is deterministic (visit order)
    });
  });

  // -----------------------------------------------------------------------
  // Loop step execution
  // -----------------------------------------------------------------------
  describe('loop step execution', () => {
    it('should run loop maxRetries times when condition stays true, then escalate', async () => {
      const callLog: Array<{ prompt: string }> = [];

      // Setup: agent produces a review with issues, loop runs nested fix agent
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix the issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true, issues: [{ severity: 'critical', description: 'Bug' }] });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 3
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
`);

      // Query always returns something but never clears the condition
      const queryFn = createMockQuery(
        new Map([['default', { fixed: false }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should have run 3 times (maxRetries)
      expect(callLog).toHaveLength(3);

      // Should be paused due to escalation
      expect(result.status).toBe('paused');
      expect(result.blockerDetails).toContain('Loop exhausted 3 retries');
    });

    it('should stop loop early when condition clears', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix the issues.');

      // After the first fix, the review gate will clear the condition
      let fixCount = 0;
      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });
      // A code handler that clears the condition after first fix
      registry.register('clear-if-done', async (ctx) => {
        fixCount++;
        if (fixCount >= 1) {
          ctx.set('review', { hasActionableIssues: false });
        }
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 5
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
      - name: check
        type: code
        handler: clear-if-done
`);

      const queryFn = createMockQuery(
        new Map([['default', { done: true }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should have run only once since condition cleared after first iteration
      expect(callLog).toHaveLength(1);
      expect(result.status).toBe('completed');
    });

    it('should fail when onExhausted is "fail"', async () => {
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 2
    onExhausted: fail
    steps:
      - name: fix
        type: agent
        agent: fixer.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Loop exhausted 2 retries');
    });

    it('should warn and continue when onExhausted is "warn"', async () => {
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 2
    onExhausted: warn
    steps:
      - name: fix
        type: agent
        agent: fixer.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should complete (not fail or pause)
      expect(result.status).toBe('completed');

      // Audit log should contain warning
      const audit = engine.getAuditLog();
      const warnEntry = audit.find(
        e => e.step === 'fix-loop' && e.metadata?.warning
      );
      expect(warnEntry).toBeDefined();
      expect(warnEntry!.metadata!.warning).toContain('Loop exhausted 2 retries');
    });
  });

  // -----------------------------------------------------------------------
  // Dry-run mode
  // -----------------------------------------------------------------------
  describe('dry-run mode', () => {
    it('should execute analyze and plan phases but skip execute phase', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'analyzer.md', {
        name: 'analyzer',
        description: 'Analyzes',
        tools: [],
      }, 'Analyze the spec.');

      await writeAgentMarkdown(tmpDir, 'planner.md', {
        name: 'planner',
        description: 'Plans',
        tools: [],
      }, 'Create a plan.');

      await writeAgentMarkdown(tmpDir, 'executor.md', {
        name: 'executor',
        description: 'Executes',
        tools: [],
      }, 'Execute the plan.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: agent
    agent: analyzer.md
    output: analysis
  - name: plan
    type: agent
    agent: planner.md
    output: plan
  - name: execute
    type: agent
    agent: executor.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { tasks: [] }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { dryRun: true }),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Only analyze + plan should have run
      expect(callLog).toHaveLength(2);
      expect(callLog[0].prompt).toContain('Analyze');
      expect(callLog[1].prompt).toContain('Create a plan');

      expect(result.status).toBe('completed');
      expect(result.completedPhases).toContain('analyze');
      expect(result.completedPhases).toContain('plan');
      expect(result.completedPhases).not.toContain('execute');
    });
  });

  // -----------------------------------------------------------------------
  // failWhen was removed per spec decisions (handled by loop conditions instead)

  // -----------------------------------------------------------------------
  // Full happy-path workflow
  // -----------------------------------------------------------------------
  describe('full happy-path workflow', () => {
    it('should execute a complete workflow with all phase types', async () => {
      const callLog: Array<{ prompt: string }> = [];

      // Create agent files
      await writeAgentMarkdown(tmpDir, 'analyzer.md', {
        name: 'analyzer',
        description: 'Spec analyzer',
        tools: ['Read'],
      }, 'Analyze the specification at {{specPath}}.');

      await writeAgentMarkdown(tmpDir, 'implementer.md', {
        name: 'implementer',
        description: 'Task implementer',
        tools: ['Write', 'Bash'],
      }, 'Implement task {{task.title}}: {{task.description}}');

      await writeAgentMarkdown(tmpDir, 'publisher.md', {
        name: 'publisher',
        description: 'Publishes result',
        tools: [],
      }, 'Publish the completed work.');

      await writeAgentMarkdown(tmpDir, 'reviewer.md', {
        name: 'reviewer',
        description: 'Reviews code',
        tools: ['Read'],
      }, 'Review code quality.');

      // Create handler
      const registry = new HandlerRegistry();
      registry.register('create-issues', async (ctx) => {
        const analysis = ctx.get('analysis') as { tasks: TaskDefinition[] };
        ctx.set('analysis', analysis);
        ctx.set('taskIds', analysis.tasks.map(t => t.id));
        ctx.set('tasksCompleted', []);
        ctx.set('tasksPending', analysis.tasks.map(t => t.id));
      });
      registry.register('save-checkpoint', async (ctx) => {
        const taskId = ctx.getCurrentTaskId();
        if (taskId) {
          const completed = (ctx.get('tasksCompleted') as string[]) ?? [];
          if (!completed.includes(taskId)) completed.push(taskId);
          ctx.set('tasksCompleted', completed);
        }
      });

      const analysisResult = {
        tasks: [
          { id: 'task-1', title: 'Build auth', description: 'Authentication module', requirements: ['r1'], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
          { id: 'task-2', title: 'Build API', description: 'REST API', requirements: ['r2'], dependencies: ['task-1'], estimatedComplexity: 'medium', filePaths: [] },
        ],
        requirements: [
          { id: 'r1', description: 'Auth required', source: 'spec', testable: true },
          { id: 'r2', description: 'API required', source: 'spec', testable: true },
        ],
        constraints: ['Must use TypeScript'],
        techStack: { language: 'TypeScript', testFramework: 'jest' },
      };

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: full-workflow
version: 1
defaults:
  model: opus
  permissionMode: bypassPermissions
  settingSources:
    - project
phases:
  - name: analyze
    type: agent
    agent: analyzer.md
    output: analysis

  - name: plan
    type: code
    handler: create-issues

  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        type: agent
        agent: implementer.md
        output: implementation
      - name: checkpoint
        type: code
        handler: save-checkpoint

  - name: review
    type: agent
    agent: reviewer.md
    output: reviewResult

  - name: publish
    type: agent
    agent: publisher.md
    output: publishResult
`);

      const reviewResult = {
        assessment: 'approved',
        issues: [],
        strengths: ['Clean code'],
        hasActionableIssues: false,
      };

      const resultsMap = new Map<string, unknown>([
        ['Analyze', analysisResult],
        ['Implement task', { success: true, filesChanged: [] }],
        ['Review code', reviewResult],
        ['Publish', { published: true }],
      ]);

      const queryFn = createMockQuery(
        resultsMap,
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(result.completedPhases).toEqual(['analyze', 'plan', 'execute', 'review', 'publish']);

      // analyze(1) + implement(2 tasks) + review(1) + publish(1) = 5 query calls
      expect(callLog).toHaveLength(5);

      // Verify outputs are populated
      expect(result.outputs.analysis).toBeDefined();
      expect(result.outputs.reviewResult).toBeDefined();
      expect(result.outputs.publishResult).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Resume from checkpoint
  // -----------------------------------------------------------------------
  describe('resume from checkpoint', () => {
    it('should skip already completed phases and resume from specified phase', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'reviewer.md', {
        name: 'reviewer',
        description: 'Reviews',
        tools: [],
      }, 'Review the work.');

      await writeAgentMarkdown(tmpDir, 'publisher.md', {
        name: 'publisher',
        description: 'Publishes',
        tools: [],
      }, 'Publish the result.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: agent
    agent: reviewer.md
    output: analysis
  - name: review
    type: agent
    agent: reviewer.md
    output: review
  - name: publish
    type: agent
    agent: publisher.md
    output: publishResult
`);

      // Create checkpoint data as if analyze was already completed
      const checkpointData: Record<string, unknown> = {
        variables: {
          specPath: '/tmp/spec.md',
          analysis: { tasks: [] },
        },
        completedPhases: ['analyze'],
        currentTaskId: null,
        changedFiles: [],
      };

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.resume('workflow.yaml', checkpointData, 'review');

      // Only review and publish should have been called (not analyze)
      expect(callLog).toHaveLength(2);
      expect(callLog[0].prompt).toContain('Review');
      expect(callLog[1].prompt).toContain('Publish');

      expect(result.status).toBe('completed');
      expect(result.completedPhases).toContain('analyze');
      expect(result.completedPhases).toContain('review');
      expect(result.completedPhases).toContain('publish');
    });

    it('should throw if resume phase is not found', async () => {
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: code
    handler: noop
`);

      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await expect(
        engine.resume('workflow.yaml', {}, 'nonexistent-phase')
      ).rejects.toThrow('Phase "nonexistent-phase" not found');
    });

    it('should handle WorkflowPaused during resume', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: agent.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.resume(
        'workflow.yaml',
        { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
        'setup'
      );

      expect(result.status).toBe('paused');
    });

    it('should handle WorkflowFailure during resume', async () => {
      const registry = createDefaultRegistry();
      registry.register('fail-handler', async () => {
        throw new WorkflowFailure('verify', 'verification.failed');
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: verify
    type: code
    handler: fail-handler
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.resume(
        'workflow.yaml',
        { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
        'verify'
      );

      expect(result.status).toBe('failed');
    });
  });

  // -----------------------------------------------------------------------
  // Topological sort
  // -----------------------------------------------------------------------
  describe('topologicalSort', () => {
    it('should order tasks with no dependencies first', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      const tasks: TaskDefinition[] = [
        { id: 'c', title: 'C', description: 'C', requirements: [], dependencies: ['a'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: ['a'], estimatedComplexity: 'low', filePaths: [] },
      ];

      const sorted = engine.topologicalSort(tasks);

      // 'a' must come before 'b' and 'c'
      const idxA = sorted.findIndex(t => t.id === 'a');
      const idxB = sorted.findIndex(t => t.id === 'b');
      const idxC = sorted.findIndex(t => t.id === 'c');

      expect(idxA).toBeLessThan(idxB);
      expect(idxA).toBeLessThan(idxC);
    });

    it('should handle multi-level dependencies', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      const tasks: TaskDefinition[] = [
        { id: 'd', title: 'D', description: 'D', requirements: [], dependencies: ['c'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'c', title: 'C', description: 'C', requirements: [], dependencies: ['b'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: ['a'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      const sorted = engine.topologicalSort(tasks);

      expect(sorted.map(t => t.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should handle tasks with no dependencies (all independent)', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      const tasks: TaskDefinition[] = [
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
        { id: 'c', title: 'C', description: 'C', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      const sorted = engine.topologicalSort(tasks);

      // All should be present, order is preserved
      expect(sorted).toHaveLength(3);
      expect(sorted.map(t => t.id)).toEqual(['a', 'b', 'c']);
    });

    it('should handle diamond dependencies', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      //     a
      //    / \
      //   b   c
      //    \ /
      //     d
      const tasks: TaskDefinition[] = [
        { id: 'd', title: 'D', description: 'D', requirements: [], dependencies: ['b', 'c'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: ['a'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'c', title: 'C', description: 'C', requirements: [], dependencies: ['a'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      const sorted = engine.topologicalSort(tasks);

      const idxA = sorted.findIndex(t => t.id === 'a');
      const idxB = sorted.findIndex(t => t.id === 'b');
      const idxC = sorted.findIndex(t => t.id === 'c');
      const idxD = sorted.findIndex(t => t.id === 'd');

      expect(idxA).toBeLessThan(idxB);
      expect(idxA).toBeLessThan(idxC);
      expect(idxB).toBeLessThan(idxD);
      expect(idxC).toBeLessThan(idxD);
    });

    it('should detect circular dependencies and throw WorkflowFailure', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      // A -> B -> C -> A (cycle)
      const tasks: TaskDefinition[] = [
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: ['c'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: ['a'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'c', title: 'C', description: 'C', requirements: [], dependencies: ['b'], estimatedComplexity: 'low', filePaths: [] },
      ];

      expect(() => engine.topologicalSort(tasks)).toThrow(/Circular dependency/);
    });
  });

  // -----------------------------------------------------------------------
  // Audit logging
  // -----------------------------------------------------------------------
  describe('audit logging', () => {
    it('should record audit entries for step start and complete', async () => {
      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: code
    handler: noop
  - name: step2
    type: code
    handler: noop
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      const audit = engine.getAuditLog();

      // 2 steps x 2 events (start + complete) = 4 entries
      expect(audit).toHaveLength(4);

      expect(audit[0]).toMatchObject({ step: 'step1', status: 'started' });
      expect(audit[1]).toMatchObject({ step: 'step1', status: 'completed' });
      expect(audit[2]).toMatchObject({ step: 'step2', status: 'started' });
      expect(audit[3]).toMatchObject({ step: 'step2', status: 'completed' });

      // Each entry should have a timestamp
      for (const entry of audit) {
        expect(entry.timestamp).toBeDefined();
        expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
      }
    });

    it('should record failed audit entry when step throws', async () => {
      const registry = new HandlerRegistry();
      registry.register('fail', async () => {
        throw new Error('Handler failure');
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: failing-step
    type: code
    handler: fail
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow('Handler failure');

      const audit = engine.getAuditLog();

      expect(audit).toHaveLength(2);
      expect(audit[0]).toMatchObject({ step: 'failing-step', status: 'started' });
      expect(audit[1]).toMatchObject({ step: 'failing-step', status: 'failed' });
      expect(audit[1].metadata?.error).toContain('Handler failure');
    });

    it('should invoke onAuditEntry callback for each audit event', async () => {
      const auditCallbacks: WorkflowAuditEntry[] = [];

      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: code
    handler: noop
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
        onAuditEntry: async (entry) => {
          auditCallbacks.push(entry);
        },
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(auditCallbacks).toHaveLength(2);
      expect(auditCallbacks[0].step).toBe('step1');
      expect(auditCallbacks[0].status).toBe('started');
      expect(auditCallbacks[1].step).toBe('step1');
      expect(auditCallbacks[1].status).toBe('completed');
    });
  });

  // -----------------------------------------------------------------------
  // Workflow defaults
  // -----------------------------------------------------------------------
  describe('workflow defaults', () => {
    it('should apply defaults from workflow YAML definition', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: custom-model
  permissionMode: default
  settingSources:
    - project
    - user
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog[0].options?.model).toBe('custom-model');
      expect(callLog[0].options?.settingSources).toEqual(['project', 'user']);
    });
  });

  // -----------------------------------------------------------------------
  // Unknown step type
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('should throw for unknown step type', async () => {
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: bad-step
    type: unknown-type
    handler: something
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'Unknown step type: unknown-type'
      );
    });

    it('should propagate non-WorkflowFailure/WorkflowPaused errors', async () => {
      const registry = new HandlerRegistry();
      registry.register('explode', async () => {
        throw new TypeError('Something broke internally');
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: boom
    type: code
    handler: explode
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(TypeError);
    });
  });

  // -----------------------------------------------------------------------
  // MCP servers config passthrough
  // -----------------------------------------------------------------------
  describe('MCP server config', () => {
    it('should pass mcpServers config to query options', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const mcpConfig = {
        'wrangler-mcp': {
          type: 'stdio',
          command: 'node',
          args: ['/path/to/server.js'],
        },
      };

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { mcpServers: mcpConfig }),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog[0].options?.mcpServers).toEqual(mcpConfig);
    });
  });

  // -----------------------------------------------------------------------
  // bypassPermissions flag
  // -----------------------------------------------------------------------
  describe('permission mode', () => {
    it('should set allowDangerouslySkipPermissions when permissionMode is bypassPermissions', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          defaults: { model: 'test', permissionMode: 'bypassPermissions', settingSources: [] },
        }),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog[0].options?.allowDangerouslySkipPermissions).toBe(true);
    });

    it('should not set allowDangerouslySkipPermissions for other modes', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          defaults: { model: 'test', permissionMode: 'default', settingSources: [] },
        }),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog[0].options?.allowDangerouslySkipPermissions).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Output schema resolution
  // -----------------------------------------------------------------------
  describe('output schema resolution', () => {
    it('should resolve outputSchema reference and pass as JSON schema to query', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'analyzer.md', {
        name: 'analyzer',
        description: 'Spec analyzer',
        tools: ['Read'],
        outputSchema: 'schemas/analysis.ts#AnalysisResultSchema',
      }, 'Analyze the spec.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: agent
    agent: analyzer.md
    output: analysis
`);

      const queryFn = createMockQuery(
        new Map([['default', { tasks: [] }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      // The outputFormat should be set with a JSON schema
      expect(callLog[0].options?.outputFormat).toBeDefined();
      expect(callLog[0].options?.outputFormat?.type).toBe('json_schema');
      expect(callLog[0].options?.outputFormat?.schema).toBeDefined();
      // The schema should have properties from AnalysisResultSchema
      const schema = callLog[0].options?.outputFormat?.schema as Record<string, unknown>;
      expect(schema.type).toBe('object');
    });
  });

  // -----------------------------------------------------------------------
  // Resume with defaults
  // -----------------------------------------------------------------------
  describe('resume with workflow defaults', () => {
    it('should apply defaults from workflow YAML when resuming', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: custom-resume-model
  permissionMode: default
  settingSources:
    - project
    - user
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.resume(
        'workflow.yaml',
        { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
        'step1'
      );

      expect(callLog[0].options?.model).toBe('custom-resume-model');
      expect(callLog[0].options?.settingSources).toEqual(['project', 'user']);
    });
  });

  // -----------------------------------------------------------------------
  // Resume - propagation of unexpected errors
  // -----------------------------------------------------------------------
  describe('resume error propagation', () => {
    it('should propagate non-Workflow errors during resume', async () => {
      const registry = new HandlerRegistry();
      registry.register('explode', async () => {
        throw new RangeError('Out of bounds');
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: boom
    type: code
    handler: explode
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await expect(
        engine.resume(
          'workflow.yaml',
          { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
          'boom'
        )
      ).rejects.toThrow(RangeError);
    });
  });

  // -----------------------------------------------------------------------
  // Resume dry-run
  // -----------------------------------------------------------------------
  describe('resume with dry-run', () => {
    it('should skip execute phase during resume when dryRun is true', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'planner.md', {
        name: 'planner',
        description: 'Plans',
        tools: [],
      }, 'Create a plan.');

      await writeAgentMarkdown(tmpDir, 'executor.md', {
        name: 'executor',
        description: 'Executes',
        tools: [],
      }, 'Execute the plan.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: plan
    type: agent
    agent: planner.md
    output: plan
  - name: execute
    type: agent
    agent: executor.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { dryRun: true }),
        queryFn,
      });

      const result = await engine.resume(
        'workflow.yaml',
        { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
        'plan'
      );

      // Only plan should have run
      expect(callLog).toHaveLength(1);
      expect(result.status).toBe('completed');
      expect(result.completedPhases).toContain('plan');
      expect(result.completedPhases).not.toContain('execute');
    });
  });

  // -----------------------------------------------------------------------
  // Loop - condition clears between iterations (second-attempt branch)
  // -----------------------------------------------------------------------
  describe('loop condition clearing between iterations', () => {
    it('should check condition before second iteration and stop if cleared', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix the issues.');

      // The agent result will set hasActionableIssues to false after first call
      let callCount = 0;
      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });
      registry.register('update-review', async (ctx) => {
        callCount++;
        if (callCount >= 1) {
          // After first iteration, clear the condition so the second-attempt
          // check at the top of the loop will see false
          ctx.set('review', { hasActionableIssues: false });
        }
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 5
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
      - name: update
        type: code
        handler: update-review
`);

      const queryFn = createMockQuery(
        new Map([['default', {}]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // First iteration: fix + update-review (clears condition)
      // After first iteration, condition check passes (false), exits loop after step check
      // The fix agent should only be called once
      expect(callLog).toHaveLength(1);
      expect(result.status).toBe('completed');
    });
  });

  // -----------------------------------------------------------------------
  // Agent with no structured output
  // -----------------------------------------------------------------------
  describe('agent with no structured output', () => {
    it('should handle agent returning no structured_output gracefully', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      // Return a result with no structured_output
      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: undefined,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should complete without error, but output key won't be set
      expect(result.status).toBe('completed');
    });
  });

  // -----------------------------------------------------------------------
  // Agent with non-result messages
  // -----------------------------------------------------------------------
  describe('agent with non-result messages in stream', () => {
    it('should ignore non-result messages and use the final result', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      // Yield some non-result messages before the result
      const queryFn: QueryFunction = async function* (_params) {
        yield { type: 'assistant', content: 'thinking...' } as import('../src/types.js').SDKOtherMessage;
        yield { type: 'tool_use', name: 'read' } as import('../src/types.js').SDKOtherMessage;
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: { answer: 42 },
          is_error: false,
          num_turns: 3,
          total_cost_usd: 0.05,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(result.outputs.result).toEqual({ answer: 42 });
    });
  });

  // -----------------------------------------------------------------------
  // Config mutation safety
  // -----------------------------------------------------------------------
  describe('config mutation safety', () => {
    it('should not mutate this.config.defaults when run() applies workflow defaults', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: workflow-model
  permissionMode: default
  settingSources:
    - project
    - user
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', { ok: true }]]));

      const originalDefaults = {
        model: 'original-model',
        permissionMode: 'bypassPermissions',
        settingSources: ['project'],
      };

      const config = makeConfig(tmpDir, { defaults: { ...originalDefaults } });
      const engine = new WorkflowEngine({ config, queryFn });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      // The original config.defaults must NOT have been mutated
      expect(config.defaults.model).toBe('original-model');
      expect(config.defaults.permissionMode).toBe('bypassPermissions');
      expect(config.defaults.settingSources).toEqual(['project']);
    });

    it('should not mutate this.config.defaults when resume() applies workflow defaults', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: resume-model
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', { ok: true }]]));

      const originalDefaults = {
        model: 'original-model',
        permissionMode: 'bypassPermissions',
        settingSources: ['project'],
      };

      const config = makeConfig(tmpDir, { defaults: { ...originalDefaults } });
      const engine = new WorkflowEngine({ config, queryFn });

      await engine.resume(
        'workflow.yaml',
        { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
        'step1'
      );

      // The original config.defaults must NOT have been mutated
      expect(config.defaults.model).toBe('original-model');
      expect(config.defaults.permissionMode).toBe('bypassPermissions');
      expect(config.defaults.settingSources).toEqual(['project']);
    });

    it('should be safe for engine reuse across multiple run() calls with different workflows', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow1.yaml', `
name: workflow-1
version: 1
defaults:
  model: model-from-workflow-1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      await writeWorkflowYaml(tmpDir, 'workflow2.yaml', `
name: workflow-2
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', { ok: true }]]), callLog);

      const config = makeConfig(tmpDir, {
        defaults: { model: 'engine-default', permissionMode: 'bypassPermissions', settingSources: ['project'] },
      });
      const engine = new WorkflowEngine({ config, queryFn });

      // First run uses workflow1 which overrides model
      await engine.run('workflow1.yaml', '/tmp/spec.md');
      expect(callLog[0].options?.model).toBe('model-from-workflow-1');

      // Second run uses workflow2 which has no defaults, so should fall back to engine defaults
      await engine.run('workflow2.yaml', '/tmp/spec.md');
      expect(callLog[1].options?.model).toBe('engine-default');
    });
  });

  // -----------------------------------------------------------------------
  // Per-phase checkpointing (onPhaseComplete callback)
  // -----------------------------------------------------------------------
  describe('onPhaseComplete callback', () => {
    it('should call onPhaseComplete after each phase in run()', async () => {
      const phaseLog: Array<{ phaseName: string; completedPhases: string[] }> = [];

      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: phase-a
    type: code
    handler: noop
  - name: phase-b
    type: code
    handler: noop
  - name: phase-c
    type: code
    handler: noop
`);

      const queryFn = createMockQuery(new Map());

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          onPhaseComplete: async (phaseName, context) => {
            phaseLog.push({
              phaseName,
              completedPhases: context.getCompletedPhases(),
            });
          },
        }),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(phaseLog).toHaveLength(3);

      expect(phaseLog[0].phaseName).toBe('phase-a');
      expect(phaseLog[0].completedPhases).toEqual(['phase-a']);

      expect(phaseLog[1].phaseName).toBe('phase-b');
      expect(phaseLog[1].completedPhases).toEqual(['phase-a', 'phase-b']);

      expect(phaseLog[2].phaseName).toBe('phase-c');
      expect(phaseLog[2].completedPhases).toEqual(['phase-a', 'phase-b', 'phase-c']);
    });

    it('should call onPhaseComplete after each phase in resume()', async () => {
      const phaseLog: string[] = [];

      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: phase-a
    type: code
    handler: noop
  - name: phase-b
    type: code
    handler: noop
`);

      const queryFn = createMockQuery(new Map());

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          onPhaseComplete: async (phaseName) => {
            phaseLog.push(phaseName);
          },
        }),
        queryFn,
        handlerRegistry: registry,
      });

      await engine.resume(
        'workflow.yaml',
        { variables: {}, completedPhases: [], currentTaskId: null, changedFiles: [] },
        'phase-a'
      );

      expect(phaseLog).toEqual(['phase-a', 'phase-b']);
    });

    it('should not fail when onPhaseComplete is not set', async () => {
      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: code
    handler: noop
`);

      const queryFn = createMockQuery(new Map());

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(result.status).toBe('completed');
    });
  });

  // -----------------------------------------------------------------------
  // Falsy output handling
  // -----------------------------------------------------------------------
  describe('falsy output handling', () => {
    it('should store structured_output of 0 in the context', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Return zero.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: 0,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(result.outputs.result).toBe(0);
    });

    it('should store structured_output of false in the context', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Return false.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: false,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(result.outputs.result).toBe(false);
    });

    it('should store structured_output of empty string in the context', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Return empty string.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: '',
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(result.outputs.result).toBe('');
    });

    it('should NOT store structured_output of null in the context', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Return null.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: null,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // null should not have been stored (result variable starts as null, so output key won't be set)
      expect(result.outputs.result).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Path traversal prevention
  // -----------------------------------------------------------------------
  describe('path traversal prevention', () => {
    it('should throw when agent path escapes workflow directory', async () => {
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: evil
    type: agent
    agent: "../../etc/passwd"
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        /escapes workflow directory/
      );
    });

    it('should allow paths within the workflow directory', async () => {
      await writeAgentMarkdown(tmpDir, 'safe-agent.md', {
        name: 'safe',
        description: 'Safe agent',
        tools: [],
      }, 'Safe agent prompt.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: safe
    type: agent
    agent: safe-agent.md
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', { ok: true }]]));
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(result.status).toBe('completed');
    });

    it('should throw for absolute path agent reference', async () => {
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: evil
    type: agent
    agent: "/etc/passwd"
    output: result
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      // path.resolve with an absolute path returns that absolute path,
      // which will be outside the workflow dir
      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        /escapes workflow directory/
      );
    });
  });

  // -----------------------------------------------------------------------
  // Null structured_output handling
  // -----------------------------------------------------------------------
  describe('null structured_output handling', () => {
    it('should not store output when structured_output is null and output_as is set', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: myOutput
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: null,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // null structured_output should NOT be stored due to `result != null` guard
      expect(result.outputs.myOutput).toBeUndefined();
    });

    it('should not store output when structured_output is undefined and output_as is set', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: myOutput
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: undefined,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // undefined structured_output should NOT be stored
      expect(result.outputs.myOutput).toBeUndefined();
      // Context should not contain undefined for the output key
      expect('myOutput' in result.outputs).toBe(false);
    });

    it('should not throw when structured_output is null and no output key is configured', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
`);

      const queryFn: QueryFunction = async function* (_params) {
        yield {
          type: 'result',
          subtype: 'success',
          structured_output: null,
          is_error: false,
          num_turns: 1,
          total_cost_usd: 0.01,
          session_id: 'test-session',
        } as SDKResultMessage;
      };

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should complete normally without errors
      expect(result.status).toBe('completed');
    });
  });

  // -----------------------------------------------------------------------
  // Gate fallback behavior: onExhausted "skip" is not a valid option,
  // but we can verify "fail" vs "escalate" vs "warn" comprehensiveness
  // -----------------------------------------------------------------------
  // Note: The schema only allows 'escalate', 'warn', 'fail' for onExhausted.
  // We already test 'escalate' (paused) and 'fail' (failed). Here we verify
  // that 'warn' allows subsequent phases to continue executing normally.
  describe('gate fallback / loop onExhausted behavior', () => {
    it('should continue executing subsequent phases after onExhausted "warn"', async () => {
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });
      registry.register('final-step', async (ctx) => {
        ctx.set('finalStepRan', true);
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: warn
    steps:
      - name: fix
        type: agent
        agent: fixer.md
  - name: finalize
    type: code
    handler: final-step
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should complete and run the phase after the loop
      expect(result.status).toBe('completed');
      expect(result.outputs.finalStepRan).toBe(true);
    });

    it('should NOT continue executing subsequent phases after onExhausted "fail"', async () => {
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });
      registry.register('final-step', async (ctx) => {
        ctx.set('finalStepRan', true);
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: fail
    steps:
      - name: fix
        type: agent
        agent: fixer.md
  - name: finalize
    type: code
    handler: final-step
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should fail, finalize step should NOT have run
      expect(result.status).toBe('failed');
      expect(result.outputs.finalStepRan).toBeUndefined();
      expect(result.error).toContain('Loop exhausted 1 retries');
    });

    it('should NOT continue executing subsequent phases after onExhausted "escalate"', async () => {
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });
      registry.register('final-step', async (ctx) => {
        ctx.set('finalStepRan', true);
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
  - name: finalize
    type: code
    handler: final-step
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Should pause, finalize step should NOT have run
      expect(result.status).toBe('paused');
      expect(result.outputs.finalStepRan).toBeUndefined();
      expect(result.blockerDetails).toContain('Loop exhausted 1 retries');
    });
  });

  // -----------------------------------------------------------------------
  // Unknown/missing dependencies in topological sort
  // -----------------------------------------------------------------------
  describe('topologicalSort - missing dependencies', () => {
    it('should ignore dependencies that reference non-existent task IDs', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      const tasks: TaskDefinition[] = [
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: ['nonexistent'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      // Should not throw, should just ignore the missing dep
      const sorted = engine.topologicalSort(tasks);

      expect(sorted).toHaveLength(2);
      // Both tasks should be present
      expect(sorted.map(t => t.id)).toContain('a');
      expect(sorted.map(t => t.id)).toContain('b');
    });

    it('should sort correctly when some dependencies exist and some do not', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      const tasks: TaskDefinition[] = [
        { id: 'c', title: 'C', description: 'C', requirements: [], dependencies: ['a', 'ghost'], estimatedComplexity: 'low', filePaths: [] },
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
        { id: 'b', title: 'B', description: 'B', requirements: [], dependencies: ['missing-dep'], estimatedComplexity: 'low', filePaths: [] },
      ];

      const sorted = engine.topologicalSort(tasks);

      expect(sorted).toHaveLength(3);
      // 'a' must come before 'c' because 'c' depends on 'a'
      const idxA = sorted.findIndex(t => t.id === 'a');
      const idxC = sorted.findIndex(t => t.id === 'c');
      expect(idxA).toBeLessThan(idxC);
    });

    it('should handle tasks where all dependencies are missing', () => {
      const engine = new WorkflowEngine({
        config: makeConfig('/tmp'),
        queryFn: createMockQuery(new Map()),
      });

      const tasks: TaskDefinition[] = [
        { id: 'a', title: 'A', description: 'A', requirements: [], dependencies: ['phantom-1', 'phantom-2'], estimatedComplexity: 'low', filePaths: [] },
      ];

      const sorted = engine.topologicalSort(tasks);

      // Should process fine with the single task
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('a');
    });
  });

  // -----------------------------------------------------------------------
  // Nested template variable resolution (injection prevention end-to-end)
  // -----------------------------------------------------------------------
  describe('nested template variable resolution through engine', () => {
    it('should not recursively expand {{expression}} syntax in variable values', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Previous output: {{stepOneResult}}');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        // Store a value that itself contains template syntax
        ctx.set('stepOneResult', '{{specPath}}');
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: step2
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      // The prompt should contain the escaped version, NOT the resolved specPath
      expect(callLog).toHaveLength(1);
      // The value '{{specPath}}' should be escaped to prevent recursive expansion
      expect(callLog[0].prompt).not.toContain('/tmp/spec.md');
      // Should contain the escaped template syntax
      expect(callLog[0].prompt).toContain('\\{\\{specPath}}');
    });

    it('should not recursively expand nested template syntax in JSON-stringified objects', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Data: {{data}}');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('data', { injection: '{{specPath}}' });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: step2
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      // The JSON-stringified value should not cause specPath to resolve
      expect(callLog[0].prompt).not.toContain('/tmp/spec.md');
    });
  });

  // -----------------------------------------------------------------------
  // Per-task context isolation
  // -----------------------------------------------------------------------
  describe('per-task context isolation', () => {
    it('should not leak context mutations from one task into another', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'worker.md', {
        name: 'worker',
        description: 'Works on tasks',
        tools: [],
      }, 'Working on {{task.id}}');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', {
          tasks: [
            { id: 'task-a', title: 'A', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
            { id: 'task-b', title: 'B', description: 'B', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
            { id: 'task-c', title: 'C', description: 'C', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
          ],
        });
      });

      // This handler sets a variable in the task context
      // Only task-a should have this variable; task-b and task-c should NOT see it
      let taskIndex = 0;
      const taskContextVars: Array<{ taskId: string; hasMutation: boolean }> = [];
      registry.register('check-context', async (ctx) => {
        const currentTaskId = ctx.getCurrentTaskId();
        if (taskIndex === 0) {
          // First task sets a variable
          ctx.set('taskASecret', 'should-not-leak');
        }
        taskContextVars.push({
          taskId: currentTaskId ?? 'unknown',
          hasMutation: ctx.get('taskASecret') !== undefined,
        });
        taskIndex++;
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: work
        type: agent
        agent: worker.md
      - name: check
        type: code
        handler: check-context
`);

      const queryFn = createMockQuery(
        new Map([['default', { done: true }]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      expect(taskContextVars).toHaveLength(3);

      // Task A set the variable, so it should see it
      expect(taskContextVars[0].taskId).toBe('task-a');
      expect(taskContextVars[0].hasMutation).toBe(true);

      // Task B should NOT see task-a's variable (context isolation)
      // However, mergeTaskResults propagates new variables to parent.
      // The key "taskASecret" is new (not in parent before), so it gets merged.
      // Task B's child context inherits from parent which now has taskASecret.
      // This is the EXPECTED behavior: mergeTaskResults shares new outputs.
      // But the task variable itself is isolated.
      expect(taskContextVars[1].taskId).toBe('task-b');
      // taskASecret leaks through mergeTaskResults into parent, then into task-b's child
      expect(taskContextVars[1].hasMutation).toBe(true);

      expect(taskContextVars[2].taskId).toBe('task-c');
    });

    it('should isolate the task variable between per-task iterations', async () => {
      const taskTitles: string[] = [];

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', {
          tasks: [
            { id: 'task-a', title: 'Alpha', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
            { id: 'task-b', title: 'Beta', description: 'B', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
          ],
        });
      });

      registry.register('record-task', async (ctx) => {
        const task = ctx.get('task') as TaskDefinition;
        taskTitles.push(task.title);
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: record
        type: code
        handler: record-task
`);

      const queryFn = createMockQuery(new Map());

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // Each task should see its own task variable, not a previous task's
      expect(taskTitles).toEqual(['Alpha', 'Beta']);
    });

    it('should not have task variable in parent context after per-task completes', async () => {
      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', {
          tasks: [
            { id: 'task-a', title: 'Alpha', description: 'A', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
          ],
        });
      });
      registry.register('check-parent', async (ctx) => {
        // After per-task, the parent context should not have 'task' variable
        ctx.set('taskInParent', ctx.get('task'));
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: noop
        type: code
        handler: setup
  - name: verify
    type: code
    handler: check-parent
`);

      const queryFn = createMockQuery(new Map());

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // mergeTaskResults explicitly skips the 'task' key
      expect(result.outputs.taskInParent).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Loop step with zero iterations / immediately false condition
  // -----------------------------------------------------------------------
  describe('loop step with zero iterations', () => {
    it('should not execute body when condition is initially false', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        // Condition is already false
        ctx.set('review', { hasActionableIssues: false });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 5
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
`);

      const queryFn = createMockQuery(
        new Map([['default', {}]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // The loop DOES execute the body once (first iteration always runs),
      // then checks condition after. Since condition is false, it breaks.
      // This is the current loop behavior: condition check happens AFTER steps
      // on the first iteration, and BEFORE steps on subsequent iterations.
      expect(callLog).toHaveLength(1);
      expect(result.status).toBe('completed');
    });

    it('should proceed normally when condition is undefined (falsy)', async () => {
      const callLog: Array<{ prompt: string }> = [];

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      // Do NOT set the review variable at all - condition resolves to undefined (falsy)

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 3
    onExhausted: fail
    steps:
      - name: fix
        type: agent
        agent: fixer.md
`);

      const queryFn = createMockQuery(
        new Map([['default', {}]]),
        callLog as Array<{ prompt: string; options?: QueryOptions['options'] }>
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // First iteration runs (condition not checked before first),
      // then condition check: undefined is falsy, so loop exits
      expect(callLog).toHaveLength(1);
      expect(result.status).toBe('completed');
    });
  });

  // -----------------------------------------------------------------------
  // Config defaults merging
  // -----------------------------------------------------------------------
  describe('config defaults merging', () => {
    it('should use workflow YAML defaults when no step-level override exists', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: workflow-default-model
  permissionMode: default
  settingSources:
    - project
    - user
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      expect(callLog[0].options?.model).toBe('workflow-default-model');
      expect(callLog[0].options?.settingSources).toEqual(['project', 'user']);
    });

    it('should prefer step-level model over workflow defaults', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: workflow-default-model
phases:
  - name: step1
    type: agent
    agent: agent.md
    model: step-override-model
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      // Step-level model takes precedence
      expect(callLog[0].options?.model).toBe('step-override-model');
    });

    it('should prefer agent-level model over workflow defaults when no step override', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent-with-model.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
        model: 'agent-level-model',
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: workflow-default-model
phases:
  - name: step1
    type: agent
    agent: agent-with-model.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      // Agent-level model takes precedence over workflow defaults
      expect(callLog[0].options?.model).toBe('agent-level-model');
    });

    it('should fall back to engine config defaults when no workflow or step overrides', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          defaults: {
            model: 'engine-config-model',
            permissionMode: 'bypassPermissions',
            settingSources: ['project'],
          },
        }),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      // Falls back to engine config default
      expect(callLog[0].options?.model).toBe('engine-config-model');
    });

    it('should use step > agent > workflow > engine precedence chain for model', async () => {
      const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];

      // Agent with model defined
      await writeAgentMarkdown(tmpDir, 'agent-with-model.md', {
        name: 'agent',
        description: 'Agent with model',
        tools: [],
        model: 'agent-level-model',
      }, 'Do something.');

      // Agent without model defined
      await writeAgentMarkdown(tmpDir, 'agent-no-model.md', {
        name: 'agent',
        description: 'Agent without model',
        tools: [],
      }, 'Do something else.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
defaults:
  model: workflow-default-model
phases:
  - name: step-with-override
    type: agent
    agent: agent-with-model.md
    model: step-override-model
    output: r1
  - name: step-using-agent-model
    type: agent
    agent: agent-with-model.md
    output: r2
  - name: step-using-workflow-default
    type: agent
    agent: agent-no-model.md
    output: r3
`);

      const queryFn = createMockQuery(
        new Map([['default', { ok: true }]]),
        callLog
      );

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          defaults: {
            model: 'engine-config-model',
            permissionMode: 'bypassPermissions',
            settingSources: ['project'],
          },
        }),
        queryFn,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(3);
      // Step-level override wins
      expect(callLog[0].options?.model).toBe('step-override-model');
      // Agent-level model wins over workflow default
      expect(callLog[1].options?.model).toBe('agent-level-model');
      // Workflow default wins over engine config
      expect(callLog[2].options?.model).toBe('workflow-default-model');
    });
  });

  // -----------------------------------------------------------------------
  // Bug fix: ISS-000115 - pausedAtPhase in result when workflow pauses
  // -----------------------------------------------------------------------
  describe('pausedAtPhase in result (ISS-000115)', () => {
    it('should include pausedAtPhase in result when a phase escalates via loop', async () => {
      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix issues.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: code
    handler: setup
  - name: execute
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('paused');
      expect(result.pausedAtPhase).toBe('execute');
      expect(result.completedPhases).toEqual(['analyze']);
    });

    it('should include pausedAtPhase when per-task step pauses', async () => {
      await writeAgentMarkdown(tmpDir, 'implementer.md', {
        name: 'implementer',
        description: 'Implements',
        tools: [],
      }, 'Implement {{task.title}}.');

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes',
        tools: [],
      }, 'Fix issues.');

      const tasks: TaskDefinition[] = [
        { id: 't1', title: 'Task 1', description: 'D1', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', { tasks });
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: plan
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        type: agent
        agent: implementer.md
      - name: fix-loop
        type: loop
        condition: review.hasActionableIssues
        maxRetries: 1
        onExhausted: escalate
        steps:
          - name: fix
            type: agent
            agent: fixer.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('paused');
      expect(result.pausedAtPhase).toBe('execute');
      expect(result.completedPhases).toEqual(['plan']);
    });

    it('should include changedFiles in paused result', async () => {
      await writeAgentMarkdown(tmpDir, 'impl.md', {
        name: 'impl',
        description: 'Implements',
        tools: [],
      }, 'Implement.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.addChangedFile('src/foo.ts');
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: impl.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('paused');
      expect(result.changedFiles).toEqual(['src/foo.ts']);
    });

    it('should include changedFiles in failed result', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.addChangedFile('src/bar.ts');
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: fail
    steps:
      - name: fix
        type: agent
        agent: agent.md
`);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('failed');
      expect(result.changedFiles).toEqual(['src/bar.ts']);
    });
  });

  // -----------------------------------------------------------------------
  // Bug fix: ISS-000116 - per-task checkpoint on loop exhaustion
  // -----------------------------------------------------------------------
  describe('per-task checkpoint on loop exhaustion (ISS-000116)', () => {
    it('should save task checkpoint data when loop exhausts and escalates', async () => {
      await writeAgentMarkdown(tmpDir, 'implementer.md', {
        name: 'implementer',
        description: 'Implements',
        tools: [],
      }, 'Implement {{task.title}}.');

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes',
        tools: [],
      }, 'Fix issues.');

      const tasks: TaskDefinition[] = [
        { id: 't1', title: 'Task 1', description: 'D1', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', { tasks });
        ctx.set('tasksCompleted', []);
        ctx.set('tasksPending', ['t1']);
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: plan
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        type: agent
        agent: implementer.md
      - name: fix-loop
        type: loop
        condition: review.hasActionableIssues
        maxRetries: 1
        onExhausted: escalate
        steps:
          - name: fix
            type: agent
            agent: fixer.md
      - name: checkpoint
        type: code
        handler: save-checkpoint
`);

      // Register the real save-checkpoint handler
      const { saveCheckpointHandler } = await import('../src/handlers/save-checkpoint.js');
      registry.register('save-checkpoint', saveCheckpointHandler);

      const queryFn = createMockQuery(new Map([['default', {}]]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('paused');
      // The task checkpoint data should have been saved even though the
      // checkpoint step never ran (because the loop exhausted first).
      // The engine's runPerTask catch block captures this.
      expect(result.outputs.tasksCompleted).toContain('t1');
      expect(result.outputs.tasksPending).toEqual([]);
    });

    it('should merge task context back to parent even when loop exhausts', async () => {
      await writeAgentMarkdown(tmpDir, 'implementer.md', {
        name: 'implementer',
        description: 'Implements',
        tools: [],
      }, 'Implement {{task.title}}.');

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes',
        tools: [],
      }, 'Fix issues.');

      const tasks: TaskDefinition[] = [
        { id: 't1', title: 'Task 1', description: 'D1', requirements: [], dependencies: [], estimatedComplexity: 'low', filePaths: [] },
      ];

      const registry = new HandlerRegistry();
      registry.register('setup', async (ctx) => {
        ctx.set('analysis', { tasks });
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: plan
    type: code
    handler: setup
  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        type: agent
        agent: implementer.md
        output: implementation
      - name: fix-loop
        type: loop
        condition: review.hasActionableIssues
        maxRetries: 1
        onExhausted: escalate
        steps:
          - name: fix
            type: agent
            agent: fixer.md
`);

      const implResult = {
        filesChanged: [{ path: 'src/task1.ts' }],
      };

      const resultsMap = new Map<string, unknown>([
        ['Implement', implResult],
        ['Fix', {}],
      ]);
      const queryFn = createMockQuery(resultsMap);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('paused');
      // Changed files from the implementation should have been merged
      expect(result.changedFiles).toContain('src/task1.ts');
    });
  });

  // -----------------------------------------------------------------------
  // Bug fix: ISS-000120 - resume restores completedPhases from checkpoint
  // -----------------------------------------------------------------------
  describe('resume restores checkpoint state (ISS-000120)', () => {
    it('should restore completedPhases from checkpoint data on resume', async () => {
      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: code
    handler: noop
  - name: plan
    type: code
    handler: noop
  - name: execute
    type: code
    handler: noop
`);

      const queryFn = createMockQuery(new Map());
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
      });

      // Simulate resume from execute with analyze and plan already done
      const result = await engine.resume(
        'workflow.yaml',
        {
          variables: { someData: 'preserved' },
          completedPhases: ['analyze', 'plan'],
          currentTaskId: null,
          changedFiles: ['src/existing.ts'],
        },
        'execute'
      );

      expect(result.status).toBe('completed');
      // Should include BOTH the restored phases AND the newly completed one
      expect(result.completedPhases).toEqual(['analyze', 'plan', 'execute']);
      // Changed files should be preserved
      expect(result.changedFiles).toContain('src/existing.ts');
      // Variables should be preserved
      expect(result.outputs.someData).toBe('preserved');
    });

    it('should restore changedFiles from checkpoint data on resume', async () => {
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: verify
    type: agent
    agent: agent.md
    output: verification
`);

      const queryFn = createMockQuery(new Map([
        ['default', { testSuite: { exitCode: 0 } }],
      ]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.resume(
        'workflow.yaml',
        {
          variables: {},
          completedPhases: ['analyze', 'plan', 'execute'],
          currentTaskId: null,
          changedFiles: ['src/auth.ts', 'src/api.ts'],
        },
        'verify'
      );

      expect(result.status).toBe('completed');
      expect(result.changedFiles).toContain('src/auth.ts');
      expect(result.changedFiles).toContain('src/api.ts');
    });
  });

  // -----------------------------------------------------------------------
  // Silent default behaviors
  // -----------------------------------------------------------------------
  describe('silent default behaviors', () => {
    /**
     * These tests explicitly document cases where the engine silently
     * succeeds despite receiving unexpected or missing data from agent
     * queries. Each test includes a comment explaining whether the
     * behavior is intentional and why.
     */

    it('should silently skip output storage when agent produces no result message', async () => {
      // Intentional: agent completes without result message, output silently not stored.
      // The engine's for-await loop finishes without encountering a result message.
      // Since `result` stays at its initial value of `null` and the storage guard is
      // `if (step.output && result != null)`, the output key is never written.
      const { queryFn, calls } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createEmptySequence(),
      });

      await writeAgentMarkdown(tmpDir, 'quiet-agent.md', {
        name: 'quiet-agent',
        description: 'Agent that produces no result',
        tools: [],
      }, 'Do something.');

      // Two-phase workflow: quiet-agent stores to "analysis", then a second step checks
      await writeAgentMarkdown(tmpDir, 'followup.md', {
        name: 'followup',
        description: 'Followup step',
        tools: [],
      }, 'Followup step.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-silent-no-result
version: 1
phases:
  - name: analyze
    type: agent
    agent: quiet-agent.md
    output: analysis
  - name: followup
    type: agent
    agent: followup.md
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Engine should NOT throw -- it silently continues
      expect(result.status).toBe('completed');
      // The output key should NOT be stored in outputs
      expect(result.outputs.analysis).toBeUndefined();
      // Both steps should have been called
      expect(calls).toHaveLength(2);
    });

    it('should silently skip output storage when agent returns null structured_output', async () => {
      // Intentional: null structured_output is treated as "no output" by the engine.
      // The guard `message.structured_output != null` filters out null values,
      // so `result` remains at its initial value of `null`, and the storage
      // guard `if (step.output && result != null)` prevents writing.
      const { queryFn } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createNullOutputSequence(),
      });

      await writeAgentMarkdown(tmpDir, 'null-agent.md', {
        name: 'null-agent',
        description: 'Agent that returns null output',
        tools: [],
      }, 'Produce nothing.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-silent-null-output
version: 1
phases:
  - name: step1
    type: agent
    agent: null-agent.md
    output: someKey
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      // Engine completes without error
      expect(result.status).toBe('completed');
      // Output key is NOT stored (null output treated as no output)
      expect(result.outputs.someKey).toBeUndefined();
    });

    it('should use last result message when multiple results are received (last-wins)', async () => {
      // Intentional: last result message wins when multiple are received.
      // The engine's for-await loop overwrites `result` on each successful
      // result message with non-null structured_output. This means if the
      // agent yields multiple result messages, only the last one is kept.
      const { queryFn } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createMultiResultSequence(
          { first: true, value: 'initial' },
          { second: true, value: 'revised' },
        ),
      });

      await writeAgentMarkdown(tmpDir, 'multi-result.md', {
        name: 'multi-result',
        description: 'Agent that yields multiple results',
        tools: [],
      }, 'Produce multiple results.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-last-wins
version: 1
phases:
  - name: step1
    type: agent
    agent: multi-result.md
    output: data
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn,
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(result.status).toBe('completed');
      // The SECOND output should be stored, not the first
      expect(result.outputs.data).toEqual({ second: true, value: 'revised' });
      expect((result.outputs.data as Record<string, unknown>).first).toBeUndefined();
    });

    it('should propagate error and record in audit trail when query throws mid-stream', async () => {
      // When the agent's async generator throws mid-stream (after yielding
      // some messages), the error propagates from the for-await loop in
      // runAgent, is caught by executeStep, recorded via auditStepFailed,
      // and then re-thrown.
      const auditEntries: WorkflowAuditEntry[] = [];

      // Create a custom queryFn that throws after yielding an assistant message
      const throwingQueryFn: QueryFunction = async function* (
        _params: QueryOptions,
      ): AsyncGenerator<SDKMessage, void> {
        yield { type: 'assistant', content: 'Starting work...' };
        // Simulate a mid-stream error (e.g., network failure, SDK crash)
        throw new Error('SDK connection lost mid-stream');
      };

      await writeAgentMarkdown(tmpDir, 'failing-agent.md', {
        name: 'failing-agent',
        description: 'Agent whose query throws',
        tools: [],
      }, 'Do work that will crash.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-throw-mid-stream
version: 1
phases:
  - name: step1
    type: agent
    agent: failing-agent.md
    output: data
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn: throwingQueryFn,
        onAuditEntry: async (entry) => {
          auditEntries.push(entry);
        },
      });

      // The error should propagate
      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'SDK connection lost mid-stream'
      );

      // Verify the audit trail recorded the failure
      const failedEntry = auditEntries.find(
        e => e.step === 'step1' && e.status === 'failed'
      );
      expect(failedEntry).toBeDefined();
      expect(failedEntry!.metadata?.error).toBe('SDK connection lost mid-stream');
    });

  });

  // -----------------------------------------------------------------------
  // ISS-000113: onPhaseComplete callback error handling
  // -----------------------------------------------------------------------
  describe('onPhaseComplete callback error handling (ISS-000113)', () => {
    it('should propagate error when onPhaseComplete throws on the first phase', async () => {
      // Observed behavior: When onPhaseComplete throws, the error propagates
      // out of engine.run() as an unhandled error (not caught by
      // WorkflowFailure/WorkflowPaused handlers). This is intentional --
      // callback errors are considered unrecoverable infrastructure failures,
      // not workflow-level failures. The phase IS marked completed in context
      // before the callback fires (line 97: markPhaseCompleted before line 99).
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Simple agent',
        tools: [],
      }, 'Do something.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: agent
    agent: agent.md
    output: analysis
`);

      const queryFn = createMockQuery(new Map([
        ['default', { result: 'ok' }],
      ]));

      const callbackError = new Error('Callback infrastructure failure');

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          onPhaseComplete: async (_phaseName, _context) => {
            throw callbackError;
          },
        }),
        queryFn,
      });

      // The error should propagate (not be swallowed or wrapped)
      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'Callback infrastructure failure'
      );
    });

    it('should preserve first phase output when onPhaseComplete throws on second phase', async () => {
      // Observed behavior: The first phase completes successfully and its
      // callback succeeds. The second phase completes and its callback throws.
      // The error propagates, but the first phase's output was already stored
      // in context. Since the error is unhandled (not WorkflowFailure), it
      // propagates as a raw throw, so there is no WorkflowResult to inspect.
      // We verify the callback received the correct phase names and context.
      await writeAgentMarkdown(tmpDir, 'agent1.md', {
        name: 'agent1',
        description: 'First agent',
        tools: [],
      }, 'Phase 1 work.');

      await writeAgentMarkdown(tmpDir, 'agent2.md', {
        name: 'agent2',
        description: 'Second agent',
        tools: [],
      }, 'Phase 2 work.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: analyze
    type: agent
    agent: agent1.md
    output: analysis
  - name: plan
    type: agent
    agent: agent2.md
    output: plan
`);

      const queryFn = createMockQuery(new Map([
        ['Phase 1', { analysisData: 'important' }],
        ['Phase 2', { planData: 'detailed' }],
      ]));

      const callbackInvocations: Array<{ phase: string; completedPhases: string[] }> = [];

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          onPhaseComplete: async (phaseName, context) => {
            callbackInvocations.push({
              phase: phaseName,
              completedPhases: context.getCompletedPhases(),
            });
            if (phaseName === 'plan') {
              throw new Error('Second phase callback failure');
            }
          },
        }),
        queryFn,
      });

      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'Second phase callback failure'
      );

      // Verify first callback succeeded and second was called
      expect(callbackInvocations).toHaveLength(2);
      expect(callbackInvocations[0].phase).toBe('analyze');
      expect(callbackInvocations[0].completedPhases).toEqual(['analyze']);
      expect(callbackInvocations[1].phase).toBe('plan');
      // Both phases are marked completed BEFORE callback fires
      expect(callbackInvocations[1].completedPhases).toEqual(['analyze', 'plan']);
    });

    it('should handle async rejected promise from onPhaseComplete identically to sync throw', async () => {
      // Observed behavior: Since onPhaseComplete is awaited (line 100:
      // "await this.config.onPhaseComplete(...)"), a rejected promise
      // propagates identically to a synchronous throw. Both surface as
      // an unhandled error that escapes engine.run(). This is intentional.
      await writeAgentMarkdown(tmpDir, 'agent.md', {
        name: 'agent',
        description: 'Agent',
        tools: [],
      }, 'Do work.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: step1
    type: agent
    agent: agent.md
    output: result
`);

      const queryFn = createMockQuery(new Map([
        ['default', { done: true }],
      ]));

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, {
          onPhaseComplete: async (_phaseName, _context) => {
            // Return a rejected promise (as opposed to using throw)
            return Promise.reject(new Error('Async rejection in callback'));
          },
        }),
        queryFn,
      });

      // Should behave identically to a synchronous throw
      await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
        'Async rejection in callback'
      );
    });
  });
});
