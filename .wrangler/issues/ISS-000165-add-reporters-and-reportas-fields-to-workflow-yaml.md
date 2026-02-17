---
id: ISS-000165
title: Add reporters and reportAs fields to workflow YAML schema
type: issue
status: open
priority: high
labels:
  - SPEC-000050
  - workflow-engine
  - schema
createdAt: '2026-02-17T20:07:44.963Z'
updatedAt: '2026-02-17T20:07:44.963Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Add `reporters` array to `WorkflowDefinitionSchema` and `reportAs`/`runOn` fields to `BaseStepSchema` in `workflows/engine/src/schemas/workflow.ts`.

## Requirements
- FR-001: `reporters` is an optional array at workflow top level
- FR-002: Each reporter entry has `type: string` and optional `config: Record<string, unknown>`
- FR-003: `reportAs` field on steps: `'visible'` (default), `'silent'`, `'summary'`
- FR-015: `runOn` field on steps: `'local'` (default), `'github'` (future)

## Implementation
File: `workflows/engine/src/schemas/workflow.ts`

Add:
```typescript
const ReporterConfigSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.any()).optional(),
});

// Add to BaseStepSchema:
reportAs: z.enum(['visible', 'silent', 'summary']).default('visible'),
runOn: z.enum(['local', 'github']).default('local'),

// Add to WorkflowDefinitionSchema:
reporters: z.array(ReporterConfigSchema).optional(),
```

Update `WorkflowDefinition` type and `validateWorkflowDefinition` to pass through the new fields.

## Verification
- Existing workflow YAML (spec-implementation.yaml) still parses without changes
- New fields are accepted when present
- Defaults apply correctly (reportAs='visible', runOn='local')
- Invalid values rejected by Zod
