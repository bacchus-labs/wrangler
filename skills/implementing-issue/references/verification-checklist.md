# Verification Checklist

## 1. Run Tests

```bash
npm test  # or: pytest, cargo test, go test, etc.
```

Capture:
- Total tests run
- Pass/fail counts
- Any warnings or errors

Expected: All tests pass, exit code 0

## 2. Verify Acceptance Criteria

Map each acceptance criterion from the issue to:
- Implementation file(s)
- Test file(s)
- Passing test(s)

Status: [X/Y] acceptance criteria met

## 3. TDD Compliance Certification

Verify certification table is complete:
- Every new function/method has a certification entry
- RED phase documented (test failed first)
- GREEN phase documented (test passed after implementation)

## 4. Git Status

```bash
git status
```

Expected:
- All changes committed
- On correct branch
- Working tree clean
