---
id: ISS-000105
title: Add expression tokenizer to replace regex-based condition evaluation
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - v2
  - enhancement
createdAt: '2026-02-12T17:30:59.909Z'
updatedAt: '2026-02-12T17:30:59.909Z'
project: Deterministic Pipeline
---
## Context

From code review of the workflow engine (PR #26).

`WorkflowContext.evaluate()` in `state.ts` uses a regex to parse comparison expressions. The regex uses lazy matching (`.+?`) which could match incorrectly on expressions with multiple operators (e.g., `a.b == c.d > e`). The `default: return false` case is also unreachable.

## Proposed Fix

Replace the regex-based parser with a proper expression tokenizer that:
- Tokenizes the expression into operands and operators
- Handles operator precedence correctly
- Throws on malformed expressions instead of silently returning false

## Priority

Low -- current expressions are simple dot-notation comparisons that work correctly with the regex. This would only matter if expression complexity grows.
