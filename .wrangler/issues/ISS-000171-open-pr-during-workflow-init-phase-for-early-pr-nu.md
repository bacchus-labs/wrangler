---
id: ISS-000171
title: Open PR during workflow init phase for early PR number capture
type: issue
status: open
priority: medium
labels:
  - SPEC-000050
  - workflow-engine
  - github
createdAt: '2026-02-17T20:08:38.522Z'
updatedAt: '2026-02-17T20:08:38.522Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Modify the workflow init phase to create a GitHub PR immediately after creating the branch/worktree, so the PR number is available to reporters from the start.

## Requirements
- FR-018: Workflow init phase MUST open a PR up front
- PR number stored in session context as `context.prNumber`
- PR created as draft (not ready for review until publish phase)
- `--pr-number` CLI flag available as override (skip PR creation if provided)
- Only create PR when reporters need it (check if any reporter config references prNumber)

## Implementation
File: `workflows/engine/src/cli.ts` (init section)

After branch/worktree creation:
1. Check if workflow has reporters that need a PR number
2. If yes and no `--pr-number` override, create draft PR via `gh pr create --draft`
3. Capture PR number and URL in session context
4. Store in context.json for reporters to access

## Depends On
- ISS for CLI reporter wiring

## Verification
- PR created as draft during init when reporters configured
- PR number captured in session context
- `--pr-number` flag skips PR creation
- No PR created when no reporters configured
- Existing workflows without reporters unchanged
