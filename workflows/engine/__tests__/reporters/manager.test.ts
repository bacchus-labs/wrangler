import { jest } from '@jest/globals';
import type { WorkflowReporter, ReporterFactory, StepVisibility } from '../../src/reporters/types.js';
import { ReporterRegistry } from '../../src/reporters/registry.js';
import type { WorkflowAuditEntry } from '../../src/types.js';
import type { ExecutionSummary } from '../../src/state.js';
import type { WorkflowDefinition, StepDefinition } from '../../src/schemas/workflow.js';
import { ReporterManager } from '../../src/reporters/manager.js';

// --- Helpers ---

type MockReporter = {
  type: string;
  initialize: jest.Mock<() => Promise<void>>;
  onAuditEntry: jest.Mock<() => Promise<void>>;
  onComplete: jest.Mock<() => Promise<void>>;
  onError: jest.Mock<() => Promise<void>>;
  dispose: jest.Mock<() => Promise<void>>;
};

function createMockReporter(type: string): MockReporter {
  return {
    type,
    initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onAuditEntry: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onComplete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onError: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    dispose: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function makeWorkflow(phases: StepDefinition[], reporters?: WorkflowDefinition['reporters']): WorkflowDefinition {
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

function makeAuditEntry(step: string, status: WorkflowAuditEntry['status'] = 'started'): WorkflowAuditEntry {
  return { step, status, timestamp: new Date().toISOString() };
}

function makeSummary(): ExecutionSummary {
  return {
    totalDurationMs: 1000,
    steps: [],
    counts: { total: 1, completed: 1, failed: 0, skipped: 0 },
    skippedSteps: [],
    loopDetails: [],
  };
}

// --- Tests ---

describe('ReporterManager', () => {
  let registry: ReporterRegistry;
  let mockReporterA: MockReporter;
  let mockReporterB: MockReporter;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    registry = new ReporterRegistry();
    mockReporterA = createMockReporter('type-a');
    mockReporterB = createMockReporter('type-b');
    registry.register('type-a', () => mockReporterA);
    registry.register('type-b', () => mockReporterB);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('initializeReporters', () => {
    it('creates reporters from config using registry', async () => {
      const workflow = makeWorkflow([makeStep('analyze')], [
        { type: 'type-a', config: { token: 'abc' } },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-1',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      expect(mockReporterA.initialize).toHaveBeenCalledTimes(1);
    });

    it('gracefully handles unknown reporter types (logs warning, skips)', async () => {
      const workflow = makeWorkflow([makeStep('analyze')], [
        { type: 'unknown-type' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-1',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown-type'),
      );
    });

    it('gracefully handles reporter initialization failure', async () => {
      mockReporterA.initialize.mockRejectedValueOnce(new Error('init boom'));

      const workflow = makeWorkflow([makeStep('analyze')], [
        { type: 'type-a' },
        { type: 'type-b' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-1',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      // type-a failed init, so only type-b should remain active
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('init boom'),
      );
      expect(mockReporterB.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('visibility map', () => {
    it('builds visibility map from flat step list', async () => {
      const workflow = makeWorkflow([
        makeStep('analyze', 'visible'),
        makeStep('plan', 'summary'),
        makeStep('execute', 'silent'),
      ]);

      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('analyze')).toBe('visible');
      expect(map.get('plan')).toBe('summary');
      expect(map.get('execute')).toBe('silent');
    });

    it('defaults to visible when reportAs not specified', async () => {
      const step: StepDefinition = { name: 'no-report-as', agent: 'test' } as StepDefinition;
      const workflow = makeWorkflow([step]);

      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('no-report-as')).toBe('visible');
    });

    it('inherits silent from parent for nested steps (parallel)', async () => {
      const workflow = makeWorkflow([{
        name: 'silent-parent',
        type: 'parallel' as const,
        reportAs: 'silent' as const,
        steps: [
          makeStep('child-a', 'visible'),
          makeStep('child-b', 'summary'),
        ],
      } as StepDefinition]);

      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('silent-parent')).toBe('silent');
      expect(map.get('child-a')).toBe('silent');
      expect(map.get('child-b')).toBe('silent');
    });

    it('inherits silent from parent for nested steps (loop)', async () => {
      const workflow = makeWorkflow([{
        name: 'silent-loop',
        type: 'loop' as const,
        condition: 'always',
        maxRetries: 3,
        onExhausted: 'warn' as const,
        reportAs: 'silent' as const,
        steps: [makeStep('loop-child', 'visible')],
      } as StepDefinition]);

      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('silent-loop')).toBe('silent');
      expect(map.get('loop-child')).toBe('silent');
    });

    it('inherits silent from parent for nested steps (per-task)', async () => {
      const workflow = makeWorkflow([{
        name: 'silent-per-task',
        type: 'per-task' as const,
        source: 'tasks',
        reportAs: 'silent' as const,
        steps: [makeStep('task-child', 'visible')],
      } as StepDefinition]);

      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('silent-per-task')).toBe('silent');
      expect(map.get('task-child')).toBe('silent');
    });

    it('does not force silent on children when parent is summary', async () => {
      const workflow = makeWorkflow([{
        name: 'summary-parent',
        type: 'parallel' as const,
        reportAs: 'summary' as const,
        steps: [
          makeStep('child-visible', 'visible'),
          makeStep('child-silent', 'silent'),
        ],
      } as StepDefinition]);

      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('summary-parent')).toBe('summary');
      expect(map.get('child-visible')).toBe('visible');
      expect(map.get('child-silent')).toBe('silent');
    });
  });

  describe('onAuditEntry', () => {
    it('fans out to all reporters', async () => {
      const workflow = makeWorkflow([makeStep('step-a')], [
        { type: 'type-a' },
        { type: 'type-b' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const entry = makeAuditEntry('step-a');
      await manager.onAuditEntry(entry);

      expect(mockReporterA.onAuditEntry).toHaveBeenCalledWith(entry);
      expect(mockReporterB.onAuditEntry).toHaveBeenCalledWith(entry);
    });

    it('catches per-reporter errors (does not propagate)', async () => {
      mockReporterA.onAuditEntry.mockRejectedValueOnce(new Error('reporter-a boom'));

      const workflow = makeWorkflow([makeStep('step-a')], [
        { type: 'type-a' },
        { type: 'type-b' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const entry = makeAuditEntry('step-a');
      // Should not throw
      await expect(manager.onAuditEntry(entry)).resolves.toBeUndefined();

      // type-b should still have been called
      expect(mockReporterB.onAuditEntry).toHaveBeenCalledWith(entry);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('reporter-a boom'),
      );
    });

    it('skips silent steps (does not fan out)', async () => {
      const workflow = makeWorkflow([makeStep('silent-step', 'silent')], [
        { type: 'type-a' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      await manager.onAuditEntry(makeAuditEntry('silent-step'));

      expect(mockReporterA.onAuditEntry).not.toHaveBeenCalled();
    });

    it('passes summary-visibility entries through to reporters', async () => {
      const workflow = makeWorkflow([makeStep('sum-step', 'summary')], [
        { type: 'type-a' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const entry = makeAuditEntry('sum-step');
      await manager.onAuditEntry(entry);

      expect(mockReporterA.onAuditEntry).toHaveBeenCalledWith(entry);
    });
  });

  describe('onComplete', () => {
    it('calls all reporters', async () => {
      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'type-a' },
        { type: 'type-b' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const summary = makeSummary();
      await manager.onComplete(summary);

      expect(mockReporterA.onComplete).toHaveBeenCalledWith(summary);
      expect(mockReporterB.onComplete).toHaveBeenCalledWith(summary);
    });

    it('catches per-reporter errors on complete', async () => {
      mockReporterA.onComplete.mockRejectedValueOnce(new Error('complete boom'));

      const workflow = makeWorkflow([makeStep('s')], [{ type: 'type-a' }, { type: 'type-b' }]);
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      await expect(manager.onComplete(makeSummary())).resolves.toBeUndefined();
      expect(mockReporterB.onComplete).toHaveBeenCalled();
    });
  });

  describe('onError', () => {
    it('calls all reporters', async () => {
      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'type-a' },
        { type: 'type-b' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const err = new Error('workflow failed');
      await manager.onError(err);

      expect(mockReporterA.onError).toHaveBeenCalledWith(err);
      expect(mockReporterB.onError).toHaveBeenCalledWith(err);
    });

    it('catches per-reporter errors on error', async () => {
      mockReporterA.onError.mockRejectedValueOnce(new Error('error boom'));

      const workflow = makeWorkflow([makeStep('s')], [{ type: 'type-a' }, { type: 'type-b' }]);
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      await expect(manager.onError(new Error('wf err'))).resolves.toBeUndefined();
      expect(mockReporterB.onError).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('calls dispose on all reporters', async () => {
      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'type-a' },
        { type: 'type-b' },
      ]);

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      await manager.dispose();

      expect(mockReporterA.dispose).toHaveBeenCalledTimes(1);
      expect(mockReporterB.dispose).toHaveBeenCalledTimes(1);
    });

    it('catches dispose errors', async () => {
      mockReporterA.dispose.mockRejectedValueOnce(new Error('dispose boom'));

      const workflow = makeWorkflow([makeStep('s')], [{ type: 'type-a' }, { type: 'type-b' }]);
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      await expect(manager.dispose()).resolves.toBeUndefined();
      expect(mockReporterB.dispose).toHaveBeenCalled();
    });
  });

  describe('multiple reporters receive same entries', () => {
    it('both reporters receive every audit entry', async () => {
      const workflow = makeWorkflow(
        [makeStep('step-1'), makeStep('step-2')],
        [{ type: 'type-a' }, { type: 'type-b' }],
      );

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const entry1 = makeAuditEntry('step-1', 'started');
      const entry2 = makeAuditEntry('step-2', 'completed');

      await manager.onAuditEntry(entry1);
      await manager.onAuditEntry(entry2);

      expect(mockReporterA.onAuditEntry).toHaveBeenCalledTimes(2);
      expect(mockReporterB.onAuditEntry).toHaveBeenCalledTimes(2);
      expect(mockReporterA.onAuditEntry).toHaveBeenNthCalledWith(1, entry1);
      expect(mockReporterA.onAuditEntry).toHaveBeenNthCalledWith(2, entry2);
    });
  });

  describe('no reporters configured', () => {
    it('works gracefully with no reporters', async () => {
      const workflow = makeWorkflow([makeStep('s')]);
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      // None of these should throw
      await manager.onAuditEntry(makeAuditEntry('s'));
      await manager.onComplete(makeSummary());
      await manager.onError(new Error('test'));
      await manager.dispose();
    });
  });

  describe('config template resolution', () => {
    it('resolves {{env.VAR}} from process.env', async () => {
      process.env.TEST_REPORTER_TOKEN = 'secret-token-123';

      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { token: '{{env.TEST_REPORTER_TOKEN}}' } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      expect(capturedConfig.token).toBe('secret-token-123');
      delete process.env.TEST_REPORTER_TOKEN;
    });

    it('resolves {{context.prNumber}} from init options', async () => {
      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { prNumber: '{{context.prNumber}}' } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w', prNumber: 42,
      });

      expect(capturedConfig.prNumber).toBe(42);
    });

    it('resolves {{context.sessionId}} and {{context.branchName}} from init options', async () => {
      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { sid: '{{context.sessionId}}', branch: '{{context.branchName}}' } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 'sess-abc', specFile: 'spec.md', branchName: 'feat/cool', worktreePath: '/tmp/wt',
      });

      expect(capturedConfig.sid).toBe('sess-abc');
      expect(capturedConfig.branch).toBe('feat/cool');
    });

    it('coerces resolved integer strings to numbers', async () => {
      process.env.TEST_PR_NUM = '99';

      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { pr: '{{env.TEST_PR_NUM}}' } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      expect(capturedConfig.pr).toBe(99);
      expect(typeof capturedConfig.pr).toBe('number');
      delete process.env.TEST_PR_NUM;
    });

    it('replaces unresolved templates with empty string', async () => {
      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { token: '{{env.NONEXISTENT_VAR_XYZ}}' } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      expect(capturedConfig.token).toBe('');
    });

    it('passes non-string config values through unchanged', async () => {
      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { retries: 3, enabled: true, tags: ['a', 'b'] } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      expect(capturedConfig.retries).toBe(3);
      expect(capturedConfig.enabled).toBe(true);
      expect(capturedConfig.tags).toEqual(['a', 'b']);
    });

    it('passes config with no templates through unchanged', async () => {
      let capturedConfig: Record<string, unknown> = {};
      const captureRegistry = new ReporterRegistry();
      captureRegistry.register('capture', (config) => {
        capturedConfig = config;
        return createMockReporter('capture');
      });

      const workflow = makeWorkflow([makeStep('s')], [
        { type: 'capture', config: { token: 'literal-value', count: 5 } },
      ]);

      const manager = new ReporterManager(workflow, captureRegistry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      expect(capturedConfig.token).toBe('literal-value');
      expect(capturedConfig.count).toBe(5);
    });
  });

  describe('reporter context includes step visibility', () => {
    it('passes step visibility array to initialize', async () => {
      const workflow = makeWorkflow(
        [makeStep('analyze', 'visible'), makeStep('plan', 'summary')],
        [{ type: 'type-a' }],
      );

      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 'sess-1',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/wt',
      });

      expect(mockReporterA.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'sess-1',
          steps: expect.arrayContaining([
            { name: 'analyze', visibility: 'visible' },
            { name: 'plan', visibility: 'summary' },
          ]),
        }),
      );
    });
  });
});
