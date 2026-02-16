---
name: review-security
description: Reviews code for security vulnerabilities
---

Review the code changes for security concerns.

## Changed Files
{{#each analysis.changedFiles}}
- {{this.path}} ({{this.changeType}}): {{this.summary}}
{{/each}}

## Security Checklist
1. **Injection**: SQL injection, command injection, XSS, template injection
2. **Authentication/Authorization**: Proper access controls, session handling
3. **Data Handling**: Secrets in code, PII exposure, improper logging
4. **Dependencies**: Known vulnerable packages, supply chain risks
5. **Path Traversal**: File access controls, directory escaping

## Output
Return structured JSON with:
- issues: Array of {severity: "critical"|"important"|"minor", location: string, title: string, description: string, fix: string}
- strengths: Array of strings
- hasActionableIssues: boolean
