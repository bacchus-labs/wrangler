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
import { WorkflowEngine } from './engine.js';
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
        // @ts-expect-error -- Agent SDK is a runtime dependency, not installed for type-checking
        const sdk = await import('@anthropic-ai/claude-agent-sdk');
        queryFn = sdk.query as unknown as QueryFunction;
      } catch {
        console.error('Failed to import @anthropic-ai/claude-agent-sdk.');
        console.error('Install it with: npm install @anthropic-ai/claude-agent-sdk');
        process.exit(1);
      }

      const config: EngineConfig = {
        workingDirectory: workingDir,
        workflowBaseDir,
        defaults: {
          model: options.model,
          permissionMode: 'bypassPermissions',
          settingSources: ['project'],
        },
        dryRun: options.dryRun,
        mcpServers: buildMcpConfig({ projectRoot: workingDir }),
      };

      const sessionManager = new WorkflowSessionManager({
        basePath: workingDir,
        specFile: path.resolve(specFile),
        worktreePath: workingDir,
        branchName: await getCurrentBranch(workingDir),
      });

      const engine = new WorkflowEngine({
        config,
        queryFn,
        handlerRegistry: createDefaultRegistry(),
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
          { variables: checkpoint.variables, completedPhases: [], changedFiles: [] },
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
        if (options.dryRun) console.log('Mode: dry-run (analyze + plan only)');
        console.log('---');

        const result = await engine.run(workflowPath, path.resolve(specFile));

        if (result.status === 'paused') {
          await sessionManager.writeBlocker(result.blockerDetails ?? 'Unknown blocker');
          await sessionManager.saveCheckpoint({
            currentPhase: result.completedPhases[result.completedPhases.length - 1] ?? 'init',
            variables: result.outputs,
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

function printResult(result: WorkflowResult): void {
  console.log('\n--- Workflow Complete ---');
  console.log(`Status: ${result.status}`);
  console.log(`Phases completed: ${result.completedPhases.join(', ')}`);

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }

  if (result.blockerDetails) {
    console.log(`Blocker: ${result.blockerDetails}`);
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

async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

program.parse();
