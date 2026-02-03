# Practicing Tdd - Detailed Guide


**How this follows TDD:**
- Functional test still follows RED-GREEN-REFACTOR
- Baseline generation happens AFTER functional implementation
- The "RED" phase for visual tests comes when you change CSS and screenshot differs
- Baseline generation doesn't violate "watch it fail" - the test will fail on future unintended changes

See frontend-visual-regression-testing skill for details.

### E2E Tests

**Build incrementally** (recommended):
- Write E2E test for page 1 (RED-GREEN-REFACTOR)
- Extend E2E test to page 2 (RED-GREEN-REFACTOR)
- Continue until complete flow tested

**Alternative: Skeleton approach**
- Write entire E2E test upfront (will fail at first unimplemented step)
- Implement each step (test progresses further before failing)
- Continue until all steps pass

See frontend-e2e-user-journeys skill for detailed approaches.

### Component Tests

**Standard TDD applies:**
1. RED: Write test for component behavior
2. GREEN: Implement component
3. REFACTOR: Improve code

No special cases for component tests - follow standard RED-GREEN-REFACTOR.

---

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered
- [ ] TDD Compliance Certification created (see section above)

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask your human partner. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Test proves fix and prevents regression.

Never fix bugs without a test.

## Final Rule

```
Production code → test exists and failed first
Otherwise → not TDD
```

No exceptions without your human partner's permission.

## Integration with Verification

The evidence requirements in RED and GREEN phases integrate with verifying-before-completion:

- **RED phase evidence** → Proves you watched test fail
- **GREEN phase evidence** → Proves tests now pass
- **Both together** → Required for TDD Compliance Certification

See verifying-before-completion skill for complete certification requirements.

---

## Git Hooks Integration

If the project has git hooks enabled (via wrangler's setting-up-git-hooks skill), they interact with TDD:

### TDD with Git Hooks

| Phase | Git Hook Behavior | What To Do |
|-------|-------------------|------------|
| **RED** | Pre-commit will fail (tests fail) | Use bypass: `WRANGLER_SKIP_HOOKS=1 git commit` |
| **GREEN** | Pre-commit should pass | Normal commit works |
| **REFACTOR** | Pre-commit should pass | Normal commit works |

### RED Phase and Hooks

The pre-commit hook runs unit tests before each commit. During the RED phase, your test is intentionally failing, which will block the commit.

**Expected workflow:**

```bash
# Write failing test (RED phase)
# ...write test code...

# Try to commit - BLOCKED by hook (expected!)
git commit -m "WIP: failing test for feature X"
# [pre-commit] ERROR: Unit tests failed

# Use bypass for RED phase commit
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for feature X"
# Commit succeeds

# Implement minimal code (GREEN phase)
# ...write implementation...

# Now tests pass, normal commit works
git commit -m "feat: implementing-issues feature X"
# [pre-commit] OK: All checks passed
```

### Why This Design?

The bypass mechanism is intentionally available to humans but NOT to AI agents:

1. **Humans can set environment variables** in their shell
2. **AI agents cannot persist environment variables** between commands
3. This ensures **agents always face test enforcement** while **humans have TDD flexibility**

### Commit Message Conventions

When using bypass for RED phase:

```bash
# Good: Clear WIP indicator
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for retry logic"

# Good: Reference issue
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: red phase for ISS-000123"

# Bad: Unclear why bypassed
WRANGLER_SKIP_HOOKS=1 git commit -m "add test"
```

### What About Push?

Pre-push hooks run full test suite on protected branches. By the time you push:

1. RED phase should be complete (test committed)
2. GREEN phase should be complete (implementation committed)
3. All tests should pass

**Never push failing tests to protected branches.** If you need to share WIP work, push to a feature branch (usually not protected).
