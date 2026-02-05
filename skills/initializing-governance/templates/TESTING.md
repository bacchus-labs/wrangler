# Test Documentation

{{STATUS_PLACEHOLDER}}

> This document provides comprehensive test documentation for the project, including infrastructure setup, test organization, running tests, and git hooks enforcement.

## Test Infrastructure Setup

### Prerequisites

{{TEST_PREREQUISITES}}

### Installation

```bash
# Install test dependencies
{{INSTALL_COMMAND}}
```

### Configuration

Test configuration is located in:
- {{TEST_CONFIG_FILE}}

## Test Organization

### Directory Structure

```
{{TEST_DIRECTORY}}/
├── unit/           # Unit tests (fast, isolated, no external dependencies)
├── integration/    # Integration tests (may use databases, APIs, file system)
└── e2e/            # End-to-end tests (full system tests)
```

### Test Categories

| Category | Purpose | Speed | Dependencies | When to Run |
|----------|---------|-------|--------------|-------------|
| **Unit** | Test individual functions/classes | Fast (<5s total) | None | Every commit (pre-commit) |
| **Integration** | Test component interactions | Medium (30s-2min) | Some external | Before push (pre-push) |
| **E2E** | Test full user workflows | Slow (2-10min) | Full system | Before merge to main |

### Naming Conventions

- Test files: `*.test.{{FILE_EXTENSION}}` or `*_test.{{FILE_EXTENSION}}`
- Test functions: `test_<description>` or `describe('<component>', ...)`
- Fixtures: Located in `{{TEST_DIRECTORY}}/fixtures/`

## Running Tests

### Quick Commands

```bash
# Run all tests
{{TEST_COMMAND}}

# Run unit tests only (fast, for pre-commit)
{{UNIT_TEST_COMMAND}}

# Run integration tests
{{INTEGRATION_TEST_COMMAND}}

# Run e2e tests
{{E2E_TEST_COMMAND}}

# Run tests with coverage
{{COVERAGE_COMMAND}}

# Run specific test file
{{SPECIFIC_TEST_COMMAND}}
```

### Test Environments

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| Local | Developer testing | Default config |
| CI | Continuous integration | `.github/workflows/` or CI config |
| Staging | Pre-production testing | Environment-specific config |

### Environment Variables

```bash
# Required for tests
{{TEST_ENV_VARS}}
```

## Test Requirements

### Coverage Requirements

- **Minimum Coverage**: {{COVERAGE_MINIMUM}}%
- **Target Coverage**: {{COVERAGE_TARGET}}%
- **Required for**: All new code

### Test-Driven Development (TDD)

This project follows TDD. The expected workflow is:

1. **RED**: Write a failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve code quality

> **Git Hooks Note**: Pre-commit hooks enforce passing tests. When writing failing tests (RED phase), use `WRANGLER_SKIP_HOOKS=1 git commit` to bypass temporarily.

### Quality Standards

- [ ] All tests are deterministic (no flaky tests)
- [ ] Tests are isolated (no shared state between tests)
- [ ] Tests are fast (unit tests < 100ms each)
- [ ] Tests have clear assertions with meaningful messages
- [ ] Tests cover edge cases and error conditions
- [ ] Mock external dependencies appropriately

## Git Hooks Test Enforcement

### Pre-Commit Hook

The pre-commit hook runs automatically before each commit:

**What it runs:**
- Unit tests ({{UNIT_TEST_COMMAND}})
- Linter ({{LINT_COMMAND}})
- Formatter ({{FORMAT_COMMAND}})

**What happens on failure:**
- Commit is blocked
- Error message shows which tests/checks failed
- Developer must fix issues before committing

**Bypassing (when necessary):**
```bash
# Temporary bypass for TDD RED phase
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for new feature"

# Add to shell profile for permanent bypass (not recommended)
export WRANGLER_SKIP_HOOKS=1
```

### Pre-Push Hook

The pre-push hook runs when pushing to protected branches ({{PROTECTED_BRANCHES}}):

**What it runs:**
- Full test suite ({{TEST_COMMAND}})

**What happens on failure:**
- Push is blocked
- Full test output shown
- Developer must fix all tests before pushing

**Protected branches:**
{{PROTECTED_BRANCHES_LIST}}

### Docs-Only Changes

Changes that only affect documentation files skip test execution:

**Detected patterns:**
{{DOCS_PATTERNS_LIST}}

## Troubleshooting

### Common Issues

#### Tests fail locally but pass in CI

**Cause**: Environment differences

**Solution**:
1. Check environment variables match
2. Verify dependencies are same version
3. Check for time-zone or locale issues
4. Look for platform-specific behavior

#### Tests are flaky (sometimes pass, sometimes fail)

**Cause**: Non-deterministic test behavior

**Solution**:
1. Remove reliance on time or random values
2. Isolate tests (no shared state)
3. Mock external services
4. Add retries only as last resort

#### Pre-commit hook is too slow

**Cause**: Running too many tests

**Solution**:
1. Ensure only unit tests run in pre-commit
2. Use test filtering/patterns
3. Consider test parallelization
4. Move slow tests to pre-push

#### Cannot bypass hooks

**Cause**: Environment variable not set correctly

**Solution**:
```bash
# Verify bypass is working
echo $WRANGLER_SKIP_HOOKS  # Should show "1"

# Set for single command
WRANGLER_SKIP_HOOKS=1 git commit -m "message"

# Check shell (different syntax for different shells)
# bash/zsh: export WRANGLER_SKIP_HOOKS=1
# fish: set -x WRANGLER_SKIP_HOOKS 1
```

### Getting Help

- Check test output carefully for specific errors
- Run failing test in isolation
- Check test fixtures and mocks
- Review recent changes to related code
- Consult project documentation

## Adding New Tests

### Checklist for New Tests

- [ ] Test is in appropriate category (unit/integration/e2e)
- [ ] Test file follows naming convention
- [ ] Test has descriptive name explaining what it tests
- [ ] Test covers happy path and error cases
- [ ] Test is isolated (no dependencies on other tests)
- [ ] Test cleans up after itself
- [ ] Test runs quickly (unit tests especially)

### Test Template

```{{FILE_EXTENSION}}
{{TEST_TEMPLATE}}
```

## Continuous Integration

### CI Pipeline

Tests run automatically on:
- Pull request creation
- Push to protected branches
- Scheduled nightly builds (if configured)

### CI Configuration

CI configuration is in: `{{CI_CONFIG_PATH}}`

### CI vs Local Differences

| Aspect | Local | CI |
|--------|-------|-----|
| Speed | Fast feedback | Full suite |
| Coverage | Optional | Required |
| E2E tests | Usually skipped | Always run |
| Artifacts | None | Saved |

## Related Documentation

- [Git Hooks Framework](../docs/git-hooks.md) - How hooks are configured
- [Development Workflow](./CONTRIBUTING.md) - Overall development process
- [Code Style Guide](./STYLE.md) - Coding standards

---

*Last updated: {{GENERATED_DATE}}*
*Generated by wrangler git-hooks framework*
