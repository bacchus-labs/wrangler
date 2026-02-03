---
id: ISS-000051
title: 'Create /wrangler:update-git-hooks slash command (optional)'
type: issue
status: closed
priority: low
labels:
  - slash-command
  - optional
  - update
createdAt: '2026-01-21T22:19:46.628Z'
updatedAt: '2026-02-02T21:55:14.401Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~25 LOC
---
## Overview
Create optional slash command entry point for the update-git-hooks skill.

## Requirements
- Create command file at `commands/update-git-hooks.md`
- Provide clear command description
- Document command usage and examples
- Invoke Skill tool with skill="update-git-hooks"
- Minimal logic (delegate to skill)

## Command Structure
```markdown
# /wrangler:update-git-hooks

Update existing Git hooks configuration.

## Description
This command helps you modify your existing Git hooks setup...

## Usage
Run this after manually editing .wrangler/hooks-config.json or to change settings...

## Implementation
[Invoke Skill tool with update-git-hooks]
```

## Acceptance Criteria
- Command file created
- Clear description and usage
- Delegates to skill correctly
- Examples provided
- Follows command documentation standards

## Dependencies
- Requires update-git-hooks skill (ISS-000053)

## File Location
`commands/update-git-hooks.md`

## Estimated Effort
~25 LOC markdown
