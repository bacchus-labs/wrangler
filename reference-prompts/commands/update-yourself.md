You are helping the user update their wrangler project to the latest version.

## Your Task

Generate clear, step-by-step migration instructions for upgrading a wrangler project from its current version to the latest version. The instructions should be optimized for AI execution (not bash scripts).

## Steps to Execute

### 1. Detect Version Gap

**Read project version**:
- Check `.wrangler/governance/CONSTITUTION.md` frontmatter for `wranglerVersion` field
- If not found, check legacy location: `specifications/_CONSTITUTION.md`
- If `wranglerVersion` field missing, assume v1.0.0 (pre-versioning era)

**Read current version**:
- Read `skills/.wrangler-releases/CURRENT_VERSION` from wrangler plugin directory
- This is the latest available wrangler version

**Compare versions**:
- If versions match: "✅ Already up to date (v{version})"
- If project > current: "⚠️ Project version ({project}) is ahead of plugin ({current}). Plugin may need updating."
- If project < current: Continue with migration plan

### 2. Determine Migration Scope

**List version gap**:
- Identify all versions between project version and current version
- Example: If project=1.0.0, current=1.3.0 → Gap versions: [1.1.0, 1.2.0, 1.3.0]

**Load release notes**:
- For each version in gap, read `skills/.wrangler-releases/{version}.md`
- Extract from frontmatter:
  - `version`: Version number
  - `releaseDate`: Release date
  - `breakingChanges`: true/false
  - `migrationRequired`: true/false

**Filter to breaking changes**:
- Only include versions where `breakingChanges: true`
- If no breaking changes exist, this is a non-breaking update

### 3. Generate Migration Instructions

Create a comprehensive migration plan with:
- Overview of what's changing
- Step-by-step instructions for AI to execute
- Verification steps after each major change
- Rollback instructions if migration fails

**Important**: Instructions should be written for an AI assistant to execute, NOT bash scripts for humans to run.

## Output Format

Generate output in this format:

---

# Update Wrangler from v{project} → v{current}

Your project is currently at **v{project}**. Latest wrangler version is **v{current}**.

**Status**: {X} releases behind

---

{if breaking changes detected}

## Breaking Changes Detected

The following versions contain breaking changes:

{for each breaking version}
- **v{version}** ({releaseDate}): {title from release note}
{end for}

**MIGRATION REQUIRED** - These changes will affect your project structure and governance files.

---

## Migration Plan

{for each breaking change version in order}

### Step {N}: Migrate to v{version}

#### Release: v{version} - {title}

**Released**: {releaseDate}

#### What's Breaking

{Extract "Breaking Changes" section from release note - list major items}

#### Migration Instructions

{Extract "Migration Requirements" or "Manual Migration Steps" section from release note}

Follow these steps in order:

1. {Step 1}
2. {Step 2}
3. {Step 3}
...

#### Verification

After completing this migration step, verify:

1. {Verification step 1}
2. {Verification step 2}
...

{Suggest specific commands or checks, e.g., "Run /wrangler:verify-governance"}

#### Rollback (If Needed)

If this migration step fails:

```bash
# Restore from git
git reset --hard HEAD~1

# Set skip flags
export WRANGLER_SKIP_VERSION_CHECK=true
```

Then report the issue with error details.

---

{end for each version}

---

## Final Verification

After all migration steps complete:

1. **Verify constitution version**:
   - Check `.wrangler/governance/CONSTITUTION.md` frontmatter
   - Should show: `wranglerVersion: "{current}"`

2. **Run governance verification**:
   - Execute: `/wrangler:verify-governance`
   - All checks should pass

3. **Run startup skill**:
   - Restart Claude Code session (or manually invoke startup skill)
   - Should report: "✅ Wrangler version up to date (v{current})"

4. **Commit migration**:
   ```bash
   git add .wrangler/
   git commit -m "Migrate to wrangler v{current}"
   ```

---

## Need Help?

### Before Starting

**Back up your work**:
```bash
git commit -am "Pre-migration backup before v{current} update"
```

### If Migration Fails

**Restore previous state**:
```bash
# Undo all migration changes
git reset --hard HEAD~1
```

**Skip version check temporarily**:
```bash
export WRANGLER_SKIP_VERSION_CHECK=true
```

**Report issue**:
- Repository: https://github.com/wrangler-marketplace/wrangler/issues
- Include:
  - Error messages
  - Project structure (output of `tree .wrangler/` or `ls -R .wrangler/`)
  - Git diff before/after migration attempt
  - Output of startup skill with `WRANGLER_DEBUG_VERSION=true`

---

{end if breaking changes}

{if NO breaking changes}

---

## Non-Breaking Updates Available

Your project (v{project}) can be updated to v{current}.

**Good news**: These are non-breaking enhancements. Migration is optional.

---

### What's New

{for each version in gap}

#### v{version} ({releaseDate})

**Changes**:
{Extract "New Features" or "Features" section from release note - summarize key items}

**Affected Skills**:
{Extract "Affected Skills" section - list changed skills}

---

{end for}

---

### Recommended Update Process

While these updates are non-breaking, we recommend updating to get the latest features:

#### Step 1: Review Changes

Read the full release notes for versions you're missing:
{for each version in gap}
- `skills/.wrangler-releases/{version}.md`
{end for}

#### Step 2: Update Constitution Frontmatter

Edit `.wrangler/governance/CONSTITUTION.md` (or `specifications/_CONSTITUTION.md` if legacy):

Update frontmatter:
```yaml
---
wranglerVersion: "{current}"
lastUpdated: "{today's date}"
---
```

#### Step 3: Review New Skills

Check if any new skills are relevant to your project:
{List new skills from release notes}

#### Step 4: Verify

Run startup skill again:
- Should report: "✅ Wrangler version up to date (v{current})"

#### Step 5: Commit

```bash
git add .wrangler/governance/CONSTITUTION.md
git commit -m "Update to wrangler v{current} (non-breaking)"
```

---

{end if no breaking changes}

---

## Ready to Proceed?

{if breaking changes}
I'm ready to help you execute this migration. Would you like me to:

1. **Start migration now** - I'll execute all steps and verify as we go
2. **Review specific step** - Discuss a particular migration step in detail
3. **Skip for now** - Set `WRANGLER_SKIP_VERSION_CHECK=true` and continue with current version

Which would you prefer?
{end if}

{if no breaking changes}
Since these are non-breaking updates, you can:

1. **Update now** - I'll update your constitution frontmatter
2. **Skip for now** - Continue with v{project} (you can update anytime)

Which would you prefer?
{end if}

---

## Additional Information

### Environment Variables

**Skip version checks**:
```bash
export WRANGLER_SKIP_VERSION_CHECK=true
```

**Skip automatic migration**:
```bash
export WRANGLER_SKIP_MIGRATION=true
```

**Enable debug output**:
```bash
export WRANGLER_DEBUG_VERSION=true
```

### Support

- **Issues**: https://github.com/wrangler-marketplace/wrangler/issues
- **Documentation**: See `docs/MCP-USAGE.md` for MCP features
- **Plugin**: Check `.claude-plugin/plugin.json` for plugin configuration

---

**Note**: This command provides instructions only. I (the AI) will help you execute the migration, but you'll need to verify each step succeeds before proceeding.
