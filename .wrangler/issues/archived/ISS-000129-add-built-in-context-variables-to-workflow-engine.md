---
id: ISS-000129
title: Add built-in context variables to workflow engine
type: issue
status: closed
priority: medium
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:30:29.713Z'
updatedAt: '2026-02-16T03:12:33.691Z'
project: SPEC-000047
---
## Summary

The engine must provide a standard set of context variables to all prompt templates.

## Built-in Variables

| Variable | Type | Available | Description |
|----------|------|-----------|-------------|
| `spec` | object | Always | `spec.title`, `spec.id`, `spec.content` |
| `worktreePath` | string | Always | Absolute path to session worktree |
| `sessionId` | string | Always | Current session ID |
| `branchName` | string | Always | Git branch name |
| `task` | object | In per-task | `task.id`, `task.title`, `task.description` |
| `taskIndex` | number | In per-task | Zero-based index |
| `taskCount` | number | In per-task | Total tasks |
| `changedFiles` | string[] | After impl steps | Files modified since worktree created |

## Implementation

- Populate `spec` from the spec file at session start (read and parse)
- Populate `worktreePath`, `sessionId`, `branchName` from session context
- `task`, `taskIndex`, `taskCount` already partially exist in per-task context -- ensure consistent naming
- `changedFiles` populated via `git diff --name-only` against the base branch, refreshed before each prompt step

## Files

- Modify: `workflows/engine/src/state.ts` (WorkflowContext)
- Modify: `workflows/engine/src/engine.ts` (populate changedFiles before steps)
- Tests: verify all variables available in template rendering
