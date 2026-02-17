// Verify types are importable and interfaces can be implemented
import type { WorkflowReporter, ReporterContext, StepVisibility, ReporterFactory } from '../../src/reporters/types.js';

const noop = async () => {};

describe('Reporter types', () => {
  it('should allow implementing WorkflowReporter interface', () => {
    // This is a compile-time check - if it compiles, the types are correct
    const mockReporter: WorkflowReporter = {
      type: 'test',
      initialize: noop,
      onAuditEntry: noop,
      onComplete: noop,
      onError: noop,
      dispose: noop,
    };
    expect(mockReporter.type).toBe('test');
  });

  it('should define StepVisibility as expected values', () => {
    const visible: StepVisibility = 'visible';
    const silent: StepVisibility = 'silent';
    const summary: StepVisibility = 'summary';
    expect([visible, silent, summary]).toEqual(['visible', 'silent', 'summary']);
  });

  it('should define ReporterContext with required fields', () => {
    const ctx: ReporterContext = {
      sessionId: 'wf-123',
      specFile: 'spec.md',
      branchName: 'feat/test',
      worktreePath: '/tmp/wt',
      steps: [{ name: 'analyze', visibility: 'visible' }],
    };
    expect(ctx.sessionId).toBe('wf-123');
    expect(ctx.prNumber).toBeUndefined();
  });

  it('should define ReporterContext with optional PR fields', () => {
    const ctx: ReporterContext = {
      sessionId: 'wf-456',
      specFile: 'spec.md',
      branchName: 'feat/test',
      worktreePath: '/tmp/wt',
      steps: [],
      prNumber: 42,
      prUrl: 'https://github.com/org/repo/pull/42',
    };
    expect(ctx.prNumber).toBe(42);
    expect(ctx.prUrl).toBe('https://github.com/org/repo/pull/42');
  });

  it('should define ReporterFactory type', () => {
    const factory: ReporterFactory = (_config) => ({
      type: 'test',
      initialize: noop,
      onAuditEntry: noop,
      onComplete: noop,
      onError: noop,
      dispose: noop,
    });
    const reporter = factory({ key: 'value' });
    expect(reporter.type).toBe('test');
  });
});
