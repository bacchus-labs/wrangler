---
id: ISS-000126
title: Extend condition evaluation with boolean operators and falsy-on-missing
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:29:58.047Z'
updatedAt: '2026-02-16T03:12:32.483Z'
project: SPEC-000047
---
## Summary

The existing condition evaluator in `state.ts` supports comparison operators and truthy checks. Extend it with:

## New Requirements (FR-3)

1. **Boolean operators**: `&&`, `||`, `!`
   - Example: `codeQualityReview.hasIssues || securityReview.hasCriticalIssues`
2. **String methods**: `.includes()`, `.startsWith()`
   - Example: `task.title.includes("auth")`
3. **Falsy-on-missing (FR-2c.3)**: Missing properties evaluate to falsy, never throw
   - Example: `undefinedVar.missingProp` -> false (not error)
4. **Load-time validation (FR-3.5)**: Invalid expressions produce clear errors when workflow is loaded, not at runtime

## Implementation

- Extend `WorkflowContext.evaluate()` in `state.ts`
- Parse `&&` and `||` by splitting on these operators and evaluating each side
- Handle `!` prefix for negation
- Wrap property resolution in try/catch to return falsy on missing
- Add `validateCondition(expr)` for load-time checking

## Files

- Modify: `workflows/engine/src/state.ts`
- Tests: extend existing condition tests

## Dependencies

- None (state.ts is independent)
