# /wrangler:updating-git-hooks

Update existing Git hooks configuration without full re-setup.

## Description

This command helps you modify your existing Git hooks configuration. It reads current settings, allows you to change specific values, and regenerates the hook files.

## Prerequisites

Git hooks must already be set up. If you haven't set up hooks yet, use `/wrangler:setting-up-git-hooks` instead.

## What It Does

1. **Reads current configuration** from `.wrangler/config/hooks-config.json`
2. **Shows current settings** in a clear table
3. **Asks what to update** (test commands, branches, etc.)
4. **Gathers new values** for selected settings
5. **Creates backup** of current config
6. **Updates configuration** and regenerates hooks
7. **Verifies changes** worked correctly

## Usage

Simply run the command:

```
/wrangler:updating-git-hooks
```

Follow the prompts to select what to update and provide new values.

## What You Can Update

| Setting | Description |
|---------|-------------|
| Test commands | Full test suite, unit tests |
| Format/lint commands | Code formatting and linting |
| Protected branches | Branches requiring full tests before push |
| Commit message validation | Enable/disable, change pattern |
| Docs-only patterns | Files that skip tests when only docs change |

## Examples

### Change Test Command

```
/wrangler:updating-git-hooks

Current: npm test
New: npm run test:ci
```

### Add Protected Branch

```
/wrangler:updating-git-hooks

Current: main, master
New: main, master, develop, release/*
```

### Enable Commit Message Validation

```
/wrangler:updating-git-hooks

Enable commit message validation? Yes
```

## Rollback

If something goes wrong, restore from backup:

```bash
cp .wrangler/config/hooks-config.json.backup .wrangler/config/hooks-config.json
```

Then run `/wrangler:updating-git-hooks` to regenerate hooks.

## Limitations

- Cannot switch between Pattern A and Pattern B (requires full re-setup)
- Requires hooks to already be installed

## Related Commands

- `/wrangler:setting-up-git-hooks` - Initial hook setup
- `/wrangler:initializing-governance` - Full governance setup (includes hooks option)

## Implementation

This command delegates to the `update-git-hooks` skill.

```
Invoke Skill: update-git-hooks
```
