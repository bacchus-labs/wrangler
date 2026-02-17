---
name: test-coverage-review
description: Reviews test coverage and quality
---

Review the test coverage for the implementation.

## Focus Areas
- All new code paths tested
- Edge cases covered
- Error paths tested
- Tests verify behavior, not mocks
- TDD evidence (tests written first)

## Output
Return structured JSON with:
- issues: Array of {severity, location, title, description, fix}
- hasActionableIssues: boolean
- coverageAssessment: string
