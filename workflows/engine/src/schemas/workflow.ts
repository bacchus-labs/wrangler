/**
 * Zod schemas for YAML workflow definitions and agent/gate markdown frontmatter.
 * These schemas validate the declarative configuration files.
 *
 * Step model (v2):
 * - Steps without a `type` field are agent+prompt steps (must have agent and/or prompt)
 * - type: 'code' requires handler
 * - type: 'parallel' requires steps
 * - type: 'loop' requires steps and condition
 * - type: 'per-task' requires steps and source
 */

import { z } from 'zod';

// --- Shared base fields ---

const BaseStepSchema = z.object({
  name: z.string().min(1),
  output: z.string().optional(),
  enabled: z.boolean().default(true),
  condition: z.string().optional(),
  input: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
});

// --- Agent+Prompt step (no type field, or omitted type) ---

export const AgentPromptStepSchema = BaseStepSchema.extend({
  agent: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  model: z.string().optional(),
  failWhen: z.string().optional(),
});

// --- Code step ---

export const CodeStepSchema = BaseStepSchema.extend({
  type: z.literal('code'),
  handler: z.string().min(1),
});

// --- Parallel step ---

export const ParallelStepPartialSchema = BaseStepSchema.extend({
  type: z.literal('parallel'),
  steps: z.array(z.any()), // validated recursively
});

// --- Loop step ---

export const LoopStepPartialSchema = BaseStepSchema.extend({
  type: z.literal('loop'),
  condition: z.string().min(1),
  maxRetries: z.number().int().positive().default(3),
  onExhausted: z.enum(['escalate', 'warn', 'fail']).default('escalate'),
  steps: z.array(z.any()), // validated recursively
});

// --- Per-task step ---

export const PerTaskStepPartialSchema = BaseStepSchema.extend({
  type: z.literal('per-task'),
  source: z.string().min(1),
  steps: z.array(z.any()), // validated recursively
});

// --- Forward-declare recursive types ---

export type StepDefinition =
  | (z.infer<typeof AgentPromptStepSchema>)
  | (z.infer<typeof CodeStepSchema>)
  | ParallelStep
  | PerTaskStep
  | LoopStep;

export interface ParallelStep {
  name: string;
  type: 'parallel';
  output?: string;
  enabled?: boolean;
  condition?: string;
  input?: string | Record<string, unknown>;
  steps: StepDefinition[];
}

export interface PerTaskStep {
  name: string;
  type: 'per-task';
  source: string;
  output?: string;
  enabled?: boolean;
  condition?: string;
  input?: string | Record<string, unknown>;
  steps: StepDefinition[];
}

export interface LoopStep {
  name: string;
  type: 'loop';
  condition: string;
  maxRetries: number;
  onExhausted: 'escalate' | 'warn' | 'fail';
  output?: string;
  enabled?: boolean;
  input?: string | Record<string, unknown>;
  steps: StepDefinition[];
}

// --- Safety block ---

export const WorkflowSafetySchema = z.object({
  maxLoopRetries: z.number().int().positive().optional(),
  maxStepTimeoutMs: z.number().int().positive().optional(),
  maxWorkflowDurationMs: z.number().int().positive().optional(),
  failOnStepError: z.boolean().optional(),
});

export type WorkflowSafety = z.infer<typeof WorkflowSafetySchema>;

// --- Workflow Defaults ---

export const WorkflowDefaultsSchema = z.object({
  agent: z.string().optional(),
  model: z.string().default('opus'),
  permissionMode: z.string().default('bypassPermissions'),
  settingSources: z.array(z.string()).default(['project']),
});

export type WorkflowDefaults = z.infer<typeof WorkflowDefaultsSchema>;

// --- Workflow Definition ---

export const WorkflowDefinitionSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  defaults: WorkflowDefaultsSchema.optional(),
  safety: WorkflowSafetySchema.optional(),
  phases: z.array(z.any()).min(1), // validated recursively via validateStep
});

export type WorkflowDefinition = {
  name: string;
  version: number;
  defaults?: WorkflowDefaults;
  safety?: WorkflowSafety;
  phases: StepDefinition[];
};

// --- Agent Definition (markdown frontmatter) ---

export const AgentDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tools: z.array(z.string()),
  model: z.string().optional(),
  outputSchema: z.string().optional(),
});

export type AgentDefinitionFrontmatter = z.infer<typeof AgentDefinitionSchema>;

export interface AgentDefinition extends AgentDefinitionFrontmatter {
  /** The markdown body (prompt template) */
  prompt: string;
  /** Original file path */
  filePath: string;
}

// --- Gate Definition (extends agent definition) ---

export const GateDefinitionSchema = AgentDefinitionSchema.extend({
  runCondition: z.enum(['always', 'changed-files-match', 'manual']).default('always'),
  filePatterns: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
});

export type GateDefinitionFrontmatter = z.infer<typeof GateDefinitionSchema>;

export interface GateDefinition extends GateDefinitionFrontmatter {
  /** The markdown body (prompt template) */
  prompt: string;
  /** Original file path */
  filePath: string;
}

// --- Backward compatibility aliases ---
// These are kept so existing code importing the old names still compiles.

/** @deprecated Use AgentPromptStepSchema */
export const AgentStepSchema = AgentPromptStepSchema;

// --- Step Validation ---

/**
 * Recursively validate a step definition from parsed YAML.
 * Returns the validated step or throws a ZodError.
 */
export function validateStep(raw: unknown): StepDefinition {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Step must be an object');
  }

  const obj = raw as Record<string, unknown>;
  const type = obj.type as string | undefined;

  // If no type is specified, it's an agent+prompt step
  if (!type) {
    // Must have at least agent or prompt
    if (!obj.agent && !obj.prompt) {
      throw new Error(
        'Step without a type must have at least "agent" or "prompt" field'
      );
    }
    return AgentPromptStepSchema.parse(raw);
  }

  switch (type) {
    case 'agent':
      // Legacy: type: 'agent' is treated as agent+prompt step
      return AgentPromptStepSchema.parse(raw);

    case 'gate-group': {
      // Legacy: gate-group accepted for backward compat with existing workflows
      const base = BaseStepSchema.parse(raw);
      return { ...obj, ...base } as unknown as StepDefinition;
    }

    case 'code':
      return CodeStepSchema.parse(raw);

    case 'parallel': {
      const partial = ParallelStepPartialSchema.parse(raw);
      const steps = (partial.steps as unknown[]).map(validateStep);
      return { ...partial, steps } as ParallelStep;
    }

    case 'per-task': {
      const partial = PerTaskStepPartialSchema.parse(raw);
      const steps = (partial.steps as unknown[]).map(validateStep);
      return { ...partial, steps } as PerTaskStep;
    }

    case 'loop': {
      const partial = LoopStepPartialSchema.parse(raw);
      const steps = (partial.steps as unknown[]).map(validateStep);
      return { ...partial, steps } as LoopStep;
    }

    default:
      throw new Error(`Unknown step type: ${type}`);
  }
}

/**
 * Validate an entire workflow definition from parsed YAML.
 */
export function validateWorkflowDefinition(raw: unknown): WorkflowDefinition {
  const parsed = WorkflowDefinitionSchema.parse(raw);
  const phases = (parsed.phases as unknown[]).map(validateStep);
  return {
    name: parsed.name,
    version: parsed.version,
    defaults: parsed.defaults,
    safety: parsed.safety,
    phases,
  };
}
