---
name: code-quality-review
description: Review code changes for quality, readability, and best practices
---

Review the recent code changes for quality issues.

## Context

Files changed: {{ changedFiles }}
Task: {{ task.title }}

## Review Checklist

1. **Readability**: Is the code easy to understand? Are names descriptive?
2. **Function length**: Flag functions over 50 lines
3. **Complexity**: Flag deeply nested logic (>3 levels)
4. **Error handling**: Are errors handled appropriately at boundaries?
5. **Conventions**: Does the code follow project patterns?
6. **Duplication**: Is there unnecessary code duplication?

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
      "message": "Description of the issue",
      "suggestion": "How to fix it"
    }
  ],
  "summary": "Brief overview of findings"
}
```
