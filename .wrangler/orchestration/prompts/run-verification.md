---
name: run-verification
description: Runs full verification suite (tests, build, lint)
---

Run the full verification suite for this project.

## Steps
1. Run the test suite and capture results
2. Run the build (if applicable)
3. Run the linter (if applicable)
4. Verify no regressions

## Output
Return structured JSON with:
- testSuite: {passed, failed, total, coverage, exitCode}
- build: {success, errors}
- lint: {success, warnings, errors}
- overallPass: boolean
