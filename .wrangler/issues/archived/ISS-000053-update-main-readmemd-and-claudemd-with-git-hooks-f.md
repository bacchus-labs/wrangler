---
id: ISS-000053
title: Update main README.md and CLAUDE.md with git hooks feature
type: issue
status: closed
priority: high
labels:
  - documentation
  - readme
  - project-docs
createdAt: '2026-01-21T22:19:46.910Z'
updatedAt: '2026-02-02T21:55:15.290Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~80 LOC
---
## Overview
Update project README and CLAUDE.md to document the new git hooks enforcement framework feature.

## Requirements

### README.md Updates
- Add "Git Hooks Enforcement" to features list
- Add brief description in features section
- Link to comprehensive docs/git-hooks.md
- Update quick start if applicable

### CLAUDE.md Updates
- Add "Git Hooks Framework" section under Project Overview
- Document slash commands (/setup-git-hooks, /update-git-hooks)
- Add to skills list (setup-git-hooks, update-git-hooks)
- Document Pattern A and Pattern B installation patterns
- Add to "Common Tasks" section
- Update file locations reference
- Add to governance integration section

## Key Messages
- Git hooks provide technical enforcement of testing/quality standards
- Differentiates user bypass from agent enforcement
- Integrates with governance and testing workflows
- Supports two installation patterns
- Optional but recommended feature

## Acceptance Criteria
- README.md updated with feature description
- CLAUDE.md updated with comprehensive context
- Links to detailed documentation
- Follows existing documentation structure
- No breaking changes to existing docs
- Clear, concise language

## File Locations
- `README.md`
- `CLAUDE.md`

## Estimated Effort
~80 LOC additions (40 LOC each file)
