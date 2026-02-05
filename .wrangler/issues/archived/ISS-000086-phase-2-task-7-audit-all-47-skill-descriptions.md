---
id: ISS-000086
title: 'Phase 2, Task 7: Audit all 47 skill descriptions'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R5-description-format
  - audit
createdAt: '2026-02-03T01:02:51.890Z'
updatedAt: '2026-02-03T01:17:12.982Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 30 minutes
---
## Description
Audit all 47 skill descriptions to identify which ones lack "Use when..." triggering clauses (R5 preparation).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Creates inventory of descriptions needing fixes before bulk update.

## Files
- Create: `.wrangler/memos/2026-02-03-skill-descriptions-audit.md`

## Implementation Steps

**Step 1: Extract all skill descriptions**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && for f in skills/*/SKILL.md; do
  skill=$(dirname "$f" | sed 's|skills/||')
  desc=$(grep "^description:" "$f" | head -1 | sed 's/description: //')
  echo "**$skill**: $desc"
done > /tmp/descriptions.txt
```

**Step 2: Categorize descriptions**

Review each and categorize:
- ✅ Has "Use when..." clause
- ❌ Missing "Use when..." clause
- ⚠️ Has triggering info but not "Use when..." format

**Step 3: Create audit document**

```markdown
# Skill Descriptions Audit - SPEC-000043

## Summary
- Total skills: 47
- Compliant (has "Use when..."): [N]
- Missing trigger clause: [N]
- Needs reformatting: [N]

## Compliant Descriptions ✅

**skill-name**: Description text. Use when [triggers].

[... list all compliant ones]

## Missing Trigger Clause ❌

**skill-name**: Description text. [NO USE WHEN CLAUSE]

[... list all needing clause]

## Needs Reformatting ⚠️

**skill-name**: Description has triggering info but not "Use when..." format

[... list all needing reformat]
```

**Step 4: Commit audit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add .wrangler/memos/2026-02-03-skill-descriptions-audit.md && git commit -m "docs: audit skill descriptions for SPEC-000043

Categorizes all 47 skills by description compliance with Anthropic 2026 
standard 'Use when...' pattern.

Part of Phase 2 bulk updates for SPEC-000043 (R5).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All 47 skills reviewed
- [ ] Descriptions categorized
- [ ] Audit document created
- [ ] Summary counts accurate
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000085 (Phase 2, Task 6)
