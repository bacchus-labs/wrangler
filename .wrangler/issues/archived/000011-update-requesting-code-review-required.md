---
id: "000011"
title: "Update requesting-code-review to change code review from optional to required"
type: "issue"
status: "closed"
priority: "high"
labels: ["phase-3", "code-review", "workflow", "skill-update"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "1-2 hours"
---

## Objective

Update the requesting-code-review skill to change code review from "optional" to "required" for all workflows, making it clear that agents cannot proceed without code review approval.

## Problem

The requesting-code-review skill currently says code review is "Mandatory" for subagent-driven-development but "Optional but valuable" for other workflows. This creates ambiguity:
- Agents think code review is optional for ad-hoc work
- Agents skip review for "small changes"
- Different standards across workflows

This allows unreviewed code to reach production.

## Solution

Update `skills/requesting-code-review/SKILL.md` to make code review required for ALL substantive work, with explicit "cannot proceed without review" language and clear exceptions.

## Implementation Steps

### Step 1: Read the current file

```bash
cat skills/requesting-code-review/SKILL.md
```

Identify the "When to Request Review" section (around line 16-24).

### Step 2: Replace "When to Request Review" section

Replace the current section with this stronger version:

```markdown
## When to Request Review

**Mandatory** (code review IS REQUIRED):
- After each task in subagent-driven-development
- After completing ANY feature (major or minor)
- After ANY bug fix (regardless of severity)
- After ANY refactoring (regardless of scope)
- Before merge to main
- Before creating pull request
- Before claiming work complete
- Changes >50 lines of code
- Changes to critical paths (auth, payment, data handling)

**Exceptions** (code review NOT required):
- Documentation-only changes (README, comments, markdown files)
- Configuration changes with no logic (JSON, YAML config files)
- Test-only changes when adding tests to previously untested code
- Changes <50 lines AND your human partner explicitly waived review
- Emergency hotfixes (must be reviewed immediately after deployment)

**When in doubt**: Request code review. Better to over-review than under-review.

**If you skip review without explicit exception**: You violate verification-before-completion and cannot claim work complete.
```

### Step 3: Add "Cannot Proceed Without Review" section

Add a new section after "When to Request Review":

```markdown
## Cannot Proceed Without Review

**IMPORTANT**: Code review is not optional for substantive work.

### What "Cannot Proceed" Means

You CANNOT:
- Mark tasks as complete without code review
- Merge to main without code review
- Create PR without code review
- Claim "work is done" without code review
- Start next batch without reviewing current batch

### Review Gate

```
BEFORE proceeding to next step:

  IF code changes made:
    Has code review been requested?
      NO → STOP - Request review now
      YES → Continue

    Has review been completed?
      NO → STOP - Wait for review completion
      YES → Continue

    Are there Critical issues?
      YES → STOP - Fix before proceeding
      NO → Continue

    Are there Important issues?
      YES → STOP - Fix or explicitly acknowledge with plan
      NO → Continue

    Review status: [Approved / Approved with minor items]
      Other → STOP - Address issues before proceeding

  ONLY THEN: Proceed to next step
```

### Consequences of Skipping Review

If you skip code review without explicit exception:
- Your human partner will lose trust in your work
- You violate test-driven-development (no verification)
- You violate verification-before-completion (incomplete verification)
- Issues will be caught later (more expensive to fix)
- You create technical debt (unreviewed code)
```

### Step 4: Update the How to Request section

Enhance the "How to Request Review" section (around line 26) with clearer context:

```markdown
## How to Request Review

### Step 1: Prepare for Review

BEFORE requesting review:

- [ ] All tests passing
- [ ] No errors or warnings
- [ ] Code follows TDD (tests written first)
- [ ] Requirements met
- [ ] Evidence of verification captured

**If ANY unchecked**: Fix before requesting review. Don't waste reviewer's time.

### Step 2: Provide Context

When requesting review, include:

```markdown
I need code review for [feature/bugfix/refactor name].

**Context:**
- Completed tasks: [list]
- Requirements met: [reference to plan/spec]
- Tests added: [count] tests, all passing
- TDD followed: [Yes/No with attestation]

**Files for review:**
- src/[file].ts (modified - [what changed])
- src/[file].ts (new - [what it does])
- tests/[file].test.ts (modified - [tests added])

**Testing evidence:**
```
[paste test output showing all passing]
```

**Ready for review.**
```

[... rest of existing content ...]
```

### Step 5: Add "Handling Review Status" section

Add a new section after "How to Act on Review Feedback":

```markdown
## Handling Review Status

### Review Outcomes

**Status: Approved**
```
All issues resolved or no issues found.

Action: You may proceed to next step (merge, next batch, etc.)
```

**Status: Approved with minor items**
```
No Critical or Important issues.
Minor suggestions noted for future work.

Action: You may proceed, but address minor items when practical.
```

**Status: Needs revision**
```
Critical or Important issues found.

Action:
1. STOP - Do not proceed
2. Fix all Critical issues
3. Fix all Important issues (or explicitly acknowledge why deferring)
4. Re-run tests
5. Provide evidence of fixes
6. Request follow-up review if needed
7. Only proceed after approval
```

**Status: Blocked**
```
Fundamental issues requiring rework.

Action:
1. STOP - Do not proceed
2. Discuss issues with reviewer or human partner
3. May require significant rework or redesign
4. Do NOT attempt to "work around" blocking issues
```

### Cannot Proceed Until Approved

**Important**: You cannot claim work complete or proceed to next phase until review status is "Approved" or "Approved with minor items".

Attempting to proceed with "Needs revision" or "Blocked" status violates verification-before-completion skill.
```

### Step 6: Update Red Flags section

Strengthen the existing "Red Flags" section:

```markdown
## Red Flags - STOP IMMEDIATELY

If you catch yourself:
- Thinking "I'll skip review this time"
- Thinking "It's too small to need review"
- Thinking "I'll just merge and review later"
- Proceeding to next batch without reviewing current batch
- Marking work complete without code review
- Assuming review is optional for your workflow
- Creating PR without code review first
- Merging to main without code review

THEN:
- STOP immediately
- Request code review
- Wait for approval
- This is mandatory, not optional
```

### Step 7: Update Example section

Add a clearer example showing mandatory nature:

```markdown
### Example: Required Code Review

```
Agent: "I've completed the user authentication feature."

[Check: Is code review required?]

Code changes made: Yes
Lines changed: 350
Feature complete: Yes

→ Code review IS REQUIRED

Agent: "I need code review before marking this complete."

[Requests review]

Review outcome: Needs revision (2 Important issues)

Agent: [Thinks: "These are minor, I'll just merge"]

RED FLAG: Cannot proceed with "Needs revision" status

Agent: "I need to fix the Important issues before proceeding."

[Fixes issues, re-runs tests]

Agent: "Issues fixed. Ready for follow-up review."

[Requests follow-up review]

Review outcome: Approved

Agent: "Code review approved. Feature complete."

[Can now proceed to merge/PR]
```
```

## Acceptance Criteria

- [ ] "When to Request Review" section updated with mandatory language
- [ ] "Cannot Proceed Without Review" section added
- [ ] Review gate decision tree added
- [ ] Consequences of skipping review documented
- [ ] "How to Request Review" section enhanced with preparation checklist
- [ ] "Handling Review Status" section added with clear outcomes
- [ ] Red Flags section strengthened
- [ ] Example updated to show mandatory nature
- [ ] Language is absolute (REQUIRED, CANNOT proceed, not "should")
- [ ] Exceptions are explicit and limited
- [ ] Cross-references verification-before-completion skill

## Verification

After implementation:

1. Read the updated skill file
2. Verify code review is now clearly required (not optional)
3. Check that "Cannot Proceed Without Review" section is prominent
4. Ensure review gate prevents proceeding without approval
5. Verify exceptions are limited and explicit
6. Check that example demonstrates enforcement

## References

- Research: `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` lines 189-227 (code review optional gap)
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 104-131
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 3, item 9
- Current file: `skills/requesting-code-review/SKILL.md`
- Reference: `skills/subagent-driven-development/SKILL.md` (code review mandatory in Step 3)
- Reference: `skills/verification-before-completion/SKILL.md` (verification requirements)
