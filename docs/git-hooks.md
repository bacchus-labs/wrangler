# Git Hooks Enforcement Framework

> Last Updated: 2026-02-17 | Version: 1.2.0

This document provides comprehensive documentation for wrangler's Git hooks enforcement framework.

## Overview

The Git Hooks Enforcement Framework provides automated testing and code quality enforcement through Git hooks. It ensures that code is tested, formatted, and linted before commits and pushes.

### Key Features

- **Pre-commit hook**: Runs formatter, linter, and unit tests before each commit
- **Pre-push hook**: Runs full test suite before pushing to protected branches
- **Commit-msg hook**: Validates commit message format (optional)
- **Bypass mechanism**: Allows users to skip hooks when needed (TDD RED phase)
- **Two installation patterns**: Direct (Pattern A) or version-controlled (Pattern B)

### Why Git Hooks?

| Without Hooks | With Hooks |
|---------------|------------|
| Tests run only in CI (too late) | Tests run before commit |
| Broken code gets committed | Broken code is blocked |
| Developer forgets to run tests | Tests run automatically |
| Formatting inconsistencies | Auto-format on commit |
| AI agents can skip tests | Hooks enforce on agents |

## Quick Start

### Installation

```bash
# Run the setup command
/wrangler:setting-up-git-hooks
```

Follow the interactive prompts to configure your hooks.

### After Setup

```bash
# Normal commit (hooks run automatically)
git commit -m "feat: add new feature"

# If tests fail, commit is blocked
# Fix tests and try again

# Push to main (full tests run)
git push origin main
```

## How Hooks Work

### Pre-Commit Hook

Runs before every commit.

**What it does:**
1. Checks bypass environment variable
2. Detects if only docs changed (skips tests)
3. Runs formatter (auto-fixes and re-stages)
4. Runs linter (blocks on failure)
5. Runs unit tests (blocks on failure)

**Performance target:** < 30 seconds

### Pre-Push Hook

Runs before pushing to protected branches.

**What it does:**
1. Checks bypass environment variable
2. Reads push refs from stdin
3. Checks if pushing to protected branch
4. Runs full test suite (blocks on failure)

**Performance target:** < 10 minutes (full test suite)

### Commit-Msg Hook (Optional)

Runs on every commit to validate message format.

**What it does:**
1. Checks bypass environment variable
2. Reads commit message from file
3. Validates length (min/max)
4. Validates format (Conventional Commits)

**Default pattern:** `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?: .+`

## Configuration

Configuration is stored in `.wrangler/config/hooks-config.json`.

### Configuration Schema

```json
{
  "$schema": "https://wrangler.dev/schemas/hooks-config.json",
  "version": "1.0.0",
  "createdAt": "2024-01-21T10:00:00.000Z",
  "updatedAt": "2024-01-21T10:00:00.000Z",
  "projectType": "javascript",
  "testCommand": "npm test",
  "unitTestCommand": "npm run test:unit",
  "formatCommand": "npm run format",
  "lintCommand": "npm run lint",
  "protectedBranches": ["main", "master", "develop", "release/*", "hotfix/*"],
  "skipDocsOnlyChanges": true,
  "docsPatterns": ["*.md", "*.txt", "docs/*", "README*"],
  "enableCommitMsgValidation": false,
  "commitMsgPattern": "^(feat|fix|docs|...).*",
  "commitMsgMinLength": 10,
  "commitMsgMaxLength": 72,
  "bypassEnvVar": "WRANGLER_SKIP_HOOKS",
  "pattern": "A"
}
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `testCommand` | string | Full test suite command (required) |
| `unitTestCommand` | string | Fast unit tests for pre-commit |
| `formatCommand` | string | Code formatter command |
| `lintCommand` | string | Linter command |
| `protectedBranches` | array | Branch patterns requiring full tests |
| `skipDocsOnlyChanges` | boolean | Skip tests when only docs change |
| `docsPatterns` | array | File patterns considered as docs |
| `enableCommitMsgValidation` | boolean | Enable commit message validation |
| `commitMsgPattern` | string | Regex for valid commit messages |
| `commitMsgMinLength` | number | Minimum commit message length |
| `commitMsgMaxLength` | number | Maximum commit message length |
| `bypassEnvVar` | string | Environment variable for bypass |
| `pattern` | string | Installation pattern (A or B) |

## Installation Patterns

### Pattern A: Direct Installation (Default)

Hooks are installed directly to `.git/hooks/`. Configuration is in `.wrangler/config/hooks-config.json`.

**File structure:**
```
project/
├── .wrangler/
│   └── config/
│       └── hooks-config.json    # Configuration
├── .git/
│   └── hooks/
│       ├── pre-commit       # Installed hook
│       ├── pre-push         # Installed hook
│       └── commit-msg       # Installed hook (optional)
```

**Best for:**
- Individual developers
- Small teams
- Projects where hooks don't need version control

### Pattern B: Version-Controlled

Hooks are stored in `.wrangler/config/git-hooks/` and symlinked to `.git/hooks/`.

**File structure:**
```
project/
├── .wrangler/
│   └── config/
│       ├── hooks-config.json    # Configuration
│       └── git-hooks/           # Version-controlled hooks
│           ├── pre-commit
│           ├── pre-push
│           └── commit-msg
├── scripts/
│   └── install-hooks.sh     # Install script
├── .git/
│   └── hooks/
│       ├── pre-commit -> ../../.wrangler/config/git-hooks/pre-commit
│       ├── pre-push -> ../../.wrangler/config/git-hooks/pre-push
│       └── commit-msg -> ../../.wrangler/config/git-hooks/commit-msg
```

**Best for:**
- Teams that want hooks in version control
- Projects requiring identical hooks across team
- CI/CD pipelines using same hooks

**Setup for new team members:**
```bash
./scripts/install-hooks.sh
```

## Bypass Mechanism

### For Users (Humans)

The bypass allows skipping hooks when needed:

```bash
# Set for single command
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for feature"

# Set in shell profile for permanent bypass (not recommended)
export WRANGLER_SKIP_HOOKS=1
```

### Valid Use Cases

1. **TDD RED Phase**: Writing failing test first
2. **Emergency fixes**: Production down, need quick fix
3. **Debugging**: Investigating hook-related issues

### Invalid Use Cases

1. "Tests are slow" - Optimize tests instead
2. "I'm confident it works" - Run tests to verify
3. "Just this once" - Discipline matters

### Why AI Agents Cannot Bypass

The bypass uses environment variables. AI agents:
- Cannot persist environment variables between commands
- Cannot add variables to shell profile
- Face hook enforcement on every commit

This ensures AI agents always have their code tested, while humans retain TDD flexibility.

## TDD Workflow Integration

### RED Phase

When writing a failing test:

```bash
# Write failing test
# ...

# Commit with bypass (hooks would fail)
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for retry logic"
```

### GREEN Phase

When making test pass:

```bash
# Write implementation
# ...

# Normal commit (hooks should pass)
git commit -m "feat: implement retry logic"
```

### REFACTOR Phase

When improving code:

```bash
# Refactor code
# ...

# Normal commit (hooks should pass)
git commit -m "refactor: extract retry helper"
```

## Docs-Only Detection

When only documentation files change, tests are skipped.

**Default patterns:**
- `*.md`
- `*.txt`
- `*.rst`
- `docs/*`
- `README*`
- `LICENSE*`
- `CHANGELOG*`

**Customize in config:**
```json
{
  "docsPatterns": ["*.md", "docs/*", "*.txt", "README*"]
}
```

## Troubleshooting

### Hooks Not Running

```bash
# Check if hooks exist
ls -la .git/hooks/

# Check if hooks are executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

### Hooks Running But Not Blocking

```bash
# Check exit codes in hook
# Hooks should use "exit 1" on failure

# Test hook directly
./.git/hooks/pre-commit
echo $?  # Should be 1 on failure
```

### Pre-Commit Too Slow

1. Ensure only unit tests run (not full suite)
2. Consider test parallelization
3. Review what's being formatted/linted
4. Target: < 30 seconds

### Cannot Bypass

```bash
# Verify environment variable syntax
echo $WRANGLER_SKIP_HOOKS  # Should be "1"

# Different shells have different syntax
# bash/zsh: export WRANGLER_SKIP_HOOKS=1
# fish: set -x WRANGLER_SKIP_HOOKS 1

# Set for single command
WRANGLER_SKIP_HOOKS=1 git commit -m "message"
```

### Symlinks Not Working (Windows)

On Windows, symlinks may require:
1. Developer Mode enabled, or
2. Running as Administrator, or
3. Using Pattern A instead of Pattern B

### Protected Branch Not Detected

```bash
# Check current protected patterns
cat .wrangler/config/hooks-config.json | grep protectedBranches

# Branch patterns use glob matching
# "release/*" matches "release/1.0.0"
# But not "releases/1.0.0"
```

## Best Practices

### Performance

1. **Pre-commit should be fast** (< 30 seconds)
   - Run only unit tests
   - Format/lint only changed files if possible
   - Consider test parallelization

2. **Pre-push can be slower** (< 10 minutes)
   - Full test suite is acceptable
   - Protected branches need thorough testing

### Configuration

1. **Start with defaults**
   - Built-in patterns cover most cases
   - Customize as needed

2. **Protected branches should include:**
   - `main` / `master`
   - `develop` (if using Git Flow)
   - `release/*`
   - `hotfix/*`

3. **Test commands should:**
   - Exit with non-zero on failure
   - Print clear error messages
   - Be deterministic (no flaky tests)

### Team Workflow

1. **For new team members:**
   - Document hook setup in README
   - Use Pattern B for consistency
   - Include `install-hooks.sh` in onboarding

2. **For CI/CD:**
   - Use same test commands as hooks
   - Hooks catch issues before CI
   - CI is safety net for bypasses

## Commands Reference

| Command | Purpose |
|---------|---------|
| `/wrangler:setting-up-git-hooks` | Initial hook installation |
| `/wrangler:updating-git-hooks` | Update existing configuration |
| `/wrangler:initializing-governance` | Full governance setup (includes hooks option) |

## Related Skills

| Skill | Relationship |
|-------|--------------|
| `setting-up-git-hooks` | Main setup skill |
| `updating-git-hooks` | Configuration updates |
| `practicing-tdd` | TDD workflow with hooks |
| `running-tests` | Manual test execution |
| `verifying-before-completion` | Verification requirements |
| `initializing-governance` | Governance integration |

## File Reference

| File | Purpose |
|------|---------|
| `.wrangler/config/hooks-config.json` | Hook configuration |
| `.wrangler/TESTING.md` | Test documentation (created by initialize-governance) |
| `.git/hooks/pre-commit` | Pre-commit hook |
| `.git/hooks/pre-push` | Pre-push hook |
| `.git/hooks/commit-msg` | Commit message hook |
| `.wrangler/config/git-hooks/` | Version-controlled hooks (Pattern B) |
| `scripts/install-hooks.sh` | Install script (Pattern B) |

## FAQ

### Q: Do I need hooks if I have CI?

Yes. Hooks catch issues before commit, CI catches issues after push. Hooks save time by failing fast locally.

### Q: Can I have different hooks per branch?

No. Hooks are global to the repository. But pre-push only runs full tests on protected branches.

### Q: What if I need to push urgently?

Use the bypass mechanism. But fix issues and run tests as soon as possible.

### Q: How do hooks affect rebasing/merging?

Hooks run on each commit created. During rebase, hooks may run multiple times. Use bypass if needed for large rebases.

### Q: Can I add custom checks?

Yes. Edit the hook files directly or extend templates in `.wrangler/config/git-hooks/` (Pattern B).

---

*Git Hooks Enforcement Framework v1.0*
*Part of Wrangler Project Governance*
