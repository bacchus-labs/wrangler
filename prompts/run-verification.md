---
name: run-verification
description: Run full test suite and verify implementation meets requirements
---

Run the full test suite and verify the implementation.

## Context

Session: {{ sessionId }}
Specification: {{ spec.title }}

## Instructions

1. Run the full test suite
2. Capture test results (total, passed, failed)
3. Check for any uncommitted changes
4. Verify the build succeeds
5. Cross-reference implementation against the specification

## Output

Return a JSON object:

```json
{
  "allPassed": true,
  "testSuite": {
    "total": 100,
    "passed": 100,
    "failed": 0,
    "exitCode": 0
  },
  "buildSucceeded": true,
  "gitClean": true,
  "summary": "All tests passing, build succeeds, no uncommitted changes"
}
```
