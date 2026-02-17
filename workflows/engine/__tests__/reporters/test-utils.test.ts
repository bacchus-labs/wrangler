import { jest } from '@jest/globals';
import { GitHubAPIMock, createMockAuditEntry, createMockReporterContext, flushDebounce } from './test-utils.js';

describe('Reporter test utilities', () => {
  describe('GitHubAPIMock', () => {
    let mock: GitHubAPIMock;

    beforeEach(() => {
      mock = new GitHubAPIMock();
      mock.setup();
    });

    afterEach(() => {
      mock.restore();
    });

    it('should record fetch requests', async () => {
      await fetch('https://api.github.com/repos/owner/repo/issues/1/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ghp_test123' },
        body: JSON.stringify({ body: 'hello' }),
      });

      const requests = mock.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toContain('comments');
      expect(requests[0].body).toEqual({ body: 'hello' });
    });

    it('should redact auth tokens in recorded requests', async () => {
      await fetch('https://api.github.com/test', {
        headers: { 'Authorization': 'Bearer ghp_secret_token' },
      });

      const req = mock.getLastRequest()!;
      expect(req.headers['Authorization']).toBe('Bearer ***REDACTED***');
      expect(req.headers['Authorization']).not.toContain('ghp_secret_token');
    });

    it('should return queued responses in order', async () => {
      mock.queueResponse({ status: 201, body: { id: 42 } });
      mock.queueResponse({ status: 200, body: { updated: true } });

      const res1 = await fetch('https://api.github.com/test1', { method: 'POST' });
      const res2 = await fetch('https://api.github.com/test2', { method: 'PATCH' });

      expect(res1.status).toBe(201);
      expect(await res1.json()).toEqual({ id: 42 });
      expect(res2.status).toBe(200);
    });

    it('should return default response when queue is empty', async () => {
      mock.setDefaultResponse({ status: 404, body: { message: 'Not Found' } });

      const res = await fetch('https://api.github.com/missing');
      expect(res.status).toBe(404);
    });

    it('should simulate network errors', async () => {
      mock.queueResponse({ networkError: true });

      await expect(fetch('https://api.github.com/fail')).rejects.toThrow('Failed to fetch');
    });

    it('should simulate 401/403/500 responses', async () => {
      mock.queueResponses(
        { status: 401, body: { message: 'Bad credentials' } },
        { status: 403, body: { message: 'rate limit exceeded' } },
        { status: 500, body: { message: 'Internal Server Error' } },
      );

      const r1 = await fetch('https://api.github.com/1');
      const r2 = await fetch('https://api.github.com/2');
      const r3 = await fetch('https://api.github.com/3');

      expect(r1.status).toBe(401);
      expect(r2.status).toBe(403);
      expect(r3.status).toBe(500);
    });
  });

  describe('createMockAuditEntry', () => {
    it('should create entry with defaults', () => {
      const entry = createMockAuditEntry();
      expect(entry.step).toBe('test-step');
      expect(entry.status).toBe('started');
      expect(entry.timestamp).toBeDefined();
    });

    it('should accept overrides', () => {
      const entry = createMockAuditEntry({ step: 'analyze', status: 'completed' });
      expect(entry.step).toBe('analyze');
      expect(entry.status).toBe('completed');
    });
  });

  describe('createMockReporterContext', () => {
    it('should create context with defaults', () => {
      const ctx = createMockReporterContext();
      expect(ctx.sessionId).toBe('wf-test-session');
      expect(ctx.steps).toHaveLength(3);
    });

    it('should accept overrides', () => {
      const ctx = createMockReporterContext({ prNumber: 42 });
      expect(ctx.prNumber).toBe(42);
    });
  });

  describe('flushDebounce', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should advance timers past debounce window', () => {
      const fn = jest.fn();
      setTimeout(fn, 2000);
      flushDebounce();
      expect(fn).toHaveBeenCalled();
    });
  });
});
