---
id: ISS-000120
title: Fix CLI resume path hardcoding completedPhases to empty array
type: issue
status: closed
priority: high
labels:
  - bug
  - engine
  - cli
  - resume
  - dogfood
createdAt: '2026-02-15T01:01:36.300Z'
updatedAt: '2026-02-15T01:43:57.139Z'
project: Workflow Engine v1
---
## Bug

In `cli.ts:100-103`, the resume path constructs the engine input with `completedPhases: []` hardcoded:

```typescript
const result = await engine.resume(
  workflowPath,
  { variables: checkpoint.variables, completedPhases: [], changedFiles: [] },
  checkpoint.currentPhase
);
```

This means all phase completion metadata from the original run is lost on resume. The engine may re-execute already-completed phases.

## Evidence

Discovered during dogfood test (session wf-2026-02-12-6d217642). The checkpoint contains full analysis with 12 tasks, but `completedPhases` is discarded when resuming.

## Related Issues

- ISS-000115: Checkpoint records wrong `currentPhase` (upstream data problem)
- ISS-000110: Integration tests will verify the fix via checkpoint roundtrip test

## Fix

1. Read `completedPhases` from the loaded checkpoint data
2. Pass them through to `engine.resume()` instead of `[]`
3. Also pass `changedFiles` from checkpoint if available

The checkpoint data shape (`WorkflowContext.toCheckpoint()`) should include `completedPhases`. If it doesn't, that needs fixing too (in `state.ts`).

## File

`/Users/sam/medb/projects/wrangler/workflows/engine/src/cli.ts:100-103`

## Acceptance Criteria

- [ ] `completedPhases` from checkpoint is passed to `engine.resume()`
- [ ] `changedFiles` from checkpoint is passed if available
- [ ] Integration test in ISS-000110 validates the roundtrip
- [ ] Resumed workflow does not re-execute completed phases

---
**Completion Notes (2026-02-15T01:43:57.128Z):**
Completed: Fixed CLI resume path that hardcoded completedPhases to empty array. The resume path now reads completedPhases and changedFiles from the loaded checkpoint data and passes them through to engine.resume() instead of discarding them. Integration tests from ISS-000110 validate the roundtrip. Resumed workflows no longer re-execute completed phases.
