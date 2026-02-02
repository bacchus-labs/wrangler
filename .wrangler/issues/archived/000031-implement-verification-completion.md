---
id: '000031'
title: 'Task 5: Add verification and completion workflow to implement skill'
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - documentation
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:16.497Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: '000030'
  estimatedEffort: 25 minutes
---
## Description

Add the final verification and completion workflow section to the implement skill. This defines what happens after all tasks are complete: final test run, requirements verification, TDD compliance aggregation, and integration with finishing-a-development-branch skill.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

This is the final phase before returning control to the user. It ensures:
1. All tests pass (final verification)
2. All requirements met (checklist validation)
3. TDD compliance documented (aggregate certifications)
4. User presented with completion options (merge/PR/continue/discard)

Integration point: finishing-a-development-branch skill

## Files

- Modify: `skills/implement/SKILL.md` (add verification section after blocker detection)

## Implementation Steps

**Step 1: Verify previous sections exist**

```bash
grep "## Blocker Detection" skills/implement/SKILL.md
```

Expected: Section exists (from previous task)

**Step 2: Add verification and completion section**

Append to `skills/implement/SKILL.md` after blocker detection:

```markdown

## Final Verification & Completion

After all tasks complete, verify entire implementation before presenting to user.

### Verification Phase

#### 1. Run Full Test Suite

Execute complete test suite to verify no regressions:

```bash
# Run all tests (adjust command for project's test framework)
npm test  # or: pytest, cargo test, go test, etc.
```

**Capture:**
- Total tests run
- Pass/fail counts
- Execution time
- Any warnings or errors

**Expected:** All tests pass, exit code 0

**If tests fail:**
1. Check if failures are in newly implemented code → Dispatch fix subagent
2. Check if failures are regressions → Dispatch fix subagent
3. If fix fails after 2 attempts → ESCALATE (blocker)

**Do NOT proceed to completion if tests failing.**

#### 2. Verify Requirements Met

Re-read original scope (specification/plan/issues) and create checklist:

```markdown
## Requirements Verification

Scope: [spec/plan/issues reference]

### Requirements Checklist

From original scope:
- [ ] Requirement 1: [description]
  → Implemented in: [files]
  → Verified by: [tests]

- [ ] Requirement 2: [description]
  → Implemented in: [files]
  → Verified by: [tests]

...

Status: [X/Y] requirements met
```

**Check each requirement:**
- ✅ Code exists for this requirement
- ✅ Tests exist for this requirement
- ✅ Tests pass for this requirement

**If any requirement not met:**
→ STOP - This is a gap in implementation
→ ESCALATE to user: "Requirement [X] not fully implemented"

#### 3. Aggregate TDD Compliance Certifications

Collect TDD Compliance Certifications from all implementation subagents:

```markdown
## TDD Compliance Summary

[Aggregate all certification tables from subagent reports]

### Task 1: [title]
| Function | Test File | Watched Fail? | Watched Pass? | Notes |
|----------|-----------|---------------|---------------|-------|
| funcA    | test.ts:5 | YES           | YES           | ✓     |
| funcB    | test.ts:12| YES           | YES           | ✓     |

### Task 2: [title]
| Function | Test File | Watched Fail? | Watched Pass? | Notes |
|----------|-----------|---------------|---------------|-------|
| funcC    | test.ts:20| YES           | YES           | ✓     |

...

### Summary
- Total functions: [N]
- Followed RED-GREEN-REFACTOR: [N/N]
- Deviations: [list any "NO" entries with justification]
```

**Verify:**
- Every new function has certification entry
- No missing certifications (subagents provided complete reports)
- Any "NO" entries are justified with valid reason

#### 4. Code Review Summary

Aggregate all code review feedback across tasks:

```markdown
## Code Review Summary

### Reviews Completed: [N]

### Issues Found and Fixed
- Critical: [N] found, [N] fixed
- Important: [N] found, [N] fixed
- Minor: [N] found, [N] deferred

### Outstanding Minor Issues
[List any Minor issues documented but not fixed]

### Assessment
All Critical and Important issues resolved ✓
Ready for merge/PR
```

#### 5. Git Status Check

Verify working directory is clean:

```bash
git status
```

**Expected:**
- All changes committed (working tree clean)
- No uncommitted changes
- On correct branch

**If uncommitted changes exist:**
→ Review what's uncommitted
→ If valid work: Commit it
→ If accidental: Clean up

### Completion Presentation

Present comprehensive summary to user:

```markdown
## ✅ Implementation Complete

### Summary
Implemented [N] tasks from [scope]:

**Tasks Completed:**
1. Task 1: [title] ✓
2. Task 2: [title] ✓
...

**Duration:** [time estimate if tracked]

### Verification Results

✅ **Tests:** [X/X] passing
✅ **Requirements:** [Y/Y] met
✅ **TDD Compliance:** [Z] functions, all certified
✅ **Code Reviews:** [N] completed, 0 Critical, 0 Important, [M] Minor deferred
✅ **Git Status:** Working tree clean, all changes committed

### Files Changed
- [file1] (modified, +X/-Y lines)
- [file2] (new, +X lines)
- [file3] (modified, +X/-Y lines)
...

### TDD Compliance Summary
[Show aggregate certification - see Step 3 above]

### Code Review Summary
[Show aggregate reviews - see Step 4 above]

### Outstanding Items
[If any Minor issues deferred, list here]

---

Ready for next steps.
```

### Integration with Finishing-a-Development-Branch

After presenting summary, automatically invoke skill:

```markdown
I'm using the finishing-a-development-branch skill to present completion options.
```

**Use Skill tool:** `finishing-a-development-branch`

That skill will:
1. Verify tests pass (redundant check, but ensures compliance)
2. Present options:
   - Merge to main
   - Create pull request
   - Continue working
   - Discard changes
3. Execute user's choice

**Do NOT duplicate finishing-a-development-branch logic** - just invoke it.

### Verification Example

```
All 7 tasks complete

FINAL VERIFICATION:

1. Run test suite:
   → npm test
   → 147 tests, 147 passing, 0 failing ✓

2. Check requirements:
   → Requirement 1: JWT auth ✓ (implemented in auth.ts, tested in auth.test.ts)
   → Requirement 2: Token refresh ✓ (implemented in tokens.ts, tested in tokens.test.ts)
   → Requirement 3: Rate limiting ✓ (implemented in middleware.ts, tested in middleware.test.ts)
   → Status: 3/3 met ✓

3. TDD Compliance:
   → 12 functions implemented
   → 12/12 followed RED-GREEN-REFACTOR
   → 0 deviations ✓

4. Code Reviews:
   → 7 reviews completed
   → 2 Critical found, 2 fixed ✓
   → 3 Important found, 3 fixed ✓
   → 5 Minor found, 5 deferred (documented)

5. Git status:
   → Working tree clean ✓

PRESENT SUMMARY TO USER + INVOKE finishing-a-development-branch
```

```

**Step 3: Verify all verification steps documented**

```bash
grep "#### " skills/implement/SKILL.md | grep -E "[0-9]\\."
```

Expected: All 5 verification steps listed (test suite, requirements, TDD, code review, git status)

**Step 4: Verify integration documented**

```bash
grep "finishing-a-development-branch" skills/implement/SKILL.md
```

Expected: Found with Skill tool invocation

**Step 5: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add final verification and completion workflow

- Add 5-step verification phase (tests, requirements, TDD, reviews, git)
- Add comprehensive completion summary template
- Add TDD compliance aggregation from all tasks
- Add code review summary aggregation
- Add integration with finishing-a-development-branch skill
- Include verification example showing full workflow

Part of unified implement skill
"
```

## Acceptance Criteria

- [ ] Verification and completion section added after blocker detection
- [ ] 5 verification steps documented (test suite, requirements, TDD, reviews, git)
- [ ] Each verification step has clear expected output
- [ ] Completion presentation template shows all key metrics
- [ ] TDD compliance aggregation explained
- [ ] Code review summary aggregation explained
- [ ] Integration with finishing-a-development-branch documented
- [ ] Skill tool invocation shown (not duplicate logic)
- [ ] Verification example demonstrates full workflow
- [ ] Section completes the autonomous execution flow
- [ ] Committed with descriptive message

## Dependencies

- Requires completion of: Task 000030 (blocker detection must exist)
