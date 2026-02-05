---
id: ISS-000079
title: 'Phase 1, Task 4: Document progressive disclosure patterns in writing-skills'
type: issue
status: closed
priority: high
labels:
  - phase-1
  - infrastructure
  - R11-documentation
  - progressive-disclosure
createdAt: '2026-02-03T01:00:52.712Z'
updatedAt: '2026-02-03T01:12:16.798Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 15 minutes
---
## Description
Create `skills/writing-skills/references/progressive-disclosure-patterns.md` documenting the three patterns for organizing complex skills (R11).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Infrastructure task. Provides reference material for skill authors.

## Files
- Create: `skills/writing-skills/references/progressive-disclosure-patterns.md`

## Implementation Steps

**Step 1: Create progressive disclosure patterns document**

```markdown
# Progressive Disclosure Patterns

## Overview

Progressive disclosure organizes complex skills into manageable pieces, respecting token budgets while preserving complete information.

## When to Use Progressive Disclosure

Use when skill meets ANY of these criteria:
- SKILL.md >500 lines
- Heavy reference material
- Multiple supporting files needed
- Complex multi-faceted workflows

## Pattern 1: High-Level Guide with References

**Structure**:
```
skill-name/
├── SKILL.md (overview + core workflow, <400 lines)
├── references/
│   ├── detailed-topic-1.md
│   ├── detailed-topic-2.md
│   └── edge-cases.md
```

**Use when**: Skill has extensive reference material

**Example**: `writing-skills` - core workflow in SKILL.md, detailed patterns in references/

## Pattern 2: Domain-Specific Organization

**Structure**:
```
skill-name/
├── SKILL.md (overview)
├── references/
│   ├── domain-a/
│   │   └── specifics.md
│   └── domain-b/
│       └── specifics.md
```

**Use when**: Skill covers multiple distinct domains

## Pattern 3: Conditional Details

**Structure**:
```
skill-name/
├── SKILL.md (common workflow)
├── references/
│   ├── edge-case-1.md
│   └── edge-case-2.md
```

**Use when**: Skill has common path + rare edge cases

## Best Practices

1. **SKILL.md is the entry point** - Always start there
2. **Explicit references** - Link to references/ files by name
3. **No duplication** - Information lives in one place
4. **Logical organization** - Group related content
5. **Respect token budget** - SKILL.md <500 lines target
```

**Step 2: Verify creation**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && cat skills/writing-skills/references/progressive-disclosure-patterns.md
```

**Step 3: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/writing-skills/references/progressive-disclosure-patterns.md && git commit -m "docs: add progressive disclosure patterns reference

Documents three patterns for organizing complex skills per Anthropic 2026 
standards. Part of Phase 1 infrastructure for SPEC-000043.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] File created in correct location
- [ ] Documents all three patterns
- [ ] Includes examples for each pattern
- [ ] Provides guidance on when to use each
- [ ] References Anthropic standards
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000078 (Phase 1, Task 3)
