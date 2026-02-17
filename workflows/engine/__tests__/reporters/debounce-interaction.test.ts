/**
 * Tests verifying the interaction between ReporterManager fan-out
 * and individual reporter debounce.
 *
 * Design decision: Debounce is owned by individual reporters, not
 * the manager. The manager fans out every audit entry immediately.
 * Each reporter decides whether to debounce its own updates.
 * This avoids double-debounce confusion.
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import type { WorkflowReporter, StepVisibility } from '../../src/reporters/types.js';
import type { WorkflowAuditEntry } from '../../src/types.js';
import type { ExecutionSummary } from '../../src/state.js';
import type { WorkflowDefinition, StepDefinition } from '../../src/schemas/workflow.js';
import { ReporterManager } from '../../src/reporters/manager.js';
import { ReporterRegistry } from '../../src/reporters/registry.js';
import { GitHubAPIMock, createMockAuditEntry, createMockReporterContext } from './test-utils.js';
import type { ReporterContext } from '../../src/reporters/types.js';

// --- CountingReporter: a simple mock that counts calls ---

class CountingReporter implements WorkflowReporter {
  readonly type = 'counting';
  auditCalls = 0;
  completeCalls = 0;
  disposeCalls = 0;

  async initialize(): Promise<void> {}
  async onAuditEntry(): Promise<void> { this.auditCalls++; }
  async onComplete(): Promise<void> { this.completeCalls++; }
  async onError(): Promise<void> {}
  async dispose(): Promise<void> { this.disposeCalls++; }
}

// --- Helpers ---

function makeWorkflow(
  phases: StepDefinition[],
  reporters?: WorkflowDefinition['reporters'],
): WorkflowDefinition {
  return {
    name: 'test-workflow',
    version: 1,
    reporters: reporters ?? [],
    phases,
  };
}

function makeStep(name: string, reportAs?: StepVisibility): StepDefinition {
  return { name, agent: 'test-agent', reportAs: reportAs ?? 'visible' } as StepDefinition;
}

function makeEntry(step: string, status: WorkflowAuditEntry['status'] = 'started'): WorkflowAuditEntry {
  return { step, status, timestamp: new Date().toISOString() };
}

function makeSummary(): ExecutionSummary {
  return {
    totalDurationMs: 5000,
    steps: [
      { name: 'analyze', status: 'completed', durationMs: 2000 },
      { name: 'plan', status: 'completed', durationMs: 1500 },
      { name: 'execute', status: 'completed', durationMs: 1500 },
    ],
    counts: { total: 3, completed: 3, failed: 0, skipped: 0 },
    skippedSteps: [],
    loopDetails: [],
  };
}

function makeContext(overrides?: Partial<ReporterContext>): ReporterContext {
  const base = createMockReporterContext(overrides as Record<string, unknown>);
  return base as unknown as ReporterContext;
}

// --- Tests ---

describe('Debounce interaction: ReporterManager fan-out + reporter-level debounce', () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // =========================================================================
  // 1. Verify fan-out is immediate (manager level)
  // =========================================================================

  describe('fan-out is immediate at manager level', () => {
    it('10 rapid audit entries call reporter.onAuditEntry 10 times (no batching)', async () => {
      const counter = new CountingReporter();
      const registry = new ReporterRegistry();
      registry.register('counting', () => counter);

      const workflow = makeWorkflow(
        [makeStep('step-a')],
        [{ type: 'counting' }],
      );
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-1',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      for (let i = 0; i < 10; i++) {
        await manager.onAuditEntry(makeEntry('step-a', 'started'));
      }

      expect(counter.auditCalls).toBe(10);
    });

    it('fan-out calls multiple reporters immediately for each entry', async () => {
      const counter1 = new CountingReporter();
      const counter2 = new CountingReporter();
      const registry = new ReporterRegistry();
      let callIndex = 0;
      registry.register('counting-1', () => { callIndex++; return counter1; });
      registry.register('counting-2', () => { callIndex++; return counter2; });

      const workflow = makeWorkflow(
        [makeStep('step-a')],
        [{ type: 'counting-1' }, { type: 'counting-2' }],
      );
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-1',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      await manager.onAuditEntry(makeEntry('step-a', 'started'));
      await manager.onAuditEntry(makeEntry('step-a', 'completed'));
      await manager.onAuditEntry(makeEntry('step-a', 'started'));

      expect(counter1.auditCalls).toBe(3);
      expect(counter2.auditCalls).toBe(3);
    });
  });

  // =========================================================================
  // 2. Verify reporter debounce still works through manager
  // =========================================================================

  describe('reporter debounce works through manager', () => {
    const apiMock = new GitHubAPIMock();

    beforeEach(() => {
      apiMock.setup();
      apiMock.setDefaultResponse({ status: 200, body: { id: 42 } });
    });

    afterEach(() => {
      apiMock.restore();
    });

    it('5 entries via manager produce only 1 PATCH after debounce window', async () => {
      jest.useFakeTimers();
      try {
        const registry = new ReporterRegistry();
        registry.register('github-pr-comment', (config) => {
          const { GitHubPRCommentReporter } = require('../../src/reporters/github-pr-comment.js');
          return new GitHubPRCommentReporter({
            ...config,
            token: 'ghp_test',
            owner: 'o',
            repo: 'r',
            prNumber: 1,
            debounceMs: 2000,
          });
        });

        const workflow = makeWorkflow(
          [makeStep('analyze'), makeStep('plan'), makeStep('execute')],
          [{ type: 'github-pr-comment' }],
        );
        const manager = new ReporterManager(workflow, registry);
        await manager.initializeReporters({
          sessionId: 'sess-debounce',
          specFile: 'spec.md',
          branchName: 'feat/test',
          worktreePath: '/tmp/wt',
        });
        apiMock.clearRequests();

        // Send 5 entries rapidly through the manager
        const entries: WorkflowAuditEntry[] = [
          makeEntry('analyze', 'started'),
          makeEntry('analyze', 'completed'),
          makeEntry('plan', 'started'),
          makeEntry('plan', 'completed'),
          makeEntry('execute', 'started'),
        ];
        for (const e of entries) {
          void manager.onAuditEntry(e);
        }

        // No PATCH yet within debounce window
        expect(apiMock.getRequests().length).toBe(0);

        // Advance past debounce
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
        await Promise.resolve();

        // Should have exactly 1 PATCH (debounce collapsed 5 entries)
        const requests = apiMock.getRequests();
        expect(requests.length).toBe(1);
        expect(requests[0].method).toBe('PATCH');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // =========================================================================
  // 3. Flush semantics through manager
  // =========================================================================

  describe('flush semantics through manager', () => {
    const apiMock = new GitHubAPIMock();

    beforeEach(() => {
      apiMock.setup();
      apiMock.setDefaultResponse({ status: 200, body: { id: 42 } });
    });

    afterEach(() => {
      apiMock.restore();
    });

    it('manager.onComplete() flushes pending debounced update + sends complete', async () => {
      jest.useFakeTimers();
      try {
        const registry = new ReporterRegistry();
        registry.register('github-pr-comment', (config) => {
          const { GitHubPRCommentReporter } = require('../../src/reporters/github-pr-comment.js');
          return new GitHubPRCommentReporter({
            ...config,
            token: 'ghp_test',
            owner: 'o',
            repo: 'r',
            prNumber: 1,
            debounceMs: 5000,
          });
        });

        const workflow = makeWorkflow(
          [makeStep('analyze'), makeStep('plan'), makeStep('execute')],
          [{ type: 'github-pr-comment' }],
        );
        const manager = new ReporterManager(workflow, registry);
        await manager.initializeReporters({
          sessionId: 'sess-flush',
          specFile: 'spec.md',
          branchName: 'feat/test',
          worktreePath: '/tmp/wt',
        });
        apiMock.clearRequests();

        // Send entries (debounce is 5s, so these accumulate)
        void manager.onAuditEntry(makeEntry('analyze', 'started'));
        void manager.onAuditEntry(makeEntry('analyze', 'completed'));

        // No PATCH yet
        expect(apiMock.getRequests().length).toBe(0);

        // onComplete cancels debounce and sends final update
        await manager.onComplete(makeSummary());

        // Should have 1 PATCH from onComplete (it cancels debounce and renders final)
        const requests = apiMock.getRequests();
        expect(requests.length).toBe(1);
        expect(requests[0].method).toBe('PATCH');

        // Verify it contains completion text
        const body = (requests[0].body as { body: string }).body;
        expect(body).toContain('**Completed**');
      } finally {
        jest.useRealTimers();
      }
    });

    it('manager.dispose() with pending timer clears debounce and flushes', async () => {
      jest.useFakeTimers();
      try {
        const registry = new ReporterRegistry();
        registry.register('github-pr-comment', (config) => {
          const { GitHubPRCommentReporter } = require('../../src/reporters/github-pr-comment.js');
          return new GitHubPRCommentReporter({
            ...config,
            token: 'ghp_test',
            owner: 'o',
            repo: 'r',
            prNumber: 1,
            debounceMs: 5000,
          });
        });

        const workflow = makeWorkflow(
          [makeStep('analyze'), makeStep('plan'), makeStep('execute')],
          [{ type: 'github-pr-comment' }],
        );
        const manager = new ReporterManager(workflow, registry);
        await manager.initializeReporters({
          sessionId: 'sess-dispose',
          specFile: 'spec.md',
          branchName: 'feat/test',
          worktreePath: '/tmp/wt',
        });
        apiMock.clearRequests();

        // Send entry (within debounce window)
        void manager.onAuditEntry(makeEntry('analyze', 'started'));
        expect(apiMock.getRequests().length).toBe(0);

        // dispose should flush the pending update
        await manager.dispose();

        const requests = apiMock.getRequests();
        expect(requests.length).toBe(1);
        expect(requests[0].method).toBe('PATCH');

        // After dispose, advancing timers should not trigger another PATCH
        apiMock.clearRequests();
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
        await Promise.resolve();
        expect(apiMock.getRequests().length).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // =========================================================================
  // 4. Edge cases
  // =========================================================================

  describe('edge cases', () => {
    const apiMock = new GitHubAPIMock();

    beforeEach(() => {
      apiMock.setup();
      apiMock.setDefaultResponse({ status: 200, body: { id: 42 } });
    });

    afterEach(() => {
      apiMock.restore();
    });

    it('debounceMs: 0 on reporter: every entry triggers immediate API call through manager', async () => {
      const registry = new ReporterRegistry();
      registry.register('github-pr-comment', (config) => {
        const { GitHubPRCommentReporter } = require('../../src/reporters/github-pr-comment.js');
        return new GitHubPRCommentReporter({
          ...config,
          token: 'ghp_test',
          owner: 'o',
          repo: 'r',
          prNumber: 1,
          debounceMs: 0,
        });
      });

      const workflow = makeWorkflow(
        [makeStep('analyze'), makeStep('plan'), makeStep('execute')],
        [{ type: 'github-pr-comment' }],
      );
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-zero-debounce',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });
      apiMock.clearRequests();

      // Send 3 entries: each should trigger an immediate PATCH
      await manager.onAuditEntry(makeEntry('analyze', 'started'));
      await manager.onAuditEntry(makeEntry('analyze', 'completed'));
      await manager.onAuditEntry(makeEntry('plan', 'started'));

      const requests = apiMock.getRequests();
      expect(requests.length).toBe(3);
      expect(requests.every(r => r.method === 'PATCH')).toBe(true);
    });

    it('single entry via manager with debounce fires after debounce window', async () => {
      jest.useFakeTimers();
      try {
        const registry = new ReporterRegistry();
        registry.register('github-pr-comment', (config) => {
          const { GitHubPRCommentReporter } = require('../../src/reporters/github-pr-comment.js');
          return new GitHubPRCommentReporter({
            ...config,
            token: 'ghp_test',
            owner: 'o',
            repo: 'r',
            prNumber: 1,
            debounceMs: 1000,
          });
        });

        const workflow = makeWorkflow(
          [makeStep('analyze'), makeStep('plan'), makeStep('execute')],
          [{ type: 'github-pr-comment' }],
        );
        const manager = new ReporterManager(workflow, registry);
        await manager.initializeReporters({
          sessionId: 'sess-single',
          specFile: 'spec.md',
          branchName: 'feat/test',
          worktreePath: '/tmp/wt',
        });
        apiMock.clearRequests();

        // Single entry
        void manager.onAuditEntry(makeEntry('analyze', 'started'));

        // Not yet
        expect(apiMock.getRequests().length).toBe(0);

        // Advance past debounce
        jest.advanceTimersByTime(1100);
        await Promise.resolve();
        await Promise.resolve();

        // Now exactly 1 PATCH
        expect(apiMock.getRequests().length).toBe(1);
        expect(apiMock.getRequests()[0].method).toBe('PATCH');
      } finally {
        jest.useRealTimers();
      }
    });

    it('manager with counting reporter: onComplete and dispose called exactly once each', async () => {
      const counter = new CountingReporter();
      const registry = new ReporterRegistry();
      registry.register('counting', () => counter);

      const workflow = makeWorkflow(
        [makeStep('step-a')],
        [{ type: 'counting' }],
      );
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-lifecycle',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      await manager.onAuditEntry(makeEntry('step-a', 'started'));
      await manager.onAuditEntry(makeEntry('step-a', 'completed'));
      await manager.onComplete(makeSummary());
      await manager.dispose();

      expect(counter.auditCalls).toBe(2);
      expect(counter.completeCalls).toBe(1);
      expect(counter.disposeCalls).toBe(1);
    });
  });
});
