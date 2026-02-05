---
id: ISS-000096
title: 'Phase 4, Task 3: Add workflow checklists to multi-step skills'
type: issue
status: open
priority: medium
labels:
  - phase-4
  - enhancement
  - R12-workflow-checklists
createdAt: '2026-02-03T01:05:37.452Z'
updatedAt: '2026-02-03T01:05:37.452Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 30 minutes
---
## Description
Add "Copy this checklist:" pattern to multi-step workflow skills (R12 complete).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Makes complex workflows easier to track and execute.

## Files
- Modify: SKILL.md for multi-step workflow skills
- Optional: Create checklist files in `assets/` if very long

## Implementation Steps

**Step 1: Identify multi-step workflow skills**

Review skills for:
- Multiple sequential steps
- Complex procedures
- Long verification processes

**Candidate skills from spec**:
- writing-specifications
- implementing-specifications
- reviewing-code
- systematic-debugging
- Any skill with >5 sequential steps

**Step 2: Add checklist sections to each skill**

Use standard pattern:
```markdown
## Workflow Checklist

Copy this checklist and track your progress:

- [ ] Step 1: [Description]
- [ ] Step 2: [Description]
- [ ] Step 3: [Description]
...
```

**Step 3: Ensure checklists are comprehensive**

For each skill:
- Include all major steps
- Make items actionable
- Keep items atomic (one action per checkbox)
- Order logically

**Step 4: Store long checklists in assets/ if needed**

If checklist >20 items, consider:
```bash
# Create assets/workflow-checklist.md
# Reference from SKILL.md
```

**Step 5: Commit checklists**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "feat(skills): add workflow checklists to multi-step skills

Implements 'Copy this checklist:' pattern per Anthropic 2026 standards 
for improved workflow tracking.

Part of Phase 4 for SPEC-000043 (R12).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Multi-step skills identified
- [ ] Checklists added using standard pattern
- [ ] Checklists are comprehensive and actionable
- [ ] Long checklists in assets/ if appropriate
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000095 (Phase 4, Task 2)
