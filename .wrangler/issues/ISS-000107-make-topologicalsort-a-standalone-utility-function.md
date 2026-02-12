---
id: ISS-000107
title: Make topologicalSort a standalone utility function
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - v2
  - tech-debt
createdAt: '2026-02-12T17:31:15.333Z'
updatedAt: '2026-02-12T17:31:15.333Z'
project: Deterministic Pipeline
---
## Context

From code review of the workflow engine (PR #26).

`topologicalSort` is a public method on `WorkflowEngine` but is an internal implementation detail of per-task execution. Tests access it directly for unit testing the algorithm, which leaks the implementation into the public API.

## Proposed Fix

Extract `topologicalSort` as a standalone exported function (e.g., in a `utils.ts` file). This allows direct testing without exposing it on the engine class. The engine method becomes private and delegates to the utility function.

## Priority

Low -- cosmetic API cleanliness.
