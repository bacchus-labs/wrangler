---
id: '000034'
title: >-
  Task 8: Delete deprecated executing-plans and subagent-driven-development
  skills
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - cleanup
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:17.811Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: '000033'
  estimatedEffort: 10 minutes
---
## Description

Delete the now-deprecated `executing-plans` and `subagent-driven-development` skills that are replaced by the unified `implement` skill.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

Design decision: Hard deprecation (Option A from design phase)
- Clean break, no confusion
- Forces everyone to use new unified skill
- Simpler codebase

Both skills are fully replaced by `implement`:
- `executing-plans`: Batch execution → Now continuous autonomous execution
- `subagent-driven-development`: Same-session subagents → Now integrated into implement

## Files

- Delete: `skills/executing-plans/SKILL.md`
- Delete: `skills/subagent-driven-development/SKILL.md`

## Implementation Steps

**Step 1: Verify new implement skill exists and is complete**

```bash
ls -la skills/implement/SKILL.md
```

Expected: File exists

```bash
wc -l skills/implement/SKILL.md
```

Expected: Substantial content (600+ lines with examples)

**Step 2: Archive content for reference (optional safety step)**

```bash
# Create archive in .wrangler/memos/ for historical reference
mkdir -p .wrangler/memos/deprecated-skills/

cp skills/executing-plans/SKILL.md .wrangler/memos/deprecated-skills/executing-plans-DEPRECATED-2025-11-21.md
cp skills/subagent-driven-development/SKILL.md .wrangler/memos/deprecated-skills/subagent-driven-development-DEPRECATED-2025-11-21.md
```

**Step 3: Delete deprecated skills**

```bash
# Remove entire skill directories
rm -rf skills/executing-plans/
rm -rf skills/subagent-driven-development/
```

**Step 4: Verify deletion**

```bash
# Should not exist
ls skills/executing-plans/ 2>&1
ls skills/subagent-driven-development/ 2>&1
```

Expected: "No such file or directory" errors

```bash
# Verify new skill still exists
ls skills/implement/SKILL.md
```

Expected: File exists

**Step 5: Delete deprecated slash command (execute-plan.md)**

The `/wrangler:execute-plan` command pointed to `executing-plans` skill:

```bash
cat commands/execute-plan.md
```

Check if it references executing-plans skill.

If yes:
```bash
rm commands/execute-plan.md
```

**Step 6: Verify slash command deletion**

```bash
ls commands/execute-plan.md 2>&1
```

Expected: "No such file or directory"

```bash
# Verify new command exists
ls commands/implement.md
```

Expected: File exists

**Step 7: Commit deletions**

```bash
git rm -r skills/executing-plans/ skills/subagent-driven-development/
git rm commands/execute-plan.md
git add .wrangler/memos/deprecated-skills/ # Add archives
git commit -m "refactor: delete deprecated skills replaced by unified implement skill

BREAKING CHANGE: Remove executing-plans and subagent-driven-development skills

These skills are fully replaced by the new unified 'implement' skill:
- executing-plans → implement (autonomous execution, no batch checkpoints)
- subagent-driven-development → implement (integrated subagent dispatch)
- /wrangler:execute-plan → /wrangler:implement (slash command)

Archived deprecated content in .wrangler/memos/deprecated-skills/ for reference.

Migration:
- Use /wrangler:implement for all implementation workflows
- Supports specs, plans, issues, and ranges
- Autonomous execution with quality gates (TDD, code review)

Part of unified implement skill
"
```

## Acceptance Criteria

- [ ] executing-plans skill directory deleted
- [ ] subagent-driven-development skill directory deleted
- [ ] execute-plan.md slash command deleted (if exists)
- [ ] Deprecated content archived in .wrangler/memos/deprecated-skills/
- [ ] New implement skill still exists and intact
- [ ] New implement command still exists and intact
- [ ] Committed with BREAKING CHANGE note in message
- [ ] Commit message explains migration path

## Dependencies

- Requires completion of: Task 000033 (implement skill must be fully documented)
- Note: This is a breaking change but clean migration path exists
