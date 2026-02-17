import { jest } from '@jest/globals';
import type { WorkflowAuditEntry } from '../../src/types.js';

/**
 * Recorded fetch request for assertion.
 */
export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Mock response configuration.
 */
export interface MockResponseConfig {
  /** HTTP status code. Required unless networkError is true. */
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Delay in ms before responding */
  delay?: number;
  /** If true, fetch throws a network error instead of responding */
  networkError?: boolean;
}

/**
 * GitHub API mock that records requests and returns configurable responses.
 */
export class GitHubAPIMock {
  private requests: RecordedRequest[] = [];
  private responseQueue: MockResponseConfig[] = [];
  private defaultResponse: MockResponseConfig = { status: 200, body: { id: 1 } };
  private fetchSpy: ReturnType<typeof jest.spyOn> | null = null;

  /** Set up the fetch mock. Call in beforeEach. */
  setup(): void {
    this.requests = [];
    this.responseQueue = [];
    this.fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? 'GET';
        const headers: Record<string, string> = {};
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => { headers[k] = v; });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => { headers[k] = v; });
          } else {
            Object.assign(headers, init.headers);
          }
        }
        let body: unknown = undefined;
        if (init?.body) {
          try { body = JSON.parse(init.body as string); } catch { body = init.body; }
        }

        // Redact auth token in recorded requests
        const redactedHeaders = { ...headers };
        if (redactedHeaders['Authorization']) {
          redactedHeaders['Authorization'] = 'Bearer ***REDACTED***';
        }

        this.requests.push({ method, url, headers: redactedHeaders, body });

        const config = this.responseQueue.shift() ?? this.defaultResponse;

        if (config.networkError) {
          throw new TypeError('Failed to fetch');
        }

        if (config.delay) {
          await new Promise(resolve => setTimeout(resolve, config.delay));
        }

        return new Response(
          config.body ? JSON.stringify(config.body) : null,
          {
            status: config.status ?? 200,
            headers: { 'Content-Type': 'application/json', ...config.headers },
          }
        );
      }
    );
  }

  /** Restore the original fetch. Call in afterEach. */
  restore(): void {
    this.fetchSpy?.mockRestore();
    this.fetchSpy = null;
  }

  /** Queue a response for the next fetch call. */
  queueResponse(config: MockResponseConfig): void {
    this.responseQueue.push(config);
  }

  /** Queue multiple responses. */
  queueResponses(...configs: MockResponseConfig[]): void {
    this.responseQueue.push(...configs);
  }

  /** Set the default response for requests with no queued response. */
  setDefaultResponse(config: MockResponseConfig): void {
    this.defaultResponse = config;
  }

  /** Get all recorded requests. */
  getRequests(): RecordedRequest[] {
    return [...this.requests];
  }

  /** Get the last recorded request. */
  getLastRequest(): RecordedRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  /** Clear recorded requests. */
  clearRequests(): void {
    this.requests = [];
  }
}

/**
 * Create a mock WorkflowAuditEntry with sensible defaults.
 */
export function createMockAuditEntry(overrides?: Partial<WorkflowAuditEntry>): WorkflowAuditEntry {
  return {
    step: 'test-step',
    status: 'started',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock ReporterContext with sensible defaults.
 * Note: ReporterContext type will be defined in the reporter interfaces.
 * This helper uses a plain object matching that shape.
 */
export function createMockReporterContext(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    sessionId: 'wf-test-session',
    specFile: 'test-spec.md',
    branchName: 'feat/test',
    worktreePath: '/tmp/test-worktree',
    steps: [
      { name: 'analyze', visibility: 'visible' },
      { name: 'plan', visibility: 'visible' },
      { name: 'execute', visibility: 'visible' },
    ],
    ...overrides,
  };
}

/**
 * Advance Jest fake timers past a debounce window.
 * Use with jest.useFakeTimers().
 */
export function flushDebounce(debounceMs: number = 2000): void {
  jest.advanceTimersByTime(debounceMs + 10);
}
