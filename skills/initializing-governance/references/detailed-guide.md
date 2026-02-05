# Initializing Governance - Detailed Guide

Issue Tracking (auto-created by writing-plans)
    ↓
Implementation (follow TDD)
    ↓
Update NEXT_STEPS (mark features complete)
```

### Skills for Governance

- **checking-constitutional-alignment** - Verify feature fits principles
- **defining-constitution** - Refine and clarify principles
- **verifying-governance** - Check framework integrity
- **refreshing-metrics** - Update status counts

**You're all set!** We're now "of one mind" on project governance.
```

## Edge Cases

### If Governance Already Partially Exists

**Scenario**: Some governance files already exist

**Approach**:
1. Detect which files exist
2. Ask user: "I see you already have [files]. Would you like me to:"
   - "Enhance existing files (preserve your content)"
   - "Start fresh (backup old, create new)"
   - "Skip initialization"
3. If enhancing:
   - Read existing files
   - Identify gaps compared to templates
   - Propose additions (don't remove user content)

### If User is Unsure About Principles

**Scenario**: User says "I don't know" or "Not sure" when asked about principles

**Approach**:
1. Use researching-web-sources skill to find examples:
   - "software design principles"
   - "project defining-constitution examples"
   - "engineering team values"
2. Present 3-4 common principles as starting point
3. Offer to use `defining-constitution` skill for deep refinement

### If Project is Very Small

**Scenario**: Single-file project or very small scope

**Approach**:
1. Still create full governance (future-proofing)
2. Explain: "Even small projects benefit from clear principles"
3. Suggest simplified defining-constitution (3 principles instead of 5+)
4. Suggest single-phase roadmap

## Success Criteria

Initialization is complete when:

- [ ] Core governance files exist and are populated (CONSTITUTION.md, ROADMAP.md, ROADMAP_NEXT_STEPS.md)
- [ ] Constitution has 3+ principles with examples
- [ ] Roadmap has at least 1 phase with goals
- [ ] README files have current metrics (issues/README.md, specifications/README.md)
- [ ] Welcome issue created
- [ ] User has reviewed all documents
- [ ] CLAUDE.md updated (if exists)
- [ ] TESTING.md created from template (placeholder status, to be populated by setting-up-git-hooks)
- [ ] Git hooks set up (automatically invoked during initialization)

## Important Notes

**Template Paths**: Templates are in skill-specific directories:
- Constitution: `skills/defining-defining-constitution/templates/`
- Roadmap: `skills/validating-roadmaps/templates/`
- Issues: `skills/creating-issues/templates/`
- Specifications: `skills/writing-specifications/templates/`
- Process docs: `skills/initializing-governance/templates/` (TESTING.md, SECURITY_CHECKLIST.md, DEFINITION_OF_DONE.md)

**Use Copy, Not Move**: Always copy templates, never move them (templates stay in wrangler)

**Preserve User Content**: If enhancing existing files, never delete user content

**Constitutional First**: The defining-constitution is most important - spend time here

**Roadmap Can Evolve**: Roadmap will change - it's okay to start simple

**Metrics Will Update**: Don't worry about exact metrics now - refreshing-metrics skill handles this

## Related Skills

- **defining-constitution** - For deep principle refinement and clarification
- **checking-constitutional-alignment** - For verifying features align with principles
- **verifying-governance** - For checking governance file integrity
- **refreshing-metrics** - For updating status counts in READMEs and NEXT_STEPS
- **setting-up-git-hooks** - For setting up git hooks enforcement
- **updating-git-hooks** - For modifying existing git hooks configuration

## Remember

You're establishing the foundation for perfect alignment between AI and human. Take time to make the defining-constitution solid - everything else builds on this foundation.
