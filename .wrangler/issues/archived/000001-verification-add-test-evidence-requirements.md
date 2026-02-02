---
id: "000001"
title: "Add test evidence requirements to verification-before-completion"
type: "issue"
status: "closed"
priority: "critical"
labels: ["phase-1", "verification", "testing"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Require agents to provide actual test output before claiming tests pass, preventing unsubstantiated "tests pass" claims.

## Problem

Currently, agents can claim "tests pass" without showing evidence. verification-before-completion doesn't enforce what proof looks like.

## Solution

Add mandatory evidence format section to verification-before-completion skill.

## Implementation Steps

### Step 1: Locate skill file

```bash
skills/verification-before-completion/SKILL.md
```

### Step 2: Add new section after line 82 ("Test Passing Verification")

Add this section:

```markdown
## Test Verification Requirements

When claiming tests pass, you MUST provide:

**Required Evidence**:

1. **Exact command executed**:
   ```bash
   npm test
   # or
   pytest
   # or
   cargo test
   # or
   go test ./...
   ```

2. **Complete output showing**:
   - Test count: "X tests passed"
   - Failure count: "0 failed"
   - Duration: "Time: X.XXXs"
   - Exit code: 0

3. **Coverage (if available)**:
   - Statement coverage: X%
   - Branch coverage: X%
   - Function coverage: X%
   - Line coverage: X%

### Example of VALID verification:

```
I've verified all tests pass. Here's the output:

$ npm test

PASS tests/auth.test.ts (4.231s)
  ✓ login with valid credentials (231ms)
  ✓ login with invalid credentials (12ms)
  ✓ logout successfully (8ms)

PASS tests/users.test.ts (2.145s)
  ✓ creates new user (145ms)
  ✓ updates existing user (98ms)
  ✓ deletes user (76ms)

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        6.376s

Process exited with code 0

All 6 tests pass successfully.
```

### Example of INVALID verification:

```
❌ "I ran the tests and they pass."
❌ "Tests are green."
❌ "Everything looks good."
❌ [Shows only 1 test when there are 50]
❌ [Shows truncated output without pass/fail counts]
```

**If you cannot provide the complete output above, you have not verified.**
```

### Step 3: Update Gate Function (lines 26-38)

Replace step 1 with:

```markdown
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. **CAPTURE: Copy complete output to include in your message**
5. VERIFY: Does output confirm the claim?
6. ONLY THEN: Make the claim
```

### Step 4: Add to Red Flags section (line 52)

Add:
```markdown
- Claiming tests pass without showing output
- Paraphrasing test results instead of showing raw output
- Showing partial output (truncated, filtered)
```

### Step 5: Test the changes

1. Read updated skill
2. Verify formatting is correct
3. Verify cross-references work
4. Verify examples are clear

## Acceptance Criteria

- [ ] New "Test Verification Requirements" section added
- [ ] Gate function updated to include CAPTURE step
- [ ] Valid/invalid examples provided
- [ ] Red flags updated
- [ ] Skill file renders correctly (no markdown errors)
- [ ] Examples are framework-agnostic (Jest, pytest, cargo, go)

## Verification

After implementation:

1. Read the updated skill file
2. Verify all sections are present
3. Check that examples cover multiple languages
4. Ensure language is mandatory (MUST, not SHOULD)

## References

- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 40-72
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 1, item 1

## Completion Notes

Successfully implemented all requirements on 2025-11-20:

**Changes Made:**

1. **Added "Test Verification Requirements" section** (lines 94-160 in SKILL.md)
   - Required evidence format: exact command, complete output, coverage
   - Valid verification example using Jest/npm test
   - Five invalid verification anti-patterns
   - Framework-agnostic commands: npm test, pytest, cargo test, go test

2. **Gate function CAPTURE step** (line 36 in SKILL.md)
   - Already present from previous update
   - Step 4: "CAPTURE: Copy complete output to include in your message"

3. **Added three red flags** (lines 69-71 in SKILL.md)
   - Claiming tests pass without showing output
   - Paraphrasing test results instead of showing raw output
   - Showing partial output (truncated, filtered)

4. **Verified markdown rendering**
   - All code blocks properly closed
   - Lists and formatting correct
   - No syntax errors

5. **Confirmed mandatory language**
   - Uses "MUST" throughout (not "SHOULD")
   - "If you cannot provide the complete output above, you have not verified."

**Acceptance Criteria:**
- [x] New "Test Verification Requirements" section added
- [x] Gate function updated to include CAPTURE step
- [x] Valid/invalid examples provided
- [x] Red flags updated
- [x] Skill file renders correctly (no markdown errors)
- [x] Examples are framework-agnostic (Jest, pytest, cargo, go)

All acceptance criteria met. The skill now enforces evidence-based test verification with clear examples and mandatory requirements.
