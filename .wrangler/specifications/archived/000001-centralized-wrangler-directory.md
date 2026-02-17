---
id: "000001"
title: "Centralized .wrangler/ Directory Structure"
type: "specification"
status: "closed"
priority: "high"
labels: ["governance", "refactoring", "architecture"]
assignee: ""
project: "Governance System"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-12-03T21:16:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: ""
  estimatedEffort: "3-5 days"
---

# Specification: Centralized .wrangler/ Directory Structure

## Executive Summary

**What:** Consolidate all wrangler-managed governance files (issues, specifications, memos, constitution, roadmap) into a single `.wrangler/` directory at project root, with automatic version detection and self-updating migration system.

**Why:** Currently, governance files are scattered across the project root (`issues/`, `specifications/`, `memos/`, etc.), which clutters the project structure, blurs the boundary between project files and governance files, and makes it harder to manage git-tracking vs runtime-only data. A centralized `.wrangler/` directory provides a clear namespace for all wrangler-managed content. Additionally, as wrangler evolves, projects need an automated way to stay current with breaking changes and new features.

**Scope:**
- **Included:** Directory structure design, versioning system, release notes tracking, startup skill with version detection, update-yourself command for LLM-driven migrations, cache configuration, MCP provider updates, session hook updates, skills updates, documentation updates, .gitignore patterns
- **Excluded:** Changes to issue/spec file format, MCP protocol changes beyond directory consolidation

**Status:** Draft

## Goals and Non-Goals

### Goals

- Create a single, obvious location for all wrangler-managed governance files
- Reduce project root clutter
- Establish clear separation between git-tracked governance and runtime metrics
- Implement automatic version detection and update system
- Provide LLM-friendly migration instructions via `/update-yourself` command
- Create startup skill that validates wrangler version compatibility
- Track release notes with breaking change detection
- Support configurable cache settings with JSON defaults
- Simplify onboarding (one directory to understand)
- Enable plugin-managed directory to be immediately recognizable
- Support automatic workspace initialization via session-start hook

### Non-Goals

- Change the markdown file format for issues/specifications
- Modify MCP tool APIs or protocols (beyond path updates)
- Add governance features unrelated to directory structure
- Implement automatic code updates (only provide instructions)
- Change how skills work or are stored
- Replace human decision-making in migration process

## Background & Context

### Problem Statement

**Current Pain Points:**

1. **Project Root Clutter:** Projects using wrangler end up with multiple directories at root:
   - `issues/` - Issue tracking
   - `specifications/` - Feature specs
   - `memos/` - Reference material
   - Plus potential future additions (metrics, cache, etc.)

2. **Unclear Ownership:** Not obvious which directories are managed by wrangler vs project-specific

3. **Git Tracking Confusion:** No clear pattern for what should be git-tracked (issues, specs) vs gitignored (runtime metrics, cache)

4. **Documentation Scatter:** Governance documentation lives in multiple locations with no clear hierarchy

5. **Constitution/Roadmap Location:** Current CLAUDE.md suggests these go in `specifications/_CONSTITUTION.md`, which mixes governance files with feature specifications

### Current State

**Directory Structure (as of 2025-11-18):**

```
project-root/
├── issues/                    # Git-tracked, MCP-managed
├── specifications/            # Git-tracked, MCP-managed
│   ├── _CONSTITUTION.md       # Governance (current proposal)
│   ├── _ROADMAP.md           # Governance (current proposal)
│   └── _ROADMAP__NEXT_STEPS.md # Governance (current proposal)
├── memos/                     # Git-tracked, user-managed
└── [project files...]
```

**MCP Provider Code:**
- Already defines `DEFAULT_ISSUE_DIR = '.wrangler/issues'`
- Already defines `DEFAULT_SPEC_DIR = '.wrangler/specifications'`
- Suggests this refactoring was anticipated

**Session Hook:**
- Currently creates `issues/` and `specifications/` at git root
- Located at `hooks/session-start.sh`

### Proposed State

**New Directory Structure:**

```
.wrangler/
├── issues/                    # Issue tracking (git-tracked)
│   ├── 000001-example.md
│   └── README.md
│
├── specifications/            # Feature specifications (git-tracked)
│   ├── 000001-centralized-wrangler-directory.md
│   └── README.md
│
├── memos/                     # Reference material, RCA archives (git-tracked)
│   ├── 2025-11-18-example-rca.md
│   └── README.md
│
├── governance/                # Constitutional documents (git-tracked)
│   ├── CONSTITUTION.md        # Core principles
│   ├── ROADMAP.md            # Strategic roadmap
│   └── ROADMAP__NEXT_STEPS.md # Tactical execution tracker
│
├── cache/                     # Provider caches and settings (gitignored)
│   ├── settings.json          # User-configurable cache settings
│   └── issue-index.json       # Cached issue index
│
├── config/                    # Wrangler runtime state (gitignored)
│   └── runtime.json           # Runtime state (last update check, etc.)
│
└── docs/                      # Comprehensive governance guides (git-tracked)
    ├── governance.md
    ├── workflows.md
    └── README.md
```

**Benefits:**

1. **Single Governance Namespace:** Everything wrangler-managed lives under `.wrangler/`
2. **Clear Git Boundaries:** Directory-level .gitignore patterns separate tracked from runtime
3. **Reduced Root Clutter:** Project root contains only project files + `.wrangler/`
4. **Obvious Ownership:** `.wrangler/` prefix makes plugin management clear
5. **Future-Proof:** Room for new subdirectories (cache, metrics, config) without root pollution
6. **Easier .gitignore:** Single pattern for plugin-managed content
7. **Automatic Version Detection:** Projects know when they're out of date
8. **LLM-Driven Updates:** Migration instructions optimized for AI assistants

### Versioning and Update System

**Problem:** As wrangler evolves with new features and breaking changes, projects need a way to stay current without manual tracking.

**Solution:** Implement a version detection and self-update system with three components:

#### 1. Version Tracking in Constitution

Each project's `.wrangler/governance/CONSTITUTION.md` includes frontmatter with the wrangler version:

```yaml
---
wranglerVersion: "1.1.0"
lastUpdated: "2025-11-18"
---
```

This represents the wrangler feature set and directory structure the project is currently using.

#### 2. Release Notes Directory (Plugin-Side)

Wrangler plugin maintains release notes in `skills/.wrangler-releases/`:

```
skills/.wrangler-releases/
├── 1.0.0.md                  # Initial release
├── 1.1.0.md                  # .wrangler/ directory refactor
├── 1.2.0.md                  # New governance features
└── CURRENT_VERSION           # File containing latest version number
```

Each release note includes:
- Version number
- Release date
- Breaking changes (if any)
- Migration requirements
- New features
- Affected files/skills

**Example release note (1.1.0.md)**:
```markdown
---
version: "1.1.0"
releaseDate: "2025-11-18"
breakingChanges: true
migrationRequired: true
---

# Wrangler v1.1.0 - Centralized .wrangler/ Directory

## Breaking Changes

- Governance files moved from project root to `.wrangler/` directory
- Constitution moved from `specifications/_CONSTITUTION.md` to `.wrangler/governance/CONSTITUTION.md`
- Issues moved from `issues/` to `.wrangler/issues/`
- Specifications moved from `specifications/` to `.wrangler/specifications/`

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

#### 3. Startup Skill with Version Detection

**Skill**: `skills/wrangler/startup-checklist/SKILL.md`

**Purpose**: Run automatically on session start to validate project is using current wrangler version

**Workflow**:
1. **Read Project Version**
   - Check `.wrangler/governance/CONSTITUTION.md` frontmatter for `wranglerVersion`
   - If missing, assume v1.0.0 (pre-versioning)

2. **Read Current Wrangler Version**
   - Read `skills/.wrangler-releases/CURRENT_VERSION` from plugin directory
   - This is the latest available wrangler version

3. **Compare Versions**
   - If versions match → ✅ SUCCESS, exit with "All good, fully upgraded"
   - If project version < wrangler version → Check for breaking changes

4. **Check for Breaking Changes**
   - List all release notes between project version and current version
   - Example: Project at 1.0.0, current 1.3.0 → check 1.1.0.md, 1.2.0.md, 1.3.0.md
   - Filter for releases with `breakingChanges: true`

5. **Report Status**
   - If no breaking changes → ⚠️ WARN, recommend update but not critical
   - If breaking changes exist → ❌ OUTDATED, report:
     - Project version
     - Current version
     - Number of releases behind
     - List breaking changes
     - Recommend running `/update-yourself`

**Subagent Completion Signal**:
- SUCCESS: Project fully upgraded, no action needed
- WARN: Updates available but no breaking changes
- OUTDATED: Breaking changes detected, migration recommended

#### 4. `/update-yourself` Command

**Purpose**: Provide LLM-optimized migration instructions for detected version gap

**Location**: `commands/update-yourself.md`

**Workflow**:
1. **Detect Version Gap** (same as startup skill steps 1-4)

2. **Load Migration Instructions**
   - For each release with breaking changes, load migration requirements
   - Aggregate into complete migration plan

3. **Generate LLM-Friendly Instructions**
   - Not a script, but clear step-by-step instructions
   - Optimized for Claude Code to execute
   - Includes verification steps

**Example output**:
```markdown
# Update Wrangler from v1.0.0 → v1.3.0

Your project is currently at v1.0.0. Latest is v1.3.0 (3 releases behind).

Breaking changes detected in:
- v1.1.0 (Directory structure refactor)
- v1.2.0 (Governance templates updated)

## Migration Plan

### Step 1: Migrate to v1.1.0 (Directory Structure)

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
   mv memos/* .wrangler/memos/
   ```

3. Move constitution:
   ```bash
   mv specifications/_CONSTITUTION.md .wrangler/governance/CONSTITUTION.md
   mv specifications/_ROADMAP.md .wrangler/governance/ROADMAP.md
   mv specifications/_ROADMAP__NEXT_STEPS.md .wrangler/governance/ROADMAP__NEXT_STEPS.md
   ```

4. Update constitution frontmatter to include:
   ```yaml
   wranglerVersion: "1.1.0"
   lastUpdated: "2025-11-18"
   ```

5. Verify migration:
   - Run `ls .wrangler/` and confirm all directories exist
   - Run `/wrangler:verify-governance` to validate structure

### Step 2: Migrate to v1.2.0 (Governance Templates)

**Task**: Update governance file templates

... [more instructions] ...

### Verification

After all migrations complete:
1. Confirm constitution shows `wranglerVersion: "1.3.0"`
2. Run `/wrangler:verify-governance` - should pass all checks
3. Run startup skill again - should report SUCCESS
```

**Key Design Principles**:
- Instructions are for AI to execute, not bash scripts
- Each step includes verification
- Migration is broken into phases (one release at a time)
- Rollback instructions provided for each step
- Clear success criteria

#### 5. Cache Settings Configuration

**File**: `.wrangler/cache/settings.json`

**Purpose**: User-configurable cache behavior with sensible defaults

**Default Contents**:
```json
{
  "issueIndexing": {
    "enabled": true,
    "rebuildInterval": 3600,
    "maxCacheAge": 86400
  },
  "searchOptimization": {
    "enabled": true,
    "minQueryLength": 3
  },
  "performanceTracking": {
    "enabled": false,
    "sampleRate": 0.1
  }
}
```

**Auto-Generation**:
- Created by session-start hook if missing
- User can edit to customize behavior
- Gitignored (local preferences)

**Benefits**:
- Users control cache behavior without editing code
- Defaults work well out of the box
- Clear documentation of available options

## Requirements

### Functional Requirements

- **FR-001:** System MUST create `.wrangler/` directory structure automatically on session start if not present
- **FR-002:** MCP provider MUST read/write issues to `.wrangler/issues/` by default
- **FR-003:** MCP provider MUST read/write specifications to `.wrangler/specifications/` by default
- **FR-004:** Session hook MUST detect and migrate legacy `issues/` and `specifications/` directories to `.wrangler/` if they exist
- **FR-005:** All skills MUST reference `.wrangler/` paths instead of root-level paths
- **FR-006:** System MUST support configuration override for custom `.wrangler/` location
- **FR-007:** Migration MUST preserve all issue IDs, filenames, and frontmatter
- **FR-008:** Governance files (_CONSTITUTION.md, _ROADMAP.md) MUST move to `.wrangler/governance/`
- **FR-009:** Documentation MUST be updated to reflect new structure in all relevant files
- **FR-010:** `.gitignore` patterns MUST be generated to exclude runtime directories
- **FR-011:** Constitution frontmatter MUST include `wranglerVersion` field
- **FR-012:** Startup skill MUST detect version mismatch between project and plugin
- **FR-013:** Release notes MUST be tracked in `skills/.wrangler-releases/` directory
- **FR-014:** `/update-yourself` command MUST provide step-by-step migration instructions
- **FR-015:** Cache settings MUST be auto-generated with sensible defaults in `.wrangler/cache/settings.json`
- **FR-016:** Startup skill MUST complete with SUCCESS/WARN/OUTDATED signal
- **FR-017:** Breaking changes MUST be clearly identified in release notes frontmatter

### Non-Functional Requirements

- **Performance:** Migration MUST complete in <5 seconds for repositories with <1000 issues
- **Reliability:** Migration MUST be idempotent (safe to run multiple times)
- **Backward Compatibility:** System MUST detect legacy structure and warn users during transition period
- **Security:** Path traversal prevention MUST still apply to `.wrangler/` subdirectories
- **Usability:** Error messages MUST guide users to new directory structure

### User Experience Requirements

- **Transparency:** Users MUST be notified when automatic migration occurs
- **Discoverability:** `.wrangler/README.md` MUST explain directory purpose and structure
- **Clarity:** Documentation MUST clearly indicate old vs new paths during transition
- **Safety:** Migration MUST create backups before moving files

## Architecture

### High-Level Architecture

```
Session Start (hooks/session-start.sh)
    ↓
Detect Git Root
    ↓
Check for .wrangler/ ────→ Exists? ────→ Verify Structure
    ↓                                           ↓
Doesn't Exist                              Add Missing Dirs
    ↓                                           ↓
Check for Legacy (issues/, specifications/)    ↓
    ↓                                           ↓
    ├── Found → Migrate Files ─────────────────┤
    ├── Not Found → Create Fresh ──────────────┤
    ↓                                           ↓
Create .wrangler/ Structure ←──────────────────┘
    ↓
Generate .gitignore Entries
    ↓
Complete
```

### Components

#### Component 1: Session Hook (hooks/session-start.sh)

**Responsibility:** Detect workspace state and initialize/migrate `.wrangler/` structure

**Key Behaviors:**
1. Find git repository root
2. Check for `.wrangler/` directory
3. If missing:
   - Check for legacy `issues/` and `specifications/` directories
   - If found, perform migration
   - If not found, create fresh structure
4. Ensure all required subdirectories exist
5. Generate/update `.wrangler/.gitignore`
6. Output status message

**Migration Logic:**
```bash
# Pseudocode
if [ -d "$GIT_ROOT/issues" ] && [ ! -d "$GIT_ROOT/.wrangler/issues" ]; then
    echo "Migrating issues/ → .wrangler/issues/"
    mv "$GIT_ROOT/issues" "$GIT_ROOT/.wrangler/issues"
fi

if [ -d "$GIT_ROOT/specifications" ] && [ ! -d "$GIT_ROOT/.wrangler/specifications" ]; then
    echo "Migrating specifications/ → .wrangler/specifications/"
    mv "$GIT_ROOT/specifications" "$GIT_ROOT/.wrangler/specifications"
fi

if [ -d "$GIT_ROOT/memos" ] && [ ! -d "$GIT_ROOT/.wrangler/memos" ]; then
    echo "Migrating memos/ → .wrangler/memos/"
    mv "$GIT_ROOT/memos" "$GIT_ROOT/.wrangler/memos"
fi
```

**Interface:**
- Input: Git repository root path
- Output: JSON status message with migration details

#### Component 2: MCP Provider (mcp/providers/markdown.ts)

**Responsibility:** Read/write issues and specifications using new paths

**Changes Required:**
```typescript
// Current
const DEFAULT_ISSUE_DIR = '.wrangler/issues';      // Already correct!
const DEFAULT_SPEC_DIR = '.wrangler/specifications'; // Already correct!

// No changes needed - already uses .wrangler/ paths
```

**Backward Compatibility:**
- If `issuesDirectory` or `specificationsDirectory` config overrides exist, honor them
- This allows users to opt-out of migration if needed

#### Component 3: Skills Updates

**Responsibility:** Update all skills that reference governance paths

**Skills Requiring Updates:**
1. `skills/governance/initialize-governance/SKILL.md`
   - Update paths to `.wrangler/governance/CONSTITUTION.md`
   - Update paths to `.wrangler/specifications/`, `.wrangler/issues/`

2. `skills/governance/verify-governance/SKILL.md`
   - Update directory checks to look in `.wrangler/`

3. `skills/governance/check-constitutional-alignment/SKILL.md`
   - Update constitution path reference

4. `skills/create-new-issue/SKILL.md`
   - Update example paths in documentation

5. `skills/writing-specifications/SKILL.md`
   - Update example paths in documentation

**Pattern for Updates:**
```markdown
<!-- OLD -->
Create issues in `issues/` directory

<!-- NEW -->
Create issues in `.wrangler/issues/` directory
```

#### Component 4: Documentation Updates

**Files Requiring Updates:**
1. `/Users/sam/code/wrangler/CLAUDE.md`
   - Update all path references
   - Add migration notice

2. `/Users/sam/code/wrangler/docs/MCP-USAGE.md`
   - Update directory structure diagrams
   - Update example paths

3. `/Users/sam/code/wrangler/README.md`
   - Update quick start paths
   - Add .wrangler/ explanation

### Data Model

**No Changes Required**

Issue and specification file formats remain identical. Only their storage location changes.

### APIs / Interfaces

**MCP Configuration Interface:**

```typescript
interface MarkdownProviderSettings {
  basePath?: string;
  issuesDirectory?: string;          // Default: '.wrangler/issues'
  specificationsDirectory?: string;  // Default: '.wrangler/specifications'
  collections?: Record<string, { directory: string }>;
}
```

**Backward Compatibility:**
- If user explicitly sets `issuesDirectory: 'issues'`, honor it
- If user sets `basePath`, resolve relative to it
- Default behavior uses `.wrangler/` subdirectories

## Implementation Details

### Technology Stack

- **Shell Scripting:** Bash for session-start.sh migration logic
- **TypeScript:** MCP provider (already uses correct defaults)
- **Markdown:** Documentation updates
- **Git:** Version control for tracked directories

### File Structure

**Complete .wrangler/ Layout:**

```
.wrangler/
├── README.md                  # Directory purpose and structure guide
├── .gitignore                 # Generated ignore patterns
│
├── issues/                    # Git-tracked
│   ├── README.md
│   ├── .gitkeep
│   └── 000001-example.md
│
├── specifications/            # Git-tracked
│   ├── README.md
│   ├── .gitkeep
│   └── 000001-example.md
│
├── memos/                     # Git-tracked
│   ├── README.md
│   ├── .gitkeep
│   └── 2025-11-18-example.md
│
├── governance/                # Git-tracked
│   ├── CONSTITUTION.md
│   ├── ROADMAP.md
│   └── ROADMAP__NEXT_STEPS.md
│
├── cache/                     # Gitignored (runtime only)
│   └── .gitkeep
│
├── config/                    # Gitignored (runtime only)
│   └── .gitkeep
│
└── docs/                      # Git-tracked
    ├── README.md
    ├── governance.md
    └── workflows.md
```

### Key Algorithms

**Algorithm 1: Safe Directory Migration**

Purpose: Move legacy directories to .wrangler/ without data loss

Approach:
1. Verify source directory exists and is not empty
2. Verify destination directory does not exist (prevent overwrites)
3. Use `mv` for atomic rename operation
4. Verify move succeeded (source gone, destination exists)
5. Log migration action to stdout/stderr
6. If any step fails, abort and log error

Complexity: O(1) for filesystem rename operations

**Algorithm 2: Idempotent Structure Initialization**

Purpose: Ensure .wrangler/ structure exists without duplicating work

Approach:
1. Check if `.wrangler/` exists
   - If yes: Verify subdirectories, create missing ones
   - If no: Create entire structure
2. For each required subdirectory:
   - `mkdir -p` (no-op if exists)
   - `touch .gitkeep` (no-op if exists)
3. Generate `.wrangler/.gitignore` if missing
4. Return success

Complexity: O(n) where n = number of subdirectories (constant, ~7)

### Configuration

**Environment Variables:**

- `WRANGLER_WORKSPACE_ROOT`: Override workspace root detection (default: git root)
- `WRANGLER_SKIP_MIGRATION`: Set to "true" to skip automatic migration
- `WRANGLER_ISSUES_DIRECTORY`: Override issues directory (default: `.wrangler/issues`)
- `WRANGLER_SPECIFICATIONS_DIRECTORY`: Override specs directory (default: `.wrangler/specifications`)

**Config Files:**

`.wrangler/config/settings.json` (future enhancement):
```json
{
  "version": "1.0.0",
  "directories": {
    "issues": ".wrangler/issues",
    "specifications": ".wrangler/specifications",
    "memos": ".wrangler/memos"
  },
  "gitTracking": {
    "issues": true,
    "specifications": true,
    "memos": true,
    "cache": false,
    "config": false
  }
}
```

## Security Considerations

### Path Traversal Prevention

**Existing Security (MUST Preserve):**

```typescript
private assertWithinWorkspace(targetPath: string, action: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(this.basePath, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Attempted to ${action} outside of workspace`);
  }
}
```

**New Considerations:**
- `.wrangler/` subdirectories still subject to traversal checks
- Migration script must validate source/destination paths
- No user-controlled paths in migration logic

### Migration Safety

**Backup Strategy:**
1. Before migration, create `.wrangler-migration-backup/` with copies
2. Perform migration
3. If any errors, restore from backup
4. If successful, remove backup after confirmation

**Validation:**
- Verify file counts match before/after migration
- Verify no data loss (checksum validation optional)
- Log all moved files for audit trail

## Error Handling

### Error Categories

1. **Migration Errors:** Source directory missing, destination already exists, permission denied
2. **Initialization Errors:** Cannot create .wrangler/, cannot write .gitignore
3. **Provider Errors:** Cannot read/write issues in new location

### Recovery Strategies

**Migration Failure:**
```bash
# Rollback logic
if migration fails:
  restore from .wrangler-migration-backup/
  log error with details
  exit with non-zero code
  user retains legacy structure
```

**Partial Migration:**
- If only some directories migrated, complete remaining migrations
- Do not abort entire process due to single directory failure
- Log which directories succeeded/failed

**Backward Compatibility Fallback:**
- If `.wrangler/` missing but legacy dirs exist, use legacy paths
- Emit deprecation warning
- Provide migration command

## Observability

### Logging

**Migration Log Output:**
```
✓ Detected legacy structure at /path/to/project
✓ Creating .wrangler/ directory
✓ Migrating issues/ → .wrangler/issues/ (42 files)
✓ Migrating specifications/ → .wrangler/specifications/ (7 files)
✓ Migrating memos/ → .wrangler/memos/ (15 files)
✓ Migration complete
✓ Created .wrangler/.gitignore
✓ Initialized .wrangler/ workspace at /path/to/project/.wrangler
```

**Error Log Output:**
```
✗ Migration failed: .wrangler/issues/ already exists
  Action required: Manually resolve conflict or set WRANGLER_SKIP_MIGRATION=true
```

### Metrics

**Migration Metrics (future):**
- `wrangler.migration.duration_ms`
- `wrangler.migration.files_moved`
- `wrangler.migration.errors`

**Provider Metrics (existing):**
- Track issues/specs created in new location
- Monitor path traversal security violations

## Testing Strategy

### Test Coverage

- **Unit Tests:** MCP provider path resolution (already >80%)
- **Integration Tests:** Session hook migration script
- **E2E Tests:** Full workflow (create issue → read → update in new location)
- **Migration Tests:** Legacy → new structure conversion

### Test Scenarios

#### Scenario 1: Fresh Installation
- **Setup:** Empty git repository
- **Action:** Run session-start.sh
- **Expected:** `.wrangler/` structure created, no migration needed

#### Scenario 2: Legacy Structure Migration
- **Setup:** Repository with `issues/`, `specifications/`, `memos/` at root
- **Action:** Run session-start.sh
- **Expected:** All directories moved to `.wrangler/`, legacy dirs removed

#### Scenario 3: Partial Migration
- **Setup:** Repository with `.wrangler/issues/` but root-level `specifications/`
- **Action:** Run session-start.sh
- **Expected:** Only `specifications/` migrated, existing `.wrangler/issues/` unchanged

#### Scenario 4: Idempotent Execution
- **Setup:** Repository with complete `.wrangler/` structure
- **Action:** Run session-start.sh multiple times
- **Expected:** No changes, no errors, fast execution

#### Scenario 5: MCP Provider Compatibility
- **Setup:** Repository with `.wrangler/` structure
- **Action:** Create issue via MCP tool
- **Expected:** Issue created in `.wrangler/issues/`, readable by list/get tools

#### Scenario 6: Custom Configuration Override
- **Setup:** MCP config with `issuesDirectory: "custom/path"`
- **Action:** Create issue
- **Expected:** Issue created in custom path, not default `.wrangler/issues/`

## Deployment

### Deployment Strategy

**Approach:** Phased rollout with backward compatibility

**Phases:**

1. **Phase 1: Code Update (Non-Breaking)**
   - Update MCP provider defaults (already done)
   - Update session-start.sh with migration logic
   - Update documentation to mention new structure
   - Deploy as minor version (e.g., 1.1.0)

2. **Phase 2: User Notification**
   - Session hook emits migration notice on first run
   - Documentation updated with migration guide
   - Users can opt-out via `WRANGLER_SKIP_MIGRATION=true`

3. **Phase 3: Skills & Template Updates**
   - Update all skills to reference `.wrangler/` paths
   - Update templates with new paths
   - Deprecated warnings for old paths

4. **Phase 4: Legacy Path Deprecation**
   - After 3 months, emit warnings for legacy structure
   - After 6 months, remove automatic migration (require manual)
   - After 12 months, drop support for legacy paths

### Migration Path

**From:** Scattered governance directories at project root
**To:** Centralized `.wrangler/` directory structure

**Steps:**

1. **Automatic Migration (Recommended)**
   ```bash
   # Happens automatically on session start
   # User sees migration log output
   # Legacy directories moved to .wrangler/
   ```

2. **Manual Migration (Advanced Users)**
   ```bash
   # If user disabled automatic migration
   mkdir -p .wrangler
   mv issues .wrangler/issues
   mv specifications .wrangler/specifications
   mv memos .wrangler/memos
   mkdir -p .wrangler/governance
   mv specifications/_CONSTITUTION.md .wrangler/governance/CONSTITUTION.md
   mv specifications/_ROADMAP.md .wrangler/governance/ROADMAP.md
   mv specifications/_ROADMAP__NEXT_STEPS.md .wrangler/governance/ROADMAP__NEXT_STEPS.md
   ```

3. **Verification**
   ```bash
   # Verify structure
   ls -la .wrangler/

   # Test MCP tools
   # (create/list/get issues should work)
   ```

**Data Migration:**
- File moves (no content changes)
- Frontmatter preserved exactly
- Issue IDs unchanged
- Git history preserved (git mv preferred if possible)

**Backward Compatibility:**
- Support legacy paths for 6 months with warnings
- Allow configuration override indefinitely
- Document migration in CHANGELOG.md

### Dependencies

**Required before deployment:**
- [ ] Session-start.sh migration script implemented
- [ ] MCP provider defaults verified (already correct)
- [ ] Skills updated with new paths
- [ ] Documentation updated (CLAUDE.md, docs/MCP-USAGE.md, README.md)
- [ ] Migration tests passing
- [ ] Backward compatibility verified

**Downstream impacts:**
- Users with existing wrangler installations will see migration on next session
- Custom scripts referencing `issues/` or `specifications/` need updates
- CI/CD workflows may need path updates

## Performance Characteristics

### Expected Performance

**Migration:**
- **Latency:** <1 second for <100 files, <5 seconds for <1000 files
- **Throughput:** Limited by filesystem (mv is atomic rename)
- **Resource Usage:** Minimal (filesystem metadata operation)

**MCP Operations (Post-Migration):**
- No performance change (same file operations, different path)
- Path resolution overhead: negligible (~1-2 string operations)

### Scalability

**File Count:**
- Structure supports thousands of issues/specs
- Performance scales linearly with file count (no change from current)

**Directory Depth:**
- One level deeper (`.wrangler/issues/` vs `issues/`)
- Negligible path resolution overhead

### Optimization Strategies

- Use atomic `mv` for migration (not cp + rm)
- Skip migration if destination exists (idempotent)
- Lazy-create subdirectories (only when needed)

## Open Questions & Decisions

### Resolved Decisions

| Decision | Options Considered | Chosen | Rationale | Date |
|----------|-------------------|--------|-----------|------|
| Directory name | `.wrangler/` vs `wrangler/` vs `.wrangler-governance/` | `.wrangler/` | Hidden directory convention, concise, namespace matches plugin | 2025-11-18 |
| Migration strategy | Automatic vs manual vs prompt | Automatic with opt-out | Best UX, safe with idempotent logic | 2025-11-18 |
| Constitution location | `.wrangler/governance/` vs `.wrangler/` root | `.wrangler/governance/` | Separates constitution from tactical issues/specs | 2025-11-18 |
| Backward compatibility | 3 months vs 6 months vs 12 months | 6 months with warnings | Balances adoption time vs maintenance burden | 2025-11-18 |

### Open Questions

- [ ] **Question 1:** Should we support git-worktree-aware detection?
  - **Impact:** Users working in git worktrees may need special handling
  - **Options:** Detect worktree root vs shared .wrangler/ or per-worktree
  - **Owner:** Implementation team

- [ ] **Question 2:** Should memos/ be auto-created or only on demand?
  - **Impact:** Empty directory clutter vs discovery
  - **Options:** Always create with README vs create on first use
  - **Owner:** UX decision

- [ ] **Question 3:** Should we provide a standalone migration CLI command?
  - **Impact:** Users who disabled auto-migration need manual path
  - **Options:** `wrangler migrate` command vs documented bash script
  - **Owner:** CLI design team

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Migration data loss | Low | High | Backup creation, validation checks, rollback logic | Implementation |
| Breaking user workflows | Medium | Medium | 6-month backward compatibility, clear migration docs | Product |
| Git history disruption | Low | Medium | Use `git mv` where possible, document path changes | Implementation |
| Performance regression | Low | Low | Benchmark before/after, path depth negligible | Testing |
| User confusion | Medium | Low | Clear migration logs, updated docs, FAQ section | Documentation |
| CI/CD pipeline breaks | Medium | Medium | Document required changes, provide migration checklist | DevOps |

## Success Criteria

### Launch Criteria

- [ ] All functional requirements implemented
- [ ] Migration script tested on 10+ real repositories
- [ ] Zero data loss in migration tests
- [ ] Backward compatibility verified for 6-month period
- [ ] Documentation complete (CLAUDE.md, MCP-USAGE.md, README.md, migration guide)
- [ ] Skills updated to reference new paths
- [ ] MCP provider defaults verified
- [ ] Session hook produces clear migration logs

### Success Metrics (Post-Launch)

- >95% of users successfully migrate on first session (no manual intervention)
- Zero reported data loss incidents
- <5 GitHub issues filed about migration problems
- Average migration time <3 seconds for typical repository
- User feedback indicates improved clarity and reduced confusion

## Timeline & Milestones

| Milestone | Target Date | Status | Dependencies |
|-----------|-------------|--------|--------------|
| Specification Complete | 2025-11-18 | Complete | - |
| Session Hook Migration Script | TBD | Not Started | Specification approval |
| Skills & Templates Updated | TBD | Not Started | Migration script |
| Documentation Updated | TBD | Not Started | Skills updates |
| Testing Complete | TBD | Not Started | Implementation |
| Release v1.1.0 | TBD | Not Started | Testing |
| 6-Month Deprecation Warning | TBD | Not Started | Release |
| Legacy Path Removal (v2.0.0) | TBD | Not Started | 6-month grace period |

## Constitutional Alignment

This specification aligns with wrangler's constitutional principles:

### Principle: Systematic Over Ad-Hoc

**Alignment:** The centralized `.wrangler/` structure creates a systematic organization pattern for all governance files, replacing the ad-hoc scattering of directories at project root.

**Evidence:**
- Single namespace for all plugin-managed content
- Clear hierarchy (governance, tactical, runtime)
- Automatic initialization via session hook

### Principle: Complexity Reduction

**Alignment:** Reduces cognitive complexity by consolidating 4+ root-level directories into one.

**Evidence:**
- Before: User must understand `issues/`, `specifications/`, `memos/`, plus potential future additions
- After: User understands `.wrangler/` contains all governance content
- Clear separation of concerns via subdirectories

### Principle: Test-Driven Development

**Alignment:** Migration script will be developed using TDD approach.

**Evidence:**
- Test scenarios defined before implementation
- Unit tests for path resolution
- Integration tests for migration logic
- E2E tests for full workflow

### Principle: Evidence Over Claims

**Alignment:** Migration success verified through automated checks, not assumptions.

**Evidence:**
- File count validation before/after migration
- Existence checks for source/destination
- Idempotent execution testing
- User notification of migration actions

### Principle: Skills Are Mandatory

**Alignment:** All relevant skills will be updated to reference new paths, ensuring consistent usage.

**Evidence:**
- Governance skills updated to use `.wrangler/governance/`
- Issue creation skills updated to use `.wrangler/issues/`
- Specification skills updated to use `.wrangler/specifications/`

### Principle: Git Tracks Everything Important

**Alignment:** Git tracking boundaries made explicit through directory structure.

**Evidence:**
- `.wrangler/.gitignore` clearly defines tracked vs runtime directories
- Migration preserves git history where possible
- Documentation specifies which subdirectories should be git-tracked

## References

### Related Specifications

- None (this is specification #000001)

### Related Issues

- None yet (to be created during implementation planning)

### External Resources

- [Anthropic Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [GitHub Spec-Kit Constitution Pattern](https://github.com/spec-dev/spec-kit)
- [Git Best Practices for Directory Structure](https://git-scm.com/docs/gitignore)

### Prior Art

- **Claude Code `.claude/` directory:** Hidden directory for plugin-managed content
- **VS Code `.vscode/` directory:** Workspace settings and extensions
- **Git `.git/` directory:** Version control metadata
- **Node.js `.npm/` directory:** Package manager cache

**Pattern:** Leading dot indicates hidden, tool-managed directory with structured subdirectories for different purposes.

## Appendix

### Glossary

- **Governance Files:** Constitutional documents, roadmaps, issues, specifications that guide project direction
- **Runtime Files:** Metrics, cache, temporary data generated during wrangler operation
- **Legacy Structure:** Pre-refactoring directory layout with root-level governance directories
- **Migration:** Automated process of moving legacy directories to `.wrangler/`
- **Idempotent:** Operation that can be safely repeated without changing result

### Assumptions

- Users want less clutter at project root
- Git repository root is the appropriate location for `.wrangler/`
- Users are comfortable with automatic migration (with opt-out)
- Session hook execution is reliable and runs on every session start

### Constraints

- Must maintain backward compatibility for 6 months minimum
- Cannot change MCP tool APIs or file formats
- Must preserve all existing issue IDs and data
- Cannot break existing user workflows during transition
- Must work with git, not require it (graceful fallback for non-git projects)

---

## Implementation Checklist

### Phase 1: Versioning System Setup
- [ ] Create `skills/.wrangler-releases/` directory
- [ ] Create `CURRENT_VERSION` file with "1.1.0"
- [ ] Create `1.0.0.md` release note (retrospective)
- [ ] Create `1.1.0.md` release note for this change
- [ ] Update constitution template to include `wranglerVersion` frontmatter
- [ ] Create startup skill `skills/wrangler/startup-checklist/SKILL.md`
- [ ] Create `/update-yourself` command in `commands/update-yourself.md`
- [ ] Create cache settings template `.wrangler/cache/settings.json`

### Phase 2: Session Hook Migration Script
- [ ] Detect git repository root
- [ ] Check for `.wrangler/` directory
- [ ] Implement legacy directory detection
- [ ] Implement safe migration logic (backup, move, validate)
- [ ] Generate `.wrangler/.gitignore`
- [ ] Generate `.wrangler/cache/settings.json` with defaults
- [ ] Add environment variable support (WRANGLER_SKIP_MIGRATION)
- [ ] Create detailed migration logs
- [ ] Test idempotent execution
- [ ] Test partial migration scenarios
- [ ] Test fresh installation scenario

### Phase 3: Skills & Templates Updates
- [ ] Update `skills/governance/initialize-governance/SKILL.md`
- [ ] Update `skills/governance/verify-governance/SKILL.md`
- [ ] Update `skills/governance/check-constitutional-alignment/SKILL.md`
- [ ] Update `skills/create-new-issue/SKILL.md`
- [ ] Update `skills/writing-specifications/SKILL.md`
- [ ] Update all governance templates
- [ ] Search for hardcoded paths in remaining skills

### Phase 4: Documentation Updates
- [ ] Update `/Users/sam/code/wrangler/CLAUDE.md`
- [ ] Update `/Users/sam/code/wrangler/docs/MCP-USAGE.md`
- [ ] Update `/Users/sam/code/wrangler/README.md`
- [ ] Create migration guide in `docs/migration-to-wrangler-directory.md`
- [ ] Update architecture diagrams
- [ ] Add FAQ section for migration

### Phase 5: MCP Provider Verification
- [ ] Verify `DEFAULT_ISSUE_DIR` and `DEFAULT_SPEC_DIR` values
- [ ] Test path resolution with new defaults
- [ ] Test configuration overrides
- [ ] Verify path traversal security still works
- [ ] Test all 11 MCP tools with new paths

### Phase 6: Testing
- [ ] Test startup skill version detection (match, behind, missing)
- [ ] Test startup skill breaking change detection
- [ ] Test `/update-yourself` command output format
- [ ] Test cache settings.json generation
- [ ] Write migration script unit tests
- [ ] Write integration tests for session hook
- [ ] Write E2E tests for full workflow
- [ ] Test backward compatibility scenarios
- [ ] Performance benchmarking (migration time)
- [ ] Manual testing with real repositories
- [ ] Test version mismatch scenarios (1.0 → 1.1, 1.0 → 1.3, etc.)

### Phase 7: Release
- [ ] Update CHANGELOG.md with migration notes
- [ ] Create migration announcement
- [ ] Tag release v1.1.0
- [ ] Monitor for migration issues
- [ ] Collect user feedback

---

## Completion Notes (2025-12-03)

Core implementation complete:

1. **Workspace Schema** (`.wrangler/workspace-schema.json`):
   - Canonical JSON schema defining all paths (v1.2.0)
   - Defines directories, governance files, templates, gitignore patterns
   - Includes `ideas` directory for new artifact type

2. **Schema Loader** (`mcp/workspace-schema.ts`):
   - `loadWorkspaceSchema()` - loads from `.wrangler/workspace-schema.json`
   - `getMCPDirectories()` - provides MCP configuration
   - `getDefaultSchema()` - fallback when no schema file exists
   - Helper functions for initialization, git tracking, gitignore patterns

3. **MCP Provider Integration**:
   - `MarkdownIssueProvider` uses schema for directory paths
   - Issues go to `.wrangler/issues/`
   - Specifications go to `.wrangler/specifications/`
   - Ideas go to `.wrangler/ideas/`

4. **Tests**: All 254 MCP tests pass

**Not implemented** (deferred to future work):
- Automated migration script for existing projects
- Version detection and `/update-yourself` command
- Release notes tracking system

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-03
**Next Review:** N/A - Closed
