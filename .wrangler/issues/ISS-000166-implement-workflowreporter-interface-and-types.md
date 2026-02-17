---
id: ISS-000166
title: Implement WorkflowReporter interface and types
type: issue
status: open
priority: high
labels:
  - SPEC-000050
  - workflow-engine
  - types
createdAt: '2026-02-17T20:07:51.342Z'
updatedAt: '2026-02-17T20:07:51.342Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Create the reporter type definitions and interface at `workflows/engine/src/reporters/types.ts`.

## Requirements
- Define `StepVisibility` type: `'visible' | 'silent' | 'summary'`
- Define `ReporterConfig` interface: `{ type: string; config?: Record<string, unknown> }`
- Define `WorkflowReporter` interface with lifecycle methods: `initialize`, `onAuditEntry`, `onComplete`, `onError`, `dispose`
- Define `ReporterContext` interface: `{ sessionId, specFile, branchName, worktreePath }`

## Implementation
File: `workflows/engine/src/reporters/types.ts`

```typescript
export type StepVisibility = 'visible' | 'silent' | 'summary';

export interface ReporterConfig {
  type: string;
  config?: Record<string, unknown>;
}

export interface WorkflowReporter {
  initialize(workflow: WorkflowDefinition, context: ReporterContext): Promise<void>;
  onAuditEntry(entry: WorkflowAuditEntry, visibility: StepVisibility): Promise<void>;
  onComplete(summary: ExecutionSummary): Promise<void>;
  onError(error: Error, lastEntry?: WorkflowAuditEntry): Promise<void>;
  dispose(): Promise<void>;
}

export interface ReporterContext {
  sessionId: string;
  specFile: string;
  branchName: string;
  worktreePath: string;
}
```

Also create `workflows/engine/src/reporters/index.ts` barrel export.

## Verification
- Types compile without errors
- Can be imported from other engine modules
