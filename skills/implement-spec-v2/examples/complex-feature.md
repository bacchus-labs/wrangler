# Example: Complex Feature (With E2E)

This example shows implementing a user-facing feature that requires E2E testing.

## Scenario

Implementing user dashboard from SPEC-000050 with interactive UI components.

## Key Differences from Simple Feature

- Spec includes E2E test requirements
- VERIFY phase includes E2E test execution
- Manual testing checklist must be completed

## VERIFY Phase (Extended)

After standard verification:

### 1. Extract E2E Requirements from Spec

```
LLM extracts from SPEC-000050:
- E2E-001: User can log in and see dashboard
- E2E-002: User can filter data by date range
- E2E-003: Dashboard charts update when data changes
- E2E-004: User can export data as CSV
```

### 2. Verify E2E Tests Exist

```bash
# Check for E2E test files
cd /Users/user/project/.worktrees/spec-000050-dashboard && \
find . -name "*.e2e.test.ts" -o -name "*.spec.ts"

# Output:
# ./e2e/dashboard.e2e.test.ts
# ./e2e/filters.e2e.test.ts
# ./e2e/export.e2e.test.ts

# Verify coverage
# E2E-001: ✓ dashboard.e2e.test.ts:10
# E2E-002: ✓ filters.e2e.test.ts:15
# E2E-003: ✓ dashboard.e2e.test.ts:45
# E2E-004: ✓ export.e2e.test.ts:8
```

### 3. Run E2E Test Suite

```bash
cd /Users/user/project/.worktrees/spec-000050-dashboard && \
npm run test:e2e 2>&1 | tee ".wrangler/sessions/{SESSION_ID}/e2e-test-output.txt"

# Output:
# E2E Test Results:
# - dashboard.e2e.test.ts: 8 passing
# - filters.e2e.test.ts: 6 passing
# - export.e2e.test.ts: 4 passing
# Total: 18 tests, 18 passing

# E2E_EXIT_CODE: 0 ✓
```

### 4. Manual Testing Checklist

```
LLM extracts from SPEC-000050:
- MT-001: Verify dashboard loads in < 2 seconds
- MT-002: Verify charts are accessible (screen reader)
- MT-003: Verify mobile responsive layout
- MT-004: Verify data export downloads correct file
```

**These must be completed before PUBLISH:**
- [ ] MT-001: Performance verified
- [ ] MT-002: Accessibility verified
- [ ] MT-003: Mobile verified
- [ ] MT-004: Export verified

**If manual testing not complete:**
→ BLOCK at VERIFY phase
→ User must complete checklist or approve exception
→ Document completion in session audit

### 5. Compliance Calculation (Extended)

```
Acceptance criteria: 8 met / 8 total = 100%
E2E tests: 4 met / 4 required = 100%
Manual testing: 4 met / 4 required = 100%

Overall compliance: 100% ✓
```

## Quality Gate

**VERIFY phase blocks if:**
- Unit test compliance < 100%
- E2E test compliance < 100%
- Manual testing checklist incomplete
- Any tests failing

**Exception process:**
- User can approve exceptions (document reason)
- Exception recorded in session audit
- PR description shows exception granted

## PUBLISH Phase (Extended)

PR description includes E2E and manual testing results:

```markdown
### Test Results

- Unit tests passing (65 tests)
- E2E tests passing (18 tests)
- Manual testing complete (4 items verified)
- Compliance: 100%

### E2E Coverage

- ✓ E2E-001: User can log in and see dashboard
- ✓ E2E-002: User can filter data by date range
- ✓ E2E-003: Dashboard charts update when data changes
- ✓ E2E-004: User can export data as CSV

### Manual Testing

- ✓ MT-001: Dashboard loads in 1.2s (target: < 2s)
- ✓ MT-002: Screen reader announces all regions
- ✓ MT-003: Mobile layout verified on iPhone 13
- ✓ MT-004: CSV export verified with sample data
```

## Key Takeaways

- E2E testing is required for user-facing features
- VERIFY phase is more comprehensive
- Manual testing checklist must be completed
- Compliance calculation includes all test types
- PR description shows full verification results
