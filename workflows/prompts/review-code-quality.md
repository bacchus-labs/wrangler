---
name: review-code-quality
description: Reviews code for quality, readability, and maintainability
---

Review the code changes for quality concerns.

## Changed Files
{{#each analysis.changedFiles}}
- {{this.path}} ({{this.changeType}}): {{this.summary}}
{{/each}}

## Review Checklist
1. **Error Handling**: Proper try/catch, meaningful messages, graceful degradation
2. **Type Safety**: Correct types, no unjustified `any`, validated inputs
3. **Code Organization**: Logical structure, separation of concerns, naming
4. **Maintainability**: Readability, complexity, DRY principle
5. **Edge Cases**: Null checks, boundary conditions, empty inputs

## Output
Return structured JSON with:
- issues: Array of {severity: "critical"|"important"|"minor", location: string, title: string, description: string, fix: string}
- strengths: Array of strings
- hasActionableIssues: boolean (true if any critical or important issues)
