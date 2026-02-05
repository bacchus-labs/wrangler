# Verifying Governance - Detailed Guide


**Situation**: Required directory exists but is empty

**Response**: Directory exists = success. Empty is fine (issues/specs may not exist yet).

## Success Criteria

Verification is complete when:

- [ ] workspace-schema.json loaded successfully
- [ ] All directories checked against schema
- [ ] All subdirectories checked against schema
- [ ] All governance files checked against schema
- [ ] All README files checked against schema
- [ ] .gitignore existence and patterns validated
- [ ] Legacy directory/file locations detected
- [ ] Drift report generated with specific fixes
- [ ] User permission obtained (or cancelled)
- [ ] Fixes applied (if approved)
- [ ] Re-verification confirmed success (if fixes applied)

## Output Format

Always provide:

1. **Executive Summary**: Quick status (✅/⚠️/❌) with counts
2. **Detailed Findings**: Broken down by category
3. **Specific Fixes**: Exact commands or actions for each issue
4. **Permission Prompt**: 4 clear options
5. **Confirmation**: Re-verification results after fixes

## Related Skills

- **initializing-governance** - For creating governance files from scratch
- **refreshing-metrics** - For updating metrics in README files (content, not structure)

## Design Principles

**Single Source of Truth**:
- Structure defined ONLY in workspace-schema.json
- Skill reads schema, never hardcodes structure
- When wrangler structure changes, only schema updates

**Simplicity**:
- Focus on "does it exist?" and "is it in the right place?"
- No content/quality validation (future enhancement)
- Clear binary checks, no ambiguity

**User Agency**:
- Always ask permission before changes
- Provide multiple options (auto, manual, selective, cancel)
- Show exactly what will happen before it happens

**Idempotency**:
- Can run multiple times safely
- Re-verification confirms fixes worked
- No harm if run on compliant structure

## Remember

This skill validates STRUCTURE ONLY. It doesn't care about:
- Whether CONSTITUTION.md is well-written
- Whether metrics are up to date
- Whether links between docs work
- Whether templates match current versions

Those are future enhancements. Focus: "Is the directory structure and file organization correct per the schema?"
