---
id: "000005"
title: "Verify MCP provider works with .wrangler/ paths"
type: "issue"
status: "open"
priority: "high"
labels: ["mcp", "testing", "verification", "phase-5"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "1 day"
---

# Verify MCP provider works with .wrangler/ paths

## Description

Verify that the MCP provider correctly uses the new `.wrangler/` directory structure and that all 11 MCP tools function properly with the updated paths. Ensure configuration overrides still work and security checks remain effective.

**Context**: The MCP provider already defines defaults pointing to `.wrangler/` subdirectories, but we need to verify this works correctly in practice and that no regressions were introduced.

**Background**: The MCP provider code shows `DEFAULT_ISSUE_DIR = '.wrangler/issues'` and `DEFAULT_SPEC_DIR = '.wrangler/specifications'`, which suggests the refactoring was anticipated. However, we must verify all code paths work correctly.

## Acceptance Criteria

- [ ] **Default paths verified**: Confirmed `DEFAULT_ISSUE_DIR` and `DEFAULT_SPEC_DIR` point to `.wrangler/` subdirectories
- [ ] **Path resolution tested**: All path resolution logic works with new structure
- [ ] **Configuration overrides work**: Custom paths via config still function correctly
- [ ] **Security checks pass**: Path traversal prevention still effective with `.wrangler/` paths
- [ ] **All 11 tools tested**: Each MCP tool works correctly with `.wrangler/` structure
- [ ] **No regressions**: All existing tests pass without modification
- [ ] **Performance unchanged**: No performance degradation from path changes
- [ ] **Error messages accurate**: Error messages reference correct paths

## Technical Notes

**Implementation Approach**:

1. Review MCP provider source code:
   - Verify default directory constants
   - Check path resolution logic
   - Verify security checks apply to new paths

2. Run existing test suite:
   - All 233 tests should pass without changes
   - If any fail, investigate and fix

3. Test each of 11 MCP tools:
   - issues_create
   - issues_list
   - issues_search
   - issues_get
   - issues_update
   - issues_delete
   - issues_labels
   - issues_metadata
   - issues_projects
   - issues_mark_complete
   - issues_all_complete

4. Test configuration overrides:
   - Custom `issuesDirectory` setting
   - Custom `specificationsDirectory` setting
   - Ensure defaults work when config not provided

5. Test security:
   - Path traversal attempts still blocked
   - Workspace boundary enforcement

6. Performance testing:
   - Measure operations before/after (should be identical)
   - Path depth shouldn't impact performance

**Files Likely Affected**:
- `mcp/providers/markdown.ts` (review only)
- `mcp/server.ts` (review only)
- `mcp/__tests__/**/*.test.ts` (verify all pass)

**Dependencies**:
- Blocked by: #000002 (migration script must create `.wrangler/` structure)
- Blocks: #000006 (comprehensive testing needs MCP verification)
- Related: Specification #000001

**Constraints**:
- Must not break backward compatibility with config overrides
- Must maintain existing security posture
- Must maintain or improve current test coverage (87.11%)
- Must maintain performance characteristics

## Testing Strategy

**Test Coverage Required**:
- [ ] Unit tests for path resolution with `.wrangler/` paths
- [ ] Integration tests for all 11 MCP tools
- [ ] Configuration override tests
- [ ] Security tests (path traversal prevention)
- [ ] Edge cases:
  - Empty `.wrangler/issues/` directory
  - Large `.wrangler/` structure (1000+ issues)
  - Custom config pointing to non-`.wrangler/` paths
  - Path traversal attempts via `.wrangler/../../../etc`
  - Symlinks within `.wrangler/`

**Testing Notes**:
- Run full test suite first to ensure no regressions
- Test manually with real `.wrangler/` structure
- Verify error messages are helpful

## MCP Provider Code Review Checklist

**Constants to verify**:
```typescript
// In mcp/providers/markdown.ts
const DEFAULT_ISSUE_DIR = '.wrangler/issues';      // Verify this
const DEFAULT_SPEC_DIR = '.wrangler/specifications'; // Verify this
```

**Path resolution to verify**:
```typescript
// Ensure these work correctly with .wrangler/ paths
- getIssuesDirectory()
- getSpecificationsDirectory()
- resolveIssuePath()
- resolveSpecificationPath()
```

**Security to verify**:
```typescript
// Ensure this still applies to .wrangler/ subdirectories
private assertWithinWorkspace(targetPath: string, action: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(this.basePath, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Attempted to ${action} outside of workspace`);
  }
}
```

**Configuration to verify**:
```typescript
interface MarkdownProviderSettings {
  basePath?: string;
  issuesDirectory?: string;          // Should default to '.wrangler/issues'
  specificationsDirectory?: string;  // Should default to '.wrangler/specifications'
}
```

## Test Plan for Each MCP Tool

### Tool: issues_create

**Test Cases**:
- [ ] Creates issue in `.wrangler/issues/` by default
- [ ] Creates specification in `.wrangler/specifications/` when type="specification"
- [ ] Respects custom config if provided
- [ ] Generates correct file path
- [ ] Returns correct issue ID

### Tool: issues_list

**Test Cases**:
- [ ] Lists issues from `.wrangler/issues/` by default
- [ ] Lists specifications from `.wrangler/specifications/` when type="specification"
- [ ] Filters work correctly
- [ ] Pagination works correctly
- [ ] Returns correct issue count

### Tool: issues_search

**Test Cases**:
- [ ] Searches in `.wrangler/issues/` by default
- [ ] Full-text search works across all fields
- [ ] Filters combine correctly with search
- [ ] Returns relevant results

### Tool: issues_get

**Test Cases**:
- [ ] Retrieves issue from `.wrangler/issues/` by ID
- [ ] Retrieves specification from `.wrangler/specifications/` by ID
- [ ] Returns 404 for missing issues
- [ ] Returns full content and frontmatter

### Tool: issues_update

**Test Cases**:
- [ ] Updates issue in `.wrangler/issues/`
- [ ] Updates specification in `.wrangler/specifications/`
- [ ] Preserves file location
- [ ] Updates frontmatter correctly
- [ ] Maintains file permissions

### Tool: issues_delete

**Test Cases**:
- [ ] Deletes issue from `.wrangler/issues/`
- [ ] Requires confirmation flag
- [ ] Returns error for missing issues
- [ ] File actually removed from filesystem

### Tool: issues_labels

**Test Cases**:
- [ ] Lists labels from `.wrangler/issues/`
- [ ] Adds labels to issues in `.wrangler/issues/`
- [ ] Removes labels from issues in `.wrangler/issues/`
- [ ] Handles label operations correctly

### Tool: issues_metadata

**Test Cases**:
- [ ] Reads metadata from `.wrangler/issues/`
- [ ] Sets metadata on issues in `.wrangler/issues/`
- [ ] Removes metadata correctly
- [ ] wranglerContext preserved

### Tool: issues_projects

**Test Cases**:
- [ ] Lists projects from `.wrangler/issues/`
- [ ] Assigns project to issue in `.wrangler/issues/`
- [ ] Removes project assignment
- [ ] Filters by project work

### Tool: issues_mark_complete

**Test Cases**:
- [ ] Marks issue complete in `.wrangler/issues/`
- [ ] Updates status to "closed"
- [ ] Appends completion note if provided
- [ ] Updates updatedAt timestamp

### Tool: issues_all_complete

**Test Cases**:
- [ ] Checks completion across `.wrangler/issues/`
- [ ] Filters work correctly
- [ ] Returns accurate completion statistics
- [ ] Handles empty directory

## Configuration Override Tests

**Test custom issuesDirectory**:
```typescript
const config = {
  issuesDirectory: 'custom/issues'
};
// Verify issues created in custom/issues, not .wrangler/issues
```

**Test custom specificationsDirectory**:
```typescript
const config = {
  specificationsDirectory: 'custom/specs'
};
// Verify specs created in custom/specs, not .wrangler/specifications
```

**Test custom basePath**:
```typescript
const config = {
  basePath: '/custom/workspace'
};
// Verify .wrangler/ resolved relative to custom base
```

## Security Tests

**Path traversal attempts**:
```typescript
// All of these should be rejected:
- '.wrangler/../../../etc/passwd'
- '.wrangler/issues/../../etc/passwd'
- '/etc/passwd'
- '../outside-workspace'
```

**Symlink handling**:
- Symlinks within `.wrangler/` should be followed
- Symlinks pointing outside workspace should be rejected

## Performance Benchmarks

**Baseline** (with old structure):
- Create issue: ~X ms
- List 100 issues: ~X ms
- Search across 1000 issues: ~X ms

**New** (with `.wrangler/` structure):
- Create issue: ~X ms (should be same)
- List 100 issues: ~X ms (should be same)
- Search across 1000 issues: ~X ms (should be same)

**Acceptable variance**: ±5%

## Error Message Verification

Ensure error messages reference correct paths:

**Before**:
```
Error: Issue not found at issues/000001-example.md
```

**After**:
```
Error: Issue not found at .wrangler/issues/000001-example.md
```

## Verification Checklist

- [ ] All 233 existing tests pass
- [ ] All 11 MCP tools tested manually
- [ ] Configuration overrides verified
- [ ] Security checks verified
- [ ] Performance benchmarks within 5%
- [ ] Error messages accurate
- [ ] No code changes needed (just verification)
- [ ] Documentation matches behavior

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000002 - Session hook migration (creates structure that MCP uses)
- #000006 - Comprehensive testing (builds on this verification)

**External Documentation**:
- MCP Provider Implementation: `mcp/providers/markdown.ts`
- MCP Test Suite: `mcp/__tests__/`
- MCP Documentation: `docs/MCP-USAGE.md`

---

**Last Updated**: 2025-11-18
