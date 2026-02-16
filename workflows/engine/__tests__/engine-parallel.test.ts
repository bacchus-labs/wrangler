/**
 * Tests for the parallel step type in WorkflowEngine.
 *
 * Validates that parallel steps dispatch child steps concurrently,
 * merge outputs correctly, and propagate failures.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { stringify as yamlStringify } from 'yaml';
import { WorkflowEngine } from '../src/engine.js';
import {
  type QueryFunction,
  type QueryOptions,
  type SDKMessage,
  type SDKResultMessage,
  type EngineConfig,
} from '../src/types.js';
import {
  createSDKSimulator,
  createAgentSequence,
  createErrorSequence,
} from './fixtures/sdk-simulator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wf-parallel-test-'));
}

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

function makeConfig(tmpDir: string, overrides: Partial<EngineConfig> = {}): EngineConfig {
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

async function writeWorkflowYaml(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkflowEngine - parallel step type', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should execute both child steps and store outputs', async () => {
    // Set up two agent markdown files
    await writeAgentMarkdown(tmpDir, 'code-quality.md', {
      name: 'code-quality-reviewer', description: 'Reviews code quality',
      tools: ['Read'],
    }, 'Review code quality for {{specPath}}');

    await writeAgentMarkdown(tmpDir, 'test-coverage.md', {
      name: 'test-coverage-reviewer', description: 'Reviews test coverage',
      tools: ['Read'],
    }, 'Review test coverage for {{specPath}}');

    // Workflow with a parallel step containing two agent children
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: parallel-test
version: 1
phases:
  - name: reviews
    type: parallel
    steps:
      - name: review-code-quality
        agent: code-quality.md
        prompt: code-quality.md
        output: codeQualityReview
      - name: review-test-coverage
        agent: test-coverage.md
        prompt: test-coverage.md
        output: testCoverageReview
`);

    const { queryFn, calls } = createSDKSimulator({
      responses: new Map([
        ['code quality', createAgentSequence({ score: 9, notes: 'Excellent' })],
        ['test coverage', createAgentSequence({ score: 7, notes: 'Needs more edge cases' })],
      ]),
    });

    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
    });

    const result = await engine.run('workflow.yaml', '/tmp/spec.md');

    // Both queryFn calls should have been made
    expect(calls).toHaveLength(2);

    // Both outputs should be stored in the result
    expect(result.status).toBe('completed');
    expect(result.outputs).toBeDefined();
    expect((result.outputs as Record<string, unknown>).codeQualityReview).toEqual({
      score: 9,
      notes: 'Excellent',
    });
    expect((result.outputs as Record<string, unknown>).testCoverageReview).toEqual({
      score: 7,
      notes: 'Needs more edge cases',
    });
  });

  it('should fail the parallel group when any child fails', async () => {
    await writeAgentMarkdown(tmpDir, 'good-agent.md', {
      name: 'good-agent', description: 'Good agent',
      tools: [],
    }, 'Do something good');

    await writeAgentMarkdown(tmpDir, 'bad-agent.md', {
      name: 'bad-agent', description: 'Bad agent',
      tools: [],
    }, 'Do something bad');

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: parallel-fail-test
version: 1
phases:
  - name: parallel-phase
    type: parallel
    steps:
      - name: good-step
        agent: good-agent.md
        prompt: good-agent.md
        output: goodResult
      - name: bad-step
        agent: bad-agent.md
        prompt: bad-agent.md
        output: badResult
`);

    const { queryFn } = createSDKSimulator({
      responses: new Map([
        ['good', createAgentSequence({ ok: true })],
        ['bad', createErrorSequence('error_during_execution', ['Something broke'])],
      ]),
    });

    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
    });

    // The error should propagate -- the parallel group should fail
    await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow();
  });

  it('should run child steps concurrently, not sequentially', async () => {
    await writeAgentMarkdown(tmpDir, 'slow1.md', {
      name: 'slow-agent-1', description: 'Slow 1',
      tools: [],
    }, 'Slow step 1');

    await writeAgentMarkdown(tmpDir, 'slow2.md', {
      name: 'slow-agent-2', description: 'Slow 2',
      tools: [],
    }, 'Slow step 2');

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: parallel-concurrency-test
version: 1
phases:
  - name: concurrent-phase
    type: parallel
    steps:
      - name: step-a
        agent: slow1.md
        prompt: slow1.md
        output: resultA
      - name: step-b
        agent: slow2.md
        prompt: slow2.md
        output: resultB
`);

    // Track the order of calls and add delays to prove concurrency
    const callTimestamps: number[] = [];

    const queryFn: QueryFunction = async function* (params: QueryOptions): AsyncGenerator<SDKMessage, void> {
      callTimestamps.push(Date.now());

      // Add a small delay to simulate work
      await new Promise(resolve => setTimeout(resolve, 50));

      const output = params.prompt.includes('Slow step 1')
        ? { id: 'a' }
        : { id: 'b' };

      yield {
        type: 'result',
        subtype: 'success',
        structured_output: output,
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

    const start = Date.now();
    const result = await engine.run('workflow.yaml', '/tmp/spec.md');
    const elapsed = Date.now() - start;

    expect(result.status).toBe('completed');

    // If sequential, total time would be >= 100ms (50ms + 50ms).
    // If concurrent, total time should be close to 50ms.
    // Use a generous threshold but confirm they started close together.
    expect(callTimestamps).toHaveLength(2);
    const timeBetweenCalls = Math.abs(callTimestamps[1] - callTimestamps[0]);
    // Both calls should start within 20ms of each other (concurrent dispatch)
    expect(timeBetweenCalls).toBeLessThan(20);
  });

  it('should record individual child steps in the audit trail', async () => {
    await writeAgentMarkdown(tmpDir, 'agent-a.md', {
      name: 'agent-a', description: 'Agent A',
      tools: [],
    }, 'Agent A prompt');

    await writeAgentMarkdown(tmpDir, 'agent-b.md', {
      name: 'agent-b', description: 'Agent B',
      tools: [],
    }, 'Agent B prompt');

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: parallel-audit-test
version: 1
phases:
  - name: parallel-phase
    type: parallel
    steps:
      - name: child-a
        agent: agent-a.md
        prompt: agent-a.md
        output: outA
      - name: child-b
        agent: agent-b.md
        prompt: agent-b.md
        output: outB
`);

    const { queryFn } = createSDKSimulator({
      responses: new Map([
        ['Agent A', createAgentSequence({ a: 1 })],
        ['Agent B', createAgentSequence({ b: 2 })],
      ]),
    });

    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
    });

    await engine.run('workflow.yaml', '/tmp/spec.md');

    const audit = engine.getAuditLog();
    const stepNames = audit.map(e => e.step);

    // Each child step should have started and completed entries
    expect(stepNames).toContain('child-a');
    expect(stepNames).toContain('child-b');

    // The parent parallel-phase should also be recorded
    expect(stepNames).toContain('parallel-phase');

    // child-a should have both started and completed
    const childAEntries = audit.filter(e => e.step === 'child-a');
    expect(childAEntries.map(e => e.status)).toContain('started');
    expect(childAEntries.map(e => e.status)).toContain('completed');
  });

  it('should work as nested steps within per-task', async () => {
    // Producer agent that returns tasks
    await writeAgentMarkdown(tmpDir, 'producer.md', {
      name: 'producer', description: 'Produces tasks',
      tools: [],
    }, 'Produce tasks');

    // Two review agents
    await writeAgentMarkdown(tmpDir, 'review-a.md', {
      name: 'review-a', description: 'Review A',
      tools: [],
    }, 'Review A for task {{currentTask.id}}');

    await writeAgentMarkdown(tmpDir, 'review-b.md', {
      name: 'review-b', description: 'Review B',
      tools: [],
    }, 'Review B for task {{currentTask.id}}');

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: per-task-parallel-test
version: 1
phases:
  - name: plan
    agent: producer.md
    prompt: producer.md
    output: tasks
  - name: execute
    type: per-task
    source: tasks
    steps:
      - name: reviews
        type: parallel
        steps:
          - name: review-a
            agent: review-a.md
            prompt: review-a.md
            output: reviewAResult
          - name: review-b
            agent: review-b.md
            prompt: review-b.md
            output: reviewBResult
`);

    const tasks = [
      { id: 'task-1', title: 'First task', description: 'Do first thing', dependencies: [] },
      { id: 'task-2', title: 'Second task', description: 'Do second thing', dependencies: [] },
    ];

    const { queryFn, calls } = createSDKSimulator({
      responses: new Map([
        ['Produce tasks', createAgentSequence(tasks)],
        ['Review A', createAgentSequence({ reviewA: 'pass' })],
        ['Review B', createAgentSequence({ reviewB: 'pass' })],
      ]),
    });

    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
    });

    const result = await engine.run('workflow.yaml', '/tmp/spec.md');

    expect(result.status).toBe('completed');

    // 1 producer call + 2 tasks x 2 reviews = 5 total calls
    expect(calls).toHaveLength(5);

    // The review calls should include task context
    const reviewCalls = calls.filter(c => c.prompt.includes('Review'));
    expect(reviewCalls).toHaveLength(4); // 2 tasks x 2 reviews
  });

  it('should handle deeply nested structure: parallel > per-task > parallel (3 levels)', async () => {
    // Producer agent
    await writeAgentMarkdown(tmpDir, 'producer.md', {
      name: 'producer', description: 'Produces tasks',
      tools: [],
    }, 'Produce tasks');

    // Four leaf agents for the inner parallel steps
    await writeAgentMarkdown(tmpDir, 'lint.md', {
      name: 'lint', description: 'Lint check',
      tools: [],
    }, 'Lint {{currentTask.id}}');

    await writeAgentMarkdown(tmpDir, 'typecheck.md', {
      name: 'typecheck', description: 'Type check',
      tools: [],
    }, 'Typecheck {{currentTask.id}}');

    await writeAgentMarkdown(tmpDir, 'security.md', {
      name: 'security', description: 'Security scan',
      tools: [],
    }, 'Security scan');

    await writeAgentMarkdown(tmpDir, 'license.md', {
      name: 'license', description: 'License check',
      tools: [],
    }, 'License check');

    // Workflow: parallel(top) > [per-task branch, parallel(static checks)]
    //   per-task branch > inner-parallel(lint, typecheck)
    //   static checks > parallel(security, license)
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: deep-nesting-test
version: 1
phases:
  - name: plan
    agent: producer.md
    prompt: producer.md
    output: tasks
  - name: top-parallel
    type: parallel
    steps:
      - name: per-task-checks
        type: per-task
        source: tasks
        steps:
          - name: inner-parallel
            type: parallel
            steps:
              - name: lint-step
                agent: lint.md
                prompt: lint.md
                output: lintResult
              - name: typecheck-step
                agent: typecheck.md
                prompt: typecheck.md
                output: typecheckResult
      - name: static-checks
        type: parallel
        steps:
          - name: security-step
            agent: security.md
            prompt: security.md
            output: securityResult
          - name: license-step
            agent: license.md
            prompt: license.md
            output: licenseResult
`);

    const tasks = [
      { id: 'task-1', title: 'First', description: 'First task', dependencies: [] },
      { id: 'task-2', title: 'Second', description: 'Second task', dependencies: [] },
    ];

    const { queryFn, calls } = createSDKSimulator({
      responses: new Map([
        ['Produce tasks', createAgentSequence(tasks)],
        ['Lint', createAgentSequence({ lint: 'pass' })],
        ['Typecheck', createAgentSequence({ typecheck: 'pass' })],
        ['Security', createAgentSequence({ security: 'pass' })],
        ['License', createAgentSequence({ license: 'pass' })],
      ]),
    });

    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
    });

    const result = await engine.run('workflow.yaml', '/tmp/spec.md');

    expect(result.status).toBe('completed');

    // 1 producer + 2 tasks x 2 inner parallel (lint+typecheck) + 2 static checks (security+license)
    // = 1 + 4 + 2 = 7
    expect(calls).toHaveLength(7);

    // Verify all leaf agents were called
    const prompts = calls.map(c => c.prompt);
    const lintCalls = prompts.filter(p => p.includes('Lint'));
    const typecheckCalls = prompts.filter(p => p.includes('Typecheck'));
    const securityCalls = prompts.filter(p => p.includes('Security'));
    const licenseCalls = prompts.filter(p => p.includes('License'));

    expect(lintCalls).toHaveLength(2);      // once per task
    expect(typecheckCalls).toHaveLength(2);  // once per task
    expect(securityCalls).toHaveLength(1);   // static check
    expect(licenseCalls).toHaveLength(1);    // static check
  });

  it('should handle parallel step with code handler children', async () => {
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: parallel-code-test
version: 1
phases:
  - name: code-parallel
    type: parallel
    steps:
      - name: handler-a
        type: code
        handler: setValueA
      - name: handler-b
        type: code
        handler: setValueB
`);

    const registry = new (await import('../src/handlers/index.js')).HandlerRegistry();
    registry.register('setValueA', async (ctx) => {
      ctx.set('valueA', 42);
    });
    registry.register('setValueB', async (ctx) => {
      ctx.set('valueB', 99);
    });

    const { queryFn } = createSDKSimulator({ responses: new Map() });

    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
      handlerRegistry: registry,
    });

    const result = await engine.run('workflow.yaml', '/tmp/spec.md');

    expect(result.status).toBe('completed');
    expect((result.outputs as Record<string, unknown>).valueA).toBe(42);
    expect((result.outputs as Record<string, unknown>).valueB).toBe(99);
  });
});
