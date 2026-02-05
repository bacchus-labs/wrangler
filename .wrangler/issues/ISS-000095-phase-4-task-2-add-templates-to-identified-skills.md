---
id: ISS-000095
title: 'Phase 4, Task 2: Add templates to identified skills'
type: issue
status: open
priority: medium
labels:
  - phase-4
  - enhancement
  - R8-template-patterns
createdAt: '2026-02-03T01:05:24.692Z'
updatedAt: '2026-02-03T01:05:24.692Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 45 minutes
---
## Description
Add template patterns to skills identified in ISS-000094 (R8 complete).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Provides templates and checklists for structured workflows.

## Files
- Create: Template files in `skills/*/assets/` for identified skills
- Modify: SKILL.md to reference templates

## Implementation Steps

**Step 1: Review recommendations from ISS-000094**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && cat .wrangler/memos/2026-02-03-skills-needing-templates.md
```

**Step 2: Create template files**

For each recommended template:
```bash
# Create assets/ directory if needed
mkdir -p skills/SKILL-NAME/assets/

# Create template file
# e.g., skills/writing-specifications/assets/specification-template.md
```

**Step 3: Add templates using appropriate patterns**

**Strict template example**:
```markdown
# In assets/api-response-template.json
{
  "status": "success",
  "data": {},
  "error": null
}
```

**Flexible template example**:
```markdown
# In assets/planning-template.md
## Goal
[What you're building]

## Approach
[How you'll build it]
...
```

**Checklist template example**:
```markdown
# In SKILL.md
Copy this checklist:

- [ ] Step 1
- [ ] Step 2
...
```

**Step 4: Update SKILL.md to reference templates**

Add template usage sections:
```markdown
## Template

Use the template in `assets/template-name.ext`:
[Instructions on how to use]
```

**Step 5: Commit templates**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add skills/ && git commit -m "feat(skills): add template patterns to workflow skills

Provides strict templates, flexible templates, and checklists for 
structured workflows per Anthropic 2026 standards.

Part of Phase 4 for SPEC-000043 (R8).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] Templates created for identified skills
- [ ] Templates stored in assets/ subdirectory
- [ ] SKILL.md references templates with usage instructions
- [ ] Templates are actionable and self-contained
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000094 (Phase 4, Task 1)
