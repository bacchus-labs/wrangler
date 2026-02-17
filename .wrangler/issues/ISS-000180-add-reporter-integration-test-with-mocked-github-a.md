---
id: ISS-000170
title: Add reporter integration test with mocked GitHub API end-to-end
type: issue
status: open
priority: high
labels:
  - testing
  - integration-test
  - SPEC-000050
createdAt: '2026-02-17T21:02:23.343Z'
updatedAt: '2026-02-17T21:02:23.343Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

The reporter system spans multiple components: schema parsing, ReporterRegistry, ReporterManager, GitHubPRCommentReporter, and engine CLI wiring. An integration test must verify the full chain works together with a real engine run against a mocked GitHub API.

## Requirements

### Test file

Create `workflows/engine/__tests__/integration/reporters-e2e.test.ts`

### Test scenarios

**Happy path: Full workflow with GitHub PR comment reporter**
1. Define a small workflow (3 steps: analyze, implement, verify) with `reporters: [{ type: 'github-pr-comment', config: { ... } }]`
2. Mock `fetch` to record all GitHub API calls and return success
3. Run the workflow through the engine (using existing test harness patterns from `workflows/engine/__tests__/integration/`)
4. Assert:
   - POST to create comment was called once during initialize
   - PATCH to update comment was called for each visible step transition
   - Final PATCH includes completion summary, no spinner
   - Comment ID from POST response was used in all subsequent PATCHes
   - Auth header included correct token in every request

**Workflow with mixed visibility**
1. Define workflow with steps: `analyze` (visible), `internal-cleanup` (silent), `verify` (visible), `metrics` (summary)
2. Run through engine
3. Assert:
   - `internal-cleanup` never appears in any PATCH body
   - `metrics` appears only in final completion PATCH
   - `analyze` and `verify` appear in all PATCHes

**Workflow with per-task step**
1. Define workflow with a `per-task` step containing 3 tasks
2. Run through engine
3. Assert:
   - Comment shows "0/3 tasks" initially
   - Updates show incremental progress (1/3, 2/3, 3/3)
   - Each task name appears as sub-item

**Workflow with no reporters config**
1. Run existing workflow definition (no `reporters` field)
2. Assert: zero fetch calls, engine completes normally

**Reporter failure isolation**
1. Configure GitHub reporter with mock that returns 500 on every call
2. Run workflow
3. Assert: engine completes successfully despite all reporter API failures
4. Assert: errors were logged (check stderr or a log mock)

### PR description tracker integration
1. Mock the GET PR endpoint to return existing PR body
2. Run workflow
3. Assert: PATCH to PR endpoint called with markers injected into body
4. Run again (simulate resume)
5. Assert: PATCH replaces existing marker content, doesn't duplicate

## Verification

- [ ] All 6 scenarios pass
- [ ] Test runs in < 10s (no real network calls, no real process spawning)
- [ ] Uses shared test helpers from the test infrastructure issue
- [ ] Follows existing integration test patterns in `workflows/engine/__tests__/integration/`
