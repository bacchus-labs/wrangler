import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GitHubAPIMock, createMockAuditEntry, createMockReporterContext } from './test-utils.js';
import type { ReporterContext } from '../../src/reporters/types.js';
import type { ExecutionSummary } from '../../src/state.js';
import type { WorkflowAuditEntry } from '../../src/types.js';

// Dynamic import so the module sees the mocked fetch
async function loadModule() {
  const mod = await import('../../src/reporters/github-pr-comment.js');
  return mod;
}

function makeContext(overrides?: Partial<ReporterContext>): ReporterContext {
  const base = createMockReporterContext(overrides as Record<string, unknown>);
  return base as unknown as ReporterContext;
}

function makeSummary(overrides?: Partial<ExecutionSummary>): ExecutionSummary {
  return {
    totalDurationMs: 125000,
    steps: [
      { name: 'analyze', status: 'completed', durationMs: 30000 },
      { name: 'plan', status: 'completed', durationMs: 45000 },
      { name: 'execute', status: 'completed', durationMs: 50000 },
    ],
    counts: { total: 3, completed: 3, failed: 0, skipped: 0 },
    skippedSteps: [],
    loopDetails: [],
    ...overrides,
  };
}

function getBody(apiMock: GitHubAPIMock): string {
  const req = apiMock.getLastRequest();
  return (req?.body as { body: string }).body;
}

function makeReporterConfig() {
  return {
    token: 'ghp_testtoken123',
    owner: 'myorg',
    repo: 'myrepo',
    prNumber: 42,
    debounceMs: 0,
  };
}

describe('GitHubPRCommentReporter - Snapshot Tests', () => {
  const apiMock = new GitHubAPIMock();
  let dateNowSpy: ReturnType<typeof jest.spyOn>;
  let fakeNow: number;

  beforeEach(() => {
    apiMock.setup();
    apiMock.setDefaultResponse({ status: 200, body: { id: 1 } });
    // Fix Date.now() to produce deterministic durations in snapshots
    fakeNow = 1700000000000;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);
  });

  afterEach(() => {
    apiMock.restore();
    dateNowSpy.mockRestore();
  });

  /** Advance the fake clock by the given milliseconds. */
  function advanceClock(ms: number): void {
    fakeNow += ms;
  }

  // --- Initial state ---

  describe('initial state', () => {
    it('renders initial comment with 5 visible, 1 silent, 1 summary step', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-001',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'plan', visibility: 'visible' },
          { name: 'implement', visibility: 'visible' },
          { name: 'test', visibility: 'visible' },
          { name: 'review', visibility: 'visible' },
          { name: 'internal-lint', visibility: 'silent' },
          { name: 'post-summary', visibility: 'summary' },
        ],
      });
      await reporter.initialize(ctx);

      const body = getBody(apiMock);
      // Silent step must not appear
      expect(body).not.toContain('internal-lint');
      // Summary step must not appear in initial state
      expect(body).not.toContain('post-summary');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-001 -->');
      expect(body).toMatchSnapshot();
    });

    it('renders minimal comment when all steps are silent', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-002',
        steps: [
          { name: 'hidden-a', visibility: 'silent' },
          { name: 'hidden-b', visibility: 'silent' },
        ],
      });
      await reporter.initialize(ctx);

      const body = getBody(apiMock);
      expect(body).not.toContain('hidden-a');
      expect(body).not.toContain('hidden-b');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-002 -->');
      expect(body).toMatchSnapshot();
    });
  });

  // --- In-progress states ---

  describe('in-progress states', () => {
    it('renders step 1 started (spinner on step 1, pending on rest)', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-003',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'plan', visibility: 'visible' },
          { name: 'execute', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);
      apiMock.clearRequests();

      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

      const body = getBody(apiMock);
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-003 -->');
      expect(body).toMatchSnapshot();
    });

    it('renders step 1 completed, step 2 started', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-004',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'plan', visibility: 'visible' },
          { name: 'execute', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);

      // Start and complete analyze with a deterministic 5s duration
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      advanceClock(5000);
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'completed' }));
      // Start plan
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));
      apiMock.clearRequests();

      // Trigger one more update to capture the current state
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));

      const body = getBody(apiMock);
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-004 -->');
      expect(body).toMatchSnapshot();
    });

    it('renders per-task step with task progress metadata', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-005',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'implement', visibility: 'visible' },
          { name: 'test', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);

      // Complete analyze with a deterministic 10s duration
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      advanceClock(10000);
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'completed' }));
      apiMock.clearRequests();

      // Start implement with task progress
      const entry: WorkflowAuditEntry = {
        step: 'implement',
        status: 'started',
        timestamp: new Date().toISOString(),
        metadata: { taskIndex: 3, taskCount: 8 },
      };
      await reporter.onAuditEntry(entry);

      const body = getBody(apiMock);
      expect(body).toContain('(3/8 tasks)');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-005 -->');
      expect(body).toMatchSnapshot();
    });
  });

  // --- Terminal states ---

  describe('terminal states', () => {
    it('renders all steps completed with completion summary and duration', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-006',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'plan', visibility: 'visible' },
          { name: 'execute', visibility: 'visible' },
          { name: 'post-summary', visibility: 'summary' },
        ],
      });
      await reporter.initialize(ctx);
      apiMock.clearRequests();

      const summary = makeSummary({
        totalDurationMs: 192000, // 3m 12s
        steps: [
          { name: 'analyze', status: 'completed', durationMs: 30000 },
          { name: 'plan', status: 'completed', durationMs: 45000 },
          { name: 'execute', status: 'completed', durationMs: 50000 },
          { name: 'post-summary', status: 'completed', durationMs: 2000 },
        ],
        counts: { total: 4, completed: 4, failed: 0, skipped: 0 },
      });
      await reporter.onComplete(summary);

      const body = getBody(apiMock);
      // Summary step should appear in final render
      expect(body).toContain('post-summary');
      expect(body).toContain('**Completed**');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-006 -->');
      expect(body).toMatchSnapshot();
    });

    it('renders step 3 failed', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-007',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'plan', visibility: 'visible' },
          { name: 'execute', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);

      // Complete first two steps with deterministic durations
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      advanceClock(8000);
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'completed' }));
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));
      advanceClock(12000);
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'completed' }));
      // Start and fail execute
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'execute', status: 'started' }));
      apiMock.clearRequests();
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'execute', status: 'failed' }));

      const body = getBody(apiMock);
      expect(body).toContain(':x: Failed');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-007 -->');
      expect(body).toMatchSnapshot();
    });

    it('renders error state with error message', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-008',
        steps: [
          { name: 'analyze', visibility: 'visible' },
          { name: 'plan', visibility: 'visible' },
          { name: 'execute', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);

      // Start analyze
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      apiMock.clearRequests();

      await reporter.onError(new Error('Agent timed out after 300 seconds'));

      const body = getBody(apiMock);
      expect(body).toContain('Agent timed out after 300 seconds');
      expect(body).toContain(':x:');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-008 -->');
      expect(body).toMatchSnapshot();
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('renders step names with markdown special characters', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-009',
        steps: [
          { name: 'run `tests` suite', visibility: 'visible' },
          { name: 'check **critical** paths', visibility: 'visible' },
          { name: 'deploy_v2.0', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);

      const body = getBody(apiMock);
      expect(body).toContain('run `tests` suite');
      expect(body).toContain('check **critical** paths');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-009 -->');
      expect(body).toMatchSnapshot();
    });

    it('formats durations correctly: 0ms, 45s, 3m 12s', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter(makeReporterConfig());

      const ctx = makeContext({
        sessionId: 'wf-snap-010',
        steps: [
          { name: 'fast-step', visibility: 'visible' },
          { name: 'medium-step', visibility: 'visible' },
          { name: 'long-step', visibility: 'visible' },
        ],
      });
      await reporter.initialize(ctx);
      apiMock.clearRequests();

      // Use onComplete to set durations precisely (avoids Date.now() timing issues)
      const summary = makeSummary({
        totalDurationMs: 237000, // 3m 57s
        steps: [
          { name: 'fast-step', status: 'completed', durationMs: 0 },
          { name: 'medium-step', status: 'completed', durationMs: 45000 },
          { name: 'long-step', status: 'completed', durationMs: 192000 },
        ],
        counts: { total: 3, completed: 3, failed: 0, skipped: 0 },
      });
      await reporter.onComplete(summary);

      const body = getBody(apiMock);
      expect(body).toContain('0ms');
      expect(body).toContain('45s');
      expect(body).toContain('3m 12s');
      expect(body).toContain('<!-- wrangler-workflow: wf-snap-010 -->');
      expect(body).toMatchSnapshot();
    });
  });
});
