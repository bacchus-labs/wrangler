---
id: ISS-000084
title: 'Phase 2, Task 5: Update slash commands to use gerund names'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R2-naming-conventions
  - slash-commands
createdAt: '2026-02-03T01:02:23.703Z'
updatedAt: '2026-02-03T01:15:59.775Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 15 minutes
---
## Description
Update all slash commands in commands/ directory to invoke renamed skills using new gerund names (R2 partial).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Ensures slash commands continue working after skill renames.

## Files
- Modify: All `commands/*.md` files that invoke renamed skills

## Implementation Steps

**Step 1: List all slash commands**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && ls -la commands/
```

**Step 2: Find skill invocations in commands**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && grep -r "Skill:" commands/
grep -r "/wrangler:" commands/
```

**Step 3: Update each command file**

For each command that references a renamed skill:
```bash
# Example:
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && sed -i.bak 's/test-driven-development/practicing-tdd/g' commands/write-plan.md
```

Use mapping from ISS-000080 to update all references.

**Step 4: Verify no old names in commands**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Check for each old name
# grep -r "test-driven-development" commands/
```

**Step 5: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add commands/ && git commit -m "refactor(commands): update slash commands for gerund skill names

Updates skill invocations in all slash commands to use new gerund naming.

Part of Phase 2 bulk updates for SPEC-000043 (R2).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All command files reviewed
- [ ] All skill references updated to gerund names
- [ ] No references to old skill names in commands/
- [ ] Commands remain functional
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000083 (Phase 2, Task 4)
