---
id: ISS-000073
title: 'Phase 0, Task 2: Apply basic progressive disclosure to writing-skills'
type: issue
status: closed
priority: critical
labels:
  - phase-0
  - bootstrap
  - R4-progressive-disclosure
  - R7-directory-structure
  - writing-skills
createdAt: '2026-02-03T00:59:26.139Z'
updatedAt: '2026-02-03T01:08:20.338Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 20 minutes
---
## Description
Apply basic progressive disclosure to reduce writing-skills SKILL.md from 870 lines to <500 lines by moving heavy reference material to references/ subdirectory (R4/R7 subset).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Phase 0 bootstrap task. Get writing-skills to baseline compliance before full refinement in Phase 3 (which will achieve <400 line target).

## Files
- Modify: `skills/writing-skills/SKILL.md` (reduce to <500 lines)
- Create/Modify: Files in `skills/writing-skills/references/` subdirectory
- Note: `references/` directory already exists

## Implementation Steps

**Step 1: Analyze current writing-skills structure**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && wc -l skills/writing-skills/SKILL.md
ls -la skills/writing-skills/references/
```

Expected: 870+ lines in SKILL.md, check existing references/

**Step 2: Identify content to move**

Review SKILL.md and identify:
- Heavy reference material (persuasion techniques, CSO optimization details)
- Detailed methodology sections
- Extended examples
- Content suitable for references/ subdirectory

Keep in SKILL.md:
- Overview and core workflow
- Essential patterns
- Quick reference

**Step 3: Move content to references/ files**

Create/update reference files:
- `references/anthropic-best-practices.md` (if heavy Anthropic details exist)
- `references/testing-methodology.md` (TDD for skills details)
- `references/persuasion-techniques.md` (rationalization tables)
- Other reference files as appropriate

**Step 4: Update SKILL.md to reference moved content**

Add references like:
```markdown
For detailed persuasion techniques, see `references/persuasion-techniques.md`
```

**Step 5: Verify line count reduction**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && wc -l skills/writing-skills/SKILL.md
```

Expected: <500 lines (target for Phase 0)

**Step 6: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/writing-skills/ && git commit -m "refactor(skills): apply basic progressive disclosure to writing-skills

Part of Phase 0 bootstrap for SPEC-000043. Reduces SKILL.md to <500 lines 
by moving heavy reference material to references/ subdirectory.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] SKILL.md reduced to <500 lines
- [ ] Heavy content moved to references/ subdirectory
- [ ] SKILL.md explicitly references moved files
- [ ] No content lost, just reorganized
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000072 (Phase 0, Task 1)
