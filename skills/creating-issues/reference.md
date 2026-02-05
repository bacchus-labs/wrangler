# Issues

**Purpose**: Track implementation tasks, bugs, and technical debt for this project.

**Status**: [X issues open, Y issues in progress, Z issues closed]

---

## Quick Reference

### Creating Issues

**Via MCP Tool**:
```typescript
issues_create({
  title: "Clear, action-oriented title",
  description: "Detailed description with acceptance criteria",
  type: "issue",
  status: "open",
  priority: "medium",
  labels: ["category", "type"],
  project: "Project Name"
})
```

**Via Skill**: Use `/wrangler:create-issue` or the `create-new-issue` skill

**Manual**: Create file `NNNNNN-slug.md` with YAML frontmatter (see template below)

### Issue Lifecycle

```
open → in_progress → closed
         ↓
      cancelled (if no longer relevant)
```

### Priority Levels

- **critical** - System broken, blocking work
- **high** - Important feature or significant bug
- **medium** - Standard work item
- **low** - Nice to have, technical debt

---

## Issue Template

```markdown
---
id: "NNNNNN"
title: "Short action-oriented title"
type: "issue"
status: "open"
priority: "medium"
labels: ["category"]
assignee: ""
project: ""
createdAt: "YYYY-MM-DDTHH:mm:ss.sssZ"
updatedAt: "YYYY-MM-DDTHH:mm:ss.sssZ"
wranglerContext:
  agentId: ""
  parentTaskId: ""
  estimatedEffort: ""
---

## Description

Clear description of what needs to be done and why.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes

Any implementation details, constraints, or considerations.
```

---

## Governance Integration

### Constitutional Alignment

Before creating issues, verify alignment with project principles:

**Check**: Does this issue align with `../specifications/_CONSTITUTION.md`?

If creating a new feature issue, explicitly note which constitutional principles it supports.

### Roadmap Integration

Issues should reference roadmap phases:

**Check**: Which phase of `../specifications/_ROADMAP.md` does this support?

Add label matching the roadmap phase (e.g., `phase-1`, `phase-2`).

### Specification Linkage

Implementation issues should reference their specification:

**Pattern**: `project: "[specification-filename]"` in frontmatter

**Example**: Issue for auth feature links to `project: "authentication-system"`

---

## Labels

### By Category
- `frontend` - UI/UX work
- `backend` - Server/API work
- `infrastructure` - DevOps, deployment, tooling
- `documentation` - Docs, README, guides
- `testing` - Test coverage, test improvements

### By Type
- `bug` - Something broken
- `feature` - New functionality
- `refactor` - Code quality improvements
- `technical-debt` - Accumulated debt paydown
- `plan-step` - Task from implementation plan

### By Urgency
- `blocking` - Blocks other work
- `time-sensitive` - Deadline-driven
- `quick-win` - <4 hours, high impact

---

## Workflows

### Creating Bug Issues

1. Verify bug exists and is reproducible
2. Create issue with `bug` label
3. Set priority based on severity
4. Include reproduction steps in description
5. Link to any related issues

### Creating Feature Issues

1. Verify constitutional alignment
2. Check if specification exists (if not, create one first)
3. Create issue with `feature` label
4. Link to specification via `project` field
5. Add roadmap phase label

### Creating Plan-Step Issues

Use the `writing-plans` skill, which automatically:
1. Creates optional plan file in `.wrangler/plans/` (if architecture context needed)
2. Creates MCP issues for each task (source of truth)
3. Links issues to specification via `project` field
4. Adds `plan-step` label

---

## Metrics (Auto-Updated)

**Total Issues**: [N]
**By Status**:
- Open: [X] ([Y]%)
- In Progress: [X] ([Y]%)
- Closed: [X] ([Y]%)
- Cancelled: [X] ([Y]%)

**By Priority**:
- Critical: [X]
- High: [X]
- Medium: [X]
- Low: [X]

**Top Projects**:
1. [Project Name]: [N] issues
2. [Project Name]: [N] issues
3. [Project Name]: [N] issues

---

## Best Practices

1. **One issue, one task** - Keep issues focused and atomic
2. **Clear acceptance criteria** - Define "done" upfront
3. **Update status actively** - Keep `status` field current
4. **Use labels consistently** - Follow established taxonomy
5. **Link to specs** - Always connect features to specifications
6. **Estimate effort** - Use `wranglerContext.estimatedEffort` for planning
7. **Close promptly** - Mark complete as soon as work is done

---

**Related Documents**:
- `../specifications/_CONSTITUTION.md` - Project principles
- `../specifications/_ROADMAP.md` - Strategic roadmap
- `../specifications/_ROADMAP__NEXT_STEPS.md` - Tactical execution tracker
- `../../docs/MCP-USAGE.md` - MCP tools documentation

**Last Updated**: [YYYY-MM-DD]
