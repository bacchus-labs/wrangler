---
id: 000028
title: 'Task 2: Add task executor workflow to implement skill'
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - documentation
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:15.062Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: '000027'
  estimatedEffort: 30 minutes
---
## Description

Add the task executor workflow section to the implement skill. This section defines how tasks are executed via subagent dispatch, how TDD is enforced, and how dependencies are handled.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

The task executor is the core loop that:
1. Creates TodoWrite tracking for all tasks
2. Dispatches general-purpose subagent per task
3. Enforces TDD via subagent prompt
4. Collects TDD compliance certification
5. Handles task dependencies
6. Manages working directory (main or worktree)

## Files

- Modify: `skills/implement/SKILL.md` (add task executor section after scope parsing)

## Implementation Steps

**Step 1: Read existing file to understand structure**

```bash
cat skills/implement/SKILL.md
```

Expected: File exists with frontmatter, overview, and scope parsing sections

**Step 2: Add task executor section after scope parsing**

Append to `skills/implement/SKILL.md`:

```markdown

## Task Executor Workflow

After scope is parsed and tasks are loaded, execute them in order.

### Setup Phase

1. **Create TodoWrite tracking**

   Create one todo per task:
   ```
   - Task 1: [title] (status: pending)
   - Task 2: [title] (status: pending)
   ...
   ```

2. **Verify working directory**

   Check current working directory:
   ```bash
   pwd
   git branch --show-current
   ```

   You can work in main branch OR worktree - no preference.
   If in worktree, subagents inherit that directory.

3. **Check dependencies**

   Build dependency graph:
   - If task has dependencies, mark as "blocked"
   - Only tasks with no pending dependencies are "ready"

### Execution Loop

For each task in "ready" state:

#### 1. Mark Task In Progress

```
TodoWrite: Mark task as in_progress
```

#### 2. Dispatch Implementation Subagent

Use the Task tool (general-purpose subagent):

```markdown
Tool: Task
Description: "Implement Task [N]: [title]"
Prompt: |
  You are implementing Task [N] from [scope reference].

  ## Task Requirements

  [Full task description from task.description]

  ## Acceptance Criteria

  [task.requirements]

  ## Related Files

  [task.relatedFiles]

  ## Your Job

  1. **Follow TDD** (test-driven-development skill):
     - RED: Write failing test first
     - GREEN: Implement minimal code to pass
     - REFACTOR: Improve code quality

  2. **Create TDD Compliance Certification**
     For each function you implement, document:
     - Function name and signature
     - Test file path
     - Whether you followed RED-GREEN-REFACTOR
     - Any deviations justified

     Format (from test-driven-development skill):
     ```
     | Function | Test File | Watched Fail? | Watched Pass? | Notes |
     |----------|-----------|---------------|---------------|-------|
     | funcName | test.ts:L | YES/NO        | YES/NO        | ...   |
     ```

  3. **Verify implementation works**
     - Run tests
     - Check for errors/warnings
     - Ensure requirements met

  4. **Commit your work**
     ```bash
     git add [files]
     git commit -m "[type]: [description]"
     ```

  5. **Report back**
     Provide:
     - Summary of what you implemented
     - Test results (pass/fail counts, output)
     - TDD Compliance Certification table
     - Files changed
     - Any issues or blockers encountered

  Work from: [current directory]

  IMPORTANT: If you encounter unclear requirements or missing information,
  STOP and report the blocker. Do not guess or make assumptions.
```

#### 3. Verify Subagent Response

Check subagent's report for:

- ✅ Implementation summary provided
- ✅ Test results provided (all passing)
- ✅ TDD Compliance Certification included
- ✅ Files changed list provided
- ✅ Work committed to git

**If certification missing:**
→ STOP and request: "Please provide TDD Compliance Certification for functions implemented"

**If tests failing:**
→ Continue to code review (reviewer will catch issues)

**If blocker reported:**
→ ESCALATE to user immediately with blocker details

#### 4. Update Dependencies

After task completes:

1. Mark this task's ID as "complete" in dependency tracker
2. Check all "blocked" tasks
3. For each blocked task, remove this task from its dependency list
4. If blocked task now has zero dependencies, mark as "ready"

#### 5. Continue to Code Review

(This will be added in next task - code review automation)

### Dependency Resolution Example

```
Task graph:
- Task A: no dependencies → "ready"
- Task B: depends on [A] → "blocked"
- Task C: depends on [A, B] → "blocked"

Execution:
1. Execute Task A
2. Task A completes → mark "complete"
3. Task B: remove A from dependencies → [empty] → "ready"
4. Task C: remove A from dependencies → [B] → still "blocked"
5. Execute Task B
6. Task B completes → mark "complete"
7. Task C: remove B from dependencies → [empty] → "ready"
8. Execute Task C
```

### Error Handling

**Subagent fails to complete:**
- First attempt: Dispatch another subagent with same prompt (fresh context)
- Second attempt: ESCALATE to user with failure details

**Subagent reports blocker:**
- ESCALATE immediately (unclear requirements, missing deps, etc.)

**Tests fail after implementation:**
- Continue to code review (will be fixed in review automation)

**Circular dependencies detected:**
- ERROR: "Circular dependency detected: [A → B → C → A]"
- ESCALATE to user

```

**Step 3: Verify section added**

```bash
grep -A 10 "## Task Executor Workflow" skills/implement/SKILL.md
```

Expected: Section found with setup phase and execution loop subsections

**Step 4: Verify examples present**

```bash
grep -A 5 "Dependency Resolution Example" skills/implement/SKILL.md
```

Expected: Example showing task A→B→C dependency chain

**Step 5: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add task executor workflow

- Add setup phase (TodoWrite, working directory, dependencies)
- Add execution loop (dispatch subagent, verify response, update deps)
- Define subagent prompt template with TDD enforcement
- Add dependency resolution algorithm with example
- Add error handling for failures and blockers

Part of unified implement skill
"
```

## Acceptance Criteria

- [ ] Task executor workflow section added to skill
- [ ] Setup phase documented (TodoWrite, working directory, dependencies)
- [ ] Execution loop documented with 5 steps
- [ ] Subagent prompt template includes TDD enforcement
- [ ] Subagent prompt template requests TDD Compliance Certification
- [ ] Dependency resolution algorithm explained
- [ ] Dependency resolution example provided
- [ ] Error handling documented for failures and blockers
- [ ] Section integrates with existing scope parsing section
- [ ] Committed with descriptive message

## Dependencies

- Requires completion of: Task 000027 (skill foundation must exist)
