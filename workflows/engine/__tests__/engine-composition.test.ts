/**
 * Tests for agent+prompt composition and dispatch in the workflow engine.
 *
 * Covers ISS-000124:
 * - Step with agent+prompt dispatches with composed system+user prompt
 * - Model resolution: step > agent > workflow default
 * - Default agent used when step doesn't specify one
 * - Missing agent throws clear error
 * - Missing prompt throws clear error
 * - Output captured into named variable
 * - Template variables rendered in prompt body
 * - Audit trail records agent source and prompt source
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { stringify as yamlStringify } from 'yaml';
import { WorkflowEngine } from '../src/engine.js';
import { WorkflowResolver } from '../src/resolver.js';
import {
  type QueryFunction,
  type QueryOptions,
  type SDKResultMessage,
  type SDKMessage,
  type WorkflowAuditEntry,
} from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wf-composition-test-'));
}

/**
 * Write a markdown file (agent or prompt) with YAML frontmatter.
 */
async function writeMarkdownFile(
  dir: string,
  filename: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const yaml = yamlStringify(frontmatter).trim();
  await fs.writeFile(filePath, `---\n${yaml}\n---\n\n${body}`, 'utf-8');
  return filePath;
}

/**
 * Write a workflow YAML file.
 */
async function writeWorkflowYaml(
  dir: string,
  filename: string,
  content: string,
): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Create a mock QueryFunction that captures calls and returns structured output.
 */
function createMockQuery(
  output: unknown,
  callLog: Array<{ prompt: string; options?: QueryOptions['options'] }>,
): QueryFunction {
  return async function* mockQuery(params: QueryOptions): AsyncGenerator<SDKMessage, void> {
    callLog.push({ prompt: params.prompt, options: params.options });
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
}

function makeConfig(
  tmpDir: string,
  overrides: Partial<import('../src/types.js').EngineConfig> = {},
): import('../src/types.js').EngineConfig {
  return {
    workingDirectory: tmpDir,
    workflowBaseDir: tmpDir,
    defaults: {
      model: 'default-model',
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

describe('WorkflowEngine - agent+prompt composition', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
    // Create the agents/ and prompts/ directories in .wrangler/orchestration for resolver
    await fs.mkdir(path.join(tmpDir, '.wrangler', 'orchestration', 'agents'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should dispatch with composed systemPrompt and rendered prompt body', async () => {
    // Write agent file
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'coder.md',
      { name: 'coder', tools: ['Bash', 'Read'], model: 'sonnet' },
      'You are a coding assistant. Follow TDD.',
    );

    // Write prompt file
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'implement-feature.md',
      { name: 'implement-feature' },
      'Implement the feature described in: {{specPath}}',
    );

    // Write workflow YAML
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-composition
version: 1
phases:
  - name: implement
    agent: coder
    prompt: implement-feature
    output: implementResult
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ success: true }, callLog);

    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const config = makeConfig(tmpDir);
    const engine = new WorkflowEngine({ config, queryFn, resolver });

    const result = await engine.run('workflow.yaml', '/tmp/spec.md');

    // Should have made one query call
    expect(callLog).toHaveLength(1);

    // The systemPrompt should be the agent body
    expect(callLog[0].options?.systemPrompt).toBe(
      'You are a coding assistant. Follow TDD.',
    );

    // The prompt should be the rendered prompt body
    expect(callLog[0].prompt).toBe(
      'Implement the feature described in: /tmp/spec.md',
    );

    // Tools should come from agent
    expect(callLog[0].options?.allowedTools).toEqual(['Bash', 'Read']);

    // Model should come from agent (step didn't specify one)
    expect(callLog[0].options?.model).toBe('sonnet');

    // Output should be captured
    expect(result.outputs?.implementResult).toEqual({ success: true });
  });

  it('should resolve model with priority: step > agent > workflow default', async () => {
    // Agent has model: sonnet
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'coder.md',
      { name: 'coder', tools: [], model: 'sonnet' },
      'System prompt.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'task.md',
      { name: 'task' },
      'Do the task.',
    );

    // Step overrides model to opus
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-model-priority
version: 1
phases:
  - name: step1
    agent: coder
    prompt: task
    model: opus
    output: out
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ ok: true }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    await engine.run('workflow.yaml', '/tmp/spec.md');

    // Step model takes precedence
    expect(callLog[0].options?.model).toBe('opus');
  });

  it('should use workflow defaults.agent when step does not specify agent', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'default-agent.md',
      { name: 'default-agent', tools: ['Read'] },
      'I am the default agent.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'analyze.md',
      { name: 'analyze' },
      'Analyze the code.',
    );

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-default-agent
version: 1
defaults:
  agent: default-agent
  model: haiku
phases:
  - name: analyze-step
    prompt: analyze
    output: analysisResult
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ analysis: 'done' }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    await engine.run('workflow.yaml', '/tmp/spec.md');

    expect(callLog).toHaveLength(1);
    expect(callLog[0].options?.systemPrompt).toBe('I am the default agent.');
    expect(callLog[0].options?.allowedTools).toEqual(['Read']);
    // Model falls back to workflow default since neither step nor agent specifies it
    expect(callLog[0].options?.model).toBe('haiku');
  });

  it('should throw clear error when no agent can be resolved', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'task.md',
      { name: 'task' },
      'Do something.',
    );

    // No agent on step, no defaults.agent in workflow
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-no-agent
version: 1
phases:
  - name: broken-step
    prompt: task
    output: out
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({}, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
      /no agent/i,
    );
    expect(callLog).toHaveLength(0);
  });

  it('should throw clear error when prompt file cannot be resolved', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'coder.md',
      { name: 'coder', tools: [] },
      'System prompt.',
    );

    // Reference a prompt that does not exist
    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-missing-prompt
version: 1
phases:
  - name: broken-step
    agent: coder
    prompt: nonexistent-prompt
    output: out
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({}, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    await expect(engine.run('workflow.yaml', '/tmp/spec.md')).rejects.toThrow(
      /prompt not found.*nonexistent-prompt/i,
    );
    expect(callLog).toHaveLength(0);
  });

  it('should render Mustache template variables in prompt body', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'coder.md',
      { name: 'coder', tools: [] },
      'System prompt.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'greeting.md',
      { name: 'greeting' },
      'Hello {{userName}}, please work on {{specPath}}.',
    );

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-template-vars
version: 1
phases:
  - name: greet
    agent: coder
    prompt: greeting
    output: greetResult
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ greeted: true }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    // specPath is set by the engine context from the run() argument
    // userName is not set, so it should be blank
    await engine.run('workflow.yaml', '/tmp/my-spec.md');

    expect(callLog[0].prompt).toBe('Hello , please work on /tmp/my-spec.md.');
  });

  it('should capture output into the named variable', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'analyzer.md',
      { name: 'analyzer', tools: [] },
      'Analyze things.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'analyze.md',
      { name: 'analyze' },
      'Analyze {{specPath}}.',
    );

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-output-capture
version: 1
phases:
  - name: analyze
    agent: analyzer
    prompt: analyze
    output: analysisData
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ issues: ['a', 'b'], score: 95 }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    const result = await engine.run('workflow.yaml', '/tmp/spec.md');
    expect(result.outputs?.analysisData).toEqual({ issues: ['a', 'b'], score: 95 });
  });

  it('should record agent and prompt source in audit trail', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'coder.md',
      { name: 'coder', tools: [] },
      'System prompt.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'task.md',
      { name: 'task' },
      'Do the task.',
    );

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-audit
version: 1
phases:
  - name: do-task
    agent: coder
    prompt: task
    output: taskResult
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ done: true }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const auditEntries: WorkflowAuditEntry[] = [];
    const engine = new WorkflowEngine({
      config: makeConfig(tmpDir),
      queryFn,
      resolver,
      onAuditEntry: async (entry) => { auditEntries.push(entry); },
    });

    await engine.run('workflow.yaml', '/tmp/spec.md');

    // Find the completed audit entry for do-task
    const completedEntry = auditEntries.find(
      e => e.step === 'do-task' && e.status === 'completed',
    );
    expect(completedEntry).toBeDefined();
    expect(completedEntry!.metadata?.agentSource).toMatch(/coder\.md/);
    expect(completedEntry!.metadata?.promptSource).toMatch(/task\.md/);
  });

  it('should use agent model when step model is not specified', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'smart-agent.md',
      { name: 'smart-agent', tools: [], model: 'opus' },
      'I am smart.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'task.md',
      { name: 'task' },
      'Do it.',
    );

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-agent-model
version: 1
defaults:
  model: haiku
phases:
  - name: smart-step
    agent: smart-agent
    prompt: task
    output: out
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ ok: true }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    await engine.run('workflow.yaml', '/tmp/spec.md');

    // Agent model (opus) should take priority over workflow default (haiku)
    expect(callLog[0].options?.model).toBe('opus');
  });

  it('should fall back to workflow default model when neither step nor agent specifies one', async () => {
    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'agents'),
      'basic-agent.md',
      { name: 'basic-agent', tools: [] },
      'Basic agent.',
    );

    await writeMarkdownFile(
      path.join(tmpDir, '.wrangler', 'orchestration', 'prompts'),
      'task.md',
      { name: 'task' },
      'Do it.',
    );

    await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-default-model
version: 1
defaults:
  model: haiku
phases:
  - name: basic-step
    agent: basic-agent
    prompt: task
    output: out
`);

    const callLog: Array<{ prompt: string; options?: QueryOptions['options'] }> = [];
    const queryFn = createMockQuery({ ok: true }, callLog);
    const resolver = new WorkflowResolver(tmpDir, tmpDir);
    const engine = new WorkflowEngine({ config: makeConfig(tmpDir), queryFn, resolver });

    await engine.run('workflow.yaml', '/tmp/spec.md');

    expect(callLog[0].options?.model).toBe('haiku');
  });
});
