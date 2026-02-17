---
id: ISS-000167
title: Implement ReporterRegistry
type: issue
status: open
priority: high
labels:
  - SPEC-000050
  - workflow-engine
createdAt: '2026-02-17T20:07:56.773Z'
updatedAt: '2026-02-17T20:07:56.773Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Create the ReporterRegistry that maps reporter type strings to factory functions.

## Requirements
- `register(type, factory)` to register reporter factories
- `create(type, config)` to instantiate a reporter by type
- `createDefaultReporterRegistry()` factory function (initially empty, github-pr-comment added in later issue)
- Throw clear error for unknown reporter types

## Implementation
File: `workflows/engine/src/reporters/registry.ts`

```typescript
export type ReporterFactory = (config: Record<string, unknown>) => WorkflowReporter;

export class ReporterRegistry {
  private factories = new Map<string, ReporterFactory>();
  register(type: string, factory: ReporterFactory): void { ... }
  create(type: string, config: Record<string, unknown>): WorkflowReporter { ... }
  has(type: string): boolean { ... }
}

export function createDefaultReporterRegistry(): ReporterRegistry { ... }
```

## Verification
- Can register and create reporters
- Unknown type throws descriptive error
- Default registry is created without errors
