/**
 * Workspace Schema Loader
 *
 * Loads and provides access to the canonical workspace-schema.json
 * that defines all wrangler directory and file paths.
 */

import * as path from 'path';
import * as fs from 'fs';

export interface WorkspaceDirectory {
  path: string;
  description: string;
  gitTracked: boolean;
  subdirectories?: Record<string, { path: string; description: string }>;
}

export interface GovernanceFile {
  path: string;
  description: string;
  required: boolean;
  template?: string;
}

export interface ArtifactTypeConfig {
  directory: string;
  description: string;
}

export interface MCPConfiguration {
  issuesDirectory: string;
  specificationsDirectory: string;
  ideasDirectory: string;
}

export interface WorkspaceSchema {
  $schema?: string;
  version: string;
  description: string;
  workspace: {
    root: string;
    description: string;
  };
  directories: Record<string, WorkspaceDirectory>;
  governanceFiles: Record<string, GovernanceFile>;
  readmeFiles: Record<string, { path: string; description: string; template?: string }>;
  gitignorePatterns: string[];
  artifactTypes: Record<string, ArtifactTypeConfig>;
  mcpConfiguration: MCPConfiguration;
}

let cachedSchema: WorkspaceSchema | null = null;
let schemaPath: string | null = null;

/**
 * Find the workspace schema file by looking for .wrangler/config/workspace-schema.json
 * starting from the given directory and walking up to find git root.
 */
export function findSchemaPath(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);

  while (currentDir !== path.dirname(currentDir)) {
    const candidatePath = path.join(currentDir, '.wrangler', 'config', 'workspace-schema.json');
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }

    // Also check if we've hit the git root
    const gitDir = path.join(currentDir, '.git');
    if (fs.existsSync(gitDir)) {
      // We're at git root, check for schema here
      const schemaAtGitRoot = path.join(currentDir, '.wrangler', 'config', 'workspace-schema.json');
      if (fs.existsSync(schemaAtGitRoot)) {
        return schemaAtGitRoot;
      }
      // Git root found but no schema - stop searching
      return null;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load the workspace schema from the canonical location.
 * Caches the result for subsequent calls.
 */
export function loadWorkspaceSchema(basePath?: string): WorkspaceSchema {
  if (cachedSchema && schemaPath) {
    return cachedSchema;
  }

  const foundPath = findSchemaPath(basePath);
  if (!foundPath) {
    // Return default schema if not found
    return getDefaultSchema();
  }

  try {
    const content = fs.readFileSync(foundPath, 'utf-8');
    cachedSchema = JSON.parse(content) as WorkspaceSchema;
    schemaPath = foundPath;
    return cachedSchema;
  } catch (error) {
    // Return default schema on error
    return getDefaultSchema();
  }
}

/**
 * Get the default schema (used when workspace-schema.json doesn't exist)
 */
export function getDefaultSchema(): WorkspaceSchema {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    version: '1.3.0',
    description: 'Default wrangler workspace schema',
    workspace: {
      root: '.wrangler',
      description: 'Central wrangler workspace directory'
    },
    directories: {
      issues: {
        path: '.wrangler/issues',
        description: 'Issue tracking files',
        gitTracked: true,
        subdirectories: {
          archived: {
            path: '.wrangler/issues/archived',
            description: 'Archived closed/cancelled issues'
          }
        }
      },
      specifications: {
        path: '.wrangler/specifications',
        description: 'Feature specifications',
        gitTracked: true,
        subdirectories: {
          archived: {
            path: '.wrangler/specifications/archived',
            description: 'Archived closed/cancelled specifications'
          }
        }
      },
      ideas: {
        path: '.wrangler/ideas',
        description: 'Ideas and proposals',
        gitTracked: true
      },
      memos: {
        path: '.wrangler/memos',
        description: 'Reference material',
        gitTracked: true
      },
      plans: {
        path: '.wrangler/plans',
        description: 'Implementation plans',
        gitTracked: true
      },
      docs: {
        path: '.wrangler/docs',
        description: 'Generated documentation',
        gitTracked: true
      },
      cache: {
        path: '.wrangler/cache',
        description: 'Runtime cache',
        gitTracked: false
      },
      config: {
        path: '.wrangler/config',
        description: 'Configuration files',
        gitTracked: true
      },
      logs: {
        path: '.wrangler/logs',
        description: 'Runtime logs',
        gitTracked: false
      },
      orchestration: {
        path: '.wrangler/orchestration',
        description: 'Orchestration assets for agents, prompts, and workflows',
        gitTracked: true,
        subdirectories: {
          agents: {
            path: '.wrangler/orchestration/agents',
            description: 'Agent definition files'
          },
          prompts: {
            path: '.wrangler/orchestration/prompts',
            description: 'Prompt template files'
          },
          workflows: {
            path: '.wrangler/orchestration/workflows',
            description: 'Workflow definition files'
          }
        }
      }
    },
    governanceFiles: {
      constitution: {
        path: '.wrangler/CONSTITUTION.md',
        description: 'Project constitution',
        required: false
      },
      roadmap: {
        path: '.wrangler/ROADMAP.md',
        description: 'Strategic roadmap',
        required: false
      },
      nextSteps: {
        path: '.wrangler/ROADMAP_NEXT_STEPS.md',
        description: 'Tactical execution tracker',
        required: false
      }
    },
    readmeFiles: {
      issues: {
        path: '.wrangler/issues/README.md',
        description: 'Issues README'
      },
      specifications: {
        path: '.wrangler/specifications/README.md',
        description: 'Specifications README'
      }
    },
    gitignorePatterns: ['cache/', 'logs/', 'sessions/'],
    artifactTypes: {
      issue: {
        directory: 'issues',
        description: 'Work items'
      },
      specification: {
        directory: 'specifications',
        description: 'Feature specs'
      },
      idea: {
        directory: 'ideas',
        description: 'Ideas and proposals'
      }
    },
    mcpConfiguration: {
      issuesDirectory: '.wrangler/issues',
      specificationsDirectory: '.wrangler/specifications',
      ideasDirectory: '.wrangler/ideas'
    }
  };
}

/**
 * Clear the cached schema (useful for testing)
 */
export function clearSchemaCache(): void {
  cachedSchema = null;
  schemaPath = null;
}

/**
 * Get MCP directory configuration from schema
 */
export function getMCPDirectories(basePath?: string): MCPConfiguration {
  const schema = loadWorkspaceSchema(basePath);
  return schema.mcpConfiguration;
}

/**
 * Get all directories that should be created on workspace initialization
 */
export function getInitializationDirectories(basePath?: string): string[] {
  const schema = loadWorkspaceSchema(basePath);
  const dirs: string[] = [];

  for (const dir of Object.values(schema.directories)) {
    dirs.push(dir.path);
    if (dir.subdirectories) {
      for (const subdir of Object.values(dir.subdirectories)) {
        dirs.push(subdir.path);
      }
    }
  }

  return dirs;
}

/**
 * Get directories that should be git-tracked (need .gitkeep)
 */
export function getGitTrackedDirectories(basePath?: string): string[] {
  const schema = loadWorkspaceSchema(basePath);
  return Object.values(schema.directories)
    .filter(dir => dir.gitTracked)
    .map(dir => dir.path);
}

/**
 * Get gitignore patterns for .wrangler/.gitignore
 */
export function getGitignorePatterns(basePath?: string): string[] {
  const schema = loadWorkspaceSchema(basePath);
  return schema.gitignorePatterns;
}

/**
 * Get governance file paths
 */
export function getGovernanceFilePaths(basePath?: string): Record<string, string> {
  const schema = loadWorkspaceSchema(basePath);
  const paths: Record<string, string> = {};

  for (const [key, file] of Object.entries(schema.governanceFiles)) {
    paths[key] = file.path;
  }

  return paths;
}
