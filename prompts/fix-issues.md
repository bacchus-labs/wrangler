---
name: fix-issues
description: Fix issues found during code review
---

Fix the following issues found during code review.

## Code Quality Issues

{{ codeQualityIssues }}

## Test Coverage Issues

{{ testCoverageIssues }}

## Security Issues

{{ securityIssues }}

## Instructions

1. Address each issue systematically, starting with critical severity
2. Run tests after each fix to ensure no regressions
3. Commit fixes with message: `fix: address review feedback`

## Output

Return a JSON object:

```json
{
  "summary": "What was fixed",
  "issuesFixed": 5,
  "issuesSkipped": 0,
  "allTestsPassing": true,
  "commitHash": "abc123"
}
```
