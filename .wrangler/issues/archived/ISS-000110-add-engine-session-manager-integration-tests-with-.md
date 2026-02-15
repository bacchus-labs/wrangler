---
id: ISS-000110
title: Add engine + session manager integration tests with checkpoint roundtrip
type: issue
status: closed
priority: high
labels:
  - testing
  - workflow-engine
  - integration
  - P0
createdAt: '2026-02-12T21:11:36.703Z'
updatedAt: '2026-02-15T01:43:18.614Z'
project: Workflow Engine v1
wranglerContext:
  parentTaskId: SPEC-000045
  estimatedEffort: large
---
## Summary

Create `__tests__/integration/engine-session.test.ts` -- integration tests that wire `WorkflowEngine` to `WorkflowSessionManager` and verify the composition works end-to-end through the filesystem.

## Context

The engine and session manager are each well-tested in isolation, but they're never tested together. The ONLY place they connect is in cli.ts (untested). This issue adds tests for:
- Audit entry flow from engine to session file
- Checkpoint roundtrip through filesystem
- Checkpoint data shape compatibility

## Requirements

**Depends on:** ISS-000108 (SDK simulator)

### Test 1: Audit entry flow
- Create a real `WorkflowSessionManager` (temp directory)
- Create `WorkflowEngine` with `onAuditEntry` wired to `sessionManager.appendAuditEntry`
- Run a simple 2-phase workflow
- Verify session audit log file contains entries for step_start and step_complete for both phases

### Test 2: Full checkpoint roundtrip (pause -> save -> load -> resume)
- Create workflow with a phase that triggers `WorkflowPaused` (e.g., loop with `onExhausted: 'escalate'`)
- Run engine, catch the paused result
- Save checkpoint via `sessionManager.saveCheckpoint()` with context from paused result
- Create a NEW `WorkflowSessionManager` instance pointing to same directory
- Load checkpoint via `sessionManager.loadCheckpoint()`
- Create a NEW `WorkflowEngine` instance
- Call `engine.resume()` with loaded checkpoint data
- Verify the resumed workflow completes successfully
- Verify outputs from before and after pause are both present

### Test 3: Checkpoint data shape compatibility
- Run `WorkflowContext.toCheckpoint()` and capture the output shape
- Verify it contains `variables`, `completedPhases`, `changedFiles` at minimum
- Verify the shape is compatible with what `engine.resume()` expects as its second argument
- Specifically verify that `completedPhases` is preserved (cli.ts currently hardcodes `[]` -- this test should catch that bug)

### Test 4: Completed phases preserved through roundtrip
- Run a workflow that completes phases A, B, then pauses at C
- Save checkpoint, load it back
- Verify `completedPhases` contains ['A', 'B']
- Resume from C, verify it doesn't re-run A or B

### Test 5: Session completion after successful run
- Wire engine + session manager
- Run a workflow to completion
- Call `sessionManager.completeSession(result)`
- Verify session directory contains completed status, final result, and complete audit trail

## Acceptance Criteria

- [ ] New file: `__tests__/integration/engine-session.test.ts`
- [ ] 8-10 tests covering all scenarios above
- [ ] Tests use real filesystem (temp directories, cleaned up after)
- [ ] Tests use SDK simulator for deterministic QueryFunction
- [ ] Checkpoint roundtrip verified through actual filesystem
- [ ] Bug documented if `completedPhases` data is lost (see cli.ts:102)

---
**Completion Notes (2026-02-15T01:43:18.607Z):**
Completed: Created engine-session integration tests covering audit entry flow from engine to session file, full checkpoint roundtrip (pause -> save -> load -> resume), checkpoint data shape compatibility, completed phases preserved through roundtrip, and session completion after successful run. Tests use real filesystem with temp directories and SDK simulator for deterministic behavior.
