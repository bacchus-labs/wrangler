# Final Verification Checklist

## 1. Run Full Test Suite

```bash
npm test  # or: pytest, cargo test, go test, etc.
```

Capture:
- Total tests run
- Pass/fail counts
- Execution time
- Any warnings or errors

Expected: All tests pass, exit code 0

## 2. Verify Requirements Met

Create checklist mapping each requirement to:
- Implementation files
- Test files
- Passing tests

Status: [X/Y] requirements met

## 3. Aggregate TDD Compliance Certifications

Collect all certification tables from subagent reports.
Verify every new function has certification entry.

## 4. Code Review Summary

Aggregate feedback across all tasks:
- Critical: [N] found, [N] fixed
- Important: [N] found, [N] fixed
- Minor: [N] found, [N] deferred

## 5. Git Status Check

```bash
git status
```

Expected:
- Working tree clean
- All changes committed
- On correct branch
