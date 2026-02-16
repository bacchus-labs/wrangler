---
name: test-coverage-review
description: Review test coverage and test quality
---

Review the test coverage and quality for recent changes.

## Context

Files changed: {{ changedFiles }}
Task: {{ task.title }}

## Review Checklist

1. **Coverage**: Are all new functions/methods tested?
2. **Edge cases**: Are boundary conditions covered?
3. **Error paths**: Are error scenarios tested?
4. **Test quality**: Do tests verify behavior, not implementation details?
5. **Test names**: Do test names describe what they verify?

## Output

Return a JSON object:

```json
{
  "hasActionableIssues": true,
  "actionableIssues": [
    {
      "severity": "critical|important|suggestion",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of the coverage gap",
      "suggestion": "What test to add"
    }
  ],
  "summary": "Brief overview of coverage findings"
}
```
