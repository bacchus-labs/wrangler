---
id: ISS-000128
title: Update session MCP tools for workflow integration
type: issue
status: closed
priority: medium
labels:
  - spec-047
  - mcp
createdAt: '2026-02-16T02:30:19.574Z'
updatedAt: '2026-02-16T03:12:33.334Z'
project: SPEC-000047
---
## Summary

Update session_start, session_checkpoint, and session_complete to support the new workflow model (FR-7).

## session_start Changes

- Accept `workflow` parameter (string, defaults to "spec-implementation")
- Accept `skipChecks` (boolean) and `skipStepNames` (string[])
- Resolve workflow name via WorkflowResolver
- Store workflow name and skip config in session context
- Worktree creation already exists -- just ensure worktree path is stored in context

## session_checkpoint Changes

- Include step results since last checkpoint (list of step name + status + output summary)

## session_complete Changes

- Include step execution summary:
  ```json
  {
    "totalSteps": 18,
    "executed": 16,
    "skipped": 2,
    "skippedSteps": [
      { "name": "review-security", "reason": "disabled in workflow definition" }
    ]
  }
  ```
- Record agent and prompt used for each step

## Files

- Modify: `mcp/tools/session/start.ts`
- Modify: `mcp/tools/session/complete.ts`
- Modify: `mcp/tools/session/checkpoint.ts`
- Tests: update existing session tests

## Dependencies

- ISS-000121 (WorkflowResolver for resolving workflow name)
