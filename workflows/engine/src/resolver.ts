import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface ResolvedFile {
  path: string;
  source: 'project' | 'builtin';
}

/**
 * Resolves workflow, agent, and prompt files using a 2-tier search:
 *   1. Project level  ({projectRoot}/.wrangler/{type}/)  -- highest priority
 *   2. Builtin level  ({pluginRoot}/{type}/)              -- fallback
 *
 * First match wins.
 */
export class WorkflowResolver {
  private readonly projectRoot: string;
  private readonly pluginRoot: string;

  constructor(projectRoot: string, pluginRoot: string) {
    this.projectRoot = projectRoot;
    this.pluginRoot = pluginRoot;
  }

  async resolveWorkflow(name: string): Promise<ResolvedFile> {
    const filename = ensureExtension(name, '.yaml');
    return this.resolve('workflows', filename);
  }

  async resolveAgent(name: string): Promise<ResolvedFile> {
    const filename = ensureExtension(name, '.md');
    return this.resolve('agents', filename);
  }

  async resolvePrompt(name: string): Promise<ResolvedFile> {
    const filename = ensureExtension(name, '.md');
    return this.resolve('prompts', filename);
  }

  // ------------------------------------------------------------------
  // Internal
  // ------------------------------------------------------------------

  private async resolve(
    kind: 'workflows' | 'agents' | 'prompts',
    filename: string,
  ): Promise<ResolvedFile> {
    const projectPath = path.join(this.projectRoot, '.wrangler', kind, filename);
    const builtinPath = path.join(this.pluginRoot, kind, filename);

    if (await fileExists(projectPath)) {
      return { path: projectPath, source: 'project' };
    }

    if (await fileExists(builtinPath)) {
      return { path: builtinPath, source: 'builtin' };
    }

    throw new Error(
      `${kind.slice(0, -1)} not found: ${filename}. Searched:\n` +
      `  1. ${projectPath}\n` +
      `  2. ${builtinPath}\n` +
      `Hint: Create ${filename} in .wrangler/${kind}/ to override the builtin.`,
    );
  }
}

function ensureExtension(name: string, ext: string): string {
  return name.endsWith(ext) ? name : name + ext;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
