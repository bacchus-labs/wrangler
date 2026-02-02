---
id: '000027'
title: 'Task 1: Create implement skill foundation with scope parser'
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - documentation
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:14.634Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: ''
  estimatedEffort: 20 minutes
---
## Description

Create the core skill file `skills/implement/SKILL.md` with frontmatter, overview, and scope parsing documentation.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

This is the foundation task that creates the skill file structure and documents how scope parsing works. The scope parser is critical because it must handle multiple input formats (specs, plans, issues, ranges, context inference) and normalize them to a standard task list format.

## Files

- Create: `skills/implement/SKILL.md`
- Create: `skills/implement/` (directory)

## Implementation Steps

**Step 1: Create directory and initial file structure**

```bash
mkdir -p skills/implement
```

**Step 2: Write the skill file with frontmatter and scope parsing section**

File: `skills/implement/SKILL.md`

```markdown
---
name: implement
description: Autonomously implement tasks from specs, plans, or issues using subagents with TDD and code review
---

# Implement

## Overview

Autonomous implementation workflow that handles specifications, plans, issue ranges, or standalone issues.

**Core principle:** Dispatch subagent per task, automatic code review and fixes, only stop for genuine blockers

**Entry point:** `/wrangler:implement [scope]`

**Works in main branch OR worktree (no preference)**

**Headless mode:** Runs autonomously - does not stop for user checkpoints unless blocked

## When to Use

**Use this skill when:**
- Executing a complete specification or plan
- Implementing a range of related issues
- Working on a standalone issue that needs full implementation
- You want autonomous execution with quality gates

**Do NOT use this skill when:**
- Exploring or understanding code (use locating-code or analyzing-implementations)
- Answering questions about implementation (just answer directly)
- User wants manual control over each step (rare - ask user if unclear)

## Scope Parsing

The skill automatically determines what to implement based on your input.

### Supported Formats

**1. Specification files**

```bash
/wrangler:implement spec-auth-system.md
```

→ Loads spec from `.wrangler/specifications/`
→ Extracts linked MCP issues OR parses inline tasks
→ Executes all tasks sequentially

**2. Plan files**

```bash
/wrangler:implement plan-refactor.md
```

→ Loads plan from `plans/`
→ Extracts task list from plan
→ Executes all tasks sequentially

**3. Single issue**

```bash
/wrangler:implement issue #42
/wrangler:implement issue 42
```

→ Loads issue from MCP using issues_get
→ Treats entire issue as single task
→ Executes immediately

**4. Issue range**

```bash
/wrangler:implement issues 5-7
/wrangler:implement issues 5,6,7
```

→ Loads multiple issues from MCP
→ Executes sequentially (respects dependencies if specified)

**5. Context inference (no parameter)**

```bash
/wrangler:implement
```

→ Scans last 5 user messages for file or issue references
→ Uses most recent valid reference found
→ Error if nothing found: "Cannot infer scope. Specify file or issue."

### Parsing Algorithm

```
1. Check if scope parameter provided
   YES → Parse parameter (see format patterns above)
   NO → Go to step 2

2. Scan last 5 user messages in conversation
   - Look for file references (.md files)
   - Look for issue references (#N or "issue N")

3. Determine scope type:
   - Starts with "spec-" OR in .wrangler/specifications/ → Specification
   - Starts with "plan-" OR in plans/ → Plan
   - Contains "issue" or "#" → Issue reference

4. Load tasks:
   - Specification: Read file, extract linked issues via issues_list OR parse inline
   - Plan: Read file, extract task list
   - Issue(s): Load via MCP (issues_get or issues_list)

5. If nothing found:
   ERROR: "Cannot infer scope. Please specify:
   - Specification file (spec-name.md)
   - Plan file (plan-name.md)
   - Issue (#N or issue N)
   - Issue range (issues N-M)"
```

### Normalized Task Format

All scope types convert to standard task objects:

```typescript
interface Task {
  id: string;           // "spec-auth:task-1", "issue-42", "plan:task-3"
  title: string;        // Short task description
  description: string;  // Full requirements and context
  requirements: string; // What counts as "done" (acceptance criteria)
  relatedFiles: string[]; // Files likely to change (hints for subagent)
  dependencies: string[]; // IDs of tasks that must complete first
}
```

**Dependency handling:**
- Tasks with dependencies wait until prerequisite tasks complete
- If circular dependencies detected: ERROR and escalate to user
- If dependency references non-existent task: ERROR and escalate

```

**Step 3: Verify file structure**

```bash
# Check file exists
ls -la skills/implement/SKILL.md

# Check frontmatter valid
head -5 skills/implement/SKILL.md
```

Expected output:
```
---
name: implement
description: Autonomously implement tasks from specs, plans, or issues using subagents with TDD and code review
---
```

**Step 4: Verify content**

```bash
# Check scope parsing section exists
grep -A 5 "## Scope Parsing" skills/implement/SKILL.md
```

Expected: Section found with subsections for supported formats

**Step 5: Commit**

```bash
git add skills/implement/
git commit -m "feat(implement): create skill foundation with scope parser

- Add skill frontmatter and overview
- Document 5 scope input formats (spec/plan/issue/range/context)
- Define parsing algorithm
- Define normalized task format with dependencies

Part of unified implement skill (replaces executing-plans and subagent-driven-development)
"
```

## Acceptance Criteria

- [ ] Directory `skills/implement/` created
- [ ] File `skills/implement/SKILL.md` exists
- [ ] Frontmatter contains name, description
- [ ] Overview section explains purpose and core principle
- [ ] Scope parsing section documents all 5 input formats
- [ ] Parsing algorithm documented with clear steps
- [ ] Normalized task format defined with TypeScript interface
- [ ] Dependency handling explained
- [ ] File validates (proper markdown, valid frontmatter)
- [ ] Committed with descriptive message

## Dependencies

None (first task in plan)
