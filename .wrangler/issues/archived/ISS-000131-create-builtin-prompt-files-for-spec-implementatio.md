---
id: ISS-000131
title: Create builtin prompt files for spec-implementation workflow
type: issue
status: closed
priority: medium
labels:
  - spec-047
  - content
createdAt: '2026-02-16T02:30:51.341Z'
updatedAt: '2026-02-16T03:12:34.500Z'
project: SPEC-000047
---
## Summary

Create the builtin prompt files in `prompts/` at the wrangler root. These are the task-specific instructions used by the spec-implementation workflow.

## Prompt Files

### prompts/analyze-spec.md
- Reads a spec, breaks it into implementation tasks
- Output: JSON with tasks array (id, title, description, dependencies)

### prompts/implement-task.md
- Implements a single task following TDD
- Input: task object, changedFiles
- Output: summary, test results, commit hash

### prompts/fix-issues.md
- Fixes issues found during code review
- Input: issues from review outputs
- Output: summary of fixes applied

### prompts/code-quality-review.md
- Reviews code for readability, naming, function length, patterns
- Input: changedFiles, task context
- Output: JSON with hasActionableIssues, actionableIssues[], summary

### prompts/test-coverage-review.md
- Reviews test coverage and test quality
- Input: changedFiles, task context
- Output: JSON with hasActionableIssues, actionableIssues[], summary

### prompts/security-review.md
- Reviews for OWASP top 10, injection, auth issues
- Input: changedFiles, task context
- Output: JSON with hasCriticalIssues, criticalIssues[], summary

### prompts/run-verification.md
- Runs full test suite, checks all tests pass
- Output: JSON with allPassed, testSuite results

### prompts/publish-changes.md
- Pushes branch, creates PR via gh cli
- Output: JSON with prUrl, prNumber, summary

## Files

- Create all files listed above in `prompts/`

## Dependencies

- ISS-000122 (prompt file format/schema)
