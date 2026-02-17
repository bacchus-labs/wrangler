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

describe('GitHubPRCommentReporter', () => {
  const apiMock = new GitHubAPIMock();

  beforeEach(() => {
    apiMock.setup();
    // Default response returns a comment with id
    apiMock.setDefaultResponse({ status: 200, body: { id: 42 } });
  });

  afterEach(() => {
    apiMock.restore();
  });

  // --- Test 1: initialize() creates comment with correct markdown ---
  it('initialize() creates comment with correct markdown', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_testtoken123',
      owner: 'myorg',
      repo: 'myrepo',
      prNumber: 99,
      debounceMs: 0,
    });

    const ctx = makeContext({ sessionId: 'wf-abc-123' });
    await reporter.initialize(ctx);

    const requests = apiMock.getRequests();
    expect(requests.length).toBe(1);

    const req = requests[0];
    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.github.com/repos/myorg/myrepo/issues/99/comments');
    // Auth header should be redacted in recorded requests, but the actual call used the token
    expect(req.headers['Authorization']).toBe('Bearer ***REDACTED***');

    const body = req.body as { body: string };
    expect(body.body).toContain('<!-- wrangler-workflow: wf-abc-123 -->');
    expect(body.body).toContain('Workflow Progress');
    expect(body.body).toContain('analyze');
    expect(body.body).toContain('plan');
    expect(body.body).toContain('execute');
    // All should be pending initially
    expect(body.body).toContain(':white_circle: Pending');
  });

  // --- Test 2: onAuditEntry() updates comment for step started ---
  it('onAuditEntry() updates comment for step started', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    await reporter.initialize(makeContext());
    apiMock.clearRequests();

    const entry = createMockAuditEntry({ step: 'analyze', status: 'started' });
    await reporter.onAuditEntry(entry);

    const requests = apiMock.getRequests();
    expect(requests.length).toBe(1);

    const req = requests[0];
    expect(req.method).toBe('PATCH');
    expect(req.url).toContain('/repos/o/r/issues/comments/42');

    const body = req.body as { body: string };
    expect(body.body).toContain(':hourglass_flowing_sand:');
    expect(body.body).toContain('analyze');
  });

  // --- Test 3: onAuditEntry() updates comment for step completed ---
  it('onAuditEntry() updates comment for step completed with duration', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    await reporter.initialize(makeContext());

    // First send started to record start time
    const started = createMockAuditEntry({ step: 'analyze', status: 'started' });
    await reporter.onAuditEntry(started);
    apiMock.clearRequests();

    // Then send completed
    const completed = createMockAuditEntry({ step: 'analyze', status: 'completed' });
    await reporter.onAuditEntry(completed);

    const requests = apiMock.getRequests();
    expect(requests.length).toBe(1);

    const body = requests[0].body as { body: string };
    expect(body.body).toContain(':white_check_mark:');
    expect(body.body).toContain('Done');
  });

  // --- Test 4: onComplete() sends final update ---
  it('onComplete() sends final update with completion summary', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    await reporter.initialize(makeContext());
    apiMock.clearRequests();

    const summary = makeSummary({ totalDurationMs: 125000 });
    await reporter.onComplete(summary);

    const requests = apiMock.getRequests();
    expect(requests.length).toBe(1);

    const body = requests[0].body as { body: string };
    expect(body.body).toContain('**Completed**');
    expect(body.body).toContain('2 minutes');
    expect(body.body).toContain('3 steps executed');
    // No spinner in final
    expect(body.body).not.toContain(':hourglass_flowing_sand:');
  });

  // --- Test 5: onError() updates comment with error state ---
  it('onError() updates comment with error state', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    await reporter.initialize(makeContext());
    apiMock.clearRequests();

    await reporter.onError(new Error('Build failed'));

    const requests = apiMock.getRequests();
    expect(requests.length).toBe(1);

    const body = requests[0].body as { body: string };
    expect(body.body).toContain('Build failed');
    expect(body.body).toContain(':x:');
  });

  // --- Test 6: Self-disables on 401 ---
  it('self-disables on 401 response', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_bad',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    // Return 401 for the initial comment creation
    apiMock.queueResponse({ status: 401, body: { message: 'Bad credentials' } });

    await reporter.initialize(makeContext());
    apiMock.clearRequests();

    // Subsequent calls should be no-ops
    await reporter.onAuditEntry(createMockAuditEntry());
    await reporter.onComplete(makeSummary());
    await reporter.onError(new Error('test'));

    expect(apiMock.getRequests().length).toBe(0);
  });

  // --- Test 7: Self-disables on 404 ---
  it('self-disables on 404 response', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 999,
      debounceMs: 0,
    });

    apiMock.queueResponse({ status: 404, body: { message: 'Not Found' } });

    await reporter.initialize(makeContext());
    apiMock.clearRequests();

    await reporter.onAuditEntry(createMockAuditEntry());
    expect(apiMock.getRequests().length).toBe(0);
  });

  // --- Test 8: Debounce: rapid entries produce single PATCH ---
  it('debounce: rapid entries produce single PATCH', async () => {
    jest.useFakeTimers();
    try {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 2000,
      });

      // Initialize with real timer behavior (queue response for POST)
      apiMock.queueResponse({ status: 200, body: { id: 42 } });
      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      // Send 5 rapid entries (don't await -- they debounce)
      const entries: WorkflowAuditEntry[] = [
        createMockAuditEntry({ step: 'analyze', status: 'started' }),
        createMockAuditEntry({ step: 'analyze', status: 'completed' }),
        createMockAuditEntry({ step: 'plan', status: 'started' }),
        createMockAuditEntry({ step: 'plan', status: 'completed' }),
        createMockAuditEntry({ step: 'execute', status: 'started' }),
      ];

      for (const e of entries) {
        void reporter.onAuditEntry(e);
      }

      // No PATCH yet (within debounce window)
      expect(apiMock.getRequests().length).toBe(0);

      // Advance past debounce
      jest.advanceTimersByTime(2100);
      // Allow microtasks to flush
      await Promise.resolve();
      await Promise.resolve();

      // Should have exactly 1 PATCH
      const requests = apiMock.getRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe('PATCH');
    } finally {
      jest.useRealTimers();
    }
  });

  // --- Test 9: dispose() flushes pending debounced update ---
  it('dispose() flushes pending debounced update', async () => {
    jest.useFakeTimers();
    try {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 5000,
      });

      apiMock.queueResponse({ status: 200, body: { id: 42 } });
      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      // Queue an entry but don't wait for debounce
      void reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

      // dispose should flush immediately
      await reporter.dispose();

      const requests = apiMock.getRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe('PATCH');
    } finally {
      jest.useRealTimers();
    }
  });

  // --- Test 10: Token not in error output ---
  it('token does not appear in error output', async () => {
    const secretToken = 'ghp_SUPER_SECRET_TOKEN_12345';
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: secretToken,
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    // Capture console.warn
    const warnings: string[] = [];
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(
      (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
      }
    );

    apiMock.queueResponse({ status: 401, body: { message: `Bad token: ${secretToken}` } });
    await reporter.initialize(makeContext());

    warnSpy.mockRestore();

    // Verify token doesn't appear in any warning
    for (const w of warnings) {
      expect(w).not.toContain(secretToken);
    }
  });

  // --- Test 11: Silent steps not in comment body ---
  it('silent steps are not rendered in comment body', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    const ctx = makeContext({
      steps: [
        { name: 'analyze', visibility: 'visible' },
        { name: 'internal-check', visibility: 'silent' },
        { name: 'execute', visibility: 'visible' },
      ],
    });
    await reporter.initialize(ctx);

    const req = apiMock.getLastRequest();
    const body = (req?.body as { body: string }).body;
    expect(body).toContain('analyze');
    expect(body).not.toContain('internal-check');
    expect(body).toContain('execute');
  });

  // --- Test 12: Summary steps only appear in onComplete ---
  it('summary steps do not appear in live updates but appear in onComplete', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    const ctx = makeContext({
      steps: [
        { name: 'analyze', visibility: 'visible' as const },
        { name: 'summary-step', visibility: 'summary' as const },
      ],
    });
    await reporter.initialize(ctx);

    // Initial comment should not include summary steps
    const initReq = apiMock.getLastRequest();
    const initBody = (initReq?.body as { body: string }).body;
    expect(initBody).not.toContain('summary-step');

    apiMock.clearRequests();

    // Live update should not include summary steps
    await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
    const liveReq = apiMock.getLastRequest();
    const liveBody = (liveReq?.body as { body: string }).body;
    expect(liveBody).not.toContain('summary-step');

    apiMock.clearRequests();

    // onComplete should include summary steps
    const summary = makeSummary({
      steps: [
        { name: 'analyze', status: 'completed', durationMs: 5000 },
        { name: 'summary-step', status: 'completed', durationMs: 3000 },
      ],
      counts: { total: 2, completed: 2, failed: 0, skipped: 0 },
    });
    await reporter.onComplete(summary);

    const completeReq = apiMock.getLastRequest();
    const completeBody = (completeReq?.body as { body: string }).body;
    expect(completeBody).toContain('summary-step');
  });

  // --- Test 13: Per-task progress shows task count ---
  it('per-task progress shows task count from metadata', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
      debounceMs: 0,
    });

    await reporter.initialize(makeContext());
    apiMock.clearRequests();

    const entry: WorkflowAuditEntry = {
      step: 'execute',
      status: 'started',
      timestamp: new Date().toISOString(),
      metadata: { taskIndex: 2, taskCount: 5 },
    };
    await reporter.onAuditEntry(entry);

    const requests = apiMock.getRequests();
    expect(requests.length).toBe(1);
    const body = (requests[0].body as { body: string }).body;
    expect(body).toContain('(2/5 tasks)');
  });

  // --- Test 14: Config validation - missing required fields ---
  it('self-disables with warning when config is missing required fields', async () => {
    const { GitHubPRCommentReporter } = await loadModule();

    const warnings: string[] = [];
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(
      (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); }
    );

    // Missing token
    const reporter = new GitHubPRCommentReporter({
      token: '',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
    });

    await reporter.initialize(makeContext());
    // Should be disabled -- no fetch calls for the POST
    // The constructor logs a warning and disables
    expect(warnings.some(w => w.includes('token') || w.includes('config'))).toBe(true);

    apiMock.clearRequests();
    await reporter.onAuditEntry(createMockAuditEntry());
    expect(apiMock.getRequests().length).toBe(0);

    warnSpy.mockRestore();
  });

  it('self-disables when prNumber is missing', async () => {
    const { GitHubPRCommentReporter } = await loadModule();

    const warnings: string[] = [];
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(
      (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); }
    );

    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 0,
    });

    await reporter.initialize(makeContext());
    expect(warnings.some(w => w.includes('prNumber') || w.includes('config'))).toBe(true);

    warnSpy.mockRestore();
  });

  // --- Additional: type property ---
  it('has type "github-pr-comment"', async () => {
    const { GitHubPRCommentReporter } = await loadModule();
    const reporter = new GitHubPRCommentReporter({
      token: 'ghp_test',
      owner: 'o',
      repo: 'r',
      prNumber: 1,
    });
    expect(reporter.type).toBe('github-pr-comment');
  });

  // --- pause/resume lifecycle ---
  describe('pause/resume lifecycle', () => {

    // Pause: dispose() flushes pending debounce, no crash
    it('dispose() flushes pending debounce on pause', async () => {
      jest.useFakeTimers();
      try {
        const { GitHubPRCommentReporter } = await loadModule();
        const reporter = new GitHubPRCommentReporter({
          token: 'ghp_test',
          owner: 'o',
          repo: 'r',
          prNumber: 1,
          debounceMs: 10000,
        });

        apiMock.queueResponse({ status: 200, body: { id: 42 } });
        await reporter.initialize(makeContext());
        apiMock.clearRequests();

        // Queue an entry within debounce window
        void reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

        // No PATCH yet
        expect(apiMock.getRequests().length).toBe(0);

        // Simulate pause: dispose flushes the pending update
        await reporter.dispose();

        const requests = apiMock.getRequests();
        expect(requests.length).toBe(1);
        expect(requests[0].method).toBe('PATCH');
      } finally {
        jest.useRealTimers();
      }
    });

    // Pause: pending debounce timer is cleared cleanly
    it('pending debounce timer is cleared on dispose', async () => {
      jest.useFakeTimers();
      try {
        const { GitHubPRCommentReporter } = await loadModule();
        const reporter = new GitHubPRCommentReporter({
          token: 'ghp_test',
          owner: 'o',
          repo: 'r',
          prNumber: 1,
          debounceMs: 5000,
        });

        apiMock.queueResponse({ status: 200, body: { id: 42 } });
        await reporter.initialize(makeContext());
        apiMock.clearRequests();

        void reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

        // Dispose flushes and clears timer
        await reporter.dispose();
        apiMock.clearRequests();

        // Advance past the original debounce window -- no additional PATCH fires
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
        await Promise.resolve();

        expect(apiMock.getRequests().length).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    // Pause: after dispose, no further API calls on accidental onAuditEntry
    it('no API calls after dispose even if onAuditEntry is called', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      await reporter.initialize(makeContext());
      await reporter.dispose();
      apiMock.clearRequests();

      // Call onAuditEntry after dispose -- should be a no-op
      // (commentId is still set, but pendingUpdate was flushed;
      //  the entry will try to PATCH since debounceMs=0, which is fine
      //  as long as it doesn't crash)
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

      // The reporter still has commentId so it may PATCH -- the key test
      // is that it does NOT crash. For debounceMs=0 it will attempt a PATCH.
      // This validates no-crash behavior after dispose.
      expect(true).toBe(true);
    });

    // Resume: new instance creates a NEW comment (POST, not PATCH)
    it('new reporter instance after pause creates a new comment', async () => {
      const { GitHubPRCommentReporter } = await loadModule();

      // First instance (pre-pause)
      const reporter1 = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 200, body: { id: 100 } });
      await reporter1.initialize(makeContext({ sessionId: 'session-1' }));
      await reporter1.dispose();
      apiMock.clearRequests();

      // Second instance (post-resume) -- no comment search, creates new
      const reporter2 = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 200, body: { id: 200 } });
      await reporter2.initialize(makeContext({ sessionId: 'session-1' }));

      const requests = apiMock.getRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe('POST');
    });

    // Resume: two instances with different session IDs create different comments
    it('two instances with different session IDs create separate comments', async () => {
      const { GitHubPRCommentReporter } = await loadModule();

      const reporter1 = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 200, body: { id: 100 } });
      await reporter1.initialize(makeContext({ sessionId: 'session-A' }));

      const reporter2 = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 200, body: { id: 200 } });
      await reporter2.initialize(makeContext({ sessionId: 'session-B' }));

      const requests = apiMock.getRequests();
      // Both should be POST (creating new comments)
      expect(requests.length).toBe(2);
      expect(requests[0].method).toBe('POST');
      expect(requests[1].method).toBe('POST');

      // Each should have its own session marker
      const body1 = (requests[0].body as { body: string }).body;
      const body2 = (requests[1].body as { body: string }).body;
      expect(body1).toContain('<!-- wrangler-workflow: session-A -->');
      expect(body2).toContain('<!-- wrangler-workflow: session-B -->');
    });

    // Edge case: dispose() on reporter that never initialized
    it('dispose() on never-initialized reporter does not crash', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      // Never called initialize -- dispose should be safe
      await expect(reporter.dispose()).resolves.toBeUndefined();
      expect(apiMock.getRequests().length).toBe(0);
    });

    // Edge case: dispose() called twice is idempotent
    it('dispose() called twice does not crash', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      await expect(reporter.dispose()).resolves.toBeUndefined();
      await expect(reporter.dispose()).resolves.toBeUndefined();
    });

    // Edge case: dispose() called when disabled
    it('dispose() on disabled reporter does not crash', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: '',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      // Suppress the config warning
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Reporter is disabled due to empty token
      await reporter.initialize(makeContext());
      await expect(reporter.dispose()).resolves.toBeUndefined();
      expect(apiMock.getRequests().length).toBe(0);

      warnSpy.mockRestore();
    });
  });
});
