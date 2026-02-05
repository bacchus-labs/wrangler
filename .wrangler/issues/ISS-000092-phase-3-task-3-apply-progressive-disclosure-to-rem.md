---
id: ISS-000092
title: 'Phase 3, Task 3: Apply progressive disclosure to remaining oversized skills'
type: issue
status: open
priority: high
labels:
  - phase-3
  - progressive-disclosure
  - R4-progressive-disclosure
  - R7-directory-structure
createdAt: '2026-02-03T01:04:37.591Z'
updatedAt: '2026-02-03T01:04:37.591Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 60 minutes
---
## Description
Apply progressive disclosure to all skills identified as >500 lines in ISS-000091 (excluding writing-skills which is already done) (R4/R7 complete).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Brings all oversized skills into compliance with token efficiency standards.

## Files
- Modify: SKILL.md for each oversized skill
- Create: `references/` and `assets/` subdirectories as needed

## Implementation Steps

**Step 1: Review skills needing progressive disclosure**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && cat .wrangler/memos/2026-02-03-skills-needing-progressive-disclosure.md | grep "🔴"
```

**Step 2: For each skill >500 lines (excluding writing-skills)**

Apply standard structure:
```
skill-name/
├── SKILL.md (overview + core workflow, <500 lines)
├── references/ (detailed documentation)
└── assets/ (templates, boilerplate)
```

**Step 3: Process each skill systematically**

For each oversized skill:
1. Create `references/` and `assets/` subdirectories if needed
2. Identify heavy content to move
3. Move content to appropriate subdirectory
4. Update SKILL.md to reference moved files
5. Verify line count <500 (ideally <400)

**Step 4: Verify all skills now compliant**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && for f in skills/*/SKILL.md; do
  lines=$(wc -l < "$f")
  if [ $lines -gt 500 ]; then
    skill=$(dirname "$f" | sed 's|skills/||')
    echo "EXCEEDS: $skill ($lines lines)"
  fi
done
```

Expected: No output (all <500 lines)

**Step 5: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "refactor(skills): apply progressive disclosure to oversized skills

Brings all skills >500 lines into compliance with token efficiency 
standards using subdirectory structure.

Part of Phase 3 for SPEC-000043 (R4/R7).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All skills >500 lines processed
- [ ] All skills now <500 lines in SKILL.md
- [ ] Supporting files in subdirectories
- [ ] SKILL.md explicitly references supporting files
- [ ] No content lost
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000091 (Phase 3, Task 2)
