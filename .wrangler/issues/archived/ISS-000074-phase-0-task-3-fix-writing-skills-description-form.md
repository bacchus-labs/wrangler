---
id: ISS-000074
title: 'Phase 0, Task 3: Fix writing-skills description format'
type: issue
status: closed
priority: critical
labels:
  - phase-0
  - bootstrap
  - R5-description-format
  - writing-skills
createdAt: '2026-02-03T00:59:41.105Z'
updatedAt: '2026-02-03T01:08:28.009Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 5 minutes
---
## Description
Update writing-skills frontmatter description to follow Anthropic standard with "Use when..." triggering clause (R5 subset).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Phase 0 bootstrap task. Ensure writing-skills description optimizes for discoverability.

## Files
- Modify: `skills/writing-skills/SKILL.md` (frontmatter description)

## Implementation Steps

**Step 1: Read current description**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && head -10 skills/writing-skills/SKILL.md
```

**Step 2: Update description to standard format**

Ensure frontmatter follows this pattern:
```yaml
---
name: writing-skills
description: [Functional description]. Use when creating new skills, updating existing skills, or when skill authoring guidance is needed.
---
```

Requirements:
- Third-person voice
- Functional description of what it does
- "Use when..." clause with specific triggers
- ≤1024 characters
- Includes keywords: skills, authoring, creating, updating

**Step 3: Verify format**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && head -10 skills/writing-skills/SKILL.md | grep "description:"
```

Expected: Description contains "Use when" clause

**Step 4: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/writing-skills/SKILL.md && git commit -m "refactor(skills): fix writing-skills description format

Part of Phase 0 bootstrap for SPEC-000043. Adds 'Use when...' triggering 
clause to description for better discoverability.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Description includes "Use when..." clause
- [ ] Description is third-person voice
- [ ] Description ≤1024 characters
- [ ] Includes relevant triggering keywords
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000073 (Phase 0, Task 2)
