---
id: "000003"
title: "Add code review gate to verification-before-completion"
type: "issue"
status: "closed"
priority: "critical"
labels: ["phase-1", "verification", "code-review"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T19:45:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Make code review mandatory before completion claims (currently optional in most workflows).

## Problem

Code review is only mandatory in subagent-driven-development workflow. Other workflows (executing-plans, ad-hoc development) can skip code review and claim completion.

## Solution

Add code review gate to verification-before-completion, making it a universal requirement.

## Implementation Steps

### Step 1: Locate skill file

```bash
skills/verification-before-completion/SKILL.md
```

### Step 2: Add new section after "TDD Compliance Certification"

Add this section:

```markdown
## Code Review Gate

BEFORE claiming work complete:

### When Code Review is REQUIRED:

IF this work involves:
- New features (any size)
- Bug fixes (any severity)
- Refactoring (any scope)
- Changes to >50 lines of code
- Security-sensitive code
- Performance-critical code
- Public API changes

THEN code review IS REQUIRED.

### Code Review Checklist:

- [ ] **Code review requested**: Used requesting-code-review skill
- [ ] **Review completed**: code-reviewer subagent dispatched and finished
- [ ] **Critical issues**: 0 (MUST be zero)
- [ ] **Important issues**: 0 or explicitly acknowledged/deferred
- [ ] **Review status**: Approved / Approved with minor items
- [ ] **Review reference**: [link to review output or summary]

### EXCEPTIONS (code review NOT required):

- Documentation-only changes (no code logic)
- Configuration-only changes (no code logic)
- Changes <50 lines AND your human partner explicitly waived review
- Typo fixes in comments
- Test-only changes when adding tests to existing untested code

### Example Review Gate Completion:

```
## Code Review Gate

- [x] **Code review requested**: Used requesting-code-review skill
- [x] **Review completed**: code-reviewer subagent finished analysis
- [x] **Critical issues**: 0
- [x] **Important issues**: 1 acknowledged (will address in follow-up)
- [x] **Review status**: Approved with minor items
- [x] **Review reference**: See code review output below

Critical Issues: 0
Important Issues: 1
  - Missing error handling in edge case (acknowledged, will fix in issue #123)
Minor Issues: 3
  - All addressed

Review approved for merge with follow-up issue created.
```

### Cannot Proceed Without:

You **CANNOT** claim completion without:
1. Code review completed (unless explicit exception applies)
2. Critical issues fixed (MUST be 0)
3. Important issues fixed OR explicitly documented why deferred

**Attempting to skip code review without valid exception violates verification-before-completion.**
```

### Step 3: Update Gate Function (lines 26-38)

Update to include code review check:

```markdown
THE GATE FUNCTION:

0. TDD COMPLIANCE: Have you followed test-driven-development skill?
   - See TDD Compliance Certification (above)
   - If NO: Stop. You violated TDD. Start over.

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. CAPTURE: Copy complete output to include in your message
5. VERIFY: Does output confirm the claim?
6. REQUIREMENTS: Have you verified all requirements? (see checklist)
7. TDD CERTIFIED: Have you certified TDD compliance? (see above)
8. **CODE REVIEW**: Have you obtained code review approval? (see gate above)
9. ONLY THEN: Make the claim
```

### Step 4: Add to Red Flags section

Add:
```markdown
- Skipping code review because "it's simple"
- Planning to "get review later"
- Claiming exception without explicit approval
- Proceeding with unfixed Critical or Important issues
```

### Step 5: Add to Rationalization Prevention table

Add rows:

```markdown
| "This is too small for code review" | Size doesn't matter. Code review is mandatory. See exceptions list for ONLY valid reasons to skip. |
| "I'll get review after merge" | No. Review BEFORE merge. Reversing changes post-merge is expensive and risky. |
| "Code review would slow me down" | Code review catches bugs before they reach users. Slowdown now prevents crisis later. |
```

### Step 6: Test the changes

1. Read updated skill
2. Verify formatting is correct
3. Verify cross-references work
4. Verify exceptions list is clear

## Acceptance Criteria

- [ ] New "Code Review Gate" section added
- [ ] When/exceptions clearly defined
- [ ] Checklist provided
- [ ] Example gate completion shown
- [ ] Gate function updated to include code review (step 8)
- [ ] Red flags updated
- [ ] Rationalization prevention updated
- [ ] Skill file renders correctly
- [ ] Language is mandatory (CANNOT, MUST, not SHOULD)

## Verification

After implementation:

1. Read the updated skill file
2. Verify exceptions are limited and clear
3. Check that gate function enforces code review
4. Ensure "cannot proceed without" language is strong

## References

- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 103-129
- Research: `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` lines 536-565
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 1, item 1
