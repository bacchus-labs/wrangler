---
id: "000002"
title: "Implement session hook migration script"
type: "issue"
status: "open"
priority: "high"
labels: ["migration", "automation", "session-hooks", "phase-2"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "2-3 days"
---

# Implement session hook migration script

## Description

Update the `hooks/session-start.sh` script to automatically detect and migrate legacy governance directories (`issues/`, `specifications/`, `memos/`) to the new centralized `.wrangler/` directory structure. The migration must be safe, idempotent, and provide clear feedback.

**Context**: Users with existing wrangler installations have governance files scattered across project root. This migration script provides automatic, transparent migration to the new `.wrangler/` structure without manual intervention.

**Background**: The session hook already creates `issues/` and `specifications/` directories. This update changes it to create `.wrangler/` and its subdirectories, plus handles migration of existing files.

## Acceptance Criteria

- [ ] **Git root detection**: Script correctly finds git repository root in all scenarios (worktrees, subdirectories, etc.)
- [ ] **Fresh installation**: Creates complete `.wrangler/` structure when none exists
- [ ] **Legacy migration**: Detects and migrates existing `issues/`, `specifications/`, `memos/` directories
- [ ] **Constitution migration**: Moves `specifications/_CONSTITUTION.md` → `.wrangler/governance/CONSTITUTION.md`
- [ ] **Roadmap migration**: Moves `specifications/_ROADMAP.md` → `.wrangler/governance/ROADMAP.md`
- [ ] **Next steps migration**: Moves `specifications/_ROADMAP__NEXT_STEPS.md` → `.wrangler/governance/ROADMAP__NEXT_STEPS.md`
- [ ] **Backup creation**: Creates backup before migration with validation
- [ ] **Idempotent execution**: Running multiple times is safe, no errors or duplicates
- [ ] **Gitignore generation**: Creates `.wrangler/.gitignore` with correct patterns
- [ ] **Settings generation**: Creates `.wrangler/cache/settings.json` with defaults
- [ ] **Environment variable support**: Honors `WRANGLER_SKIP_MIGRATION=true` to disable migration
- [ ] **Detailed logging**: Provides clear, informative logs for all migration actions
- [ ] **Performance**: Completes in <5 seconds for repositories with <1000 issues

## Technical Notes

**Implementation Approach**:

1. Detect git repository root (handle edge cases)
2. Check for `.wrangler/` directory existence
3. If missing:
   - Check for legacy directories
   - If found, perform migration with backup
   - If not found, create fresh structure
4. Ensure all required subdirectories exist
5. Generate `.wrangler/.gitignore` if missing
6. Generate `.wrangler/cache/settings.json` if missing
7. Output status message with summary

**Files Likely Affected**:
- `hooks/session-start.sh` (major update)
- Projects using wrangler (automatic migration on next session)

**Dependencies**:
- Blocked by: #000001 (needs version system in place)
- Blocks: #000005 (MCP provider verification needs migration to work)
- Blocks: #000006 (comprehensive testing needs migration script)
- Related: Specification #000001

**Constraints**:
- Must preserve all issue IDs, filenames, and frontmatter exactly
- Must be atomic (all-or-nothing migration)
- Must handle partial migrations gracefully
- Must not break existing projects that opt-out
- Performance requirement: <5s for <1000 issues
- Must work in git worktrees and submodules

## Testing Strategy

**Test Coverage Required**:
- [ ] Unit tests for git root detection logic
- [ ] Integration tests for fresh installation scenario
- [ ] Integration tests for legacy structure migration
- [ ] Integration tests for partial migration (some dirs exist, some don't)
- [ ] Integration tests for idempotent execution
- [ ] Edge cases:
  - Empty legacy directories
  - Legacy directories with thousands of files
  - Git worktrees
  - Git submodules
  - Non-git projects (graceful fallback)
  - Permission errors
  - Destination already exists
  - WRANGLER_SKIP_MIGRATION=true

**Testing Notes**:
- Create test fixtures with various directory states
- Test rollback on migration failure
- Verify no data loss in any scenario
- Test performance with large repositories

## Migration Logic Pseudocode

```bash
# Detect workspace root
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
WRANGLER_DIR="$GIT_ROOT/.wrangler"

# Check if migration should be skipped
if [ "$WRANGLER_SKIP_MIGRATION" = "true" ]; then
  echo "Migration skipped (WRANGLER_SKIP_MIGRATION=true)"
  exit 0
fi

# Check for .wrangler/ directory
if [ ! -d "$WRANGLER_DIR" ]; then
  echo "Creating .wrangler/ directory structure..."
  mkdir -p "$WRANGLER_DIR"

  # Check for legacy directories and migrate
  migrate_directory "$GIT_ROOT/issues" "$WRANGLER_DIR/issues"
  migrate_directory "$GIT_ROOT/specifications" "$WRANGLER_DIR/specifications"
  migrate_directory "$GIT_ROOT/memos" "$WRANGLER_DIR/memos"

  # Migrate governance files
  migrate_governance_files
fi

# Ensure all subdirectories exist
ensure_subdirectories

# Generate .gitignore if missing
generate_gitignore

# Generate cache settings if missing
generate_cache_settings

# Output summary
echo "✓ Initialized .wrangler/ workspace at $WRANGLER_DIR"
```

## Migration Function Logic

```bash
migrate_directory() {
  local source="$1"
  local dest="$2"

  # Skip if source doesn't exist
  if [ ! -d "$source" ]; then
    return 0
  fi

  # Skip if destination already exists
  if [ -d "$dest" ]; then
    echo "⚠ Destination $dest already exists, skipping migration of $source"
    return 0
  fi

  # Count files for logging
  local file_count=$(find "$source" -type f | wc -l)

  echo "Migrating $source → $dest ($file_count files)..."

  # Atomic move operation
  mv "$source" "$dest"

  # Verify move succeeded
  if [ ! -d "$dest" ]; then
    echo "✗ Migration failed: $dest was not created"
    return 1
  fi

  if [ -d "$source" ]; then
    echo "✗ Migration failed: $source still exists"
    return 1
  fi

  echo "✓ Migrated $source → $dest"
  return 0
}
```

## .wrangler/.gitignore Content

```gitignore
# Runtime directories (not git-tracked)
metrics/
cache/
config/

# Keep governance files tracked
!issues/
!specifications/
!memos/
!governance/
!docs/
```

## Error Handling

**Migration Failure Scenarios**:
1. **Destination exists**: Log warning, skip migration, continue
2. **Permission denied**: Log error, provide sudo instructions, exit
3. **Move failed**: Log error, provide manual migration steps, exit
4. **Partial migration**: Complete remaining migrations, log which failed

**Rollback Strategy**:
- If critical error occurs mid-migration, attempt to restore from backup
- If rollback fails, log detailed instructions for manual recovery
- Never leave project in broken state

## Output Examples

**Fresh Installation**:
```
✓ Creating .wrangler/ directory structure
✓ Created .wrangler/issues/
✓ Created .wrangler/specifications/
✓ Created .wrangler/memos/
✓ Created .wrangler/governance/
✓ Created .wrangler/cache/
✓ Generated .wrangler/.gitignore
✓ Generated .wrangler/cache/settings.json
✓ Initialized .wrangler/ workspace at /path/to/project/.wrangler
```

**Legacy Migration**:
```
✓ Detected legacy structure at /path/to/project
✓ Creating .wrangler/ directory
✓ Migrating issues/ → .wrangler/issues/ (42 files)
✓ Migrating specifications/ → .wrangler/specifications/ (7 files)
✓ Migrating memos/ → .wrangler/memos/ (15 files)
✓ Migrating specifications/_CONSTITUTION.md → .wrangler/governance/CONSTITUTION.md
✓ Migrating specifications/_ROADMAP.md → .wrangler/governance/ROADMAP.md
✓ Migration complete
✓ Generated .wrangler/.gitignore
✓ Generated .wrangler/cache/settings.json
✓ Initialized .wrangler/ workspace at /path/to/project/.wrangler
```

**Idempotent Execution**:
```
✓ .wrangler/ directory already exists
✓ All subdirectories present
✓ Initialized .wrangler/ workspace at /path/to/project/.wrangler
```

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000001 - Versioning system (prerequisite)
- #000005 - MCP provider verification (depends on this)
- #000006 - Comprehensive testing (depends on this)

**External Documentation**:
- Bash best practices for atomic operations
- Git worktree documentation

---

**Last Updated**: 2025-11-18
