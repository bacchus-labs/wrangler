---
id: ISS-000109
title: Add explicit tests for silent default behaviors in engine
type: issue
status: closed
priority: high
labels:
  - testing
  - workflow-engine
  - P0
createdAt: '2026-02-12T21:11:19.309Z'
updatedAt: '2026-02-15T01:43:14.280Z'
project: Workflow Engine v1
wranglerContext:
  parentTaskId: SPEC-000045
  estimatedEffort: medium
---
## Summary

Add tests that explicitly exercise and document the engine's silent default behaviors -- cases where the engine silently succeeds despite receiving unexpected/missing data.

## Context

Several code paths produce no error but silently degrade:
- Agent step with no result message: output silently not stored
- Gate query with no result: silently returns `{ assessment: 'approved' }`
- Gate query where ReviewResultSchema.parse() throws: error propagates uncaught
- Multiple result messages from one query: last one wins silently

These behaviors need explicit tests that document whether they're intentional design or bugs.

## Requirements

**Depends on:** ISS-000108 (SDK simulator -- use the realistic mock for these tests)

Tests to add (in engine.test.ts):

1. **No result message from agent step**: Use `createEmptySequence()`. Verify engine does NOT throw, does NOT store output, workflow continues to next step.

2. **Null structured_output from agent step**: Use `createNullOutputSequence()`. Verify output is NOT stored when `output_as` is configured, engine continues.

3. **Gate query returns no result**: Mock gate query with empty sequence. Verify fallback to `{ assessment: 'approved', issues: [], strengths: [], hasActionableIssues: false }`. Add test comment documenting this as intentional fail-open behavior.

4. **Gate query returns malformed data**: Mock gate query returning result where `structured_output` fails ReviewResultSchema validation. Verify the error behavior (currently throws -- document whether this is correct).

5. **Multiple result messages**: Use `createMultiResultSequence(firstOutput, secondOutput)`. Verify the second (last) output is stored, not the first.

6. **Agent step where query throws mid-stream**: Simulator yields one assistant message then throws. Verify error propagates correctly through `auditStepFailed`.

## Acceptance Criteria

- [ ] 6-8 new tests covering all silent defaults
- [ ] Each test has a comment documenting whether the behavior is intentional
- [ ] Tests use the SDK simulator from ISS-000108
- [ ] All tests pass

---
**Completion Notes (2026-02-15T01:43:14.271Z):**
Completed: Added explicit tests covering all silent default behaviors -- no result message from agent step, null structured_output, gate query with no result (fail-open documented as intentional), gate query with malformed data, multiple result messages (last-wins), and agent step where query throws mid-stream. Each test documents whether the behavior is intentional.
