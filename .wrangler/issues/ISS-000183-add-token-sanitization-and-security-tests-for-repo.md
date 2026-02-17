---
id: ISS-000173
title: Add token sanitization and security tests for reporter system
type: issue
status: open
priority: high
labels:
  - testing
  - security
  - SPEC-000050
createdAt: '2026-02-17T21:02:59.300Z'
updatedAt: '2026-02-17T21:02:59.300Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

SPEC-000050 requires that auth tokens MUST NOT appear in error messages, logs, or audit entries. This is a security requirement that needs explicit test coverage.

## Requirements

### Test file

Add tests to `workflows/engine/__tests__/reporters/github-pr-comment.test.ts` (security section)

### Scenarios

**Token in error output:**
- GitHub API returns 401 with `WWW-Authenticate` header containing token -- logged error does NOT include the token value
- GitHub API returns error body containing the token (echo back) -- logged error does NOT include the token value
- Reporter throws an error that includes config -- stack trace does NOT contain the token

**Token in audit entries:**
- Reporter config stored in workflow context does NOT include raw token values
- Audit entry metadata for reporter events does NOT contain token

**Token in template resolution:**
- `{{env.GITHUB_TOKEN}}` resolved to actual value -- the resolved value is passed to the reporter but never logged
- Template resolution errors (missing env var) do NOT log the variable name pattern in a way that reveals what token was expected

**Config object sanitization:**
- `reporter.getConfig()` or similar accessor returns config with token redacted (e.g., `"ghp_***"`)
- `JSON.stringify(reporter)` does not leak token (custom `toJSON` or private field)

## Verification

- [ ] All error output sanitization tests pass
- [ ] Audit entry tests pass (no token in metadata)
- [ ] Config accessor returns redacted token
- [ ] Manual review: grep test output for any test token values to confirm no leaks
