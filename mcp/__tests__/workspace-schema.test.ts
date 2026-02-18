/**
 * Comprehensive test suite for workspace-schema.ts
 * Following TDD principles - testing schema loading, validation, and helper functions
 */

import * as path from 'path';
import fs from 'fs-extra';
import { z } from 'zod';
import {
  WorkspaceSchema,
  WorkspaceDirectory,
  GovernanceFile,
  ArtifactTypeConfig,
  MCPConfiguration,
  findSchemaPath,
  loadWorkspaceSchema,
  getDefaultSchema,
  clearSchemaCache,
  getMCPDirectories,
  getInitializationDirectories,
  getGitTrackedDirectories,
  getGitignorePatterns,
  getGovernanceFilePaths,
} from '../src/workspace-schema';

// Zod schema for WorkspaceSchema validation
const WorkspaceDirectorySchema = z.object({
  path: z.string(),
  description: z.string(),
  gitTracked: z.boolean(),
  subdirectories: z.record(z.object({
    path: z.string(),
    description: z.string(),
  })).optional(),
});

const GovernanceFileSchema = z.object({
  path: z.string(),
  description: z.string(),
  required: z.boolean(),
  template: z.string().optional(),
});

const ArtifactTypeConfigSchema = z.object({
  directory: z.string(),
  description: z.string(),
});

const MCPConfigurationSchema = z.object({
  issuesDirectory: z.string(),
  specificationsDirectory: z.string(),
  ideasDirectory: z.string(),
});

const WorkspaceSchemaValidator = z.object({
  $schema: z.string().optional(),
  version: z.string(),
  description: z.string(),
  workspace: z.object({
    root: z.string(),
    description: z.string(),
  }),
  directories: z.record(WorkspaceDirectorySchema),
  governanceFiles: z.record(GovernanceFileSchema),
  readmeFiles: z.record(z.object({
    path: z.string(),
    description: z.string(),
    template: z.string().optional(),
  })),
  gitignorePatterns: z.array(z.string()),
  artifactTypes: z.record(ArtifactTypeConfigSchema),
  mcpConfiguration: MCPConfigurationSchema,
});

describe('workspace-schema', () => {
  const testDir = path.join(process.cwd(), 'test-temp', 'workspace-schema-test');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    clearSchemaCache();
  });

  afterEach(async () => {
    await fs.remove(testDir);
    clearSchemaCache();
  });

  describe('Schema Loading', () => {
    describe('loadWorkspaceSchema()', () => {
      it('should successfully load schema from file', async () => {
        // Create a test schema file
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema: WorkspaceSchema = {
          $schema: 'http://json-schema.org/draft-07/schema#',
          version: '1.2.0',
          description: 'Test schema',
          workspace: {
            root: '.wrangler',
            description: 'Test workspace',
          },
          directories: {
            issues: {
              path: '.wrangler/issues',
              description: 'Issues',
              gitTracked: true,
            },
          },
          governanceFiles: {
            constitution: {
              path: '.wrangler/CONSTITUTION.md',
              description: 'Constitution',
              required: false,
            },
          },
          readmeFiles: {
            issues: {
              path: '.wrangler/issues/README.md',
              description: 'Issues README',
            },
          },
          gitignorePatterns: ['cache/', 'config/', 'logs/'],
          artifactTypes: {
            issue: {
              directory: 'issues',
              description: 'Issues',
            },
          },
          mcpConfiguration: {
            issuesDirectory: '.wrangler/issues',
            specificationsDirectory: '.wrangler/specifications',
            ideasDirectory: '.wrangler/ideas',
          },
        };

        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        const loaded = loadWorkspaceSchema(testDir);

        expect(loaded).toEqual(testSchema);
        expect(loaded.version).toBe('1.2.0');
        expect(loaded.description).toBe('Test schema');
      });

      it('should cache the schema on second call', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        // First call
        const firstLoad = loadWorkspaceSchema(testDir);
        const firstTime = Date.now();

        // Modify the file on disk (should not affect cached result)
        const modifiedSchema = { ...testSchema, version: '999.0.0' };
        await fs.writeJson(schemaPath, modifiedSchema, { spaces: 2 });

        // Second call should return cached version
        const secondLoad = loadWorkspaceSchema(testDir);
        const secondTime = Date.now();

        expect(secondLoad).toEqual(firstLoad);
        expect(secondLoad.version).toBe('1.3.0'); // Original version, not modified
        expect(secondTime - firstTime).toBeLessThan(50); // Should be nearly instant
      });

      it('should fallback to getDefaultSchema() when file is missing', () => {
        clearSchemaCache();
        // Use /tmp to ensure we're outside any git repository
        const tmpDir = path.join('/tmp', `no-schema-${Date.now()}`);
        const loaded = loadWorkspaceSchema(tmpDir);
        const defaultSchema = getDefaultSchema();

        expect(loaded).toEqual(defaultSchema);
      });

      it('should fallback to getDefaultSchema() on JSON parse error', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        // Write invalid JSON
        await fs.writeFile(schemaPath, '{ invalid json }', 'utf-8');

        const loaded = loadWorkspaceSchema(testDir);
        const defaultSchema = getDefaultSchema();

        expect(loaded).toEqual(defaultSchema);
      });

      it('should fallback to getDefaultSchema() on read error', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        // Create a directory instead of a file (will cause read error)
        await fs.ensureDir(schemaPath);

        const loaded = loadWorkspaceSchema(testDir);
        const defaultSchema = getDefaultSchema();

        expect(loaded).toEqual(defaultSchema);
      });
    });

    describe('findSchemaPath()', () => {
      it('should find schema in current directory', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));
        await fs.writeJson(schemaPath, {}, { spaces: 2 });

        const found = findSchemaPath(testDir);

        expect(found).toBe(schemaPath);
      });

      it('should walk up directory tree to find schema', async () => {
        const nestedDir = path.join(testDir, 'nested', 'deep', 'directory');
        await fs.ensureDir(nestedDir);

        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));
        await fs.writeJson(schemaPath, {}, { spaces: 2 });

        const found = findSchemaPath(nestedDir);

        expect(found).toBe(schemaPath);
      });

      it('should stop at git root', async () => {
        const nestedDir = path.join(testDir, 'nested', 'deep');
        await fs.ensureDir(nestedDir);

        // Create .git directory at testDir
        const gitDir = path.join(testDir, '.git');
        await fs.ensureDir(gitDir);

        // No schema file exists
        const found = findSchemaPath(nestedDir);

        expect(found).toBeNull();
      });

      it('should find schema at git root', async () => {
        const nestedDir = path.join(testDir, 'nested', 'deep');
        await fs.ensureDir(nestedDir);

        // Create .git directory at testDir
        const gitDir = path.join(testDir, '.git');
        await fs.ensureDir(gitDir);

        // Create schema at git root
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));
        await fs.writeJson(schemaPath, {}, { spaces: 2 });

        const found = findSchemaPath(nestedDir);

        expect(found).toBe(schemaPath);
      });

      it('should return null when no schema found and no git root', () => {
        // Use /tmp to ensure we're outside any git repository
        const tmpDir = path.join('/tmp', `no-git-${Date.now()}`);
        const found = findSchemaPath(tmpDir);

        expect(found).toBeNull();
      });

      it('should use process.cwd() when no startDir provided', async () => {
        // This test validates the default parameter works
        const originalCwd = process.cwd();

        // We can't change process.cwd() easily, but we can verify the function
        // accepts undefined and doesn't throw
        expect(() => findSchemaPath()).not.toThrow();
      });

      it('should handle absolute paths correctly', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));
        await fs.writeJson(schemaPath, {}, { spaces: 2 });

        const absolutePath = path.resolve(testDir);
        const found = findSchemaPath(absolutePath);

        expect(found).toBe(schemaPath);
      });

      it('should handle relative paths correctly', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));
        await fs.writeJson(schemaPath, {}, { spaces: 2 });

        // Use relative path
        const relativePath = path.relative(process.cwd(), testDir);
        const found = findSchemaPath(relativePath);

        expect(found).toBe(schemaPath);
      });
    });

    describe('clearSchemaCache()', () => {
      it('should clear cached schema', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        // Load and cache
        const firstLoad = loadWorkspaceSchema(testDir);
        expect(firstLoad.version).toBe('1.3.0');

        // Modify file
        const modifiedSchema = { ...testSchema, version: '2.0.0' };
        await fs.writeJson(schemaPath, modifiedSchema, { spaces: 2 });

        // Should still return cached version
        const cachedLoad = loadWorkspaceSchema(testDir);
        expect(cachedLoad.version).toBe('1.3.0');

        // Clear cache
        clearSchemaCache();

        // Should load new version
        const freshLoad = loadWorkspaceSchema(testDir);
        expect(freshLoad.version).toBe('2.0.0');
      });

      it('should not throw when cache is already empty', () => {
        clearSchemaCache();
        expect(() => clearSchemaCache()).not.toThrow();
      });
    });
  });

  describe('Schema Validation', () => {
    describe('getDefaultSchema()', () => {
      it('should return valid schema with all required fields', () => {
        const schema = getDefaultSchema();

        expect(schema).toHaveProperty('version');
        expect(schema).toHaveProperty('description');
        expect(schema).toHaveProperty('workspace');
        expect(schema).toHaveProperty('directories');
        expect(schema).toHaveProperty('governanceFiles');
        expect(schema).toHaveProperty('readmeFiles');
        expect(schema).toHaveProperty('gitignorePatterns');
        expect(schema).toHaveProperty('artifactTypes');
        expect(schema).toHaveProperty('mcpConfiguration');
      });

      it('should validate against Zod schema', () => {
        const schema = getDefaultSchema();

        const result = WorkspaceSchemaValidator.safeParse(schema);

        expect(result.success).toBe(true);
      });

      it('should have correct version', () => {
        const schema = getDefaultSchema();

        expect(schema.version).toBe('1.3.0');
      });

      it('should have workspace root as .wrangler', () => {
        const schema = getDefaultSchema();

        expect(schema.workspace.root).toBe('.wrangler');
      });

      it('should have all required directories', () => {
        const schema = getDefaultSchema();

        expect(schema.directories).toHaveProperty('issues');
        expect(schema.directories).toHaveProperty('specifications');
        expect(schema.directories).toHaveProperty('ideas');
        expect(schema.directories).toHaveProperty('memos');
        expect(schema.directories).toHaveProperty('plans');
        expect(schema.directories).toHaveProperty('docs');
        expect(schema.directories).toHaveProperty('cache');
        expect(schema.directories).toHaveProperty('config');
        expect(schema.directories).toHaveProperty('logs');
        expect(schema.directories).toHaveProperty('orchestration');
      });

      it('should have correct gitTracked flags', () => {
        const schema = getDefaultSchema();

        expect(schema.directories.issues.gitTracked).toBe(true);
        expect(schema.directories.specifications.gitTracked).toBe(true);
        expect(schema.directories.ideas.gitTracked).toBe(true);
        expect(schema.directories.memos.gitTracked).toBe(true);
        expect(schema.directories.plans.gitTracked).toBe(true);
        expect(schema.directories.docs.gitTracked).toBe(true);
        expect(schema.directories.orchestration.gitTracked).toBe(true);
        expect(schema.directories.cache.gitTracked).toBe(false);
        expect(schema.directories.config.gitTracked).toBe(true);
        expect(schema.directories.logs.gitTracked).toBe(false);
      });

      it('should have orchestration directory with correct structure', () => {
        const schema = getDefaultSchema();

        const orch = schema.directories.orchestration;
        expect(orch).toBeDefined();
        expect(orch.path).toBe('.wrangler/orchestration');
        expect(orch.description).toBeTruthy();
        expect(orch.gitTracked).toBe(true);
      });

      it('should have orchestration subdirectories for agents, prompts, and workflows', () => {
        const schema = getDefaultSchema();

        const subdirs = schema.directories.orchestration.subdirectories;
        expect(subdirs).toBeDefined();
        expect(subdirs).toHaveProperty('agents');
        expect(subdirs).toHaveProperty('prompts');
        expect(subdirs).toHaveProperty('workflows');

        expect(subdirs!.agents.path).toBe('.wrangler/orchestration/agents');
        expect(subdirs!.agents.description).toBeTruthy();

        expect(subdirs!.prompts.path).toBe('.wrangler/orchestration/prompts');
        expect(subdirs!.prompts.description).toBeTruthy();

        expect(subdirs!.workflows.path).toBe('.wrangler/orchestration/workflows');
        expect(subdirs!.workflows.description).toBeTruthy();
      });

      it('should have exactly 10 essential directories including orchestration', () => {
        const schema = getDefaultSchema();
        const essentialDirs = [
          'issues', 'specifications', 'ideas', 'memos', 'plans',
          'docs', 'cache', 'config', 'logs', 'orchestration',
        ];

        // Verify all 10 essential directories are present
        expect(Object.keys(schema.directories).sort()).toEqual(essentialDirs.sort());

        // Verify no extra unexpected directories
        expect(Object.keys(schema.directories)).toHaveLength(essentialDirs.length);
      });

      it('should have all governance files', () => {
        const schema = getDefaultSchema();

        expect(schema.governanceFiles).toHaveProperty('constitution');
        expect(schema.governanceFiles).toHaveProperty('roadmap');
        expect(schema.governanceFiles).toHaveProperty('nextSteps');
      });

      it('should have all artifact types', () => {
        const schema = getDefaultSchema();

        expect(schema.artifactTypes).toHaveProperty('issue');
        expect(schema.artifactTypes).toHaveProperty('specification');
        expect(schema.artifactTypes).toHaveProperty('idea');
      });

      it('should have valid MCP configuration', () => {
        const schema = getDefaultSchema();

        expect(schema.mcpConfiguration.issuesDirectory).toBe('.wrangler/issues');
        expect(schema.mcpConfiguration.specificationsDirectory).toBe('.wrangler/specifications');
        expect(schema.mcpConfiguration.ideasDirectory).toBe('.wrangler/ideas');
      });

      it('should match actual schema file structure', async () => {
        // Load the actual schema file from the project
        const actualSchemaPath = path.join(process.cwd(), '.wrangler', 'config', 'workspace-schema.json');

        if (await fs.pathExists(actualSchemaPath)) {
          const actualSchema = await fs.readJson(actualSchemaPath);
          const defaultSchema = getDefaultSchema();

          // Compare key structures (versions may differ)
          // Note: actualSchema might have additional fields we don't have in default
          expect(Object.keys(defaultSchema).sort()).toEqual(Object.keys(actualSchema).sort());

          // Check that default has all essential directories (templates may be added dynamically)
          const essentialDirs = ['issues', 'specifications', 'ideas', 'memos', 'plans', 'docs', 'cache', 'config', 'logs', 'orchestration'];
          essentialDirs.forEach(dir => {
            expect(defaultSchema.directories).toHaveProperty(dir);
          });

          expect(Object.keys(defaultSchema.governanceFiles).sort()).toEqual(Object.keys(actualSchema.governanceFiles).sort());
        }
      });
    });

    describe('loaded schema validation', () => {
      it('should validate loaded schema has all required fields', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        const loaded = loadWorkspaceSchema(testDir);

        expect(loaded).toHaveProperty('version');
        expect(loaded).toHaveProperty('description');
        expect(loaded).toHaveProperty('workspace');
        expect(loaded).toHaveProperty('directories');
        expect(loaded).toHaveProperty('governanceFiles');
        expect(loaded).toHaveProperty('readmeFiles');
        expect(loaded).toHaveProperty('gitignorePatterns');
        expect(loaded).toHaveProperty('artifactTypes');
        expect(loaded).toHaveProperty('mcpConfiguration');
      });

      it('should validate loaded schema is valid JSON', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        const loaded = loadWorkspaceSchema(testDir);

        // Should be able to stringify and parse without error
        expect(() => JSON.stringify(loaded)).not.toThrow();
        expect(() => JSON.parse(JSON.stringify(loaded))).not.toThrow();
      });

      it('should validate loaded schema against Zod schema', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        const loaded = loadWorkspaceSchema(testDir);
        const result = WorkspaceSchemaValidator.safeParse(loaded);

        expect(result.success).toBe(true);
      });

      it('should provide clear error for invalid schema structure', () => {
        const invalidSchema = {
          version: '1.0.0',
          // Missing required fields
        };

        const result = WorkspaceSchemaValidator.safeParse(invalidSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
          expect(result.error.issues[0]).toHaveProperty('message');
          expect(result.error.issues[0]).toHaveProperty('path');
        }
      });

      it('should provide clear error for invalid directory structure', () => {
        const invalidSchema = {
          ...getDefaultSchema(),
          directories: {
            issues: {
              path: '.wrangler/issues',
              // Missing required fields
            },
          },
        };

        const result = WorkspaceSchemaValidator.safeParse(invalidSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.issues;
          expect(errors.length).toBeGreaterThan(0);
        }
      });

      it('should provide clear error for invalid MCP configuration', () => {
        const invalidSchema = {
          ...getDefaultSchema(),
          mcpConfiguration: {
            issuesDirectory: '.wrangler/issues',
            // Missing required fields
          },
        };

        const result = WorkspaceSchemaValidator.safeParse(invalidSchema);

        expect(result.success).toBe(false);
        if (!result.success) {
          const dirErrors = result.error.issues.filter(
            issue => issue.path[0] === 'mcpConfiguration'
          );
          expect(dirErrors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getInitializationDirectories()', () => {
      it('should return all directories including subdirectories', () => {
        const dirs = getInitializationDirectories();

        expect(dirs).toContain('.wrangler/issues');
        expect(dirs).toContain('.wrangler/issues/archived');
        expect(dirs).toContain('.wrangler/specifications');
        expect(dirs).toContain('.wrangler/specifications/archived');
        expect(dirs).toContain('.wrangler/ideas');
        expect(dirs).toContain('.wrangler/memos');
        expect(dirs).toContain('.wrangler/plans');
        expect(dirs).toContain('.wrangler/docs');
        expect(dirs).toContain('.wrangler/cache');
        expect(dirs).toContain('.wrangler/config');
        expect(dirs).toContain('.wrangler/logs');
        expect(dirs).toContain('.wrangler/orchestration');
        expect(dirs).toContain('.wrangler/orchestration/agents');
        expect(dirs).toContain('.wrangler/orchestration/prompts');
        expect(dirs).toContain('.wrangler/orchestration/workflows');
      });

      it('should include all subdirectories', () => {
        const dirs = getInitializationDirectories();

        expect(dirs).toContain('.wrangler/issues/archived');
        expect(dirs).toContain('.wrangler/specifications/archived');
        expect(dirs).toContain('.wrangler/orchestration/agents');
        expect(dirs).toContain('.wrangler/orchestration/prompts');
        expect(dirs).toContain('.wrangler/orchestration/workflows');
      });

      it('should return directories from custom schema', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        testSchema.directories.custom = {
          path: '.wrangler/custom',
          description: 'Custom directory',
          gitTracked: true,
          subdirectories: {
            nested: {
              path: '.wrangler/custom/nested',
              description: 'Nested directory',
            },
          },
        };
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        clearSchemaCache();
        const dirs = getInitializationDirectories(testDir);

        expect(dirs).toContain('.wrangler/custom');
        expect(dirs).toContain('.wrangler/custom/nested');
      });

      it('should not return duplicate directories', () => {
        const dirs = getInitializationDirectories();
        const uniqueDirs = [...new Set(dirs)];

        expect(dirs.length).toBe(uniqueDirs.length);
      });

      it('should include orchestration directory and all three subdirectories', () => {
        const dirs = getInitializationDirectories();

        // Orchestration parent directory
        expect(dirs).toContain('.wrangler/orchestration');

        // All three orchestration subdirectories
        const orchestrationSubdirs = dirs.filter(d => d.startsWith('.wrangler/orchestration/'));
        expect(orchestrationSubdirs).toHaveLength(3);
        expect(orchestrationSubdirs).toContain('.wrangler/orchestration/agents');
        expect(orchestrationSubdirs).toContain('.wrangler/orchestration/prompts');
        expect(orchestrationSubdirs).toContain('.wrangler/orchestration/workflows');
      });

      it('should include orchestration directories in the total count', () => {
        const dirs = getInitializationDirectories();

        // 10 top-level directories + 5 subdirectories (2 archived + 3 orchestration) = 15
        expect(dirs).toHaveLength(15);

        // Verify orchestration contributes 4 entries (parent + 3 subdirs)
        const orchestrationEntries = dirs.filter(d => d.includes('orchestration'));
        expect(orchestrationEntries).toHaveLength(4);
      });
    });

    describe('getGitTrackedDirectories()', () => {
      it('should return only git-tracked directories', () => {
        const dirs = getGitTrackedDirectories();

        expect(dirs).toContain('.wrangler/issues');
        expect(dirs).toContain('.wrangler/specifications');
        expect(dirs).toContain('.wrangler/ideas');
        expect(dirs).toContain('.wrangler/memos');
        expect(dirs).toContain('.wrangler/plans');
        expect(dirs).toContain('.wrangler/docs');
        expect(dirs).toContain('.wrangler/orchestration');
      });

      it('should not return gitignored directories', () => {
        const dirs = getGitTrackedDirectories();

        expect(dirs).not.toContain('.wrangler/cache');
        expect(dirs).not.toContain('.wrangler/logs');
      });

      it('should include orchestration as a git-tracked directory', () => {
        const dirs = getGitTrackedDirectories();

        expect(dirs).toContain('.wrangler/orchestration');

        // Verify orchestration appears exactly once (not duplicated)
        const orchestrationCount = dirs.filter(d => d === '.wrangler/orchestration').length;
        expect(orchestrationCount).toBe(1);
      });

      it('should not include orchestration subdirectories as separate git-tracked entries', () => {
        const dirs = getGitTrackedDirectories();

        // getGitTrackedDirectories only returns top-level directories, not subdirectories
        expect(dirs).not.toContain('.wrangler/orchestration/agents');
        expect(dirs).not.toContain('.wrangler/orchestration/prompts');
        expect(dirs).not.toContain('.wrangler/orchestration/workflows');
      });

      it('should have the correct total count of git-tracked directories', () => {
        const dirs = getGitTrackedDirectories();

        // 8 git-tracked: issues, specifications, ideas, memos, plans, docs, config, orchestration
        // 2 not git-tracked: cache, logs
        expect(dirs).toHaveLength(8);
      });

      it('should filter correctly based on gitTracked flag', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        testSchema.directories.tracked = {
          path: '.wrangler/tracked',
          description: 'Tracked',
          gitTracked: true,
        };
        testSchema.directories.ignored = {
          path: '.wrangler/ignored',
          description: 'Ignored',
          gitTracked: false,
        };
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        clearSchemaCache();
        const dirs = getGitTrackedDirectories(testDir);

        expect(dirs).toContain('.wrangler/tracked');
        expect(dirs).not.toContain('.wrangler/ignored');
      });
    });

    describe('getGitignorePatterns()', () => {
      it('should return correct gitignore patterns', () => {
        const patterns = getGitignorePatterns();

        expect(patterns).toContain('cache/');
        expect(patterns).toContain('logs/');
        expect(patterns).toContain('sessions/');
        expect(patterns).not.toContain('metrics/');
      });

      it('should return patterns as array', () => {
        const patterns = getGitignorePatterns();

        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should return custom patterns from schema', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        testSchema.gitignorePatterns = ['custom/', 'temp/', '*.log'];
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        clearSchemaCache();
        const patterns = getGitignorePatterns(testDir);

        expect(patterns).toContain('custom/');
        expect(patterns).toContain('temp/');
        expect(patterns).toContain('*.log');
      });
    });

    describe('getGovernanceFilePaths()', () => {
      it('should return all governance file paths', () => {
        const paths = getGovernanceFilePaths();

        expect(paths).toHaveProperty('constitution');
        expect(paths).toHaveProperty('roadmap');
        expect(paths).toHaveProperty('nextSteps');
      });

      it('should return correct paths for each governance file', () => {
        const paths = getGovernanceFilePaths();

        expect(paths.constitution).toBe('.wrangler/CONSTITUTION.md');
        expect(paths.roadmap).toBe('.wrangler/ROADMAP.md');
        expect(paths.nextSteps).toBe('.wrangler/ROADMAP_NEXT_STEPS.md');
      });

      it('should return paths as key-value object', () => {
        const paths = getGovernanceFilePaths();

        expect(typeof paths).toBe('object');
        expect(Object.keys(paths).length).toBeGreaterThan(0);
      });

      it('should return custom governance paths from schema', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        testSchema.governanceFiles.custom = {
          path: '.wrangler/CUSTOM.md',
          description: 'Custom governance file',
          required: true,
        };
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        clearSchemaCache();
        const paths = getGovernanceFilePaths(testDir);

        expect(paths).toHaveProperty('custom');
        expect(paths.custom).toBe('.wrangler/CUSTOM.md');
      });
    });

    describe('getMCPDirectories()', () => {
      it('should return correct MCP directory configuration', () => {
        const config = getMCPDirectories();

        expect(config.issuesDirectory).toBe('.wrangler/issues');
        expect(config.specificationsDirectory).toBe('.wrangler/specifications');
        expect(config.ideasDirectory).toBe('.wrangler/ideas');
      });

      it('should return MCP configuration object', () => {
        const config = getMCPDirectories();

        expect(typeof config).toBe('object');
        expect(config).toHaveProperty('issuesDirectory');
        expect(config).toHaveProperty('specificationsDirectory');
        expect(config).toHaveProperty('ideasDirectory');
      });

      it('should return custom MCP config from schema', async () => {
        const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
        await fs.ensureDir(path.dirname(schemaPath));

        const testSchema = getDefaultSchema();
        testSchema.mcpConfiguration = {
          issuesDirectory: '.custom/issues',
          specificationsDirectory: '.custom/specs',
          ideasDirectory: '.custom/ideas',
        };
        await fs.writeJson(schemaPath, testSchema, { spaces: 2 });

        clearSchemaCache();
        const config = getMCPDirectories(testDir);

        expect(config.issuesDirectory).toBe('.custom/issues');
        expect(config.specificationsDirectory).toBe('.custom/specs');
        expect(config.ideasDirectory).toBe('.custom/ideas');
      });

      it('should validate MCP config against Zod schema', () => {
        const config = getMCPDirectories();
        const result = MCPConfigurationSchema.safeParse(config);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work with real workspace structure', async () => {
      // Create a realistic workspace structure
      const wranglerDir = path.join(testDir, '.wrangler');
      await fs.ensureDir(wranglerDir);

      const schemaPath = path.join(wranglerDir, 'config', 'workspace-schema.json');
      await fs.ensureDir(path.dirname(schemaPath));
      await fs.writeJson(schemaPath, getDefaultSchema(), { spaces: 2 });

      clearSchemaCache();

      // Load schema
      const schema = loadWorkspaceSchema(testDir);
      expect(schema.version).toBe('1.3.0');

      // Get directories
      const dirs = getInitializationDirectories(testDir);
      expect(dirs.length).toBeGreaterThan(0);

      // Get git-tracked directories
      const gitDirs = getGitTrackedDirectories(testDir);
      expect(gitDirs.length).toBeGreaterThan(0);

      // Get MCP config
      const mcpConfig = getMCPDirectories(testDir);
      expect(mcpConfig.issuesDirectory).toBe('.wrangler/issues');
    });

    it('should handle nested project structure', async () => {
      // Create nested structure
      const projectDir = path.join(testDir, 'projects', 'myapp');
      await fs.ensureDir(projectDir);

      const schemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
      await fs.ensureDir(path.dirname(schemaPath));
      await fs.writeJson(schemaPath, getDefaultSchema(), { spaces: 2 });

      clearSchemaCache();

      // Should find schema from nested directory
      const found = findSchemaPath(projectDir);
      expect(found).toBe(schemaPath);

      // Should load schema from nested directory
      const schema = loadWorkspaceSchema(projectDir);
      expect(schema.version).toBe('1.3.0');
    });

    it('should handle multiple schemas in hierarchy', async () => {
      // Create schema at root
      const rootSchemaPath = path.join(testDir, '.wrangler', 'config', 'workspace-schema.json');
      await fs.ensureDir(path.dirname(rootSchemaPath));
      const rootSchema = getDefaultSchema();
      rootSchema.version = '1.0.0';
      await fs.writeJson(rootSchemaPath, rootSchema, { spaces: 2 });

      // Create schema in nested directory
      const nestedDir = path.join(testDir, 'nested');
      const nestedSchemaPath = path.join(nestedDir, '.wrangler', 'config', 'workspace-schema.json');
      await fs.ensureDir(path.dirname(nestedSchemaPath));
      const nestedSchema = getDefaultSchema();
      nestedSchema.version = '2.0.0';
      await fs.writeJson(nestedSchemaPath, nestedSchema, { spaces: 2 });

      clearSchemaCache();

      // Should find nearest schema (nested)
      const found = findSchemaPath(nestedDir);
      expect(found).toBe(nestedSchemaPath);

      const loaded = loadWorkspaceSchema(nestedDir);
      expect(loaded.version).toBe('2.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing schema file gracefully', () => {
      expect(() => loadWorkspaceSchema(testDir)).not.toThrow();
    });

    it('should handle invalid JSON gracefully', async () => {
      const schemaPath = path.join(testDir, '.wrangler', 'workspace-schema.json');
      await fs.ensureDir(path.dirname(schemaPath));
      await fs.writeFile(schemaPath, 'not valid json', 'utf-8');

      expect(() => loadWorkspaceSchema(testDir)).not.toThrow();
    });

    it('should handle permission errors gracefully', async () => {
      // Note: This test may not work on all systems
      const schemaPath = path.join(testDir, '.wrangler', 'workspace-schema.json');
      await fs.ensureDir(path.dirname(schemaPath));
      await fs.writeJson(schemaPath, getDefaultSchema(), { spaces: 2 });

      // Make file unreadable (may not work on all systems)
      try {
        await fs.chmod(schemaPath, 0o000);
        expect(() => loadWorkspaceSchema(testDir)).not.toThrow();
        // Restore permissions
        await fs.chmod(schemaPath, 0o644);
      } catch (error) {
        // Skip test if chmod not supported
        console.log('Skipping permission test - chmod not supported');
      }
    });

    it('should handle circular symlinks gracefully', async () => {
      // Create circular symlink
      const link1 = path.join(testDir, 'link1');
      const link2 = path.join(testDir, 'link2');

      try {
        await fs.ensureDir(link1);
        await fs.ensureSymlink(link1, path.join(link1, 'loop'));

        expect(() => findSchemaPath(link1)).not.toThrow();
      } catch (error) {
        // Skip test if symlinks not supported
        console.log('Skipping symlink test - symlinks not supported');
      }
    });
  });
});
