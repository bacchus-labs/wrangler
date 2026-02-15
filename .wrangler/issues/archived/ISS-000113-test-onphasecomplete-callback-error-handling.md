---
id: ISS-000113
title: Test onPhaseComplete callback error handling
type: issue
status: closed
priority: medium
labels:
  - testing
  - workflow-engine
  - P2
createdAt: '2026-02-12T21:12:06.826Z'
updatedAt: '2026-02-15T01:43:31.898Z'
project: Workflow Engine v1
wranglerContext:
  parentTaskId: SPEC-000045
  estimatedEffort: small
---
## Summary

Test what happens when the `onPhaseComplete` callback throws an error during workflow execution.

## Context

`onPhaseComplete` is called at engine.ts lines 99-101 and 159-161 after each phase completes. If this callback throws, the error propagates and could leave the workflow in an inconsistent state (phase marked as completed in context, but result not captured). Currently untested.

## Requirements

1. **Callback throws on first phase**: Provide `onPhaseComplete` that throws. Verify the workflow fails with the callback error. Verify the phase IS marked completed in context before the callback fires (this is the current order of operations).

2. **Callback throws on second phase**: First phase succeeds (callback doesn't throw), second phase callback throws. Verify first phase output is preserved, second phase's error propagates.

3. **Callback throws async rejection**: Provide `onPhaseComplete` that returns a rejected promise. Verify it's handled identically to a synchronous throw.

## Acceptance Criteria

- [ ] 2-3 tests in engine.test.ts
- [ ] Document whether the current behavior is correct or needs fixing
- [ ] All tests pass

---
**Completion Notes (2026-02-15T01:43:31.889Z):**
Completed: Added tests for onPhaseComplete callback error handling -- callback throws on first phase, callback throws on second phase (first phase output preserved), and callback returning rejected promise. Documented that current behavior is correct: phase is marked completed in context before callback fires, and callback errors propagate as workflow failures.
