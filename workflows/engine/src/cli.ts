#!/usr/bin/env node

/**
 * CLI entry point for the deterministic workflow engine.
 *
 * Usage:
 *   wrangler-workflow run <spec-file> [options]
 *   wrangler-workflow run <spec-file> --dry-run
 *   wrangler-workflow run <spec-file> --resume <session-id>
 */

import { Command } from 'commander';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { WorkflowEngine } from './engine.js';
import { WorkflowResolver } from './resolver.js';
import { WorkflowSessionManager } from './integration/session.js';
import { buildMcpConfig } from './integration/mcp.js';
import { createDefaultRegistry } from './handlers/index.js';
import type { QueryFunction, EngineConfig } from './types.js';
import type { WorkflowResult } from './state.js';

const program = new Command();

program
  .name('wrangler-workflow')
  .description('Deterministic workflow engine for spec implementation')
  .version('0.1.0');

program
  .command('run')
  .argument('<spec-file>', 'Path to specification file')
  .option('-w, --workflow <name>', 'Workflow definition to use', 'spec-implementation')
  .option('--dry-run', 'Run analyze + plan only', false)
  .option('--resume <session-id>', 'Resume from checkpoint')
  .option('--working-dir <dir>', 'Override working directory')
  .option('--model <model>', 'Override default model', 'opus')
  .option('--workflow-dir <dir>', 'Override workflow base directory')
  .action(async (specFile: string, options: {
    workflow: string;
    dryRun: boolean;
    resume?: string;
    workingDir?: string;
    model: string;
    workflowDir?: string;
  }) => {
    try {
      const workingDir = options.workingDir ?? process.cwd();
      const workflowBaseDir = options.workflowDir ??
        path.resolve(workingDir, 'workflows');
      const workflowPath = `${options.workflow}.yaml`;

      // Import the real query function from the Agent SDK
      let queryFn: QueryFunction;
      try {
        const sdk = await import('@anthropic-ai/claude-agent-sdk');
        queryFn = sdk.query as unknown as QueryFunction;
      } catch {
        console.error('Failed to import @anthropic-ai/claude-agent-sdk.');
        console.error('Install it with: npm install @anthropic-ai/claude-agent-sdk');
        process.exit(1);
      }

      // For new runs (not resume), create a git worktree for isolation.
      // For resume, we use the existing working directory.
      const specSlug = extractSpecSlug(specFile);
      let effectiveWorkingDir = workingDir;
      let effectiveBranchName = await getCurrentBranch(workingDir);

      if (!options.resume) {
        const crypto = await import('crypto');
        const tempSessionId = `wf-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(4).toString('hex')}`;
        const worktreeResult = await createWorktree({
          projectRoot: workingDir,
          specSlug,
          sessionId: tempSessionId,
        });
        if (worktreeResult.created) {
          effectiveWorkingDir = worktreeResult.worktreePath;
          effectiveBranchName = worktreeResult.branchName;
        }
      }

      const config: EngineConfig = {
        workingDirectory: effectiveWorkingDir,
        workflowBaseDir,
        defaults: {
          model: options.model,
          permissionMode: 'bypassPermissions',
          settingSources: ['project'],
        },
        dryRun: options.dryRun,
        mcpServers: buildMcpConfig({ projectRoot: effectiveWorkingDir }),
      };

      const sessionManager = new WorkflowSessionManager({
        basePath: workingDir,
        specFile: path.resolve(specFile),
        worktreePath: effectiveWorkingDir,
        branchName: effectiveBranchName,
      });

      // The plugin root is the parent of the engine directory (workflows/)
      // which contains agents/, prompts/, and workflow YAML files.
      const cliDir = path.dirname(fileURLToPath(import.meta.url));
      const pluginRoot = path.resolve(cliDir, '..', '..');
      const resolver = new WorkflowResolver(workingDir, pluginRoot);

      const engine = new WorkflowEngine({
        config,
        queryFn,
        handlerRegistry: createDefaultRegistry(),
        resolver,
        onAuditEntry: async (entry) => {
          await sessionManager.appendAuditEntry(entry);
        },
      });

      if (options.resume) {
        // Resume from checkpoint
        const checkpoint = await sessionManager.loadCheckpoint(options.resume);
        if (!checkpoint) {
          console.error(`No checkpoint found for session: ${options.resume}`);
          process.exit(1);
        }

        console.log(`Resuming from phase: ${checkpoint.currentPhase}`);
        const result = await engine.resume(
          workflowPath,
          {
            variables: checkpoint.variables,
            completedPhases: checkpoint.completedPhases ?? [],
            changedFiles: checkpoint.changedFiles ?? [],
          },
          checkpoint.currentPhase
        );

        await sessionManager.completeSession(result);
        printResult(result);
      } else {
        // New workflow run
        const sessionId = await sessionManager.createSession();
        console.log(`Session: ${sessionId}`);
        console.log(`Workflow: ${options.workflow}`);
        console.log(`Spec: ${specFile}`);
        console.log(`Working directory: ${effectiveWorkingDir}`);
        console.log(`Branch: ${effectiveBranchName}`);
        if (options.dryRun) console.log('Mode: dry-run (analyze + plan only)');
        console.log('---');

        const result = await engine.run(workflowPath, path.resolve(specFile));

        if (result.status === 'paused') {
          await sessionManager.writeBlocker(result.blockerDetails ?? 'Unknown blocker');
          await sessionManager.saveCheckpoint({
            currentPhase: result.pausedAtPhase ?? result.completedPhases[result.completedPhases.length - 1] ?? 'init',
            variables: result.outputs,
            completedPhases: result.completedPhases,
            changedFiles: result.changedFiles ?? [],
            tasksCompleted: (result.outputs.tasksCompleted as string[]) ?? [],
            tasksPending: (result.outputs.tasksPending as string[]) ?? [],
          });
          console.error(`\nWorkflow PAUSED: ${result.blockerDetails}`);
          console.error(`Resume with: wrangler-workflow run ${specFile} --resume ${sessionId}`);
          process.exit(2);
        }

        await sessionManager.completeSession(result);
        printResult(result);
      }
    } catch (error) {
      console.error('Workflow failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * Extract a URL-safe slug from a spec file path.
 * Strips the SPEC-NNNNN- prefix and normalizes to lowercase-with-dashes.
 */
export function extractSpecSlug(specFile: string): string {
  const basename = path.basename(specFile, '.md');
  // Remove common prefixes like SPEC-000001- or spec-
  const cleanName = basename.replace(/^SPEC-\d+-/, '').replace(/^spec-/, '');
  return cleanName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || 'implementation';
}

/** Dependencies for createWorktree, injectable for testing. */
export interface WorktreeDeps {
  ensureDir: (dir: string) => Promise<void>;
  execSync: (cmd: string, opts: Record<string, unknown>) => string;
}

/**
 * Create a git worktree for isolated workflow execution.
 * Falls back to the project root directory if worktree creation fails.
 */
export async function createWorktree(
  opts: {
    projectRoot: string;
    specSlug: string;
    sessionId: string;
  },
  deps?: WorktreeDeps,
): Promise<{ worktreePath: string; branchName: string; created: boolean }> {
  const { projectRoot, specSlug, sessionId } = opts;
  const worktreePath = path.join(projectRoot, '.worktrees', specSlug);
  const branchName = `wrangler/${specSlug}/${sessionId}`;

  try {
    const resolvedDeps = deps ?? await loadWorktreeDeps();
    await resolvedDeps.ensureDir(path.join(projectRoot, '.worktrees'));

    resolvedDeps.execSync(
      `git worktree add -b "${branchName}" "${worktreePath}"`,
      { cwd: projectRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    return { worktreePath, branchName, created: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Could not create git worktree, running in current directory. Reason: ${msg}`);
    return { worktreePath: projectRoot, branchName: 'unknown', created: false };
  }
}

/** Load real dependencies for createWorktree at runtime. */
async function loadWorktreeDeps(): Promise<WorktreeDeps> {
  const fsExtraMod = await import('fs-extra');
  const fse = (fsExtraMod as any).default || fsExtraMod;
  const cp = await import('child_process');
  return {
    ensureDir: (dir: string) => fse.ensureDir(dir),
    execSync: (cmd: string, opts: Record<string, unknown>) => cp.execSync(cmd, opts) as unknown as string,
  };
}

export function printResult(result: WorkflowResult): void {
  console.log('\n--- Workflow Complete ---');
  console.log(`Status: ${result.status}`);
  console.log(`Phases completed: ${result.completedPhases.join(', ')}`);

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }

  if (result.blockerDetails) {
    console.log(`Blocker: ${result.blockerDetails}`);
  }

  // Print execution summary if available
  const summary = result.executionSummary;
  if (summary) {
    const totalSec = (summary.totalDurationMs / 1000).toFixed(1);
    console.log(`\n--- Execution Summary (${totalSec}s) ---`);
    console.log(`Steps: ${summary.counts.total} total, ${summary.counts.completed} completed, ${summary.counts.failed} failed, ${summary.counts.skipped} skipped`);

    // Step-by-step breakdown
    for (const step of summary.steps) {
      const dur = step.durationMs > 0 ? ` (${(step.durationMs / 1000).toFixed(1)}s)` : '';
      const status = step.status === 'completed' ? 'OK' : step.status === 'failed' ? 'FAIL' : 'SKIP';
      let detail = `  [${status}] ${step.name}${dur}`;

      if (step.agentSource) {
        const agent = path.basename(step.agentSource, '.md');
        const prompt = step.promptSource ? path.basename(step.promptSource, '.md') : '';
        detail += ` agent=${agent}`;
        if (prompt) detail += ` prompt=${prompt}`;
      }

      if (step.skipReason) {
        detail += ` reason="${step.skipReason}"`;
      }

      if (step.error) {
        detail += ` error="${step.error}"`;
      }

      console.log(detail);
    }

    // Loop details
    if (summary.loopDetails.length > 0) {
      console.log('\nLoop steps:');
      for (const loop of summary.loopDetails) {
        const exitLabel = loop.exitReason === 'condition-cleared' ? 'resolved'
          : loop.exitReason === 'exhausted' ? 'EXHAUSTED' : 'ERROR';
        console.log(`  ${loop.name}: ${loop.iterations}/${loop.maxRetries} iterations [${exitLabel}] condition="${loop.condition}"`);
      }
    }

    // Skipped steps
    if (summary.skippedSteps.length > 0) {
      console.log('\nSkipped steps:');
      for (const s of summary.skippedSteps) {
        console.log(`  ${s.name}: ${s.reason}`);
      }
    }
  }

  // Extract verification results if available
  const verification = result.outputs?.verification as Record<string, unknown> | undefined;
  if (verification?.testSuite) {
    const ts = verification.testSuite as Record<string, unknown>;
    const passed = ts.passed;
    const total = ts.total;
    const coverage = ts.coverage as number | null | undefined;
    const exitCode = ts.exitCode as number | undefined;
    console.log(
      `\nTest Results: ${passed}/${total} passed` +
      (coverage != null ? ` (${coverage}% coverage)` : '') +
      (exitCode === 0 ? '' : ' [FAILED]')
    );
  }

  // Extract review outcomes
  const review = result.outputs?.review as Record<string, unknown> | undefined;
  if (review?.issues && Array.isArray(review.issues) && review.issues.length > 0) {
    const bySeverity = (review.issues as Array<Record<string, unknown>>).reduce(
      (acc: Record<string, number>, i) => {
        const severity = String(i.severity ?? 'unknown');
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      },
      {}
    );
    console.log(
      `\nReview: ${Object.entries(bySeverity).map(([s, c]) => `${c} ${s}`).join(', ')}`
    );
  }

  // Extract files changed from implementation results
  const outputs = result.outputs ?? {};
  const allFiles = new Set<string>();
  for (const [, value] of Object.entries(outputs)) {
    const v = value as Record<string, unknown> | undefined;
    if (v?.filesChanged && Array.isArray(v.filesChanged)) {
      for (const f of v.filesChanged as Array<Record<string, unknown>>) {
        if (f?.path && typeof f.path === 'string') allFiles.add(f.path);
      }
    }
  }
  if (allFiles.size > 0) {
    console.log(`\nFiles changed: ${allFiles.size}`);
    for (const f of allFiles) {
      console.log(`  ${f}`);
    }
  }
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const cp = await import('child_process');
    return cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Only parse when executed directly as a CLI entry point (not when imported for testing).
const isCLIEntryPoint = process.argv[1]?.replace(/\.ts$/, '.js').endsWith('/cli.js');
if (isCLIEntryPoint) {
  program.parse();
}
