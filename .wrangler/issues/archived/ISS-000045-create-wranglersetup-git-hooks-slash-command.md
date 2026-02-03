---
id: ISS-000045
title: 'Create /wrangler:setup-git-hooks slash command'
type: issue
status: closed
priority: medium
labels:
  - slash-command
  - entry-point
createdAt: '2026-01-21T22:19:45.751Z'
updatedAt: '2026-02-02T21:55:12.762Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~30 LOC
---
## Overview
Create the slash command entry point that delegates to the setup-git-hooks skill.

## Requirements
- Create command file at `commands/setup-git-hooks.md`
- Provide clear command description
- Document command usage and examples
- Invoke Skill tool with skill="setup-git-hooks"
- Minimal logic (delegate to skill)

## Command Structure
```markdown
# /wrangler:setup-git-hooks

Set up Git hooks for automated testing and code quality enforcement.

## Description
This command helps you configure and install Git hooks in your project...

## Usage
Simply run the command and follow the interactive prompts...

## Implementation
[Invoke Skill tool with setup-git-hooks]
```

## Acceptance Criteria
- Command file created
- Clear description and usage
- Delegates to skill correctly
- Examples provided
- Follows command documentation standards

## Dependencies
- Requires setup-git-hooks skill (ISS-000048)

## File Location
`commands/setup-git-hooks.md`

## Estimated Effort
~30 LOC markdown
