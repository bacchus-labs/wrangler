---
id: "000003"
title: "Update skills and templates for .wrangler/ paths"
type: "issue"
status: "open"
priority: "high"
labels: ["skills", "templates", "refactoring", "phase-3"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "1-2 days"
---

# Update skills and templates for .wrangler/ paths

## Description

Update all wrangler skills and templates to reference the new `.wrangler/` directory structure instead of root-level paths. This ensures consistent usage of the centralized directory structure across all wrangler workflows.

**Context**: After migrating governance files to `.wrangler/`, all skills must be updated to reference the new paths. Skills are the primary interface for users, so accurate path references are critical.

**Background**: Currently, skills reference paths like `issues/`, `specifications/`, and `specifications/_CONSTITUTION.md`. These must change to `.wrangler/issues/`, `.wrangler/specifications/`, and `.wrangler/governance/CONSTITUTION.md`.

## Acceptance Criteria

- [ ] **Initialize governance skill**: `skills/governance/initialize-governance/SKILL.md` updated to create files in `.wrangler/governance/`
- [ ] **Verify governance skill**: `skills/governance/verify-governance/SKILL.md` updated to check `.wrangler/` structure
- [ ] **Constitutional alignment skill**: `skills/governance/check-constitutional-alignment/SKILL.md` updated to read from `.wrangler/governance/CONSTITUTION.md`
- [ ] **Refresh metrics skill**: `skills/governance/refresh-metrics/SKILL.md` updated to scan `.wrangler/issues/` and `.wrangler/specifications/`
- [ ] **Create issue skill**: Updated to reference `.wrangler/issues/` in examples
- [ ] **Writing specifications skill**: Updated to reference `.wrangler/specifications/` in examples
- [ ] **All governance templates**: Updated to reflect new directory structure
- [ ] **Constitution template**: Includes `wranglerVersion` field in frontmatter
- [ ] **No remaining hardcoded paths**: Comprehensive search finds no remaining root-level path references
- [ ] **Backward compatibility notes**: Skills include notes about legacy structure for transition period

## Technical Notes

**Implementation Approach**:

1. Search all skills for hardcoded path references:
   - `issues/`
   - `specifications/`
   - `memos/`
   - `specifications/_CONSTITUTION.md`
   - `specifications/_ROADMAP.md`

2. Update each skill file systematically:
   - Replace paths with `.wrangler/` equivalents
   - Update example commands
   - Update file path references
   - Update directory structure diagrams

3. Update all templates:
   - Constitution template (add version frontmatter)
   - Roadmap template
   - Issue template (if needed)
   - Specification template (if needed)

4. Verify completeness:
   - Run comprehensive grep to find any remaining old paths
   - Check all README files
   - Check all example code

**Files Likely Affected**:
- `skills/governance/initialize-governance/SKILL.md`
- `skills/governance/verify-governance/SKILL.md`
- `skills/governance/check-constitutional-alignment/SKILL.md`
- `skills/governance/refresh-metrics/SKILL.md`
- `skills/create-new-issue/SKILL.md` (if exists)
- `skills/writing-specifications/SKILL.md` (if exists)
- `skills/governance/templates/constitution.md`
- `skills/governance/templates/roadmap.md`
- `skills/governance/templates/issue.md`
- `skills/governance/templates/specification.md`
- Any other skills with governance references

**Dependencies**:
- Blocked by: #000001 (needs version system for constitution template)
- Blocks: #000004 (documentation updates reference these skills)
- Related: #000002 (migration script), Specification #000001

**Constraints**:
- Must maintain backward compatibility notes during transition
- Must not break existing workflows
- Example paths must be absolute where appropriate
- All path changes must be consistent across all skills

## Testing Strategy

**Test Coverage Required**:
- [ ] Search tests for remaining old path references
- [ ] Manual verification of each updated skill
- [ ] Test that initialize-governance creates files in correct locations
- [ ] Test that verify-governance validates `.wrangler/` structure
- [ ] Edge cases:
  - Skills running on legacy structure (should they warn?)
  - Skills running on fresh `.wrangler/` structure
  - Mixed scenarios (some files migrated, some not)

**Testing Notes**:
- Use grep/ripgrep to exhaustively search for old paths
- Test each skill manually in a test project
- Verify templates generate correct paths

## Search Patterns

**Find all hardcoded path references**:

```bash
# Search for old paths in skills
rg 'issues/' skills/ --type md
rg 'specifications/' skills/ --type md
rg 'memos/' skills/ --type md
rg '_CONSTITUTION\.md' skills/ --type md
rg '_ROADMAP\.md' skills/ --type md

# Search for old paths in templates
rg 'issues/' skills/governance/templates/ --type md
rg 'specifications/' skills/governance/templates/ --type md

# Search for old paths in commands
rg 'issues/' commands/ --type md
rg 'specifications/' commands/ --type md
```

## Replacement Patterns

**Old Path → New Path**:
- `issues/` → `.wrangler/issues/`
- `specifications/` → `.wrangler/specifications/`
- `memos/` → `.wrangler/memos/`
- `specifications/_CONSTITUTION.md` → `.wrangler/governance/CONSTITUTION.md`
- `specifications/_ROADMAP.md` → `.wrangler/governance/ROADMAP.md`
- `specifications/_ROADMAP__NEXT_STEPS.md` → `.wrangler/governance/ROADMAP__NEXT_STEPS.md`

## Specific Skill Updates

### Initialize Governance Skill

**Current behavior**: Creates constitution at `specifications/_CONSTITUTION.md`

**New behavior**:
- Creates constitution at `.wrangler/governance/CONSTITUTION.md`
- Creates roadmap at `.wrangler/governance/ROADMAP.md`
- Creates next steps at `.wrangler/governance/ROADMAP__NEXT_STEPS.md`
- Ensures `.wrangler/governance/` directory exists
- Includes `wranglerVersion` in constitution frontmatter

### Verify Governance Skill

**Current behavior**: Checks for `specifications/_CONSTITUTION.md`

**New behavior**:
- Checks for `.wrangler/governance/CONSTITUTION.md`
- Validates `.wrangler/` directory structure
- Verifies all required subdirectories exist
- Checks for legacy structure and warns if found
- Validates constitution includes `wranglerVersion` field

### Check Constitutional Alignment Skill

**Current behavior**: Reads `specifications/_CONSTITUTION.md`

**New behavior**:
- Reads `.wrangler/governance/CONSTITUTION.md`
- Falls back to legacy path with deprecation warning
- Reports constitution version in output

### Refresh Metrics Skill

**Current behavior**: Scans `issues/` and `specifications/`

**New behavior**:
- Scans `.wrangler/issues/` and `.wrangler/specifications/`
- Handles legacy paths with warning
- Updates metrics in appropriate location

## Template Updates

### Constitution Template

**Add to frontmatter**:
```yaml
---
wranglerVersion: "1.1.0"
lastUpdated: "YYYY-MM-DD"
---
```

**Update all path references in template body**

### Roadmap Template

**Update all example paths**:
- Issue references: `.wrangler/issues/000001-example.md`
- Spec references: `.wrangler/specifications/000001-example.md`

### Issue/Specification Templates

**Update references section**:
```markdown
## References

**Specification**: .wrangler/specifications/000001-example.md
**Related Issues**: .wrangler/issues/000002-example.md
```

## Backward Compatibility Notes

Include in relevant skills:

```markdown
## Legacy Structure Support

During the transition period (until v2.0.0), wrangler supports both:
- **Current**: `.wrangler/governance/CONSTITUTION.md`
- **Legacy**: `specifications/_CONSTITUTION.md` (deprecated)

If using the legacy structure, run your project's session hook to automatically migrate.
```

## Verification Checklist

After updates complete:

- [ ] Run `rg 'issues/' skills/ --type md` → should only find `.wrangler/issues/`
- [ ] Run `rg 'specifications/' skills/ --type md` → should only find `.wrangler/specifications/`
- [ ] Run `rg '_CONSTITUTION\.md' skills/ --type md` → should only find in `.wrangler/governance/`
- [ ] Manual review of each updated skill
- [ ] Test initialize-governance in fresh project
- [ ] Test verify-governance in fresh project
- [ ] Test all skills in migrated project
- [ ] Verify all templates generate correct paths

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000001 - Versioning system (prerequisite for constitution template)
- #000002 - Session hook migration (creates the new structure)
- #000004 - Documentation updates (references these skills)

**External Documentation**:
- Ripgrep documentation for search patterns

---

**Last Updated**: 2025-11-18
