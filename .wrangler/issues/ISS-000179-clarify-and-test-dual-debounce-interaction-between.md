---
id: ISS-000169
title: >-
  Clarify and test dual-debounce interaction between ReporterManager and
  reporters
type: issue
status: open
priority: high
labels:
  - testing
  - design-decision
  - SPEC-000050
createdAt: '2026-02-17T21:02:06.527Z'
updatedAt: '2026-02-17T21:02:06.527Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

SPEC-000050 NF-001 specifies debounce at the ReporterManager level (2s default). The GitHubPRCommentReporter also has its own `debounceMs` config. The interaction between these two debounce layers is unspecified and could produce confusing behavior.

## Requirements

### Design decision (resolve before implementation)

Choose ONE of:
- **Option A (recommended):** Debounce lives ONLY in ReporterManager. Individual reporters receive already-debounced calls. Remove `debounceMs` from reporter config.
- **Option B:** Debounce lives ONLY in each reporter. ReporterManager passes every entry through immediately. Each reporter manages its own timing.
- **Option C:** Both layers active. Document the net behavior (e.g., "Manager debounces at 2s, then reporter debounces at its own rate -- effective minimum interval is max(managerDebounce, reporterDebounce)").

### Tests (regardless of chosen option)

Create tests in `workflows/engine/__tests__/reporters/reporter-manager.test.ts`:

**Basic debounce behavior:**
- 10 rapid audit entries within debounce window produce exactly 1 reporter call
- After debounce window expires, next entry triggers a new call
- Timer resets on each new entry (trailing-edge debounce)

**Flush semantics:**
- `onComplete()` called with pending debounce timer: pending update fires immediately, then completion fires
- `dispose()` called with pending debounce timer: timer is cleared, no final update fires (or fires? -- decide and document)
- `onError()` called with pending debounce timer: pending update fires, then error fires

**Timing precision (with Jest fake timers):**
- `jest.advanceTimersByTime(1999)` -- no call yet (at 2s debounce)
- `jest.advanceTimersByTime(1)` -- call fires
- Entry at t=0, entry at t=1500ms, `advanceTimersByTime(2000)` from t=1500 -- exactly 1 call with latest state

**Edge cases:**
- `debounceMs: 0` -- every entry triggers immediate call (debounce disabled)
- Single entry with no follow-up -- fires after debounce window
- `dispose()` called with no pending timer -- no-op, no crash

## Verification

- [ ] Design decision documented in a code comment at the debounce implementation
- [ ] All basic debounce tests pass
- [ ] All flush semantics tests pass
- [ ] All timing precision tests pass with Jest fake timers
- [ ] Edge cases pass
