---
name: security-review
description: Review code changes for security vulnerabilities
---

Review the recent code changes for security issues.

## Context

Files changed: {{ changedFiles }}
Task: {{ task.title }}

## Review Checklist

1. **Injection**: SQL injection, command injection, XSS
2. **Authentication/Authorization**: Proper access controls
3. **Data exposure**: Sensitive data in logs, responses, or errors
4. **Path traversal**: File operations with user-controlled paths
5. **Dependencies**: Known vulnerable packages
6. **Secrets**: Hardcoded credentials, API keys, tokens

## Output

Return a JSON object:

```json
{
  "hasCriticalIssues": false,
  "criticalIssues": [],
  "summary": "Brief overview of security findings"
}
```
