# Verification Requirements

This document defines what evidence is required before making various claims during development. Following these requirements ensures honesty, builds trust, and prevents bugs from slipping through.

**Core Principle**: Evidence before claims, always.

---

## Test Verification

### Claiming "Tests Pass"

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
   # or
   mvn test
   ```

2. **Complete output showing**:
   - Test count: "X tests passed"
   - Failure count: "0 failed"
   - Duration: "Time: X.XXXs"
   - Exit code: 0

3. **Coverage report (if available)**:
   - Statement coverage: X%
   - Branch coverage: X%
   - Function coverage: X%
   - Line coverage: X%

**Example of VALID verification**:

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
Time:        6.376s

Process exited with code 0

All 6 tests pass successfully.
```

**Example of INVALID verification**:

❌ "I ran the tests and they pass."
❌ "Tests are green."
❌ "Everything looks good."
❌ [Shows only 1 test when there are 50]
❌ [Shows truncated output without pass/fail counts]

---

## TDD Verification

### Claiming "Followed TDD"

**Required Evidence**:

1. **RED Phase Evidence**:
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
   Exit code: 1

   This is the expected failure - function doesn't exist yet.
   Proceeding to GREEN phase.
   ```

2. **GREEN Phase Evidence**:
   ```
   Running GREEN phase verification:

   $ npm test -- retry.test.ts

   PASS tests/retry.test.ts
     ✓ retries failed operations 3 times (145 ms)

   Test Suites: 1 passed, 1 total
   Tests:       1 passed, 1 total
   Exit code: 0

   Test now passes. Proceeding to REFACTOR phase.
   ```

3. **TDD Compliance Certification**:
   ```markdown
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
     - **Refactored**: N/A
   ```

**Invalid TDD Claims**:

❌ "I followed TDD" (without certification)
❌ "Tests were written first" (without RED/GREEN output)
❌ "I watched it fail/pass in my head"
❌ Vague about failure messages
❌ Can't describe what failure message was seen
❌ "Followed the spirit of TDD" (without RED-GREEN evidence)

---

## Build Verification

### Claiming "Build Succeeds"

**Required Evidence**:

1. **Exact command executed**:
   ```bash
   npm run build
   # or
   cargo build
   # or
   mvn package
   # or
   make build
   ```

2. **Complete output showing**:
   - Build steps completed
   - No errors
   - Exit code: 0
   - Output artifacts created

**Example**:

```
$ npm run build

> project@1.0.0 build
> tsc && vite build

✓ 156 modules transformed.
dist/index.html                   0.45 kB
dist/assets/index-abc123.js     125.32 kB
dist/assets/index-xyz789.css      8.21 kB

Build completed in 3.2s
Exit code: 0
```

**Invalid Claims**:

❌ "Linter passed" (linter doesn't check compilation)
❌ "Should build fine" (speculation, not evidence)
❌ "No syntax errors" (doesn't prove build succeeds)

---

## Code Review Verification

### Claiming "Code Review Passed"

**Required Evidence**:

1. **Review Report**:
   ```markdown
   # Code Review Report

   ## Summary
   - Overall: APPROVED_WITH_ITEMS
   - Critical Issues: 0
   - Important Issues: 1 (converted to issue #123)
   - Minor Issues: 3

   ## Critical Issues
   None

   ## Important Issues
   - Missing error handling for network timeout
     → Converted to tracked issue #123

   ## Minor Issues
   - Consider extracting validation logic
   - Add JSDoc comments to public API
   - Rename variable 'tmp' to 'tempResult'

   ## Recommendations
   - All minor issues can be addressed in follow-up PR
   ```

2. **Gate Checklist Verification**:
   ```markdown
   ## Code Review Gate

   - [x] Code review requested
   - [x] Review completed
   - [x] Critical issues: 0
   - [x] Important issues: 0 (1 converted to issue #123)
   - [x] Review status: Approved with minor items
   - [x] Review reference: See above

   Review approved for merge.
   ```

**Invalid Claims**:

❌ "This is too simple for review"
❌ "I'll get review later"
❌ Proceeding with unfixed Critical/Important issues
❌ Claiming exception without documenting which (1, 2, or 3)

---

## Frontend Verification

### Claiming "UI Works"

**Required Evidence**:

1. **Visual Verification**:
   - Screenshot showing correct rendering
   - Responsive breakpoints tested (mobile, tablet, desktop)
   - Visual regression comparison (if baseline exists)

2. **Console Verification**:
   ```
   Console errors: 0
   Console warnings: 0 (or: 1 expected warning about X)
   [Screenshot of clean console]
   ```

3. **Network Verification**:
   ```
   Expected requests:
   - ✓ GET /api/products (200 OK)
   - ✓ POST /api/checkout (201 Created)

   Failed requests: 0
   ```

4. **Accessibility Verification**:
   ```
   axe-core violations: 0
   Keyboard navigation: ✓ All elements accessible
   Lighthouse score: 97/100
   ```

5. **Interaction Verification**:
   ```
   Tested interactions:
   - ✓ Submit button → Form submits successfully
   - ✓ Cancel button → Form clears
   - ✓ Invalid email → Error message displays
   - ✓ Loading state → Spinner renders
   ```

**Frontend Verification Template**:

```markdown
## Frontend Verification Evidence

### Visual Verification
Screenshot: component-name.png
Responsive breakpoints tested: Mobile (375x667), Tablet (768x1024), Desktop (1920x1080)
Visual regression: [Baseline created | No changes | Intentional changes approved]

### Console Verification
Console errors: 0
Console warnings: 0
[Screenshot of clean console]

### Network Verification
Expected requests:
- ✓ GET /api/products (200 OK)
- ✓ POST /api/checkout (201 Created)
Failed requests: 0

### Accessibility Verification
axe-core violations: 0
Keyboard navigation: ✓ All elements accessible
Lighthouse score: 97/100

### Interaction Verification
Tested interactions:
- ✓ Submit → Success
- ✓ Cancel → Clear
- ✓ Invalid input → Error message
- ✓ Loading → Spinner
```

**Invalid Claims**:

❌ "Looks good" (without DevTools verification)
❌ Proceeding with console errors
❌ Skipping accessibility testing
❌ Not testing responsive breakpoints
❌ "UI complete" without screenshot evidence

---

## Requirements Verification

### Claiming "Requirements Met"

**Required Evidence**:

1. **Requirements Checklist**:
   ```markdown
   ## Requirements Verification

   From specification [spec-name]:

   - [x] Requirement 1: User can login with email/password
     - Evidence: Test `test_login_with_valid_credentials` passes
     - Location: src/auth/login.ts:45-67

   - [x] Requirement 2: Invalid credentials show error
     - Evidence: Test `test_login_with_invalid_credentials` passes
     - Location: src/auth/login.ts:69-82

   - [x] Requirement 3: Login persists session
     - Evidence: Test `test_session_persists_after_login` passes
     - Location: src/auth/session.ts:23-45

   All 3 requirements verified.
   ```

2. **Line-by-line comparison**:
   - Re-read specification
   - Create checklist item for each requirement
   - Verify each with specific evidence
   - Report gaps if any found

**Invalid Claims**:

❌ "Tests pass, requirements met" (no checklist)
❌ "Implemented everything" (no verification)
❌ Assuming requirements met without checking

---

## Subagent Verification

### Claiming "Subagent Completed Task"

**Required Evidence**:

1. **VCS Diff Review**:
   ```bash
   git diff main...feature-branch
   # Review all changes made by subagent
   ```

2. **Test Execution**:
   ```bash
   npm test
   # Verify subagent's changes pass tests
   ```

3. **Requirements Check**:
   - Compare subagent's changes to task requirements
   - Verify all task objectives met
   - Check for unintended changes

**Process**:

```
Subagent reports success
  ↓
Check VCS diff
  ↓
Verify changes match task
  ↓
Run tests
  ↓
Report actual state (not just agent's claim)
```

**Invalid Claims**:

❌ Trusting subagent report without verification
❌ "Agent said it works" (no independent check)
❌ Skipping test execution

---

## Regression Test Verification

### Claiming "Regression Test Works"

**Required Evidence**:

1. **RED-GREEN Cycle Verification**:
   ```
   Step 1: Write test
   Step 2: Run test → PASSES (bug not reproduced yet)
   Step 3: Revert fix → Run test → FAILS (bug reproduced)
   Step 4: Restore fix → Run test → PASSES (fix verified)
   ```

**Process**:

```bash
# Write regression test
git add test/regression.test.ts
git commit -m "test: add regression test for bug X"

# Verify test passes with fix
npm test -- regression.test.ts
# → PASS (bug is fixed)

# Revert fix temporarily
git stash
npm test -- regression.test.ts
# → FAIL (test catches the bug)

# Restore fix
git stash pop
npm test -- regression.test.ts
# → PASS (fix verified)
```

**Invalid Claims**:

❌ "I've written a regression test" (without RED-GREEN cycle)
❌ Test never shown to fail (doesn't prove it catches bug)

---

## Performance Verification

### Claiming "Performance Improved"

**Required Evidence**:

1. **Benchmark Results**:
   ```
   BEFORE optimization:
   Average: 245ms
   p50: 230ms
   p95: 380ms
   p99: 520ms

   AFTER optimization:
   Average: 82ms (66% improvement)
   p50: 75ms (67% improvement)
   p95: 120ms (68% improvement)
   p99: 180ms (65% improvement)
   ```

2. **Profiler Data**:
   - Flame graphs showing improvement
   - Memory allocation reduction
   - CPU time reduction

**Invalid Claims**:

❌ "Should be faster now" (no measurement)
❌ "Feels quicker" (subjective)
❌ No before/after comparison

---

## Security Verification

### Claiming "Security Review Passed"

**Required Evidence**:

1. **Security Checklist**:
   ```markdown
   - [x] Input validation on all user inputs
   - [x] SQL injection prevention (parameterized queries)
   - [x] XSS prevention (output encoding)
   - [x] CSRF protection enabled
   - [x] Authentication required for sensitive endpoints
   - [x] Authorization checks in place
   - [x] Secrets not in code/logs
   - [x] Dependencies scanned (npm audit / cargo audit)
   ```

2. **Dependency Scan Results**:
   ```bash
   $ npm audit

   found 0 vulnerabilities
   ```

**Invalid Claims**:

❌ "Should be secure" (no verification)
❌ Skipping dependency scan
❌ No input validation verification

---

## Documentation Verification

### Claiming "Documentation Complete"

**Required Evidence**:

1. **Documentation Checklist**:
   ```markdown
   - [x] README updated with new features
   - [x] API documentation generated (JSDoc/rustdoc/etc.)
   - [x] User guide updated
   - [x] Examples added for new features
   - [x] Migration guide (if breaking changes)
   ```

2. **Link Verification**:
   ```bash
   # Verify all documentation links work
   markdown-link-check docs/**/*.md
   # → 0 broken links
   ```

**Invalid Claims**:

❌ "Documentation updated" (no checklist)
❌ Broken links present
❌ Missing examples for new features

---

## Common Verification Patterns

### Pattern: Command Output Verification

**Template**:

```
Verification step: [what we're verifying]

$ [exact command]

[complete output]

Exit code: [0 or error code]

[interpretation of results]
```

### Pattern: Checklist Verification

**Template**:

```markdown
## [Verification Category]

- [x] Item 1: [what was verified]
  - Evidence: [specific proof]
- [x] Item 2: [what was verified]
  - Evidence: [specific proof]
- [ ] Item 3: [what failed]
  - Issue: [what's wrong]
  - Action: [what to do]

[Summary]: X/Y items verified, Z items need attention
```

### Pattern: Before/After Verification

**Template**:

```
BEFORE:
[baseline measurement]

CHANGES:
[what was modified]

AFTER:
[new measurement]

IMPACT:
[comparison and interpretation]
```

---

## Red Flags (Stop and Verify)

### Language Red Flags

If you catch yourself using these words, STOP and verify:

❌ "should"
❌ "probably"
❌ "seems to"
❌ "looks like"
❌ "I think"
❌ "appears to"
❌ "likely"

These indicate speculation, not verification.

### Behavior Red Flags

❌ Expressing satisfaction before verification ("Great!", "Perfect!")
❌ About to commit/push/PR without verification
❌ Trusting agent success reports
❌ Relying on partial verification
❌ Thinking "just this once"
❌ Tired and wanting work over
❌ Paraphrasing results instead of showing raw output

---

## Verification Hierarchy

**Level 1: Automated Tests** (Most Reliable)
- Command output from test suite
- Exit codes
- Coverage reports

**Level 2: Build Verification**
- Compilation success
- No warnings/errors
- Output artifacts created

**Level 3: Manual Verification**
- Visual inspection
- Browser testing
- Accessibility checks

**Level 4: Human Review**
- Code review
- Security review
- Architecture review

**DO NOT SKIP LEVELS**. Each level provides additional confidence.

---

## Integration with Workflows

See `docs/workflows.md` for how these verification requirements integrate into:

- Test-Driven Development workflow
- Verification Before Completion workflow
- Code Review workflow
- Frontend testing workflow

---

## References

- **TDD Skill**: `skills/practicing-tdd/SKILL.md`
- **Verification Skill**: `skills/verifying-before-completion/SKILL.md`
- **Code Review Skill**: `skills/reviewing-code/SKILL.md`
- **Testing Anti-Patterns**: `skills/avoiding-testing-anti-patterns/SKILL.md`
- **Workflows**: `docs/workflows.md`

---

**Last Updated**: November 23, 2025
**Document Version**: 1.0.0
