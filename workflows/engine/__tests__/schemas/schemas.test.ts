/**
 * Comprehensive tests for all workflow engine schemas and validation functions.
 *
 * Covers:
 * - workflow.ts: step schemas, validateStep(), validateWorkflowDefinition()
 * - analysis.ts: TaskDefinitionSchema, RequirementSchema, TechStackSchema, AnalysisResultSchema
 * - review.ts: ReviewIssueSchema, ReviewResultSchema, AggregatedReviewResultSchema, aggregateGateResults()
 * - implementation.ts: FileChangeSchema, TestResultsSchema, TddCertificationSchema, ImplementResultSchema
 * - fix.ts: FixActionSchema, FixResultSchema
 * - verification.ts: RequirementVerificationSchema, VerifyResultSchema
 * - publish.ts: PublishResultSchema
 */

import { ZodError } from 'zod';

// --- Workflow schemas ---
import {
  AgentPromptStepSchema,
  CodeStepSchema,
  ParallelStepPartialSchema,
  LoopStepPartialSchema,
  PerTaskStepPartialSchema,
  WorkflowDefaultsSchema,
  WorkflowSafetySchema,
  WorkflowDefinitionSchema,
  AgentDefinitionSchema,
  GateDefinitionSchema,
  validateStep,
  validateWorkflowDefinition,
} from '../../src/schemas/workflow.js';

// --- Phase result schemas ---
import {
  TaskDefinitionSchema,
  RequirementSchema,
  TechStackSchema,
  AnalysisResultSchema,
} from '../../src/schemas/analysis.js';

import {
  ReviewIssueSchema,
  TestCoverageAssessmentSchema,
  ReviewResultSchema,
  AggregatedReviewResultSchema,
  aggregateGateResults,
} from '../../src/schemas/review.js';

import {
  FileChangeSchema,
  TestResultsSchema,
  TddFunctionCertSchema,
  TddCertificationSchema,
  ImplementResultSchema,
} from '../../src/schemas/implementation.js';

import {
  FixActionSchema,
  FixResultSchema,
} from '../../src/schemas/fix.js';

import {
  RequirementVerificationSchema,
  VerifyResultSchema,
} from '../../src/schemas/verification.js';

import {
  PublishResultSchema,
} from '../../src/schemas/publish.js';

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

describe('Workflow schemas', () => {

  // --- AgentPromptStepSchema ---

  describe('AgentPromptStepSchema', () => {
    it('should accept step with agent and prompt', () => {
      const result = AgentPromptStepSchema.parse({
        name: 'analyze',
        agent: 'analyzer',
        prompt: 'analyze.md',
        output: 'analysis',
      });
      expect(result.name).toBe('analyze');
      expect(result.agent).toBe('analyzer');
      expect(result.prompt).toBe('analyze.md');
      expect(result.output).toBe('analysis');
    });

    it('should accept step with agent only (no prompt)', () => {
      const result = AgentPromptStepSchema.parse({
        name: 'analyze',
        agent: 'analyzer',
      });
      expect(result.name).toBe('analyze');
      expect(result.agent).toBe('analyzer');
      expect(result.prompt).toBeUndefined();
    });

    it('should accept step with prompt only (no agent)', () => {
      const result = AgentPromptStepSchema.parse({
        name: 'analyze',
        prompt: 'analyze.md',
      });
      expect(result.name).toBe('analyze');
      expect(result.prompt).toBe('analyze.md');
      expect(result.agent).toBeUndefined();
    });

    it('should accept step with all optional fields', () => {
      const result = AgentPromptStepSchema.parse({
        name: 'analyze',
        agent: 'analyzer',
        prompt: 'analyze.md',
        model: 'opus',
        output: 'analysis',
        enabled: false,
        condition: 'someVar === true',
        input: '{{spec}}',
      });
      expect(result.model).toBe('opus');
      expect(result.enabled).toBe(false);
      expect(result.condition).toBe('someVar === true');
      expect(result.input).toBe('{{spec}}');
    });

    it('should accept step with object input', () => {
      const result = AgentPromptStepSchema.parse({
        name: 'analyze',
        agent: 'analyzer',
        input: { spec: '{{spec}}', context: '{{ctx}}' },
      });
      expect(result.input).toEqual({ spec: '{{spec}}', context: '{{ctx}}' });
    });

    it('should default enabled to true', () => {
      const result = AgentPromptStepSchema.parse({
        name: 'analyze',
        agent: 'analyzer',
      });
      expect(result.enabled).toBe(true);
    });

    it('should reject step with empty name', () => {
      expect(() => AgentPromptStepSchema.parse({
        name: '',
        agent: 'analyzer',
      })).toThrow(ZodError);
    });

    it('should reject step missing name', () => {
      expect(() => AgentPromptStepSchema.parse({
        agent: 'analyzer',
      })).toThrow(ZodError);
    });
  });

  // --- CodeStepSchema ---

  describe('CodeStepSchema', () => {
    it('should accept valid code step', () => {
      const result = CodeStepSchema.parse({
        name: 'run-tests',
        type: 'code',
        handler: 'handlers/run-tests.ts',
        input: '{{results}}',
        output: 'testOutput',
      });
      expect(result.name).toBe('run-tests');
      expect(result.type).toBe('code');
      expect(result.handler).toBe('handlers/run-tests.ts');
      expect(result.input).toBe('{{results}}');
      expect(result.output).toBe('testOutput');
    });

    it('should accept code step without optional fields', () => {
      const result = CodeStepSchema.parse({
        name: 'run-tests',
        type: 'code',
        handler: 'handlers/run-tests.ts',
      });
      expect(result.input).toBeUndefined();
      expect(result.output).toBeUndefined();
    });

    it('should reject code step with empty handler', () => {
      expect(() => CodeStepSchema.parse({
        name: 'run-tests',
        type: 'code',
        handler: '',
      })).toThrow(ZodError);
    });

    it('should reject code step with wrong type', () => {
      expect(() => CodeStepSchema.parse({
        name: 'run-tests',
        type: 'agent',
        handler: 'handlers/run-tests.ts',
      })).toThrow(ZodError);
    });

    it('should reject code step missing handler', () => {
      expect(() => CodeStepSchema.parse({
        name: 'run-tests',
        type: 'code',
      })).toThrow(ZodError);
    });
  });

  // --- ParallelStepPartialSchema ---

  describe('ParallelStepPartialSchema', () => {
    it('should accept valid parallel step', () => {
      const result = ParallelStepPartialSchema.parse({
        name: 'run-gates',
        type: 'parallel',
        steps: [
          { name: 'gate-a', agent: 'reviewer' },
          { name: 'gate-b', agent: 'linter' },
        ],
        output: 'gateResults',
      });
      expect(result.name).toBe('run-gates');
      expect(result.type).toBe('parallel');
      expect(result.steps).toHaveLength(2);
      expect(result.output).toBe('gateResults');
    });

    it('should reject parallel step without steps', () => {
      expect(() => ParallelStepPartialSchema.parse({
        name: 'run-gates',
        type: 'parallel',
      })).toThrow(ZodError);
    });

    it('should reject parallel step with wrong type', () => {
      expect(() => ParallelStepPartialSchema.parse({
        name: 'run-gates',
        type: 'loop',
        steps: [],
      })).toThrow(ZodError);
    });
  });

  // --- LoopStepPartialSchema ---

  describe('LoopStepPartialSchema', () => {
    it('should accept valid loop step', () => {
      const result = LoopStepPartialSchema.parse({
        name: 'fix-loop',
        type: 'loop',
        condition: 'review.hasActionableIssues',
        maxRetries: 3,
        onExhausted: 'escalate',
        steps: [{ name: 'fix', agent: 'fixer' }],
        output: 'fixResult',
      });
      expect(result.name).toBe('fix-loop');
      expect(result.type).toBe('loop');
      expect(result.condition).toBe('review.hasActionableIssues');
      expect(result.maxRetries).toBe(3);
      expect(result.onExhausted).toBe('escalate');
      expect(result.steps).toHaveLength(1);
    });

    it('should accept loop step with default maxRetries and onExhausted', () => {
      const result = LoopStepPartialSchema.parse({
        name: 'fix-loop',
        type: 'loop',
        condition: 'review.hasIssues',
        steps: [{ name: 'fix', agent: 'fixer' }],
      });
      // defaults should be applied
      expect(result.maxRetries).toBeDefined();
      expect(result.onExhausted).toBeDefined();
    });

    it('should accept all onExhausted values', () => {
      for (const value of ['escalate', 'warn', 'fail'] as const) {
        const result = LoopStepPartialSchema.parse({
          name: 'loop',
          type: 'loop',
          condition: 'cond',
          maxRetries: 1,
          onExhausted: value,
          steps: [],
        });
        expect(result.onExhausted).toBe(value);
      }
    });

    it('should reject loop with non-positive maxRetries', () => {
      expect(() => LoopStepPartialSchema.parse({
        name: 'loop',
        type: 'loop',
        condition: 'cond',
        maxRetries: 0,
        onExhausted: 'fail',
        steps: [],
      })).toThrow(ZodError);
    });

    it('should reject loop with negative maxRetries', () => {
      expect(() => LoopStepPartialSchema.parse({
        name: 'loop',
        type: 'loop',
        condition: 'cond',
        maxRetries: -1,
        onExhausted: 'fail',
        steps: [],
      })).toThrow(ZodError);
    });

    it('should reject loop with non-integer maxRetries', () => {
      expect(() => LoopStepPartialSchema.parse({
        name: 'loop',
        type: 'loop',
        condition: 'cond',
        maxRetries: 2.5,
        onExhausted: 'fail',
        steps: [],
      })).toThrow(ZodError);
    });

    it('should reject loop with invalid onExhausted value', () => {
      expect(() => LoopStepPartialSchema.parse({
        name: 'loop',
        type: 'loop',
        condition: 'cond',
        maxRetries: 3,
        onExhausted: 'abort',
        steps: [],
      })).toThrow(ZodError);
    });

    it('should reject loop with empty condition', () => {
      expect(() => LoopStepPartialSchema.parse({
        name: 'loop',
        type: 'loop',
        condition: '',
        maxRetries: 3,
        onExhausted: 'fail',
        steps: [],
      })).toThrow(ZodError);
    });

    it('should reject loop missing condition', () => {
      expect(() => LoopStepPartialSchema.parse({
        name: 'loop',
        type: 'loop',
        maxRetries: 3,
        onExhausted: 'fail',
        steps: [],
      })).toThrow(ZodError);
    });
  });

  // --- PerTaskStepPartialSchema ---

  describe('PerTaskStepPartialSchema', () => {
    it('should accept valid per-task step', () => {
      const result = PerTaskStepPartialSchema.parse({
        name: 'implement-tasks',
        type: 'per-task',
        source: 'analysis.tasks',
        steps: [{ name: 'implement', agent: 'implementer' }],
        output: 'implementations',
      });
      expect(result.name).toBe('implement-tasks');
      expect(result.type).toBe('per-task');
      expect(result.source).toBe('analysis.tasks');
      expect(result.steps).toHaveLength(1);
    });

    it('should reject per-task with empty source', () => {
      expect(() => PerTaskStepPartialSchema.parse({
        name: 'implement',
        type: 'per-task',
        source: '',
        steps: [],
      })).toThrow(ZodError);
    });

    it('should accept per-task with empty steps array', () => {
      const result = PerTaskStepPartialSchema.parse({
        name: 'implement',
        type: 'per-task',
        source: 'analysis.tasks',
        steps: [],
      });
      expect(result.steps).toHaveLength(0);
    });

    it('should reject per-task missing source', () => {
      expect(() => PerTaskStepPartialSchema.parse({
        name: 'implement',
        type: 'per-task',
        steps: [],
      })).toThrow(ZodError);
    });
  });

  // --- WorkflowSafetySchema ---

  describe('WorkflowSafetySchema', () => {
    it('should accept full safety block', () => {
      const result = WorkflowSafetySchema.parse({
        maxLoopRetries: 5,
        maxStepTimeoutMs: 60000,
        maxWorkflowDurationMs: 300000,
        failOnStepError: true,
      });
      expect(result.maxLoopRetries).toBe(5);
      expect(result.maxStepTimeoutMs).toBe(60000);
      expect(result.maxWorkflowDurationMs).toBe(300000);
      expect(result.failOnStepError).toBe(true);
    });

    it('should accept empty safety block with defaults', () => {
      const result = WorkflowSafetySchema.parse({});
      expect(result).toBeDefined();
    });

    it('should accept partial safety block', () => {
      const result = WorkflowSafetySchema.parse({
        maxLoopRetries: 10,
      });
      expect(result.maxLoopRetries).toBe(10);
    });
  });

  // --- WorkflowDefaultsSchema ---

  describe('WorkflowDefaultsSchema', () => {
    it('should accept defaults with agent field', () => {
      const result = WorkflowDefaultsSchema.parse({
        agent: 'my-agent',
        model: 'opus',
        permissionMode: 'bypassPermissions',
      });
      expect(result.agent).toBe('my-agent');
      expect(result.model).toBe('opus');
      expect(result.permissionMode).toBe('bypassPermissions');
    });

    it('should provide default values', () => {
      const result = WorkflowDefaultsSchema.parse({});
      expect(result.model).toBe('opus');
      expect(result.permissionMode).toBe('bypassPermissions');
    });

    it('should accept defaults with all fields', () => {
      const result = WorkflowDefaultsSchema.parse({
        agent: 'default-agent',
        model: 'sonnet',
        permissionMode: 'ask',
        settingSources: ['project', 'user'],
      });
      expect(result.agent).toBe('default-agent');
      expect(result.settingSources).toEqual(['project', 'user']);
    });
  });

  // --- validateStep() ---

  describe('validateStep()', () => {
    it('should validate agent+prompt step (no type field)', () => {
      const result = validateStep({
        name: 'analyze',
        agent: 'analyzer',
        prompt: 'analyze.md',
        output: 'analysis',
      });
      expect(result.name).toBe('analyze');
      expect('agent' in result && result.agent).toBe('analyzer');
    });

    it('should validate agent-only step (no type field)', () => {
      const result = validateStep({
        name: 'analyze',
        agent: 'analyzer',
        model: 'opus',
      });
      expect(result.name).toBe('analyze');
    });

    it('should validate code step', () => {
      const result = validateStep({
        name: 'run-handler',
        type: 'code',
        handler: 'handlers/test.ts',
      });
      expect(result.name).toBe('run-handler');
      expect('handler' in result && result.handler).toBe('handlers/test.ts');
    });

    it('should validate parallel step with nested steps', () => {
      const result = validateStep({
        name: 'run-gates',
        type: 'parallel',
        steps: [
          { name: 'gate-a', agent: 'reviewer' },
          { name: 'gate-b', agent: 'linter' },
        ],
      });
      expect(result.name).toBe('run-gates');
      expect((result as any).type).toBe('parallel');
      expect('steps' in result && result.steps).toHaveLength(2);
    });

    it('should validate per-task step with nested agent steps', () => {
      const result = validateStep({
        name: 'implement-tasks',
        type: 'per-task',
        source: 'analysis.tasks',
        steps: [
          { name: 'implement', agent: 'implementer' },
          { name: 'test', type: 'code', handler: 'handlers/test.ts' },
        ],
      });
      expect(result.name).toBe('implement-tasks');
      expect((result as any).type).toBe('per-task');
      expect('steps' in result && result.steps).toHaveLength(2);
    });

    it('should validate loop step with nested steps', () => {
      const result = validateStep({
        name: 'fix-loop',
        type: 'loop',
        condition: 'review.hasActionableIssues',
        maxRetries: 3,
        onExhausted: 'escalate',
        steps: [
          { name: 'fix', agent: 'fixer' },
          { name: 'review', type: 'parallel', steps: [{ name: 'gate-a', agent: 'reviewer' }] },
        ],
      });
      expect(result.name).toBe('fix-loop');
      expect((result as any).type).toBe('loop');
      expect('steps' in result && result.steps).toHaveLength(2);
    });

    it('should validate deeply nested steps (loop containing per-task)', () => {
      const result = validateStep({
        name: 'outer-loop',
        type: 'loop',
        condition: 'cond',
        maxRetries: 2,
        onExhausted: 'fail',
        steps: [
          {
            name: 'inner-per-task',
            type: 'per-task',
            source: 'tasks',
            steps: [
              { name: 'implement', agent: 'implementer' },
            ],
          },
        ],
      });
      expect((result as any).type).toBe('loop');
      const loopResult = result as { steps: Array<{ type: string; steps: unknown[] }> };
      expect(loopResult.steps[0].type).toBe('per-task');
      expect(loopResult.steps[0].steps).toHaveLength(1);
    });

    it('should throw for non-object step', () => {
      expect(() => validateStep(null)).toThrow('Step must be an object');
      expect(() => validateStep(undefined)).toThrow('Step must be an object');
      expect(() => validateStep('string')).toThrow('Step must be an object');
      expect(() => validateStep(42)).toThrow('Step must be an object');
    });

    it('should throw for step with no type and no agent/prompt', () => {
      expect(() => validateStep({
        name: 'bad-step',
      })).toThrow();
    });

    it('should throw for unknown step type', () => {
      expect(() => validateStep({
        name: 'unknown',
        type: 'magic',
        agent: 'a',
      })).toThrow('Unknown step type: magic');
    });

    it('should reject gate-group type (removed)', () => {
      expect(() => validateStep({
        name: 'review',
        type: 'gate-group',
        gates: 'gates/',
      })).toThrow('Unknown step type: gate-group');
    });

    it('should throw for invalid agent step in per-task nested steps', () => {
      expect(() => validateStep({
        name: 'per-task',
        type: 'per-task',
        source: 'tasks',
        steps: [
          { name: '', agent: 'implementer' }, // empty name
        ],
      })).toThrow(ZodError);
    });

    it('should throw for invalid nested step type in loop', () => {
      expect(() => validateStep({
        name: 'loop',
        type: 'loop',
        condition: 'cond',
        maxRetries: 1,
        onExhausted: 'fail',
        steps: [
          { name: 'bad', type: 'unknown-type' },
        ],
      })).toThrow('Unknown step type: unknown-type');
    });

    it('should validate step with enabled=false', () => {
      const result = validateStep({
        name: 'optional-step',
        agent: 'analyzer',
        enabled: false,
      });
      expect(result.name).toBe('optional-step');
      expect('enabled' in result && result.enabled).toBe(false);
    });

    it('should validate step with condition', () => {
      const result = validateStep({
        name: 'conditional-step',
        agent: 'analyzer',
        condition: 'analysis.tasks.length > 0',
      });
      expect('condition' in result && result.condition).toBe('analysis.tasks.length > 0');
    });
  });

  // --- validateWorkflowDefinition ---

  describe('validateWorkflowDefinition()', () => {
    it('should validate a complete workflow with new format', () => {
      const raw = {
        name: 'spec-implementation',
        version: 1,
        defaults: {
          agent: 'default-agent',
          model: 'opus',
          permissionMode: 'bypassPermissions',
          settingSources: ['project'],
        },
        safety: {
          maxLoopRetries: 5,
          maxStepTimeoutMs: 120000,
          failOnStepError: true,
        },
        phases: [
          {
            name: 'analyze',
            agent: 'analyzer',
            prompt: 'analyze.md',
            output: 'analysis',
          },
          {
            name: 'implement-tasks',
            type: 'per-task',
            source: 'analysis.tasks',
            steps: [
              { name: 'implement', agent: 'implementer', output: 'implementation' },
            ],
          },
          {
            name: 'review-gates',
            type: 'parallel',
            steps: [
              { name: 'code-review', agent: 'reviewer', prompt: 'review.md' },
              { name: 'lint-check', type: 'code', handler: 'handlers/lint.ts' },
            ],
            output: 'reviewResult',
          },
          {
            name: 'fix-loop',
            type: 'loop',
            condition: 'reviewResult.hasActionableIssues',
            maxRetries: 3,
            onExhausted: 'escalate',
            steps: [
              { name: 'fix', agent: 'fixer' },
              { name: 're-review', type: 'parallel', steps: [{ name: 'gate-a', agent: 'reviewer' }] },
            ],
          },
          {
            name: 'verify',
            agent: 'verifier',
            output: 'verification',
          },
          {
            name: 'publish',
            agent: 'publisher',
            output: 'publishResult',
          },
        ],
      };

      const result = validateWorkflowDefinition(raw);
      expect(result.name).toBe('spec-implementation');
      expect(result.version).toBe(1);
      expect(result.defaults?.model).toBe('opus');
      expect(result.defaults?.agent).toBe('default-agent');
      expect(result.safety?.maxLoopRetries).toBe(5);
      expect(result.safety?.failOnStepError).toBe(true);
      expect(result.phases).toHaveLength(6);
      expect(result.phases[0].name).toBe('analyze');
      expect((result.phases[1] as any).type).toBe('per-task');
      expect((result.phases[2] as any).type).toBe('parallel');
      expect((result.phases[3] as any).type).toBe('loop');
    });

    it('should validate workflow without defaults or safety', () => {
      const result = validateWorkflowDefinition({
        name: 'simple',
        version: 1,
        phases: [{ name: 'step1', agent: 'agent1' }],
      });
      expect(result.defaults).toBeUndefined();
      expect(result.safety).toBeUndefined();
      expect(result.phases).toHaveLength(1);
    });

    it('should accept safety block', () => {
      const result = validateWorkflowDefinition({
        name: 'safe-workflow',
        version: 1,
        safety: {
          maxLoopRetries: 10,
          maxWorkflowDurationMs: 600000,
        },
        phases: [{ name: 'step1', agent: 'agent1' }],
      });
      expect(result.safety?.maxLoopRetries).toBe(10);
      expect(result.safety?.maxWorkflowDurationMs).toBe(600000);
    });

    it('should accept defaults.agent field', () => {
      const result = validateWorkflowDefinition({
        name: 'w',
        version: 1,
        defaults: { agent: 'my-default-agent' },
        phases: [{ name: 'step1', agent: 'agent1' }],
      });
      expect(result.defaults?.agent).toBe('my-default-agent');
    });

    it('should throw on missing name', () => {
      expect(() => validateWorkflowDefinition({
        version: 1,
        phases: [{ name: 'a', agent: 'b' }],
      })).toThrow(ZodError);
    });

    it('should throw on invalid phases (step validation fails)', () => {
      expect(() => validateWorkflowDefinition({
        name: 'w',
        version: 1,
        phases: [{ name: '', agent: 'b' }],
      })).toThrow(ZodError);
    });

    it('should throw on empty phases', () => {
      expect(() => validateWorkflowDefinition({
        name: 'w',
        version: 1,
        phases: [],
      })).toThrow(ZodError);
    });
  });
});

// ============================================================================
// ANALYSIS SCHEMAS
// ============================================================================

describe('Analysis schemas', () => {

  describe('TaskDefinitionSchema', () => {
    it('should accept valid task with all fields', () => {
      const result = TaskDefinitionSchema.parse({
        id: 'task-1',
        title: 'Implement auth',
        description: 'Add authentication module',
        requirements: ['REQ-1', 'REQ-2'],
        dependencies: ['task-0'],
        estimatedComplexity: 'high',
        filePaths: ['src/auth.ts', 'src/auth.test.ts'],
      });
      expect(result.id).toBe('task-1');
      expect(result.requirements).toEqual(['REQ-1', 'REQ-2']);
      expect(result.dependencies).toEqual(['task-0']);
      expect(result.filePaths).toEqual(['src/auth.ts', 'src/auth.test.ts']);
    });

    it('should apply default empty arrays for dependencies and filePaths', () => {
      const result = TaskDefinitionSchema.parse({
        id: 'task-1',
        title: 'Task',
        description: 'Description',
        requirements: ['REQ-1'],
        estimatedComplexity: 'low',
      });
      expect(result.dependencies).toEqual([]);
      expect(result.filePaths).toEqual([]);
    });

    it('should accept all complexity levels', () => {
      for (const level of ['low', 'medium', 'high'] as const) {
        const result = TaskDefinitionSchema.parse({
          id: 't',
          title: 'T',
          description: 'D',
          requirements: [],
          estimatedComplexity: level,
        });
        expect(result.estimatedComplexity).toBe(level);
      }
    });

    it('should reject invalid complexity level', () => {
      expect(() => TaskDefinitionSchema.parse({
        id: 't',
        title: 'T',
        description: 'D',
        requirements: [],
        estimatedComplexity: 'extreme',
      })).toThrow(ZodError);
    });

    it('should reject task with empty id', () => {
      expect(() => TaskDefinitionSchema.parse({
        id: '',
        title: 'T',
        description: 'D',
        requirements: [],
        estimatedComplexity: 'low',
      })).toThrow(ZodError);
    });

    it('should reject task with empty title', () => {
      expect(() => TaskDefinitionSchema.parse({
        id: 't',
        title: '',
        description: 'D',
        requirements: [],
        estimatedComplexity: 'low',
      })).toThrow(ZodError);
    });

    it('should accept task with empty requirements array', () => {
      const result = TaskDefinitionSchema.parse({
        id: 't',
        title: 'T',
        description: 'D',
        requirements: [],
        estimatedComplexity: 'low',
      });
      expect(result.requirements).toEqual([]);
    });
  });

  describe('RequirementSchema', () => {
    it('should accept valid requirement', () => {
      const result = RequirementSchema.parse({
        id: 'REQ-1',
        description: 'Must support OAuth2',
        source: 'spec section 3.1',
        testable: true,
      });
      expect(result.id).toBe('REQ-1');
      expect(result.testable).toBe(true);
    });

    it('should accept non-testable requirement', () => {
      const result = RequirementSchema.parse({
        id: 'REQ-2',
        description: 'Should be intuitive',
        source: 'spec section 1',
        testable: false,
      });
      expect(result.testable).toBe(false);
    });

    it('should reject requirement missing testable', () => {
      expect(() => RequirementSchema.parse({
        id: 'REQ-1',
        description: 'desc',
        source: 'source',
      })).toThrow(ZodError);
    });

    it('should reject requirement with empty id', () => {
      expect(() => RequirementSchema.parse({
        id: '',
        description: 'desc',
        source: 'source',
        testable: true,
      })).toThrow(ZodError);
    });
  });

  describe('TechStackSchema', () => {
    it('should accept valid tech stack with all fields', () => {
      const result = TechStackSchema.parse({
        language: 'TypeScript',
        testFramework: 'Jest',
        buildTool: 'tsc',
      });
      expect(result.language).toBe('TypeScript');
      expect(result.buildTool).toBe('tsc');
    });

    it('should accept tech stack without optional buildTool', () => {
      const result = TechStackSchema.parse({
        language: 'Python',
        testFramework: 'pytest',
      });
      expect(result.buildTool).toBeUndefined();
    });

    it('should reject tech stack with empty language', () => {
      expect(() => TechStackSchema.parse({
        language: '',
        testFramework: 'jest',
      })).toThrow(ZodError);
    });

    it('should reject tech stack with empty testFramework', () => {
      expect(() => TechStackSchema.parse({
        language: 'TypeScript',
        testFramework: '',
      })).toThrow(ZodError);
    });
  });

  describe('AnalysisResultSchema', () => {
    it('should accept valid analysis result', () => {
      const result = AnalysisResultSchema.parse({
        tasks: [{
          id: 'task-1',
          title: 'Task 1',
          description: 'First task',
          requirements: ['REQ-1'],
          estimatedComplexity: 'medium',
        }],
        requirements: [{
          id: 'REQ-1',
          description: 'Must do X',
          source: 'spec',
          testable: true,
        }],
        constraints: ['Must use TypeScript'],
        techStack: {
          language: 'TypeScript',
          testFramework: 'Jest',
        },
      });
      expect(result.tasks).toHaveLength(1);
      expect(result.requirements).toHaveLength(1);
      expect(result.constraints).toEqual(['Must use TypeScript']);
    });

    it('should reject analysis with empty tasks array', () => {
      expect(() => AnalysisResultSchema.parse({
        tasks: [],
        requirements: [],
        constraints: [],
        techStack: { language: 'TS', testFramework: 'Jest' },
      })).toThrow(ZodError);
    });

    it('should accept analysis with empty requirements and constraints', () => {
      const result = AnalysisResultSchema.parse({
        tasks: [{
          id: 't1',
          title: 'T',
          description: 'D',
          requirements: [],
          estimatedComplexity: 'low',
        }],
        requirements: [],
        constraints: [],
        techStack: { language: 'TS', testFramework: 'Jest' },
      });
      expect(result.requirements).toEqual([]);
      expect(result.constraints).toEqual([]);
    });
  });
});

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

describe('Review schemas', () => {

  describe('ReviewIssueSchema', () => {
    it('should accept valid review issue with all fields', () => {
      const result = ReviewIssueSchema.parse({
        severity: 'critical',
        description: 'SQL injection vulnerability',
        file: 'src/db.ts',
        line: 42,
        fixInstructions: 'Use parameterized queries',
        foundBy: 'security-gate',
      });
      expect(result.severity).toBe('critical');
      expect(result.file).toBe('src/db.ts');
      expect(result.line).toBe(42);
      expect(result.foundBy).toBe('security-gate');
    });

    it('should accept review issue without optional fields', () => {
      const result = ReviewIssueSchema.parse({
        severity: 'minor',
        description: 'Style issue',
        fixInstructions: 'Add semicolon',
      });
      expect(result.file).toBeUndefined();
      expect(result.line).toBeUndefined();
      expect(result.foundBy).toBeUndefined();
    });

    it('should accept all severity levels', () => {
      for (const sev of ['critical', 'important', 'minor'] as const) {
        const result = ReviewIssueSchema.parse({
          severity: sev,
          description: 'Issue',
          fixInstructions: 'Fix it',
        });
        expect(result.severity).toBe(sev);
      }
    });

    it('should reject invalid severity', () => {
      expect(() => ReviewIssueSchema.parse({
        severity: 'low',
        description: 'Issue',
        fixInstructions: 'Fix it',
      })).toThrow(ZodError);
    });

    it('should reject non-positive line number', () => {
      expect(() => ReviewIssueSchema.parse({
        severity: 'minor',
        description: 'Issue',
        fixInstructions: 'Fix it',
        line: 0,
      })).toThrow(ZodError);
    });

    it('should reject negative line number', () => {
      expect(() => ReviewIssueSchema.parse({
        severity: 'minor',
        description: 'Issue',
        fixInstructions: 'Fix it',
        line: -1,
      })).toThrow(ZodError);
    });

    it('should reject non-integer line number', () => {
      expect(() => ReviewIssueSchema.parse({
        severity: 'minor',
        description: 'Issue',
        fixInstructions: 'Fix it',
        line: 1.5,
      })).toThrow(ZodError);
    });

    it('should reject empty description', () => {
      expect(() => ReviewIssueSchema.parse({
        severity: 'minor',
        description: '',
        fixInstructions: 'Fix it',
      })).toThrow(ZodError);
    });

    it('should reject empty fixInstructions', () => {
      expect(() => ReviewIssueSchema.parse({
        severity: 'minor',
        description: 'Issue',
        fixInstructions: '',
      })).toThrow(ZodError);
    });
  });

  describe('TestCoverageAssessmentSchema', () => {
    it('should accept adequate coverage with notes', () => {
      const result = TestCoverageAssessmentSchema.parse({
        adequate: true,
        notes: '90% line coverage',
      });
      expect(result.adequate).toBe(true);
      expect(result.notes).toBe('90% line coverage');
    });

    it('should accept assessment without notes', () => {
      const result = TestCoverageAssessmentSchema.parse({
        adequate: false,
      });
      expect(result.adequate).toBe(false);
      expect(result.notes).toBeUndefined();
    });
  });

  describe('ReviewResultSchema', () => {
    it('should accept approved review with no issues', () => {
      const result = ReviewResultSchema.parse({
        assessment: 'approved',
        issues: [],
        strengths: ['Clean code', 'Good naming'],
        hasActionableIssues: false,
      });
      expect(result.assessment).toBe('approved');
      expect(result.issues).toEqual([]);
      expect(result.strengths).toEqual(['Clean code', 'Good naming']);
    });

    it('should accept review needing revision with issues', () => {
      const result = ReviewResultSchema.parse({
        assessment: 'needs_revision',
        issues: [{
          severity: 'critical',
          description: 'Bug found',
          fixInstructions: 'Fix the bug',
        }],
        strengths: [],
        hasActionableIssues: true,
        testCoverage: { adequate: false, notes: 'Only 30%' },
      });
      expect(result.assessment).toBe('needs_revision');
      expect(result.issues).toHaveLength(1);
      expect(result.testCoverage?.adequate).toBe(false);
    });

    it('should accept review without testCoverage', () => {
      const result = ReviewResultSchema.parse({
        assessment: 'approved',
        issues: [],
        strengths: [],
        hasActionableIssues: false,
      });
      expect(result.testCoverage).toBeUndefined();
    });

    it('should reject invalid assessment value', () => {
      expect(() => ReviewResultSchema.parse({
        assessment: 'rejected',
        issues: [],
        strengths: [],
        hasActionableIssues: false,
      })).toThrow(ZodError);
    });
  });

  describe('AggregatedReviewResultSchema', () => {
    it('should accept valid aggregated result', () => {
      const result = AggregatedReviewResultSchema.parse({
        assessment: 'approved',
        issues: [],
        strengths: ['Good'],
        hasActionableIssues: false,
        gateResults: [
          { gate: 'security', assessment: 'approved', issueCount: 0 },
          { gate: 'style', assessment: 'approved', issueCount: 0 },
        ],
      });
      expect(result.gateResults).toHaveLength(2);
    });

    it('should accept aggregated result with empty gate results', () => {
      const result = AggregatedReviewResultSchema.parse({
        assessment: 'approved',
        issues: [],
        strengths: [],
        hasActionableIssues: false,
        gateResults: [],
      });
      expect(result.gateResults).toHaveLength(0);
    });

    it('should reject negative issueCount', () => {
      expect(() => AggregatedReviewResultSchema.parse({
        assessment: 'approved',
        issues: [],
        strengths: [],
        hasActionableIssues: false,
        gateResults: [
          { gate: 'g', assessment: 'approved', issueCount: -1 },
        ],
      })).toThrow(ZodError);
    });
  });

  // --- aggregateGateResults ---

  describe('aggregateGateResults()', () => {
    it('should return approved when no gates have actionable issues', () => {
      const result = aggregateGateResults([
        {
          gate: 'style',
          assessment: 'approved',
          issues: [],
          strengths: ['Clean'],
          hasActionableIssues: false,
        },
        {
          gate: 'docs',
          assessment: 'approved',
          issues: [{ severity: 'minor', description: 'Typo', fixInstructions: 'Fix typo' }],
          strengths: ['Well documented'],
          hasActionableIssues: false,
        },
      ]);
      expect(result.assessment).toBe('approved');
      expect(result.hasActionableIssues).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.strengths).toEqual(['Clean', 'Well documented']);
      expect(result.gateResults).toHaveLength(2);
      expect(result.gateResults[0]).toEqual({ gate: 'style', assessment: 'approved', issueCount: 0 });
      expect(result.gateResults[1]).toEqual({ gate: 'docs', assessment: 'approved', issueCount: 1 });
    });

    it('should return needs_revision when any gate has critical issues', () => {
      const result = aggregateGateResults([
        {
          gate: 'security',
          assessment: 'needs_revision',
          issues: [
            { severity: 'critical', description: 'XSS vulnerability', fixInstructions: 'Sanitize input' },
          ],
          strengths: [],
          hasActionableIssues: true,
        },
        {
          gate: 'style',
          assessment: 'approved',
          issues: [],
          strengths: ['Good style'],
          hasActionableIssues: false,
        },
      ]);
      expect(result.assessment).toBe('needs_revision');
      expect(result.hasActionableIssues).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.gateResults[0].issueCount).toBe(1);
      expect(result.gateResults[1].issueCount).toBe(0);
    });

    it('should return needs_revision when any gate has important issues', () => {
      const result = aggregateGateResults([
        {
          gate: 'code-quality',
          assessment: 'needs_revision',
          issues: [
            { severity: 'important', description: 'Missing error handling', fixInstructions: 'Add try/catch' },
          ],
          strengths: [],
          hasActionableIssues: true,
        },
      ]);
      expect(result.assessment).toBe('needs_revision');
      expect(result.hasActionableIssues).toBe(true);
    });

    it('should return approved when only minor issues exist', () => {
      const result = aggregateGateResults([
        {
          gate: 'style',
          assessment: 'approved',
          issues: [
            { severity: 'minor', description: 'Extra whitespace', fixInstructions: 'Remove whitespace' },
            { severity: 'minor', description: 'Long line', fixInstructions: 'Break line' },
          ],
          strengths: [],
          hasActionableIssues: false,
        },
      ]);
      expect(result.assessment).toBe('approved');
      expect(result.hasActionableIssues).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it('should handle empty gate results array', () => {
      const result = aggregateGateResults([]);
      expect(result.assessment).toBe('approved');
      expect(result.hasActionableIssues).toBe(false);
      expect(result.issues).toEqual([]);
      expect(result.strengths).toEqual([]);
      expect(result.gateResults).toEqual([]);
    });

    it('should aggregate issues and strengths from all gates', () => {
      const result = aggregateGateResults([
        {
          gate: 'gate-a',
          assessment: 'needs_revision',
          issues: [
            { severity: 'critical', description: 'Issue A1', fixInstructions: 'Fix A1' },
            { severity: 'minor', description: 'Issue A2', fixInstructions: 'Fix A2' },
          ],
          strengths: ['Strength A1'],
          hasActionableIssues: true,
        },
        {
          gate: 'gate-b',
          assessment: 'approved',
          issues: [
            { severity: 'minor', description: 'Issue B1', fixInstructions: 'Fix B1' },
          ],
          strengths: ['Strength B1', 'Strength B2'],
          hasActionableIssues: false,
        },
      ]);
      expect(result.issues).toHaveLength(3);
      expect(result.strengths).toEqual(['Strength A1', 'Strength B1', 'Strength B2']);
      expect(result.gateResults[0].issueCount).toBe(2);
      expect(result.gateResults[1].issueCount).toBe(1);
    });

    it('should preserve gate assessment even if aggregated differs', () => {
      const result = aggregateGateResults([
        {
          gate: 'gate-a',
          assessment: 'needs_revision',
          issues: [
            { severity: 'critical', description: 'Issue', fixInstructions: 'Fix' },
          ],
          strengths: [],
          hasActionableIssues: true,
        },
      ]);
      expect(result.gateResults[0].assessment).toBe('needs_revision');
      expect(result.assessment).toBe('needs_revision');
    });

    // --- minSeverity filtering ---

    it('should ignore minor issues when minSeverity is "important"', () => {
      const result = aggregateGateResults([
        {
          gate: 'style',
          assessment: 'needs_revision',
          issues: [
            { severity: 'minor', description: 'Whitespace issue', fixInstructions: 'Fix whitespace' },
            { severity: 'minor', description: 'Naming convention', fixInstructions: 'Rename variable' },
          ],
          strengths: [],
          hasActionableIssues: false,
        },
      ], { minSeverity: 'important' });
      expect(result.assessment).toBe('approved');
      expect(result.hasActionableIssues).toBe(false);
      // All issues are still included in the result for informational purposes
      expect(result.issues).toHaveLength(2);
    });

    it('should count important issues when minSeverity is "important"', () => {
      const result = aggregateGateResults([
        {
          gate: 'code-quality',
          assessment: 'needs_revision',
          issues: [
            { severity: 'important', description: 'Missing error handling', fixInstructions: 'Add try/catch' },
            { severity: 'minor', description: 'Long line', fixInstructions: 'Break line' },
          ],
          strengths: [],
          hasActionableIssues: true,
        },
      ], { minSeverity: 'important' });
      expect(result.assessment).toBe('needs_revision');
      expect(result.hasActionableIssues).toBe(true);
    });

    it('should only count critical issues when minSeverity is "critical"', () => {
      const result = aggregateGateResults([
        {
          gate: 'review',
          assessment: 'needs_revision',
          issues: [
            { severity: 'important', description: 'Missing docs', fixInstructions: 'Add docs' },
            { severity: 'minor', description: 'Style nit', fixInstructions: 'Fix style' },
          ],
          strengths: [],
          hasActionableIssues: true,
        },
      ], { minSeverity: 'critical' });
      // important + minor issues exist, but minSeverity is critical, so not actionable
      expect(result.assessment).toBe('approved');
      expect(result.hasActionableIssues).toBe(false);
    });

    it('should trigger on critical issues when minSeverity is "critical"', () => {
      const result = aggregateGateResults([
        {
          gate: 'security',
          assessment: 'needs_revision',
          issues: [
            { severity: 'critical', description: 'SQL injection', fixInstructions: 'Use parameterized queries' },
            { severity: 'minor', description: 'Naming nit', fixInstructions: 'Rename' },
          ],
          strengths: [],
          hasActionableIssues: true,
        },
      ], { minSeverity: 'critical' });
      expect(result.assessment).toBe('needs_revision');
      expect(result.hasActionableIssues).toBe(true);
    });

    it('should default to current behavior (minor counts as not actionable) when no minSeverity', () => {
      // Backward compatibility: without minSeverity, the default behavior
      // counts critical + important as actionable (minor is not actionable)
      const result = aggregateGateResults([
        {
          gate: 'style',
          assessment: 'approved',
          issues: [
            { severity: 'minor', description: 'Whitespace', fixInstructions: 'Fix' },
          ],
          strengths: [],
          hasActionableIssues: false,
        },
      ]);
      expect(result.assessment).toBe('approved');
      expect(result.hasActionableIssues).toBe(false);
    });

    it('should treat minSeverity "minor" as counting all issues as actionable', () => {
      const result = aggregateGateResults([
        {
          gate: 'pedantic',
          assessment: 'approved',
          issues: [
            { severity: 'minor', description: 'Extra space', fixInstructions: 'Remove space' },
          ],
          strengths: [],
          hasActionableIssues: false,
        },
      ], { minSeverity: 'minor' });
      expect(result.assessment).toBe('needs_revision');
      expect(result.hasActionableIssues).toBe(true);
    });
  });
});

// ============================================================================
// IMPLEMENTATION SCHEMAS
// ============================================================================

describe('Implementation schemas', () => {

  describe('FileChangeSchema', () => {
    it('should accept valid file change', () => {
      const result = FileChangeSchema.parse({
        path: 'src/auth.ts',
        action: 'created',
        linesAdded: 150,
        linesRemoved: 0,
      });
      expect(result.path).toBe('src/auth.ts');
      expect(result.action).toBe('created');
    });

    it('should accept all action types', () => {
      for (const action of ['created', 'modified', 'deleted'] as const) {
        const result = FileChangeSchema.parse({
          path: 'file.ts',
          action,
          linesAdded: 0,
          linesRemoved: 0,
        });
        expect(result.action).toBe(action);
      }
    });

    it('should accept zero lines added/removed', () => {
      const result = FileChangeSchema.parse({
        path: 'file.ts',
        action: 'modified',
        linesAdded: 0,
        linesRemoved: 0,
      });
      expect(result.linesAdded).toBe(0);
      expect(result.linesRemoved).toBe(0);
    });

    it('should reject negative linesAdded', () => {
      expect(() => FileChangeSchema.parse({
        path: 'file.ts',
        action: 'modified',
        linesAdded: -1,
        linesRemoved: 0,
      })).toThrow(ZodError);
    });

    it('should reject negative linesRemoved', () => {
      expect(() => FileChangeSchema.parse({
        path: 'file.ts',
        action: 'modified',
        linesAdded: 0,
        linesRemoved: -1,
      })).toThrow(ZodError);
    });

    it('should reject invalid action', () => {
      expect(() => FileChangeSchema.parse({
        path: 'file.ts',
        action: 'renamed',
        linesAdded: 0,
        linesRemoved: 0,
      })).toThrow(ZodError);
    });

    it('should reject empty path', () => {
      expect(() => FileChangeSchema.parse({
        path: '',
        action: 'created',
        linesAdded: 0,
        linesRemoved: 0,
      })).toThrow(ZodError);
    });
  });

  describe('TestResultsSchema', () => {
    it('should accept valid test results', () => {
      const result = TestResultsSchema.parse({
        total: 100,
        passed: 95,
        failed: 5,
        exitCode: 1,
      });
      expect(result.total).toBe(100);
      expect(result.passed).toBe(95);
      expect(result.failed).toBe(5);
      expect(result.exitCode).toBe(1);
    });

    it('should accept all zeros', () => {
      const result = TestResultsSchema.parse({
        total: 0,
        passed: 0,
        failed: 0,
        exitCode: 0,
      });
      expect(result.total).toBe(0);
    });

    it('should accept negative exit code (signal-based)', () => {
      const result = TestResultsSchema.parse({
        total: 10,
        passed: 0,
        failed: 10,
        exitCode: -1,
      });
      expect(result.exitCode).toBe(-1);
    });

    it('should reject negative total', () => {
      expect(() => TestResultsSchema.parse({
        total: -1,
        passed: 0,
        failed: 0,
        exitCode: 0,
      })).toThrow(ZodError);
    });

    it('should reject non-integer values', () => {
      expect(() => TestResultsSchema.parse({
        total: 10.5,
        passed: 10,
        failed: 0,
        exitCode: 0,
      })).toThrow(ZodError);
    });
  });

  describe('TddFunctionCertSchema', () => {
    it('should accept valid TDD function cert', () => {
      const result = TddFunctionCertSchema.parse({
        name: 'authenticate',
        testFile: 'src/auth.test.ts',
        watchedFail: true,
        watchedPass: true,
      });
      expect(result.name).toBe('authenticate');
      expect(result.watchedFail).toBe(true);
      expect(result.watchedPass).toBe(true);
    });

    it('should accept cert where test was not watched failing', () => {
      const result = TddFunctionCertSchema.parse({
        name: 'helper',
        testFile: 'test.ts',
        watchedFail: false,
        watchedPass: true,
      });
      expect(result.watchedFail).toBe(false);
    });

    it('should reject empty name', () => {
      expect(() => TddFunctionCertSchema.parse({
        name: '',
        testFile: 'test.ts',
        watchedFail: true,
        watchedPass: true,
      })).toThrow(ZodError);
    });

    it('should reject empty testFile', () => {
      expect(() => TddFunctionCertSchema.parse({
        name: 'fn',
        testFile: '',
        watchedFail: true,
        watchedPass: true,
      })).toThrow(ZodError);
    });
  });

  describe('TddCertificationSchema', () => {
    it('should accept valid certification with functions', () => {
      const result = TddCertificationSchema.parse({
        functions: [
          { name: 'fn1', testFile: 'test1.ts', watchedFail: true, watchedPass: true },
          { name: 'fn2', testFile: 'test2.ts', watchedFail: true, watchedPass: true },
        ],
      });
      expect(result.functions).toHaveLength(2);
    });

    it('should accept certification with empty functions array', () => {
      const result = TddCertificationSchema.parse({ functions: [] });
      expect(result.functions).toEqual([]);
    });
  });

  describe('ImplementResultSchema', () => {
    it('should accept valid implementation result', () => {
      const result = ImplementResultSchema.parse({
        filesChanged: [
          { path: 'src/a.ts', action: 'created', linesAdded: 50, linesRemoved: 0 },
        ],
        testResults: { total: 5, passed: 5, failed: 0, exitCode: 0 },
        tddCertification: {
          functions: [
            { name: 'doThing', testFile: 'test.ts', watchedFail: true, watchedPass: true },
          ],
        },
        commits: ['abc1234', 'def5678'],
      });
      expect(result.filesChanged).toHaveLength(1);
      expect(result.commits).toEqual(['abc1234', 'def5678']);
    });

    it('should accept empty arrays for filesChanged and commits', () => {
      const result = ImplementResultSchema.parse({
        filesChanged: [],
        testResults: { total: 0, passed: 0, failed: 0, exitCode: 0 },
        tddCertification: { functions: [] },
        commits: [],
      });
      expect(result.filesChanged).toEqual([]);
      expect(result.commits).toEqual([]);
    });

    it('should reject missing testResults', () => {
      expect(() => ImplementResultSchema.parse({
        filesChanged: [],
        tddCertification: { functions: [] },
        commits: [],
      })).toThrow(ZodError);
    });

    it('should reject missing tddCertification', () => {
      expect(() => ImplementResultSchema.parse({
        filesChanged: [],
        testResults: { total: 0, passed: 0, failed: 0, exitCode: 0 },
        commits: [],
      })).toThrow(ZodError);
    });
  });
});

// ============================================================================
// FIX SCHEMAS
// ============================================================================

describe('Fix schemas', () => {

  describe('FixActionSchema', () => {
    it('should accept valid fix action', () => {
      const result = FixActionSchema.parse({
        issueDescription: 'SQL injection vulnerability',
        severity: 'critical',
        action: 'fixed',
        explanation: 'Added parameterized queries',
        filesModified: ['src/db.ts'],
      });
      expect(result.action).toBe('fixed');
      expect(result.filesModified).toEqual(['src/db.ts']);
    });

    it('should accept all action types', () => {
      for (const action of ['fixed', 'disputed', 'deferred'] as const) {
        const result = FixActionSchema.parse({
          issueDescription: 'Issue',
          severity: 'minor',
          action,
          explanation: 'Reason',
          filesModified: [],
        });
        expect(result.action).toBe(action);
      }
    });

    it('should accept all severity levels', () => {
      for (const sev of ['critical', 'important', 'minor'] as const) {
        const result = FixActionSchema.parse({
          issueDescription: 'Issue',
          severity: sev,
          action: 'fixed',
          explanation: 'Done',
          filesModified: [],
        });
        expect(result.severity).toBe(sev);
      }
    });

    it('should accept empty filesModified array', () => {
      const result = FixActionSchema.parse({
        issueDescription: 'Issue',
        severity: 'minor',
        action: 'disputed',
        explanation: 'Not a real issue',
        filesModified: [],
      });
      expect(result.filesModified).toEqual([]);
    });

    it('should reject empty issueDescription', () => {
      expect(() => FixActionSchema.parse({
        issueDescription: '',
        severity: 'minor',
        action: 'fixed',
        explanation: 'Done',
        filesModified: [],
      })).toThrow(ZodError);
    });

    it('should reject empty explanation', () => {
      expect(() => FixActionSchema.parse({
        issueDescription: 'Issue',
        severity: 'minor',
        action: 'fixed',
        explanation: '',
        filesModified: [],
      })).toThrow(ZodError);
    });

    it('should reject invalid action type', () => {
      expect(() => FixActionSchema.parse({
        issueDescription: 'Issue',
        severity: 'minor',
        action: 'ignored',
        explanation: 'Reason',
        filesModified: [],
      })).toThrow(ZodError);
    });
  });

  describe('FixResultSchema', () => {
    it('should accept valid fix result', () => {
      const result = FixResultSchema.parse({
        fixesApplied: [
          {
            issueDescription: 'Bug',
            severity: 'critical',
            action: 'fixed',
            explanation: 'Fixed the bug',
            filesModified: ['src/a.ts'],
          },
        ],
        testResults: { total: 10, passed: 10, failed: 0, exitCode: 0 },
        commits: ['abc123'],
        disputedIssues: [],
      });
      expect(result.fixesApplied).toHaveLength(1);
      expect(result.commits).toEqual(['abc123']);
    });

    it('should accept fix result with disputed issues', () => {
      const result = FixResultSchema.parse({
        fixesApplied: [],
        testResults: { total: 0, passed: 0, failed: 0, exitCode: 0 },
        commits: [],
        disputedIssues: [
          { description: 'False positive', reason: 'Not applicable to this context' },
        ],
      });
      expect(result.disputedIssues).toHaveLength(1);
    });

    it('should accept fix result with all empty arrays', () => {
      const result = FixResultSchema.parse({
        fixesApplied: [],
        testResults: { total: 0, passed: 0, failed: 0, exitCode: 0 },
        commits: [],
        disputedIssues: [],
      });
      expect(result.fixesApplied).toEqual([]);
    });

    it('should reject missing testResults', () => {
      expect(() => FixResultSchema.parse({
        fixesApplied: [],
        commits: [],
        disputedIssues: [],
      })).toThrow(ZodError);
    });
  });
});

// ============================================================================
// VERIFICATION SCHEMAS
// ============================================================================

describe('Verification schemas', () => {

  describe('RequirementVerificationSchema', () => {
    it('should accept valid met requirement', () => {
      const result = RequirementVerificationSchema.parse({
        id: 'REQ-1',
        description: 'Must support OAuth2',
        met: true,
        evidence: 'OAuth2 flow tested in integration tests',
      });
      expect(result.met).toBe(true);
    });

    it('should accept valid unmet requirement', () => {
      const result = RequirementVerificationSchema.parse({
        id: 'REQ-2',
        description: 'Must support SAML',
        met: false,
        evidence: 'SAML not implemented yet',
      });
      expect(result.met).toBe(false);
    });

    it('should reject empty id', () => {
      expect(() => RequirementVerificationSchema.parse({
        id: '',
        description: 'desc',
        met: true,
        evidence: 'evidence',
      })).toThrow(ZodError);
    });

    it('should reject empty evidence', () => {
      expect(() => RequirementVerificationSchema.parse({
        id: 'REQ-1',
        description: 'desc',
        met: true,
        evidence: '',
      })).toThrow(ZodError);
    });

    it('should reject missing met field', () => {
      expect(() => RequirementVerificationSchema.parse({
        id: 'REQ-1',
        description: 'desc',
        evidence: 'evidence',
      })).toThrow(ZodError);
    });
  });

  describe('VerifyResultSchema', () => {
    it('should accept valid verification result', () => {
      const result = VerifyResultSchema.parse({
        testSuite: {
          total: 50,
          passed: 48,
          failed: 2,
          exitCode: 1,
          coverage: 85.5,
        },
        requirements: [
          { id: 'REQ-1', description: 'desc', met: true, evidence: 'tests pass' },
        ],
        gitClean: true,
      });
      expect(result.testSuite.total).toBe(50);
      expect(result.testSuite.coverage).toBe(85.5);
      expect(result.gitClean).toBe(true);
    });

    it('should accept verification without coverage', () => {
      const result = VerifyResultSchema.parse({
        testSuite: { total: 10, passed: 10, failed: 0, exitCode: 0 },
        requirements: [],
        gitClean: false,
      });
      expect(result.testSuite.coverage).toBeUndefined();
    });

    it('should accept coverage of 0', () => {
      const result = VerifyResultSchema.parse({
        testSuite: { total: 0, passed: 0, failed: 0, exitCode: 0, coverage: 0 },
        requirements: [],
        gitClean: true,
      });
      expect(result.testSuite.coverage).toBe(0);
    });

    it('should accept coverage of 100', () => {
      const result = VerifyResultSchema.parse({
        testSuite: { total: 1, passed: 1, failed: 0, exitCode: 0, coverage: 100 },
        requirements: [],
        gitClean: true,
      });
      expect(result.testSuite.coverage).toBe(100);
    });

    it('should reject coverage over 100', () => {
      expect(() => VerifyResultSchema.parse({
        testSuite: { total: 1, passed: 1, failed: 0, exitCode: 0, coverage: 101 },
        requirements: [],
        gitClean: true,
      })).toThrow(ZodError);
    });

    it('should reject negative coverage', () => {
      expect(() => VerifyResultSchema.parse({
        testSuite: { total: 1, passed: 1, failed: 0, exitCode: 0, coverage: -1 },
        requirements: [],
        gitClean: true,
      })).toThrow(ZodError);
    });

    it('should accept empty requirements array', () => {
      const result = VerifyResultSchema.parse({
        testSuite: { total: 0, passed: 0, failed: 0, exitCode: 0 },
        requirements: [],
        gitClean: true,
      });
      expect(result.requirements).toEqual([]);
    });

    it('should reject missing gitClean', () => {
      expect(() => VerifyResultSchema.parse({
        testSuite: { total: 0, passed: 0, failed: 0, exitCode: 0 },
        requirements: [],
      })).toThrow(ZodError);
    });
  });
});

// ============================================================================
// PUBLISH SCHEMAS
// ============================================================================

describe('Publish schemas', () => {

  describe('PublishResultSchema', () => {
    it('should accept valid publish result', () => {
      const result = PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/42',
        prNumber: 42,
        branchName: 'feat/auth',
        commitCount: 5,
        summary: 'Implemented authentication system with OAuth2',
      });
      expect(result.prUrl).toBe('https://github.com/org/repo/pull/42');
      expect(result.prNumber).toBe(42);
      expect(result.branchName).toBe('feat/auth');
      expect(result.commitCount).toBe(5);
    });

    it('should accept publish result with zero commits', () => {
      const result = PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
        prNumber: 1,
        branchName: 'fix/typo',
        commitCount: 0,
        summary: 'Fixed typo',
      });
      expect(result.commitCount).toBe(0);
    });

    it('should reject invalid URL', () => {
      expect(() => PublishResultSchema.parse({
        prUrl: 'not-a-url',
        prNumber: 1,
        branchName: 'main',
        commitCount: 0,
        summary: 'Summary',
      })).toThrow(ZodError);
    });

    it('should reject non-positive prNumber', () => {
      expect(() => PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
        prNumber: 0,
        branchName: 'main',
        commitCount: 0,
        summary: 'Summary',
      })).toThrow(ZodError);
    });

    it('should reject negative prNumber', () => {
      expect(() => PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
        prNumber: -1,
        branchName: 'main',
        commitCount: 0,
        summary: 'Summary',
      })).toThrow(ZodError);
    });

    it('should reject empty branchName', () => {
      expect(() => PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
        prNumber: 1,
        branchName: '',
        commitCount: 0,
        summary: 'Summary',
      })).toThrow(ZodError);
    });

    it('should reject empty summary', () => {
      expect(() => PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
        prNumber: 1,
        branchName: 'main',
        commitCount: 0,
        summary: '',
      })).toThrow(ZodError);
    });

    it('should reject negative commitCount', () => {
      expect(() => PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
        prNumber: 1,
        branchName: 'main',
        commitCount: -1,
        summary: 'Summary',
      })).toThrow(ZodError);
    });

    it('should reject missing required fields', () => {
      expect(() => PublishResultSchema.parse({})).toThrow(ZodError);
      expect(() => PublishResultSchema.parse({
        prUrl: 'https://github.com/org/repo/pull/1',
      })).toThrow(ZodError);
    });
  });
});
