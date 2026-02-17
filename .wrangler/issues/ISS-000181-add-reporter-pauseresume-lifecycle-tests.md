---
id: ISS-000171
title: Add reporter pause/resume lifecycle tests
type: issue
status: open
priority: medium
labels:
  - testing
  - unit-test
  - SPEC-000050
createdAt: '2026-02-17T21:02:35.554Z'
updatedAt: '2026-02-17T21:02:35.554Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

The workflow engine supports pause (checkpoint) and resume. Reporter behavior across this lifecycle boundary is unspecified in the current issues. The GitHubPRCommentReporter uses a hidden HTML marker (`<!-- wrangler-workflow: {sessionId} -->`) to identify its comment, which should enable resume.

## Requirements

### Test file

Add tests to `workflows/engine/__tests__/reporters/github-pr-comment.test.ts`

### Scenarios

**Pause behavior:**
- Workflow pauses mid-run: `dispose()` is called on the reporter
- Pending debounce timer at pause time: timer is cleared cleanly
- Final comment update before dispose shows "paused" state (not "completed" or "running")
- Comment body includes blocker reason if available

**Resume behavior:**
- Reporter `initialize()` called on resume
- Reporter searches for existing comment by hidden marker (list comments, find matching marker)
- If existing comment found: reporter resumes updating that comment (PATCH, not new POST)
- If existing comment NOT found (deleted by user): reporter creates a new comment
- Resumed comment shows correct state: completed steps checked, pending steps unchecked

**Comment search mock:**
- Mock `GET /repos/{owner}/{repo}/issues/{pr}/comments` to return list including the wrangler comment
- Verify reporter extracts comment ID from the list response
- Verify reporter handles pagination if comment list is long (or document that we don't paginate)

**Edge cases:**
- Resume with a different session ID than original -- creates new comment (marker doesn't match)
- Resume after PR was closed and reopened -- comment still accessible
- Two workflows running against same PR -- each has its own comment (different session IDs in markers)

## Verification

- [ ] Pause scenarios pass
- [ ] Resume with existing comment passes (uses PATCH not POST)
- [ ] Resume with deleted comment passes (falls back to POST)
- [ ] Edge cases pass
- [ ] No flaky timing issues (uses Jest fake timers where needed)
