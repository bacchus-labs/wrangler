---
id: ISS-000112
title: Add filesystem error handling tests for session manager
type: issue
status: closed
priority: medium
labels:
  - testing
  - workflow-engine
  - error-handling
  - P1
createdAt: '2026-02-12T21:11:59.911Z'
updatedAt: '2026-02-15T01:43:27.825Z'
project: Workflow Engine v1
wranglerContext:
  parentTaskId: SPEC-000045
  estimatedEffort: small
---
## Summary

Add tests to `__tests__/integration/session.test.ts` for filesystem error scenarios in `WorkflowSessionManager`.

## Context

The session manager uses `fs.readJson`, `fs.writeJson`, `fs.appendFile`, and `fs.pathExists`. If any of these fail (corrupted JSON, missing directory, permissions), the exceptions propagate uncaught. No test covers any filesystem error scenario.

## Requirements

Add these tests to the existing session.test.ts:

1. **Corrupted checkpoint JSON**: Write invalid JSON to `checkpoint.json`, call `loadCheckpoint()`. Verify it throws a clear error (not an opaque JSON parse error).

2. **Missing session directory**: Call `loadCheckpoint()` for a session ID that has no directory. Verify it returns null or throws a clear error.

3. **Corrupted audit log**: Write malformed content to the audit log file, then call `appendAuditEntry()`. Verify the new entry is still appended correctly (audit log is append-only JSONL, so corruption of earlier entries shouldn't block new writes).

4. **Missing audit log file**: Delete the audit log file mid-session, then call `appendAuditEntry()`. Verify it recreates the file or throws a clear error.

5. **Session directory deleted after creation**: Create session, delete the directory, then call `saveCheckpoint()`. Verify clear error.

6. **Double session completion**: Call `completeSession()` twice. Verify second call is idempotent or throws a clear "already completed" error.

## Acceptance Criteria

- [ ] 6-8 new tests in session.test.ts
- [ ] Each test documents actual behavior (whether error is thrown, swallowed, or recovered)
- [ ] If any behavior is surprising (silent data loss), add a comment flagging it
- [ ] All tests pass

---
**Completion Notes (2026-02-15T01:43:27.818Z):**
Completed: Added filesystem error handling tests to session.test.ts covering corrupted checkpoint JSON, missing session directory, corrupted audit log (append-only JSONL verified), missing audit log file, session directory deleted after creation, and double session completion idempotency. Each test documents actual behavior and flags any surprising silent data loss.
