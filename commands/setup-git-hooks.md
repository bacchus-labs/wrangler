# /wrangler:setting-up-git-hooks

Set up Git hooks for automated testing and code quality enforcement.

## Description

This command helps you configure and install Git hooks in your project to enforce testing and code quality standards before commits and pushes. It provides an interactive setup experience with smart project detection.

## What It Does

1. **Detects your project type** (JavaScript, Python, Go, etc.)
2. **Finds existing test/lint/format commands** from project files
3. **Asks configuration questions** with sensible defaults
4. **Generates hook configuration** (`.wrangler/config/hooks-config.json`)
5. **Installs hooks** to `.git/hooks/` or `.wrangler/config/git-hooks/`
6. **Creates documentation templates** (TESTING.md, security checklist, etc.)

## Usage

Simply run the command:

```
/wrangler:setting-up-git-hooks
```

Follow the interactive prompts to configure your hooks.

## Hooks Installed

| Hook | When | What It Does |
|------|------|--------------|
| `pre-commit` | Before each commit | Runs formatter, linter, unit tests |
| `pre-push` | Before push to protected branches | Runs full test suite |
| `commit-msg` | On commit (optional) | Validates commit message format |

## Installation Patterns

### Pattern A: Direct Installation (Default)

Hooks installed directly to `.git/hooks/`. Configuration in `.wrangler/config/hooks-config.json`.

**Best for**: Individual developers, small teams

### Pattern B: Version-Controlled

Hooks stored in `.wrangler/config/git-hooks/` and symlinked via install script.

**Best for**: Teams that want hooks in version control, consistent setup across team

## Bypass Mechanism

For TDD RED phase or emergency fixes:

```bash
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test for feature X"
```

**Note**: This bypass is only available to humans. AI agents cannot set environment variables, ensuring they always follow the enforcement rules.

## Examples

### Basic Setup

```
/wrangler:setting-up-git-hooks
```

### After Setup

```bash
# Normal commit (hooks run)
git commit -m "feat: add new feature"

# TDD RED phase (bypass hooks)
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test"

# Push to main (full tests run)
git push origin main
```

## Related Commands

- `/wrangler:updating-git-hooks` - Update existing hook configuration
- `/wrangler:initializing-governance` - Full governance setup (includes hooks option)

## Implementation

This command delegates to the `setup-git-hooks` skill.

```
Invoke Skill: setup-git-hooks
```

## Troubleshooting

### Hooks Not Running

```bash
# Check if hooks are executable
ls -la .git/hooks/pre-commit

# Make executable
chmod +x .git/hooks/pre-commit
```

### Want to Remove Hooks

```bash
# Remove hooks
rm .git/hooks/pre-commit .git/hooks/pre-push .git/hooks/commit-msg

# Keep config for later
# .wrangler/config/hooks-config.json preserved
```

### Conflicts with Husky

If using Husky:
1. Run `/wrangler:setting-up-git-hooks` - it will detect Husky
2. Choose to migrate or keep Husky
3. See migration guide: `docs/git-hooks-migration.md`
