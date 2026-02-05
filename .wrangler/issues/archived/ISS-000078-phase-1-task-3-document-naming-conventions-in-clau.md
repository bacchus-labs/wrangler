---
id: ISS-000078
title: 'Phase 1, Task 3: Document naming conventions in CLAUDE.md'
type: issue
status: closed
priority: high
labels:
  - phase-1
  - infrastructure
  - R2-naming-conventions
  - documentation
createdAt: '2026-02-03T01:00:35.813Z'
updatedAt: '2026-02-03T01:12:01.829Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 10 minutes
---
## Description
Add gerund naming convention guidelines to CLAUDE.md (R2 documentation).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Infrastructure task. Documents naming standard before bulk renaming in Phase 2.

## Files
- Modify: `CLAUDE.md` (add Skill Naming Conventions section)

## Implementation Steps

**Step 1: Add Skill Naming Conventions section to CLAUDE.md**

Add near "Working with Skills" section:

```markdown
### Skill Naming Conventions

**Standard**: All skills use gerund form (verb + -ing)

**Rationale**: Anthropic 2026 standard for consistency and discoverability

**Examples**:
- ✅ `writing-skills` (gerund)
- ✅ `practicing-tdd` (gerund)
- ✅ `reviewing-code` (gerund)
- ❌ `test-driven-development` (noun phrase)
- ❌ `code-review` (noun)
- ❌ `create-issue` (imperative verb)

**Requirements**:
- Directory name matches frontmatter `name` field
- Use lowercase-with-dashes format
- Present continuous tense (verb + -ing)
```

**Step 2: Verify addition**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && grep -A 15 "Skill Naming Conventions" CLAUDE.md
```

**Step 3: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add CLAUDE.md && git commit -m "docs: add skill naming conventions to CLAUDE.md

Documents gerund naming standard per Anthropic 2026 guidelines.
Part of Phase 1 infrastructure for SPEC-000043.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Naming conventions section added
- [ ] Includes gerund form requirement
- [ ] Includes examples (good and bad)
- [ ] Integrated with existing content
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000077 (Phase 1, Task 2)
