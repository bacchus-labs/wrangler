/**
 * Tests for init_workspace MCP tool
 *
 * Covers all 12 scenarios from SPEC-000049:
 *   1.  Fresh workspace (no .wrangler/ exists)
 *   2.  Existing workspace, fully compliant
 *   3.  Existing workspace, missing new dirs (schema update)
 *   4.  Existing workspace, customized assets (not overwritten)
 *   5.  Existing workspace, missing some assets (only missing copied)
 *   6.  Report-only mode (fix: false)
 *   7.  Apply mode (fix: true)
 *   8.  Gitignore idempotency (no duplicate patterns)
 *   9.  Gitignore with custom entries (preserved)
 *  10.  Config not overwritten (existing wrangler.json)
 *  11.  Schema version check (plugin newer -> update)
 *  12.  No git repo (graceful handling)
 *
 * Covers all 13 functional requirements: FR-001 through FR-013
 * Covers non-functional requirements: NFR-001 (performance),
 *   NFR-002 (no external deps), NFR-003 (read-only plugin dir),
 *   NFR-004 (structured output)
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
  parseSemver,
  compareSemver,
  parseGitignorePatterns,
} from '../../../tools/workspace/init';

// ─── Unit Tests for Semver Helpers ──────────────────────────────────

describe('parseSemver', () => {
  it('should parse valid semver strings', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('0.0.0')).toEqual([0, 0, 0]);
    expect(parseSemver('10.20.30')).toEqual([10, 20, 30]);
  });

  it('should return [0,0,0] for undefined', () => {
    expect(parseSemver(undefined)).toEqual([0, 0, 0]);
  });

  it('should return [0,0,0] for empty string', () => {
    expect(parseSemver('')).toEqual([0, 0, 0]);
  });

  it('should return [0,0,0] for non-semver strings', () => {
    expect(parseSemver('not-a-version')).toEqual([0, 0, 0]);
    expect(parseSemver('abc')).toEqual([0, 0, 0]);
    expect(parseSemver('1.2')).toEqual([0, 0, 0]);
  });

  it('should handle v-prefixed semver strings (v1.2.3 format)', () => {
    // Issue #8: v-prefix is now stripped before parsing
    expect(parseSemver('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('v0.0.0')).toEqual([0, 0, 0]);
    expect(parseSemver('v10.20.30')).toEqual([10, 20, 30]);
    expect(parseSemver('v1.2.3-beta')).toEqual([1, 2, 3]);
  });

  it('should handle versions with pre-release suffixes by ignoring suffix', () => {
    expect(parseSemver('1.2.3-beta')).toEqual([1, 2, 3]);
    expect(parseSemver('2.0.0-rc.1')).toEqual([2, 0, 0]);
  });
});

describe('compareSemver', () => {
  it('should return 0 for equal versions', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
    expect(compareSemver('0.0.0', '0.0.0')).toBe(0);
  });

  it('should return positive when first version is greater', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareSemver('1.1.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0);
  });

  it('should return negative when first version is lesser', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareSemver('1.0.0', '1.1.0')).toBeLessThan(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
  });

  it('should handle multi-digit version components correctly (1.10.0 > 1.9.0)', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('1.9.0', '1.10.0')).toBeLessThan(0);
  });

  it('should handle undefined versions (treated as 0.0.0)', () => {
    expect(compareSemver(undefined, '1.0.0')).toBeLessThan(0);
    expect(compareSemver('1.0.0', undefined)).toBeGreaterThan(0);
    expect(compareSemver(undefined, undefined)).toBe(0);
  });

  it('should handle malformed versions (treated as 0.0.0)', () => {
    expect(compareSemver('not-a-version', '1.0.0')).toBeLessThan(0);
    expect(compareSemver('1.0.0', 'not-a-version')).toBeGreaterThan(0);
  });
});

// ─── Unit Tests for parseGitignorePatterns ──────────────────────────

describe('parseGitignorePatterns', () => {
  it('should parse simple patterns from lines', () => {
    const result = parseGitignorePatterns('cache/\nlogs/\nsessions/\n');
    expect(result).toEqual(new Set(['cache/', 'logs/', 'sessions/']));
  });

  it('should skip comment lines starting with #', () => {
    const result = parseGitignorePatterns('# This is a comment\ncache/\n# Another comment\nlogs/\n');
    expect(result).toEqual(new Set(['cache/', 'logs/']));
    expect(result.has('# This is a comment')).toBe(false);
  });

  it('should skip blank lines', () => {
    const result = parseGitignorePatterns('cache/\n\n\nlogs/\n\n');
    expect(result).toEqual(new Set(['cache/', 'logs/']));
  });

  it('should trim whitespace from each line', () => {
    const result = parseGitignorePatterns('  cache/  \n\tlogs/\t\n  sessions/\n');
    expect(result).toEqual(new Set(['cache/', 'logs/', 'sessions/']));
  });

  it('should handle CRLF line endings', () => {
    const result = parseGitignorePatterns('cache/\r\nlogs/\r\nsessions/\r\n');
    expect(result).toEqual(new Set(['cache/', 'logs/', 'sessions/']));
  });

  it('should handle mixed LF and CRLF line endings', () => {
    const result = parseGitignorePatterns('cache/\r\nlogs/\nsessions/\r\n');
    expect(result).toEqual(new Set(['cache/', 'logs/', 'sessions/']));
  });

  it('should return empty set for empty string', () => {
    const result = parseGitignorePatterns('');
    expect(result.size).toBe(0);
  });

  it('should return empty set for content with only comments and blanks', () => {
    const result = parseGitignorePatterns('# Header\n\n# Footer\n');
    expect(result.size).toBe(0);
  });

  it('should not treat comment containing pattern text as a pattern', () => {
    const result = parseGitignorePatterns('# ignore cache/ and logs/\nsessions/\n');
    expect(result).toEqual(new Set(['sessions/']));
    expect(result.has('cache/')).toBe(false);
    expect(result.has('logs/')).toBe(false);
  });

  it('should handle negation patterns (lines starting with !)', () => {
    const result = parseGitignorePatterns('cache/\n!cache/important/\n');
    expect(result).toEqual(new Set(['cache/', '!cache/important/']));
  });

  it('should handle content without trailing newline', () => {
    const result = parseGitignorePatterns('cache/\nlogs/');
    expect(result).toEqual(new Set(['cache/', 'logs/']));
  });
});

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

    // Issue #1: Path traversal / system directory validation
    it('resolveProjectRoot throws when given a system directory', () => {
      expect(() => resolveProjectRoot('/etc')).toThrow(/system directory/i);
      expect(() => resolveProjectRoot('/usr')).toThrow(/system directory/i);
      expect(() => resolveProjectRoot('/')).toThrow(/system directory/i);
    });

    it('resolvePluginRoot throws when given a system directory', () => {
      expect(() => resolvePluginRoot('/etc')).toThrow(/system directory/i);
      expect(() => resolvePluginRoot('/var')).toThrow(/system directory/i);
    });

    it('resolveProjectRoot accepts a valid user-owned path', () => {
      // A tmp-based path should not be rejected
      expect(() => resolveProjectRoot(projectRoot)).not.toThrow();
    });

    it('initWorkspaceTool returns an error when projectRoot is a system directory', async () => {
      const result = await initWorkspaceTool({ fix: false, projectRoot: '/etc', pluginRoot });
      expect(result.isError).toBe(true);
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

    // ─── FR-008: Line-based pattern parsing and diff ──────────────────

    it('should parse patterns line-by-line, not by substring matching', async () => {
      // Pre-create gitignore with a comment that contains a pattern as substring
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        '# This comment mentions cache/ but is not a pattern\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // "cache/" appears only in a comment line, so it should be reported as needing addition
      expect(report.gitignore.patternsAdded).toContain('cache/');
    });

    it('should recognize patterns regardless of surrounding whitespace', async () => {
      // Pattern with trailing whitespace should still be recognized
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'cache/  \nlogs/\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // Both cache/ and logs/ exist (even with trailing whitespace on cache/)
      expect(report.gitignore.existing).toContain('cache/');
      expect(report.gitignore.existing).toContain('logs/');
      // Only sessions/ should be missing
      expect(report.gitignore.patternsAdded).toEqual(['sessions/']);
    });

    it('should skip blank lines and comment lines when checking existing patterns', async () => {
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        '# Header comment\n\ncache/\n\n# Another comment\nlogs/\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.gitignore.existing).toContain('cache/');
      expect(report.gitignore.existing).toContain('logs/');
      expect(report.gitignore.patternsAdded).toEqual(['sessions/']);
    });

    it('should append only missing patterns to an existing .gitignore with some patterns', async () => {
      // Pre-create gitignore with only cache/ present
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'cache/\n'
      );

      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const content = fs.readFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'utf-8'
      );
      // cache/ should appear exactly once (not duplicated)
      expect(content.match(/^cache\/$/gm)?.length).toBe(1);
      // logs/ and sessions/ should be added
      expect(content).toContain('logs/');
      expect(content).toContain('sessions/');
    });

    it('should correctly report existing vs patternsAdded in metadata', async () => {
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'logs/\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.gitignore.existing).toContain('logs/');
      expect(report.gitignore.existing).not.toContain('cache/');
      expect(report.gitignore.patternsAdded).toContain('cache/');
      expect(report.gitignore.patternsAdded).toContain('sessions/');
      expect(report.gitignore.patternsAdded).not.toContain('logs/');
    });

    it('should not treat inline comments containing a pattern as an existing pattern', async () => {
      // Inline comment with pattern-like text
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        '# ignore cache/ and logs/ directories\nsessions/\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // sessions/ is a real pattern
      expect(report.gitignore.existing).toContain('sessions/');
      // cache/ and logs/ are only in comments, should need adding
      expect(report.gitignore.patternsAdded).toContain('cache/');
      expect(report.gitignore.patternsAdded).toContain('logs/');
    });

    // ─── FR-012: No overwriting / no duplication ──────────────────────

    it('should handle .gitignore with Windows-style line endings (CRLF)', async () => {
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'cache/\r\nlogs/\r\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.gitignore.existing).toContain('cache/');
      expect(report.gitignore.existing).toContain('logs/');
      expect(report.gitignore.patternsAdded).toEqual(['sessions/']);
    });

    it('should handle empty .gitignore file', async () => {
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        ''
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // All patterns should be added
      expect(report.gitignore.patternsAdded).toContain('cache/');
      expect(report.gitignore.patternsAdded).toContain('logs/');
      expect(report.gitignore.patternsAdded).toContain('sessions/');
      expect(report.gitignore.existing).toEqual([]);

      // Verify file content
      const content = fs.readFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'utf-8'
      );
      expect(content).toContain('cache/');
      expect(content).toContain('logs/');
      expect(content).toContain('sessions/');
    });

    it('should handle .gitignore with all patterns already present', async () => {
      fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'cache/\nlogs/\nsessions/\n'
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.gitignore.patternsAdded).toEqual([]);
      expect(report.gitignore.existing).toEqual(['cache/', 'logs/', 'sessions/']);
    });

    it('should not create .gitignore in report-only mode', async () => {
      await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const gitignorePath = path.join(projectRoot, '.wrangler', '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(false);
    });

    it('should trigger changes_needed status when gitignore patterns are missing', async () => {
      // Create all directories and configs but leave gitignore incomplete
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Remove sessions/ from gitignore
      const gitignorePath = path.join(projectRoot, '.wrangler', '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      fs.writeFileSync(gitignorePath, content.replace('sessions/\n', ''));

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('changes_needed');
      expect(report.gitignore.patternsAdded).toContain('sessions/');
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

  // ─── FR-011: Schema Version Comparison & Copy ──────────────────────

  describe('FR-011: schema version comparison and copy', () => {
    it('should copy schema when destination does not exist (fresh project)', async () => {
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const destSchema = path.join(projectRoot, '.wrangler', 'config', 'workspace-schema.json');
      expect(fs.existsSync(destSchema)).toBe(true);

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.schemaUpdated).toBe(true);
    });

    it('should update schema when plugin version is newer than project version', async () => {
      // Pre-create an older version schema in the project
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ version: '1.0.0', description: 'Old schema', workspace: { root: '.wrangler' }, directories: {}, governanceFiles: {}, readmeFiles: {}, gitignorePatterns: [], artifactTypes: {}, mcpConfiguration: {} })
      );

      // Plugin has version 1.2.0 (newer)
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.schemaUpdated).toBe(true);

      // Verify the schema was actually updated with the plugin's version
      const content = JSON.parse(
        fs.readFileSync(path.join(configDir, 'workspace-schema.json'), 'utf-8')
      );
      expect(content.version).toBe('1.2.0');
    });

    it('should NOT update schema when project version matches plugin version', async () => {
      // Pre-create a schema with the same version as plugin (1.2.0)
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      const existingSchema = {
        version: '1.2.0',
        description: 'Project-customized schema',
        workspace: { root: '.wrangler' },
        directories: {},
        governanceFiles: {},
        readmeFiles: {},
        gitignorePatterns: [],
        artifactTypes: {},
        mcpConfiguration: {},
      };
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify(existingSchema)
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.schemaUpdated).toBe(false);

      // Content should remain unchanged
      const content = JSON.parse(
        fs.readFileSync(path.join(configDir, 'workspace-schema.json'), 'utf-8')
      );
      expect(content.description).toBe('Project-customized schema');
    });

    it('should NOT update schema when project version is newer than plugin version', async () => {
      // Pre-create a schema with a NEWER version than plugin
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ version: '2.0.0', description: 'Future schema', workspace: { root: '.wrangler' }, directories: {}, governanceFiles: {}, readmeFiles: {}, gitignorePatterns: [], artifactTypes: {}, mcpConfiguration: {} })
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.schemaUpdated).toBe(false);

      // Version should NOT be downgraded
      const content = JSON.parse(
        fs.readFileSync(path.join(configDir, 'workspace-schema.json'), 'utf-8')
      );
      expect(content.version).toBe('2.0.0');
    });

    it('should handle missing version field in project schema (treat as 0.0.0)', async () => {
      // Pre-create a schema WITHOUT a version field
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ description: 'No version', workspace: { root: '.wrangler' }, directories: {}, governanceFiles: {}, readmeFiles: {}, gitignorePatterns: [], artifactTypes: {}, mcpConfiguration: {} })
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // Should update since no version is treated as 0.0.0
      expect(report.config.schemaUpdated).toBe(true);
    });

    it('should handle malformed version in project schema gracefully', async () => {
      // Pre-create a schema with an invalid version string
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ version: 'not-a-version', description: 'Bad version', workspace: { root: '.wrangler' }, directories: {}, governanceFiles: {}, readmeFiles: {}, gitignorePatterns: [], artifactTypes: {}, mcpConfiguration: {} })
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // Malformed version should be treated as 0.0.0, so plugin (1.2.0) is newer
      expect(report.config.schemaUpdated).toBe(true);
    });

    it('should detect schema update needed in report-only mode (fix: false)', async () => {
      // Pre-create an older version schema
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ version: '1.0.0', workspace: { root: '.wrangler' }, directories: {}, governanceFiles: {}, readmeFiles: {}, gitignorePatterns: [], artifactTypes: {}, mcpConfiguration: {} })
      );

      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.schemaUpdated).toBe(true);
      expect(report.status).toBe('changes_needed');

      // But should NOT have actually updated the file
      const content = JSON.parse(
        fs.readFileSync(path.join(configDir, 'workspace-schema.json'), 'utf-8')
      );
      expect(content.version).toBe('1.0.0');
    });

    it('should compare versions using semver logic (1.10.0 > 1.9.0)', async () => {
      // Write a plugin schema with version 1.10.0
      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify({
          version: '1.10.0',
          description: 'Newer plugin schema',
          workspace: { root: '.wrangler' },
          directories: {
            issues: { path: '.wrangler/issues', description: 'Issues', gitTracked: true },
            cache: { path: '.wrangler/cache', description: 'Cache', gitTracked: false },
            config: { path: '.wrangler/config', description: 'Config', gitTracked: true },
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

      // Project has version 1.9.0
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'workspace-schema.json'),
        JSON.stringify({ version: '1.9.0', workspace: { root: '.wrangler' }, directories: {}, governanceFiles: {}, readmeFiles: {}, gitignorePatterns: [], artifactTypes: {}, mcpConfiguration: {} })
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // 1.10.0 > 1.9.0, so schema should be updated
      expect(report.config.schemaUpdated).toBe(true);
    });
  });

  // ─── FR-007: wrangler.json Config File Generation ──────────────────

  describe('wrangler.json config file generation (FR-007)', () => {
    it('should generate .wrangler/config/wrangler.json on fresh project', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      expect(fs.existsSync(wranglerJsonPath)).toBe(true);
    });

    it('should include version field in wrangler.json', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      const content = JSON.parse(fs.readFileSync(wranglerJsonPath, 'utf-8'));
      expect(content.version).toBeDefined();
      expect(typeof content.version).toBe('string');
    });

    it('should include workspace directories in wrangler.json', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      const content = JSON.parse(fs.readFileSync(wranglerJsonPath, 'utf-8'));
      expect(content.workspace).toBeDefined();
      expect(content.workspace.root).toBe('.wrangler');
      expect(content.workspace.directories).toBeDefined();
      // Should contain the key directories from schema
      expect(content.workspace.directories.issues).toBe('.wrangler/issues');
      expect(content.workspace.directories.cache).toBe('.wrangler/cache');
      expect(content.workspace.directories.config).toBe('.wrangler/config');
    });

    it('should not create wrangler.json in report-only mode', async () => {
      await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      expect(fs.existsSync(wranglerJsonPath)).toBe(false);
    });

    it('should not overwrite existing wrangler.json (FR-012)', async () => {
      // Pre-create a custom wrangler.json
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      const customConfig = { version: '99.0.0', custom: true, workspace: { root: '.custom' } };
      fs.writeFileSync(
        path.join(configDir, 'wrangler.json'),
        JSON.stringify(customConfig, null, 2)
      );

      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const content = JSON.parse(
        fs.readFileSync(path.join(configDir, 'wrangler.json'), 'utf-8')
      );
      // Should preserve the custom content
      expect(content.version).toBe('99.0.0');
      expect(content.custom).toBe(true);
    });

    it('should report wranglerConfig creation status in result metadata', async () => {
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.wranglerConfigCreated).toBe(true);
    });

    it('should report wranglerConfigCreated as false when file already exists', async () => {
      // Pre-create wrangler.json
      const configDir = path.join(projectRoot, '.wrangler', 'config');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'wrangler.json'),
        JSON.stringify({ version: '1.0.0' })
      );

      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.wranglerConfigCreated).toBe(false);
    });

    it('should include wrangler.json creation in changes_needed detection', async () => {
      // Pre-create everything EXCEPT wrangler.json:
      // First, initialize fully
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Remove only wrangler.json
      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      fs.unlinkSync(wranglerJsonPath);

      // Now check report - should detect the missing wrangler.json
      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('changes_needed');
      expect(report.config.wranglerConfigCreated).toBe(true);
    });

    it('should produce valid JSON in wrangler.json', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      const rawContent = fs.readFileSync(wranglerJsonPath, 'utf-8');
      // Should not throw
      expect(() => JSON.parse(rawContent)).not.toThrow();
      // Should be pretty-printed (indented)
      expect(rawContent).toContain('\n');
    });

    it('should be idempotent: second run does not recreate wrangler.json', async () => {
      // First run creates it
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      const firstContent = fs.readFileSync(wranglerJsonPath, 'utf-8');

      // Second run should not modify it
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });
      const report = result.metadata as InitWorkspaceResult;
      expect(report.config.wranglerConfigCreated).toBe(false);

      const secondContent = fs.readFileSync(wranglerJsonPath, 'utf-8');
      expect(secondContent).toBe(firstContent);
    });

    it('should derive version from workspace schema version', async () => {
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const wranglerJsonPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');
      const content = JSON.parse(fs.readFileSync(wranglerJsonPath, 'utf-8'));
      // Version should match the schema version
      expect(content.version).toBe('1.2.0');
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

  // ─── Scenario #3: Existing workspace, missing new dirs (schema update) ───

  describe('existing workspace with schema update adding new dirs (Scenario #3)', () => {
    it('should create only new directories when schema is updated with additional dirs', async () => {
      // Phase 1: Initialize with original schema (issues, cache, config)
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Phase 2: Update plugin schema to include a new directory (e.g., "plans")
      const updatedSchema = {
        version: '1.3.0',
        description: 'Updated schema with new dir',
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
          plans: {
            path: '.wrangler/plans',
            description: 'Implementation plans',
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
      };

      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify(updatedSchema)
      );

      // Phase 3: Re-run init with updated schema
      const result = await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      // Only the new "plans" directory should be created
      expect(report.directories.created).toContain('.wrangler/plans');
      // Existing directories should be reported as existing
      expect(report.directories.existing).toContain('.wrangler/issues');
      expect(report.directories.existing).toContain('.wrangler/cache');
      expect(report.directories.existing).toContain('.wrangler/config');
      // New directory should actually exist on disk
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'plans'))).toBe(true);
      // New git-tracked directory should have .gitkeep
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'plans', '.gitkeep'))).toBe(true);
    });

    it('should report changes_needed in report-only mode for new dirs from schema update', async () => {
      // Phase 1: Initialize with original schema
      await initWorkspaceTool({ fix: true, projectRoot, pluginRoot });

      // Phase 2: Update plugin schema to include new directory
      const updatedSchema = {
        version: '1.3.0',
        description: 'Updated schema',
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
          memos: {
            path: '.wrangler/memos',
            description: 'Reference material',
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
      };

      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify(updatedSchema)
      );

      // Phase 3: Report-only mode
      const result = await initWorkspaceTool({ fix: false, projectRoot, pluginRoot });

      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('changes_needed');
      expect(report.directories.created).toContain('.wrangler/memos');
      // Should NOT create the directory on disk
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'memos'))).toBe(false);
    });
  });

  // ─── Scenario #12: No git repo ────────────────────────────────────

  describe('no git repo (Scenario #12)', () => {
    it('should handle project directory that is not a git repository gracefully', async () => {
      // projectRoot has no .git directory - just a plain directory
      // The tool should still work since it uses explicit projectRoot
      expect(fs.existsSync(path.join(projectRoot, '.git'))).toBe(false);

      const result = await initWorkspaceTool(
        { fix: true, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('initialized');
      // All directories should still be created
      expect(report.directories.created.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues'))).toBe(true);
    });

    it('should produce valid report-only output in non-git project', async () => {
      expect(fs.existsSync(path.join(projectRoot, '.git'))).toBe(false);

      const result = await initWorkspaceTool(
        { fix: false, projectRoot, pluginRoot },
      );

      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('changes_needed');
      expect(report.directories).toBeDefined();
      expect(report.assets).toBeDefined();
      expect(report.config).toBeDefined();
      expect(report.gitignore).toBeDefined();
    });

    it('should resolve projectRoot without git when no explicit path is provided', () => {
      // resolveProjectRoot without explicit path should fall back to cwd
      const resolved = resolveProjectRoot(undefined);
      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved).toBe(path.resolve(process.cwd()));
    });
  });

  // ─── FR-004/FR-005/FR-006: Builtin Asset Provisioning ──────────────

  describe('builtin asset provisioning (FR-004, FR-005, FR-006)', () => {
    // The exact builtin files that should be provisioned from plugin workflows/ directory
    const BUILTIN_AGENTS = [
      'analyzer.md',
      'fixer.md',
      'implementer.md',
      'publisher.md',
      'reviewer.md',
      'verifier.md',
    ];

    const BUILTIN_PROMPTS = [
      'analyze-diff.md',
      'analyze-spec.md',
      'code-quality-review.md',
      'consolidate-review.md',
      'fix-issues.md',
      'implement-task.md',
      'publish-changes.md',
      'review-code-quality.md',
      'review-security.md',
      'review-testing.md',
      'run-verification.md',
      'security-review.md',
      'test-coverage-review.md',
    ];

    const BUILTIN_WORKFLOWS = [
      'code-review.yaml',
      'spec-implementation.yaml',
    ];

    let fullPluginRoot: string;

    beforeEach(() => {
      // Create a plugin root with ALL builtin asset files
      fullPluginRoot = path.join(tmpDir, 'full-plugin');
      const agentsDir = path.join(fullPluginRoot, 'workflows', 'agents');
      const promptsDir = path.join(fullPluginRoot, 'workflows', 'prompts');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.mkdirSync(promptsDir, { recursive: true });

      // Create all 6 agent files
      for (const agent of BUILTIN_AGENTS) {
        fs.writeFileSync(path.join(agentsDir, agent), `# ${agent}`);
      }
      // Create all 13 prompt files
      for (const prompt of BUILTIN_PROMPTS) {
        fs.writeFileSync(path.join(promptsDir, prompt), `# ${prompt}`);
      }
      // Create all 2 workflow files
      for (const wf of BUILTIN_WORKFLOWS) {
        fs.writeFileSync(
          path.join(fullPluginRoot, 'workflows', wf),
          `name: ${wf}`
        );
      }

      // Also set up the schema in this plugin root
      fs.mkdirSync(path.join(fullPluginRoot, '.wrangler', 'config'), { recursive: true });
      fs.copyFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        path.join(fullPluginRoot, '.wrangler', 'config', 'workspace-schema.json')
      );
    });

    // ─── FR-004: Agent Provisioning ──────────────────────────────────

    describe('FR-004: agent file provisioning (6 files)', () => {
      it('should plan copying all 6 agent files on fresh project', async () => {
        const result = await initWorkspaceTool(
          { fix: false, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.assets.agents.copied).toHaveLength(6);
        for (const agent of BUILTIN_AGENTS) {
          expect(report.assets.agents.copied).toContain(agent);
        }
        expect(report.assets.agents.skipped).toHaveLength(0);
      });

      it('should copy all 6 agent files to .wrangler/orchestration/agents/', async () => {
        await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const agentsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
        for (const agent of BUILTIN_AGENTS) {
          const destPath = path.join(agentsDest, agent);
          expect(fs.existsSync(destPath)).toBe(true);
          // Verify content matches source
          const content = fs.readFileSync(destPath, 'utf-8');
          expect(content).toBe(`# ${agent}`);
        }
      });

      it('should copy agent files with preserved content fidelity', async () => {
        // Write a more complex agent file
        const complexContent = '---\nname: analyzer\nversion: 1.0\n---\n\n# Analyzer Agent\n\nDetailed instructions...';
        fs.writeFileSync(
          path.join(fullPluginRoot, 'workflows', 'agents', 'analyzer.md'),
          complexContent
        );

        await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const copied = fs.readFileSync(
          path.join(projectRoot, '.wrangler', 'orchestration', 'agents', 'analyzer.md'),
          'utf-8'
        );
        expect(copied).toBe(complexContent);
      });
    });

    // ─── FR-005: Prompt Provisioning ─────────────────────────────────

    describe('FR-005: prompt file provisioning (13 files)', () => {
      it('should plan copying all 13 prompt files on fresh project', async () => {
        const result = await initWorkspaceTool(
          { fix: false, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.assets.prompts.copied).toHaveLength(13);
        for (const prompt of BUILTIN_PROMPTS) {
          expect(report.assets.prompts.copied).toContain(prompt);
        }
        expect(report.assets.prompts.skipped).toHaveLength(0);
      });

      it('should copy all 13 prompt files to .wrangler/orchestration/prompts/', async () => {
        await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const promptsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'prompts');
        for (const prompt of BUILTIN_PROMPTS) {
          const destPath = path.join(promptsDest, prompt);
          expect(fs.existsSync(destPath)).toBe(true);
          const content = fs.readFileSync(destPath, 'utf-8');
          expect(content).toBe(`# ${prompt}`);
        }
      });
    });

    // ─── FR-006: Workflow Provisioning ───────────────────────────────

    describe('FR-006: workflow file provisioning (2 files)', () => {
      it('should plan copying all 2 workflow YAML files on fresh project', async () => {
        const result = await initWorkspaceTool(
          { fix: false, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.assets.workflows.copied).toHaveLength(2);
        for (const wf of BUILTIN_WORKFLOWS) {
          expect(report.assets.workflows.copied).toContain(wf);
        }
        expect(report.assets.workflows.skipped).toHaveLength(0);
      });

      it('should copy all 2 workflow YAML files to .wrangler/orchestration/workflows/', async () => {
        await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const wfDest = path.join(projectRoot, '.wrangler', 'orchestration', 'workflows');
        for (const wf of BUILTIN_WORKFLOWS) {
          const destPath = path.join(wfDest, wf);
          expect(fs.existsSync(destPath)).toBe(true);
          const content = fs.readFileSync(destPath, 'utf-8');
          expect(content).toBe(`name: ${wf}`);
        }
      });

      it('should only copy .yaml files from workflows root, not subdirectories', async () => {
        // Put a non-yaml file and a file in a subdirectory
        fs.writeFileSync(
          path.join(fullPluginRoot, 'workflows', 'README.md'),
          '# Readme'
        );

        const result = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        // Should only have 2 YAML files, not the README
        expect(report.assets.workflows.copied).toHaveLength(2);
        expect(report.assets.workflows.copied).not.toContain('README.md');
      });
    });

    // ─── FR-012: Existence Checks (Prevent Overwriting) ──────────────

    describe('FR-012: existence checks prevent overwriting', () => {
      it('should skip existing agent files and not overwrite them', async () => {
        // Pre-create 2 of the 6 agent files with custom content
        const agentsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
        fs.mkdirSync(agentsDest, { recursive: true });
        fs.writeFileSync(path.join(agentsDest, 'analyzer.md'), '# My Custom Analyzer');
        fs.writeFileSync(path.join(agentsDest, 'fixer.md'), '# My Custom Fixer');

        const result = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        // 2 should be skipped
        expect(report.assets.agents.skipped).toContain('analyzer.md');
        expect(report.assets.agents.skipped).toContain('fixer.md');
        expect(report.assets.agents.skipped).toHaveLength(2);
        // 4 should be copied
        expect(report.assets.agents.copied).toHaveLength(4);
        expect(report.assets.agents.copied).toContain('implementer.md');
        expect(report.assets.agents.copied).toContain('publisher.md');
        expect(report.assets.agents.copied).toContain('reviewer.md');
        expect(report.assets.agents.copied).toContain('verifier.md');

        // Verify custom content preserved
        expect(fs.readFileSync(path.join(agentsDest, 'analyzer.md'), 'utf-8')).toBe('# My Custom Analyzer');
        expect(fs.readFileSync(path.join(agentsDest, 'fixer.md'), 'utf-8')).toBe('# My Custom Fixer');

        // Verify new files were actually copied
        expect(fs.existsSync(path.join(agentsDest, 'implementer.md'))).toBe(true);
      });

      it('should skip existing prompt files and not overwrite them', async () => {
        const promptsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'prompts');
        fs.mkdirSync(promptsDest, { recursive: true });
        fs.writeFileSync(path.join(promptsDest, 'analyze-spec.md'), '# Custom Spec Prompt');

        const result = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.assets.prompts.skipped).toContain('analyze-spec.md');
        expect(report.assets.prompts.skipped).toHaveLength(1);
        expect(report.assets.prompts.copied).toHaveLength(12);

        // Custom content preserved
        expect(fs.readFileSync(path.join(promptsDest, 'analyze-spec.md'), 'utf-8')).toBe('# Custom Spec Prompt');
      });

      it('should skip existing workflow files and not overwrite them', async () => {
        const wfDest = path.join(projectRoot, '.wrangler', 'orchestration', 'workflows');
        fs.mkdirSync(wfDest, { recursive: true });
        fs.writeFileSync(path.join(wfDest, 'code-review.yaml'), 'name: custom-review');

        const result = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.assets.workflows.skipped).toContain('code-review.yaml');
        expect(report.assets.workflows.skipped).toHaveLength(1);
        expect(report.assets.workflows.copied).toHaveLength(1);
        expect(report.assets.workflows.copied).toContain('spec-implementation.yaml');

        // Custom content preserved
        expect(fs.readFileSync(path.join(wfDest, 'code-review.yaml'), 'utf-8')).toBe('name: custom-review');
      });

      it('should skip all files when all already exist', async () => {
        // First run copies everything
        await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        // Second run should skip all
        const result = await initWorkspaceTool(
          { fix: false, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.assets.agents.copied).toHaveLength(0);
        expect(report.assets.agents.skipped).toHaveLength(6);
        expect(report.assets.prompts.copied).toHaveLength(0);
        expect(report.assets.prompts.skipped).toHaveLength(13);
        expect(report.assets.workflows.copied).toHaveLength(0);
        expect(report.assets.workflows.skipped).toHaveLength(2);
      });
    });

    // ─── FR-013: Idempotent on Fresh and Existing Projects ───────────

    describe('FR-013: idempotent provisioning across runs', () => {
      it('should report status compliant when all assets already provisioned', async () => {
        // First run provisions everything
        await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        // Second report-only run
        const result = await initWorkspaceTool(
          { fix: false, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        expect(report.status).toBe('compliant');
      });

      it('should provision only missing assets on partially initialized project', async () => {
        // Pre-create half the agents
        const agentsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
        fs.mkdirSync(agentsDest, { recursive: true });
        fs.writeFileSync(path.join(agentsDest, 'analyzer.md'), '# Custom');
        fs.writeFileSync(path.join(agentsDest, 'fixer.md'), '# Custom');
        fs.writeFileSync(path.join(agentsDest, 'reviewer.md'), '# Custom');

        const result = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const report = result.metadata as InitWorkspaceResult;
        // 3 agents skipped, 3 agents copied
        expect(report.assets.agents.skipped).toHaveLength(3);
        expect(report.assets.agents.copied).toHaveLength(3);
        expect(report.assets.agents.copied).toContain('implementer.md');
        expect(report.assets.agents.copied).toContain('publisher.md');
        expect(report.assets.agents.copied).toContain('verifier.md');
      });

      it('should apply idempotently (second fix run changes nothing)', async () => {
        // First run
        const result1 = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );
        const report1 = result1.metadata as InitWorkspaceResult;
        expect(report1.status).toBe('initialized');

        // Second run - should be compliant
        const result2 = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );
        const report2 = result2.metadata as InitWorkspaceResult;
        expect(report2.status).toBe('compliant');
        expect(report2.assets.agents.copied).toHaveLength(0);
        expect(report2.assets.prompts.copied).toHaveLength(0);
        expect(report2.assets.workflows.copied).toHaveLength(0);
      });

      it('should include total asset count in text summary', async () => {
        const result = await initWorkspaceTool(
          { fix: true, projectRoot, pluginRoot: fullPluginRoot }
        );

        const text = result.content[0].text;
        // Total assets = 6 agents + 13 prompts + 2 workflows = 21
        expect(text).toContain('Assets provisioned: 21');
      });
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

// ═══════════════════════════════════════════════════════════════════════
// Integration Tests: E2E MCP Protocol & Tool Registration
// ═══════════════════════════════════════════════════════════════════════

import { WranglerMCPServer } from '../../../server';

describe('init_workspace Integration Tests', () => {

  // ─── Tool Registration in getAvailableTools() ──────────────────────

  describe('tool registration in getAvailableTools()', () => {
    let server: WranglerMCPServer;

    beforeEach(() => {
      server = new WranglerMCPServer();
    });

    afterEach(async () => {
      await server.stop();
    });

    it('should include init_workspace in the tools list', () => {
      const tools = server.getAvailableTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('init_workspace');
    });

    it('should have a non-empty description for init_workspace', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');

      expect(initTool).toBeDefined();
      expect(initTool!.description).toBeTruthy();
      expect(initTool!.description.length).toBeGreaterThan(20);
    });

    it('should have a valid JSON Schema for init_workspace input', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');

      expect(initTool).toBeDefined();
      expect(initTool!.inputSchema).toBeDefined();

      const schema = initTool!.inputSchema as Record<string, unknown>;
      expect(schema).toHaveProperty('type');
      expect(schema.type).toBe('object');
      expect(schema).toHaveProperty('properties');

      const properties = schema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('fix');
      expect(properties).toHaveProperty('projectRoot');
      expect(properties).toHaveProperty('pluginRoot');
    });

    it('should define fix property with boolean type and default false', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');
      const schema = initTool!.inputSchema as Record<string, unknown>;
      const properties = schema.properties as Record<string, Record<string, unknown>>;

      const fixProp = properties.fix;
      expect(fixProp).toBeDefined();
      expect(fixProp.type).toBe('boolean');
      expect(fixProp.default).toBe(false);
    });

    it('should define projectRoot as optional string', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');
      const schema = initTool!.inputSchema as Record<string, unknown>;
      const properties = schema.properties as Record<string, Record<string, unknown>>;

      const projectRootProp = properties.projectRoot;
      expect(projectRootProp).toBeDefined();
      expect(projectRootProp.type).toBe('string');
    });

    it('should define pluginRoot as optional string', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');
      const schema = initTool!.inputSchema as Record<string, unknown>;
      const properties = schema.properties as Record<string, Record<string, unknown>>;

      const pluginRootProp = properties.pluginRoot;
      expect(pluginRootProp).toBeDefined();
      expect(pluginRootProp.type).toBe('string');
    });

    it('should have description mentioning .wrangler/ directory', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');

      expect(initTool!.description).toContain('.wrangler/');
    });

    it('should have description mentioning report-only mode', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');

      expect(initTool!.description.toLowerCase()).toContain('report');
    });

    it('should have description mentioning idempotent behavior', () => {
      const tools = server.getAvailableTools();
      const initTool = tools.find(t => t.name === 'init_workspace');

      expect(initTool!.description.toLowerCase()).toContain('idempotent');
    });
  });

  // ─── E2E MCP Protocol Tests ────────────────────────────────────────

  describe('end-to-end MCP protocol tests', () => {
    let tmpDir: string;
    let projectRoot: string;
    let pluginRoot: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-e2e-test-'));
      projectRoot = path.join(tmpDir, 'project');
      pluginRoot = path.join(tmpDir, 'plugin');

      // Create plugin root with workspace-schema.json
      fs.mkdirSync(path.join(pluginRoot, '.wrangler', 'config'), { recursive: true });
      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify({
          version: '1.3.0',
          description: 'E2E test schema',
          workspace: { root: '.wrangler', description: 'E2E workspace' },
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
            specifications: {
              path: '.wrangler/specifications',
              description: 'Specifications',
              gitTracked: true,
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
            plans: {
              path: '.wrangler/plans',
              description: 'Plans',
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

      // Create plugin workflow assets
      const agentsDir = path.join(pluginRoot, 'workflows', 'agents');
      const promptsDir = path.join(pluginRoot, 'workflows', 'prompts');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.mkdirSync(promptsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, 'analyzer.md'), '# Analyzer Agent');
      fs.writeFileSync(path.join(promptsDir, 'analyze-spec.md'), '# Analyze Spec');
      fs.writeFileSync(
        path.join(pluginRoot, 'workflows', 'spec-implementation.yaml'),
        'name: spec-implementation'
      );

      // Create project root
      fs.mkdirSync(projectRoot, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should parse params through initWorkspaceSchema before tool execution', async () => {
      // Simulate MCP protocol: parse args through schema then call tool
      const rawArgs = { fix: true, projectRoot, pluginRoot };
      const parsedArgs = initWorkspaceSchema.parse(rawArgs);
      const result = await initWorkspaceTool(parsedArgs);

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });

    it('should parse empty args to defaults (fix: false)', async () => {
      const rawArgs = { projectRoot, pluginRoot };
      const parsedArgs = initWorkspaceSchema.parse(rawArgs);

      expect(parsedArgs.fix).toBe(false);

      const result = await initWorkspaceTool(parsedArgs);
      expect(result.isError).toBe(false);
      const report = result.metadata as InitWorkspaceResult;
      expect(report.status).toBe('changes_needed');
    });

    it('should reject invalid args during schema parsing', () => {
      // fix should be boolean, not string
      expect(() => {
        initWorkspaceSchema.parse({ fix: 'yes' });
      }).toThrow();
    });

    it('should return MCP-compliant response structure from full protocol flow', async () => {
      const parsedArgs = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });

      const result = await initWorkspaceTool(parsedArgs);

      // Verify MCP response shape
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
      expect(result).toHaveProperty('metadata');
      expect(result.isError).toBe(false);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should initialize full workspace through protocol flow and verify on disk', async () => {
      // Simulate exact MCP protocol: schema.parse -> tool call -> verify result
      const args = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });

      const result = await initWorkspaceTool(args);
      const report = result.metadata as InitWorkspaceResult;

      expect(report.status).toBe('initialized');

      // Verify all directories exist on disk
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues', 'archived'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'specifications'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'cache'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'config'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'plans'))).toBe(true);

      // Verify .gitkeep in tracked dirs only
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'issues', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'specifications', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'config', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'plans', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'cache', '.gitkeep'))).toBe(false);

      // Verify assets provisioned
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'orchestration', 'agents', 'analyzer.md'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'orchestration', 'prompts', 'analyze-spec.md'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'orchestration', 'workflows', 'spec-implementation.yaml'))).toBe(true);

      // Verify .gitignore created with patterns
      const gitignoreContent = fs.readFileSync(
        path.join(projectRoot, '.wrangler', '.gitignore'),
        'utf-8'
      );
      expect(gitignoreContent).toContain('cache/');
      expect(gitignoreContent).toContain('logs/');
      expect(gitignoreContent).toContain('sessions/');

      // Verify config files
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'config', 'workspace-schema.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'config', 'wrangler.json'))).toBe(true);
    });

    it('should return compliant status on second protocol call (idempotency)', async () => {
      const args = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });

      // First call: initialize
      const result1 = await initWorkspaceTool(args);
      expect((result1.metadata as InitWorkspaceResult).status).toBe('initialized');

      // Second call: should be compliant
      const result2 = await initWorkspaceTool(args);
      const report2 = result2.metadata as InitWorkspaceResult;
      expect(report2.status).toBe('compliant');
      expect(report2.directories.created).toEqual([]);
      expect(report2.assets.agents.copied).toEqual([]);
      expect(report2.assets.prompts.copied).toEqual([]);
      expect(report2.assets.workflows.copied).toEqual([]);
      expect(report2.gitignore.patternsAdded).toEqual([]);
    });

    it('should handle report-only mode through protocol without side effects', async () => {
      const args = initWorkspaceSchema.parse({
        fix: false,
        projectRoot,
        pluginRoot,
      });

      const result = await initWorkspaceTool(args);
      const report = result.metadata as InitWorkspaceResult;

      expect(report.status).toBe('changes_needed');
      expect(report.directories.created.length).toBeGreaterThan(0);

      // No directories should exist on disk
      expect(fs.existsSync(path.join(projectRoot, '.wrangler'))).toBe(false);
    });

    it('should produce correct metadata counts matching actual disk state', async () => {
      const args = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });

      const result = await initWorkspaceTool(args);
      const report = result.metadata as InitWorkspaceResult;

      // Every "created" directory must exist
      for (const dir of report.directories.created) {
        expect(fs.existsSync(path.join(projectRoot, dir))).toBe(true);
      }

      // Every "existing" directory must also exist
      for (const dir of report.directories.existing) {
        expect(fs.existsSync(path.join(projectRoot, dir))).toBe(true);
      }

      // Every copied agent must exist at destination
      for (const agent of report.assets.agents.copied) {
        expect(fs.existsSync(
          path.join(projectRoot, '.wrangler', 'orchestration', 'agents', agent)
        )).toBe(true);
      }

      // Every copied prompt must exist at destination
      for (const prompt of report.assets.prompts.copied) {
        expect(fs.existsSync(
          path.join(projectRoot, '.wrangler', 'orchestration', 'prompts', prompt)
        )).toBe(true);
      }

      // Every copied workflow must exist at destination
      for (const wf of report.assets.workflows.copied) {
        expect(fs.existsSync(
          path.join(projectRoot, '.wrangler', 'orchestration', 'workflows', wf)
        )).toBe(true);
      }
    });

    it('should handle transition from report-only to apply correctly', async () => {
      // First: report-only to see what would change
      const reportArgs = initWorkspaceSchema.parse({
        fix: false,
        projectRoot,
        pluginRoot,
      });
      const reportResult = await initWorkspaceTool(reportArgs);
      const reportData = reportResult.metadata as InitWorkspaceResult;

      expect(reportData.status).toBe('changes_needed');
      const expectedDirCount = reportData.directories.created.length;

      // Then: apply to actually create
      const applyArgs = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });
      const applyResult = await initWorkspaceTool(applyArgs);
      const applyData = applyResult.metadata as InitWorkspaceResult;

      expect(applyData.status).toBe('initialized');
      // Same number of directories should be created as reported
      expect(applyData.directories.created.length).toBe(expectedDirCount);
    });

    it('should preserve existing user files when applying workspace init', async () => {
      // Pre-create some user content
      fs.mkdirSync(path.join(projectRoot, '.wrangler', 'issues'), { recursive: true });
      fs.writeFileSync(
        path.join(projectRoot, '.wrangler', 'issues', 'ISS-000001-my-issue.md'),
        '---\ntitle: My Issue\n---\n\nUser content'
      );

      const args = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });

      const result = await initWorkspaceTool(args);
      expect(result.isError).toBe(false);

      // Verify user file is still intact
      const content = fs.readFileSync(
        path.join(projectRoot, '.wrangler', 'issues', 'ISS-000001-my-issue.md'),
        'utf-8'
      );
      expect(content).toContain('User content');
    });

    it('should handle schema version upgrade through protocol flow', async () => {
      // First: initialize with v1.3.0 schema
      const args1 = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });
      await initWorkspaceTool(args1);

      // Verify schema version on disk
      const schemaPath = path.join(projectRoot, '.wrangler', 'config', 'workspace-schema.json');
      const schema1 = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      expect(schema1.version).toBe('1.3.0');

      // Update plugin schema to v1.4.0
      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify({
          version: '1.4.0',
          description: 'Updated schema',
          workspace: { root: '.wrangler', description: 'Updated workspace' },
          directories: {
            issues: { path: '.wrangler/issues', description: 'Issues', gitTracked: true },
            specifications: { path: '.wrangler/specifications', description: 'Specs', gitTracked: true },
            cache: { path: '.wrangler/cache', description: 'Cache', gitTracked: false },
            config: { path: '.wrangler/config', description: 'Config', gitTracked: true },
            plans: { path: '.wrangler/plans', description: 'Plans', gitTracked: true },
            memos: { path: '.wrangler/memos', description: 'Memos', gitTracked: true },
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

      // Second: re-init with updated schema
      const args2 = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });
      const result2 = await initWorkspaceTool(args2);
      const report2 = result2.metadata as InitWorkspaceResult;

      // Schema should be updated
      expect(report2.config.schemaUpdated).toBe(true);

      // New directory should be created
      expect(report2.directories.created).toContain('.wrangler/memos');
      expect(fs.existsSync(path.join(projectRoot, '.wrangler', 'memos'))).toBe(true);

      // Verify schema version on disk updated
      const schema2 = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      expect(schema2.version).toBe('1.4.0');
    });

    it('should produce text output suitable for MCP client display', async () => {
      const args = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });

      const result = await initWorkspaceTool(args);

      // Text should be informative for an AI client
      const text = result.content[0].text;
      expect(text).toBeTruthy();
      expect(typeof text).toBe('string');
      expect(text.toLowerCase()).toContain('workspace');
      // Should mention directories or assets
      expect(text).toMatch(/[Dd]irectories|[Aa]ssets/);
    });
  });

  // ─── Cross-Tool Integration ────────────────────────────────────────

  describe('cross-tool integration with issue management', () => {
    let tmpDir: string;
    let projectRoot: string;
    let pluginRoot: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrangler-cross-test-'));
      projectRoot = path.join(tmpDir, 'project');
      pluginRoot = path.join(tmpDir, 'plugin');

      // Create plugin root with schema
      fs.mkdirSync(path.join(pluginRoot, '.wrangler', 'config'), { recursive: true });
      fs.writeFileSync(
        path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json'),
        JSON.stringify({
          version: '1.3.0',
          description: 'Cross-tool test schema',
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
            specifications: {
              path: '.wrangler/specifications',
              description: 'Specifications',
              gitTracked: true,
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

      // Create project root
      fs.mkdirSync(projectRoot, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should create a workspace that is usable by issue management tools', async () => {
      // Step 1: Initialize workspace
      const initArgs = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });
      const initResult = await initWorkspaceTool(initArgs);
      expect(initResult.isError).toBe(false);
      expect((initResult.metadata as InitWorkspaceResult).status).toBe('initialized');

      // Step 2: Verify the issues directory is ready for the MarkdownIssueProvider
      const issuesDir = path.join(projectRoot, '.wrangler', 'issues');
      expect(fs.existsSync(issuesDir)).toBe(true);

      // Step 3: Verify the specifications directory is ready
      const specsDir = path.join(projectRoot, '.wrangler', 'specifications');
      expect(fs.existsSync(specsDir)).toBe(true);

      // Step 4: Verify config directory has wrangler.json
      const wranglerConfig = JSON.parse(
        fs.readFileSync(
          path.join(projectRoot, '.wrangler', 'config', 'wrangler.json'),
          'utf-8'
        )
      );
      expect(wranglerConfig.workspace.directories.issues).toBe('.wrangler/issues');
      expect(wranglerConfig.workspace.directories.specifications).toBe('.wrangler/specifications');
    });

    it('should produce workspace-schema.json that matches the directory structure created', async () => {
      // Initialize workspace
      const args = initWorkspaceSchema.parse({
        fix: true,
        projectRoot,
        pluginRoot,
      });
      const result = await initWorkspaceTool(args);
      const report = result.metadata as InitWorkspaceResult;

      // Read back the copied schema
      const schemaPath = path.join(projectRoot, '.wrangler', 'config', 'workspace-schema.json');
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

      // Every directory in the schema should exist on disk
      for (const dir of Object.values(schema.directories) as Array<{ path: string }>) {
        expect(fs.existsSync(path.join(projectRoot, dir.path))).toBe(true);
      }
    });
  });
});
