---
id: ISS-000169
title: Implement GitHubPRCommentReporter
type: issue
status: open
priority: high
labels:
  - SPEC-000050
  - workflow-engine
  - github
createdAt: '2026-02-17T20:08:21.790Z'
updatedAt: '2026-02-17T20:08:21.790Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Implement the first concrete reporter: `github-pr-comment`. Creates and updates a PR comment with a live task list and spinner as the workflow executes.

## Requirements
- FR-007: Create initial PR comment with full step list on workflow start
- FR-008: Update comment as steps start and complete
- FR-009: Show spinner animation during execution (animated GIF)
- FR-010: Replace spinner with completion summary when done
- FR-011: Handle per-task steps showing "X/Y tasks" with sub-items
- FR-012: Handle failure/pause with error/blocker info in comment
- FR-016: Maintain PR description tracker with HTML comment markers
- FR-017: Update PR description on phase transitions, task completions, fix loop iterations

## Implementation
File: `workflows/engine/src/reporters/github-pr-comment.ts`

### Config
```typescript
interface GitHubPRCommentConfig {
  token: string;
  owner: string;
  repo: string;
  prNumber: number;
  spinner?: boolean; // default true
  debounceMs?: number; // default 2000
}
```

### CommentState
Internal state object tracking each visible step's status. Re-renders full markdown on each update.

### GitHub API calls (raw fetch, no Octokit):
- `POST /repos/{owner}/{repo}/issues/{pr}/comments` -- create comment
- `PATCH /repos/{owner}/{repo}/issues/comments/{id}` -- update comment
- `GET /repos/{owner}/{repo}/pulls/{pr}` -- read PR body
- `PATCH /repos/{owner}/{repo}/pulls/{pr}` -- update PR body (tracker)

### Comment rendering:
- Spinner: `https://github.com/user-attachments/assets/5ac382c7-e004-429b-8e35-7feb3e8f9c6f`
- Hidden marker: `<!-- wrangler-workflow: {sessionId} -->`
- Per-task expansion when active step
- Duration per completed step

### PR Description Tracker:
- Use `<!-- WRANGLER_WORKFLOW_START:sessionId -->` / `<!-- WRANGLER_WORKFLOW_END -->` markers
- Read-modify-write: GET body, find/replace between markers (or append if first time), PATCH back
- Update on phase transitions, task completions, fix loop iterations

### Error handling:
- 401: disable reporter for rest of run
- 404: PR doesn't exist, disable
- 403 rate limit: exponential backoff, 3 retries
- Network errors: log, continue

## Depends On
- ISS for reporter types
- ISS for reporter registry (to register this reporter)

## Verification
- Creates comment on initialize with correct markdown
- Updates comment as steps progress (started -> completed)
- Spinner appears during execution, removed on completion
- Per-task progress shows "X/Y tasks"
- Error/failure states render correctly
- PR description tracker updates with markers
- GitHub API errors handled gracefully (logged, not propagated)
- All API calls use correct auth headers
