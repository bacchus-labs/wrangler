---
id: ISS-000080
title: 'Phase 2, Task 1: Create skill name mapping file'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R2-naming-conventions
  - preparation
createdAt: '2026-02-03T01:01:10.339Z'
updatedAt: '2026-02-03T01:12:44.707Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 20 minutes
---
## Description
Create mapping file listing all skills requiring rename from current name to gerund form (R2 preparation).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Preparation for bulk renaming. Creates tracking document to ensure systematic updates.

## Files
- Create: `.wrangler/memos/2026-02-03-skill-renaming-map.md`

## Implementation Steps

**Step 1: List all current skills**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && find skills -maxdepth 2 -name "SKILL.md" | sed 's|skills/||' | sed 's|/SKILL.md||' | sort
```

**Step 2: Identify skills needing rename**

Review each skill name and identify non-gerund forms.

**Step 3: Create mapping document**

```markdown
# Skill Renaming Map - SPEC-000043

## Gerund Conversions Required

### Format
`OLD_NAME` → `NEW_NAME`

### Mapping

**Already Gerund (No Change)**:
- writing-skills ✅
- testing-skills ✅
- dispatching-parallel-agents ✅
[... list all already-gerund skills]

**Requires Rename**:
- test-driven-development → practicing-tdd
- code-review → reviewing-code
- implement-spec → implementing-specs
- create-new-issue → creating-issues
- capture-new-idea → capturing-ideas
- check-constitutional-alignment → checking-constitutional-alignment
[... complete list based on audit]

## Total Count
- Already gerund: [N]
- Requires rename: [N]
- Total skills: 47
```

**Step 4: Verify completeness**

Ensure all 47 skills accounted for.

**Step 5: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add .wrangler/memos/2026-02-03-skill-renaming-map.md && git commit -m "docs: create skill renaming map for SPEC-000043

Lists all skills requiring gerund form conversion.
Part of Phase 2 for SPEC-000043.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All 47 skills listed
- [ ] Categorized as gerund/non-gerund
- [ ] Proposed new names for all non-gerund skills
- [ ] Total counts accurate
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000079 (Phase 1, Task 4 - Phase 1 complete)
