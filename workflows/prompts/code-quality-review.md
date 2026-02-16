---
name: code-quality-review
description: Reviews implementation for code quality concerns
---

Review the implementation for code quality.

## Focus Areas
- Error handling completeness
- Type safety and correctness
- Code organization and naming
- Maintainability and readability
- DRY principle adherence

## Output
Return structured JSON with:
- issues: Array of {severity, location, title, description, fix}
- hasActionableIssues: boolean
