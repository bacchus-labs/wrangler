---
id: ISS-000089
title: 'Phase 2, Task 10: Reduce verbosity in all skills'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R9-verbosity-reduction
createdAt: '2026-02-03T01:03:41.196Z'
updatedAt: '2026-02-03T01:19:22.624Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 90 minutes
---
## Description
Apply verbosity reduction to all skills based on audit from ISS-000088 (R9 complete).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Bulk cleanup to reduce token bloat while preserving unique value.

## Files
- Modify: All `skills/*/SKILL.md` files with verbosity (based on audit)

## Implementation Steps

**Step 1: Review audit from ISS-000088**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && cat .wrangler/memos/2026-02-03-skill-verbosity-audit.md
```

**Step 2: Apply reduction principles systematically**

For each skill marked 🟡 or 🔴:
- Remove unnecessary explanations of common concepts
- Compress redundant examples
- Cut obvious explanations
- Preserve unique wrangler-specific insights

Example patterns:
```markdown
❌ Remove: "TDD (Test-Driven Development) is a methodology where..."
✅ Keep: "Write tests first, verify RED, implement GREEN, refactor."

❌ Remove: "Git is a version control system that..."
✅ Keep: "Use git mv to preserve history when renaming."
```

**Step 3: Edit each verbose skill**

Process skills in priority order (🔴 first, then 🟡):
```bash
# For each skill needing reduction:
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Edit skills/SKILL-NAME/SKILL.md
```

**Step 4: Verify reduction without information loss**

After editing each skill, ensure:
- Core workflow intact
- Critical patterns preserved
- Unique methodologies retained
- Examples still demonstrate value

**Step 5: Measure token reduction**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && # Before/after line counts
git diff --stat skills/
```

**Step 6: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "refactor(skills): reduce verbosity across all skills

Removes unnecessary explanations while preserving unique wrangler-specific 
guidance. Estimated reduction: ~[N] lines.

Part of Phase 2 bulk updates for SPEC-000043 (R9).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All verbose skills processed
- [ ] No unnecessary common concept explanations
- [ ] Unique content preserved
- [ ] Examples concise and valuable
- [ ] Measurable token reduction achieved
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000088 (Phase 2, Task 9 - Phase 2 complete)
