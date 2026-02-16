---
name: implement-task
description: Implement a single task following TDD
---

Implement the following task using Test-Driven Development.

## Task

**{{ task.title }}**

{{ task.description }}

## Context

- Session: {{ sessionId }}
- Task {{ taskIndex }} of {{ taskCount }}
- Files changed so far: {{ changedFiles }}

## Process

1. Write a failing test that captures the requirement
2. Run the test to confirm it fails
3. Implement the minimum code to make the test pass
4. Run all tests to confirm nothing is broken
5. Refactor if needed
6. Commit your changes with message: `implement: {{ task.title }}`

## Output

Return a JSON object:

```json
{
  "summary": "What was implemented",
  "testResults": "Output of test run",
  "allTestsPassing": true,
  "commitHash": "abc123",
  "filesChanged": ["path/to/file.ts"]
}
```
