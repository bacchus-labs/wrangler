---
id: ISS-000133
title: 'Integration tests: end-to-end workflow with agent+prompt composition'
type: issue
status: closed
priority: medium
labels:
  - spec-047
  - engine
  - testing
createdAt: '2026-02-16T02:31:15.328Z'
updatedAt: '2026-02-16T03:12:35.165Z'
project: SPEC-000047
---
## Summary

Create integration tests that verify the full workflow engine works end-to-end with the new agent+prompt model, parallel execution, condition evaluation, and escape hatches.

## Test Scenarios

1. **Full workflow run**: Load spec-implementation.yaml, run with mock query function, verify all steps execute in order with correct agent+prompt composition
2. **Parallel execution**: Verify three review steps dispatched concurrently, all complete before advancing
3. **Fix loop**: Review finds issues -> fix step runs -> re-review passes -> loop exits
4. **Fix loop exhaustion**: Review always fails -> maxRetries reached -> escalation
5. **Condition skip**: Step with false condition is skipped, logged in audit
6. **Step skip via flag**: `--skip-step=review-security` skips that step, others still run
7. **skipChecks**: Skips all review steps, implementation still runs
8. **Enabled:false**: Disabled step skipped with audit entry
9. **Layered resolution**: Project agent overrides builtin, verify project version used
10. **Missing agent/prompt**: Clear error at load time
11. **Falsy-on-missing**: Condition referencing undefined variable evaluates to false
12. **Worktree path injection**: All subagents receive correct working directory

## Files

- Create: `workflows/engine/src/__tests__/integration/engine-e2e.test.ts`

## Dependencies

- All engine issues (ISS-000121 through ISS-000132)
