# Example: Session Recovery After Interruption

This example shows how to recover from an interrupted session.

## Scenario

Session interrupted during EXECUTE phase (3 of 5 tasks complete).

## Detection

On next session start, check for incomplete sessions:

```bash
# Check for most recent incomplete session
session_get()

# Response:
{
  sessionId: "2025-02-02-abc123",
  status: "running",
  lastPhase: "execute",
  checkpoint: {
    tasksCompleted: ["ISS-000042", "ISS-000043", "ISS-000044"],
    tasksPending: ["ISS-000045", "ISS-000046"],
    lastAction: "Completed ISS-000044: Add rate limiting middleware",
    resumeInstructions: "Continue with next issue or proceed to VERIFY if all done"
  },
  metadata: {
    specFile: "SPEC-000042.md",
    worktreePath: "/Users/user/project/.worktrees/spec-000042-auth",
    branchName: "wrangler/spec-000042/2025-02-02-abc123",
    prNumber: 123,
    prUrl: "https://github.com/org/repo/pull/123"
  }
}
```

## Present Resume Option to User

```markdown
Found interrupted session: 2025-02-02-abc123

**Status:**
- Phase: EXECUTE
- Tasks completed: 3/5
- Tasks pending: 2
- Last action: Completed ISS-000044

**Would you like to resume?**
- Yes: Continue from last checkpoint
- No: Start new session
```

## Resume Flow

If user confirms resume:

### 1. Verify Worktree Still Exists

```bash
cd /Users/user/project/.worktrees/spec-000042-auth && \
  echo "Directory: $(pwd)" && \
  echo "Branch: $(git branch --show-current)"

# If worktree missing:
# -> CANNOT RESUME
# -> Offer to start fresh or recover manually
```

### 2. Verify Git Status

```bash
cd /Users/user/project/.worktrees/spec-000042-auth && \
  git status --short

# If uncommitted changes:
# -> Show changes to user
# -> Ask: Commit, stash, or discard?
```

### 3. Resume EXECUTE Phase from Checkpoint

```bash
# Read resumeInstructions from checkpoint
# "Continue with next issue or proceed to VERIFY if all done"

# Resume execution loop with remaining issues:
# Tasks pending: ["ISS-000045", "ISS-000046"]

# Use same sessionId for continuity
# All subsequent session_phase calls use: "2025-02-02-abc123"

# --- Issue 4 (resumed) ---
# issues_update(id: "ISS-000045", status: "in_progress")
# Dispatch subagent: "Implement ISS-000045: Implement user authentication flow"
# Subagent follows implementing-issue skill: TDD -> Code Review -> Complete
# session_checkpoint(tasksCompleted: ["ISS-000042","ISS-000043","ISS-000044","ISS-000045"], tasksPending: ["ISS-000046"])
# issues_mark_complete(id: "ISS-000045")

# --- Issue 5 (resumed) ---
# issues_update(id: "ISS-000046", status: "in_progress")
# Dispatch subagent: "Implement ISS-000046: Add authentication middleware"
# Subagent follows implementing-issue skill: TDD -> Code Review -> Complete
# session_checkpoint(tasksCompleted: ["ISS-000042","ISS-000043","ISS-000044","ISS-000045","ISS-000046"], tasksPending: [])
# issues_mark_complete(id: "ISS-000046")
```

### 4. Continue Through Remaining Phases

```bash
# EXECUTE phase complete -> Proceed to VERIFY
# -> Extract criteria
# -> Verify evidence
# -> Run tests
# -> Calculate compliance

# VERIFY passes -> Proceed to PUBLISH
# -> Update PR (already exists)
# -> Mark ready

# PUBLISH complete -> Proceed to COMPLETE
# -> Complete session
# -> Present summary
```

## Checkpoint Strategy

Checkpoints saved after each issue ensures minimal loss:

```bash
# After each issue completion
session_checkpoint(
  sessionId: "2025-02-02-abc123",
  tasksCompleted: [...completed],
  tasksPending: [...remaining],
  lastAction: "Completed {ISSUE_ID}: {issue_title}",
  resumeInstructions: "Continue with next issue or proceed to VERIFY if all done"
)
```

## Recovery Scenarios

### Scenario 1: Interrupted During PLAN

```
Status: PLAN phase incomplete
Recovery: Re-run PLAN phase from beginning
Note: No issues created yet, safe to restart
```

### Scenario 2: Interrupted During EXECUTE (mid-issue)

```
Status: Issue partially implemented by subagent
Recovery:
1. Check git log - what was committed?
2. Check issue status - what's complete?
3. Option A: Mark current issue complete if tests pass
4. Option B: Re-dispatch subagent for current issue from scratch
5. Continue execution loop with remaining issues
```

### Scenario 3: Interrupted During VERIFY

```
Status: Compliance check incomplete
Recovery: Re-run VERIFY phase from beginning
Note: All implementation done, verification is idempotent
```

### Scenario 4: Interrupted During PUBLISH

```
Status: PR created but not marked ready
Recovery:
1. Verify PR exists (from checkpoint metadata)
2. Re-run PUBLISH phase (update description, mark ready)
3. Complete session
```

## Error Handling

### Worktree Missing

```markdown
Cannot resume session: worktree not found

**Expected:** /Users/user/project/.worktrees/spec-000042-auth
**Status:** Does not exist

**Options:**
1. Recreate worktree from branch (if branch exists on remote)
2. Start fresh with new session
3. Manual recovery (check out branch manually)
```

### Branch Diverged

```markdown
Cannot resume session: branch diverged

**Local:** 5 commits ahead, 3 commits behind remote
**Status:** Requires manual intervention

**Options:**
1. Push local commits (if confident)
2. Pull and resolve conflicts
3. Start fresh with new session
```

### Session Corruption

```markdown
Cannot resume session: checkpoint data corrupted

**Status:** session_get returned invalid data

**Options:**
1. Inspect audit trail manually (.wrangler/sessions/{id}/audit.jsonl)
2. Reconstruct state from git log
3. Start fresh with new session
```

## Key Takeaways

- Checkpoints enable recovery from any interruption
- session_get finds incomplete sessions automatically
- Verify worktree and git status before resuming
- Resume uses same sessionId for audit continuity
- Recovery is safest after phase boundaries (between issues)
- Mid-issue interruptions require manual assessment
