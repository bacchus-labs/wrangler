# Organizing Root Files - Detailed Guide

Internal guide for deploying Wrangler updates.

## Prerequisites
- Access to npm registry
- GitHub deploy permissions

## Steps
1. Run tests: `npm test`
2. Build MCP server: `npm run build:mcp`
...
```

**Decision:** DEVOPS/DOCS
- Internal operations guide
- Maintainer-only content
- Deployment procedures

**Action:** Move to `devops/docs/deploy-process.md`

---

## Integration with Housekeeping Workflow

This skill is designed to be called as a subagent from the `housekeeping` workflow:

**In housekeeping Phase 2, add as Agent D:**

```
Agent D: Root Directory Organization
- Task: Clean up markdown files at project root
- Skill: organizing-root-files
- Independence: Operates on root .md files only
```

This keeps root clean automatically during routine housekeeping.

---

## Success Criteria

✅ All organizational candidate files identified
✅ Each file correctly categorized
✅ Files moved to appropriate directories with correct naming
✅ Obsolete files deleted
✅ Root directory clean (only standard files remain)
✅ Report generated documenting all actions

---

## Future Enhancements

### Automatic Date Detection

Improve date inference with:
- Parse file content for explicit dates
- Use git blame to find creation date
- Store creation metadata

### Content Analysis

Use more sophisticated analysis:
- Keyword extraction
- Topic modeling
- Similarity to existing organized files

### Interactive Mode

For ambiguous files:
- Show user the file
- Ask which category
- Learn from user choices

---

*Organize Root Files Skill v1.0*
