---
id: ISS-000111
title: Add CLI function tests and include cli.ts in coverage
type: issue
status: closed
priority: high
labels:
  - testing
  - workflow-engine
  - cli
  - P1
createdAt: '2026-02-12T21:11:50.238Z'
updatedAt: '2026-02-15T01:43:22.763Z'
project: Workflow Engine v1
wranglerContext:
  parentTaskId: SPEC-000045
  estimatedEffort: medium
---
## Summary

Create `__tests__/cli.test.ts` and remove `cli.ts` from jest coverage exclusion. Test the extracted functions and key code paths.

## Context

`cli.ts` is 213 lines with 0 tests, explicitly excluded from coverage in `jest.config.ts:29`. It contains:
- `printResult(result)` -- complex output formatting with deeply nested optional access
- `getCurrentBranch(cwd)` -- shells out to `git rev-parse`
- Commander argument parsing
- Dynamic SDK import with `@ts-expect-error`
- Session lifecycle (new run vs resume vs pause handling)

## Requirements

### Step 1: Extract testable functions (if needed)

If `printResult` and `getCurrentBranch` are not already importable, refactor cli.ts to export them. Keep the Commander wiring and `program.parse()` call at module level (not tested directly).

### Step 2: Create `__tests__/cli.test.ts`

**printResult tests:**
1. Successful result with all fields populated (test results, review outcomes, files changed)
2. Failed result with error message
3. Paused result with blocker details
4. Result with missing/undefined nested fields (no verification, no review, no filesChanged)
5. Result with empty completedPhases array
6. Result where `testSuite.coverage` is undefined
7. Result where review issues are empty array

**getCurrentBranch tests:**
8. Success case (mock child_process.execSync to return branch name)
9. Failure case (mock execSync to throw, verify returns 'unknown')

**SDK import error path:**
10. Test that when `@anthropic-ai/claude-agent-sdk` is not installed, the error message is logged (this may require jest module mocking)

### Step 3: Update jest.config.ts

Remove `'!src/cli.ts'` from `collectCoverageFrom` so cli.ts is included in coverage reporting.

## Acceptance Criteria

- [ ] `__tests__/cli.test.ts` created with 10-12 tests
- [ ] `printResult` tested with all result shapes (success, failure, pause, missing fields)
- [ ] `getCurrentBranch` tested for success and failure
- [ ] `jest.config.ts` updated to include cli.ts in coverage
- [ ] cli.ts achieves >= 70% line coverage (Commander wiring excluded from practical testing)
- [ ] All tests pass

---
**Completion Notes (2026-02-15T01:43:22.755Z):**
Completed: Created cli.test.ts with tests covering printResult for all result shapes (success, failure, pause, missing fields), getCurrentBranch success and failure cases, and SDK import error path. Removed cli.ts from jest coverage exclusion in jest.config.ts. Extracted testable functions for importability.
