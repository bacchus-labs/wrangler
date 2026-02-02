---
id: "000002"
title: "Add TDD compliance certification to verification-before-completion"
type: "issue"
status: "closed"
priority: "critical"
labels: ["phase-1", "verification", "tdd"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T19:30:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Require agents to explicitly certify that they followed TDD (test-driven development) for all new code, making violations conscious lying rather than fuzzy thinking.

## Problem

Currently, there's no way to verify after-the-fact that TDD was followed. Agents can write tests after implementation and claim they followed TDD.

## Solution

Add TDD compliance certification requirement to verification-before-completion skill.

## Implementation Steps

### Step 1: Locate skill file

```bash
skills/verification-before-completion/SKILL.md
```

### Step 2: Add new section after "Test Verification Requirements"

Add this section:

```markdown
## TDD Compliance Certification

BEFORE claiming work complete, certify TDD compliance:

For each new function/method implemented:

- [ ] **Function name**: [function_name]
  - **Test name**: [test_function_name]
  - **Watched fail**: YES / NO (if NO, explain why)
  - **Failure reason**: [expected failure message you saw]
  - **Implemented minimal code**: YES / NO
  - **Watched pass**: YES / NO
  - **Refactored**: YES / NO / N/A

### Example Certification:

```
## TDD Compliance Certification

- [x] **Function name**: retryOperation
  - **Test name**: test_retries_failed_operations_3_times
  - **Watched fail**: YES
  - **Failure reason**: "ReferenceError: retryOperation is not defined"
  - **Implemented minimal code**: YES
  - **Watched pass**: YES
  - **Refactored**: YES (extracted delay logic)

- [x] **Function name**: validateEmail
  - **Test name**: test_validates_email_format
  - **Watched fail**: YES
  - **Failure reason**: "ReferenceError: validateEmail is not defined"
  - **Implemented minimal code**: YES
  - **Watched pass**: YES
  - **Refactored**: N/A (implementation already clean)
```

### Requirements:

- **If ANY "NO" answers**: Work is NOT complete. Delete and restart with TDD.
- **This certification MUST be included** in your completion message.
- **One entry required** for each new function/method.
- **"Watched fail" = NO is ONLY acceptable** if explicitly following receiving-code-review (fixing existing untested code).

### Why This Matters:

Making this certification explicit:
- Forces conscious attestation (not vague "I think I followed TDD")
- Creates audit trail of process followed
- Makes rationalization harder (explicit lying vs fuzzy thinking)
- Enables code reviewer to verify TDD compliance
```

### Step 3: Update Gate Function (lines 26-38)

Insert as step 0:

```markdown
THE GATE FUNCTION:

0. **TDD COMPLIANCE**: Have you followed test-driven-development skill?
   - See TDD Compliance Certification (above)
   - **If NO**: Stop. You violated TDD. Start over.

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. CAPTURE: Copy complete output to include in your message
5. VERIFY: Does output confirm the claim?
6. **REQUIREMENTS**: Have you verified all requirements? (see checklist)
7. **TDD CERTIFIED**: Have you certified TDD compliance? (see above)
8. ONLY THEN: Make the claim
```

### Step 4: Add to Rationalization Prevention table (lines 64-92)

Add row:

```markdown
| "I followed the spirit of TDD" | Spirit = Letter. If you didn't watch tests fail first, you didn't follow TDD. Provide certification or start over. |
| "These tests are simple, TDD would slow me down" | Simple tests take 30 seconds. Complex tests NEED TDD. No exceptions. |
| "I wrote tests and implementation together" | That's not TDD. Tests FIRST. Delete implementation and restart. |
```

### Step 5: Add to Red Flags section

Add:
```markdown
- Claiming "followed TDD" without certification
- Vague about whether tests failed first
- Can't describe failure messages seen
- Wrote tests and implementation "together"
```

### Step 6: Test the changes

1. Read updated skill
2. Verify formatting is correct
3. Verify cross-references work
4. Verify example certification is clear

## Acceptance Criteria

- [ ] New "TDD Compliance Certification" section added
- [ ] Example certification provided
- [ ] Gate function updated to check TDD first (step 0)
- [ ] Rationalization prevention table updated
- [ ] Red flags updated
- [ ] Skill file renders correctly
- [ ] Language is mandatory (MUST, not SHOULD)

## Verification

After implementation:

1. Read the updated skill file
2. Verify certification template is clear and usable
3. Check that gate function checks TDD before anything else
4. Ensure example shows both simple and refactored cases

## References

- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 97-101
- Research: `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` lines 499-526
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 1, item 1

---

## COMPLETION NOTES

**Status**: CLOSED - Successfully implemented on 2025-11-20

**Implementation Summary**:

All requirements from the issue have been successfully implemented. The verification-before-completion skill now includes comprehensive TDD compliance certification requirements.

**Changes Made**:

1. **Gate Function Updated** (lines 24-45):
   - Added step 0: TDD COMPLIANCE check (BEFORE all other verification steps)
   - Added step 4: CAPTURE complete output
   - Added step 6: REQUIREMENTS verification
   - Added step 7: TDD CERTIFIED check
   - Renumbered all steps accordingly

2. **New TDD Compliance Certification Section** (lines 59-108):
   - Added complete certification template with all required fields:
     - Function name
     - Test name
     - Watched fail (YES/NO)
     - Failure reason (exact message seen)
     - Implemented minimal code (YES/NO)
     - Watched pass (YES/NO)
     - Refactored (YES/NO/N/A)
   - Provided two example certifications showing:
     - Simple case (retryOperation with refactoring)
     - Clean implementation case (validateEmail without refactoring)
   - Included clear requirements section with mandatory language
   - Added "Why This Matters" subsection explaining the importance

3. **Red Flags Section Updated** (lines 123-126):
   - Added: Claiming "followed TDD" without certification
   - Added: Vague about whether tests failed first
   - Added: Can't describe failure messages seen
   - Added: Wrote tests and implementation "together"

4. **Rationalization Prevention Table Updated** (lines 140-142):
   - "I followed the spirit of TDD" → Spirit = Letter. If you didn't watch tests fail first, you didn't follow TDD. Provide certification or start over.
   - "These tests are simple, TDD would slow me down" → Simple tests take 30 seconds. Complex tests NEED TDD. No exceptions.
   - "I wrote tests and implementation together" → That's not TDD. Tests FIRST. Delete implementation and restart.

**Acceptance Criteria Verification**:

- [x] New "TDD Compliance Certification" section added
- [x] Example certification provided (two complete examples)
- [x] Gate function updated to check TDD first (step 0)
- [x] Rationalization prevention table updated (3 new rows)
- [x] Red flags updated (4 new items)
- [x] Skill file renders correctly (verified markdown syntax)
- [x] Language is mandatory (MUST, NOT, ONLY throughout)

**Impact**:

This change transforms TDD compliance from a vague aspiration into a concrete, verifiable requirement. Agents must now:
1. Explicitly certify they followed TDD for each function
2. Provide specific evidence (failure messages seen)
3. Cannot rationalize away TDD violations
4. Create an audit trail for code reviewers

The certification template makes TDD violations require conscious lying rather than fuzzy thinking, significantly strengthening the enforcement of test-driven development practices.
