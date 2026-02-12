---
id: ISS-000102
title: Namespace per-task outputs by task ID in mergeTaskResults
type: issue
status: open
priority: medium
labels:
  - workflow-engine
  - v2
  - enhancement
createdAt: '2026-02-12T17:30:36.563Z'
updatedAt: '2026-02-12T17:30:36.563Z'
project: Deterministic Pipeline
---
## Context

From code review of the workflow engine (PR #26).

`WorkflowContext.mergeTaskResults()` in `state.ts` only merges new keys from child to parent (`!(key in this.variables)`). If a child updates a variable that already exists in the parent, the update is silently dropped. This affects accumulator-type variables like `tasksCompleted` and `tasksPending` from the `save-checkpoint` handler.

## Proposed Fix

Consider either:
- Special-casing known accumulator keys (`tasksCompleted`, `tasksPending`)
- Adding a merge strategy API (e.g., `ctx.setAccumulator(...)` that gets merged by union)
- Having the per-task loop directly update the parent context after each iteration
- Namespacing per-task outputs by task ID to avoid collisions

## Priority

Not blocking v1 -- current tests work around this with custom handlers.
