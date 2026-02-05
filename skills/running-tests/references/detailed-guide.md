# Running Tests - Detailed Guide

- Alternative: Jest (if team preference or legacy)

**Configuration:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for browser code
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.config.ts']
    }
  }
})
```

### Python

**Preferred:**
- pytest (industry standard, powerful fixtures)

**Configuration:**
```ini
[pytest]
testpaths = tests
addopts =
    -v
    --cov=src
    --cov-report=term-missing
    --cov-report=html
    --strict-markers
```

### Go

**Built-in testing is excellent:**
```bash
go test ./...           # Run all tests
go test -v ./...        # Verbose
go test -cover ./...    # With coverage
go test -race ./...     # Race detection
```

### Rust

**Built-in testing:**
```bash
cargo test              # Run all tests
cargo test --verbose    # Verbose output
cargo test --release    # Optimized builds
```

---

## Important Notes

### Test-Driven Development Integration

If the project follows TDD (has `practicing-tdd` skill), ensure fixes maintain TDD principles:
- Don't modify tests to make them pass if behavior is correct
- Fix implementation, not tests (unless test is actually wrong)
- Add new tests for edge cases discovered

### Verification Before Completion

This skill enforces the `verifying-before-completion` principle:
- Never claim tests pass without actually running them
- Show test output as evidence
- Re-run after fixes to confirm

### Parallel Execution

For large test suites, enable parallel execution:

**Vitest:**
```bash
vitest run --threads
```

**pytest:**
```bash
pytest -n auto  # Requires pytest-xdist
```

**Go:**
```bash
go test -parallel 8 ./...
```

### CI/CD Consideration

After setting up tests, suggest CI integration:
- GitHub Actions workflow example
- GitLab CI configuration
- Automated test runs on PRs

---

## Usage Examples

### Example 1: Project with Existing Tests

**User:** "Run the tests"

**Workflow:**
1. Detects package.json with `"test": "vitest run"`
2. Runs `npm test`
3. Sees 15 tests, 2 failures
4. Reads failing tests, diagnoses issues
5. Fixes: One test had wrong mock data, one test had outdated assertion
6. Re-runs tests, all 15 pass
7. Reports success

---

### Example 2: New Project, No Tests

**User:** "Run the tests"

**Workflow:**
1. Detects TypeScript project (tsconfig.json exists)
2. No test framework found
3. Installs Vitest, creates config
4. Adds test scripts to package.json
5. Creates example test file
6. Runs tests, 1 example test passes
7. Reports setup complete and suggests writing real tests

---

### Example 3: Python Project with Failures

**User:** "Run the tests"

**Workflow:**
1. Detects Python project with pytest
2. Runs `pytest`
3. Sees 45 tests, 8 failures
4. Analyzes failures:
   - 3 tests have wrong expected values (outdated)
   - 5 tests failing due to bug in `calculate_total()` function
5. Fixes bug in `calculate_total()`
6. Updates 3 test expectations
7. Re-runs pytest, all 45 pass
8. Reports 100% pass rate

---

### Example 4: Cascading Failures

**User:** "Run the tests"

**Workflow:**
1. Runs tests, 50 failures (out of 100 tests)
2. Analyzes: All failures in same module
3. Identifies root cause: Shared utility function broken
4. Fixes utility function
5. Re-runs tests, now only 5 failures (unrelated)
6. Fixes remaining 5 individually
7. All 100 tests pass
8. Reports success with explanation of root cause

---

## Advanced Features

### Watch Mode Support

For iterative development, suggest watch mode:
```bash
npm run test:watch
# or
pytest --watch
```

### Coverage Thresholds

Set up coverage enforcement:
```json
{
  "test": {
    "coverage": {
      "thresholds": {
        "lines": 80,
        "functions": 80,
        "branches": 80,
        "statements": 80
      }
    }
  }
}
```

### Test Organization

Suggest organizing tests by type:
```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Tests with dependencies
└── e2e/            # Full system tests
```

Run specific suites:
```bash
npm test -- tests/unit
npm test -- tests/integration
```

---

## Metrics to Track

- **Test count:** Total tests in suite
- **Pass rate:** % passing
- **Coverage:** Statement/branch/function/line coverage
- **Duration:** Time to run full suite
- **Flaky tests:** Tests that intermittently fail
- **Test/code ratio:** Lines of test code vs. production code

---

---

## Git Hooks Integration

If the project has git hooks enabled (via wrangler's setting-up-git-hooks skill), tests run automatically:

### Automatic Test Execution

| Hook | What Runs | When |
|------|-----------|------|
| pre-commit | Unit tests only | Every commit |
| pre-push | Full test suite | Push to protected branches |

### When to Use This Skill vs. Hooks

**Let hooks handle it:**
- Normal development workflow
- Commits and pushes
- Routine changes

**Use this skill manually:**
- Debugging test failures from hooks
- Running tests with specific options (coverage, verbose)
- Setting up test infrastructure
- Investigating flaky tests
- Running subset of tests during development

### Bypass for Debugging

If hooks are blocking and you need to debug:

```bash
# Bypass to commit work-in-progress
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: debugging test failure"

# Then run tests manually with verbose output
npm test -- --verbose

# Or run specific failing test
npm test -- path/to/failing.test.ts
```

**Note**: The bypass is for debugging only. Fix the root cause before pushing.

### Checking Hook Configuration

```bash
# View hooks configuration
cat .wrangler/config/hooks-config.json

# Check which test command hooks use
grep testCommand .wrangler/config/hooks-config.json
```

---

*Run-the-Tests Skill v1.0*
