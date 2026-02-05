---
id: ISS-000101
title: Update implement-spec-v2 documentation and examples
type: issue
status: closed
priority: medium
labels:
  - implement-spec-v2-improvements
  - documentation
createdAt: '2026-02-03T20:29:57.785Z'
updatedAt: '2026-02-03T20:35:11.796Z'
project: implement-spec-v2-improvements
---
## Description

Update command documentation and examples to reflect new REVIEW phase and self-healing behavior.

## Context

After adding REVIEW phase and self-healing to VERIFY, we need to update user-facing documentation so users understand the new workflow.

## Files

- Modify: `commands/implement-spec-v2.md`
- Modify: `skills/implement-spec-v2/examples/simple-feature.md` (if exists)

## Implementation Steps

**Step 1: Update command documentation**

Add section about REVIEW phase to `commands/implement-spec-v2.md`:

```markdown
## REVIEW Phase (New)

After planning, the workflow validates that all acceptance criteria have implementing tasks:

- **Coverage >= 95%**: Automatic approval, proceed to execution
- **Coverage < 95%**: Agent offers to create missing tasks
  - Option A: Auto-create (recommended)
  - Option B: Proceed anyway (risky)
  - Option C: Abort and replan

This catches planning gaps early before wasting time on execution.
```

**Step 2: Update VERIFY phase documentation**

Add section about self-healing:

```markdown
## VERIFY Phase - Self-Healing

The workflow autonomously fixes minor compliance gaps:

**Auto-fixed without user input:**
- Missing test coverage
- Missing documentation
- Missing edge case handling

**Escalated to user:**
- Fundamental requirement gaps (core functionality missing)
- After 3 failed fix attempts
- Compliance < 90% after remediation

**Quality gates:**
- >= 95%: Excellent, proceed
- 90-94%: Good with warnings, proceed
- < 90%: Needs work, escalate
```

**Step 3: Add example workflow with REVIEW**

Add to examples showing REVIEW phase in action:

```markdown
### Example: REVIEW Phase Catches Gap

Spec has 10 acceptance criteria. Plan creates 8 tasks.

**REVIEW phase:**
```
Coverage: 80% (8/10 AC covered)
Missing AC:
- AC-009: API rate limiting
- AC-010: Error logging

Options:
a) Auto-create 2 tasks [Recommended]
b) Proceed anyway (risk VERIFY failure)
c) Abort and replan

> User chooses (a)

Creating ISS-XXX: Implement rate limiting
Creating ISS-XXX: Add error logging

Updated coverage: 100%
Proceeding to EXECUTE...
```
```

**Step 4: Add self-healing example**

Show VERIFY phase self-healing in examples:

```markdown
### Example: VERIFY Self-Healing

All tasks complete. Compliance audit: 92%

**Gaps found:**
- AUTO_FIX_TEST: Missing test for error handling
- AUTO_FIX_DOC: Missing API docs for helper function

**Remediation (iteration 1):**
Creating ISS-XXX: Add error handling test
Creating ISS-XXX: Document helper API
Executing...

**Re-audit:** 96% compliance

Result: ✅ PASS → Proceeding to PUBLISH
```

**Step 5: Update workflow diagram**

Update any workflow diagrams to show:
```
INIT → PLAN → REVIEW → EXECUTE → VERIFY (with self-heal loop) → PUBLISH → COMPLETE
```

## Acceptance Criteria

- [ ] Command documentation updated with REVIEW phase
- [ ] VERIFY self-healing documented
- [ ] Quality gate levels explained (95%, 90%, <90%)
- [ ] Example added showing REVIEW catching gaps
- [ ] Example added showing VERIFY self-healing
- [ ] Workflow diagram updated
- [ ] Clear guidance on when escalation occurs

## Dependencies

Requires completion of: ISS-000100 (self-healing in VERIFY)

---
**Completion Notes (2026-02-03T20:35:11.788Z):**
Updated command documentation and examples to reflect REVIEW phase and self-healing behavior. Added examples showing coverage gap detection, autonomous remediation, and escalation scenarios.
