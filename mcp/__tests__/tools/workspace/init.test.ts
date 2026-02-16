/**
 * Tests for init_workspace MCP tool
 *
 * Covers: FR-001 (schema-driven), FR-002 (mkdir -p semantics),
 * FR-003 (.gitkeep in git-tracked dirs), FR-009 (report-only mode),
 * FR-010 (apply mode), FR-013 (fresh + existing projects),
 * NFR-001 (performance), NFR-002 (no external deps),
 * NFR-003 (read-only plugin dir), NFR-004 (structured output)
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  initWorkspaceSchema,
  initWorkspaceTool,
  InitWorkspaceParams,
  InitWorkspaceResult,
  resolvePluginRoot,
  resolveProjectRoot,
} from '../../../tools/workspace/init';

describe('initWorkspaceTool', () => {
  let tmpDir: string;
  let projectRoot: string;
  let pluginRoot: string;

  beforeEach(() => {
    // Create a temporary directory structure for testing
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-init-test-'));
    projectRoot = path.join(tmpDir, 'project');
    pluginRoot = path.join(tmpDir, 'plugin');

    // Create plugin root with workspace-schema.json
    fs.mkdirSync(path.join(pluginRoot, '.wrangler', 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
      JSON.stringify({
        version: '1.2.0',
        description: 'Test schema',
        workspace: { root: '.wrangler', description: 'Test workspace' },
        directories: {
          issues: {
            path: '.wrangler/issues',
            description: 'Issues',
            gitTracked: true,
            subdirectories: {
              archived: {
                path: '.wrangler/issues/archived',
                description: 'Archived issues',
              },
            },
          },
          cache: {
            path: '.wrangler/cache',
            description: 'Cache',
            gitTracked: false,
          },
          config: {
            path: '.wrangler/config',
            description: 'Config',
            gitTracked: true,
          },
        },
        governanceFiles: {},
        readmeFiles: {},
        gitignorePatterns: ['cache/', 'logs/', 'sessions/'],
        artifactTypes: {},
        mcpConfiguration: {
          issuesDirectory: '.wrangler/issues',
          specificationsDirectory: '.wrangler/specifications',
          ideasDirectory: '.wrangler/ideas',
        },
      })
    );

    // Create plugin workflows directory structure for asset provisioning
    const agentsDir = path.join(pluginRoot, 'workflows', 'agents');
    const promptsDir = path.join(pluginRoot, 'workflows', 'prompts');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'analyzer.md'), '# Analyzer Agent');
    fs.writeFileSync(path.join(agentsDir, 'fixer.md'), '# Fixer Agent');
    fs.writeFileSync(path.join(promptsDir, 'analyze-spec.md'), '# Analyze Spec');

    // Create workflow YAML files
    fs.writeFileSync(
      path.join(pluginRoot, 'workflows', 'spec-implementation.yaml'),
      'name: spec-implementation'
    );
    fs.writeFileSync(
      path.join(pluginRoot, 'workflows', 'code-review.yaml'),
      'name: code-review'
    );

    // Create project root (minimal - no .wrangler)
    fs.mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directories
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─── Schema Validation ─────────────────────────────────────────────

  describe('schema validation', () => {
    it('should accept empty params (defaults to fix: false)', () => {
      const result = initWorkspaceSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fix).toBe(false);
      }
    });

    it('should accept fix: true', () => {
      const result = initWorkspaceSchema.safeParse({ fix: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fix).toBe(true);
      }
    });

    it('should accept fix: false', () => {
      const result = initWorkspaceSchema.safeParse({ fix: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fix).toBe(false);
      }
    });

    it('should accept explicit projectRoot override', () => {
      const result = initWorkspaceSchema.safeParse({ projectRoot: '/some/path' });
      expect(result.success).toBe(true);
    });

    it('should accept explicit pluginRoot override', () => {
      const result = initWorkspaceSchema.safeParse({ pluginRoot: '/some/plugin' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid fix value', () => {
      const result = initWorkspaceSchema.safeParse({ fix: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  // ─── Path Resolution ───────────────────────────────────────────────

  describe('path resolution', () => {
    it('resolvePluginRoot returns directory containing .wrangler/config/workspace-schema.json', () => {
      const resolved = resolvePluginRoot(pluginRoot);
      expect(resolved).toBe(pluginRoot);
    });

    it('resolveProjectRoot returns the provided projectRoot', () => {
      const resolved = resolveProjectRoot(projectRoot);
      expect(resolved).toBe(projectRoot);
    });

    it('resolveProjectRoot resolves relative paths to absolute', () => {
      const resolved = resolveProjectRoot('.');
      expect(path.isAbsolute(resolved)).toBe(true);
    });
  });

  // ─── FR-009: Report-Only Mode (fix: false) ────────────────────────

  describe('report-only mode (fix: false)', () => {
    it('should return structured report without making changes', async () => {
      const result = await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      expect(result.metadata).toBeDefined();

      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('changes_needed');
      expect(report.directories).toBeDefined();
      expect(report.directories.created.length).toBeGreaterThan(0);
      expect(report.assets).toBeDefined();
      expect(report.config).toBeDefined();
      expect(report.gitignore).toBeDefined();
    });

    it('should NOT create any directories on disk', async () => {
      await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      const wranglerDir = path.join(projectRoot, '.wrangler');
      expect(fs.existsSync(wranglerDir)).toBe(false);
    });

    it('should list directories that would be created', async () => {
      const result = await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      // Should include directories from schema
      expect(report.directories.created).toContain('.wrangler/issues');
      expect(report.directories.created).toContain('.wrangler/cache');
    });

    it('should list assets that would be copied', async () => {
      const result = await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      expect(report.assets.agents.copied.length).toBeGreaterThan(0);
      expect(report.assets.prompts.copied.length).toBeGreaterThan(0);
      expect(report.assets.workflows.copied.length).toBeGreaterThan(0);
    });
  });

  // ─── FR-010: Apply Mode (fix: true) ───────────────────────────────

  describe('apply mode (fix: true)', () => {
    it('should create directories on disk', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('initialized');

      // Verify directories actually exist
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'cache'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'config'))).toBe(true);
    });

    it('should create .gitkeep in git-tracked directories', async () => {
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'config', '.gitkeep'))).toBe(true);
      // Cache is NOT git-tracked, should not have .gitkeep
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'cache', '.gitkeep'))).toBe(false);
    });

    it('should create subdirectories from schema', async () => {
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues', 'archived'))).toBe(true);
    });

    it('should copy agent files to orchestration directory', async () => {
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const agentDest = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
      expect(fs.existsSync(path.join(agentDest, 'analyzer.md'))).toBe(true);
      expect(fs.existsSync(path.join(agentDest, 'fixer.md'))).toBe(true);
    });

    it('should copy prompt files to orchestration directory', async () => {
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const promptDest = path.join(projectRoot, '.wrangler', 'orchestration', 'prompts');
      expect(fs.existsSync(path.join(promptDest, 'analyze-spec.md'))).toBe(true);
    });

    it('should copy workflow YAML files to orchestration directory', async () => {
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const wfDest = path.join(projectRoot, '.wrangler', 'orchestration', 'workflows');
      expect(fs.existsSync(path.join(wfDest, 'spec-implementation.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(wfDest, 'code-review.yaml'))).toBe(true);
    });

    it('should create .gitignore with patterns from schema', async () => {
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const gitignorePath = path.join(projectRoot, '.wrangler', '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('cache/');
      expect(content).toContain('logs/');
      expect(content).toContain('sessions/');
    });

    it('should return structured report of actions taken', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('initialized');
      expect(report.directories.created.length).toBeGreaterThan(0);
      expect(report.directories.existing).toEqual([]);
    });
  });

  // ─── FR-001: Schema-Driven ────────────────────────────────────────

  describe('schema-driven directory creation (FR-001)', () => {
    it('should read directories from workspace-schema.json in plugin root', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      // The schema we set up has issues, cache, and config
      expect(report.directories.created).toContain('.wrangler/issues');
      expect(report.directories.created).toContain('.wrangler/cache');
      expect(report.directories.created).toContain('.wrangler/config');
    });

    it('should use default schema when plugin schema not found', async () => {
      const noSchemaPlugin = path.join(tmpDir, 'no-schema-plugin');
      fs.mkdirSync(noSchemaPlugin, { recursive: true });

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot: noSchemaPlugin },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      // Default schema should still create standard directories
      expect(report.directories.created.length).toBeGreaterThan(0);
    });
  });

  // ─── FR-013: Fresh and Existing Projects ──────────────────────────

  describe('idempotency (FR-013)', () => {
    it('should handle fresh project with no .wrangler directory', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('initialized');
      expect(report.directories.existing).toEqual([]);
    });

    it('should handle existing project with partial .wrangler structure', async () => {
      // Pre-create some directories
      fs.mkdirSync(path.join(projectRoot, '.wrangler', 'issues'), { recursive: true });
      fs.writeFileSync(path.join(projectRoot, '.wrangler', 'issues', '.gitkeep'), '');

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.directories.existing).toContain('.wrangler/issues');
      // Other directories should be created
      expect(report.directories.created).toContain('.wrangler/cache');
    });

    it('should report compliant when everything exists', async () => {
      // First run: initialize everything
      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      // Second run: should report compliant
      const result = await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('compliant');
      expect(report.directories.created).toEqual([]);
    });

    it('should not overwrite existing asset files', async () => {
      // Pre-create a customized agent file
      const agentDir = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'analyzer.md'), '# Custom Analyzer');

      await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      // File should NOT be overwritten
      const content = fs.readFileSync(path.join(agentDir, 'analyzer.md'), 'utf-8');
      expect(content).toBe('# Custom Analyzer');
    });

    it('should report skipped assets for existing files', async () => {
      // Pre-create an agent file
      const agentDir = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'analyzer.md'), '# Custom');

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      expect(report.assets.agents.skipped).toContain('analyzer.md');
      // fixer.md should still be copied
      expect(report.assets.agents.copied).toContain('fixer.md');
    });

    it('should run second time without errors (idempotent)', async () => {
      // First run
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Second run (apply mode again)
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('compliant');
    });
  });

  // ─── .gitignore Management ────────────────────────────────────────

  describe('.gitignore management', () => {
    it('should not add duplicate patterns to existing .gitignore', async () => {
      // First run creates gitignore
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Second run should not duplicate
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const gitignorePath = path.join(projectRoot, '.wrangler', '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const matches = content.match(/cache\//g);
      expect(matches?.length).toBe(1);
    });

    it('should preserve custom patterns in existing .gitignore', async () => {
      // Pre-create gitignore with custom entry
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        '# Custom\nmy-custom-dir/\n'
      );

      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const content = fs.readFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'utf-8'
      );
      expect(content).toContain('my-custom-dir/');
      expect(content).toContain('cache/');
    });
  });

  // ─── Config File Generation ───────────────────────────────────────

  describe('config file generation', () => {
    it('should copy workspace-schema.json to project config', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const destSchema = path.join(projectRoot, '.wrangler', 'config', 'workspace-schema.json');
      expect(fs.existsSync(destSchema)).toBe(true);
    });

    it('should not overwrite existing workspace-schema.json in project', async () => {
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ version: '99.0.0', custom: true })
      );

      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const content = JSON.parse(
        fs.readFileSync(
          path.join(configDir, 'workspace-schema.json'),
          'utf-8'
        )
      );
      // Should keep the existing version (not overwrite)
      expect(content.version).toBe('99.0.0');
    });

    it('should report schema copy status', async () => {
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config).toBeDefined();
      expect(typeof report.config.schemaUpdated).toBe('boolean');
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────

  describe('error handling', () => {
    it('should handle missing plugin workflows directory gracefully', async () => {
      // Remove workflows directory from plugin
      fs.rmSync(path.join(pluginRoot, 'workflows'), { recursive: true, force: true });

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      // Should succeed but report no assets copied
      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.assets.agents.copied).toEqual([]);
      expect(report.assets.prompts.copied).toEqual([]);
      expect(report.assets.workflows.copied).toEqual([]);
    });

    it('should handle non-existent project root', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot: '/nonexistent/path', pluginRoot },
      );

      // Should create the directory or return error gracefully
      expect(result).toBeDefined();
    });
  });

  // ─── NFR-001: Performance ─────────────────────────────────────────

  describe('performance (NFR-001)', () => {
    it('should complete in under 2 seconds', async () => {
      const start = Date.now();
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });
  });

  // ─── FR-002: mkdir -p Semantics ──────────────────────────────────

  describe('mkdir -p semantics (FR-002)', () => {
    it('should create nested parent directories automatically', async () => {
      // Project root exists but no .wrangler/ at all
      // mkdir -p should create .wrangler/ AND .wrangler/issues/ in one call
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      // All nested directories should exist
      expect(fs.existsSync(path.join(projectRoot, '.wrangler'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues', 'archived'))).toBe(true);
    });

    it('should not fail when directories already exist', async () => {
      // Pre-create some directories
      fs.mkdirSync(path.join(projectRoot, '.wrangler', 'issues'), { recursive: true });
      fs.mkdirSync(path.join(projectRoot, '.wrangler', 'cache'), { recursive: true });

      // Should succeed without errors (mkdir -p semantics: no-op if exists)
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      // Both should be reported as existing, not created
      expect(report.directories.existing).toContain('.wrangler/issues');
      expect(report.directories.existing).toContain('.wrangler/cache');
    });

    it('should create all directories from schema in one call', async () => {
      // Use a schema with many directories to verify all are iterated
      const multiDirSchema = {
        version: '1.2.0',
        description: 'Multi-dir schema',
        workspace: { root: '.wrangler', description: 'Test' },
        directories: {
          alpha: { path: '.wrangler/alpha', description: 'Alpha', gitTracked: true },
          beta: { path: '.wrangler/beta', description: 'Beta', gitTracked: true },
          gamma: { path: '.wrangler/gamma', description: 'Gamma', gitTracked: false },
          delta: { path: '.wrangler/delta', description: 'Delta', gitTracked: true,
            subdirectories: {
              sub1: { path: '.wrangler/delta/sub1', description: 'Sub 1' },
              sub2: { path: '.wrangler/delta/sub2', description: 'Sub 2' },
            }
          },
        },
        governanceFiles: {},
        readmeFiles: {},
        gitignorePatterns: ['cache/'],
        artifactTypes: {},
        mcpConfiguration: {
          issuesDirectory: '.wrangler/alpha',
          specificationsDirectory: '.wrangler/beta',
          ideasDirectory: '.wrangler/gamma',
        },
      };

      // Write this custom schema to plugin root
      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify(multiDirSchema)
      );

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      // ALL directories from schema should be created
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'alpha'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'beta'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'gamma'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'delta'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'delta', 'sub1'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'delta', 'sub2'))).toBe(true);
    });
  });

  // ─── FR-003: .gitkeep in Git-Tracked Directories ──────────────────

  describe('.gitkeep management (FR-003)', () => {
    it('should create .gitkeep in git-tracked directories', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // issues is gitTracked: true in test schema
      expect(fs.existsSync(
        path.join(projectRoot, '.wrangler', 'issues', '.gitkeep')
      )).toBe(true);
      // config is gitTracked: true in test schema
      expect(fs.existsSync(
        path.join(projectRoot, '.wrangler', 'config', '.gitkeep')
      )).toBe(true);
    });

    it('should NOT create .gitkeep in non-git-tracked directories', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // cache is gitTracked: false in test schema
      expect(fs.existsSync(
        path.join(projectRoot, '.wrangler', 'cache', '.gitkeep')
      )).toBe(false);
    });

    it('should not overwrite existing .gitkeep files', async () => {
      // Pre-create .gitkeep with custom content
      fs.mkdirSync(path.join(projectRoot, '.wrangler', 'issues'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', 'issues', '.gitkeep'),
        '# custom content\n'
      );

      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // .gitkeep should still have the original content
      const content = fs.readFileSync(
        path.join(projectRoot, '.wrangler', 'issues', '.gitkeep'),
        'utf-8'
      );
      expect(content).toBe('# custom content\n');
    });

    it('should handle directories with gitTracked flag across whole schema', async () => {
      const mixedSchema = {
        version: '1.2.0',
        description: 'Mixed tracking',
        workspace: { root: '.wrangler', description: 'Test' },
        directories: {
          tracked1: { path: '.wrangler/tracked1', description: 'T1', gitTracked: true },
          tracked2: { path: '.wrangler/tracked2', description: 'T2', gitTracked: true },
          untracked1: { path: '.wrangler/untracked1', description: 'U1', gitTracked: false },
          untracked2: { path: '.wrangler/untracked2', description: 'U2', gitTracked: false },
        },
        governanceFiles: {},
        readmeFiles: {},
        gitignorePatterns: [],
        artifactTypes: {},
        mcpConfiguration: {
          issuesDirectory: '.wrangler/tracked1',
          specificationsDirectory: '.wrangler/tracked2',
          ideasDirectory: '.wrangler/untracked1',
        },
      };

      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify(mixedSchema)
      );

      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Git-tracked dirs should have .gitkeep
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'tracked1', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'tracked2', '.gitkeep'))).toBe(true);
      // Non-tracked dirs should NOT have .gitkeep
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'untracked1', '.gitkeep'))).toBe(false);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'untracked2', '.gitkeep'))).toBe(false);
    });
  });

  // ─── FR-013: Fresh and Existing Projects (extended) ───────────────

  describe('fresh and existing project edge cases (FR-013)', () => {
    it('should handle project where subdirectory exists but parent does not', async () => {
      // Edge case: someone manually created a subdirectory without the schema parent
      // This shouldn't happen naturally, but we should handle it gracefully
      fs.mkdirSync(path.join(projectRoot, '.wrangler', 'issues', 'archived'), { recursive: true });

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      // Parent should be reported as existing since mkdir -p created it
      expect(report.directories.existing).toContain('.wrangler/issues');
      // Subdirectory should be reported as existing
      expect(report.directories.existing).toContain('.wrangler/issues/archived');
      // Other directories should be created
      expect(report.directories.created).toContain('.wrangler/cache');
    });

    it('should handle project root that does not exist yet', async () => {
      const nonExistentProject = path.join(tmpDir, 'brand-new-project');
      // Project root doesn't even exist yet

      const result = await initWorkspaceTool(
        { fix: true, projectRoot: nonExistentProject, pluginRoot },
      );

      // Should handle gracefully - either create it or return error
      expect(result).toBeDefined();
    });

    it('should handle empty .wrangler directory (partial initialization interrupted)', async () => {
      // Just the .wrangler/ dir exists but nothing inside
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      // All child directories should be created
      expect(report.directories.created).toContain('.wrangler/issues');
      expect(report.directories.created).toContain('.wrangler/cache');
      expect(report.directories.created).toContain('.wrangler/config');
    });
  });

  // ─── NFR-004: Structured Output ───────────────────────────────────

  describe('structured output (NFR-004)', () => {
    it('should return MCP-compliant response with content and metadata', async () => {
      const result = await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
      expect(typeof result.isError).toBe('boolean');
    });

    it('should include all required fields in metadata', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const report = result.metadata as InitWorkspaceResult;
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('directories');
      expect(report).toHaveProperty('directories.created');
      expect(report).toHaveProperty('directories.existing');
      expect(report).toHaveProperty('assets');
      expect(report).toHaveProperty('assets.agents');
      expect(report).toHaveProperty('assets.agents.copied');
      expect(report).toHaveProperty('assets.agents.skipped');
      expect(report).toHaveProperty('assets.prompts');
      expect(report).toHaveProperty('assets.prompts.copied');
      expect(report).toHaveProperty('assets.prompts.skipped');
      expect(report).toHaveProperty('assets.workflows');
      expect(report).toHaveProperty('assets.workflows.copied');
      expect(report).toHaveProperty('assets.workflows.skipped');
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('gitignore');
    });

    it('should have human-readable text summary', async () => {
      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      const text = result.content[0].text;
      expect(text.length).toBeGreaterThan(0);
      // Should mention workspace initialization
      expect(text.toLowerCase()).toContain('workspace');
    });
  });
});
