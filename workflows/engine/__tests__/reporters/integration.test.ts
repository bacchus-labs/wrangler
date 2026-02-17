/**
 * Integration test: wires up the full reporter stack
 * (ReporterRegistry -> ReporterManager -> GitHubPRCommentReporter)
 * and simulates a workflow by feeding audit entries directly.
 *
 * Uses GitHubAPIMock to intercept fetch calls and assert on the
 * full chain of API interactions.
 */

import { jest } from '@jest/globals';
import { ReporterManager } from '../../src/reporters/manager.js';
import type { ReporterManagerInitOptions } from '../../src/reporters/manager.js';
import { createDefaultReporterRegistry, ReporterRegistry } from '../../src/reporters/registry.js';
import type { WorkflowDefinition, StepDefinition } from '../../src/schemas/workflow.js';
import type { StepVisibility, WorkflowReporter, ReporterContext } from '../../src/reporters/types.js';
import type { WorkflowAuditEntry } from '../../src/types.js';
import type { ExecutionSummary } from '../../src/state.js';
import { GitHubAPIMock } from './test-utils.js';

// --- Shared helpers ---

const GITHUB_CONFIG = {
  token: 'ghp_test_token_integration',
  owner: 'test-org',
  repo: 'test-repo',
  prNumber: 42,
  debounceMs: 0,
};

function makeWorkflow(
  phases: StepDefinition[],
  reporters?: WorkflowDefinition['reporters'],
): WorkflowDefinition {
  return {
    name: 'integration-test-workflow',
    version: 1,
    reporters: reporters ?? [],
    phases,
  };
}

function makeStep(name: string, reportAs?: StepVisibility): StepDefinition {
  return { name, agent: 'test-agent', reportAs: reportAs ?? 'visible' } as StepDefinition;
}

function makeEntry(step: string, status: WorkflowAuditEntry['status']): WorkflowAuditEntry {
  return { step, status, timestamp: new Date().toISOString() };
}

function makeSummary(stepNames: string[], totalMs: number = 5000): ExecutionSummary {
  return {
    totalDurationMs: totalMs,
    steps: stepNames.map(name => ({
      name,
      status: 'completed' as const,
      durationMs: Math.floor(totalMs / stepNames.length),
    })),
    counts: {
      total: stepNames.length,
      completed: stepNames.length,
      failed: 0,
      skipped: 0,
    },
    skippedSteps: [],
    loopDetails: [],
  };
}

const INIT_OPTS: ReporterManagerInitOptions = {
  sessionId: 'wf-integration-001',
  specFile: 'SPEC-000050.md',
  branchName: 'feat/integration-test',
  worktreePath: '/tmp/worktree-integration',
  prNumber: 42,
  prUrl: 'https://github.com/test-org/test-repo/pull/42',
};

// --- Tests ---

describe('Reporter Integration (Registry -> Manager -> GitHubPRCommentReporter)', () => {
  const githubApi = new GitHubAPIMock();

  beforeEach(() => {
    githubApi.setup();
    githubApi.setDefaultResponse({ status: 200, body: { id: 1 } });
  });

  afterEach(() => {
    githubApi.restore();
  });

  describe('happy path: full workflow lifecycle', () => {
    it('creates initial comment, updates on each entry, and posts completion', async () => {
      const phases = [makeStep('analyze'), makeStep('implement'), makeStep('test')];
      const workflow = makeWorkflow(phases, [
        { type: 'github-pr-comment', config: GITHUB_CONFIG },
      ]);

      const registry = createDefaultReporterRegistry();
      const manager = new ReporterManager(workflow, registry);

      // Initialize: creates the PR comment (1 POST)
      await manager.initializeReporters(INIT_OPTS);

      // Feed 3 phases x (started + completed) = 6 audit entries -> 6 PATCHes
      for (const name of ['analyze', 'implement', 'test']) {
        await manager.onAuditEntry(makeEntry(name, 'started'));
        await manager.onAuditEntry(makeEntry(name, 'completed'));
      }

      // Complete -> 1 final PATCH
      const summary = makeSummary(['analyze', 'implement', 'test']);
      await manager.onComplete(summary);

      await manager.dispose();

      const requests = githubApi.getRequests();

      // 1 POST + 6 PATCH (entries) + 1 PATCH (completion) = 8
      expect(requests).toHaveLength(8);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toContain('/issues/42/comments');

      for (let i = 1; i <= 7; i++) {
        expect(requests[i].method).toBe('PATCH');
        expect(requests[i].url).toContain('/issues/comments/1');
      }

      // Final PATCH body contains completion summary
      const finalBody = requests[7].body as { body: string };
      expect(finalBody.body).toContain('Completed');
      expect(finalBody.body).toContain('3 steps executed');
    });
  });

  describe('mixed visibility workflow', () => {
    it('omits silent steps and defers summary steps until completion', async () => {
      const phases = [
        makeStep('visible-step', 'visible'),
        makeStep('silent-step', 'silent'),
        makeStep('another-visible', 'visible'),
        makeStep('summary-step', 'summary'),
      ];
      const workflow = makeWorkflow(phases, [
        { type: 'github-pr-comment', config: GITHUB_CONFIG },
      ]);

      const registry = createDefaultReporterRegistry();
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters(INIT_OPTS);

      // Feed all 4 steps started + completed
      for (const name of ['visible-step', 'silent-step', 'another-visible', 'summary-step']) {
        await manager.onAuditEntry(makeEntry(name, 'started'));
        await manager.onAuditEntry(makeEntry(name, 'completed'));
      }

      await manager.onComplete(makeSummary(
        ['visible-step', 'silent-step', 'another-visible', 'summary-step'],
      ));
      await manager.dispose();

      const requests = githubApi.getRequests();
      const allBodies = requests.map(r => (r.body as { body: string }).body);

      // silent-step should never appear in any request body
      for (const body of allBodies) {
        expect(body).not.toContain('silent-step');
      }

      // summary-step should NOT appear in non-final updates (POST + mid-workflow PATCHes)
      // but SHOULD appear in the final PATCH (completion)
      const nonFinalBodies = allBodies.slice(0, -1);
      for (const body of nonFinalBodies) {
        expect(body).not.toContain('summary-step');
      }

      const finalBody = allBodies[allBodies.length - 1];
      expect(finalBody).toContain('summary-step');
    });
  });

  describe('workflow with no reporters config', () => {
    it('succeeds with zero fetch calls when no reporters are configured', async () => {
      const phases = [makeStep('step1'), makeStep('step2')];
      const workflow = makeWorkflow(phases); // no reporters

      const registry = createDefaultReporterRegistry();
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters(INIT_OPTS);

      await manager.onAuditEntry(makeEntry('step1', 'started'));
      await manager.onAuditEntry(makeEntry('step1', 'completed'));
      await manager.onComplete(makeSummary(['step1', 'step2']));
      await manager.dispose();

      expect(githubApi.getRequests()).toHaveLength(0);
    });
  });

  describe('reporter failure isolation', () => {
    it('does not throw when GitHub API returns 500 on all calls', async () => {
      githubApi.setDefaultResponse({ status: 500, body: { message: 'Internal Server Error' } });

      const phases = [makeStep('step1'), makeStep('step2')];
      const workflow = makeWorkflow(phases, [
        { type: 'github-pr-comment', config: GITHUB_CONFIG },
      ]);

      const registry = createDefaultReporterRegistry();
      const manager = new ReporterManager(workflow, registry);

      // None of these should throw
      await manager.initializeReporters(INIT_OPTS);
      await manager.onAuditEntry(makeEntry('step1', 'started'));
      await manager.onAuditEntry(makeEntry('step1', 'completed'));
      await manager.onComplete(makeSummary(['step1', 'step2']));
      await manager.dispose();

      // POST happened but returned 500; reporter silently handled it
      const requests = githubApi.getRequests();
      expect(requests.length).toBeGreaterThanOrEqual(1);
      expect(requests[0].method).toBe('POST');
    });
  });

  describe('multiple reporters', () => {
    it('fans out audit entries to all configured reporters', async () => {
      // Create a simple counting reporter
      const receivedEntries: WorkflowAuditEntry[] = [];
      let initCalled = false;
      let completeCalled = false;

      const countingReporter: WorkflowReporter = {
        type: 'counting-mock',
        initialize: async (_ctx: ReporterContext) => { initCalled = true; },
        onAuditEntry: async (entry: WorkflowAuditEntry) => { receivedEntries.push(entry); },
        onComplete: async (_summary: ExecutionSummary) => { completeCalled = true; },
        onError: async (_err: Error) => {},
        dispose: async () => {},
      };

      const registry = createDefaultReporterRegistry();
      registry.register('counting-mock', (_config) => countingReporter);

      const phases = [makeStep('step1'), makeStep('step2')];
      const workflow = makeWorkflow(phases, [
        { type: 'github-pr-comment', config: GITHUB_CONFIG },
        { type: 'counting-mock', config: {} },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters(INIT_OPTS);

      await manager.onAuditEntry(makeEntry('step1', 'started'));
      await manager.onAuditEntry(makeEntry('step1', 'completed'));
      await manager.onAuditEntry(makeEntry('step2', 'started'));
      await manager.onAuditEntry(makeEntry('step2', 'completed'));
      await manager.onComplete(makeSummary(['step1', 'step2']));
      await manager.dispose();

      // Counting reporter assertions
      expect(initCalled).toBe(true);
      expect(completeCalled).toBe(true);
      expect(receivedEntries).toHaveLength(4);
      expect(receivedEntries.map(e => `${e.step}:${e.status}`)).toEqual([
        'step1:started',
        'step1:completed',
        'step2:started',
        'step2:completed',
      ]);

      // GitHub reporter also received calls (1 POST + 4 PATCH entries + 1 PATCH completion)
      const requests = githubApi.getRequests();
      expect(requests).toHaveLength(6);
    });
  });
});
