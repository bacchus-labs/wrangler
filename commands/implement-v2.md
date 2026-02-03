# /wrangler:implement-v2

## Description

Implements specifications using a modular, skill-orchestration workflow with mandatory verification gates.

## Usage

```
/wrangler:implement-v2 <spec-id>
```

**Example:**
```
/wrangler:implement-v2 SPEC-000042
```

## What It Does

Invokes the `implement-spec-v2` skill to implement a specification using a seven-phase workflow:

1. **INIT:** Initialize worktree using session_start MCP tool
2. **PLAN:** Invoke writing-plans skill to generate wrangler issues
3. **REVIEW:** Validate AC coverage before execution (advisory gate)
4. **EXECUTE:** Invoke implement skill for each issue
5. **VERIFY:** Run LLM-based compliance audit with autonomous self-healing
6. **PUBLISH:** Finalize GitHub PR and mark ready
7. **COMPLETE:** Close session and present summary

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

### Phase 3: REVIEW

Validates planning completeness before execution starts:
- Reads AC coverage analysis from plan file
- Checks if >= 95% of acceptance criteria have implementing tasks
- **If coverage >= 95%:** Automatic approval, proceed to EXECUTE
- **If coverage < 95%:** Offers options:
  - **Auto-create missing tasks** (Recommended)
  - **Proceed anyway** (risky - may fail VERIFY)
  - **Abort and replan** from scratch
- Creates supplemental issues if user chooses auto-create
- Updates plan file with new tasks and re-calculates coverage

**Why this phase matters:**
- Catches planning gaps early (before 15+ minutes of execution)
- Prevents discovering incomplete planning in VERIFY phase
- User can course-correct before wasting execution time

**Skip condition:**
- If spec has no explicit acceptance criteria, skips REVIEW with warning

### Phase 4: EXECUTE

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

### Phase 5: VERIFY

Runs LLM-based compliance audit with autonomous self-healing:
- Reads spec and extracts acceptance criteria (LLM, not script)
- Verifies each criterion has evidence (tests, code, commits)
- Calculates compliance percentage
- Runs fresh test suite
- Checks git status (must be clean)

**Self-Healing Workflow:**

1. **Gap Categorization** - Classifies unmet criteria:
   - AUTO_FIX_TEST: Missing test coverage
   - AUTO_FIX_DOC: Missing documentation
   - AUTO_FIX_EDGE: Missing edge case handling
   - SEARCH_RETRY: Evidence likely exists but not found
   - FUNDAMENTAL_GAP: Core requirement not implemented

2. **Autonomous Remediation** (max 3 iterations):
   - Creates supplemental MCP issues for fixable gaps
   - Executes them using implement skill
   - Re-runs compliance audit
   - Loops until compliance >= 95% OR no more auto-fixable gaps

3. **Quality Gate Decision:**
   - **>= 95%:** ✅ PASS - Proceed to PUBLISH
   - **90-94%:** ⚠️ PASS WITH WARNINGS - Document gaps, proceed
   - **< 90%:** ❌ FAIL - Escalate to user

**Auto-fixed without user input:**
- Missing test coverage
- Missing documentation
- Missing edge case handling

**Escalated to user:**
- Fundamental requirement gaps (core functionality missing)
- After 3 failed fix attempts
- Compliance < 90% after remediation

**Why LLM not script:**
- Handles varied spec formats gracefully
- Can infer criteria from prose descriptions
- Won't break if spec structure differs
- More intelligent than regex parsing

### Phase 6: PUBLISH

Finalizes GitHub PR:
- Updates PR description with final summary
- Lists all tasks completed with commit hashes
- Shows test results and compliance percentage
- Marks PR ready for review
- Adds reviewers if configured

### Phase 7: COMPLETE

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
- **REVIEW:** AC coverage >= 95% (advisory - offers to fix gaps)
- **EXECUTE:** All tasks must complete (implement handles escalation)
- **VERIFY:** >= 90% compliance after self-healing (MANDATORY - cannot skip)
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

- [implement-spec-v2 Skill Documentation](../skills/implement-spec-v2/SKILL.md)
- [writing-plans Skill Documentation](../skills/writing-plans/SKILL.md)
- [implement Skill Documentation](../skills/implement/SKILL.md)
- [MCP Issue Management](../docs/MCP-USAGE.md)
