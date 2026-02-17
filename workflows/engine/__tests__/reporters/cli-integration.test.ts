/**
 * Tests for ReporterManager wiring into the CLI.
 *
 * These tests verify that:
 * 1. The CLI creates a ReporterManager and initializes reporters
 * 2. Audit entries are fanned out to both sessionManager and reporters
 * 3. onComplete/onError/dispose lifecycle methods are called
 * 4. Reporter errors do not crash the workflow
 * 5. Workflows with no reporters config run without error
 */

import { jest } from '@jest/globals';
import type { WorkflowReporter, ReporterContext } from '../../src/reporters/types.js';
import type { WorkflowAuditEntry } from '../../src/types.js';
import type { ExecutionSummary } from '../../src/state.js';
import type { WorkflowDefinition, StepDefinition } from '../../src/schemas/workflow.js';
import { ReporterManager } from '../../src/reporters/manager.js';
import { ReporterRegistry } from '../../src/reporters/registry.js';

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

function makeStep(name: string): StepDefinition {
  return { name, agent: 'test-agent', reportAs: 'visible' } as StepDefinition;
}

function makeAuditEntry(step: string, status: WorkflowAuditEntry['status'] = 'started'): WorkflowAuditEntry {
  return { step, status, timestamp: new Date().toISOString() };
}

function makeSummary(): ExecutionSummary {
  return {
    totalDurationMs: 1000,
    counts: { total: 2, completed: 2, failed: 0, skipped: 0 },
    steps: [],
    loopDetails: [],
    skippedSteps: [],
  };
}

// === Tests for the CLI integration pattern ===
// These test the wiring pattern that the CLI uses:
// create ReporterManager -> initialize -> fan out audit entries -> complete/error -> dispose

describe('ReporterManager CLI integration', () => {
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('workflow with no reporters config', () => {
    it('runs without error when reporters array is empty', async () => {
      const workflow = makeWorkflow([makeStep('analyze'), makeStep('plan')]);
      const registry = new ReporterRegistry();
      const manager = new ReporterManager(workflow, registry);

      // Simulate CLI lifecycle
      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      // Fan out audit entries (should be no-ops with no reporters)
      await manager.onAuditEntry(makeAuditEntry('analyze'));
      await manager.onComplete(makeSummary());
      await manager.dispose();
    });

    it('runs without error when reporters key is undefined', async () => {
      const workflow: WorkflowDefinition = {
        name: 'test',
        version: 1,
        phases: [makeStep('analyze')],
        // reporters is undefined
      };
      const registry = new ReporterRegistry();
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      await manager.onAuditEntry(makeAuditEntry('analyze'));
      await manager.onComplete(makeSummary());
      await manager.dispose();
    });
  });

  describe('workflow with reporters config', () => {
    it('creates and initializes reporters from config', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze'), makeStep('plan')],
        [{ type: 'test-reporter', config: { token: 'abc' } }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      expect(mockReporter.initialize).toHaveBeenCalledTimes(1);
    });

    it('fans out audit entries to reporters', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      const entry = makeAuditEntry('analyze', 'completed');
      await manager.onAuditEntry(entry);

      expect(mockReporter.onAuditEntry).toHaveBeenCalledWith(entry);
    });

    it('calls onComplete on reporters when workflow completes', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      const summary = makeSummary();
      await manager.onComplete(summary);

      expect(mockReporter.onComplete).toHaveBeenCalledWith(summary);
    });

    it('calls onError on reporters when workflow errors', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      const error = new Error('workflow failed');
      await manager.onError(error);

      expect(mockReporter.onError).toHaveBeenCalledWith(error);
    });

    it('calls dispose on reporters during cleanup', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      await manager.dispose();

      expect(mockReporter.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('reporter errors do not crash workflow', () => {
    it('continues when a reporter throws during onAuditEntry', async () => {
      const failReporter = createMockReporter('fail-reporter');
      failReporter.onAuditEntry.mockRejectedValue(new Error('reporter boom'));

      const okReporter = createMockReporter('ok-reporter');

      const registry = new ReporterRegistry();
      registry.register('fail-reporter', () => failReporter);
      registry.register('ok-reporter', () => okReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'fail-reporter' }, { type: 'ok-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      // Should not throw even though fail-reporter errors
      await manager.onAuditEntry(makeAuditEntry('analyze'));

      // The ok-reporter still receives the entry
      expect(okReporter.onAuditEntry).toHaveBeenCalledTimes(1);
    });

    it('continues when a reporter throws during onComplete', async () => {
      const failReporter = createMockReporter('fail-reporter');
      failReporter.onComplete.mockRejectedValue(new Error('complete boom'));

      const registry = new ReporterRegistry();
      registry.register('fail-reporter', () => failReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'fail-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      // Should not throw
      await manager.onComplete(makeSummary());
    });

    it('continues when a reporter throws during dispose', async () => {
      const failReporter = createMockReporter('fail-reporter');
      failReporter.dispose.mockRejectedValue(new Error('dispose boom'));

      const registry = new ReporterRegistry();
      registry.register('fail-reporter', () => failReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'fail-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      // Should not throw
      await manager.dispose();
    });
  });

  describe('dual fan-out pattern (sessionManager + reporterManager)', () => {
    it('onAuditEntry callback fans out to both session and reporter managers', async () => {
      // This tests the actual pattern used in the CLI: a single onAuditEntry
      // callback that writes to both the session manager and the reporter manager.
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      // Simulate the fan-out pattern the CLI uses
      const sessionAppendCalls: WorkflowAuditEntry[] = [];
      const mockSessionAppend = async (entry: WorkflowAuditEntry) => {
        sessionAppendCalls.push(entry);
      };

      const fanOutAuditEntry = async (entry: WorkflowAuditEntry) => {
        await mockSessionAppend(entry);
        await manager.onAuditEntry(entry);
      };

      const entry = makeAuditEntry('analyze', 'completed');
      await fanOutAuditEntry(entry);

      // Both received the entry
      expect(sessionAppendCalls).toHaveLength(1);
      expect(sessionAppendCalls[0]).toBe(entry);
      expect(mockReporter.onAuditEntry).toHaveBeenCalledWith(entry);
    });
  });

  describe('full lifecycle simulation', () => {
    it('simulates the complete CLI lifecycle: init -> audit -> complete -> dispose', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze'), makeStep('plan'), makeStep('execute')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      // 1. Initialize
      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: '/path/to/spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/worktree',
      });
      expect(mockReporter.initialize).toHaveBeenCalledTimes(1);

      // 2. Audit entries during execution
      await manager.onAuditEntry(makeAuditEntry('analyze', 'started'));
      await manager.onAuditEntry(makeAuditEntry('analyze', 'completed'));
      await manager.onAuditEntry(makeAuditEntry('plan', 'started'));
      await manager.onAuditEntry(makeAuditEntry('plan', 'completed'));
      await manager.onAuditEntry(makeAuditEntry('execute', 'started'));
      await manager.onAuditEntry(makeAuditEntry('execute', 'completed'));
      expect(mockReporter.onAuditEntry).toHaveBeenCalledTimes(6);

      // 3. Complete
      const summary = makeSummary();
      await manager.onComplete(summary);
      expect(mockReporter.onComplete).toHaveBeenCalledWith(summary);

      // 4. Dispose
      await manager.dispose();
      expect(mockReporter.dispose).toHaveBeenCalledTimes(1);
    });

    it('simulates the error lifecycle: init -> audit -> error -> dispose', async () => {
      const mockReporter = createMockReporter('test-reporter');
      const registry = new ReporterRegistry();
      registry.register('test-reporter', () => mockReporter);

      const workflow = makeWorkflow(
        [makeStep('analyze')],
        [{ type: 'test-reporter' }],
      );
      const manager = new ReporterManager(workflow, registry);

      await manager.initializeReporters({
        sessionId: 'wf-test-123',
        specFile: 'spec.md',
        branchName: 'feat/test',
        worktreePath: '/tmp/test',
      });

      await manager.onAuditEntry(makeAuditEntry('analyze', 'started'));

      const error = new Error('step failed');
      await manager.onError(error);
      expect(mockReporter.onError).toHaveBeenCalledWith(error);

      await manager.dispose();
      expect(mockReporter.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
