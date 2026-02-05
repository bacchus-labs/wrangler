---
id: ISS-000091
title: >-
  Phase 3, Task 2: Identify other skills >300 lines requiring progressive
  disclosure
type: issue
status: closed
priority: high
labels:
  - phase-3
  - progressive-disclosure
  - R6-token-efficiency
  - audit
createdAt: '2026-02-03T01:04:20.580Z'
updatedAt: '2026-02-03T01:21:04.681Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 30 minutes
---
## Description
Identify all skills >300 lines (excluding writing-skills) that require progressive disclosure treatment (R6 audit).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Determines which skills need progressive disclosure in subsequent tasks.

## Files
- Create: `.wrangler/memos/2026-02-03-skills-needing-progressive-disclosure.md`

## Implementation Steps

**Step 1: Get line counts for all skills**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && for f in skills/*/SKILL.md; do
  lines=$(wc -l < "$f")
  skill=$(dirname "$f" | sed 's|skills/||')
  echo "$lines $skill"
done | sort -rn > /tmp/skill-line-counts.txt

cat /tmp/skill-line-counts.txt
```

**Step 2: Categorize by line count**

Group skills:
- 🟢 <300 lines (good as-is)
- 🟡 300-500 lines (monitor, may need split)
- 🔴 >500 lines (MUST apply progressive disclosure)

**Step 3: Create analysis document**

```markdown
# Skills Needing Progressive Disclosure - SPEC-000043

## Summary
- Total skills: 47
- Compliant (<300 lines): [N]
- Monitor (300-500 lines): [N]
- Requires split (>500 lines): [N]

## Compliant Skills (<300 lines) 🟢

| Skill | Lines | Notes |
|-------|-------|-------|
| skill-name | 250 | Good |
[... list all]

## Monitor (300-500 lines) 🟡

| Skill | Lines | Action Needed |
|-------|-------|---------------|
| skill-name | 450 | Review for reduction opportunities |
[... list all]

## Requires Progressive Disclosure (>500 lines) 🔴

| Skill | Lines | Proposed Structure |
|-------|-------|-------------------|
| writing-skills | ~400 | DONE in Phase 0/Phase 3 Task 1 |
| skill-name-2 | 650 | Move X to references/, Y to assets/ |
[... list all needing split]

## Recommendations

For each 🔴 skill:
- Specific content to move to references/
- Content to move to assets/
- Target SKILL.md line count
```

**Step 4: Commit analysis**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add .wrangler/memos/2026-02-03-skills-needing-progressive-disclosure.md && git commit -m "docs: identify skills needing progressive disclosure

Analyzes all 47 skills by line count to determine progressive disclosure 
requirements.

Part of Phase 3 for SPEC-000043 (R6).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All 47 skills measured
- [ ] Categorized by line count
- [ ] Specific recommendations for >500 line skills
- [ ] Analysis document created
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000090 (Phase 3, Task 1)
