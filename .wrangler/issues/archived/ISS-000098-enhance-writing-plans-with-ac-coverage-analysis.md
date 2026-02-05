---
id: ISS-000098
title: Enhance writing-plans with AC coverage analysis
type: issue
status: closed
priority: high
labels:
  - implement-spec-v2-improvements
  - writing-plans
createdAt: '2026-02-03T20:28:37.178Z'
updatedAt: '2026-02-03T20:30:53.854Z'
project: implement-spec-v2-improvements
---
## Description

Add acceptance criteria (AC) extraction and coverage analysis to the writing-plans skill. This enables the REVIEW phase in implement-spec-v2 to validate planning completeness.

## Context

Reference: RCA memo `.wrangler/memos/2026-02-03-RCA-implement-spec-v2-incomplete-execution.md`

The VERIFY phase in implement-spec-v2 often finds compliance < 100% because planning didn't create tasks for all acceptance criteria. We need to detect this gap during planning and surface coverage in the plan file.

## Files

- Modify: `skills/writing-plans/SKILL.md`

## Implementation Steps

**Step 1: Add AC extraction instructions**

Add section to Phase 1 (Read and Analyze) in writing-plans:

```markdown
### Extract Acceptance Criteria

After reading specification, extract all acceptance criteria using LLM:
- AC explicitly labeled (AC-001, AC-002, etc.)
- Requirements from "Acceptance Criteria" sections
- Test requirements from "Testing" sections
- Manual verification steps

Store as structured list for task mapping.
```

**Step 2: Add task-to-AC mapping logic**

Add to Phase 2 (Plan Task Breakdown):

```markdown
### Map Tasks to Acceptance Criteria

For each task, determine which acceptance criteria it satisfies:
- Analyze task description and implementation scope
- Identify which AC are fully/partially addressed
- Calculate estimated compliance contribution per task
- Flag AC with no implementing tasks
```

**Step 3: Add coverage template to plan file format**

Add templated section to optional plan file template (Phase 4):

```markdown
---

## Acceptance Criteria Coverage (Auto-generated)

### Spec Acceptance Criteria
- AC-001: [description]
- AC-002: [description]
...

### Task-to-AC Mapping
| Task ID | Satisfies AC | Estimated Compliance Contribution |
|---------|-------------|----------------------------------|
| ISS-001 | AC-001, AC-003 | 15% |
| ISS-002 | AC-002 | 10% |
...

### Coverage Summary
- Total AC: 15
- AC covered by tasks: 14 (93%)
- AC with no implementing tasks: AC-012 ⚠️
- Estimated post-execution compliance: 93%

### Risk Areas
- [List any AC with no tasks or partial coverage]
```

**Step 4: Add satisfiesAcceptanceCriteria to issue metadata**

Update MCP issue creation pattern (Phase 3) to include:

```typescript
wranglerContext: {
  agentId: "plan-executor",
  parentTaskId: "",
  estimatedEffort: "[time estimate]",
  satisfiesAcceptanceCriteria: ["AC-001", "AC-003"] // NEW
}
```

**Step 5: Update execution handoff message**

Update the execution handoff message to mention coverage report:

```markdown
**Plan complete:**
- **Issues created**: [N] tasks in issue tracker
- **Plan file** (if created): Contains AC coverage analysis
- **Estimated compliance**: [X]%
```

## Acceptance Criteria

- [ ] AC extraction instructions added to Phase 1
- [ ] Task-to-AC mapping logic added to Phase 2
- [ ] Coverage template added for plan files
- [ ] satisfiesAcceptanceCriteria added to issue metadata pattern
- [ ] Execution handoff message mentions coverage
- [ ] Changes are backwards compatible (coverage is optional)

## Dependencies

None - this is the foundation for other tasks

---
**Completion Notes (2026-02-03T20:30:53.843Z):**
Completed AC coverage analysis enhancements to writing-plans skill. Changes are backwards compatible - coverage analysis is optional and only included when plan file is created.
