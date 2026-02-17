---
name: implement-task
description: Implements a single task following TDD methodology
---

Implement the following task using TDD methodology.

## Task
{{task.title}}: {{task.description}}

## Requirements
{{#each task.requirements}}
- {{this}}
{{/each}}

## File Paths
{{#each task.filePaths}}
- {{this}}
{{/each}}

## Rules
1. Write a failing test FIRST
2. Implement minimum code to pass
3. Refactor for quality
4. Run full test suite to verify nothing broken
5. Return structured results with files changed and test evidence
