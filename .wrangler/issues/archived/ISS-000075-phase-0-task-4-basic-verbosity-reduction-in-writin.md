---
id: ISS-000075
title: 'Phase 0, Task 4: Basic verbosity reduction in writing-skills'
type: issue
status: closed
priority: critical
labels:
  - phase-0
  - bootstrap
  - R9-verbosity-reduction
  - writing-skills
createdAt: '2026-02-03T00:59:54.142Z'
updatedAt: '2026-02-03T01:10:55.715Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 15 minutes
---
## Description
Remove most egregious verbosity from writing-skills, focusing content on unique skill-specific patterns (R9 subset).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Phase 0 bootstrap task. Basic cleanup to prevent verbose patterns from being followed during spec implementation.

## Files
- Modify: `skills/writing-skills/SKILL.md`

## Implementation Steps

**Step 1: Review for verbosity**

Look for:
- Unnecessary explanations of common concepts
- Redundant examples
- Over-explanation of obvious patterns
- Content that doesn't add unique value

**Step 2: Apply verbosity reduction principles**

- Remove explanations Claude already knows
- Keep only unique insights and wrangler-specific patterns
- Compress examples to essential demonstrations
- Focus on what's novel about skill authoring

Example patterns to remove:
```markdown
❌ "Skills are a powerful way to encapsulate knowledge..."
❌ "YAML is a human-readable data serialization format..."
✅ Keep: Specific skill authoring patterns unique to wrangler
```

**Step 3: Verify content remains useful**

Ensure removal didn't lose:
- Core workflow steps
- Critical patterns
- Essential examples
- Unique methodologies

**Step 4: Commit**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/writing-skills/SKILL.md && git commit -m "refactor(skills): basic verbosity reduction in writing-skills

Part of Phase 0 bootstrap for SPEC-000043. Removes unnecessary explanations 
while preserving unique skill-specific guidance.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Removed unnecessary explanations of common concepts
- [ ] Preserved unique wrangler-specific patterns
- [ ] No loss of essential information
- [ ] Content more focused and concise
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000074 (Phase 0, Task 3)
