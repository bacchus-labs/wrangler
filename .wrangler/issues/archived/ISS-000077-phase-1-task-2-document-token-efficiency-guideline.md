---
id: ISS-000077
title: 'Phase 1, Task 2: Document token efficiency guidelines in CLAUDE.md'
type: issue
status: closed
priority: high
labels:
  - phase-1
  - infrastructure
  - R6-token-efficiency
  - documentation
createdAt: '2026-02-03T01:00:23.879Z'
updatedAt: '2026-02-03T01:11:47.247Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 10 minutes
---
## Description
Add token efficiency guidelines to CLAUDE.md as documented in SPEC-000043 (R6).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Infrastructure task. Documents standards that will guide all skill updates.

## Files
- Modify: `CLAUDE.md` (add Token Efficiency Guidelines section)

## Implementation Steps

**Step 1: Locate appropriate section in CLAUDE.md**

Find best location for new guidelines (likely near "Working with Skills" section).

**Step 2: Add Token Efficiency Guidelines section**

```markdown
### Token Efficiency Guidelines

**Principle**: "The context window is a public good"

**Skill File Size Limits**:
- SKILL.md body: <500 lines (target: 300-400 lines)
- Getting-started workflows: <150 words
- Frequently-used skills: <200 words total
- Complex skills: <500 words main content, rest in `references/`

**Progressive Disclosure**:
- Skills >500 lines MUST use progressive disclosure
- Heavy content moves to `references/` subdirectory
- SKILL.md explicitly references supporting files

**Verbosity Reduction**:
- Only add context Claude doesn't have
- Challenge each paragraph: "Does this justify its token cost?"
- Assume Claude knows common concepts
- Focus on unique skill-specific guidance
```

**Step 3: Verify integration**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && grep -A 10 "Token Efficiency" CLAUDE.md
```

**Step 4: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add CLAUDE.md && git commit -m "docs: add token efficiency guidelines to CLAUDE.md

Documents Anthropic 2026 standards for skill file size limits and 
progressive disclosure. Part of Phase 1 infrastructure for SPEC-000043.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Token efficiency section added to CLAUDE.md
- [ ] Includes file size limits
- [ ] Includes progressive disclosure requirements
- [ ] Includes verbosity reduction principles
- [ ] Integrated naturally with existing content
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000076 (Phase 1, Task 1)
