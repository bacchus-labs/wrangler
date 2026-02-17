---
id: "000002"
title: "Interactive Migration Workflow with User Approval"
type: "specification"
status: "closed"
priority: "critical"
labels: ["migration", "user-experience", "session-hooks", "versioning"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T12:00:00.000Z"
updatedAt: "2025-11-19T20:33:00.000Z"
wranglerContext:
  agentId: "claude-code"
  parentTaskId: "000001"
  estimatedEffort: "4-6 hours"
  implementedAt: "2025-11-19T20:33:00.000Z"
---

# Specification: Interactive Migration Workflow with User Approval

## Executive Summary

**Problem**: The startup skill detects version mismatches and migration needs, but users aren't prompted to approve migrations. The session hook doesn't invoke version checking, so migrations never happen automatically.

**Solution**: Implement an interactive migration workflow that:
1. Detects version mismatches on session start
2. Summarizes what needs to migrate
3. Prompts user for approval via AskUserQuestion
4. Executes migration only if approved
5. Reports results and updates version

**User Experience**:
```
[Session starts]

🔄 WRANGLER UPDATE DETECTED

Current version: 1.0.0
Latest version: 1.1.0
Breaking changes detected.

Migration Required:
├─ Move issues/ → .wrangler/issues/ (42 files)
├─ Move specifications/ → .wrangler/specifications/ (7 files)
├─ Move memos/ → .wrangler/memos/ (15 files)
├─ Move constitution → .wrangler/governance/CONSTITUTION.md
└─ Update constitution version to 1.1.0

Estimated time: <10 seconds

[User sees approval prompt]
Proceed with migration?
○ Yes, migrate now
○ Show detailed migration plan first
○ Skip (remind me next session)
○ Never migrate (I'll do it manually)

[If "Yes, migrate now" selected]

✓ Migration complete (8.3s)
✓ 64 files migrated successfully
✓ Constitution updated to v1.1.0
✓ Verified: All files migrated correctly

Your project is now on wrangler v1.1.0!
```

## Goals

### Primary Goals
- **User Control**: Never migrate without explicit approval
- **Transparency**: Show exactly what will change before migrating
- **Safety**: Create backups, validate results, provide rollback
- **Simplicity**: One-click approval for common cases
- **Flexibility**: Support "show details", "skip", "never ask again"

### Non-Goals
- Automatic migration without user approval (too risky)
- Supporting partial migrations (all or nothing)
- Backward compatibility with pre-1.0.0 versions
- Migration of non-wrangler files

## Requirements

### Functional Requirements

**FR-001**: Session hook MUST invoke startup skill to check version
**FR-002**: Startup skill MUST detect version mismatch (project vs plugin)
**FR-003**: System MUST use AskUserQuestion for migration approval
**FR-004**: User MUST see summary of what will migrate before approving
**FR-005**: Migration MUST create backup before moving files
**FR-006**: Migration MUST validate file counts before/after
**FR-007**: Migration MUST update constitution version after success
**FR-008**: User MUST be able to skip migration (with reminder next session)
**FR-009**: User MUST be able to opt-out permanently
**FR-010**: Migration MUST provide rollback if validation fails

### Non-Functional Requirements

**NFR-001**: Migration MUST complete in <15 seconds for <1000 files
**NFR-002**: Migration MUST be idempotent (safe to run multiple times)
**NFR-003**: Migration MUST not lose any data (validated with file counts)
**NFR-004**: User prompt MUST appear within 3 seconds of session start
**NFR-005**: Error messages MUST provide clear next steps

## Architecture

### Component 1: Enhanced Session Hook

**File**: `hooks/session-start.sh`

**Changes**:
```bash
#!/usr/bin/env bash
set -euo pipefail

# ... [existing initialization code] ...

# NEW: Version check and migration detection
check_version_and_migrate() {
    # Find git root
    if ! GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
        return 0  # Not in git repo, skip
    fi

    # Check for opt-out flag
    if [ -f "${GIT_ROOT}/.wrangler/SKIP_AUTO_MIGRATION" ]; then
        return 0  # User opted out
    fi

    # Detect if migration needed
    NEEDS_MIGRATION=false

    # Legacy structure exists?
    if [ -d "${GIT_ROOT}/issues" ] && [ ! -d "${GIT_ROOT}/.wrangler/issues" ]; then
        NEEDS_MIGRATION=true
    fi

    if [ "$NEEDS_MIGRATION" = "true" ]; then
        # Inject migration prompt into session context
        echo "MIGRATION_NEEDED" > /tmp/wrangler-migration-flag
    fi
}

check_version_and_migrate

# ... [rest of hook] ...
```

**Output**: Sets flag that triggers skill invocation

### Component 2: Migration Detection Skill

**File**: `skills/wrangler/migration-detector/SKILL.md`

**Purpose**: Detect migration needs and summarize for user

**Workflow**:
```markdown
1. Check if /tmp/wrangler-migration-flag exists
2. If yes:
   a. Scan for legacy directories (issues/, specifications/, memos/)
   b. Count files in each
   c. Check constitution version
   d. Estimate migration time
   e. Generate summary
3. Use AskUserQuestion tool with migration summary
4. Based on response:
   - "Yes, migrate now" → Invoke migration-executor skill
   - "Show details" → Display detailed plan, ask again
   - "Skip" → Create .wrangler/REMIND_NEXT_SESSION flag
   - "Never" → Create .wrangler/SKIP_AUTO_MIGRATION flag
```

### Component 3: Migration Executor Skill

**File**: `skills/wrangler/migration-executor/SKILL.md`

**Purpose**: Safely execute the migration with validation

**Workflow**:
```markdown
1. Pre-Migration Checks
   - Verify git repository is clean (no uncommitted changes)
   - Count files in legacy directories
   - Create backup directory (.wrangler-migration-backup-{timestamp})

2. Backup Phase
   - Copy (not move) legacy directories to backup
   - Verify backup file counts match source

3. Migration Phase
   - Create .wrangler/ directory structure
   - Move directories:
     - issues/ → .wrangler/issues/
     - specifications/ → .wrangler/specifications/
     - memos/ → .wrangler/memos/
   - Move constitution files:
     - specifications/_CONSTITUTION.md → .wrangler/governance/CONSTITUTION.md
     - specifications/_ROADMAP.md → .wrangler/governance/ROADMAP.md
     - specifications/_ROADMAP__NEXT_STEPS.md → .wrangler/governance/ROADMAP__NEXT_STEPS.md

4. Validation Phase
   - Count files in new locations
   - Verify counts match legacy counts
   - Check for any remaining files in legacy locations
   - If validation fails → ROLLBACK

5. Constitution Update
   - Read .wrangler/governance/CONSTITUTION.md
   - Update wranglerVersion to current version
   - Save changes

6. Cleanup
   - Remove empty legacy directories
   - Remove backup (user can skip this step)
   - Create .wrangler/MIGRATION_COMPLETE marker

7. Report
   - Summary of files migrated
   - Verification status
   - Time elapsed
   - Next steps
```

### Component 4: User Prompt Design

**Tool**: AskUserQuestion

**Prompt Structure**:
```typescript
{
  questions: [
    {
      question: "Wrangler needs to migrate your project to v1.1.0. Proceed with migration?",
      header: "Update",
      multiSelect: false,
      options: [
        {
          label: "Yes, migrate now",
          description: "Migrate all files to .wrangler/ directory structure (recommended, ~10 seconds)"
        },
        {
          label: "Show detailed plan",
          description: "See exactly what files will move before deciding"
        },
        {
          label: "Skip for now",
          description: "Remind me next session (files stay in current locations)"
        },
        {
          label: "Never ask again",
          description: "I'll migrate manually or keep current structure"
        }
      ]
    }
  ]
}
```

**Detailed Plan Output** (if user selects "Show detailed plan"):
```markdown
# Migration Plan: v1.0.0 → v1.1.0

## Changes

### Directory Migrations
1. **issues/** (42 files)
   - From: /Users/sam/code/my-project/issues/
   - To: /Users/sam/code/my-project/.wrangler/issues/
   - Action: Move directory

2. **specifications/** (7 files)
   - From: /Users/sam/code/my-project/specifications/
   - To: /Users/sam/code/my-project/.wrangler/specifications/
   - Action: Move directory (except constitution/roadmap files)

3. **memos/** (15 files)
   - From: /Users/sam/code/my-project/memos/
   - To: /Users/sam/code/my-project/.wrangler/memos/
   - Action: Move directory

### Governance File Migrations
4. **Constitution**
   - From: specifications/_CONSTITUTION.md
   - To: .wrangler/governance/CONSTITUTION.md
   - Action: Move + update version to 1.1.0

5. **Roadmap Files**
   - From: specifications/_ROADMAP.md
   - To: .wrangler/governance/ROADMAP.md
   - From: specifications/_ROADMAP__NEXT_STEPS.md
   - To: .wrangler/governance/ROADMAP__NEXT_STEPS.md

## New Structure

After migration:
```
.wrangler/
├── issues/ (42 files migrated)
├── specifications/ (7 files migrated)
├── memos/ (15 files migrated)
├── governance/
│   ├── CONSTITUTION.md (updated to v1.1.0)
│   ├── ROADMAP.md
│   └── ROADMAP__NEXT_STEPS.md
├── cache/ (created, empty)
├── config/ (created, empty)
└── docs/ (created, empty)
```

## Safety

- ✅ Backup created before migration
- ✅ File count validation
- ✅ Automatic rollback on failure
- ✅ Git status clean verification
- ✅ All operations logged

## Estimated Time

**8-12 seconds** for 64 files

Proceed with migration? [Yes/No]
```

## User Experience Flows

### Flow 1: First-Time Migration (Happy Path)

```
[User starts Claude Code session]

🔄 WRANGLER UPDATE DETECTED

Your project is on v1.0.0, latest is v1.1.0

Migration Required: 64 files → .wrangler/ directory

[User sees prompt with 4 options]
User selects: "Yes, migrate now"

Migrating files...
✓ Backup created
✓ 42 issues migrated
✓ 7 specifications migrated
✓ 15 memos migrated
✓ 3 governance files migrated
✓ Constitution updated to v1.1.0
✓ Validation passed

Migration complete in 8.3 seconds!

Your project is now on wrangler v1.1.0
```

### Flow 2: User Wants Details First

```
[User starts session]

🔄 WRANGLER UPDATE DETECTED

[User sees prompt]
User selects: "Show detailed plan"

[System displays detailed plan with all file paths]

Proceed with migration? [Yes/No]
User: Yes

[Migration executes as in Flow 1]
```

### Flow 3: User Skips (Busy Now)

```
[User starts session]

🔄 WRANGLER UPDATE DETECTED

[User sees prompt]
User selects: "Skip for now"

✓ Skipped migration
  You'll be reminded next session

[Session continues normally with legacy structure]
```

### Flow 4: User Opts Out Permanently

```
[User starts session]

🔄 WRANGLER UPDATE DETECTED

[User sees prompt]
User selects: "Never ask again"

✓ Auto-migration disabled
  Created .wrangler/SKIP_AUTO_MIGRATION

  To migrate manually, run: /wrangler:migrate

[Future sessions: No migration prompts]
```

### Flow 5: Migration Failure with Rollback

```
[User starts session]
[User approves migration]

Migrating files...
✓ Backup created
✓ 42 issues migrated
✓ 7 specifications migrated
❌ File count mismatch (expected 64, found 63)

⚠️ MIGRATION FAILED - Rolling back

✓ Restored from backup
✓ All files back in original locations

Error: 1 file missing after migration
Details: specifications/000005-example.md not found in .wrangler/

Please report this issue:
https://github.com/wrangler-marketplace/wrangler/issues

Your files are safe in their original locations.
```

## Implementation Plan

### Phase 1: Migration Detection (2 hours)

**Tasks**:
- [ ] Create `skills/wrangler/migration-detector/SKILL.md`
- [ ] Detect legacy directories
- [ ] Count files
- [ ] Generate migration summary
- [ ] Test: Detect correctly in various scenarios

**Acceptance Criteria**:
- Correctly detects when migration needed
- Accurate file counts
- Clear summary generation

### Phase 2: User Prompt Integration (1 hour)

**Tasks**:
- [ ] Integrate AskUserQuestion tool
- [ ] Design prompt with 4 options
- [ ] Create detailed plan generator
- [ ] Handle each user response
- [ ] Test: All response paths work

**Acceptance Criteria**:
- Prompt appears on session start if migration needed
- All 4 options work correctly
- Detailed plan shows accurate information

### Phase 3: Migration Executor (3 hours)

**Tasks**:
- [ ] Create `skills/wrangler/migration-executor/SKILL.md`
- [ ] Implement backup creation
- [ ] Implement file migration logic
- [ ] Implement validation
- [ ] Implement rollback
- [ ] Update constitution version
- [ ] Test: Successful migration
- [ ] Test: Failed migration with rollback

**Acceptance Criteria**:
- Migration moves all files correctly
- Backup created before migration
- Validation catches file count mismatches
- Rollback restores original state
- Constitution version updated

### Phase 4: Session Hook Integration (1 hour)

**Tasks**:
- [ ] Update `hooks/session-start.sh`
- [ ] Add version check invocation
- [ ] Set migration flag if needed
- [ ] Test: Hook triggers migration detection
- [ ] Test: Hook skips if already migrated

**Acceptance Criteria**:
- Hook detects migration needs
- Hook triggers skill invocation
- Hook respects opt-out flags

### Phase 5: Testing & Validation (1 hour)

**Tasks**:
- [ ] Test: Fresh project (no migration)
- [ ] Test: Legacy project (needs migration)
- [ ] Test: Already migrated project (skip)
- [ ] Test: Opt-out scenario
- [ ] Test: Skip then migrate next session
- [ ] Test: Migration failure and rollback
- [ ] Performance: Measure migration time

**Acceptance Criteria**:
- All test scenarios pass
- Migration completes in <15s for <1000 files
- No data loss in any scenario

## Success Criteria

### Launch Criteria

- [ ] Migration detector skill created and tested
- [ ] Migration executor skill created and tested
- [ ] User prompt integrated with AskUserQuestion
- [ ] Session hook updated to trigger version check
- [ ] All test scenarios passing
- [ ] Documentation updated
- [ ] Performance benchmarked (<15s for typical project)

### Success Metrics (Post-Launch)

- >90% of users approve migration on first prompt
- Zero data loss incidents
- <5% migration failures
- Average migration time <10s
- <3 user support issues related to migration

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Backup creation, validation, rollback |
| User confusion about migration | Medium | Medium | Clear prompts, detailed plan option |
| Migration takes too long | Low | Medium | Optimize file operations, show progress |
| Partial migration leaves project inconsistent | Low | High | All-or-nothing migration, validation |
| User clicks wrong option | Medium | Low | Clear option descriptions, confirmation for "Never" |

## Open Questions

1. **Backup Retention**: How long to keep migration backups?
   - **Option A**: Delete immediately after successful migration
   - **Option B**: Keep for 24 hours
   - **Option C**: Let user decide via prompt
   - **Decision**: Option B (keep for 24h as safety net)

2. **Git Integration**: Should we use `git mv` instead of `mv`?
   - **Option A**: Use `git mv` if in git repo
   - **Option B**: Use regular `mv`, let user commit
   - **Option C**: Ask user via prompt
   - **Decision**: Option B (simpler, user controls git)

3. **Progress Indicators**: Show file-by-file progress or summary only?
   - **Option A**: Show each file as it moves (verbose)
   - **Option B**: Show summary ("42 files migrated")
   - **Option C**: Progress bar with percentage
   - **Decision**: Option B (cleaner UX, fast enough not to need progress bar)

4. **Reminder Frequency**: If user skips, remind every session or less often?
   - **Option A**: Every session
   - **Option B**: Once per day
   - **Option C**: After 3 sessions
   - **Decision**: Option A (every session until migrated)

## References

- **Parent Specification**: `specifications/000001-centralized-wrangler-directory.md`
- **Startup Skill**: `skills/wrangler/startup-checklist/SKILL.md`
- **Update Command**: `commands/update-yourself.md`
- **Release Notes**: `skills/.wrangler-releases/1.1.0.md`

## Implementation Summary

**Status**: ✅ COMPLETED (2025-11-19)

### What Was Implemented

1. **Migration Detector Skill** (`skills/wrangler/migration-detector/SKILL.md`)
   - Detects legacy directory structure (issues/, specifications/, memos/)
   - Counts files to be migrated
   - Uses AskUserQuestion tool for user approval
   - 4 options: "Migrate now", "Show details", "Skip", "Never ask"
   - Handles opt-out flags and already-migrated scenarios

2. **Migration Executor Skill** (`skills/wrangler/migration-executor/SKILL.md`)
   - 9-phase safe migration process
   - Creates timestamped backup before migration
   - Validates file counts after migration
   - Automatic rollback on validation failure
   - Updates constitution wranglerVersion to 1.1.0
   - Creates .gitignore for runtime directories

3. **Session Hook Updates** (`hooks/session-start.sh`)
   - Changed initialization to create `.wrangler/` structure (v1.1.0) instead of legacy
   - Added migration detection logic
   - Injects reminder to invoke migration-detector when legacy structure detected
   - Handles all scenarios: fresh project, legacy, migrated, opted-out

### Test Results

All 5 test scenarios PASS:
- ✅ Legacy structure → Shows migration reminder
- ✅ Opted out → No reminder
- ✅ Already migrated → No reminder
- ✅ Fresh project → Creates .wrangler/ structure, no reminder
- ✅ Non-git project → Skips gracefully

### Files Created/Modified

**Created:**
- `skills/wrangler/migration-detector/SKILL.md` (335 lines)
- `skills/wrangler/migration-executor/SKILL.md` (492 lines)

**Modified:**
- `hooks/session-start.sh` (added v1.1.0 initialization + migration detection)

### How It Works

**For new projects:**
- Hook creates `.wrangler/` structure automatically
- No migration needed

**For legacy projects:**
- Hook detects legacy directories
- Injects context to invoke migration-detector skill
- User sees prompt with 4 options
- If approved, migration-executor runs
- Backup created, files moved, version updated

**Safety features:**
- Git clean check (warns if uncommitted changes)
- Timestamped backups before migration
- File count validation
- Automatic rollback on failure
- Opt-out mechanism (`.wrangler/SKIP_AUTO_MIGRATION`)

### Constitutional Alignment

This implementation aligns with wrangler's core principles:
- **User agency**: User approves before migration
- **Safety first**: Backups, validation, rollback
- **Simplicity**: Clear UX, sensible defaults
- **Transparency**: Shows exactly what will happen

## Next Steps

1. ~~Create migration-detector skill~~ ✅ DONE
2. ~~Create migration-executor skill~~ ✅ DONE
3. ~~Update session hook~~ ✅ DONE
4. ~~Test with real project~~ ✅ DONE
5. Document migration process (user-facing docs)
6. Deploy as part of v1.1.0 release