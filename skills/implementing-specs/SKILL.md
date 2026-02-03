---
name: implementing-specs
description: Orchestrates spec-to-PR workflow with session tracking, worktree isolation, and audit trail. Use when implementing specifications that require full lifecycle management from planning through PR creation.
---

# Implement-Spec Orchestrator

## Overview

End-to-end orchestration that takes a specification file and produces a GitHub Pull Request with comprehensive audit trail.

**Core principle:** Single command produces PR with verified implementation, full observability, and recovery capability.

**Entry point:** `/wrangler:implementing-issues [spec-file]`

**Produces:**
- GitHub Pull Request with comprehensive summary
- Audit trail in `.wrangler/sessions/{session-id}/`
- Machine-verifiable execution log

## When to Use

**Use this skill when:**
- User says "implementing-issues this spec" and wants a PR
- You want full audit trail and observability
- You need session recovery capability
- You want isolated worktree for implementation

**Do NOT use this skill when:**
- Implementing a single issue (use `implementing-issues` skill directly)
- User wants manual control over each step
- Working on existing PR or branch (use `implementing-issues` skill)

## Workflow Phases

The orchestrator executes 6 phases in order:

```
INIT -> PLAN -> EXECUTE -> VERIFY -> PUBLISH -> REPORT
```

Each phase is tracked via MCP session tools for full observability.

## Phase 1: INIT

Initialize session, create worktree, and establish context.

### Steps

1. **Start session**

   Call `session_start` MCP tool:
   ```
   session_start(specFile: "{SPEC_FILE}")
   ```

   Capture response:
   - `SESSION_ID` = response.sessionId
   - `WORKTREE_ABSOLUTE` = response.worktreePath
   - `BRANCH_NAME` = response.branchName
   - `AUDIT_PATH` = response.auditPath

2. **Verify worktree**

   ```bash
   cd {WORKTREE_ABSOLUTE} && \
     echo "=== WORKTREE VERIFICATION ===" && \
     echo "Directory: $(pwd)" && \
     echo "Git root: $(git rev-parse --show-toplevel)" && \
     echo "Branch: $(git branch --show-current)" && \
     test "$(git branch --show-current)" = "{BRANCH_NAME}" && echo "VERIFIED" || echo "FAILED"
   ```

   **If verification fails, STOP and report error.**

3. **Log phase complete**

   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "init",
     status: "complete"
   )
   ```

### Outputs

- Session ID for all subsequent phases
- Worktree absolute path for subagent context
- Branch name for PR creation

## Phase 2: PLAN

Create implementation plan with MCP issues.

### Steps

1. **Log phase start**

   ```
   session_phase(sessionId: SESSION_ID, phase: "plan", status: "started")
   ```

2. **Invoke writing-plans skill**

   Use the Task tool to dispatch planning subagent:

   ```markdown
   Tool: Task
   Description: "Create implementation plan for {SPEC_FILE}"
   Prompt: |
     You are creating an implementation plan for a specification.

     ## Working Directory Context

     **Working directory:** {WORKTREE_ABSOLUTE}
     **Branch:** {BRANCH_NAME}
     **Session ID:** {SESSION_ID}

     ## Specification

     Read and analyze: {SPEC_FILE}

     ## Your Job

     1. Read the specification file
     2. Break down into implementable tasks
     3. Create MCP issues for each task using issues_create
     4. Return the list of issue IDs created

     Use the writing-plans skill approach:
     - Each task should be <250 LOC
     - Clear acceptance criteria per task
     - Dependencies between tasks if any

     ## Output Required

     Return:
     - Total task count
     - List of issue IDs created (e.g., ["ISS-000042", "ISS-000043"])
     - Any blockers or clarification needed
   ```

3. **Capture issue IDs**

   Parse planning subagent response for:
   - `ISSUE_IDS` = list of created issue IDs
   - `TASK_COUNT` = number of tasks created

4. **Log phase complete**

   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "plan",
     status: "complete",
     metadata: {
       issues_created: ISSUE_IDS,
       total_tasks: TASK_COUNT
     }
   )
   ```

5. **Save checkpoint**

   ```
   session_checkpoint(
     sessionId: SESSION_ID,
     tasksCompleted: [],
     tasksPending: ISSUE_IDS,
     lastAction: "Created implementation plan with {TASK_COUNT} tasks",
     resumeInstructions: "Continue with execute phase, implementing-issues issues: {ISSUE_IDS}"
   )
   ```

### Gate

If planning fails or returns blockers, ESCALATE to user.

## Phase 3: EXECUTE

Implement all tasks using subagents.

### Steps

1. **Log phase start**

   ```
   session_phase(sessionId: SESSION_ID, phase: "execute", status: "started")
   ```

2. **Invoke implementing-issues skill**

   Use the `implementing-issues` skill with worktree context:

   ```markdown
   I'm using the implementing-issues skill to execute all tasks.

   ## Context for Implement Skill

   **Scope:** issues {ISSUE_IDS}
   **Working directory:** {WORKTREE_ABSOLUTE}
   **Branch:** {BRANCH_NAME}
   **Session ID:** {SESSION_ID}

   ## CRITICAL: Worktree Context

   ALL subagents MUST receive:
   - Working directory: {WORKTREE_ABSOLUTE}
   - Branch: {BRANCH_NAME}

   ALL bash commands MUST use:
   ```bash
   cd {WORKTREE_ABSOLUTE} && [command]
   ```

   ## Checkpoint After Each Task

   After each task completes, call:
   ```
   session_checkpoint(
     sessionId: {SESSION_ID},
     tasksCompleted: [...completed_ids],
     tasksPending: [...remaining_ids],
     lastAction: "Completed task {task_id}: {task_title}",
     resumeInstructions: "Continue with next task or proceed to verify if all done"
   )
   ```
   ```

3. **Track task completion**

   For each completed task:
   - Record task audit entry via `session_phase` with phase="task"
   - Save checkpoint via `session_checkpoint`

4. **Log phase complete**

   When all tasks complete:
   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "execute",
     status: "complete",
     metadata: {
       tasks_completed: TASK_COUNT,
       total_commits: N
     }
   )
   ```

### Gate

If any task cannot be completed after escalation, session pauses.

## Phase 4: VERIFY

Fresh test run and requirements check.

### Steps

1. **Log phase start**

   ```
   session_phase(sessionId: SESSION_ID, phase: "verify", status: "started")
   ```

2. **Run fresh test suite**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && npm test 2>&1 | tee ".wrangler/sessions/{SESSION_ID}/final-test-output.txt"
   ```

   Capture:
   - `TEST_EXIT_CODE` = exit code
   - `TESTS_TOTAL` = total test count
   - `TESTS_PASSED` = passing test count

3. **Check git status**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && git status --short
   ```

   Capture:
   - `GIT_CLEAN` = true if output is empty

4. **Log phase complete**

   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "verify",
     status: "complete",
     metadata: {
       tests_exit_code: TEST_EXIT_CODE,
       tests_total: TESTS_TOTAL,
       tests_passed: TESTS_PASSED,
       git_clean: GIT_CLEAN
     }
   )
   ```

### Gate

**CRITICAL:** Do NOT proceed to publish if:
- `TEST_EXIT_CODE != 0` - tests failing
- `GIT_CLEAN == false` - uncommitted changes

If verification fails:
1. Log error and halt
2. Inform user of verification failure
3. Session remains in "paused" state for recovery

## Phase 5: PUBLISH

Push branch and create PR.

### Steps

1. **Log phase start**

   ```
   session_phase(sessionId: SESSION_ID, phase: "publish", status: "started")
   ```

2. **Push branch**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && git push -u origin "{BRANCH_NAME}"
   ```

3. **Generate PR body**

   Create comprehensive PR body from audit data:

   ```markdown
   ## Summary

   Implements specification: `{SPEC_FILE}`

   ### Changes

   {git log main..HEAD --oneline formatted as bullet list}

   ### Test Results

   - All tests passing ({TESTS_TOTAL} tests)

   ### Tasks Completed

   {For each task from session:}
   - [x] {task_id}: {task_title} ({commit_hash})

   ### Implementation Details

   - TDD compliance: All functions certified
   - Code review: All tasks approved

   ---

   **Session ID:** `{SESSION_ID}`
   **Audit trail:** `.wrangler/sessions/{SESSION_ID}/`

   Generated with [Claude Code](https://claude.com/claude-code)
   ```

4. **Create PR**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && gh pr create \
     --title "feat({SPEC_NAME}): implementing-issues specification" \
     --body "{PR_BODY}" \
     --base main \
     --head "{BRANCH_NAME}"
   ```

   Capture:
   - `PR_URL` = PR URL from output
   - `PR_NUMBER` = PR number from output

5. **Log phase complete**

   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "publish",
     status: "complete",
     metadata: {
       pr_url: PR_URL,
       pr_number: PR_NUMBER,
       branch_pushed: true
     }
   )
   ```

### Gate

If push or PR creation fails:
1. Log error
2. Inform user (may need to configure gh auth)
3. Session pauses but work is preserved

## Phase 6: REPORT

Complete session and present summary.

### Steps

1. **Complete session**

   ```
   session_complete(
     sessionId: SESSION_ID,
     status: "completed",
     prUrl: PR_URL,
     prNumber: PR_NUMBER,
     summary: "Implemented {TASK_COUNT} tasks from {SPEC_FILE}"
   )
   ```

2. **Present summary to user**

   ```markdown
   ## Implementation Complete

   **Specification:** {SPEC_FILE}
   **PR:** {PR_URL}
   **Session:** {SESSION_ID}

   ### Summary

   | Metric | Value |
   |--------|-------|
   | Tasks completed | {TASK_COUNT}/{TASK_COUNT} |
   | Tests passing | {TESTS_TOTAL} |
   | Code reviews | {TASK_COUNT} approved |

   ### Audit Trail

   Location: `.wrangler/sessions/{SESSION_ID}/`

   **Verify execution:**
   ```bash
   cat .wrangler/sessions/{SESSION_ID}/audit.jsonl | jq -s '{
     phases: [.[].phase] | unique,
     tasks: [.[] | select(.phase == "task")] | length,
     all_passed: [.[] | select(.phase == "task") | .tests_passed] | all,
     pr_created: ([.[] | select(.phase == "publish")] | length) > 0
   }'



## Workflow Checklist

Copy this checklist to track your progress:

See `assets/workflow-checklist.md` for the complete checklist.

## References


For detailed information, see:

- `references/detailed-guide.md` - Complete workflow details, examples, and troubleshooting
