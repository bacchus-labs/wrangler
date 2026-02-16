---
id: ISS-000130
title: 'Create builtin agent files (planner, implementer, reviewer, verifier)'
type: issue
status: closed
priority: medium
labels:
  - spec-047
  - content
createdAt: '2026-02-16T02:30:40.766Z'
updatedAt: '2026-02-16T03:12:34.088Z'
project: SPEC-000047
---
## Summary

Create the four builtin agent definition files in `agents/` at the wrangler root.

## Agent Files

### agents/planner.md
- Tools: Read, Glob, Grep, Bash
- Model: sonnet
- System prompt: spec analysis and task breakdown specialist. Reads specs, identifies implementation tasks, estimates scope.

### agents/implementer.md
- Tools: Read, Glob, Grep, Bash, Edit, Write
- Model: opus
- System prompt: TDD implementation specialist. Writes failing tests first, implements code. Git section: commit after work, conventional format, don't push/create branches.

### agents/reviewer.md
- Tools: Read, Glob, Grep (NO Bash, NO Edit, NO Write -- read-only)
- Model: sonnet
- System prompt: code review specialist. Structured feedback, actionable issues, severity categorization. Git section: read-only, use git diff/log, never commit.

### agents/verifier.md
- Tools: Read, Glob, Grep, Bash
- Model: sonnet
- System prompt: verification specialist. Runs test suites, checks coverage, validates requirements met. Git section: read-only except for running tests.

## Files

- Create: `agents/planner.md`
- Create: `agents/implementer.md`
- Create: `agents/reviewer.md`
- Create: `agents/verifier.md`

## Dependencies

- ISS-000122 (agent file format/schema must be defined first)
