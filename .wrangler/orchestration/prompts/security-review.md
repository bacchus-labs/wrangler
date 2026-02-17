---
name: security-review
description: Reviews code for security vulnerabilities
---

Review the implementation for security concerns.

## Focus Areas
- Injection vulnerabilities (SQL, command, XSS)
- Authentication and authorization
- Data handling and secrets
- Path traversal prevention
- Dependency security

## Output
Return structured JSON with:
- issues: Array of {severity, location, title, description, fix}
- hasActionableIssues: boolean
