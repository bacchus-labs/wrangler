---
id: ISS-000050
title: Create update-git-hooks skill for reconfiguration
type: issue
status: closed
priority: low
labels:
  - skill
  - update
  - optional
  - maintenance
createdAt: '2026-01-21T22:19:46.517Z'
updatedAt: '2026-02-02T21:55:13.873Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~150 LOC
---
## Overview
Create an optional skill that allows users to update their existing git hooks configuration without full re-setup. Reads existing config, allows modifications, and regenerates hooks.

## Requirements
- Create skill file at `skills/update-git-hooks/SKILL.md`
- Workflow:
  1. Verify hooks already installed (check .wrangler/hooks-config.json)
  2. Read existing configuration
  3. Display current settings to user
  4. Ask which settings to update (multi-select or individual questions)
  5. Update hooks-config.json
  6. Regenerate hook files with new configuration
  7. Preserve executable permissions
  8. Show summary of changes

## Key Features
- Non-destructive (reads existing config)
- Selective updates (don't re-ask everything)
- Validation of new values
- Backup existing hooks before regeneration
- Clear diff of what changed
- Idempotent (safe to re-run)

## Update Options
- Test commands (full, unit)
- Format/lint commands
- Protected branch patterns
- Enable/disable commit-msg validation
- Enable/disable docs-only skip
- Docs patterns

## Acceptance Criteria
- Skill file created with complete instructions
- Reads existing config correctly
- Validates updates
- Regenerates hooks properly
- Preserves working hooks on failure
- Clear user feedback
- Tested end-to-end

## Dependencies
- Requires hooks already installed (ISS-000048)

## File Location
`skills/update-git-hooks/SKILL.md`

## Estimated Effort
~150 LOC skill documentation
