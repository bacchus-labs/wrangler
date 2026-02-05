# Verifying Before Completion - Detailed Guide


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

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Example Scenarios

### Scenario 5: Frontend Component Implementation

```
Agent: "I need to implementing-issue a checkout form component."

[Uses frontend-visual-regression-testing + frontend-accessibility-verification]

Agent: "I've implemented the checkout form."

GATE FUNCTION CHECK:

0. TDD COMPLIANCE: Did you write tests first?
   ✓ YES - Wrote component test, then implementation

1. IDENTIFY: What proves checkout form works?
   Command: npm test -- checkout.test.ts
   Command: Open DevTools console
   Command: Run axe-core test

2. RUN: Execute commands
   [Runs tests]

3. READ: Test output
   ```
   PASS tests/checkout.test.ts
     ✓ renders form correctly
     ✓ submits with valid data
     ✓ shows errors for invalid data
     ✓ is accessible (0 a11y violations)

   Tests: 4 passed, 4 total
   ```

   [Opens DevTools]
   Console: 0 errors, 0 warnings
   Network: 2 requests (both 200 OK)

   [Runs axe-core]
   Accessibility violations: 0
   Lighthouse score: 98/100

4. VERIFY: Complete Frontend Verification Checklist
   ✓ Visual: Screenshot taken, responsive tested
   ✓ Console: 0 errors
   ✓ Network: Expected requests only
   ✓ Accessibility: 0 violations, keyboard nav works
   ✓ Interactions: All tested

5. PROVIDE EVIDENCE:

## Frontend Verification Evidence

### Visual Verification
Screenshot: checkout-form.png (baseline created)
Responsive breakpoints tested: ✓ Mobile, Tablet, Desktop

### Console Verification
Console errors: 0
[Screenshot showing clean console]

### Network Verification
Expected requests:
- ✓ POST /api/validate-address (200 OK)
- ✓ POST /api/checkout (201 Created)

### Accessibility Verification
axe-core violations: 0
Keyboard navigation: ✓ All accessible
Lighthouse score: 98/100

### Interaction Verification
- ✓ Submit with valid data → Success message
- ✓ Submit with invalid data → Error messages
- ✓ Tab navigation → All inputs accessible

6. ONLY THEN: "Checkout form complete. All tests pass. Frontend verification complete."
```

## Why This Matters

From 24 failure memories:
- your human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## Integration with Other Skills

**Frontend work:**
- frontend-visual-regression-testing: Screenshot verification required
- frontend-accessibility-verification: Accessibility testing required
- frontend-e2e-user-journeys: E2E tests for critical flows

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

---

## Git Hooks Integration

If the project has git hooks enabled (via wrangler's setting-up-git-hooks skill), they provide automated verification:

### Hooks as First-Line Verification

Git hooks enforce verification automatically:

| Hook | What It Verifies | When |
|------|------------------|------|
| pre-commit | Format, lint, unit tests | Every commit |
| pre-push | Full test suite | Push to protected branches |
| commit-msg | Message format | Every commit (if enabled) |

### Hooks + Manual Verification

Hooks provide automated verification, but this skill adds human verification:

**Hooks verify:**
- Tests pass (automated)
- Linter clean (automated)
- Format correct (automated)

**This skill verifies:**
- Requirements met (manual checklist)
- TDD compliance (certification)
- Code review obtained (gate)
- Evidence documented (proof)

**Both are required.** Hooks passing is necessary but not sufficient.

### Verification Checklist with Hooks

When claiming work complete:

- [ ] **Pre-commit passed** for all commits
- [ ] **Pre-push passed** (if pushing to protected branch)
- [ ] **No bypass used** (or bypass is documented with justification)
- [ ] **TDD Compliance Certification** provided
- [ ] **Code Review Gate** passed
- [ ] **Requirements checklist** verified

### Hooks Passing in Completion Evidence

Include hook status in your completion evidence:

```markdown
## Verification Evidence

### Git Hooks Status
- Pre-commit: PASSED (all commits)
- Pre-push: PASSED (push to main)
- Bypass used: NO (or: YES for TDD RED phase commits)

### Test Results
[Full test output as usual]

### TDD Compliance Certification
[As usual]

### Code Review Gate
[As usual]
```

### What If Hooks Were Bypassed?

If you used `WRANGLER_SKIP_HOOKS=1`:

1. **Document why** in your completion evidence
2. **Valid reasons**: TDD RED phase, emergency fix
3. **Invalid reasons**: "tests were slow", "I was confident"
4. **Run tests manually** before claiming completion

```markdown
### Bypass Documentation
- Bypass used: YES
- Commits bypassed: 2
- Reason: TDD RED phase (writing failing tests)
- Manual verification: Ran full test suite, all pass
```
