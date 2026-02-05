---
id: ISS-000076
title: 'Phase 1, Task 1: Verify and fix skill template frontmatter format'
type: issue
status: closed
priority: high
labels:
  - phase-1
  - infrastructure
  - R3-template-format
createdAt: '2026-02-03T01:00:09.069Z'
updatedAt: '2026-02-03T01:11:20.756Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 10 minutes
---
## Description
Verify skill creation template uses YAML frontmatter with only `name` and `description` fields, matching Anthropic 2026 standard (R3).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Infrastructure task. Template determines format for all new skills, must be correct before any skill creation.

## Files
- Locate and modify: Skill creation template (check `skills/writing-skills/assets/` or `skills/writing-skills/references/`)

## Implementation Steps

**Step 1: Locate skill template**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && find skills/writing-skills -name "*template*" -o -name "*SKILL*" | grep -v "SKILL.md$"
ls -la skills/writing-skills/assets/
ls -la skills/writing-skills/references/
```

**Step 2: Review current template format**

Read template file and check frontmatter format.

**Step 3: Update to Anthropic standard if needed**

Ensure template matches:
```yaml
---
name: skill-name
description: What the skill does and when to use it. Use when [triggers].
---
```

Requirements:
- YAML frontmatter (not table-based)
- Only `name` and `description` fields
- No additional custom fields
- Example description with "Use when..." pattern

**Step 4: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/writing-skills/ && git commit -m "fix(skills): update skill template to Anthropic 2026 standard

Ensures YAML frontmatter with only name and description fields.
Part of Phase 1 infrastructure for SPEC-000043.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Template located
- [ ] Template uses YAML frontmatter
- [ ] Only `name` and `description` fields present
- [ ] Example description includes "Use when..." pattern
- [ ] No table-based frontmatter
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000075 (Phase 0, Task 4 - Phase 0 complete)
