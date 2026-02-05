# Migration Guide: Moving to Wrangler Git Hooks

This guide helps you migrate from existing hook management systems to wrangler's Git Hooks Enforcement Framework.

## Overview

Wrangler's git hooks provide:
- Pre-commit, pre-push, commit-msg hooks
- Test enforcement with bypass for TDD
- Two installation patterns (direct or version-controlled)
- Integration with wrangler governance

## Migration Paths

### From Husky

[Husky](https://typicode.github.io/husky/) is a popular JavaScript hook manager.

**Step 1: Document Current Configuration**

```bash
# Review current Husky configuration
cat .husky/pre-commit
cat .husky/pre-push
cat .husky/commit-msg

# Note the commands being run
```

**Step 2: Backup and Remove Husky**

```bash
# Backup Husky directory
cp -r .husky .husky.backup

# Uninstall Husky
npm uninstall husky

# Remove Husky directory
rm -rf .husky

# Remove prepare script from package.json
# Edit package.json to remove: "prepare": "husky install"
```

**Step 3: Map Configuration**

| Husky | Wrangler Config |
|-------|-----------------|
| `.husky/pre-commit` commands | `unitTestCommand`, `formatCommand`, `lintCommand` |
| `.husky/pre-push` commands | `testCommand` |
| `.husky/commit-msg` commands | `enableCommitMsgValidation`, `commitMsgPattern` |

**Step 4: Install Wrangler Hooks**

```bash
# Run setup
/wrangler:setting-up-git-hooks

# When prompted, enter the commands from your Husky config
```

**Step 5: Verify**

```bash
# Test pre-commit
git commit --allow-empty -m "test: verify husky migration"

# Compare behavior with Husky
```

**Step 6: Clean Up**

```bash
# Remove backup once verified
rm -rf .husky.backup

# Update team documentation
```

---

### From pre-commit Framework

[pre-commit](https://pre-commit.com/) is a Python-based multi-language hook framework.

**Step 1: Document Current Configuration**

```bash
# Review pre-commit config
cat .pre-commit-config.yaml
```

Example `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
  - repo: https://github.com/psf/black
    hooks:
      - id: black
  - repo: local
    hooks:
      - id: pytest
        entry: pytest tests/
        language: system
```

**Step 2: Backup and Remove pre-commit**

```bash
# Backup config
cp .pre-commit-config.yaml .pre-commit-config.yaml.backup

# Uninstall hooks
pre-commit uninstall

# Optionally uninstall pre-commit
pip uninstall pre-commit
```

**Step 3: Map Configuration**

| pre-commit Hook | Wrangler Config |
|-----------------|-----------------|
| black, autopep8, etc. | `formatCommand: "black ."` |
| flake8, pylint, etc. | `lintCommand: "flake8"` |
| pytest, unittest | `testCommand: "pytest"` |
| commitizen, conventional | `enableCommitMsgValidation: true` |

**Note:** Wrangler runs single commands, not individual hooks. Combine formatters/linters if needed:

```json
{
  "formatCommand": "black . && isort .",
  "lintCommand": "flake8 && mypy ."
}
```

**Step 4: Install Wrangler Hooks**

```bash
/wrangler:setting-up-git-hooks

# Enter combined commands when prompted
```

**Step 5: Verify**

```bash
# Test pre-commit
git commit --allow-empty -m "test: verify pre-commit migration"

# Check that all formatters/linters run
```

**Step 6: Clean Up**

```bash
# Remove backup once verified
rm .pre-commit-config.yaml.backup
rm .pre-commit-config.yaml  # if no longer needed

# Update CI/CD if it ran pre-commit
```

---

### From Custom Bash Scripts

If you have custom hook scripts in `.git/hooks/`:

**Step 1: Document Current Hooks**

```bash
# List existing hooks
ls -la .git/hooks/

# Review each hook
cat .git/hooks/pre-commit
cat .git/hooks/pre-push
```

**Step 2: Extract Commands**

Identify the test, format, and lint commands from your scripts:

```bash
# Example custom pre-commit
#!/bin/bash
npm run lint
npm run test:unit
```

**Step 3: Backup Hooks**

```bash
# Backup existing hooks
mkdir -p .git/hooks.backup
cp .git/hooks/pre-commit .git/hooks.backup/ 2>/dev/null
cp .git/hooks/pre-push .git/hooks.backup/ 2>/dev/null
cp .git/hooks/commit-msg .git/hooks.backup/ 2>/dev/null
```

**Step 4: Install Wrangler Hooks**

```bash
/wrangler:setting-up-git-hooks

# Enter commands from your custom scripts
```

**Step 5: Merge Custom Logic**

If your custom hooks have special logic not covered by wrangler:

**Option A: Extend wrangler hooks**

Edit the installed hooks to add custom logic:

```bash
# Edit the hook
vi .git/hooks/pre-commit

# Add custom logic after wrangler's standard checks
```

**Option B: Use Pattern B**

Install with Pattern B, then customize `.wrangler/config/git-hooks/`:

```bash
# Select Pattern B during setup

# Edit version-controlled hooks
vi .wrangler/config/git-hooks/pre-commit
```

**Step 6: Verify**

```bash
# Test hooks
git commit --allow-empty -m "test: verify custom migration"
```

---

### From No Hooks

If you don't currently have hooks:

**Step 1: Run Setup**

```bash
/wrangler:setting-up-git-hooks
```

**Step 2: Choose Defaults**

Wrangler detects your project type and suggests appropriate commands:

| Project Type | Default Test | Default Format | Default Lint |
|--------------|--------------|----------------|--------------|
| JavaScript | `npm test` | `npm run format` | `npm run lint` |
| Python | `pytest` | `black .` | `flake8` |
| Go | `go test ./...` | `go fmt ./...` | `golangci-lint run` |

**Step 3: Verify**

```bash
# Make a change and commit
git commit --allow-empty -m "test: hooks installed"
```

---

## Configuration Comparison

### Husky vs Wrangler

**Husky `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm test
```

**Wrangler `.wrangler/config/hooks-config.json`:**
```json
{
  "lintCommand": "npm run lint",
  "testCommand": "npm test"
}
```

### pre-commit vs Wrangler

**pre-commit `.pre-commit-config.yaml`:**
```yaml
repos:
  - repo: local
    hooks:
      - id: black
        entry: black
        language: system
        types: [python]
      - id: flake8
        entry: flake8
        language: system
        types: [python]
```

**Wrangler `.wrangler/config/hooks-config.json`:**
```json
{
  "formatCommand": "black .",
  "lintCommand": "flake8"
}
```

---

## Feature Comparison

| Feature | Husky | pre-commit | Wrangler |
|---------|-------|------------|----------|
| JS/TS support | Native | Via hooks | Native |
| Python support | Via shell | Native | Native |
| Go support | Via shell | Via hooks | Native |
| TDD bypass | Manual | Manual | Built-in |
| AI agent enforcement | No | No | Yes |
| Governance integration | No | No | Yes |
| Version-controlled hooks | Yes | No (config only) | Pattern B |
| Configuration format | Shell scripts | YAML | JSON |

---

## Common Issues

### Missing Commands After Migration

**Problem:** Commands that worked in old system don't work.

**Solution:**
1. Check if command is in `PATH`
2. Use full paths if needed
3. Check for missing dependencies

### Different Failure Behavior

**Problem:** Hooks fail differently than before.

**Solution:**
1. Compare exit codes
2. Check error message formatting
3. Review wrangler hook templates

### Team Synchronization

**Problem:** Team members have different hooks.

**Solution:**
1. Use Pattern B (version-controlled hooks)
2. Document setup in README
3. Add to onboarding checklist

---

## Rollback

If migration fails, restore from backup:

### Husky

```bash
# Restore Husky
cp -r .husky.backup .husky
npm install husky
npx husky install
```

### pre-commit

```bash
# Restore pre-commit
cp .pre-commit-config.yaml.backup .pre-commit-config.yaml
pre-commit install
```

### Custom Scripts

```bash
# Restore custom hooks
cp .git/hooks.backup/* .git/hooks/
```

---

## Getting Help

- See [docs/git-hooks.md](git-hooks.md) for comprehensive documentation
- Run `/wrangler:setting-up-git-hooks` for interactive setup
- Check `.wrangler/config/hooks-config.json` for current configuration

---

*Migration Guide v1.0 - Part of Wrangler Git Hooks Enforcement Framework*
