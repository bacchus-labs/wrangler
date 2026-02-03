---
id: "000007"
title: "Prepare for v1.1.0 release"
type: "issue"
status: "open"
priority: "medium"
labels: ["release", "documentation", "phase-7"]
assignee: ""
project: "Centralized .wrangler/ Directory"
createdAt: "2025-11-18T00:00:00.000Z"
updatedAt: "2025-11-18T00:00:00.000Z"
wranglerContext:
  agentId: ""
  parentTaskId: "000001"
  estimatedEffort: "1 day"
---

# Prepare for v1.1.0 release

## Description

Prepare all release artifacts and communications for wrangler v1.1.0, which introduces the centralized `.wrangler/` directory structure. This includes updating the changelog, creating release announcements, tagging the release, and preparing monitoring and user communication.

**Context**: This is the final step before releasing the `.wrangler/` directory refactoring to users. All implementation and testing must be complete before this issue begins.

**Background**: This is a breaking change release that requires clear communication and careful rollout planning.

## Acceptance Criteria

- [ ] **CHANGELOG.md updated**: Comprehensive changelog entry for v1.1.0 with migration notes
- [ ] **Release announcement created**: Clear, user-friendly announcement of changes and benefits
- [ ] **Git tag created**: Release tagged as `v1.1.0` in git
- [ ] **Migration monitoring plan**: Plan for monitoring migration issues and user feedback
- [ ] **User communication prepared**: Email/announcement text ready for distribution
- [ ] **Rollback plan documented**: Clear steps for rollback if critical issues arise
- [ ] **Support documentation ready**: FAQ and troubleshooting updated for support queries

## Technical Notes

**Implementation Approach**:

1. **Update CHANGELOG.md**:
   - Add v1.1.0 section
   - List breaking changes
   - List new features
   - Include migration guidance
   - Link to migration guide

2. **Create release announcement**:
   - Benefits of centralized structure
   - What users need to know
   - Automatic migration explanation
   - Opt-out instructions
   - Where to get help

3. **Tag release**:
   - Create git tag `v1.1.0`
   - Push tag to remote
   - Create GitHub release (if applicable)

4. **Prepare monitoring**:
   - Define metrics to track
   - Set up alerts for issues
   - Prepare support channels

5. **User communication**:
   - Draft announcement text
   - Identify communication channels
   - Schedule announcement

**Files Likely Affected**:
- `CHANGELOG.md` (major update)
- `skills/.wrangler-releases/1.1.0.md` (should already exist from #000001)
- `skills/.wrangler-releases/CURRENT_VERSION` (update to "1.1.0")
- Git tags (new tag)
- Release announcement (new file or communication)

**Dependencies**:
- Blocked by: #000006 (testing must be complete)
- Blocked by: All other issues (#000001-#000006)
- Related: Specification #000001

**Constraints**:
- Cannot release until all tests pass
- Cannot release with known data loss issues
- Must have rollback plan
- Must have support documentation

## Testing Strategy

**Test Coverage Required**:
- [ ] Release checklist completed
- [ ] All prior issues marked complete
- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Changelog accurate

**Testing Notes**:
- This is primarily documentation and process work
- Verify all referenced links work
- Ensure announcement is clear and accurate

## CHANGELOG.md Entry

Add to CHANGELOG.md:

```markdown
## [1.1.0] - 2025-11-18

### Breaking Changes

#### Centralized .wrangler/ Directory Structure

All wrangler-managed governance files now live under a centralized `.wrangler/` directory at project root. This reduces root clutter and provides clear namespace for plugin-managed content.

**What Changed**:
- `issues/` → `.wrangler/issues/`
- `specifications/` → `.wrangler/specifications/`
- `memos/` → `.wrangler/memos/`
- `specifications/_CONSTITUTION.md` → `.wrangler/governance/CONSTITUTION.md`
- `specifications/_ROADMAP.md` → `.wrangler/governance/ROADMAP.md`
- `specifications/_ROADMAP__NEXT_STEPS.md` → `.wrangler/governance/ROADMAP__NEXT_STEPS.md`

**Migration**: Automatic on session start. Your files will be moved safely. See [Migration Guide](docs/migration-to-wrangler-directory.md) for details.

**Opt-out**: Set `WRANGLER_SKIP_MIGRATION=true` to disable automatic migration (not recommended).

### New Features

- **Automatic Version Detection**: New startup skill detects version mismatches and alerts you when updates are available
- **Self-Update System**: `/update-yourself` command provides step-by-step migration instructions for version upgrades
- **Versioned Governance**: Constitution now tracks wrangler version for compatibility checking
- **Cache Configuration**: User-configurable cache settings in `.wrangler/cache/settings.json`
- **Runtime State Tracking**: Improved runtime state management in `.wrangler/config/`
- **Metrics Isolation**: Runtime metrics separated from git-tracked governance files

### Improved

- **Project Organization**: Single `.wrangler/` directory instead of multiple root-level directories
- **Git Tracking Clarity**: Clear separation between git-tracked governance and runtime-only files
- **Onboarding**: Simpler directory structure makes wrangler easier to understand
- **Documentation**: Comprehensive migration guide and updated all documentation

### Changed

- All governance skills now reference `.wrangler/` paths
- MCP provider defaults updated (respects configuration overrides)
- Session hook creates `.wrangler/` structure automatically
- Constitution template includes `wranglerVersion` field

### Migration Notes

**First Run After Update**:
1. Session hook detects legacy structure
2. Creates `.wrangler/` directory
3. Migrates all files automatically
4. Removes old directories
5. Logs migration summary

**Typical Output**:
```
✓ Detected legacy structure at /path/to/project
✓ Creating .wrangler/ directory
✓ Migrating issues/ → .wrangler/issues/ (42 files)
✓ Migrating specifications/ → .wrangler/specifications/ (7 files)
✓ Migration complete
✓ Initialized .wrangler/ workspace
```

**What to Update**:
- Custom scripts referencing old paths
- CI/CD workflows using old directory structure
- Documentation mentioning old paths

**Getting Help**:
- See [Migration Guide](docs/migration-to-wrangler-directory.md)
- Run `/update-yourself` for detailed migration steps
- Check FAQ in migration guide

**Rollback** (if needed):
- Set `WRANGLER_SKIP_MIGRATION=true`
- Manually move files back to root level
- Not recommended; contact support if issues arise

### Affected Skills

- `wrangler:initialize-governance` - Creates files in `.wrangler/governance/`
- `wrangler:verify-governance` - Validates `.wrangler/` structure
- `wrangler:check-constitutional-alignment` - Reads from `.wrangler/governance/`
- `wrangler:refresh-metrics` - Scans `.wrangler/issues/` and `.wrangler/specifications/`
- New: `wrangler:startup-checklist` - Version detection
- New: `/update-yourself` command - Migration instructions

### Technical Details

- MCP provider defaults: `.wrangler/issues/`, `.wrangler/specifications/`
- Configuration overrides still supported
- Path traversal security maintained
- Performance: <5s migration for <1000 issues
- Test coverage: 233 tests, 87.11% coverage
- No regressions in existing functionality

### Deprecation Notice

**Legacy Structure Support**:
- Supported until v2.0.0 (with warnings)
- Automatic migration available until v2.0.0
- After v2.0.0, `.wrangler/` structure required

**Timeline**:
- v1.1.0 (2025-11-18): Automatic migration begins
- v1.4.0 (TBD): Warnings for legacy structure
- v2.0.0 (TBD): Legacy structure support removed

[1.1.0]: https://github.com/wrangler-marketplace/wrangler/releases/tag/v1.1.0
```

## Release Announcement

**Subject**: Wrangler v1.1.0 Released - Centralized .wrangler/ Directory

**Body**:

```markdown
# Wrangler v1.1.0 - Centralized Governance Directory

We're excited to announce Wrangler v1.1.0, which introduces a cleaner, more organized directory structure for your governance files.

## What's New

### Centralized .wrangler/ Directory

All wrangler-managed files now live in a single `.wrangler/` directory at your project root. This means:

- **Less clutter**: One directory instead of multiple scattered directories
- **Clear ownership**: Obvious what's managed by wrangler
- **Better organization**: Governance, runtime, and cache files clearly separated
- **Easier onboarding**: Simpler structure for new users

### Automatic Migration

**No manual work required!** When you start your next session:
1. Wrangler detects your legacy structure
2. Safely migrates all files to `.wrangler/`
3. Verifies nothing was lost
4. Logs exactly what happened

Your issues, specifications, and memos are all preserved exactly as they were, just in a better location.

### Version Tracking

Projects now track which wrangler version they're using. The new startup skill alerts you when updates are available, and the `/update-yourself` command provides step-by-step upgrade instructions.

## What You Need to Know

### For Most Users: Nothing!

The migration is automatic and safe. Just start your next session and wrangler handles the rest.

### If You Have Custom Scripts

Update any scripts that reference:
- `issues/` → `.wrangler/issues/`
- `specifications/` → `.wrangler/specifications/`
- `memos/` → `.wrangler/memos/`

### If You Want to Opt-Out

Set `WRANGLER_SKIP_MIGRATION=true` (not recommended). Your legacy structure will continue working, but you'll miss out on the benefits.

## What Changed

**Directory Structure**:

Before:
```
project-root/
├── issues/
├── specifications/
├── memos/
└── [project files...]
```

After:
```
project-root/
├── .wrangler/
│   ├── issues/
│   ├── specifications/
│   ├── memos/
│   ├── governance/
│   ├── cache/
│   └── docs/
└── [project files...]
```

**Benefits**:
- Cleaner project root
- Clear separation of governance and runtime files
- Better git tracking (runtime files gitignored)
- Room for future enhancements without root clutter

## Getting Help

- **Migration Guide**: [docs/migration-to-wrangler-directory.md](docs/migration-to-wrangler-directory.md)
- **FAQ**: See migration guide
- **Issues**: Report on GitHub
- **Questions**: Ask in community channels

## Timeline

- **v1.1.0** (Today): Automatic migration available
- **v1.4.0** (Future): Warnings for legacy structure
- **v2.0.0** (Future): Legacy structure support removed

You have plenty of time to migrate, but we recommend doing it now to take advantage of the improved structure.

## Thank You

Thanks to everyone who provided feedback during development. This release makes wrangler cleaner, simpler, and more maintainable.

Happy wrangling!

---

**Version**: 1.1.0
**Release Date**: 2025-11-18
**Breaking Changes**: Yes (automatic migration provided)
**Migration Required**: Yes (automatic)
```

## Release Checklist

**Pre-Release**:
- [ ] All issues #000001-#000006 marked complete
- [ ] All tests passing (233/233)
- [ ] No known critical bugs
- [ ] Documentation complete and accurate
- [ ] Migration guide reviewed
- [ ] CHANGELOG.md updated
- [ ] Release announcement drafted
- [ ] Rollback plan documented

**Release**:
- [ ] Update `skills/.wrangler-releases/CURRENT_VERSION` to "1.1.0"
- [ ] Commit all changes
- [ ] Tag release: `git tag -a v1.1.0 -m "Release v1.1.0 - Centralized .wrangler/ directory"`
- [ ] Push tag: `git push origin v1.1.0`
- [ ] Create GitHub release (if applicable)
- [ ] Publish announcement

**Post-Release**:
- [ ] Monitor for migration issues
- [ ] Track user feedback
- [ ] Respond to support queries
- [ ] Update FAQ based on common questions
- [ ] Plan hotfix if critical issues arise

## Monitoring Plan

**Metrics to Track**:
- Number of successful migrations
- Number of failed migrations
- Average migration time
- Data loss reports (should be zero)
- Support queries volume
- GitHub issues filed

**Alerts**:
- Any data loss report → Immediate investigation
- Failed migration rate >5% → Investigate
- Support query spike → Review common issues

**Support Channels**:
- GitHub Issues: For bugs and problems
- Community channels: For questions
- Documentation: For self-service

## Rollback Plan

**If Critical Issue Detected**:

1. **Immediate**: Add warning to documentation
2. **Short-term**: Provide workaround if possible
3. **Medium-term**: Release hotfix (v1.1.1)
4. **Long-term**: If unfixable, revert in v1.2.0

**Rollback Steps**:
1. Document the issue clearly
2. Provide manual migration back to legacy structure
3. Release v1.2.0 with fix or revert
4. Communicate to all affected users

**Rollback Script** (if needed):
```bash
#!/bin/bash
# Emergency rollback to legacy structure

mv .wrangler/issues issues
mv .wrangler/specifications specifications
mv .wrangler/memos memos
mv .wrangler/governance/CONSTITUTION.md specifications/_CONSTITUTION.md
mv .wrangler/governance/ROADMAP.md specifications/_ROADMAP.md
mv .wrangler/governance/ROADMAP__NEXT_STEPS.md specifications/_ROADMAP__NEXT_STEPS.md
rm -rf .wrangler
```

## Support Documentation

**FAQ Updates** (add to migration guide):

**Q: The migration failed, what do I do?**
A: [Troubleshooting steps]

**Q: I lost data during migration**
A: [Emergency recovery steps, support contact]

**Q: Can I roll back?**
A: [Rollback instructions]

**Q: How do I verify migration worked?**
A: [Verification steps]

## Communication Schedule

**Day 0 (Release)**:
- Publish GitHub release
- Update documentation
- Send announcement

**Day 1-7**:
- Monitor support channels
- Respond to issues quickly
- Update FAQ as needed

**Day 8-30**:
- Collect feedback
- Plan improvements
- Consider hotfix if needed

**Day 30+**:
- Retrospective on release
- Document lessons learned
- Plan next release

## Success Metrics

**Release Success Criteria**:
- >95% successful automatic migrations
- <5 critical bug reports
- <10 support queries requiring intervention
- Positive user feedback
- No data loss incidents

**Failure Criteria** (trigger rollback consideration):
- Any data loss report
- >10% failed migrations
- Critical bug affecting all users
- Negative community reaction

## References

**Specification**: #000001 - Centralized .wrangler/ Directory Structure

**Related Issues**:
- #000001 - Versioning system
- #000002 - Session hook migration
- #000003 - Skills updates
- #000004 - Documentation updates
- #000005 - MCP verification
- #000006 - Comprehensive testing

**External Documentation**:
- Semantic Versioning: https://semver.org/
- Release management best practices

---

**Last Updated**: 2025-11-18
