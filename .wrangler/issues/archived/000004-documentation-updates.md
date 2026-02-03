---
id: "000004"
title: "Update all documentation for .wrangler/ directory structure"
type: "issue"
status: "open"
priority: "medium"
labels: ["documentation", "phase-4"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "1 day"
---

# Update all documentation for .wrangler/ directory structure

## Description

Update all wrangler documentation to reflect the new `.wrangler/` directory structure. This includes project context files, user guides, architecture diagrams, and creating a comprehensive migration guide.

**Context**: Documentation is the primary reference for users. All documentation must accurately reflect the new `.wrangler/` structure to avoid confusion and ensure successful adoption.

**Background**: Multiple documentation files reference the old directory structure. These must be systematically updated to show `.wrangler/` paths and explain the migration process.

## Acceptance Criteria

- [ ] **CLAUDE.md updated**: All path references changed to `.wrangler/` structure
- [ ] **MCP-USAGE.md updated**: Directory structure diagrams show `.wrangler/` layout
- [ ] **README.md updated**: Quick start uses `.wrangler/` paths
- [ ] **Architecture diagrams updated**: Visual representations show new structure
- [ ] **Migration guide created**: `docs/migration-to-wrangler-directory.md` provides comprehensive migration guidance
- [ ] **FAQ section created**: Common migration questions answered
- [ ] **No old path references**: Documentation contains no references to root-level `issues/`, `specifications/`, etc. (except in migration context)
- [ ] **Backward compatibility noted**: Documentation clearly indicates transition period support

## Technical Notes

**Implementation Approach**:

1. Update CLAUDE.md:
   - Replace all directory structure diagrams
   - Update path references throughout
   - Add migration notice at top
   - Update governance framework section

2. Update docs/MCP-USAGE.md:
   - Update directory structure diagrams
   - Update all example paths in tool usage
   - Update troubleshooting section

3. Update README.md:
   - Update quick start paths
   - Add `.wrangler/` explanation
   - Update feature list if needed

4. Create migration guide:
   - Explain why the change happened
   - Show before/after structure
   - Explain automatic migration
   - Provide manual migration steps
   - Include troubleshooting

5. Add FAQ section:
   - What happened to my issues/ directory?
   - Do I need to do anything?
   - Can I opt-out?
   - How do I verify migration worked?
   - What about CI/CD scripts?

**Files Likely Affected**:
- `/Users/sam/code/wrangler/CLAUDE.md` (major update)
- `/Users/sam/code/wrangler/docs/MCP-USAGE.md` (major update)
- `/Users/sam/code/wrangler/README.md` (moderate update)
- `/Users/sam/code/wrangler/docs/migration-to-wrangler-directory.md` (new file)
- Any architecture diagrams (updates)

**Dependencies**:
- Blocked by: #000003 (skills updates referenced in docs)
- Related: #000002 (migration script documented here)
- Related: Specification #000001

**Constraints**:
- Documentation must be clear for both new and existing users
- Migration guide must be comprehensive but concise
- All examples must use absolute paths where appropriate
- Diagrams must be accurate and up-to-date

## Testing Strategy

**Test Coverage Required**:
- [ ] Search tests for old path references in documentation
- [ ] Manual review of all updated docs
- [ ] Verify all links work (internal and external)
- [ ] Edge cases:
  - Documentation mentions old paths only in historical/migration context
  - All code examples use correct paths
  - All diagrams are consistent

**Testing Notes**:
- Use grep/ripgrep to find any remaining old paths
- Have someone unfamiliar with the change review migration guide
- Verify documentation matches actual behavior

## Search Patterns for Old References

```bash
# Search for old path references in documentation
rg 'issues/' --type md --glob '!memos/*' --glob '!.wrangler/*'
rg 'specifications/' --type md --glob '!memos/*' --glob '!.wrangler/*'
rg '_CONSTITUTION\.md' --type md
rg '_ROADMAP\.md' --type md

# Specifically in docs/
rg 'issues/' docs/ --type md
rg 'specifications/' docs/ --type md
```

## CLAUDE.md Updates

### Directory Structure Section

**Before**:
```
project-root/
├── issues/
├── specifications/
├── memos/
└── [project files...]
```

**After**:
```
project-root/
├── .wrangler/
│   ├── issues/
│   ├── specifications/
│   ├── memos/
│   ├── governance/
│   ├── cache/
│   ├── config/
│   └── docs/
└── [project files...]
```

### Add Migration Notice

Add near top of CLAUDE.md:

```markdown
## Important: Directory Structure Change (v1.1.0)

As of wrangler v1.1.0, all governance files are now organized under `.wrangler/` directory.
The migration happens automatically on session start. See [Migration Guide](docs/migration-to-wrangler-directory.md).

**Summary of Changes**:
- `issues/` → `.wrangler/issues/`
- `specifications/` → `.wrangler/specifications/`
- `memos/` → `.wrangler/memos/`
- `specifications/_CONSTITUTION.md` → `.wrangler/governance/CONSTITUTION.md`
```

### Update All Path References

Search and replace throughout CLAUDE.md:
- File paths in examples
- Directory references in explanations
- MCP tool usage examples
- Governance framework sections

## docs/MCP-USAGE.md Updates

### Directory Structure Diagram

Update to show `.wrangler/` structure with annotations about what's git-tracked vs gitignored.

### Tool Examples

Update all 11 MCP tool examples to use `.wrangler/` paths:

```markdown
## issues_create

Creates a new issue in `.wrangler/issues/`:

[example using .wrangler/issues/]
```

### Troubleshooting Section

Add section about migration:

```markdown
### Migration Issues

**Q: I don't see my old issues**
A: Check if `.wrangler/issues/` exists. Migration happens on session start.

**Q: I want to use the old structure**
A: Set `WRANGLER_SKIP_MIGRATION=true` environment variable.
```

## README.md Updates

### Quick Start

Update quick start to reference `.wrangler/`:

```markdown
## Quick Start

1. Install wrangler plugin
2. Session hook creates `.wrangler/` directory automatically
3. Issues created in `.wrangler/issues/`
4. Specifications in `.wrangler/specifications/`
```

### Features Section

Update if it mentions directory structure.

## Migration Guide Content

Create comprehensive guide at `docs/migration-to-wrangler-directory.md`:

### Sections

1. **Overview**
   - What changed
   - Why it changed
   - When it takes effect

2. **Automatic Migration**
   - How it works
   - What gets migrated
   - When it happens
   - What to expect

3. **Before and After**
   - Visual directory structure comparison
   - Path mapping table

4. **Manual Migration** (for opt-out users)
   - Step-by-step instructions
   - Verification steps

5. **Troubleshooting**
   - Common issues
   - Solutions
   - How to get help

6. **Impact on CI/CD**
   - Scripts that need updating
   - Examples of path changes

7. **FAQ**
   - Comprehensive Q&A

8. **Rollback** (if needed)
   - How to temporarily use old structure
   - Not recommended, but documented

## FAQ Content

Include in migration guide:

**Q: What happened to my `issues/` directory?**
A: It was automatically moved to `.wrangler/issues/` during session start. All files preserved exactly.

**Q: Do I need to do anything?**
A: No. Migration is automatic. You may need to update any custom scripts that reference old paths.

**Q: Can I opt-out?**
A: Yes. Set `WRANGLER_SKIP_MIGRATION=true` environment variable. Not recommended.

**Q: How do I verify migration worked?**
A: Run `ls .wrangler/` and verify all your issues/specs are there. Run `/wrangler:verify-governance` to validate.

**Q: What about my CI/CD scripts?**
A: Update any scripts referencing `issues/`, `specifications/`, or `memos/` to use `.wrangler/` paths.

**Q: Does this affect git history?**
A: Git sees this as a rename operation. History is preserved.

**Q: What if I have custom MCP provider configuration?**
A: If you set custom paths, they're honored. Defaults changed to `.wrangler/` subdirectories.

**Q: When can I remove the old directories?**
A: They're automatically removed after successful migration. You don't need to do anything.

## Verification Checklist

After documentation updates:

- [ ] All path references use `.wrangler/` (except historical/migration context)
- [ ] All diagrams are accurate
- [ ] All code examples work as written
- [ ] All internal links work
- [ ] Migration guide is comprehensive
- [ ] FAQ answers all common questions
- [ ] Backward compatibility is clearly documented
- [ ] No broken external links

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000002 - Session hook migration (documented here)
- #000003 - Skills updates (referenced in docs)
- #000001 - Versioning system (migration process)

**External Documentation**:
- Markdown best practices
- Technical writing guidelines

---

**Last Updated**: 2025-11-18
