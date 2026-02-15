---
id: ISS-000108
title: Create realistic SDK simulator for workflow engine tests
type: issue
status: closed
priority: high
labels:
  - testing
  - workflow-engine
  - P0
createdAt: '2026-02-12T21:11:06.694Z'
updatedAt: '2026-02-15T01:43:08.963Z'
project: Workflow Engine v1
wranglerContext:
  parentTaskId: SPEC-000045
  estimatedEffort: medium
---
## Summary

Create `__tests__/fixtures/sdk-simulator.ts` -- a configurable QueryFunction mock that emits realistic multi-message sequences instead of always returning a single success result.

## Context

The current `createMockQuery` helper (engine.test.ts:33-61) always yields exactly one `result` message with `subtype: 'success'` and non-null `structured_output`. The real Agent SDK emits multiple message types per call. This mock masks edge cases.

## Requirements

Create `createSDKSimulator(config)` that:
1. Accepts a map of `promptSubstring -> SDKMessage[]` sequences
2. Yields all messages in order for each matched prompt
3. Supports configurable default response for unmatched prompts
4. Optionally throws on unmatched prompts

Create helper functions:
- `createAgentSequence(structuredOutput)` -- returns `[assistant, tool_use, tool_result, result(success)]`
- `createEmptySequence()` -- returns messages with NO result message (generator completes)
- `createNullOutputSequence()` -- returns result with `structured_output: null`
- `createErrorSequence(errorMsg)` -- returns result with `subtype: 'error'`
- `createMultiResultSequence(output1, output2)` -- returns two result messages

Must be backward-compatible: existing tests using `createMockQuery` should NOT need to change.

## Acceptance Criteria

- [ ] `sdk-simulator.ts` created with TypeScript types matching the engine's `QueryFunction` and `SDKMessage` types
- [ ] All 5 helper functions implemented
- [ ] Self-tests in a new test section in engine.test.ts confirming the simulator works
- [ ] Existing 532 tests still pass unchanged

## Files

- NEW: `workflows/engine/__tests__/fixtures/sdk-simulator.ts`
- MODIFY: `workflows/engine/__tests__/engine.test.ts` (add simulator tests)

---
**Completion Notes (2026-02-15T01:43:08.955Z):**
Completed: Created sdk-simulator.ts with configurable QueryFunction mock that emits realistic multi-message sequences. Implemented all 5 helper functions (createAgentSequence, createEmptySequence, createNullOutputSequence, createErrorSequence, createMultiResultSequence). Added 27 self-tests confirming simulator behavior. Existing 532 tests remained unchanged and passing.
