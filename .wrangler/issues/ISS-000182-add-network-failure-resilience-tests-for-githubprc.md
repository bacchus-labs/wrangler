---
id: ISS-000172
title: Add network failure resilience tests for GitHubPRCommentReporter
type: issue
status: open
priority: high
labels:
  - testing
  - unit-test
  - resilience
  - SPEC-000050
createdAt: '2026-02-17T21:02:48.950Z'
updatedAt: '2026-02-17T21:02:48.950Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

The GitHubPRCommentReporter makes HTTP calls to the GitHub API. Network failures are expected in production (transient errors, rate limits, timeouts). The reporter must handle all failure modes gracefully without crashing the workflow.

## Requirements

### Test file

Add tests to `workflows/engine/__tests__/reporters/github-pr-comment.test.ts`

### Failure mode tests

**HTTP error responses:**
- 401 Unauthorized: reporter logs error and self-disables (all subsequent calls are no-ops)
- 403 Forbidden (rate limit): reporter retries with exponential backoff (3 attempts), then self-disables
- 404 Not Found: reporter logs error and self-disables
- 500 Internal Server Error: reporter logs error, continues (retries on next entry)
- 502/503 (transient): reporter continues, retries on next entry

**Network-level failures:**
- `fetch` throws TypeError (DNS resolution failure): logged, reporter continues
- `fetch` throws AbortError (timeout): logged, reporter continues
- Connection reset mid-response: logged, reporter continues

**Rate limit specifics:**
- Verify exponential backoff timing: 1s, 2s, 4s (or whatever the spec defines)
- After 3 failed retries on 403: reporter self-disables permanently for this session
- `Retry-After` header respected if present in 403 response

**Self-disable behavior:**
- Once disabled, `onAuditEntry` is a no-op (no fetch calls)
- Once disabled, `onComplete` is a no-op
- `dispose()` still works on a disabled reporter (no crash)
- Disabled state is logged once (not on every subsequent call)

**Initialize failure:**
- `initialize()` fails (POST comment returns 401): reporter is disabled before any `onAuditEntry` calls
- `initialize()` fails (network error): same disable behavior
- ReporterManager still initializes other reporters even if one fails

**Timeout configuration:**
- Verify fetch calls have a timeout (30s default or configurable)
- Timeout exceeded: same handling as network error

## Verification

- [ ] All HTTP error response tests pass
- [ ] All network-level failure tests pass
- [ ] Rate limit retry timing verified with Jest fake timers
- [ ] Self-disable behavior verified (no calls after disable)
- [ ] Initialize failure tests pass
- [ ] No test depends on real network calls
