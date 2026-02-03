---
name: wrangler:implementing-issues
description: Autonomously implement tasks from specs, plans, or issues using subagents with TDD and code review
---

## Parse User Input

Extract scope from user message if provided:
- File references (*.md) - pass as scope
- Issue references (#N, issue N, issues N-M) - pass as scope
- No scope - skill will infer from context

## Check for Spec-to-PR Workflow

If the user explicitly asks for a PR as the end result (e.g., "implement this spec and give me a PR", "implement and create PR"):

1. Use the implement-spec skill instead which provides:
   - Git worktree isolation
   - Session tracking via MCP tools
   - Full audit trail
   - Automatic PR creation

2. The implement-spec skill produces:
   - PR URL
   - Session ID
   - Audit trail in `.wrangler/sessions/{session-id}/`

## Standard Workflow

For typical implementation requests (no explicit PR request):

Use the Skill tool to load the implement skill:

```
Skill: implement
```

The skill contains all workflow logic for autonomous execution with TDD and code review.

## Skill Selection

| User Request | Skill to Use |
|--------------|--------------|
| "implement spec-foo.md" | implement |
| "implement issues 5-7" | implement |
| "implement this spec and create PR" | implement-spec |
| "implement and give me PR link" | implement-spec |
| "implement spec-foo.md (PR requested)" | implement-spec |

The implement-spec skill is a superset that adds:
- Worktree creation and management
- Session tracking via MCP session tools
- Audit trail for post-execution verification
- Automatic GitHub PR creation
