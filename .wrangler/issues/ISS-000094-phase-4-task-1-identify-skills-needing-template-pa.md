---
id: ISS-000094
title: 'Phase 4, Task 1: Identify skills needing template patterns'
type: issue
status: open
priority: medium
labels:
  - phase-4
  - enhancement
  - R8-template-patterns
  - audit
createdAt: '2026-02-03T01:05:10.637Z'
updatedAt: '2026-02-03T01:05:10.637Z'
project: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
wranglerContext:
  agentId: plan-executor
  parentTaskId: '000043'
  estimatedEffort: 30 minutes
---
## Description
Identify skills that would benefit from strict or flexible templates (R8 preparation).

## Context
Reference: SPEC-000043-align-wrangler-skills-with-anthropic-2026-standard.md
Determines which skills should provide templates in assets/ subdirectory.

## Files
- Create: `.wrangler/memos/2026-02-03-skills-needing-templates.md`

## Implementation Steps

**Step 1: Review all skills for template opportunities**

Consider for templates:
- Skills with structured output formats
- Skills with multi-step workflows
- Skills with repeated patterns

**Candidate skills from spec**:
- writing-specifications
- implementing-specifications
- reviewing-code
- systematic-debugging

**Step 2: Categorize by template type**

**Strict templates** - Exact format required:
- API responses
- Data structures
- Configuration files

**Flexible templates** - Adaptable patterns:
- Workflow outlines
- Planning structures

**Checklist templates** - Copy-this pattern:
- Multi-step processes
- Verification checklists

**Step 3: Create recommendations document**

```markdown
# Skills Needing Templates - SPEC-000043

## Strict Templates

**skill-name**: [Purpose of template]
- Template location: `assets/template-name.ext`
- Usage: [When to use]

[... list all]

## Flexible Templates

**skill-name**: [Purpose of template]
- Template location: `assets/template-name.md`
- Adaptation guidance: [How to customize]

[... list all]

## Checklist Templates

**skill-name**: [Purpose of checklist]
- Location: In SKILL.md or `assets/checklist.md`
- Pattern: "Copy this checklist:"

[... list all]
```

**Step 4: Commit recommendations**

```bash
cd /Users/sam/medb/projects/wrangler/.worktrees/align-wrangler-skills-with-anthropic-2026-standard && git add .wrangler/memos/2026-02-03-skills-needing-templates.md && git commit -m "docs: identify skills needing templates for SPEC-000043

Recommends template additions for skills with structured workflows.

Part of Phase 4 for SPEC-000043 (R8).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

## Acceptance Criteria
- [ ] All skills reviewed for template opportunities
- [ ] Categorized by template type
- [ ] Specific recommendations for each
- [ ] Template locations specified
- [ ] Committed with clear message

## Dependencies
- Requires: ISS-000093 (Phase 3, Task 4 - Phase 3 complete)
