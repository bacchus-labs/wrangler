# Setting Up Git Hooks - Detailed Guide

echo ""
echo "=== Configuration ==="
[ -f .wrangler/config/hooks-config.json ] && echo "[OK] hooks-config.json created" || echo "[ERROR] hooks-config.json missing"

# Show config summary
cat .wrangler/config/hooks-config.json
```

**Step 12: Provide Summary**

Display completion message to user:

```markdown
## Git Hooks Setup Complete

### Hooks Installed

| Hook | Status | Purpose |
|------|--------|---------|
| pre-commit | [Installed] | Format, lint, unit tests |
| pre-push | [Installed] | Full test suite on protected branches |
| commit-msg | [Installed/Skipped] | Commit message validation |

### Configuration

- **Test Command**: `[command]`
- **Unit Tests**: `[command or "Same as full tests"]`
- **Formatter**: `[command or "Not configured"]`
- **Linter**: `[command or "Not configured"]`
- **Protected Branches**: `[patterns]`
- **Pattern**: [A/B]

### Files Created

- `.wrangler/config/hooks-config.json` - Hook configuration
- `.git/hooks/pre-commit` - Pre-commit hook
- `.git/hooks/pre-push` - Pre-push hook
[- `.git/hooks/commit-msg` - Commit message hook]
[- `.github/pull_request_template.md`]

### Important Notes

**Bypass Mechanism**:
```bash
# For TDD RED phase (writing failing test first)
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for feature X"
```

**Note**: AI agents cannot use this bypass - only humans can set environment variables.

**Update Hooks**:
Run `/wrangler:updating-git-hooks` to modify configuration.

### Next Steps

1. Try making a commit to verify hooks work
2. Review TESTING.md for test documentation
3. Share with team (if Pattern B, they run `scripts/install-hooks.sh`)
```

## Edge Cases

### Existing Hooks

If hooks already exist, offer options:
1. **Backup and replace** - Move existing to `.git/hooks.backup/`
2. **Merge** - Try to append wrangler hooks to existing (advanced)
3. **Skip** - Don't touch existing hooks

### No Test Command

If user doesn't have tests:
1. Warn that hooks won't be effective without tests
2. Offer to skip test-related hooks
3. Suggest setting up tests first

### Monorepo

For monorepos, ask:
1. Root-level hooks for all packages?
2. Package-specific test commands?

### Windows Compatibility

Hooks use bash shebang. For Windows:
1. Ensure Git Bash or WSL is available
2. Use `#!/usr/bin/env bash` shebang
3. Test path separators

## Troubleshooting

### Hooks Not Running

```bash
# Check hook is executable
ls -la .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit
```

### Tests Failing in Hook

```bash
# Run test command directly to debug
[test command]

# Bypass temporarily
WRANGLER_SKIP_HOOKS=1 git commit -m "debug: investigating test failure"
```

### Slow Pre-Commit

If pre-commit takes too long:
1. Ensure only unit tests run (not full suite)
2. Consider test parallelization
3. Review what's being formatted/linted

## Related Skills

- **practicing-tdd** - TDD workflow with hook considerations
- **running-tests** - Manual test execution
- **verifying-before-completion** - Verification workflow
- **updating-git-hooks** - Modify existing hook configuration
- **initializing-governance** - Sets up hooks as part of governance

## TDD Workflow Integration

When following TDD (Test-Driven Development):

1. **RED Phase**: Write failing test
   - Use `WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test"` to commit
   - This is expected and acceptable

2. **GREEN Phase**: Make test pass
   - Normal commit should now pass hooks
   - `git commit -m "feat: implementing-issue feature to pass test"`

3. **REFACTOR Phase**: Improve code
   - All commits should pass hooks
   - `git commit -m "refactor: improve code quality"`

The bypass is designed for TDD RED phase and emergency fixes only.
