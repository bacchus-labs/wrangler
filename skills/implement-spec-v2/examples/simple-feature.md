# Example: Simple Feature (No E2E)

This example shows implementing a simple backend feature that doesn't require E2E testing.

## Scenario

Implementing authentication system from SPEC-000042.

## Workflow

### INIT Phase

```bash
# Session start
session_start(specFile: ".wrangler/specifications/SPEC-000042.md")

# Response:
{
  sessionId: "2025-02-02-abc123",
  worktreePath: "/Users/user/project/.worktrees/spec-000042-auth",
  branchName: "wrangler/spec-000042/2025-02-02-abc123",
  auditPath: ".wrangler/sessions/2025-02-02-abc123"
}

# Verify worktree
cd /Users/user/project/.worktrees/spec-000042-auth && \
  git branch --show-current
# Output: wrangler/spec-000042/2025-02-02-abc123
# VERIFIED
```

### PLAN Phase

```bash
# Invoke writing-plans skill (via subagent)
# writing-plans creates MCP issues:
# - ISS-000042: Implement JWT token generation
# - ISS-000043: Implement token refresh endpoint
# - ISS-000044: Add rate limiting middleware
# - ISS-000045: Implement user authentication flow
# - ISS-000046: Add authentication middleware

# Create GitHub PR
cd /Users/user/project/.worktrees/spec-000042-auth && \
gh pr create \
  --title "feat: authentication system" \
  --body "Implements SPEC-000042. See .wrangler/issues/ for task details." \
  --draft

# Output: https://github.com/org/repo/pull/123
```

### EXECUTE Phase

```bash
# Invoke implement skill with issue range
# implement skill handles:
# - ISS-000042: TDD → Code Review → Fixed → Complete
# - ISS-000043: TDD → Code Review → Approved → Complete
# - ISS-000044: TDD → Blocker (rate limit threshold unclear)
#   → ESCALATE to user → User clarifies → Resume → Complete
# - ISS-000045: TDD → Code Review → Fixed → Complete
# - ISS-000046: TDD → Code Review → Approved → Complete

# Result: All 5 tasks complete
```

### VERIFY Phase

```bash
# LLM extracts acceptance criteria from SPEC-000042:
# - AC-001: JWT tokens generated with correct claims
# - AC-002: Token refresh works within expiry window
# - AC-003: Rate limiting blocks excessive requests
# - AC-004: Authentication flow redirects correctly
# - AC-005: Middleware protects endpoints

# Verify evidence for each criterion
# AC-001: ✓ Test: auth.test.ts:15, Code: auth.ts:42, Commit: a1b2c3d
# AC-002: ✓ Test: tokens.test.ts:8, Code: tokens.ts:30, Commit: e4f5g6h
# AC-003: ✓ Test: middleware.test.ts:22, Code: middleware.ts:18, Commit: i7j8k9l
# AC-004: ✓ Test: flow.test.ts:10, Code: flow.ts:55, Commit: m0n1o2p
# AC-005: ✓ Test: middleware.test.ts:40, Code: middleware.ts:70, Commit: q3r4s5t

# Compliance: 5/5 = 100%

# Run test suite
cd /Users/user/project/.worktrees/spec-000042-auth && npm test
# Output: 42 tests, 42 passing

# Check git status
cd /Users/user/project/.worktrees/spec-000042-auth && git status --short
# Output: (empty - clean)

# VERIFIED ✓
```

### PUBLISH Phase

```bash
# Update PR description with final summary
cd /Users/user/project/.worktrees/spec-000042-auth && \
gh pr edit 123 --body "$(cat << EOF
## Summary

Implements specification: SPEC-000042

### Changes

- Implement JWT token generation
- Implement token refresh endpoint
- Add rate limiting middleware
- Implement user authentication flow
- Add authentication middleware

### Test Results

- All tests passing (42 tests)
- Compliance: 100%

### Tasks Completed

- [x] ISS-000042: Implement JWT token generation (a1b2c3d)
- [x] ISS-000043: Implement token refresh endpoint (e4f5g6h)
- [x] ISS-000044: Add rate limiting middleware (i7j8k9l)
- [x] ISS-000045: Implement user authentication flow (m0n1o2p)
- [x] ISS-000046: Add authentication middleware (q3r4s5t)

### Implementation Details

- TDD compliance: All functions certified
- Code review: All tasks approved

---

**Session ID:** 2025-02-02-abc123
**Audit trail:** .wrangler/sessions/2025-02-02-abc123/

Generated with Claude Code
EOF
)"

# Mark PR ready
cd /Users/user/project/.worktrees/spec-000042-auth && \
gh pr ready 123
```

### COMPLETE Phase

```bash
# Complete session
session_complete(
  sessionId: "2025-02-02-abc123",
  status: "completed",
  prUrl: "https://github.com/org/repo/pull/123",
  prNumber: 123,
  summary: "Implemented 5 tasks from SPEC-000042"
)

# Present summary to user
```

## Summary Output

```markdown
## Implementation Complete

**Specification:** SPEC-000042
**PR:** https://github.com/org/repo/pull/123
**Session:** 2025-02-02-abc123

### Summary

| Metric | Value |
|--------|-------|
| Tasks completed | 5/5 |
| Tests passing | 42 |
| Compliance | 100% |
| Code reviews | 5 approved |

### Audit Trail

Location: `.wrangler/sessions/2025-02-02-abc123/`
```
