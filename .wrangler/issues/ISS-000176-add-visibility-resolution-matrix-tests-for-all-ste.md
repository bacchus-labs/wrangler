---
id: ISS-000166
title: Add visibility resolution matrix tests for all step types
type: issue
status: open
priority: high
labels:
  - testing
  - unit-test
  - SPEC-000050
createdAt: '2026-02-17T21:01:26.670Z'
updatedAt: '2026-02-17T21:01:26.670Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

SPEC-000050 defines step visibility (`visible`, `silent`, `summary`) with inheritance from parent steps. The ReporterManager resolves visibility for each audit entry. This must be exhaustively tested across all 5 step types.

## Requirements

### Test matrix

Create a test suite in `workflows/engine/__tests__/reporters/visibility-resolution.test.ts` covering:

**5 step types x 3 visibility values = 15 base cases:**

| Step type | `visible` | `silent` | `summary` |
|-----------|-----------|----------|-----------|
| agent     | renders live | excluded from live + final | excluded from live, included in final |
| code      | same | same | same |
| loop      | same + children visible | same + children inherit silent | same + children inherit summary |
| per-task  | same + sub-items visible | same + sub-items inherit silent | same + sub-items inherit summary |
| parallel  | same + children visible | same + children inherit silent | same + children inherit summary |

**Inheritance override cases (6 cases):**
- Child explicitly `visible` inside `silent` parent -- child inherits `silent` (parent wins)
- Child explicitly `visible` inside `summary` parent -- child inherits `summary` (parent wins)
- Child explicitly `silent` inside `visible` parent -- child is `silent` (child override wins)
- Child explicitly `summary` inside `visible` parent -- child is `summary` (child override wins)
- Depth-3 nesting: parallel > per-task > agent with mixed visibility at each level
- Depth-3 nesting: loop > per-task > code with `silent` at root

**Edge cases (4 cases):**
- Step with no `reportAs` field -- defaults to `visible`
- Workflow with zero reporters -- visibility resolution still works (no crash)
- Step name containing special characters (dots, slashes) -- lookup still works
- Unknown step name in audit entry (not in workflow definition) -- defaults to `visible`

### Total: ~25 test cases

## Verification

- [ ] All 15 base matrix cases pass
- [ ] All 6 inheritance cases pass
- [ ] All 4 edge cases pass
- [ ] Test file runs in isolation: `npm test -- --testPathPattern=visibility-resolution`
