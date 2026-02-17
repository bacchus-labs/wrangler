/**
 * Exhaustive visibility resolution matrix tests for ReporterManager.buildVisibilityMap().
 *
 * Covers all step types (agent, code, parallel, loop, per-task) with each
 * visibility level, inheritance rules, defaults, and edge cases.
 */

import { ReporterRegistry } from '../../src/reporters/registry.js';
import { ReporterManager } from '../../src/reporters/manager.js';
import type {
  WorkflowDefinition,
  StepDefinition,
  ParallelStep,
  LoopStep,
  PerTaskStep,
} from '../../src/schemas/workflow.js';
import type { StepVisibility } from '../../src/reporters/types.js';
import type { WorkflowAuditEntry } from '../../src/types.js';
import { jest } from '@jest/globals';

// --- Helpers ---

function makeWorkflow(phases: StepDefinition[], reporters?: WorkflowDefinition['reporters']): WorkflowDefinition {
  return { name: 'test-wf', version: 1, reporters: reporters ?? [], phases };
}

function agentStep(name: string, reportAs?: StepVisibility): StepDefinition {
  return { name, agent: 'test-agent', prompt: 'do something', reportAs } as StepDefinition;
}

function codeStep(name: string, reportAs?: StepVisibility): StepDefinition {
  return { name, type: 'code' as const, handler: 'some-handler', reportAs } as StepDefinition;
}

function parallelStep(name: string, children: StepDefinition[], reportAs?: StepVisibility): ParallelStep {
  return { name, type: 'parallel' as const, steps: children, reportAs } as ParallelStep;
}

function loopStep(name: string, children: StepDefinition[], reportAs?: StepVisibility): LoopStep {
  return {
    name,
    type: 'loop' as const,
    condition: 'always',
    maxRetries: 3,
    onExhausted: 'warn' as const,
    steps: children,
    reportAs,
  } as LoopStep;
}

function perTaskStep(name: string, children: StepDefinition[], reportAs?: StepVisibility): PerTaskStep {
  return {
    name,
    type: 'per-task' as const,
    source: 'tasks',
    steps: children,
    reportAs,
  } as PerTaskStep;
}

function buildMap(phases: StepDefinition[]): Map<string, StepVisibility> {
  const registry = new ReporterRegistry();
  const manager = new ReporterManager(makeWorkflow(phases), registry);
  return manager.getVisibilityMap();
}

// --- Tests ---

describe('Visibility Resolution Matrix', () => {

  // ================================================================
  // Base matrix: each step type with each visibility value
  // ================================================================

  describe('base matrix -- step types with each visibility', () => {
    const visibilities: StepVisibility[] = ['visible', 'silent', 'summary'];

    describe('agent step', () => {
      it.each(visibilities)('reportAs=%s resolves correctly', (vis) => {
        const map = buildMap([agentStep('agent-step', vis)]);
        expect(map.get('agent-step')).toBe(vis);
      });
    });

    describe('code step', () => {
      it.each(visibilities)('reportAs=%s resolves correctly', (vis) => {
        const map = buildMap([codeStep('code-step', vis)]);
        expect(map.get('code-step')).toBe(vis);
      });
    });

    describe('loop step', () => {
      it.each(visibilities)('reportAs=%s resolves correctly for parent', (vis) => {
        const map = buildMap([loopStep('loop-parent', [agentStep('loop-child')], vis)]);
        expect(map.get('loop-parent')).toBe(vis);
      });

      it('silent parent forces children silent', () => {
        const map = buildMap([loopStep('lp', [agentStep('lc', 'visible')], 'silent')]);
        expect(map.get('lc')).toBe('silent');
      });

      it('visible parent allows children own visibility', () => {
        const map = buildMap([loopStep('lp', [agentStep('lc', 'summary')], 'visible')]);
        expect(map.get('lc')).toBe('summary');
      });
    });

    describe('per-task step', () => {
      it.each(visibilities)('reportAs=%s resolves correctly for parent', (vis) => {
        const map = buildMap([perTaskStep('pt-parent', [codeStep('pt-child')], vis)]);
        expect(map.get('pt-parent')).toBe(vis);
      });

      it('silent parent forces children silent', () => {
        const map = buildMap([perTaskStep('pt', [agentStep('ptc', 'visible')], 'silent')]);
        expect(map.get('ptc')).toBe('silent');
      });

      it('visible parent allows children own visibility', () => {
        const map = buildMap([perTaskStep('pt', [agentStep('ptc', 'silent')], 'visible')]);
        expect(map.get('ptc')).toBe('silent');
      });
    });

    describe('parallel step', () => {
      it.each(visibilities)('reportAs=%s resolves correctly for parent', (vis) => {
        const map = buildMap([parallelStep('par-parent', [agentStep('par-child')], vis)]);
        expect(map.get('par-parent')).toBe(vis);
      });

      it('silent parent forces children silent', () => {
        const map = buildMap([parallelStep('par', [agentStep('pc', 'visible')], 'silent')]);
        expect(map.get('pc')).toBe('silent');
      });

      it('visible parent allows children own visibility', () => {
        const map = buildMap([parallelStep('par', [codeStep('pc', 'summary')], 'visible')]);
        expect(map.get('pc')).toBe('summary');
      });
    });
  });

  // ================================================================
  // Inheritance rules
  // ================================================================

  describe('inheritance rules', () => {
    it('silent parent forces visible child to silent', () => {
      const map = buildMap([
        parallelStep('parent', [agentStep('child', 'visible')], 'silent'),
      ]);
      expect(map.get('child')).toBe('silent');
    });

    it('silent parent forces summary child to silent', () => {
      const map = buildMap([
        loopStep('parent', [codeStep('child', 'summary')], 'silent'),
      ]);
      expect(map.get('child')).toBe('silent');
    });

    it('visible parent allows child to be silent', () => {
      const map = buildMap([
        perTaskStep('parent', [agentStep('child', 'silent')], 'visible'),
      ]);
      expect(map.get('child')).toBe('silent');
    });

    it('visible parent allows child to be summary', () => {
      const map = buildMap([
        parallelStep('parent', [agentStep('child', 'summary')], 'visible'),
      ]);
      expect(map.get('child')).toBe('summary');
    });

    it('summary parent does NOT force children to silent', () => {
      const map = buildMap([
        parallelStep('parent', [
          agentStep('child-a', 'visible'),
          codeStep('child-b', 'silent'),
        ], 'summary'),
      ]);
      expect(map.get('parent')).toBe('summary');
      expect(map.get('child-a')).toBe('visible');
      expect(map.get('child-b')).toBe('silent');
    });

    it('deep nesting (3 levels): top silent cascades through all descendants', () => {
      const leaf = agentStep('leaf', 'visible');
      const mid = parallelStep('mid', [leaf], 'visible');
      const top = loopStep('top', [mid], 'silent');

      const map = buildMap([top]);

      expect(map.get('top')).toBe('silent');
      expect(map.get('mid')).toBe('silent');
      expect(map.get('leaf')).toBe('silent');
    });

    it('deep nesting: visible top, silent mid, visible leaf -- leaf forced silent by mid', () => {
      const leaf = agentStep('leaf', 'visible');
      const mid = perTaskStep('mid', [leaf], 'silent');
      const top = parallelStep('top', [mid], 'visible');

      const map = buildMap([top]);

      expect(map.get('top')).toBe('visible');
      expect(map.get('mid')).toBe('silent');
      expect(map.get('leaf')).toBe('silent');
    });

    it('deep nesting: visible top, visible mid, silent leaf -- only leaf is silent', () => {
      const leaf = codeStep('leaf', 'silent');
      const mid = loopStep('mid', [leaf], 'visible');
      const top = parallelStep('top', [mid], 'visible');

      const map = buildMap([top]);

      expect(map.get('top')).toBe('visible');
      expect(map.get('mid')).toBe('visible');
      expect(map.get('leaf')).toBe('silent');
    });

    it('mixed step types in same parent all inherit silent', () => {
      const children: StepDefinition[] = [
        agentStep('agent-child', 'visible'),
        codeStep('code-child', 'summary'),
        loopStep('nested-loop', [agentStep('deep-child', 'visible')], 'visible'),
      ];
      const map = buildMap([parallelStep('root', children, 'silent')]);

      expect(map.get('agent-child')).toBe('silent');
      expect(map.get('code-child')).toBe('silent');
      expect(map.get('nested-loop')).toBe('silent');
      expect(map.get('deep-child')).toBe('silent');
    });
  });

  // ================================================================
  // Defaults
  // ================================================================

  describe('defaults', () => {
    it('step with no reportAs defaults to visible', () => {
      const step = { name: 'no-report', agent: 'a' } as StepDefinition;
      const map = buildMap([step]);
      expect(map.get('no-report')).toBe('visible');
    });

    it('code step with no reportAs defaults to visible', () => {
      const step = { name: 'code-no-report', type: 'code' as const, handler: 'h' } as StepDefinition;
      const map = buildMap([step]);
      expect(map.get('code-no-report')).toBe('visible');
    });

    it('container step with no reportAs defaults to visible, children unaffected', () => {
      const child = agentStep('child', 'summary');
      const parent = { name: 'container', type: 'parallel' as const, steps: [child] } as unknown as ParallelStep;
      const map = buildMap([parent]);
      expect(map.get('container')).toBe('visible');
      expect(map.get('child')).toBe('summary');
    });

    it('unknown step name in onAuditEntry defaults to visible (fans out)', async () => {
      const registry = new ReporterRegistry();
      const mockReporter = {
        type: 'mock',
        initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        onAuditEntry: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        onComplete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        onError: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        dispose: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };
      registry.register('mock', () => mockReporter);

      const workflow = makeWorkflow([agentStep('known-step')], [{ type: 'mock' }]);
      const manager = new ReporterManager(workflow, registry);
      await manager.initializeReporters({
        sessionId: 's', specFile: 'f', branchName: 'b', worktreePath: '/w',
      });

      const entry: WorkflowAuditEntry = {
        step: 'completely-unknown-step',
        status: 'started',
        timestamp: new Date().toISOString(),
      };
      await manager.onAuditEntry(entry);

      // Unknown step defaults to visible, so reporters should receive it
      expect(mockReporter.onAuditEntry).toHaveBeenCalledWith(entry);
    });
  });

  // ================================================================
  // Edge cases
  // ================================================================

  describe('edge cases', () => {
    it('step name with dots', () => {
      const map = buildMap([agentStep('phase.analyze.code', 'summary')]);
      expect(map.get('phase.analyze.code')).toBe('summary');
    });

    it('step name with slashes', () => {
      const map = buildMap([agentStep('build/lint/format', 'silent')]);
      expect(map.get('build/lint/format')).toBe('silent');
    });

    it('step name with special characters', () => {
      const map = buildMap([codeStep('step-with_mixed.chars/v2', 'visible')]);
      expect(map.get('step-with_mixed.chars/v2')).toBe('visible');
    });

    it('empty phases array produces empty visibility map', () => {
      const map = buildMap([]);
      expect(map.size).toBe(0);
    });

    it('workflow with no reporters configured still builds correct visibility map', () => {
      const workflow = makeWorkflow([
        agentStep('a', 'visible'),
        codeStep('b', 'silent'),
        agentStep('c', 'summary'),
      ]);
      const registry = new ReporterRegistry();
      const manager = new ReporterManager(workflow, registry);
      const map = manager.getVisibilityMap();

      expect(map.get('a')).toBe('visible');
      expect(map.get('b')).toBe('silent');
      expect(map.get('c')).toBe('summary');
    });

    it('multiple top-level steps each get independent visibility', () => {
      const map = buildMap([
        agentStep('s1', 'visible'),
        codeStep('s2', 'silent'),
        agentStep('s3', 'summary'),
        loopStep('s4', [agentStep('s4-child', 'visible')], 'silent'),
      ]);

      expect(map.get('s1')).toBe('visible');
      expect(map.get('s2')).toBe('silent');
      expect(map.get('s3')).toBe('summary');
      expect(map.get('s4')).toBe('silent');
      expect(map.get('s4-child')).toBe('silent');
    });

    it('sibling containers do not affect each other', () => {
      const map = buildMap([
        parallelStep('silent-par', [agentStep('sp-child', 'visible')], 'silent'),
        loopStep('visible-loop', [agentStep('vl-child', 'visible')], 'visible'),
      ]);

      expect(map.get('sp-child')).toBe('silent');
      expect(map.get('vl-child')).toBe('visible');
    });
  });
});
