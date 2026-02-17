---
id: ISS-000168
title: Add PR description tracker unit tests for marker-based read/replace/write
type: issue
status: open
priority: medium
labels:
  - testing
  - unit-test
  - SPEC-000050
createdAt: '2026-02-17T21:01:52.477Z'
updatedAt: '2026-02-17T21:01:52.477Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

SPEC-000050 FR-016/FR-017 specify a PR description tracker that uses HTML comment markers (`<!-- WRANGLER_WORKFLOW_START -->` / `<!-- WRANGLER_WORKFLOW_END -->`) to find-and-replace a tracker section in the PR body. This logic is complex enough to warrant isolated unit tests.

## Requirements

### Test file

Create tests within `workflows/engine/__tests__/reporters/github-pr-comment.test.ts` (or a dedicated `pr-description-tracker.test.ts` if the logic is extracted to its own module).

### Scenarios

**First update (markers absent):**
- Empty PR body -- appends `---` separator + markers + tracker content
- PR body with existing user text -- appends after existing text with separator
- PR body with other HTML comments (unrelated `<!-- ... -->`) -- only wrangler markers added

**Subsequent updates (markers present):**
- Markers at end of body -- content between markers replaced, text before preserved
- Markers in middle of body -- content replaced, text before and after preserved
- Markers with stale content -- old content fully replaced with new

**Edge cases:**
- Only start marker present (no end marker) -- treat as absent, append fresh
- Only end marker present (no start marker) -- treat as absent, append fresh
- Duplicate marker pairs -- replace first pair only
- PR body at 65,000 chars (near 65K limit) -- tracker truncates gracefully or logs warning
- PR body exceeds 65K after adding tracker -- handle without crash
- Markers with extra whitespace around them -- still matched
- Empty content between markers -- replaced with new content

**Content correctness:**
- Tracker content includes task progress summary
- Tracker content includes link to session or spec
- Tracker content updates reflect current workflow state

## Verification

- [ ] All marker-absent scenarios pass
- [ ] All marker-present scenarios pass
- [ ] All edge cases pass
- [ ] Extracted function is independently testable (not coupled to GitHub API calls)
