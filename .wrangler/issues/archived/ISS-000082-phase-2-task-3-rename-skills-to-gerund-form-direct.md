---
id: ISS-000082
title: 'Phase 2, Task 3: Rename skills to gerund form (directories + frontmatter)'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R2-naming-conventions
createdAt: '2026-02-03T01:01:53.741Z'
updatedAt: '2026-02-03T01:14:37.535Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 30 minutes
---
## Description
Rename all non-gerund skills to gerund form, updating both directory names and frontmatter `name` fields (R2 partial).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Bulk rename task. Uses mapping created in ISS-000080. Does NOT update cross-references yet (that's next task).

## Files
- Rename: ~30 skill directories
- Modify: Frontmatter `name` field in renamed skills

## Implementation Steps

**Step 1: Load mapping from ISS-000080**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && cat .wrangler/memos/2026-02-03-skill-renaming-map.md
```

**Step 2: Create rename script**

```bash
cat > /tmp/rename-skills.sh << 'EOF'
#!/bin/bash
# Rename skills to gerund form

cd skills

# Add each rename here based on mapping
# Example:
# git mv test-driven-development practicing-tdd
# sed -i.bak 's/^name: test-driven-development$/name: practicing-tdd/' practicing-tdd/SKILL.md

# [Insert all renames from mapping]

echo "Renames complete. Review before committing."
EOF

chmod +x /tmp/rename-skills.sh
```

**Step 3: Execute renames**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && /tmp/rename-skills.sh
```

**Step 4: Update frontmatter name fields**

For each renamed skill, update frontmatter:
```bash
# Example for each renamed skill:
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && sed -i.bak 's/^name: OLD-NAME$/name: NEW-NAME/' skills/NEW-NAME/SKILL.md
```

**Step 5: Verify all renames**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && find skills -maxdepth 2 -name "SKILL.md" | while read f; do
  dir=$(dirname "$f" | sed 's|skills/||')
  name=$(grep "^name:" "$f" | head -1 | sed 's/name: //')
  if [ "$dir" != "$name" ]; then
    echo "MISMATCH: $dir != $name"
  fi
done
```

Expected: No mismatches

**Step 6: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "refactor(skills): rename skills to gerund form

Converts ~30 skills to gerund naming convention per Anthropic 2026 
standards. Directory names and frontmatter 'name' fields updated.

Cross-references and slash commands will be updated in next task.

Part of Phase 2 bulk updates for SPEC-000043 (R2).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All non-gerund skills renamed
- [ ] Directory names match frontmatter name fields
- [ ] All directory names use gerund form
- [ ] Git history preserved (used git mv)
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000081 (Phase 2, Task 2)
