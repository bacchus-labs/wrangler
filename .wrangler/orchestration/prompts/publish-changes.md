---
name: publish-changes
description: Commits and pushes changes, creates PR if needed
---

Publish the completed implementation changes.

## Instructions
1. Stage all relevant changed files
2. Create a commit with a descriptive message
3. Push to the remote branch
4. Create a pull request with summary of changes

## Context
{{#if verification}}
Verification results: {{verification.overallPass}}
{{/if}}

## Output
Return structured JSON with:
- commitHash: string
- branch: string
- prUrl: string (if PR created)
- prNumber: number (if PR created)
