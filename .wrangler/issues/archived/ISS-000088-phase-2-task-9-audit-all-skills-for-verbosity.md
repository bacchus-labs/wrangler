---
id: ISS-000088
title: 'Phase 2, Task 9: Audit all skills for verbosity'
type: issue
status: closed
priority: high
labels:
  - phase-2
  - bulk-updates
  - R9-verbosity-reduction
  - audit
createdAt: '2026-02-03T01:03:24.578Z'
updatedAt: '2026-02-03T01:18:48.359Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 45 minutes
---
## Description
Audit all 47 skills for unnecessary verbosity, creating inventory of content to reduce (R9 preparation).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Systematic review before bulk verbosity reduction.

## Files
- Create: `.wrangler/memos/2026-02-03-skill-verbosity-audit.md`

## Implementation Steps

**Step 1: Review each skill for verbosity patterns**

Check for:
- Unnecessary explanations of common concepts
- Redundant examples
- Over-explanation of obvious patterns
- Content not adding unique value

**Step 2: Categorize by verbosity level**

- 🟢 Concise (good as-is)
- 🟡 Minor verbosity (small reductions possible)
- 🔴 High verbosity (significant reduction needed)

**Step 3: Create audit document**

```markdown
# Skill Verbosity Audit - SPEC-000043

## Summary
- Total skills: 47
- Concise (🟢): [N]
- Minor verbosity (🟡): [N]
- High verbosity (🔴): [N]

## Concise Skills 🟢

**skill-name** - [Brief note on why concise]

[... list]

## Minor Verbosity 🟡

**skill-name** - [What to reduce]
- Specific examples of unnecessary content
- Estimated lines to remove

[... list]

## High Verbosity 🔴

**skill-name** - [What to reduce]
- Specific sections that are verbose
- Estimated lines to remove
- Unique content to preserve

[... list]

## Token Reduction Estimate

Total estimated reduction: ~[N] lines
```

**Step 4: Commit audit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add .wrangler/memos/2026-02-03-skill-verbosity-audit.md && git commit -m "docs: audit skills for verbosity in SPEC-000043

Categorizes all 47 skills by verbosity level and identifies content 
for reduction.

Part of Phase 2 bulk updates for SPEC-000043 (R9).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All 47 skills reviewed
- [ ] Verbosity levels assigned
- [ ] Specific reduction opportunities identified
- [ ] Token reduction estimate provided
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000087 (Phase 2, Task 8)
