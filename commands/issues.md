---
description: Display status summary of specifications and issues.
argument-hint: "[--status=open|in_progress|closed] [--project=name]"
---

# /wrangler:issues

Display status summary of specifications and issues using MCP tools.

## Arguments

- `--status` (optional) — Filter by status: `open`, `in_progress`, `closed`, `cancelled`
- `--project` (optional) — Filter by project/spec name
- `--labels` (optional) — Filter by labels (comma-separated)

## Instructions

1. Use `issues_list` MCP tool to retrieve issues with any filters
2. Use `issues_list` with `type: "specification"` to retrieve specs
3. Group issues by project (linked specification)
4. Calculate progress metrics
5. Output formatted summary

## Status Model

Wrangler uses explicit status fields (not checkbox-derived):

| Status | Meaning |
|--------|---------|
| `open` | Not yet started |
| `in_progress` | Currently being worked on |
| `closed` | Completed successfully |
| `cancelled` | Will not be done |

## Output Format

```markdown
# Project Status

## Specifications

| Spec | Status | Issues | Progress |
|------|--------|--------|----------|
| SPEC-000001-auth-system | in_progress | 5 | 2/5 (40%) |
| SPEC-000002-api-cache | open | 3 | 0/3 (0%) |

## Issues by Specification

### SPEC-000001-auth-system

| ID | Title | Status | Priority |
|----|-------|--------|----------|
| ISS-000042 | Setup database schema | closed | high |
| ISS-000043 | Implement user model | in_progress | high |
| ISS-000044 | Add validation logic | open | medium |

### Unlinked Issues

| ID | Title | Status | Priority |
|----|-------|--------|----------|
| ISS-000050 | Fix typo in readme | open | low |

## Summary

- **Specifications:** 1 in_progress, 1 open
- **Issues:** 1 closed, 1 in_progress, 4 open
- **Next up:** ISS-000044 (Add validation logic)
```

## Progress Calculation

- **Issue progress:** Based on explicit status field
- **Spec progress:** `closed_issues / total_linked_issues`

## MCP Tools Used

```typescript
// List all specifications
issues_list({ type: "specification" })

// List all issues
issues_list({ type: "issue" })

// Filter by status
issues_list({ status: ["open", "in_progress"] })

// Filter by project
issues_list({ project: "SPEC-000001-auth-system" })
```

## Filtering Examples

```bash
# All issues and specs
/wrangler:issues

# Only open issues
/wrangler:issues --status=open

# Issues for a specific spec
/wrangler:issues --project=SPEC-000001-auth-system

# High priority issues
/wrangler:issues --labels=high-priority
```

## What This Command Does NOT Do

- Modify any issues (read-only)
- Create or delete issues
- Change status fields

This command **observes and reports**.

## See Also

- `/wrangler:generate-plan-for-spec` — Create issues from a spec
- `/wrangler:implementing-issues` — Execute issues
- `/wrangler:help` — Full documentation
