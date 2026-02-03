# Implementing Specs - Detailed Guide

   ```
   ```

## Session Recovery

If a session is interrupted, it can be resumed.

### Detection

On session start, check for interrupted sessions:

```
session_get()  // No sessionId = find most recent incomplete
```

If interrupted session found:
1. Read checkpoint
2. Present resume option to user
3. If user confirms, continue from last checkpoint

### Resume Flow

1. Call `session_get(sessionId: "{SESSION_ID}")`
2. Read `checkpoint.resumeInstructions`
3. Continue from indicated phase/task
4. All MCP calls use existing sessionId

## Worktree Isolation

**CRITICAL:** All subagent operations MUST use worktree context.

### Context Injection

Every subagent prompt MUST include:

```markdown
## CRITICAL: Working Directory Context

**Working directory:** {WORKTREE_ABSOLUTE}
**Branch:** {BRANCH_NAME}

### MANDATORY: Verify Location First

Before ANY work, run:
```bash
cd {WORKTREE_ABSOLUTE} && \
  echo "Directory: $(pwd)" && \
  echo "Branch: $(git branch --show-current)" && \
  test "$(pwd)" = "{WORKTREE_ABSOLUTE}" && echo "VERIFIED" || echo "FAILED"
```

**If verification fails, STOP immediately.**

### Command Pattern

ALL bash commands MUST use:
```bash
cd {WORKTREE_ABSOLUTE} && [command]
```
```

### Why This Matters

- Worktree is separate from main repository
- Without explicit context, subagents may work in wrong directory
- Commits in wrong directory corrupt main branch

## Error Handling

### Phase Failures

Each phase has verification gates:
- **INIT:** Worktree must exist and be on correct branch
- **PLAN:** Issues must be created successfully
- **EXECUTE:** All tasks must complete (with escalation for blockers)
- **VERIFY:** Tests must pass, git must be clean
- **PUBLISH:** Push and PR creation must succeed

### Recovery Actions

| Error | Recovery |
|-------|----------|
| Worktree creation fails | Check disk space, permissions |
| Planning unclear | Escalate to user for clarification |
| Task blocked | Escalate via implementing-issues skill |
| Tests fail | Do not publish, inform user |
| Push fails | Check git remote, auth |
| PR creation fails | Check gh auth, permissions |

### Session States

| State | Meaning | Recovery |
|-------|---------|----------|
| `running` | Currently executing | Continue |
| `paused` | Blocked on something | Resume from checkpoint |
| `completed` | Successfully finished | No action needed |
| `failed` | Unrecoverable error | Start new session |

## Example Execution

```
User: /wrangler:implementing-issues spec-auth-system.md

Using Skill: implementing-issues-spec | Implementing spec-auth-system.md with full audit trail

PHASE 1: INIT
-> session_start(specFile: "spec-auth-system.md")
-> Created session: 2025-12-07-abc123-f8d2
-> Worktree: /project/.worktrees/spec-auth-system
-> Branch: wrangler/spec-auth-system/2025-12-07-abc123
-> VERIFIED

PHASE 2: PLAN
-> Invoking writing-plans skill
-> Created 5 tasks: ISS-000042 through ISS-000046
-> session_checkpoint saved

PHASE 3: EXECUTE
-> Invoking implementing-issues skill with worktree context
-> Task ISS-000042: Complete (TDD certified, code reviewed)
-> session_checkpoint saved
-> Task ISS-000043: Complete
-> session_checkpoint saved
-> Task ISS-000044: Complete
-> session_checkpoint saved
-> Task ISS-000045: Complete
-> session_checkpoint saved
-> Task ISS-000046: Complete
-> session_checkpoint saved

PHASE 4: VERIFY
-> Running test suite: 42 tests, 42 passing
-> Git status: clean
-> PASSED

PHASE 5: PUBLISH
-> Pushed branch to origin
-> Created PR: https://github.com/org/repo/pull/123

PHASE 6: REPORT
-> session_complete

## Implementation Complete

**Specification:** spec-auth-system.md
**PR:** https://github.com/org/repo/pull/123
**Session:** 2025-12-07-abc123-f8d2

| Metric | Value |
|--------|-------|
| Tasks completed | 5/5 |
| Tests passing | 42 |
| Code reviews | 5 approved |

Audit trail: .wrangler/sessions/2025-12-07-abc123-f8d2/
```

## Integration with Other Skills

**Required skills:**
- `implementing-issues` - Task execution with TDD and code review
- `writing-plans` - Breaking spec into MCP issues
- `practicing-tdd` - TDD compliance in subagents
- `requesting-reviewing-code` - Code review for each task

**Optional skills:**
- `using-git-worktrees` - Manual worktree management (automated here)
- `finishing-a-development-branch` - PR already created by this skill

## Verification Commands

After completion, verify execution:

```bash
# Verify all phases completed
jq -s '[.[].phase] | unique | sort' .wrangler/sessions/{id}/audit.jsonl
# Expected: ["checkpoint","complete","execute","init","plan","publish","task","verify"]

# Verify all tasks passed
jq -s '[.[] | select(.phase == "task" and .tests_passed == false)]' audit.jsonl
# Expected: []

# Verify PR created
jq -s '.[] | select(.phase == "publish") | .pr_url' audit.jsonl
# Expected: "https://github.com/..."

# Get session summary
jq -s '{
  session_id: .[0].session_id,
  phases: [.[].phase] | unique,
  tasks: [.[] | select(.phase == "task")] | length,
  duration_sec: ((.[length-1].timestamp | fromdateiso8601) - (.[0].timestamp | fromdateiso8601))
}' audit.jsonl
```

## Red Flags - Anti-Patterns

**Do NOT:**

- Skip worktree verification (subagents may work in wrong directory)
- Proceed to publish with failing tests
- Create PR without complete audit trail
- Skip checkpoints (recovery becomes impossible)
- Ignore phase gates

**Do:**

- Always verify worktree location
- Save checkpoint after each task
- Use session tools for all phase transitions
- Halt on verification failures
- Provide comprehensive PR body
