---
id: ISS-000090
title: 'Phase 3, Task 1: Complete writing-skills progressive disclosure (<400 lines)'
type: issue
status: closed
priority: high
labels:
  - phase-3
  - progressive-disclosure
  - R4-progressive-disclosure
  - R7-directory-structure
  - writing-skills
createdAt: '2026-02-03T01:04:01.026Z'
updatedAt: '2026-02-03T01:20:24.479Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 30 minutes
---
## Description
Complete progressive disclosure refinement of writing-skills, reducing SKILL.md from <500 lines (Phase 0 target) to <400 lines (final target) (R4/R7 complete for writing-skills).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Phase 0 achieved <500 lines. This task achieves final <400 line target with full organization.

## Files
- Modify: `skills/writing-skills/SKILL.md` (reduce to <400 lines)
- Modify/Create: Files in `skills/writing-skills/references/` and `skills/writing-skills/assets/`

## Implementation Steps

**Step 1: Measure current state**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && wc -l skills/writing-skills/SKILL.md
ls -la skills/writing-skills/references/
ls -la skills/writing-skills/assets/
```

**Step 2: Identify additional content to move**

Target structure per spec:
- `references/anthropic-best-practices.md`
- `references/testing-methodology.md` (TDD for skills)
- `references/persuasion-techniques.md` (rationalization tables)
- `references/cso-optimization.md` (Claude Search Optimization)
- `references/progressive-disclosure-patterns.md` (already exists from Phase 1)
- `assets/graphviz-conventions.dot` (if exists)

**Step 3: Move remaining heavy content**

Refine SKILL.md to contain only:
1. Overview (what + when)
2. Core workflow (essential steps)
3. Quick reference (key patterns)
4. Links to references/ for details

**Step 4: Verify organization**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && tree skills/writing-skills/
wc -l skills/writing-skills/SKILL.md
```

Expected: <400 lines in SKILL.md

**Step 5: Test skill loading**

Verify SKILL.md explicitly references supporting files:
```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && grep "references/" skills/writing-skills/SKILL.md
grep "assets/" skills/writing-skills/SKILL.md
```

**Step 6: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/writing-skills/ && git commit -m "refactor(skills): complete progressive disclosure for writing-skills

Achieves final <400 line target for SKILL.md with fully organized 
references/ and assets/ subdirectories. Per Anthropic 2026 standards.

Part of Phase 3 for SPEC-000043 (R4/R7).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] SKILL.md <400 lines
- [ ] All supporting files in subdirectories
- [ ] references/ and assets/ fully organized
- [ ] SKILL.md explicitly references supporting files
- [ ] No content lost, just reorganized
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000089 (Phase 2, Task 10 - Phase 2 complete)
