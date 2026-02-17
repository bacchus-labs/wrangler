---
name: analyze-diff
description: Analyzes a git diff or set of changed files to understand what changed
---

Analyze the recent code changes in this repository.

## Instructions
1. Run `git diff HEAD~1` or `git log --oneline -5` to understand recent changes
2. Read the changed files to understand the scope of modifications
3. Identify the purpose and intent of the changes
4. Catalog all modified, added, and deleted files
5. Note any patterns or concerns worth investigating

## Context
{{#if diffRef}}
Focus on changes from: {{diffRef}}
{{else}}
Focus on the most recent commit's changes.
{{/if}}

## Output
Return structured JSON with:
- changedFiles: Array of {path, changeType, summary}
- overallPurpose: String describing what the changes accomplish
- areasOfConcern: Array of strings noting anything worth deeper review
- scope: "small" | "medium" | "large" based on number and complexity of changes
