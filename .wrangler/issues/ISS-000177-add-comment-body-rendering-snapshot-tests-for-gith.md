---
id: ISS-000167
title: Add comment body rendering snapshot tests for GitHubPRCommentReporter
type: issue
status: open
priority: high
labels:
  - testing
  - snapshot-test
  - SPEC-000050
createdAt: '2026-02-17T21:01:40.283Z'
updatedAt: '2026-02-17T21:01:40.283Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

The `GitHubPRCommentReporter` renders complex markdown for the PR comment body. Given the complexity (checkboxes, spinner GIF, per-task sub-items, duration formatting, completion summary), snapshot tests are the most effective way to catch regressions.

## Requirements

### Snapshot test file

Create `workflows/engine/__tests__/reporters/github-pr-comment-snapshots.test.ts`

### Scenarios to snapshot

Each scenario renders the comment body for a specific workflow state and asserts it matches the stored snapshot.

**Initial state:**
- Workflow with 5 visible steps, 1 silent step, 1 summary step -- initial comment body
- Workflow with 0 visible steps (all silent) -- should produce minimal or empty comment

**In-progress states:**
- Step 1 started (spinner on step 1, unchecked on rest)
- Step 1 completed, step 2 started (checkbox on step 1, spinner on step 2)
- Per-task step with 3/8 tasks completed (expanded sub-items with checkboxes)
- Parallel step with 2 children running simultaneously

**Terminal states:**
- All steps completed successfully -- completion summary with duration, no spinner
- Step 3 failed -- failure indicator, steps 4+ show as skipped
- Workflow paused with blocker -- pause indicator with blocker reason

**Edge cases:**
- Step name with markdown special chars (backticks, asterisks, square brackets)
- Very long step name (100+ chars) -- no line wrapping issues
- Duration formatting: 0s, 45s, 3m 12s, 1h 5m 30s, 25h+

### Hidden marker

All snapshots must include the `<!-- wrangler-workflow: {sessionId} -->` marker.

### Spinner GIF

Verify the animated spinner GIF URL is present during in-progress states and absent in terminal states.

## Verification

- [ ] All snapshots generated and committed
- [ ] `npm test -- --testPathPattern=github-pr-comment-snapshots` passes
- [ ] Snapshots are human-readable markdown (review the `.snap` file)
- [ ] Silent steps do NOT appear in any snapshot
- [ ] Summary steps appear ONLY in terminal state snapshots
