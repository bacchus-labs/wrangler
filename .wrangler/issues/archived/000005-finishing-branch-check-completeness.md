---
id: "000005"
title: "Update finishing-a-development-branch to check completeness (not just tests pass)"
type: "issue"
status: "closed"
priority: "critical"
labels: ["phase-1", "workflow", "completeness"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T16:30:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Expand finishing-a-development-branch to verify work is actually complete (not just tests passing) before presenting merge/PR options.

## Problem

Currently, finishing-a-development-branch only checks if tests pass. It doesn't verify:
- Requirements are met
- Code review was obtained
- TDD was followed
- Work is actually complete

This allows incomplete work to proceed to merge/PR.

## Solution

Expand Step 1 to check completeness using all verification gates.

## Implementation Steps

### Step 1: Locate skill file

```bash
skills/finishing-a-development-branch/SKILL.md
```

### Step 2: Replace Step 1 (lines 18-36)

Replace entire "Step 1: Verify Tests" section with:

```markdown
### Step 1: Verify Completeness

BEFORE presenting options, verify work is ACTUALLY complete:

#### 1.1: Tests Pass

Run full test suite:

```bash
npm test
# or
pytest
# or
cargo test
# or
go test ./...
```

**Required output**:
- All tests pass (0 failures)
- No errors or warnings
- Exit code: 0

**If tests fail**: STOP. Fix tests. Cannot proceed with incomplete work.

#### 1.2: Requirements Met

Check verification-before-completion requirements checklist:

- [ ] All planned features implemented
- [ ] All edge cases handled
- [ ] All error paths tested
- [ ] Documentation updated (if applicable)
- [ ] No TODOs or FIXMEs added

**If ANY unchecked**: Work is NOT complete. Finish requirements first.

#### 1.3: Code Review Obtained (if required)

Check verification-before-completion code review gate:

- [ ] Code review completed (or valid exception documented)
- [ ] Critical issues: 0
- [ ] Important issues: 0 or explicitly acknowledged

**If code review required but not obtained**: STOP. Request code review first.

#### 1.4: TDD Compliance

Check verification-before-completion TDD certification:

- [ ] TDD compliance certification completed
- [ ] All new functions have tests written first
- [ ] All functions watched fail → watched pass

**If TDD violated**: Work is NOT complete. Violations must be fixed.

#### 1.5: Pristine Output

Verify no errors, warnings, or deprecations:

- [ ] Test output is clean (no errors/warnings)
- [ ] Linter passes (if applicable)
- [ ] Build succeeds (if applicable)
- [ ] No console.log/print statements in production code

**If output not pristine**: Clean up before proceeding.

### Completeness Verification Result:

**ONLY if ALL sections (1.1-1.5) are complete**: Continue to Step 2.

**If ANY section incomplete**:
- STOP immediately
- Fix the incomplete section
- Do NOT proceed to Step 2
- Do NOT present merge/PR options

This is a GATE. You cannot proceed without complete verification.
```

### Step 3: Update Step 2 (presentation of options)

Add preamble before options:

```markdown
### Step 2: Present Options

**Prerequisites verified** (from Step 1):
- ✓ All tests pass
- ✓ All requirements met
- ✓ Code review obtained
- ✓ TDD compliance certified
- ✓ Output is pristine

Since work is VERIFIED complete, you have these options:
[existing options...]
```

### Step 4: Add "Red Flags" section at the end

Add before "References":

```markdown
## Red Flags - STOP IMMEDIATELY

If you find yourself:

- Skipping Step 1 verification ("tests pass, that's good enough")
- Presenting options before ALL Step 1 checks complete
- Claiming exception to code review without documentation
- Proceeding with unfixed TDD violations
- Saying "work is done" without requirements verification

THEN:
- STOP immediately
- Go back to Step 1
- Complete ALL verification steps
- This is not optional

Proceeding without complete Step 1 verification violates verification-before-completion.
```

### Step 5: Update skill description

Change:
```markdown
description: ... before merging to main - verifies tests pass and presents structured options...
```

To:
```markdown
description: ... before merging to main - verifies work is complete (tests, requirements, code review, TDD compliance) and presents structured options...
```

### Step 6: Test the changes

1. Read updated skill
2. Verify formatting is correct
3. Verify all sections of Step 1 are clear
4. Verify cross-references work

## Acceptance Criteria

- [ ] Step 1 expanded to 5 verification sections (1.1-1.5)
- [ ] Step 2 updated with prerequisites preamble
- [ ] Red flags section added
- [ ] Skill description updated
- [ ] Skill file renders correctly
- [ ] Language is mandatory (CANNOT proceed, MUST verify)
- [ ] Cross-references to verification-before-completion work

## Verification

After implementation:

1. Read the updated skill file
2. Verify Step 1 is comprehensive (covers all verification aspects)
3. Check that Step 1 is a hard gate (cannot skip)
4. Ensure "Red Flags" section catches common shortcuts

## Completion Note

**Status**: Closed
**Completed**: 2025-11-20

### Implementation Summary

Successfully implemented all changes to `skills/finishing-a-development-branch/SKILL.md`:

1. **Step 1 Expanded** (lines 18-96): Replaced simple test verification with comprehensive 5-section completeness check:
   - 1.1: Tests Pass (with required output criteria)
   - 1.2: Requirements Met (checklist)
   - 1.3: Code Review Obtained (if required)
   - 1.4: TDD Compliance (certification check)
   - 1.5: Pristine Output (clean execution verification)

2. **Step 3 Enhanced** (lines 109-116): Added prerequisites preamble showing all verified items before presenting options

3. **Red Flags Section Added** (lines 258-274): New section with strong mandatory language to prevent shortcuts

4. **Skill Description Updated** (line 3): Changed to reflect full verification scope

5. **Core Principle Updated** (line 12): Expanded from "Verify tests" to "Verify completeness (tests, requirements, code review, TDD)"

### Verification Results

All acceptance criteria met:
- Step 1 has 5 comprehensive verification sections
- Step 2 has prerequisites preamble
- Red flags section added with mandatory language
- Skill description updated
- File renders correctly
- Language is mandatory throughout (STOP, CANNOT, MUST)
- All cross-references to verification-before-completion included

The skill now acts as a proper gate, ensuring work is genuinely complete before offering merge/PR options.

## References

- Research: `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` lines 638-675
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 289-322
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 1, item 3
