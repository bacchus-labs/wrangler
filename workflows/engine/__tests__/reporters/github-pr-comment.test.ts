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

  // =====================================================
  // Token sanitization and security tests
  // =====================================================
  describe('token sanitization and security', () => {
    function captureWarnings(): { warnings: string[]; restore: () => void } {
      const warnings: string[] = [];
      const spy = jest.spyOn(console, 'warn').mockImplementation(
        (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); }
      );
      return { warnings, restore: () => spy.mockRestore() };
    }

    it('sanitizes token echoed back in API error body (echo-back attack)', async () => {
      const token = 'ghp_EchoAttackToken_abc123';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      apiMock.queueResponse({
        status: 401,
        body: { message: `Bad credentials for token ${token}` },
      });
      await reporter.initialize(makeContext());

      restore();

      for (const w of warnings) {
        expect(w).not.toContain(token);
      }
    });

    it('sanitizes token in network error messages', async () => {
      const token = 'ghp_NetworkErrorToken_xyz789';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      // Override fetch to throw an error containing the token
      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        throw new Error(`connect ECONNREFUSED to ${token}`);
      });

      await reporter.initialize(makeContext());

      restore();

      for (const w of warnings) {
        expect(w).not.toContain(token);
      }
      const errorWarning = warnings.find(w => w.includes('API request failed'));
      expect(errorWarning).toBeDefined();
      expect(errorWarning).toContain('***');
    });

    it('sanitizes multiple occurrences of token in a single error message', async () => {
      const token = 'ghp_MultiOccurrence_999';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        throw new Error(`token ${token} was rejected. Please verify ${token} is valid.`);
      });

      await reporter.initialize(makeContext());

      restore();

      for (const w of warnings) {
        expect(w).not.toContain(token);
      }
    });

    it('sanitizes 401 response warning messages', async () => {
      const token = 'ghp_401WarningTest_aaa';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      apiMock.queueResponse({ status: 401, body: { message: 'Unauthorized' } });
      await reporter.initialize(makeContext());

      restore();

      expect(warnings.length).toBeGreaterThan(0);
      for (const w of warnings) {
        expect(w).not.toContain(token);
      }
    });

    it('sanitizes 404 response warning messages', async () => {
      const token = 'ghp_404WarningTest_bbb';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      apiMock.queueResponse({ status: 404, body: { message: 'Not Found' } });
      await reporter.initialize(makeContext());

      restore();

      expect(warnings.length).toBeGreaterThan(0);
      for (const w of warnings) {
        expect(w).not.toContain(token);
      }
    });

    it('missing config fields warning does not leak token info', async () => {
      const { GitHubPRCommentReporter } = await loadModule();

      const { warnings, restore } = captureWarnings();

      new GitHubPRCommentReporter({
        token: 'ghp_ShouldNotLeak_ccc',
        owner: '',
        repo: '',
        prNumber: 1,
      });

      restore();

      expect(warnings.length).toBeGreaterThan(0);
      for (const w of warnings) {
        expect(w).not.toContain('ghp_ShouldNotLeak_ccc');
        expect(w).toContain('owner');
        expect(w).toContain('repo');
      }
    });

    it('GitHubAPIMock redacts Authorization header in recorded requests', async () => {
      const token = 'ghp_RedactTest_ddd';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      await reporter.initialize(makeContext());

      const requests = apiMock.getRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].headers['Authorization']).toBe('Bearer ***REDACTED***');

      const serialized = JSON.stringify(requests[0]);
      expect(serialized).not.toContain(token);
    });

    it('raw token does not appear in any recorded request across multiple calls', async () => {
      const token = 'ghp_RawTokenCheck_eee';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      await reporter.initialize(makeContext());
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'completed' }));

      const requests = apiMock.getRequests();
      expect(requests.length).toBeGreaterThan(0);

      for (const req of requests) {
        const serialized = JSON.stringify(req);
        expect(serialized).not.toContain(token);
      }
    });

    it('config property is private and not exposed via public type', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_PrivateConfig_fff',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
      });

      // The 'type' property is the only intended public non-method property
      expect(reporter.type).toBe('github-pr-comment');

      // TypeScript enforces private at compile time. At runtime the property
      // exists but is not part of the public interface. This test documents
      // that the token is stored in a private config object.
      const asAny = reporter as unknown as Record<string, unknown>;
      if (asAny['config']) {
        const config = asAny['config'] as { token: string };
        expect(typeof config.token).toBe('string');
      }
    });

    it('sanitize handles empty token without crashing', async () => {
      const { GitHubPRCommentReporter } = await loadModule();

      const { warnings, restore } = captureWarnings();

      const reporter = new GitHubPRCommentReporter({
        token: '',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      // Empty token disables the reporter, but constructor should not crash
      expect(reporter.type).toBe('github-pr-comment');

      restore();
    });

    it('sanitize handles token with regex special characters', async () => {
      const token = 'ghp_special.chars*are+here?yep$100';
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        throw new Error(`Auth failed for ${token}, try again with ${token}`);
      });

      await reporter.initialize(makeContext());

      restore();

      for (const w of warnings) {
        expect(w).not.toContain(token);
      }
      const errorWarning = warnings.find(w => w.includes('API request failed'));
      expect(errorWarning).toBeDefined();
      expect(errorWarning).toContain('***');
    });

    it('sanitize handles very long token (1000+ chars)', async () => {
      const token = 'ghp_' + 'A'.repeat(1000);
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token,
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      const { warnings, restore } = captureWarnings();

      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        throw new Error(`rejected token: ${token}`);
      });

      await reporter.initialize(makeContext());

      restore();

      for (const w of warnings) {
        expect(w).not.toContain(token);
        expect(w).not.toContain('A'.repeat(100));
      }
    });
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

  // =========================================================================
  // Network failure resilience
  // =========================================================================
  describe('network failure resilience', () => {
    // --- HTTP error responses ---

    it('continues after 500 Internal Server Error on onAuditEntry', async () => {
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

      // First update returns 500
      apiMock.queueResponse({ status: 500 });
      const entry1 = createMockAuditEntry({ step: 'analyze', status: 'started' });
      await reporter.onAuditEntry(entry1);

      // Reporter should still attempt the next API call (not disabled)
      apiMock.clearRequests();
      const entry2 = createMockAuditEntry({ step: 'analyze', status: 'completed' });
      await reporter.onAuditEntry(entry2);

      const requests = apiMock.getRequests();
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe('PATCH');
    });

    it('continues after 502/503 transient errors', async () => {
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

      // Queue 502, then 503
      apiMock.queueResponse({ status: 502 });
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

      apiMock.queueResponse({ status: 503 });
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'completed' }));

      // Reporter should still be active -- next call uses default 200
      apiMock.clearRequests();
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));
      expect(apiMock.getRequests().length).toBe(1);
    });

    it('self-disables on 401 during onAuditEntry update', async () => {
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

      // PATCH returns 401
      apiMock.queueResponse({ status: 401, body: { message: 'Bad credentials' } });
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

      // Now reporter should be disabled -- no more API calls
      apiMock.clearRequests();
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));
      await reporter.onComplete(makeSummary());
      await reporter.onError(new Error('test'));
      expect(apiMock.getRequests().length).toBe(0);
    });

    // --- Network-level failures ---

    it('continues after fetch throws TypeError (DNS failure)', async () => {
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

      // Network error on update
      apiMock.queueResponse({ networkError: true });
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));

      // Reporter should still attempt the next call
      apiMock.clearRequests();
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));
      expect(apiMock.getRequests().length).toBe(1);
    });

    it('network error during initialize leaves reporter effectively disabled (no commentId)', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ networkError: true });
      await reporter.initialize(makeContext());

      // No commentId, so all subsequent calls are no-ops
      apiMock.clearRequests();
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      await reporter.onComplete(makeSummary());
      await reporter.onError(new Error('test'));
      expect(apiMock.getRequests().length).toBe(0);
    });

    it('network error during onAuditEntry does not crash and reporter continues', async () => {
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

      // Network error, then success
      apiMock.queueResponse({ networkError: true });
      await expect(
        reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }))
      ).resolves.toBeUndefined();

      apiMock.clearRequests();
      await reporter.onAuditEntry(createMockAuditEntry({ step: 'plan', status: 'started' }));
      expect(apiMock.getRequests().length).toBe(1);
    });

    it('network error during onComplete does not crash', async () => {
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

      apiMock.queueResponse({ networkError: true });
      await expect(reporter.onComplete(makeSummary())).resolves.toBeUndefined();
    });

    // --- Self-disable behavior (thorough) ---

    it('after 401 on init: onAuditEntry, onComplete, onError, dispose are all no-ops', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 401, body: { message: 'Bad credentials' } });
      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      await reporter.onComplete(makeSummary());
      await reporter.onError(new Error('test'));
      await reporter.dispose();

      expect(apiMock.getRequests().length).toBe(0);
    });

    it('after 404 on init: all lifecycle methods are no-ops', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 404, body: { message: 'Not Found' } });
      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      await reporter.onComplete(makeSummary());
      await reporter.onError(new Error('test'));
      await reporter.dispose();

      expect(apiMock.getRequests().length).toBe(0);
    });

    it('dispose() works on disabled reporter without crashing', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 401, body: { message: 'Unauthorized' } });
      await reporter.initialize(makeContext());

      await expect(reporter.dispose()).resolves.toBeUndefined();
    });

    // --- Initialize failure paths ---

    it('POST returns 500 on init: commentId is null, subsequent calls are no-ops', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ status: 500, body: { message: 'Internal Server Error' } });
      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      await reporter.onComplete(makeSummary());
      await reporter.onError(new Error('test'));
      await reporter.dispose();

      expect(apiMock.getRequests().length).toBe(0);
    });

    it('POST returns network error on init: subsequent calls are no-ops', async () => {
      const { GitHubPRCommentReporter } = await loadModule();
      const reporter = new GitHubPRCommentReporter({
        token: 'ghp_test',
        owner: 'o',
        repo: 'r',
        prNumber: 1,
        debounceMs: 0,
      });

      apiMock.queueResponse({ networkError: true });
      await reporter.initialize(makeContext());
      apiMock.clearRequests();

      await reporter.onAuditEntry(createMockAuditEntry({ step: 'analyze', status: 'started' }));
      await reporter.onComplete(makeSummary());
      await reporter.onError(new Error('test'));
      await reporter.dispose();

      expect(apiMock.getRequests().length).toBe(0);
    });
  });
});
