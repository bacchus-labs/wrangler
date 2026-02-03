---
id: "000006"
title: "Comprehensive testing of .wrangler/ directory refactoring"
type: "issue"
status: "open"
priority: "high"
labels: ["testing", "qa", "phase-6"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "2-3 days"
---

# Comprehensive testing of .wrangler/ directory refactoring

## Description

Perform comprehensive end-to-end testing of all components involved in the `.wrangler/` directory refactoring. This includes version detection, migration, updated skills, MCP tools, and real-world validation with actual repositories.

**Context**: Before release, we must validate that all components work together correctly and that no data loss or workflow breakage occurs in any scenario.

**Background**: Individual components have been implemented and tested in isolation. This issue focuses on integration testing, E2E workflows, and real-world validation.

## Acceptance Criteria

- [ ] **Version detection tested**: Startup skill correctly detects version matches, mismatches, and missing versions
- [ ] **Breaking change detection tested**: Startup skill correctly identifies breaking changes between versions
- [ ] **Update command tested**: `/update-yourself` generates correct migration instructions for all version gaps
- [ ] **Cache settings tested**: Cache settings.json generated correctly with defaults
- [ ] **Migration script tested**: All migration scenarios work without data loss
- [ ] **Skills tested**: All updated skills work with `.wrangler/` structure
- [ ] **MCP tools tested**: All 11 tools work correctly in integration
- [ ] **Version mismatch scenarios tested**: All combinations (1.0→1.1, 1.0→1.3, etc.) handled correctly
- [ ] **Performance validated**: All operations complete within requirements (<5s for <1000 issues)
- [ ] **Real-world testing**: Tested on 3+ actual repositories with varying sizes
- [ ] **No data loss**: Zero data loss in any test scenario
- [ ] **No regressions**: All existing functionality preserved

## Technical Notes

**Implementation Approach**:

1. **Create test fixtures**:
   - Fresh repository (no wrangler)
   - Legacy repository (v1.0.0 structure)
   - Partially migrated repository
   - Large repository (1000+ issues)
   - Repository with custom configuration

2. **Test version detection**:
   - Project at v1.0.0, plugin at v1.1.0
   - Project at v1.1.0, plugin at v1.1.0
   - Project at v1.0.0, plugin at v1.3.0
   - Project missing constitution
   - Project with invalid version string

3. **Test migration**:
   - Fresh installation
   - Legacy migration (full)
   - Partial migration (some dirs exist)
   - Idempotent execution (run twice)
   - With custom configuration
   - With WRANGLER_SKIP_MIGRATION=true

4. **Test updated skills**:
   - Initialize governance
   - Verify governance
   - Check constitutional alignment
   - Refresh metrics
   - Create issue
   - Create specification

5. **Test MCP integration**:
   - Create issue → list → get → update → delete
   - Search across issues
   - Metadata operations
   - Label operations
   - Project operations

6. **Performance testing**:
   - Migration time with various repository sizes
   - MCP operations latency
   - Search performance

7. **Real-world validation**:
   - Test on actual repositories
   - Different project sizes
   - Different initial states

**Files Likely Affected**:
- Test fixtures (new)
- Integration test suite (new or expanded)
- Performance benchmarks (new)

**Dependencies**:
- Blocked by: #000001 (version system)
- Blocked by: #000002 (migration script)
- Blocked by: #000003 (skills updates)
- Blocked by: #000005 (MCP verification)
- Blocks: #000007 (release preparation needs testing complete)
- Related: Specification #000001

**Constraints**:
- Must not modify actual test repositories permanently
- Must be repeatable and deterministic
- Must cover all critical paths
- Must validate data integrity in all cases

## Testing Strategy

**Test Coverage Required**:
- [ ] Unit tests for all new/changed code
- [ ] Integration tests for cross-component workflows
- [ ] E2E tests for complete user journeys
- [ ] Performance tests for scalability
- [ ] Real-world tests for validation
- [ ] Edge cases comprehensively covered
- [ ] Regression tests for existing functionality

**Testing Notes**:
- Use temporary directories for test fixtures
- Clean up after tests
- Mock file system operations where appropriate
- Use real file system for integration tests

## Test Scenarios

### Scenario 1: Fresh Installation

**Setup**: Empty git repository, no wrangler files

**Actions**:
1. Run session hook
2. Run startup skill
3. Create issue via MCP
4. Initialize governance
5. Verify governance

**Expected**:
- `.wrangler/` structure created
- Startup skill reports SUCCESS (fresh install)
- Issue created in `.wrangler/issues/`
- Governance files in `.wrangler/governance/`
- All verification passes

**Data to verify**:
- Directory structure matches specification
- `.wrangler/.gitignore` exists with correct content
- `.wrangler/cache/settings.json` exists with defaults
- No errors or warnings

### Scenario 2: Legacy Structure Migration (v1.0.0)

**Setup**: Repository with:
- `issues/000001-example.md`
- `specifications/000001-example.md`
- `specifications/_CONSTITUTION.md` (no version field)
- `specifications/_ROADMAP.md`
- `memos/2025-11-18-example.md`

**Actions**:
1. Run session hook
2. Run startup skill
3. Run `/update-yourself`
4. Verify all files migrated
5. Verify constitution updated with version

**Expected**:
- All directories migrated to `.wrangler/`
- Constitution moved to `.wrangler/governance/CONSTITUTION.md`
- Startup skill reports OUTDATED (1.0.0 → 1.1.0)
- `/update-yourself` provides migration instructions
- All files preserved exactly
- Old directories removed

**Data to verify**:
- File count matches before/after
- All frontmatter preserved
- Issue IDs unchanged
- No data loss

### Scenario 3: Partial Migration

**Setup**: Repository with:
- `.wrangler/issues/` (already migrated)
- `specifications/` (not migrated)
- `memos/` (not migrated)

**Actions**:
1. Run session hook
2. Verify partial migration
3. Ensure no errors

**Expected**:
- Existing `.wrangler/issues/` unchanged
- `specifications/` migrated to `.wrangler/specifications/`
- `memos/` migrated to `.wrangler/memos/`
- No duplicate files

**Data to verify**:
- No files lost
- No files duplicated
- Directory structure complete

### Scenario 4: Idempotent Execution

**Setup**: Repository with complete `.wrangler/` structure

**Actions**:
1. Run session hook (first time)
2. Run session hook (second time)
3. Run session hook (third time)

**Expected**:
- First run: "Already initialized" message
- Second run: Same message, no errors
- Third run: Same message, no errors
- No file modifications
- Fast execution (<1s)

**Data to verify**:
- File timestamps unchanged
- No duplicate directories
- No errors

### Scenario 5: Version Mismatch Detection (1.0.0 → 1.1.0)

**Setup**: Constitution with `wranglerVersion: "1.0.0"`

**Actions**:
1. Run startup skill
2. Capture output

**Expected**:
- Status: OUTDATED
- Message: "Project at v1.0.0, current v1.1.0 (1 release behind)"
- Breaking changes: Listed
- Recommendation: "Run `/update-yourself`"

**Data to verify**:
- Correct version comparison
- Breaking changes identified
- Clear user guidance

### Scenario 6: Version Mismatch Detection (1.0.0 → 1.3.0)

**Setup**: Constitution with `wranglerVersion: "1.0.0"`, plugin at v1.3.0

**Actions**:
1. Run startup skill
2. Run `/update-yourself`

**Expected**:
- Status: OUTDATED
- Message: "Project at v1.0.0, current v1.3.0 (3 releases behind)"
- Breaking changes: Multiple releases listed
- Migration plan: Multi-step (1.0→1.1, 1.1→1.2, 1.2→1.3)

**Data to verify**:
- All intermediate releases considered
- Migration plan comprehensive
- Each step has verification

### Scenario 7: No Breaking Changes (1.1.0 → 1.2.0)

**Setup**: Constitution at v1.1.0, plugin at v1.2.0, no breaking changes in v1.2.0

**Actions**:
1. Run startup skill

**Expected**:
- Status: WARN
- Message: "Update available (v1.2.0) but no breaking changes"
- Recommendation: "Consider updating, not critical"

**Data to verify**:
- Correct severity (warning not error)
- User not alarmed
- Update optional

### Scenario 8: Version Match (1.1.0 → 1.1.0)

**Setup**: Constitution at v1.1.0, plugin at v1.1.0

**Actions**:
1. Run startup skill

**Expected**:
- Status: SUCCESS
- Message: "All good, fully upgraded"
- No further action needed

**Data to verify**:
- Clean exit
- No warnings
- User confident

### Scenario 9: Missing Constitution

**Setup**: No constitution file exists

**Actions**:
1. Run startup skill

**Expected**:
- Assumes v1.0.0 (pre-versioning)
- Status: OUTDATED
- Recommendation: Run `/update-yourself`

**Data to verify**:
- Graceful handling of missing file
- Clear user guidance

### Scenario 10: Large Repository Migration

**Setup**: Repository with 1000 issues, 100 specs, 50 memos

**Actions**:
1. Run session hook
2. Measure migration time
3. Verify all files migrated

**Expected**:
- Migration completes in <5 seconds
- All 1150 files migrated
- No data loss
- No errors

**Data to verify**:
- Performance requirement met
- File count matches
- All frontmatter preserved

### Scenario 11: Custom Configuration

**Setup**: MCP config with `issuesDirectory: "custom/path"`

**Actions**:
1. Run session hook
2. Create issue via MCP
3. Verify location

**Expected**:
- Session hook creates `.wrangler/` (default behavior)
- MCP respects custom config
- Issue created in `custom/path`, not `.wrangler/issues/`

**Data to verify**:
- Configuration override works
- Default and custom paths coexist

### Scenario 12: WRANGLER_SKIP_MIGRATION

**Setup**: Legacy structure, `WRANGLER_SKIP_MIGRATION=true`

**Actions**:
1. Run session hook

**Expected**:
- Migration skipped
- Legacy structure unchanged
- Message: "Migration skipped"

**Data to verify**:
- Opt-out works
- No files moved

### Scenario 13: Skills Integration

**Setup**: Fresh `.wrangler/` structure

**Actions**:
1. Run `/wrangler:initialize-governance`
2. Run `/wrangler:verify-governance`
3. Run `/wrangler:check-constitutional-alignment`
4. Run `/wrangler:refresh-metrics`

**Expected**:
- Initialize creates files in `.wrangler/governance/`
- Verify validates `.wrangler/` structure
- Constitutional alignment reads from `.wrangler/governance/`
- Metrics scan `.wrangler/issues/` and `.wrangler/specifications/`

**Data to verify**:
- All skills use correct paths
- No errors
- Output references `.wrangler/`

### Scenario 14: MCP E2E Workflow

**Setup**: Complete `.wrangler/` structure

**Actions**:
1. Create issue via `issues_create`
2. List issues via `issues_list`
3. Get issue via `issues_get`
4. Update issue via `issues_update`
5. Add label via `issues_labels`
6. Search for issue via `issues_search`
7. Mark complete via `issues_mark_complete`
8. Verify complete via `issues_all_complete`

**Expected**:
- All operations succeed
- Issue stored in `.wrangler/issues/`
- All data consistent
- No errors

**Data to verify**:
- Full workflow works
- Data integrity maintained
- Correct paths used

### Scenario 15: Real-World Repository 1 (Small Project)

**Setup**: Actual small project with ~10 issues

**Actions**:
1. Run migration
2. Run all skills
3. Use MCP tools
4. Verify project still works

**Expected**:
- Migration successful
- Project functional
- No data loss
- No workflow breakage

**Data to verify**:
- Real-world validation
- User workflows preserved

### Scenario 16: Real-World Repository 2 (Medium Project)

**Setup**: Actual medium project with ~100 issues

**Expected**: Same as Scenario 15, scaled up

### Scenario 17: Real-World Repository 3 (Large Project)

**Setup**: Actual large project with ~500 issues

**Expected**: Same as Scenario 15, scaled up, performance validated

## Performance Benchmarks

**Migration Performance**:
- 10 files: <1s
- 100 files: <2s
- 1000 files: <5s
- 5000 files: <30s

**MCP Operations (with .wrangler/)**:
- Create issue: <100ms
- List 100 issues: <500ms
- Search 1000 issues: <1s
- Get single issue: <50ms

**Startup Skill**:
- Version detection: <1s
- Breaking change check: <1s

**Skills**:
- Initialize governance: <2s
- Verify governance: <1s
- Constitutional alignment: <500ms

## Data Integrity Checks

For each migration scenario:

1. **File count matches**:
   ```bash
   # Before migration
   BEFORE=$(find issues/ specifications/ memos/ -type f | wc -l)

   # After migration
   AFTER=$(find .wrangler/issues/ .wrangler/specifications/ .wrangler/memos/ -type f | wc -l)

   # Should match
   [ "$BEFORE" -eq "$AFTER" ]
   ```

2. **Frontmatter preserved**:
   - Extract all issue IDs before/after
   - Verify all IDs present
   - Verify no ID changes

3. **Content unchanged**:
   - Checksum files before/after (optional)
   - Verify markdown body identical

4. **Git history preserved**:
   - Check `git log` still shows history
   - Rename operations visible in git

## Regression Tests

**Verify no regressions**:
- [ ] All 233 existing MCP tests pass
- [ ] All existing skills still work
- [ ] MCP provider performance unchanged
- [ ] Security checks still effective
- [ ] Configuration overrides still work
- [ ] Backward compatibility maintained

## Test Automation

**Automated test suite**:

```bash
#!/bin/bash
# test-wrangler-refactoring.sh

# Create test workspace
setup_test_workspace() { ... }

# Test fresh installation
test_fresh_install() { ... }

# Test legacy migration
test_legacy_migration() { ... }

# Test partial migration
test_partial_migration() { ... }

# Test idempotent execution
test_idempotent() { ... }

# Test version detection
test_version_detection() { ... }

# Test skills integration
test_skills() { ... }

# Test MCP integration
test_mcp() { ... }

# Performance benchmarks
test_performance() { ... }

# Run all tests
run_all_tests() {
  test_fresh_install
  test_legacy_migration
  test_partial_migration
  test_idempotent
  test_version_detection
  test_skills
  test_mcp
  test_performance
}

run_all_tests
```

## Manual Testing Checklist

- [ ] Fresh installation on clean repository
- [ ] Legacy migration on real v1.0.0 project
- [ ] Partial migration scenario
- [ ] Idempotent execution (run hook 3x)
- [ ] Version detection (all scenarios)
- [ ] `/update-yourself` command output quality
- [ ] All skills with `.wrangler/` structure
- [ ] All 11 MCP tools
- [ ] Real-world repository 1 (small)
- [ ] Real-world repository 2 (medium)
- [ ] Real-world repository 3 (large)
- [ ] Performance benchmarks
- [ ] Data integrity validation
- [ ] Regression testing

## Success Criteria

**Pass Criteria**:
- All automated tests pass
- All manual test scenarios pass
- No data loss in any scenario
- Performance requirements met
- Real-world repositories work correctly
- No regressions detected

**Failure Criteria** (any of these = block release):
- Data loss in any scenario
- Performance degradation >5%
- Regression in existing functionality
- Real-world repository breaks
- Migration fails with error

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000001 - Versioning system (tested here)
- #000002 - Session hook migration (tested here)
- #000003 - Skills updates (tested here)
- #000005 - MCP verification (tested here)
- #000007 - Release preparation (depends on this)

**External Documentation**:
- Testing best practices
- Data integrity validation techniques

---

**Last Updated**: 2025-11-18
