---
id: ISS-000165
title: Set up reporter test infrastructure and GitHub API mocking strategy
type: issue
status: open
priority: high
labels:
  - testing
  - infrastructure
  - SPEC-000050
createdAt: '2026-02-17T21:01:15.176Z'
updatedAt: '2026-02-17T21:01:15.176Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

SPEC-000050 introduces a reporter subsystem with multiple components (ReporterManager, ReporterRegistry, GitHubPRCommentReporter). Before any implementation begins, the test infrastructure must be established.

## Requirements

### Test directory structure

Create `workflows/engine/__tests__/reporters/` with files:
- `reporter-manager.test.ts`
- `registry.test.ts`
- `github-pr-comment.test.ts`
- `visibility-resolution.test.ts`
- `test-utils.ts` (shared mocks and helpers)

### GitHub API mocking strategy

Choose and implement ONE mocking approach for all reporter tests:
- **Option A (recommended):** Jest `fetch` mock via `jest.spyOn(global, 'fetch')` -- lightweight, no extra deps
- **Option B:** `msw` (Mock Service Worker) -- more realistic but adds a dependency
- **Option C:** Hand-rolled spy with request recording

The chosen approach must:
- Record all outgoing requests (method, URL, headers, body)
- Support configurable responses per request (200, 401, 403, 404, 500, network error)
- Support delayed responses for testing timeouts
- Strip auth tokens from test output/snapshots

### Shared test helpers in `test-utils.ts`

- `createMockReporter()` -- returns a `WorkflowReporter` with jest.fn() for all methods
- `createMockAuditEntry(overrides)` -- builds a `WorkflowAuditEntry` with sensible defaults
- `createMockWorkflowDefinition(overrides)` -- builds a minimal `WorkflowDefinition` with reporter config
- `createMockReporterContext(overrides)` -- builds `ReporterContext` with session ID, step list, etc.
- `createGitHubAPIMock()` -- sets up fetch mock with request recording and configurable responses
- `flushDebounce()` -- advances Jest fake timers past debounce window

### Jest configuration

- Confirm `workflows/engine/jest.config.ts` picks up `__tests__/reporters/**/*.test.ts`
- Enable fake timers support for debounce tests

## Verification

- [ ] All test files created and importable
- [ ] `npm test -- --testPathPattern=reporters` runs and finds all test files (they can have placeholder tests initially)
- [ ] GitHub API mock helper works: can simulate 200, 401, 403, 404, network error
- [ ] Shared helpers produce valid typed objects
