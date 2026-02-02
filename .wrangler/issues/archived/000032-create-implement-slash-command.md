---
id: '000032'
title: 'Task 6: Create /wrangler:implement slash command'
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - slash-command
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:16.961Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: '000031'
  estimatedEffort: 15 minutes
---
## Description

Create the `/wrangler:implement` slash command that serves as the entry point for the implement skill. This command parses the user's input, extracts scope, and loads the implement skill.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

The slash command is how users invoke the skill. It must:
1. Parse user input to extract scope (file, issue, range, or context)
2. Load the implement skill via Skill tool
3. Pass scope information to skill

Pattern: Follow existing slash commands (brainstorm.md, write-plan.md, execute-plan.md)

## Files

- Create: `commands/implement.md`

## Implementation Steps

**Step 1: Read existing slash command to understand pattern**

```bash
cat commands/brainstorm.md
cat commands/write-plan.md
```

Expected: See frontmatter format and skill invocation pattern

**Step 2: Create slash command file**

File: `commands/implement.md`

```markdown
---
name: wrangler:implement
description: Autonomously implement tasks from specs, plans, or issues using subagents with TDD and code review
---

You are implementing work using the implement skill.

## Parse Scope

Analyze the user's message to determine what to implement:

**If they specified a file:**
- Pattern: `*.md` file reference
- Examples: `spec-auth.md`, `plan-refactor.md`, `plans/plan-feature.md`
- Extract: file path

**If they specified issue(s):**
- Pattern: `issue #N`, `issue N`, `issues N-M`, `issues N,M,O`
- Examples: `issue #42`, `issues 5-7`, `issues 3,5,8`
- Extract: issue ID(s)

**If no scope specified:**
- User just typed `/wrangler:implement`
- Skill will infer from conversation context
- No extraction needed

## Load Skill

Invoke the implement skill using the Skill tool:

```
Skill: wrangler:implement
```

The skill will:
1. Parse the scope (using your analysis above or infer from context)
2. Load tasks from spec/plan/issues
3. Create TodoWrite tracking
4. Execute all tasks autonomously via subagents
5. Handle code review and fixes automatically
6. Only stop for genuine blockers
7. Present completion summary when done

## Important

You MUST complete all tasks in the scope before returning to the user, unless you hit a genuine blocker (unclear requirements, flummoxed agents, missing dependencies).

Do NOT stop to ask "should I continue?" between tasks - that's the whole point of autonomous execution.
```

**Step 3: Verify file created**

```bash
ls -la commands/implement.md
```

Expected: File exists

**Step 4: Verify frontmatter**

```bash
head -5 commands/implement.md
```

Expected:
```
---
name: wrangler:implement
description: Autonomously implement tasks from specs, plans, or issues using subagents with TDD and code review
---
```

**Step 5: Test pattern matching (manual verification)**

Verify the scope parsing patterns make sense:
- File patterns: `*.md`
- Issue patterns: `issue #N`, `issue N`, `issues N-M`, `issues N,M,O`

**Step 6: Commit**

```bash
git add commands/implement.md
git commit -m "feat(implement): create slash command entry point

- Add /wrangler:implement command
- Parse scope from user input (file, issue, range, or context)
- Load implement skill via Skill tool
- Document autonomous execution expectation

Part of unified implement skill
"
```

## Acceptance Criteria

- [ ] File `commands/implement.md` created
- [ ] Frontmatter includes name and description
- [ ] Scope parsing documented (file, issue, range, context patterns)
- [ ] Skill invocation documented (uses Skill tool)
- [ ] Autonomous execution expectation stated clearly
- [ ] Patterns match what implement skill expects
- [ ] File follows existing slash command format
- [ ] Committed with descriptive message

## Dependencies

- Requires completion of: Task 000031 (verification/completion section exists)
- Note: Skill doesn't need to be 100% complete to create command, but helps to have structure in place
