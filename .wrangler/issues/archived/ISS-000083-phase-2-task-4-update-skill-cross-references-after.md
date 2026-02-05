---
id: ISS-000083
title: 'Phase 2, Task 4: Update skill cross-references after renaming'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R2-naming-conventions
createdAt: '2026-02-03T01:02:08.722Z'
updatedAt: '2026-02-03T01:15:23.142Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 20 minutes
---
## Description
Update all cross-references between skills to use new gerund names after renaming (R2 partial).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Updates references like "REQUIRED SUB-SKILL: test-driven-development" to use new names.

## Files
- Modify: All `skills/*/SKILL.md` files that reference renamed skills

## Implementation Steps

**Step 1: Find all skill cross-references**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && grep -r "REQUIRED SUB-SKILL:" skills/ | grep -v "\.git"
grep -r "skill:" skills/ | grep -v "\.git" | grep -v "^name:"
```

**Step 2: Create update script using mapping**

```bash
cat > /tmp/update-references.sh << 'EOF'
#!/bin/bash
# Update skill cross-references

cd skills

# For each old-name -> new-name pair from mapping:
# find . -name "SKILL.md" -exec sed -i.bak 's/old-name/new-name/g' {} \;

# Example:
# find . -name "SKILL.md" -exec sed -i.bak 's/test-driven-development/practicing-tdd/g' {} \;

# [Insert all updates from mapping]

# Clean up backups
find . -name "*.bak" -delete

echo "References updated."
EOF

chmod +x /tmp/update-references.sh
```

**Step 3: Execute updates**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && /tmp/update-references.sh
```

**Step 4: Verify no old names remain in references**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Check for each old name from mapping
# grep -r "test-driven-development" skills/
# (repeat for each old name)
```

**Step 5: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "refactor(skills): update cross-references to use gerund names

Updates all skill-to-skill references to use new gerund naming convention.

Part of Phase 2 bulk updates for SPEC-000043 (R2).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All cross-references updated
- [ ] No references to old skill names remain
- [ ] All "REQUIRED SUB-SKILL" references correct
- [ ] Skill invocation examples updated
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000082 (Phase 2, Task 3)
