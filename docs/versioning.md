# Wrangler Versioning System

> Last Updated: 2026-02-17 | Version: 1.2.0

This document explains wrangler's versioning system, automatic version detection, and self-update workflow.

---

## Table of Contents

- [Overview](#overview)
- [Version Tracking](#version-tracking)
- [Release Notes](#release-notes)
- [Startup Version Check](#startup-version-check)
- [Update Workflow](#update-workflow)
- [Breaking Changes](#breaking-changes)
- [Migration Process](#migration-process)

---

## Overview

Wrangler implements a **self-versioning system** that allows projects to:
1. Track which wrangler version they're using
2. Detect when they're out of date
3. Automatically generate migration instructions
4. Apply updates via LLM-friendly workflows

### Version Scheme

Wrangler follows **Semantic Versioning** (semver):

```
MAJOR.MINOR.PATCH
  1  .  1  .  0

MAJOR: Breaking changes (require migration)
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)
```

**Examples**:
- `1.0.0` → `1.0.1`: Bug fix (no migration needed)
- `1.0.0` → `1.1.0`: New feature (optional upgrade)
- `1.0.0` → `2.0.0`: Breaking change (migration required)

### Current Version

**Latest**: 1.2.0 (Centralized `.wrangler/` directory)

**Your Project's Version**: Stored in `.wrangler/CONSTITUTION.md` frontmatter

---

## Version Tracking

### Where Versions Are Stored

| Location | Purpose | Format |
|----------|---------|--------|
| `skills/.wrangler-releases/CURRENT_VERSION` | Latest wrangler version | Plain text: `1.2.0` |
| `.wrangler/CONSTITUTION.md` | Project's wrangler version | YAML frontmatter |
| `skills/.wrangler-releases/{version}.md` | Release notes per version | Markdown with frontmatter |

### Constitution Frontmatter

Every project's constitution includes version metadata:

```yaml
---
wranglerVersion: "1.2.0"
lastUpdated: "2025-12-07"
---

# Project Constitution
...
```

**Fields**:
- `wranglerVersion`: Wrangler feature set and directory structure the project uses
- `lastUpdated`: Date of last wrangler-related update (governance changes, version upgrades, etc.)

**Note**: The constitution file is at `.wrangler/CONSTITUTION.md` (not in a `governance/` subdirectory).

### CURRENT_VERSION File

**Location**: `skills/.wrangler-releases/CURRENT_VERSION`

**Contents**: Single line with latest version number
```
1.2.0
```

**Updated**: On each wrangler release

**Purpose**: Single source of truth for "what's the latest version?"

---

## Release Notes

### Directory Structure

```
skills/.wrangler-releases/
├── CURRENT_VERSION           # "1.1.0"
├── 1.0.0.md                  # Initial release (retrospective)
├── 1.1.0.md                  # Centralized .wrangler/ directory
├── 1.2.0.md                  # Future release
└── ...
```

### Release Note Format

```markdown
---
version: "1.2.0"
releaseDate: "2025-12-07"
breakingChanges: true
migrationRequired: true
---

# Wrangler v1.2.0 - Centralized .wrangler/ Directory

## Breaking Changes

- Governance files moved from project root to `.wrangler/` directory
- Constitution moved from `specifications/_CONSTITUTION.md` to `.wrangler/CONSTITUTION.md`
- Issues moved from `issues/` to `.wrangler/issues/`

## Migration Requirements

See `/update-yourself` command for automated migration instructions.

## New Features

- Automatic version detection via startup skill
- Configurable cache settings in `.wrangler/cache/settings.json`
- Runtime state tracking in `.wrangler/config/runtime.json`

## Affected Skills

- All governance skills updated to reference `.wrangler/` paths
- New skill: `wrangler:startup-checklist`
- New command: `/update-yourself`
```

### Frontmatter Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `version` | string | Semantic version | `"1.1.0"` |
| `releaseDate` | string | ISO 8601 date | `"2025-11-18"` |
| `breakingChanges` | boolean | Has breaking changes? | `true` |
| `migrationRequired` | boolean | Requires manual migration? | `true` |

### Content Sections

**Required**:
1. **Breaking Changes** - What changed that breaks existing projects
2. **Migration Requirements** - High-level migration steps (detailed in `/update-yourself`)
3. **New Features** - What's new in this release
4. **Affected Skills** - Which skills were added/modified/removed

**Optional**:
- **Bug Fixes** - Bugs resolved
- **Deprecations** - Features marked for removal
- **Performance** - Performance improvements
- **Documentation** - Doc updates

---

## Startup Version Check

### Automatic Detection

On every session start, wrangler automatically:
1. Reads project version from constitution
2. Reads latest version from `CURRENT_VERSION`
3. Compares versions
4. Reports status: SUCCESS / WARN / OUTDATED

### Startup Skill Workflow

**Skill**: `skills/startup-checklist/SKILL.md` (if exists, otherwise handled by session hooks)

**Execution**:
```
SessionStart Hook Triggered
    ↓
startup-checklist skill invoked
    ↓
1. Read `.wrangler/CONSTITUTION.md` → `wranglerVersion: "1.1.0"`
2. Read `skills/.wrangler-releases/CURRENT_VERSION` → `1.2.0`
3. Compare: 1.1.0 < 1.2.0 → OUTDATED
4. Check releases between: 1.2.0.md
5. Parse frontmatter: `breakingChanges: true`
6. Report OUTDATED status with breaking changes detected
```

### Status Signals

#### ✅ SUCCESS
**Condition**: Project version matches current version

**Message**:
```
✅ Wrangler Version Check: SUCCESS

Project is using wrangler v1.2.0 (latest).
All features up to date.
```

**Action**: None needed

---

#### ⚠️ WARN
**Condition**: Project version behind, but no breaking changes

**Message**:
```
⚠️ Wrangler Version Check: WARN

Project version: 1.2.0
Current version: 1.3.0
Behind by: 1 release

New features available in v1.3.0:
- Self-healing MCP plugin
- Enhanced error diagnostics

No breaking changes. Update recommended but not required.

To update: Run `/update-yourself`
```

**Action**: Optional update

---

#### ❌ OUTDATED
**Condition**: Project version behind with breaking changes

**Message**:
```
❌ Wrangler Version Check: OUTDATED

Project version: 1.0.0
Current version: 1.2.0
Behind by: 2 releases

Breaking changes detected in:
- v1.2.0: Directory structure refactored (issues/ → .wrangler/issues/)

Migration required before using new features.

To migrate: Run `/update-yourself`
```

**Action**: Migration required

---

### Skipping Version Check

**Environment Variable**: `WRANGLER_SKIP_VERSION_CHECK=true`

**Use Case**: Disable version checking (e.g., for testing, offline work)

**Example**:
```bash
export WRANGLER_SKIP_VERSION_CHECK=true
claude-code
```

**Effect**: Startup skill exits immediately with SUCCESS signal without checking versions

---

## Update Workflow

### Manual Update: `/update-yourself` Command

**Purpose**: Generate LLM-friendly migration instructions for version gap

**Location**: `commands/update-yourself.md`

**Usage**:
```
User: /update-yourself
```

**Workflow**:
1. Detect version gap (same as startup skill)
2. Load release notes for all versions in gap
3. Filter to breaking changes only
4. Generate step-by-step migration instructions
5. Include verification steps

### Example Output

```markdown
# Update Wrangler from v1.0.0 → v1.2.0

Your project is currently at v1.0.0. Latest is v1.2.0 (2 releases behind).

Breaking changes detected in:
- v1.2.0 (Directory structure refactor)

## Migration Plan

### Step 1: Migrate to v1.2.0 (Directory Structure)

**Task**: Move governance files to .wrangler/ directory

**Instructions**:
1. Create .wrangler/ directory structure:
   ```bash
   mkdir -p .wrangler/{issues,specifications,memos,governance,cache,config,docs}
   ```

2. Move existing files:
   ```bash
   mv issues/* .wrangler/issues/
   mv specifications/* .wrangler/specifications/
   ```

3. Move constitution:
   ```bash
   mv specifications/_CONSTITUTION.md .wrangler/CONSTITUTION.md
   mv specifications/_ROADMAP.md .wrangler/ROADMAP.md
   ```

4. Update constitution frontmatter to include:
   ```yaml
   wranglerVersion: "1.2.0"
   lastUpdated: "2025-12-07"
   ```

5. Verify migration:
   - Run `ls .wrangler/` and confirm all directories exist
   - Run `/wrangler:verifying-governance` to validate structure

### Verification

After migration complete:
1. Confirm constitution shows `wranglerVersion: "1.2.0"`
2. Run `/wrangler:verifying-governance` - should pass all checks
3. Run startup skill again - should report SUCCESS
```

### LLM-Friendly Instructions

**Design Principles**:
1. **Not a script** - Instructions for AI to execute, not bash automation
2. **Step-by-step** - Numbered, sequential, clear
3. **Verification** - Each step includes validation
4. **Rollback** - Instructions to undo if something fails
5. **Context** - Explains why each step is needed

**Example Comparison**:

**Bad** (bash script):
```bash
#!/bin/bash
mv specifications/_CONSTITUTION.md .wrangler/governance/CONSTITUTION.md
```

**Good** (LLM instructions):
```markdown
3. Move constitution:
   **What**: Relocate constitution from old location to new centralized directory
   **Why**: v1.2.0 standardizes on `.wrangler/` for all governance files
   **Command**:
   ```bash
   mv specifications/_CONSTITUTION.md .wrangler/CONSTITUTION.md
   ```
   **Verify**: Run `cat .wrangler/CONSTITUTION.md | head -5` to confirm file exists
   **Rollback**: `mv .wrangler/CONSTITUTION.md specifications/_CONSTITUTION.md`
```

---

## Breaking Changes

### What Qualifies as Breaking?

A change is **breaking** if it:
1. Changes file locations that users/code depend on
2. Removes or renames skills
3. Changes MCP tool APIs
4. Requires manual updates to project files
5. Makes old projects incompatible with new wrangler

**Examples of breaking changes**:
- Moving `issues/` → `.wrangler/issues/` (file location change)
- Renaming `check-alignment` skill → `constitutional-compliance` (skill rename)
- Removing `issues_create` tool (API removal)

**Examples of non-breaking changes**:
- Adding new skill (doesn't affect existing)
- Bug fix in existing skill (same interface)
- Documentation updates (no code impact)
- Performance improvements (no behavior change)

### Deprecation Policy

**Before breaking change**:
1. Announce deprecation in minor release (e.g., v1.5.0)
2. Add warning messages when deprecated feature used
3. Provide migration path in documentation
4. Wait 2 minor releases (e.g., v1.5.0 → v1.7.0)
5. Remove in next major release (e.g., v2.0.0)

**Example Timeline**:
- v1.5.0: Deprecate old path, add warning
- v1.6.0: Maintain both paths, stronger warnings
- v1.7.0: Final warning, recommend immediate migration
- v2.0.0: Remove old path (breaking change)

---

## Migration Process

### Migration Types

#### 1. Automatic Migration
**Trigger**: Session start hook detects legacy structure

**Example**: Creating `.wrangler/` directories on first session

**Process**:
- Hook runs automatically
- Detects missing directories
- Creates required structure
- No user intervention needed

#### 2. Semi-Automatic Migration
**Trigger**: User runs `/update-yourself` command

**Example**: Moving files to `.wrangler/` directory

**Process**:
- User initiates migration
- LLM executes instructions
- User verifies results
- LLM confirms success

#### 3. Manual Migration
**Trigger**: Complex changes requiring human decisions

**Example**: Updating constitution principles

**Process**:
- User reads migration guide
- Makes decisions about changes
- Manually edits files
- Runs verification

### Migration Safety

**Backup Strategy**:
```bash
# Before any migration
git add -A
git commit -m "Backup before wrangler v1.1.0 migration"
```

**Rollback Strategy**:
```bash
# If migration fails
git reset --hard HEAD^
```

**Validation Strategy**:
- Run verification commands after each step
- Check file existence and contents
- Confirm no data loss
- Test core functionality

### Migration Verification

**Checklist**:
- [ ] All files moved to new locations
- [ ] No files left in old locations
- [ ] Constitution frontmatter updated with new version
- [ ] Governance verification passes (`/wrangler:verifying-governance`)
- [ ] MCP tools still work
- [ ] Skills still load correctly
- [ ] Startup check reports SUCCESS

**Commands to Run**:
```bash
# Verify directory structure
ls -R .wrangler/

# Verify constitution version
grep "wranglerVersion" .wrangler/governance/CONSTITUTION.md

# Verify governance
# (Run via Claude Code, not bash)
/wrangler:verifying-governance
```

---

## Troubleshooting

### Version Mismatch Not Detected

**Symptom**: Startup skill reports SUCCESS but you know you're outdated

**Causes**:
1. Constitution missing `wranglerVersion` field
2. `CURRENT_VERSION` file not updated
3. Version check skipped (environment variable set)

**Solutions**:
```bash
# Check constitution frontmatter
head -20 .wrangler/CONSTITUTION.md

# Check latest version
cat ~/.claude/plugins/wrangler/skills/.wrangler-releases/CURRENT_VERSION

# Verify environment
echo $WRANGLER_SKIP_VERSION_CHECK
```

### Migration Instructions Not Generated

**Symptom**: `/update-yourself` command doesn't work

**Causes**:
1. Command file missing or corrupted
2. Release notes missing for version gap
3. Permission issues reading files

**Solutions**:
```bash
# Verify command exists
ls ~/.claude/plugins/wrangler/commands/update-yourself.md

# Verify release notes exist
ls ~/.claude/plugins/wrangler/skills/.wrangler-releases/

# Check permissions
ls -la ~/.claude/plugins/wrangler/skills/.wrangler-releases/
```

### Constitution Version Not Updating

**Symptom**: After migration, constitution still shows old version

**Cause**: Frontmatter not updated in migration step

**Solution**:
```bash
# Manually update frontmatter
# Edit .wrangler/CONSTITUTION.md
# Change wranglerVersion to current version
```

---

## Advanced Topics

### Creating a New Release

**For Maintainers**:

1. **Determine Version Number**:
   - Breaking changes? → Bump MAJOR (1.x.x → 2.0.0)
   - New features? → Bump MINOR (1.1.x → 1.2.0)
   - Bug fixes only? → Bump PATCH (1.1.0 → 1.1.1)

2. **Create Release Note**:
   ```bash
   # Create new release note file
   touch skills/.wrangler-releases/1.2.0.md

   # Use template format (see above)
   # Document breaking changes, migration steps, new features
   ```

3. **Update CURRENT_VERSION**:
   ```bash
   echo "1.2.0" > skills/.wrangler-releases/CURRENT_VERSION
   ```

4. **Update Plugin Metadata**:
   ```bash
   # Update .claude-plugin/plugin.json version field
   # Update CLAUDE.md version history
   ```

5. **Test Migration**:
   - Create test project at old version
   - Run `/update-yourself`
   - Verify migration instructions are complete and correct
   - Verify startup skill detects version correctly

6. **Publish**:
   - Commit all changes
   - Tag release: `git tag v1.2.0`
   - Push: `git push --tags`
   - Publish to Claude Code marketplace

### Custom Version Checks

**Disable for specific project**:
```yaml
# In .wrangler/CONSTITUTION.md
---
wranglerVersion: "1.2.0"
skipVersionCheck: true  # Custom field
---
```

**Modify startup skill** to respect `skipVersionCheck` field.

---

## Related Documentation

- [Session Hooks](session-hooks.md) - How startup skill is invoked
- [Governance Framework](governance.md) - How constitution stores version
- [Specification #000001](../.wrangler/specifications/000001-centralized-wrangler-directory.md) - v1.2.0 migration details

---

## Changelog

### v1.2.0 (2025-12-07)
- Updated all paths to reflect `.wrangler/` directory structure
- Constitution now at `.wrangler/CONSTITUTION.md` (not in governance/ subdirectory)
- Session tools documentation added

### v1.1.0 (2025-11-18)
- Initial versioning system implementation
- Added `wranglerVersion` field to constitution
- Created release notes directory structure
- Implemented startup version check skill
- Created `/update-yourself` command

---

**Last Updated**: 2025-12-07
**Maintainer**: Wrangler Team
**Status**: Current
