---
id: ISS-000093
title: >-
  Phase 3, Task 4: Verify cross-reference consistency after progressive
  disclosure
type: issue
status: open
priority: high
labels:
  - phase-3
  - progressive-disclosure
  - R10-cross-references
  - verification
createdAt: '2026-02-03T01:04:53.321Z'
updatedAt: '2026-02-03T01:04:53.321Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 20 minutes
---
## Description
Verify all skill cross-references work correctly after progressive disclosure changes (R10 verification).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Ensures skills correctly reference each other and their own supporting files.

## Files
- Verify: All `skills/*/SKILL.md` files

## Implementation Steps

**Step 1: Check for broken internal references**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # For each skill with references/ or assets/
for skill_dir in skills/*/; do
  if [ -d "${skill_dir}references" ] || [ -d "${skill_dir}assets" ]; then
    skill=$(basename "$skill_dir")
    echo "Checking $skill..."
    
    # Check SKILL.md references to references/
    grep -n "references/" "${skill_dir}SKILL.md" || echo "  No references/ links"
    
    # Check SKILL.md references to assets/
    grep -n "assets/" "${skill_dir}SKILL.md" || echo "  No assets/ links"
  fi
done
```

**Step 2: Verify all referenced files exist**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Extract all references/ and assets/ mentions
# Verify they point to actual files
```

**Step 3: Check cross-skill references**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Find all "REQUIRED SUB-SKILL:" references
grep -r "REQUIRED SUB-SKILL:" skills/ | while read line; do
  echo "Verify: $line"
  # Check referenced skill exists
done
```

**Step 4: Fix any broken references found**

Update SKILL.md files to correct any broken references.

**Step 5: Commit fixes if needed**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "fix(skills): correct cross-references after progressive disclosure

Ensures all internal and cross-skill references work correctly.

Part of Phase 3 for SPEC-000043 (R10).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All references/ links verified
- [ ] All assets/ links verified
- [ ] All cross-skill references correct
- [ ] No broken links
- [ ] Fixes committed if needed

## Dependencies
- Requires: ISS-000092 (Phase 3, Task 3 - Phase 3 complete)
