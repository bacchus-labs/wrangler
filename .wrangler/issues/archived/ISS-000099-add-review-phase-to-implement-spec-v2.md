---
id: ISS-000099
title: Add REVIEW phase to implement-spec-v2
type: issue
status: closed
priority: high
labels:
  - implement-spec-v2-improvements
createdAt: '2026-02-03T20:29:02.710Z'
updatedAt: '2026-02-03T20:32:20.766Z'
project: implement-spec-v2-improvements
---
## Description

Add new REVIEW phase between PLAN and EXECUTE that validates AC coverage before execution starts. This is an advisory gate that offers to fix gaps rather than blocking arbitrarily.

## Context

Reference: RCA memo and conversation design decisions

The current implement-spec-v2 workflow jumps from PLAN directly to EXECUTE without validating that the plan covers all acceptance criteria. This leads to discovering gaps only after 15+ minutes of execution in VERIFY phase.

REVIEW phase catches planning gaps early and offers to create supplemental tasks.

## Files

- Modify: `skills/implement-spec-v2/SKILL.md`

## Implementation Steps

**Step 1: Insert REVIEW phase section**

Add new Phase 2 between existing PLAN and EXECUTE (renumber existing phases):

```markdown
## Phase 2: REVIEW - Validate Planning Completeness

**Purpose**: Verify 1:1 mapping between plan tasks and spec acceptance criteria BEFORE execution starts.

**Actions**:

1. **Read the plan file** (created in PLAN phase)
   - Extract "Acceptance Criteria Coverage" section
   - Read coverage summary

2. **Validate coverage**
   - Coverage >= 95%: ✅ PASS
   - Coverage < 95%: ⚠️ NEEDS ATTENTION

3. **If coverage < 95%:**
   - Present coverage report to user
   - List AC with no implementing tasks
   - Offer options:
     a. Auto-create missing tasks (Recommended)
     b. Proceed anyway (risks VERIFY failure)
     c. Abort and replan from scratch
   - Get user decision

4. **If auto-create chosen:**
   - For each uncovered AC:
     - Create MCP issue with implementation details
     - Add to tasksPlanned list
   - Update plan file with new tasks
   - Re-calculate coverage

5. **Update session checkpoint**
   - Log REVIEW phase completion
   - Record coverage percentage
   - Record any supplemental tasks created

**Quality Gate**:
- Coverage >= 95%: Automatic PASS → EXECUTE
- Coverage < 95%: User decision required → EXECUTE or ABORT

**Output**: Validated plan with >= 95% AC coverage

**Skip Condition**: If spec has no explicit acceptance criteria section, skip REVIEW and proceed to EXECUTE with warning.
```

**Step 2: Renumber subsequent phases**

Update phase numbers:
- Old Phase 2 (EXECUTE) → New Phase 3
- Old Phase 3 (VERIFY) → New Phase 4
- Old Phase 4 (PUBLISH) → New Phase 5
- Old Phase 5 (COMPLETE) → New Phase 6

**Step 3: Update workflow diagram**

Update phase flow diagram at top of skill:

```
INIT → PLAN → REVIEW → EXECUTE → VERIFY → PUBLISH → COMPLETE
```

**Step 4: Update Quality Gates Summary table**

Add REVIEW row to quality gates table:

| Phase | Gate | Required |
|-------|------|----------|
| INIT | Worktree created | Yes |
| PLAN | Issues created | Yes |
| REVIEW | AC coverage >= 95% | Advisory |
| EXECUTE | All tasks complete | Yes |
| VERIFY | 100% compliance | Yes |
| VERIFY | All tests passing | Yes |
| PUBLISH | PR ready | Yes |

**Step 5: Add session_phase logging for REVIEW**

Add checkpoint/logging instructions:

```
session_phase(
  sessionId: SESSION_ID,
  phase: "review",
  status: "complete",
  metadata: {
    coverage_percentage: COVERAGE,
    supplemental_tasks_created: N
  }
)
```

## Acceptance Criteria

- [ ] REVIEW phase section added between PLAN and EXECUTE
- [ ] Phase numbering updated throughout document
- [ ] Workflow diagram updated
- [ ] Quality gates table includes REVIEW
- [ ] Session logging instructions included
- [ ] Skip condition documented for specs without AC
- [ ] Advisory nature of gate is clear (offers options, doesn't hard-block)

## Dependencies

Requires completion of: ISS-000098 (AC coverage in writing-plans)

---
**Completion Notes (2026-02-03T20:32:20.759Z):**
Added REVIEW phase between PLAN and EXECUTE. Phase validates AC coverage and offers to create supplemental tasks if coverage < 95%. Advisory gate with skip condition for specs without AC.
