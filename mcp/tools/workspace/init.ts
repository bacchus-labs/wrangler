/**
 * init_workspace MCP tool
 *
 * Idempotent workspace initialization that creates the .wrangler/ directory
 * structure, provisions builtin assets, and manages configuration files.
 *
 * Reads directory structure from workspace-schema.json in the plugin directory
 * (FR-001), supports report-only mode (FR-009) and apply mode (FR-010),
 * works on both fresh and existing projects (FR-013).
 */

import * as path from 'path';
import * as fs from 'fs';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  MCPErrorCode,
  MCPSuccessResponse,
} from '../../types/errors.js';
import { getDefaultSchema, WorkspaceSchema } from '../../workspace-schema.js';

// ─── Input Schema ────────────────────────────────────────────────────

export const initWorkspaceSchema = z.object({
  fix: z
    .boolean()
    .default(false)
    .describe(
      'When false (default), report what would be created without making changes. When true, apply all changes.'
    ),
  projectRoot: z
    .string()
    .optional()
    .describe(
      'Project root directory. Defaults to git root or cwd.'
    ),
  pluginRoot: z
    .string()
    .optional()
    .describe(
      'Plugin root directory containing workspace-schema.json and builtin assets.'
    ),
});

export type InitWorkspaceParams = z.infer<typeof initWorkspaceSchema>;

// ─── Output Types ────────────────────────────────────────────────────

interface AssetCopyResult {
  copied: string[];
  skipped: string[];
}

export interface InitWorkspaceResult {
  status: 'compliant' | 'initialized' | 'changes_needed';
  directories: {
    created: string[];
    existing: string[];
  };
  assets: {
    agents: AssetCopyResult;
    prompts: AssetCopyResult;
    workflows: AssetCopyResult;
  };
  config: {
    created: boolean;
    schemaUpdated: boolean;
    wranglerConfigCreated: boolean;
  };
  gitignore: {
    patternsAdded: string[];
    existing: string[];
  };
}

// ─── Path Resolution ─────────────────────────────────────────────────

/**
 * Resolve the plugin root directory.
 * Uses the provided path or walks up from the module location.
 */
export function resolvePluginRoot(explicitPath?: string): string {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  // Walk up from this file's location to find the plugin root
  // This file is at: mcp/tools/workspace/init.ts
  // Plugin root is 3 levels up
  let dir = path.resolve(__dirname);
  for (let i = 0; i < 3; i++) {
    dir = path.dirname(dir);
  }
  return dir;
}

/**
 * Resolve the project root directory.
 * Uses the provided path or attempts to find git root, falling back to cwd.
 */
export function resolveProjectRoot(explicitPath?: string): string {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }
  return path.resolve(process.cwd());
}

// ─── Schema Loading ──────────────────────────────────────────────────

/**
 * Load workspace schema from the plugin root directory.
 * Falls back to the default schema if the file is not found or invalid.
 */
function loadSchemaFromPlugin(pluginRoot: string): WorkspaceSchema {
  const schemaPath = path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json');

  try {
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      return JSON.parse(content) as WorkspaceSchema;
    }
  } catch {
    // Fall through to default
  }

  return getDefaultSchema();
}

// ─── Directory Operations ────────────────────────────────────────────

interface DirectoryPlan {
  created: string[];
  existing: string[];
  gitkeepDirs: string[];
}

/**
 * Plan directory creation based on workspace schema.
 *
 * FR-001: Reads from schema.directories (loaded from workspace-schema.json)
 * FR-002: Tracks which directories need creation (mkdir -p in apply phase)
 * FR-003: Tracks git-tracked directories for .gitkeep creation
 * FR-013: Handles both fresh (no dirs) and existing (partial dirs) projects
 */
function planDirectories(
  schema: WorkspaceSchema,
  projectRoot: string
): DirectoryPlan {
  const created: string[] = [];
  const existing: string[] = [];
  const gitkeepDirs: string[] = [];

  for (const dir of Object.values(schema.directories)) {
    const fullPath = path.join(projectRoot, dir.path);
    if (fs.existsSync(fullPath)) {
      existing.push(dir.path);
    } else {
      created.push(dir.path);
    }

    if (dir.gitTracked) {
      gitkeepDirs.push(dir.path);
    }

    // Handle subdirectories
    if (dir.subdirectories) {
      for (const subdir of Object.values(dir.subdirectories)) {
        const subFullPath = path.join(projectRoot, subdir.path);
        if (fs.existsSync(subFullPath)) {
          if (!existing.includes(subdir.path)) {
            existing.push(subdir.path);
          }
        } else {
          if (!created.includes(subdir.path)) {
            created.push(subdir.path);
          }
        }
      }
    }
  }

  return { created, existing, gitkeepDirs };
}

/**
 * Apply directory creation to disk.
 *
 * FR-002: Uses fs.mkdirSync with recursive: true for mkdir -p semantics
 *         (creates parent directories as needed, no-op if directory exists)
 * FR-003: Creates .gitkeep files only in git-tracked directories,
 *         preserving any existing .gitkeep content (FR-012)
 */
function applyDirectories(plan: DirectoryPlan, projectRoot: string): void {
  // FR-002: Create all directories using mkdir -p semantics
  // Including existing ones ensures parents are always created
  for (const dirPath of [...plan.created, ...plan.existing]) {
    fs.mkdirSync(path.join(projectRoot, dirPath), { recursive: true });
  }

  // FR-003: Create .gitkeep files in git-tracked directories
  for (const dirPath of plan.gitkeepDirs) {
    const gitkeepPath = path.join(projectRoot, dirPath, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  }
}

// ─── Asset Provisioning ─────────────────────────────────────────────

/**
 * Plan and optionally apply asset file copies.
 */
function planAssets(
  pluginRoot: string,
  projectRoot: string,
  _kind: 'agents' | 'prompts',
  sourceSubdir: string,
  destSubdir: string
): AssetCopyResult {
  const sourceDir = path.join(pluginRoot, sourceSubdir);
  const destDir = path.join(projectRoot, destSubdir);

  const result: AssetCopyResult = { copied: [], skipped: [] };

  if (!fs.existsSync(sourceDir)) {
    return result;
  }

  try {
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const destFile = path.join(destDir, file);
      if (fs.existsSync(destFile)) {
        result.skipped.push(file);
      } else {
        result.copied.push(file);
      }
    }
  } catch {
    // Directory read failed
  }

  return result;
}

/**
 * Plan workflow YAML file copies.
 */
function planWorkflows(
  pluginRoot: string,
  projectRoot: string
): AssetCopyResult {
  const sourceDir = path.join(pluginRoot, 'workflows');
  const destDir = path.join(projectRoot, '.wrangler', 'orchestration', 'workflows');

  const result: AssetCopyResult = { copied: [], skipped: [] };

  if (!fs.existsSync(sourceDir)) {
    return result;
  }

  try {
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    for (const file of files) {
      const destFile = path.join(destDir, file);
      if (fs.existsSync(destFile)) {
        result.skipped.push(file);
      } else {
        result.copied.push(file);
      }
    }
  } catch {
    // Directory read failed
  }

  return result;
}

/**
 * Apply asset copies to disk.
 */
function applyAssets(
  pluginRoot: string,
  projectRoot: string,
  assetsPlan: InitWorkspaceResult['assets']
): void {
  // Agents
  const agentsSrc = path.join(pluginRoot, 'workflows', 'agents');
  const agentsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'agents');
  if (assetsPlan.agents.copied.length > 0) {
    fs.mkdirSync(agentsDest, { recursive: true });
    for (const file of assetsPlan.agents.copied) {
      fs.copyFileSync(path.join(agentsSrc, file), path.join(agentsDest, file));
    }
  }

  // Prompts
  const promptsSrc = path.join(pluginRoot, 'workflows', 'prompts');
  const promptsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'prompts');
  if (assetsPlan.prompts.copied.length > 0) {
    fs.mkdirSync(promptsDest, { recursive: true });
    for (const file of assetsPlan.prompts.copied) {
      fs.copyFileSync(path.join(promptsSrc, file), path.join(promptsDest, file));
    }
  }

  // Workflows
  const workflowsSrc = path.join(pluginRoot, 'workflows');
  const workflowsDest = path.join(projectRoot, '.wrangler', 'orchestration', 'workflows');
  if (assetsPlan.workflows.copied.length > 0) {
    fs.mkdirSync(workflowsDest, { recursive: true });
    for (const file of assetsPlan.workflows.copied) {
      fs.copyFileSync(path.join(workflowsSrc, file), path.join(workflowsDest, file));
    }
  }
}

// ─── .gitignore Management ──────────────────────────────────────────

interface GitignorePlan {
  patternsAdded: string[];
  existing: string[];
}

/**
 * Parse a .gitignore file into a set of active (non-comment, non-blank) patterns.
 * Handles both LF and CRLF line endings, trims whitespace from each line,
 * and skips comment lines (starting with #) and blank lines.
 */
export function parseGitignorePatterns(content: string): Set<string> {
  const patterns = new Set<string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    patterns.add(trimmed);
  }
  return patterns;
}

/**
 * Plan .gitignore updates.
 *
 * FR-008: Reads existing .wrangler/.gitignore, parses patterns line-by-line,
 *         computes diff with schema gitignorePatterns, identifies missing patterns.
 * FR-012: Only appends missing patterns; never duplicates existing ones.
 */
function planGitignore(
  schema: WorkspaceSchema,
  projectRoot: string
): GitignorePlan {
  const gitignorePath = path.join(projectRoot, '.wrangler', '.gitignore');
  const requiredPatterns = schema.gitignorePatterns || ['cache/', 'logs/', 'sessions/'];

  const patternsAdded: string[] = [];
  const existing: string[] = [];

  let existingPatterns = new Set<string>();
  if (fs.existsSync(gitignorePath)) {
    const currentContent = fs.readFileSync(gitignorePath, 'utf-8');
    existingPatterns = parseGitignorePatterns(currentContent);
  }

  for (const pattern of requiredPatterns) {
    if (existingPatterns.has(pattern)) {
      existing.push(pattern);
    } else {
      patternsAdded.push(pattern);
    }
  }

  return { patternsAdded, existing };
}

/**
 * Apply .gitignore changes to disk.
 */
function applyGitignore(
  plan: GitignorePlan,
  projectRoot: string,
  _schema: WorkspaceSchema
): void {
  const gitignorePath = path.join(projectRoot, '.wrangler', '.gitignore');

  // Ensure directory exists
  fs.mkdirSync(path.join(projectRoot, '.wrangler'), { recursive: true });

  if (plan.patternsAdded.length === 0 && fs.existsSync(gitignorePath)) {
    // Nothing to add
    return;
  }

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  if (plan.patternsAdded.length > 0) {
    // Add a header if the file is empty/new
    if (content.length === 0) {
      content = '# Wrangler gitignore - generated from workspace-schema.json\n\n# Runtime data (don\'t commit)\n';
    } else if (!content.endsWith('\n')) {
      content += '\n';
    }

    for (const pattern of plan.patternsAdded) {
      content += `${pattern}\n`;
    }
  }

  fs.writeFileSync(gitignorePath, content);
}

// ─── Config File Management ─────────────────────────────────────────

interface ConfigPlan {
  created: boolean;
  schemaUpdated: boolean;
  wranglerConfigCreated: boolean;
}

/**
 * Parse a semver version string into numeric components.
 * Returns [major, minor, patch] or [0, 0, 0] for invalid/missing versions.
 */
export function parseSemver(version: string | undefined): [number, number, number] {
  if (!version) return [0, 0, 0];
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Compare two semver versions.
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareSemver(a: string | undefined, b: string | undefined): number {
  const [aMajor, aMinor, aPatch] = parseSemver(a);
  const [bMajor, bMinor, bPatch] = parseSemver(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

/**
 * Plan config file operations.
 *
 * FR-007: Plans wrangler.json generation with default configuration
 * FR-011: Copies workspace-schema.json if missing or if plugin version is newer
 * FR-012: Checks for existing files to avoid overwriting
 */
function planConfig(
  pluginRoot: string,
  projectRoot: string
): ConfigPlan {
  const destSchemaPath = path.join(projectRoot, '.wrangler', 'config', 'workspace-schema.json');
  const destWranglerConfigPath = path.join(projectRoot, '.wrangler', 'config', 'wrangler.json');

  const schemaExists = fs.existsSync(destSchemaPath);
  const wranglerConfigExists = fs.existsSync(destWranglerConfigPath);

  // FR-011: Determine if schema needs to be copied or updated
  let schemaUpdated = false;
  if (!schemaExists) {
    // Schema doesn't exist at destination - needs to be created
    schemaUpdated = true;
  } else {
    // Schema exists - check if plugin version is newer
    try {
      const pluginSchemaPath = path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json');
      if (fs.existsSync(pluginSchemaPath)) {
        const destContent = JSON.parse(fs.readFileSync(destSchemaPath, 'utf-8'));
        const pluginContent = JSON.parse(fs.readFileSync(pluginSchemaPath, 'utf-8'));

        if (compareSemver(pluginContent.version, destContent.version) > 0) {
          schemaUpdated = true;
        }
      }
    } catch {
      // If we can't read/parse either file, don't update
    }
  }

  return {
    created: !schemaExists,
    schemaUpdated,
    wranglerConfigCreated: !wranglerConfigExists,
  };
}

/**
 * Apply config file operations to disk.
 *
 * FR-007: Generates wrangler.json with version and workspace directories
 * FR-012: Only creates files that don't already exist
 */
function applyConfig(
  plan: ConfigPlan,
  pluginRoot: string,
  projectRoot: string,
  schema: WorkspaceSchema
): void {
  const destConfigDir = path.join(projectRoot, '.wrangler', 'config');

  if (plan.schemaUpdated || plan.wranglerConfigCreated) {
    fs.mkdirSync(destConfigDir, { recursive: true });
  }

  // Copy workspace-schema.json if needed
  if (plan.schemaUpdated) {
    const srcSchemaPath = path.join(pluginRoot, '.wrangler', 'config', 'workspace-schema.json');
    const destSchemaPath = path.join(destConfigDir, 'workspace-schema.json');

    if (fs.existsSync(srcSchemaPath)) {
      fs.copyFileSync(srcSchemaPath, destSchemaPath);
    } else {
      // Write default schema
      const defaultSchema = getDefaultSchema();
      fs.writeFileSync(destSchemaPath, JSON.stringify(defaultSchema, null, 2));
    }
  }

  // FR-007: Generate wrangler.json with default configuration
  if (plan.wranglerConfigCreated) {
    const destWranglerConfigPath = path.join(destConfigDir, 'wrangler.json');

    // Build directory map from schema
    const directories: Record<string, string> = {};
    for (const [key, dir] of Object.entries(schema.directories)) {
      directories[key] = dir.path;
    }

    const wranglerConfig = {
      version: schema.version || '1.0.0',
      workspace: {
        root: schema.workspace?.root || '.wrangler',
        directories,
      },
    };

    fs.writeFileSync(destWranglerConfigPath, JSON.stringify(wranglerConfig, null, 2));
  }
}

// ─── Main Tool Function ─────────────────────────────────────────────

/**
 * Initialize or verify the .wrangler/ workspace directory structure.
 *
 * In report-only mode (fix: false), returns what would be created.
 * In apply mode (fix: true), creates directories, copies assets, and manages config.
 */
export async function initWorkspaceTool(
  params: InitWorkspaceParams
): Promise<MCPSuccessResponse<InitWorkspaceResult>> {
  try {
    const fix = params.fix ?? false;
    const pluginRoot = resolvePluginRoot(params.pluginRoot);
    const projectRoot = resolveProjectRoot(params.projectRoot);

    // FR-001: Load schema from plugin directory
    const schema = loadSchemaFromPlugin(pluginRoot);

    // Plan all operations
    const dirPlan = planDirectories(schema, projectRoot);
    const agentsPlan = planAssets(
      pluginRoot,
      projectRoot,
      'agents',
      'workflows/agents',
      '.wrangler/orchestration/agents'
    );
    const promptsPlan = planAssets(
      pluginRoot,
      projectRoot,
      'prompts',
      'workflows/prompts',
      '.wrangler/orchestration/prompts'
    );
    const workflowsPlan = planWorkflows(pluginRoot, projectRoot);
    const gitignorePlan = planGitignore(schema, projectRoot);
    const configPlan = planConfig(pluginRoot, projectRoot);

    // Determine status
    const hasChanges =
      dirPlan.created.length > 0 ||
      agentsPlan.copied.length > 0 ||
      promptsPlan.copied.length > 0 ||
      workflowsPlan.copied.length > 0 ||
      gitignorePlan.patternsAdded.length > 0 ||
      configPlan.schemaUpdated ||
      configPlan.wranglerConfigCreated;

    let status: InitWorkspaceResult['status'];
    if (!hasChanges) {
      status = 'compliant';
    } else if (fix) {
      status = 'initialized';
    } else {
      status = 'changes_needed';
    }

    // FR-010: Apply changes if fix mode is enabled
    if (fix && hasChanges) {
      applyDirectories(dirPlan, projectRoot);
      applyAssets(pluginRoot, projectRoot, {
        agents: agentsPlan,
        prompts: promptsPlan,
        workflows: workflowsPlan,
      });
      applyGitignore(gitignorePlan, projectRoot, schema);
      applyConfig(configPlan, pluginRoot, projectRoot, schema);
    }

    // Build result
    const result: InitWorkspaceResult = {
      status,
      directories: {
        created: dirPlan.created,
        existing: dirPlan.existing,
      },
      assets: {
        agents: agentsPlan,
        prompts: promptsPlan,
        workflows: workflowsPlan,
      },
      config: configPlan,
      gitignore: gitignorePlan,
    };

    // Build human-readable text
    const textParts: string[] = [];
    if (status === 'compliant') {
      textParts.push('Workspace is fully compliant. No changes needed.');
    } else if (status === 'initialized') {
      textParts.push(`Workspace initialized at ${projectRoot}`);
      if (dirPlan.created.length > 0) {
        textParts.push(`Directories created: ${dirPlan.created.length}`);
      }
      const totalAssets =
        agentsPlan.copied.length +
        promptsPlan.copied.length +
        workflowsPlan.copied.length;
      if (totalAssets > 0) {
        textParts.push(`Assets provisioned: ${totalAssets}`);
      }
    } else {
      textParts.push('Workspace changes needed (run with fix: true to apply):');
      if (dirPlan.created.length > 0) {
        textParts.push(`  Directories to create: ${dirPlan.created.join(', ')}`);
      }
      const totalAssets =
        agentsPlan.copied.length +
        promptsPlan.copied.length +
        workflowsPlan.copied.length;
      if (totalAssets > 0) {
        textParts.push(`  Assets to provision: ${totalAssets}`);
      }
    }

    return createSuccessResponse(textParts.join('\n'), result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(
      MCPErrorCode.TOOL_EXECUTION_ERROR,
      `Failed to initialize workspace: ${message}`
    ) as any;
  }
}
