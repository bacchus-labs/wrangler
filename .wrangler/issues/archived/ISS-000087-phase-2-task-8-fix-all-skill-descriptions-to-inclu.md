---
id: ISS-000087
title: 'Phase 2, Task 8: Fix all skill descriptions to include "Use when..." clauses'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R5-description-format
createdAt: '2026-02-03T01:03:08.468Z'
updatedAt: '2026-02-03T01:18:15.005Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 45 minutes
---
## Description
Update all skill descriptions to include "Use when..." triggering clauses per Anthropic 2026 standard (R5 complete).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Uses audit from ISS-000086 to systematically fix all non-compliant descriptions.

## Files
- Modify: All `skills/*/SKILL.md` files with non-compliant descriptions (based on audit)

## Implementation Steps

**Step 1: Review audit from ISS-000086**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && cat .wrangler/memos/2026-02-03-skill-descriptions-audit.md
```

**Step 2: For each skill needing update, write new description**

Requirements for each description:
- Third-person voice
- Functional description (what it does)
- "Use when..." clause with specific triggers
- ≤1024 characters
- Relevant keywords for discoverability

Example transformation:
```yaml
# Before
description: Comprehensive code review framework for quality assurance.

# After
description: Orchestrates systematic code review with multi-level verification. Use when reviewing code changes, pull requests, or when quality assurance is needed.
```

**Step 3: Update each skill's frontmatter**

```bash
# For each skill:
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Edit skills/SKILL-NAME/SKILL.md frontmatter
```

**Step 4: Verify all descriptions now compliant**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && for f in skills/*/SKILL.md; do
  skill=$(dirname "$f" | sed 's|skills/||')
  desc=$(grep "^description:" "$f" | sed 's/description: //')
  if ! echo "$desc" | grep -q "Use when"; then
    echo "MISSING: $skill"
  fi
done
```

Expected: No output (all have "Use when")

**Step 5: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "refactor(skills): add 'Use when...' clauses to all descriptions

Updates all 47 skill descriptions to include triggering clauses per 
Anthropic 2026 standard for improved discoverability.

Part of Phase 2 bulk updates for SPEC-000043 (R5).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All 47 skills have "Use when..." in description
- [ ] All descriptions third-person voice
- [ ] All descriptions ≤1024 characters
- [ ] Descriptions include relevant keywords
- [ ] Skills discoverable via natural queries
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000086 (Phase 2, Task 7)
