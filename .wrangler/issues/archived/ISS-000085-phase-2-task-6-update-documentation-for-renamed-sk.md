---
id: ISS-000085
title: 'Phase 2, Task 6: Update documentation for renamed skills'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R2-naming-conventions
  - documentation
createdAt: '2026-02-03T01:02:36.434Z'
updatedAt: '2026-02-03T01:16:32.560Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 20 minutes
---
## Description
Update all documentation files (docs/, devops/docs/, CLAUDE.md, README.md) that reference renamed skills (R2 final).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Ensures documentation reflects new skill names.

## Files
- Modify: `CLAUDE.md`, `README.md`, `docs/*.md`, `devops/docs/*.md`

## Implementation Steps

**Step 1: Find skill references in documentation**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && grep -r "skills/" docs/ devops/docs/ CLAUDE.md README.md 2>/dev/null | grep -v "\.git"
```

**Step 2: Update documentation files**

For each old skill name in mapping:
```bash
# Example:
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && find docs devops/docs CLAUDE.md README.md -type f -name "*.md" 2>/dev/null -exec sed -i.bak 's/test-driven-development/practicing-tdd/g' {} \;
```

**Step 3: Manual review of critical files**

Review CLAUDE.md and README.md manually to ensure:
- Context makes sense with new names
- Examples updated correctly
- No broken references

**Step 4: Verify completeness**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Check for old names
# grep -r "test-driven-development" docs/ devops/docs/ *.md
```

**Step 5: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add docs/ devops/docs/ CLAUDE.md README.md && git commit -m "docs: update documentation for renamed skills

Updates all documentation to reference skills by new gerund names.

Part of Phase 2 bulk updates for SPEC-000043 (R2).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All documentation files reviewed
- [ ] Old skill names replaced with gerund forms
- [ ] CLAUDE.md updated
- [ ] README.md updated
- [ ] docs/ and devops/docs/ updated
- [ ] No broken references
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000084 (Phase 2, Task 5 - Rename complete)
