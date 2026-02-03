---
id: ISS-000044
title: Implement setup-git-hooks skill with interactive configuration
type: issue
status: closed
priority: high
labels:
  - skill
  - setup
  - interactive
  - core
createdAt: '2026-01-21T22:19:45.608Z'
updatedAt: '2026-02-02T21:55:12.229Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~250 LOC
---
## Overview
Create the main setup-git-hooks skill that handles interactive configuration, project detection, template parameterization, and hook installation.

## Requirements
- Create skill file at `skills/setup-git-hooks/SKILL.md`
- Implement complete setup workflow:
  1. Verify git repository exists
  2. Detect existing hooks (warn about overwrite)
  3. Detect project type (JS/TS, Python, Go, etc.)
  4. Suggest default test commands
  5. Ask user configuration questions (AskUserQuestion tool)
  6. Generate hooks-config.json
  7. Parameterize hook templates
  8. Install hooks to .git/hooks/ (make executable)
  9. Install documentation templates
  10. Provide setup summary

## Key Features
- Interactive Q&A using AskUserQuestion tool
- Smart project detection (package.json, setup.py, go.mod)
- Language-specific defaults
- Template parameterization (sed-based substitution)
- Existing hook backup (.git/hooks.backup/)
- Validation of configuration
- Clear success messages

## Configuration Questions
1. Full test command (detect from scripts)
2. Unit test command (optional)
3. Format command (optional, detect from scripts)
4. Lint command (optional, detect from scripts)
5. Protected branch patterns
6. Enable commit-msg validation (yes/no)
7. Enable secret scanning (yes/no - future)

## Acceptance Criteria
- Skill file created with complete instructions
- All workflow steps documented
- Uses Read/Write/Bash tools appropriately
- Handles errors gracefully
- Provides clear user feedback
- Hook templates properly parameterized
- Files installed with correct permissions
- Configuration validated before saving
- Tested end-to-end on sample project

## Dependencies
- Requires hook templates (ISS-000043, ISS-000044, ISS-000045)
- Requires config schema (ISS-000046)
- Requires doc templates (ISS-000047)

## File Location
`skills/setup-git-hooks/SKILL.md`

## Estimated Effort
~250 LOC skill documentation
