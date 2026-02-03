---
id: "000001"
title: "Implement versioning system infrastructure"
type: "issue"
status: "open"
priority: "critical"
labels: ["versioning", "infrastructure", "governance", "phase-1"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "1-2 days"
---

# Implement versioning system infrastructure

## Description

Create the core versioning infrastructure to enable automatic version detection and self-updating migration system for wrangler projects. This is the foundation for tracking wrangler versions across projects and providing LLM-driven migration instructions.

**Context**: As wrangler evolves with new features and breaking changes, projects need a way to stay current without manual tracking. This versioning system enables projects to know when they're out of date and receive automated migration guidance.

**Background**: This is Phase 1 of the centralized `.wrangler/` directory refactoring (specification #000001). The versioning system must be in place before migration can happen, as it enables projects to track which wrangler version they're currently using.

## Acceptance Criteria

- [ ] **Release notes directory exists**: `skills/.wrangler-releases/` directory created in wrangler plugin
- [ ] **CURRENT_VERSION file**: File containing "1.1.0" exists at `skills/.wrangler-releases/CURRENT_VERSION`
- [ ] **Retrospective 1.0.0 release note**: `skills/.wrangler-releases/1.0.0.md` created documenting initial release
- [ ] **New 1.1.0 release note**: `skills/.wrangler-releases/1.1.0.md` created documenting .wrangler/ directory changes with breaking changes flagged
- [ ] **Startup skill created**: `skills/wrangler/startup-checklist/SKILL.md` detects version mismatches and reports SUCCESS/WARN/OUTDATED
- [ ] **Update-yourself command**: `commands/update-yourself.md` generates LLM-friendly migration instructions
- [ ] **Constitution template updated**: Template includes `wranglerVersion` field in frontmatter
- [ ] **Cache settings template**: Default `.wrangler/cache/settings.json` template created with sensible defaults

## Technical Notes

**Implementation Approach**:

1. Create release notes directory structure
2. Write 1.0.0.md release note (retrospective documentation)
3. Write 1.1.0.md release note with breaking changes
4. Create CURRENT_VERSION file
5. Implement startup skill with version detection logic
6. Implement /update-yourself command with migration instruction generation
7. Update constitution template with version frontmatter
8. Create cache settings JSON template

**Files Likely Affected**:
- `skills/.wrangler-releases/` (new directory)
- `skills/.wrangler-releases/CURRENT_VERSION` (new file)
- `skills/.wrangler-releases/1.0.0.md` (new file)
- `skills/.wrangler-releases/1.1.0.md` (new file)
- `skills/wrangler/startup-checklist/SKILL.md` (new file)
- `commands/update-yourself.md` (new file)
- `skills/governance/templates/constitution.md` (update)
- Template for `.wrangler/cache/settings.json` (new)

**Dependencies**:
- Blocks: #000002 (session hook migration needs version system)
- Blocks: #000003 (skills updates need version tracking)
- Blocked by: None (foundational work)
- Related: Specification #000001 (parent spec)

**Constraints**:
- Version detection must work with missing constitution files (assume v1.0.0)
- Startup skill must complete quickly (<1 second for version check)
- Release notes must clearly flag breaking changes in frontmatter
- Migration instructions must be optimized for AI execution, not bash scripts

## Testing Strategy

**Test Coverage Required**:
- [ ] Unit tests for version comparison logic (1.0.0 vs 1.1.0, etc.)
- [ ] Integration tests for startup skill execution (match, behind, missing cases)
- [ ] Integration tests for /update-yourself command output
- [ ] Edge cases:
  - Missing constitution file (should assume v1.0.0)
  - Missing wranglerVersion field (should assume v1.0.0)
  - Project ahead of plugin version (shouldn't happen, but handle gracefully)
  - Multiple breaking changes between versions (e.g., 1.0 → 1.3)

**Testing Notes**:
- Startup skill must be testable without actually modifying project files
- Version detection should be read-only operation
- Test output format of /update-yourself to ensure it's LLM-friendly

## Startup Skill Workflow

The startup skill should implement this logic:

1. **Read Project Version**
   - Check `.wrangler/governance/CONSTITUTION.md` frontmatter for `wranglerVersion`
   - If missing, check legacy location `specifications/_CONSTITUTION.md`
   - If still missing, assume v1.0.0 (pre-versioning)

2. **Read Current Wrangler Version**
   - Read `skills/.wrangler-releases/CURRENT_VERSION` from plugin directory
   - This is the latest available wrangler version

3. **Compare Versions**
   - If versions match → ✅ SUCCESS, exit with "All good, fully upgraded"
   - If project version < wrangler version → Check for breaking changes

4. **Check for Breaking Changes**
   - List all release notes between project version and current version
   - Example: Project at 1.0.0, current 1.3.0 → check 1.1.0.md, 1.2.0.md, 1.3.0.md
   - Filter for releases with `breakingChanges: true` in frontmatter

5. **Report Status**
   - If no breaking changes → ⚠️ WARN, recommend update but not critical
   - If breaking changes exist → ❌ OUTDATED, report details and recommend `/update-yourself`

## Release Note Structure

Each release note should follow this format:

```markdown
---
version: "1.1.0"
releaseDate: "2025-11-18"
breakingChanges: true
migrationRequired: true
---

# Wrangler v1.1.0 - [Title]

## Breaking Changes

- [List all breaking changes]

## Migration Requirements

See `/update-yourself` command for automated migration instructions.

## New Features

- [List new features]

## Affected Skills

- [List skills that changed]
```

## Cache Settings Template

Default `.wrangler/cache/settings.json`:

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

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000002 - Session hook migration (depends on this)
- #000003 - Skills and templates updates (depends on this)

**External Documentation**:
- Semantic Versioning: https://semver.org/
- Constitution pattern from spec-kit

---

**Last Updated**: 2025-11-18
