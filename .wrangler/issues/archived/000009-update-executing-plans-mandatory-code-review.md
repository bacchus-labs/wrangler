---
id: "000009"
title: "Update executing-plans to make code review mandatory after each batch"
type: "issue"
status: "closed"
priority: "high"
labels: ["phase-3", "code-review", "workflow", "skill-update"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T12:00:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Update the executing-plans skill to make code review mandatory after each batch, bringing it to the same standard as subagent-driven-development.

## Problem

Currently, code review is only mandatory in subagent-driven-development workflow. The executing-plans skill doesn't require code review, allowing agents to:
- Complete all implementation without review
- Accumulate issues across multiple batches
- Proceed to merge without quality gate

This creates inconsistent standards across workflows and allows unreviewed code to reach production.

## Solution

Update `skills/executing-plans/SKILL.md` to require code review after each batch, matching the subagent-driven-development workflow.

## Implementation Steps

### Step 1: Read the current file

```bash
cat skills/executing-plans/SKILL.md
```

Identify Step 3 "Report and Review" (around line 32-37).

### Step 2: Update Step 3 to require code review

Replace the current Step 3 section with this enhanced version:

```markdown
### Step 3: Report, Review, and Code Review

When batch complete:

#### 3.1: Report Batch Completion

Show what was implemented in this batch:

```markdown
## Batch N Complete

### Tasks Completed
- [Task 1 description] - Implemented, tests passing
- [Task 2 description] - Implemented, tests passing

### Verification Output
```
[Test execution output showing all passing]
```

### Files Changed
- src/auth.ts (modified)
- src/users.ts (new)
- tests/auth.test.ts (modified)
```
```

#### 3.2: Request Code Review (MANDATORY)

**Code review is REQUIRED after each batch:**

```markdown
I've completed batch N and need code review before proceeding.

Files for review:
- src/auth.ts
- src/users.ts
- tests/auth.test.ts

Context:
- Implemented tasks [X, Y, Z] from plan
- All tests passing
- Ready for review
```

**Dispatch code-reviewer subagent:**

See requesting-code-review skill for full instructions.

#### 3.3: Address Review Feedback

**BEFORE proceeding to next batch:**

- [ ] Review completed
- [ ] Critical issues: 0 (must fix all)
- [ ] Important issues: 0 or acknowledged
- [ ] Minor issues: Noted for future

**If Critical or Important issues found:**
1. STOP - Do not proceed to next batch
2. Fix issues in current batch
3. Re-run tests
4. Request follow-up review if needed
5. Only proceed when review status: "Approved"

#### 3.4: Announce Batch Ready

Only after code review approved:

"Batch N complete and reviewed. Ready for feedback or next batch."

## Code Review Gate

```
BEFORE proceeding to next batch or completion:

  IF code changes made in this batch:
    Have you requested code review?
      NO → STOP - Request review now
      YES → Continue

    Has review been completed?
      NO → STOP - Wait for review
      YES → Continue

    Are there Critical issues?
      YES → STOP - Fix before proceeding
      NO → Continue

    Are there Important issues?
      YES → STOP - Fix or acknowledge with plan
      NO → Continue

  ONLY THEN: Proceed to next batch
```
```

### Step 3: Add pre-implementation checklist reference

Update Step 2 "Execute Batch" to reference pre-implementation-checklist (around line 24):

```markdown
### Step 2: Execute Batch

For each task in current batch:

#### 2.1: Pre-Implementation Check

Before starting each task:
- [ ] Understand requirement completely
- [ ] Know what tests to write
- [ ] Will follow TDD (test-driven-development)
- [ ] Will request code review after batch

See pre-implementation-checklist skill for full checklist.

#### 2.2: Implement with TDD

**MUST follow test-driven-development for each task:**

1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code quality

**Before moving to next task:**
- [ ] Watched test fail first
- [ ] Watched test pass after implementation
- [ ] All tests still passing (no regressions)

#### 2.3: Verify Task Complete

Use verification-before-completion for each task:
- [ ] Tests pass
- [ ] No errors or warnings
- [ ] Requirements met
- [ ] Evidence captured

Move to next task only when current task verified complete.
```

### Step 4: Update Step 4 to verify all batches reviewed

Update Step 4 "Continue or Complete" (around line 40) to verify code reviews:

```markdown
### Step 4: Continue or Complete

After batch reviewed and feedback received:

**Option A: More batches remain**

```markdown
"Batch N complete and reviewed. Starting batch N+1."

[Return to Step 1 with next batch]
```

**Option B: All batches complete**

```markdown
"All batches complete. Verifying full plan completion..."
```

**Before claiming plan complete, verify:**

- [ ] All batches completed
- [ ] All batches received code review
- [ ] All Critical/Important issues resolved
- [ ] All tests passing
- [ ] Full plan requirements met

**Use verification-before-completion for final check.**

Then:
- Use finishing-a-development-branch skill
- Options: Merge to main, Create PR, Continue work, or Discard
```

### Step 5: Update Red Flags section

Add code review red flags to the existing "Red Flags" section:

```markdown
## Red Flags - STOP IMMEDIATELY

If you catch yourself:

[... existing red flags ...]

**Code review red flags:**
- Thinking "I'll do code review at the end"
- Skipping code review for "small changes"
- Proceeding to next batch with unresolved Critical issues
- Claiming batch complete without requesting review
- Not waiting for review approval before next batch
```

### Step 6: Update Integration section

Update the "Integration with Other Skills" section to include code review:

```markdown
**Integration with:**
- writing-plans: Receives plan to execute
- test-driven-development: MANDATORY for each task
- verification-before-completion: Use after each task AND after full plan
- requesting-code-review: MANDATORY after each batch (NEW)
- code-review: Framework for reviewing batch changes
- finishing-a-development-branch: Use when all batches complete
```

### Step 7: Add Example with Code Review

Add a new example scenario showing code review workflow:

```markdown
### Example: Executing Plan with Code Review

```
Plan has 6 tasks, split into 2 batches:
- Batch 1: Tasks 1-3 (auth system)
- Batch 2: Tasks 4-6 (user management)

## Batch 1 Execution

1. Split tasks: [Tasks 1-3]
2. Execute each task with TDD:
   - Task 1: Write test → Fail → Implement → Pass
   - Task 2: Write test → Fail → Implement → Pass
   - Task 3: Write test → Fail → Implement → Pass
3. Report batch 1 complete:
   - Show: 3 tasks done, tests passing
   - Request code review (dispatch code-reviewer)
4. Review feedback received:
   - Critical: 0
   - Important: 1 (missing error handling in auth)
   - Minor: 2 (naming suggestions)
5. Fix Important issue:
   - Add error handling
   - Write test for error path
   - Re-run all tests → Pass
6. Announce: "Batch 1 complete and reviewed. Starting batch 2."

## Batch 2 Execution

1. Split tasks: [Tasks 4-6]
2. Execute each task with TDD: [same process]
3. Report batch 2 complete
4. Request code review
5. Review feedback: All approved
6. Announce: "Batch 2 complete and reviewed."

## Final Verification

1. All batches complete: ✓
2. All batches reviewed: ✓
3. All issues resolved: ✓
4. Use verification-before-completion: ✓
5. Use finishing-a-development-branch: ✓

"Plan execution complete. All batches implemented, tested, and reviewed."
```
```

## Acceptance Criteria

- [ ] Step 3 updated with mandatory code review section
- [ ] Code review gate added (decision tree)
- [ ] Pre-implementation checklist referenced in Step 2
- [ ] Step 4 updated to verify all batches reviewed
- [ ] Red flags section updated with code review warnings
- [ ] Integration section updated with code review skills
- [ ] Example added showing code review workflow
- [ ] Language is mandatory (REQUIRED, MUST, CANNOT proceed)
- [ ] Matches subagent-driven-development standard (code review after each batch)
- [ ] Cross-references requesting-code-review and code-review skills correctly

## Verification

After implementation:

1. Read the updated skill file
2. Verify code review is now mandatory (not optional)
3. Check that gate function prevents proceeding without review
4. Ensure Step 3 clearly requires review after EACH batch
5. Verify example shows complete code review workflow
6. Check consistency with subagent-driven-development workflow

## References

- Research: `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` lines 163-170 (code review optional gap)
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 104-131
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 3, item 7
- Current file: `skills/executing-plans/SKILL.md`
- Reference: `skills/subagent-driven-development/SKILL.md` (Step 3 requires code review)
- Reference: `skills/requesting-code-review/SKILL.md` (how to request review)

---

## Completion Notes

**Implementation completed: 2025-11-20**

All acceptance criteria verified and met:

### Changes Made

1. **Step 3 updated** with "Report, Review, and Code Review" including 4 substeps (lines 64-133):
   - 3.1: Report Batch Completion
   - 3.2: Request Code Review (MANDATORY)
   - 3.3: Address Review Feedback
   - 3.4: Announce Batch Ready

2. **Code Review Gate added** (lines 134-157): Decision tree that prevents proceeding without review approval

3. **Pre-implementation checklist referenced** in Step 2.1 (line 39): Links to pre-implementation-checklist skill

4. **Step 4 updated** to verify all batches reviewed (line 180): Checklist includes "All batches received code review"

5. **Red flags section enhanced** (lines 229-234): Added 5 code review red flags

6. **Integration section updated** (line 242): Added "requesting-code-review: MANDATORY after each batch"

7. **Complete example added** (lines 247-292): Shows full workflow with:
   - Batch 1: Implementation, code review, Important issue found, fix, approval
   - Batch 2: Implementation, code review, approval
   - Final verification including all batches reviewed

8. **Mandatory language used throughout**: REQUIRED, MUST, MANDATORY, "no exceptions"

9. **Matches subagent-driven-development standard**: Code review after each batch/task is now mandatory in both workflows

10. **Correct cross-references**: Links to requesting-code-review and code-review skills

### Verification Results

- Step 3 is now comprehensive with mandatory code review: YES
- Code review gate prevents proceeding without approval: YES (lines 134-157)
- Pre-implementation checklist referenced: YES (line 39, line 245)
- Step 4 verifies all batches reviewed: YES (line 180)
- Red flags include code review warnings: YES (lines 229-234)
- Integration section includes code review skills: YES (line 242)
- Example shows complete code review workflow: YES (lines 247-292)
- Language is mandatory throughout: YES (REQUIRED, MUST, MANDATORY used consistently)
- Matches subagent-driven-development standard: YES (both now require review after each batch)
- Cross-references are correct: YES (requesting-code-review, code-review skills)

### Impact

The executing-plans skill now has the same quality gate as subagent-driven-development, ensuring that code review is mandatory after each batch. This closes the gap identified in the verification analysis and brings both workflows to the same high standard.

**File Updated**: `/Users/sam/medb/code/wrangler/skills/executing-plans/SKILL.md` (303 lines)
