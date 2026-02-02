---
id: "000004"
title: "Add evidence requirements to test-driven-development RED and GREEN phases"
type: "issue"
status: "closed"
priority: "critical"
labels: ["phase-1", "tdd", "evidence"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T19:30:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Require agents to show actual test output during RED and GREEN phases of TDD, preventing claims of "watched it fail/pass" without proof.

## Problem

TDD skill says "watch it fail" and "watch it pass" but doesn't require showing evidence. Agents can claim they followed TDD without proof.

## Solution

Add mandatory evidence requirements to RED and GREEN phases in test-driven-development skill.

## Implementation Steps

### Step 1: Locate skill file

```bash
skills/test-driven-development/SKILL.md
```

### Step 2: Update RED Phase section (around line 150-180)

Replace "Verify RED - Watch It Fail" section with:

```markdown
### Verify RED - Watch It Fail (MANDATORY EVIDENCE)

BEFORE proceeding to GREEN phase:

1. **Execute test command**:
   ```bash
   npm test -- path/to/test.test.ts
   # or
   pytest path/to/test.py::test_function_name
   # or
   cargo test test_function_name
   ```

2. **Copy full output showing failure**

3. **Verify failure message matches expected reason**:
   - ✅ CORRECT: "ReferenceError: retryOperation is not defined"
   - ✅ CORRECT: "AssertionError: expected 3 to equal undefined"
   - ❌ WRONG: "TypeError: Cannot read property 'X' of undefined" (syntax error, not missing implementation)
   - ❌ WRONG: Test passes (you didn't write a failing test!)

4. **If output doesn't match expected failure**: Fix test and re-run

**YOU MUST include test output in your message:**

### Example of Required Evidence:

```
Running RED phase verification:

$ npm test -- retry.test.ts

FAIL tests/retry.test.ts
  ✕ retries failed operations 3 times (2 ms)

  ● retries failed operations 3 times

    ReferenceError: retryOperation is not defined

      at Object.<anonymous> (tests/retry.test.ts:15:5)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Time:        0.234s
Exit code: 1

This is the expected failure - function doesn't exist yet.
Failure reason matches expectation: "retryOperation is not defined"
Proceeding to GREEN phase.
```

**Claims without evidence violate verification-before-completion.**

If you cannot provide this output, you have NOT completed the RED phase.
```

### Step 3: Update GREEN Phase section (around line 200-230)

Replace "Verify GREEN - Watch It Pass" section with:

```markdown
### Verify GREEN - Watch It Pass (MANDATORY EVIDENCE)

AFTER implementing minimal code:

1. **Execute test command** (same as RED):
   ```bash
   npm test -- path/to/test.test.ts
   ```

2. **Copy full output showing pass**

3. **Verify ALL of these**:
   - All tests pass (0 failures)
   - No errors printed
   - No warnings printed
   - Exit code: 0
   - Test that was failing now passes

**YOU MUST include test output in your message:**

### Example of Required Evidence:

```
Running GREEN phase verification:

$ npm test -- retry.test.ts

PASS tests/retry.test.ts
  ✓ retries failed operations 3 times (145 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        0.189s
Exit code: 0

Test now passes. Proceeding to REFACTOR phase.
```

**If any errors/warnings appear**: Fix them before claiming GREEN phase complete.

**Claims without evidence violate verification-before-completion.**

If you cannot provide this output, you have NOT completed the GREEN phase.
```

### Step 4: Update "Common Rationalizations" section (around lines 100-130)

Add these entries:

```markdown
### "I watched it fail/pass in my head"

**Counter**: Your imagination is not evidence. Run the actual command and paste the output.

### "The test obviously fails/passes, I don't need to show output"

**Counter**: Non-obvious bugs exist. Provide output or you didn't verify.

### "I'll just say it failed/passed"

**Counter**: That's a claim without evidence. Violation of verification-before-completion. Show output.
```

### Step 5: Add cross-reference to verification-before-completion

Add at the end of the skill (before References section):

```markdown
## Integration with Verification

The evidence requirements in RED and GREEN phases integrate with verification-before-completion:

- **RED phase evidence** → Proves you watched test fail
- **GREEN phase evidence** → Proves tests now pass
- **Both together** → Required for TDD Compliance Certification

See verification-before-completion skill for complete certification requirements.
```

### Step 6: Test the changes

1. Read updated skill
2. Verify formatting is correct
3. Verify examples are framework-agnostic (npm/pytest/cargo)
4. Verify cross-references work

## Acceptance Criteria

- [ ] RED phase updated with evidence requirements
- [ ] GREEN phase updated with evidence requirements
- [ ] Example evidence provided for both phases
- [ ] Common rationalizations updated
- [ ] Cross-reference to verification-before-completion added
- [ ] Skill file renders correctly
- [ ] Language is mandatory (MUST, not SHOULD)
- [ ] Examples cover multiple languages/frameworks

## Verification

After implementation:

1. Read the updated skill file
2. Verify RED/GREEN evidence requirements are clear
3. Check that examples show complete output (not summaries)
4. Ensure language enforces showing output (not just "I ran it")

## References

- Research: `.wrangler/memos/2025-11-20-testing-skills-analysis.md` lines 140-175
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 213-239
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 1, item 2
