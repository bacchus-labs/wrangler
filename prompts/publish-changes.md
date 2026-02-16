---
name: publish-changes
description: Push branch and create pull request
---

Publish the implementation by pushing and creating a pull request.

## Context

Branch: {{ branchName }}
Specification: {{ spec.title }}

## Instructions

1. Ensure all changes are committed (check git status)
2. Push the branch to the remote
3. Create a pull request using `gh pr create` targeting main
4. Include a summary of all changes in the PR description

## Output

Return a JSON object:

```json
{
  "prUrl": "https://github.com/...",
  "prNumber": 42,
  "branchName": "wrangler/...",
  "commitCount": 5,
  "summary": "Brief description of what was published"
}
```
