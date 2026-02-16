import { WorkflowResolver } from '../src/resolver.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('WorkflowResolver', () => {
  let projectRoot: string;
  let pluginRoot: string;
  let resolver: WorkflowResolver;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-project-'));
    pluginRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-plugin-'));
    resolver = new WorkflowResolver(projectRoot, pluginRoot);
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(pluginRoot, { recursive: true, force: true });
  });

  describe('resolveWorkflow', () => {
    it('resolves project-level workflow over builtin', async () => {
      const projectDir = path.join(projectRoot, '.wrangler', 'workflows');
      const builtinDir = path.join(pluginRoot, 'workflows');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'spec-implementation.yaml'), 'project');
      fs.writeFileSync(path.join(builtinDir, 'spec-implementation.yaml'), 'builtin');

      const result = await resolver.resolveWorkflow('spec-implementation');
      expect(result.source).toBe('project');
      expect(result.path).toBe(path.join(projectDir, 'spec-implementation.yaml'));
    });

    it('falls back to builtin when project file missing', async () => {
      const builtinDir = path.join(pluginRoot, 'workflows');
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(builtinDir, 'deploy.yaml'), 'builtin');

      const result = await resolver.resolveWorkflow('deploy');
      expect(result.source).toBe('builtin');
      expect(result.path).toBe(path.join(builtinDir, 'deploy.yaml'));
    });

    it('resolves project-only workflow (no builtin)', async () => {
      const projectDir = path.join(projectRoot, '.wrangler', 'workflows');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'custom.yaml'), 'project-only');

      const result = await resolver.resolveWorkflow('custom');
      expect(result.source).toBe('project');
      expect(result.path).toBe(path.join(projectDir, 'custom.yaml'));
    });

    it('throws when workflow not found in either tier', async () => {
      await expect(resolver.resolveWorkflow('nonexistent')).rejects.toThrow(
        /not found/i
      );
    });

    it('adds .yaml extension automatically', async () => {
      const builtinDir = path.join(pluginRoot, 'workflows');
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(builtinDir, 'test.yaml'), 'content');

      const result = await resolver.resolveWorkflow('test');
      expect(result.path.endsWith('test.yaml')).toBe(true);
    });
  });

  describe('resolveAgent', () => {
    it('resolves project-level agent over builtin', async () => {
      const projectDir = path.join(projectRoot, '.wrangler', 'agents');
      const builtinDir = path.join(pluginRoot, 'agents');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'reviewer.md'), 'project');
      fs.writeFileSync(path.join(builtinDir, 'reviewer.md'), 'builtin');

      const result = await resolver.resolveAgent('reviewer');
      expect(result.source).toBe('project');
      expect(result.path).toBe(path.join(projectDir, 'reviewer.md'));
    });

    it('falls back to builtin agent', async () => {
      const builtinDir = path.join(pluginRoot, 'agents');
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(builtinDir, 'coder.md'), 'builtin');

      const result = await resolver.resolveAgent('coder');
      expect(result.source).toBe('builtin');
      expect(result.path).toBe(path.join(builtinDir, 'coder.md'));
    });

    it('does not double .md extension', async () => {
      const builtinDir = path.join(pluginRoot, 'agents');
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(builtinDir, 'reviewer.md'), 'content');

      const result = await resolver.resolveAgent('reviewer.md');
      expect(result.path.endsWith('reviewer.md')).toBe(true);
      expect(result.path.endsWith('reviewer.md.md')).toBe(false);
    });

    it('adds .md extension when missing', async () => {
      const builtinDir = path.join(pluginRoot, 'agents');
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(builtinDir, 'reviewer.md'), 'content');

      const result = await resolver.resolveAgent('reviewer');
      expect(result.path.endsWith('reviewer.md')).toBe(true);
    });

    it('throws when agent not found', async () => {
      await expect(resolver.resolveAgent('ghost')).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('resolvePrompt', () => {
    it('resolves project-level prompt over builtin', async () => {
      const projectDir = path.join(projectRoot, '.wrangler', 'prompts');
      const builtinDir = path.join(pluginRoot, 'prompts');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'code-quality-review.md'), 'project');
      fs.writeFileSync(path.join(builtinDir, 'code-quality-review.md'), 'builtin');

      const result = await resolver.resolvePrompt('code-quality-review.md');
      expect(result.source).toBe('project');
      expect(result.path).toBe(path.join(projectDir, 'code-quality-review.md'));
    });

    it('falls back to builtin prompt', async () => {
      const builtinDir = path.join(pluginRoot, 'prompts');
      fs.mkdirSync(builtinDir, { recursive: true });
      fs.writeFileSync(path.join(builtinDir, 'review.md'), 'builtin');

      const result = await resolver.resolvePrompt('review');
      expect(result.source).toBe('builtin');
      expect(result.path).toBe(path.join(builtinDir, 'review.md'));
    });

    it('does not double .md extension', async () => {
      const projectDir = path.join(projectRoot, '.wrangler', 'prompts');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'test.md'), 'content');

      const result = await resolver.resolvePrompt('test.md');
      expect(result.path.endsWith('test.md')).toBe(true);
      expect(result.path.endsWith('test.md.md')).toBe(false);
    });

    it('throws when prompt not found listing both paths', async () => {
      try {
        await resolver.resolvePrompt('missing');
        fail('should have thrown');
      } catch (e: unknown) {
        const msg = (e as Error).message;
        expect(msg).toContain('.wrangler/prompts');
        expect(msg).toContain(path.join(pluginRoot, 'prompts'));
      }
    });
  });

  describe('error messages', () => {
    it('lists both searched paths in workflow error', async () => {
      try {
        await resolver.resolveWorkflow('nope');
        fail('should have thrown');
      } catch (e: unknown) {
        const msg = (e as Error).message;
        expect(msg).toContain(path.join(projectRoot, '.wrangler', 'workflows', 'nope.yaml'));
        expect(msg).toContain(path.join(pluginRoot, 'workflows', 'nope.yaml'));
      }
    });

    it('lists both searched paths in agent error', async () => {
      try {
        await resolver.resolveAgent('nope');
        fail('should have thrown');
      } catch (e: unknown) {
        const msg = (e as Error).message;
        expect(msg).toContain(path.join(projectRoot, '.wrangler', 'agents', 'nope.md'));
        expect(msg).toContain(path.join(pluginRoot, 'agents', 'nope.md'));
      }
    });
  });
});
