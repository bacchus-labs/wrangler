# /wrangler:implementing-issues-v2

## Description

Implements specifications using a modular, skill-orchestration workflow with mandatory verification gates.

## Usage

```
/wrangler:implementing-issues-v2 <spec-id>
```

**Example:**
```
/wrangler:implementing-issues-v2 SPEC-000042
```

## What It Does

Invokes the `implement-spec-v2` skill to implement a specification using a six-phase workflow:

1. **INIT:** Initialize worktree using session_start MCP tool
2. **PLAN:** Invoke writing-plans skill to generate wrangler issues
3. **EXECUTE:** Invoke implement skill for each issue
4. **VERIFY:** Run LLM-based compliance audit (100% required)
5. **PUBLISH:** Finalize GitHub PR and mark ready
6. **COMPLETE:** Close session and present summary

The GitHub PR serves as the primary audit trail, with the PR description updated through each phase.

## How It Works

This command orchestrates existing skills rather than reimplementing their logic:

### Phase 1: INIT

Creates worktree using `session_start` MCP tool (same pattern as implement-spec skill):
- Creates isolated git worktree for implementation
- Establishes branch name and session ID
- Provides context for all subsequent phases

### Phase 2: PLAN

Invokes `writing-plans` skill to generate wrangler issues:
- writing-plans breaks spec into implementable tasks
- Each task becomes a tracked MCP issue (ISS-XXXXXX)
- Issues contain complete implementation details (files, code, tests, commands)
- Optional plan file created for architecture context (if needed)
- GitHub PR created with overview (not full plan details)

**How issues get generated:**
- Planning subagent reads specification
- Analyzes requirements and existing codebase
- Calls `issues_create` for each task with complete details
- Returns list of issue IDs to orchestrator

**Why MCP issues:**
- Source of truth for implementation (not PR description)
- Tracked and searchable via MCP tools
- Can be filtered, updated, marked complete
- Git-tracked for full history

### Phase 3: EXECUTE

Invokes `implement` skill to execute all issues:
- implement skill dispatches subagent per issue
- Each subagent follows TDD (RED-GREEN-REFACTOR)
- Automatic code review after each issue
- Auto-fix for Critical/Important issues (2 attempts)
- Only stops for genuine blockers (unclear requirements, flummoxed agents)

**Worktree context propagation:**
- All subagents receive absolute worktree path
- All commands use: `cd {WORKTREE} && [command]`
- Prevents commits in wrong directory

### Phase 4: VERIFY

Runs LLM-based compliance audit:
- Reads spec and extracts acceptance criteria (LLM, not script)
- Verifies each criterion has evidence (tests, code, commits)
- Calculates compliance percentage
- Runs fresh test suite
- Checks git status (must be clean)
- **BLOCKS if compliance < 100%**

**Why LLM not script:**
- Handles varied spec formats gracefully
- Can infer criteria from prose descriptions
- Won't break if spec structure differs
- More intelligent than regex parsing

### Phase 5: PUBLISH

Finalizes GitHub PR:
- Updates PR description with final summary
- Lists all tasks completed with commit hashes
- Shows test results and compliance percentage
- Marks PR ready for review
- Adds reviewers if configured

### Phase 6: COMPLETE

Closes session and presents summary:
- Calls `session_complete` MCP tool
- Records PR URL, session ID, metrics
- Presents completion summary to user
- Provides audit trail location

## Prerequisites

- Specification file exists in `.wrangler/specifications/`
- `gh` CLI installed and authenticated
- Git working directory clean
- Node.js and npm installed (for tests)

## Quality Gates

- **INIT:** Worktree must be created successfully
- **PLAN:** Issues must be created (escalate if planning fails)
- **EXECUTE:** All tasks must complete (implement handles escalation)
- **VERIFY:** 100% compliance required (MANDATORY - cannot skip)
- **VERIFY:** All tests must pass
- **VERIFY:** Git must be clean (no uncommitted changes)
- **PUBLISH:** PR must be created and marked ready

## Related Skills

- `implement-spec-v2` - Main orchestrator skill (this command invokes it)
- `writing-plans` - Creates MCP issues from specification
- `implement` - Executes issues with TDD and code review
- `test-driven-development` - TDD workflow enforced by implement
- `requesting-code-review` - Code review framework used by implement

## Architecture Benefits

This modular approach provides:
- **No duplication:** Planning logic lives in writing-plans (one place)
- **No duplication:** Implementation logic lives in implement (one place)
- **Maintainability:** Changes to planning/implementation update all consumers
- **Testability:** Each skill can be tested independently
- **Composability:** Skills can be invoked standalone or orchestrated

## Comparison with implement-spec (v1)

**implement-spec (v1):**
- Uses implement skill for execution
- No PLAN phase (assumes issues exist)
- Verification is built-in to implement skill
- Best for: Implementing existing issues/tasks

**implement-spec-v2 (this command):**
- Adds PLAN phase (invokes writing-plans)
- Adds VERIFY phase (compliance audit)
- Best for: Implementing specs end-to-end with verification

**When to use which:**
- Use `implement-spec` if you already have MCP issues
- Use `implement-spec-v2` if starting from specification file

## See Also

- [implement-spec-v2 Skill Documentation](../skills/implementing-specs-v2/SKILL.md)
- [writing-plans Skill Documentation](../skills/writing-plans/SKILL.md)
- [implement Skill Documentation](../skills/implementing-issues/SKILL.md)
- [MCP Issue Management](../docs/MCP-USAGE.md)
