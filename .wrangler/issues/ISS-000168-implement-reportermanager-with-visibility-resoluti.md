---
id: ISS-000168
title: Implement ReporterManager with visibility resolution and debouncing
type: issue
status: open
priority: high
labels:
  - SPEC-000050
  - workflow-engine
createdAt: '2026-02-17T20:08:05.804Z'
updatedAt: '2026-02-17T20:08:05.804Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Create the ReporterManager that manages reporter lifecycle, resolves step visibility, fans out audit entries, and debounces updates.

## Requirements
- FR-004/005/006: Resolve `reportAs` visibility for each step name
- FR-013: Reporter errors MUST NOT block workflow execution
- FR-014: Multiple reporters supported simultaneously
- NF-001: Debounce updates (configurable, default 2s)
- NF-002: Graceful initialization failure (log warning, skip broken reporters)

## Implementation
File: `workflows/engine/src/reporters/manager.ts`

Key behaviors:
1. Constructor walks the workflow step tree to build `visibilityMap: Map<string, StepVisibility>`
2. Visibility inherits: if parent is `silent`, all children are `silent`
3. `initialize()` calls `reporter.initialize()` on each reporter, catching errors
4. `onAuditEntry()` looks up visibility, fans out to reporters, catches errors per-reporter
5. Debouncing: internal state updates immediately, but reporter calls are debounced
6. `onComplete()` / `onError()` flush pending debounced updates, then call reporters
7. `dispose()` flushes and cleans up

## Depends On
- ISS for reporter types (WorkflowReporter interface)
- ISS for reporter registry (ReporterRegistry)

## Verification
- Fan-out to multiple reporters works
- Visibility map correctly resolves nested steps
- Silent parent makes children silent
- Reporter errors are caught and logged (not propagated)
- Debouncing prevents rapid-fire calls
- Flush on complete/dispose sends pending updates
