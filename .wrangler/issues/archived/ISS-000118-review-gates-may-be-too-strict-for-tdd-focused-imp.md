---
id: ISS-000118
title: Review gates may be too strict for TDD-focused implementation tasks
type: issue
status: closed
priority: medium
labels:
  - investigation
  - engine
  - review-gates
  - dogfood
createdAt: '2026-02-12T21:48:50.202Z'
updatedAt: '2026-02-15T01:43:52.770Z'
project: Workflow Engine
---
## Observation

During the dogfood test of SPEC-000045, the review gates found actionable issues in the SDK simulator implementation that the fixer agent couldn't resolve in 2 attempts. The fix loop exhausted, pausing the entire workflow on task-001.

The SDK simulator code was actually high quality (27 tests, all passing), suggesting the review gates may have flagged issues that were either:
1. False positives (style preferences not actual problems)
2. Low-severity items that shouldn't be "actionable"
3. Items the fixer agent can't resolve (e.g., review asking for changes to architecture decisions)

## Impact

If review gates are too strict:
- Every task risks hitting the max retry limit
- The workflow pauses frequently, requiring human intervention
- The fix agent wastes time on marginal improvements

## Investigation Needed

1. Check what the review gates flagged as "actionable issues" during the dogfood test
2. Review the gate prompts in `workflows/review-gates/` for appropriate severity thresholds
3. Consider adding a severity threshold to the `hasActionableIssues` condition (e.g., only critical/important, not suggestions)

## Relevant Files

- `workflows/review-gates/code-quality.md`
- `workflows/review-gates/security.md`
- `workflows/review-gates/test-coverage.md`

---
**Completion Notes (2026-02-15T01:43:52.761Z):**
Completed: Investigated review gate strictness. Added severity threshold to the hasActionableIssues condition so only critical and important issues trigger the fix loop, not style suggestions. This reduces unnecessary workflow pauses while maintaining quality gates for substantive issues.
