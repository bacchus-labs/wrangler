/**
 * Tests for escape hatches: skipChecks, skipStepNames, and enabled:false.
 * ISS-000127
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { stringify as yamlStringify } from 'yaml';
import { WorkflowEngine } from '../src/engine.js';
import {
  type QueryFunction,
  type QueryOptions,
  type SDKResultMessage,
  type SDKMessage,
  type EngineConfig,
  type WorkflowAuditEntry,
} from '../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wf-escape-hatch-'));
}

async function writeWorkflowYaml(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
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

function createMockQuery(
  callLog?: Array<{ prompt: string }>
): QueryFunction {
  return async function* mockQuery(params: QueryOptions): AsyncGenerator<SDKMessage, void> {
    if (callLog) {
      callLog.push({ prompt: params.prompt });
    }
    yield {
      type: 'result',
      subtype: 'success',
      structured_output: { ok: true },
      is_error: false,
      num_turns: 1,
      total_cost_usd: 0.01,
      session_id: 'test-session',
    } as SDKResultMessage;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Escape Hatches (ISS-000127)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Helper: write a standard two-step workflow with agents
  async function setupTwoStepWorkflow(): Promise<void> {
    await writeAgentMarkdown(tmpDir, 'implement.md', {
      name: 'implementer',
      description: 'Implementation agent',
      tools: ['Read', 'Write'],
    }, 'Implement the feature for {{specPath}}');

    await writeAgentMarkdown(tmpDir, 'reviewer.md', {
      name: 'reviewer',
      description: 'Review agent',
      tools: ['Read'],
    }, 'Review the code for {{specPath}}');
  }

  describe('enabled: false', () => {
    it('skips a step with enabled: false', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
  - name: review
    agent: reviewer.md
    enabled: false
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      // Only the implement step should have been called
      expect(callLog).toHaveLength(1);
      expect(callLog[0].prompt).toContain('Implement the feature');
    });

    it('records "disabled in workflow definition" in audit log', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: review-step
    agent: reviewer.md
    enabled: false
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir),
        queryFn: createMockQuery(),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');
      const audit = engine.getAuditLog();

      const skipEntry = audit.find(e => e.step === 'review-step' && e.status === 'skipped');
      expect(skipEntry).toBeDefined();
      expect(skipEntry!.metadata?.reason).toBe('disabled in workflow definition');
    });
  });

  describe('skipStepNames', () => {
    it('skips a step whose name is in skipStepNames', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
  - name: review-security
    agent: reviewer.md
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipStepNames: ['review-security'] }),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      expect(callLog[0].prompt).toContain('Implement the feature');
    });

    it('records "--skip-step=<name>" in audit log', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: review-security
    agent: reviewer.md
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipStepNames: ['review-security'] }),
        queryFn: createMockQuery(),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');
      const audit = engine.getAuditLog();

      const skipEntry = audit.find(e => e.step === 'review-security' && e.status === 'skipped');
      expect(skipEntry).toBeDefined();
      expect(skipEntry!.metadata?.reason).toBe('--skip-step=review-security');
    });

    it('skips multiple steps listed in skipStepNames', async () => {
      await setupTwoStepWorkflow();
      await writeAgentMarkdown(tmpDir, 'lint.md', {
        name: 'linter',
        description: 'Lint agent',
        tools: ['Read'],
      }, 'Lint the code');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
  - name: review-security
    agent: reviewer.md
  - name: lint-check
    agent: lint.md
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipStepNames: ['review-security', 'lint-check'] }),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      expect(callLog[0].prompt).toContain('Implement the feature');
    });
  });

  describe('skipChecks', () => {
    it('skips a step that uses the reviewer agent when skipChecks is true', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
  - name: security-review
    agent: reviewer.md
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipChecks: true }),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      expect(callLog[0].prompt).toContain('Implement the feature');
    });

    it('skips a step whose name contains "review"', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
  - name: code-review
    agent: implement.md
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipChecks: true }),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
    });

    it('skips a step whose name contains "check"', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
  - name: lint-check
    agent: implement.md
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipChecks: true }),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
    });

    it('does NOT skip implementation steps even with skipChecks: true', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: implement
    agent: implement.md
`);

      const callLog: Array<{ prompt: string }> = [];
      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipChecks: true }),
        queryFn: createMockQuery(callLog),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(callLog).toHaveLength(1);
      expect(callLog[0].prompt).toContain('Implement the feature');
    });

    it('does NOT skip code steps even with skipChecks: true', async () => {
      const registry = new (await import('../src/handlers/index.js')).HandlerRegistry();
      const handlerCalled: string[] = [];
      registry.register('my-handler', async () => { handlerCalled.push('called'); });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: run-code
    type: code
    handler: my-handler
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipChecks: true }),
        queryFn: createMockQuery(),
        handlerRegistry: registry,
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');

      expect(handlerCalled).toHaveLength(1);
    });

    it('records "--skip-checks" in audit log', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: security-review
    agent: reviewer.md
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipChecks: true }),
        queryFn: createMockQuery(),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');
      const audit = engine.getAuditLog();

      const skipEntry = audit.find(e => e.step === 'security-review' && e.status === 'skipped');
      expect(skipEntry).toBeDefined();
      expect(skipEntry!.metadata?.reason).toBe('--skip-checks');
    });
  });

  describe('priority / combinations', () => {
    it('enabled:false takes priority over skipStepNames', async () => {
      await setupTwoStepWorkflow();
      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: test-workflow
version: 1
phases:
  - name: review-step
    agent: reviewer.md
    enabled: false
`);

      const engine = new WorkflowEngine({
        config: makeConfig(tmpDir, { skipStepNames: ['review-step'] }),
        queryFn: createMockQuery(),
      });

      await engine.run('workflow.yaml', '/tmp/spec.md');
      const audit = engine.getAuditLog();

      const skipEntry = audit.find(e => e.step === 'review-step' && e.status === 'skipped');
      expect(skipEntry).toBeDefined();
      // enabled:false reason should take priority
      expect(skipEntry!.metadata?.reason).toBe('disabled in workflow definition');
    });
  });
});
