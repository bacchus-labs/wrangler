/**
 * Zod schemas for YAML workflow definitions and agent/gate markdown frontmatter.
 * These schemas validate the declarative configuration files.
 */

import { z } from 'zod';

// --- Step Definitions (recursive) ---

const BaseStepSchema = z.object({
  name: z.string().min(1),
  output: z.string().optional(),
});

export const AgentStepSchema = BaseStepSchema.extend({
  type: z.literal('agent').optional(), // default type
  agent: z.string().min(1),
  model: z.string().optional(),
  input: z.string().optional(),
  failWhen: z.string().optional(),
});

export const CodeStepSchema = BaseStepSchema.extend({
  type: z.literal('code'),
  handler: z.string().min(1),
  input: z.string().optional(),
});

export const GateGroupStepSchema = BaseStepSchema.extend({
  type: z.literal('gate-group'),
  gates: z.string().min(1),
  minSeverity: z.enum(['critical', 'important', 'minor']).optional(),
});

// Forward-declare for recursive types
export type StepDefinition =
  | z.infer<typeof AgentStepSchema>
  | z.infer<typeof CodeStepSchema>
  | z.infer<typeof GateGroupStepSchema>
  | PerTaskStep
  | LoopStep;

export interface PerTaskStep {
  name: string;
  type: 'per-task';
  source: string;
  output?: string;
  steps: StepDefinition[];
}

export interface LoopStep {
  name: string;
  type: 'loop';
  condition: string;
  maxRetries: number;
  onExhausted: 'escalate' | 'warn' | 'fail';
  output?: string;
  steps: StepDefinition[];
}

// Non-recursive schemas for validation (we handle nesting manually)
export const LoopStepPartialSchema = BaseStepSchema.extend({
  type: z.literal('loop'),
  condition: z.string().min(1),
  maxRetries: z.number().int().positive(),
  onExhausted: z.enum(['escalate', 'warn', 'fail']),
  steps: z.array(z.any()), // validated recursively
});

export const PerTaskStepPartialSchema = BaseStepSchema.extend({
  type: z.literal('per-task'),
  source: z.string().min(1),
  steps: z.array(z.any()), // validated recursively
});

// --- Workflow Definition ---

export const WorkflowDefaultsSchema = z.object({
  model: z.string().default('opus'),
  permissionMode: z.string().default('bypassPermissions'),
  settingSources: z.array(z.string()).default(['project']),
});

export type WorkflowDefaults = z.infer<typeof WorkflowDefaultsSchema>;

export const WorkflowDefinitionSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
  defaults: WorkflowDefaultsSchema.optional(),
  phases: z.array(z.any()).min(1), // validated recursively via validateStep
});

export type WorkflowDefinition = {
  name: string;
  version: number;
  defaults?: WorkflowDefaults;
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
  const type = obj.type ?? 'agent';

  switch (type) {
    case 'agent':
      return AgentStepSchema.parse(raw);

    case 'code':
      return CodeStepSchema.parse(raw);

    case 'gate-group':
      return GateGroupStepSchema.parse(raw);

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
    phases,
  };
}
