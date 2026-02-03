---
name: implementing-specs-v2
description: Orchestrates specification implementation through planning, execution, verification, and PR publication phases with session recovery. Use when implementing complex specifications requiring phased workflow and resumable progress tracking.
---

# implementing-issues-spec-v2: Modular Specification Implementation

## Purpose

Orchestrates specification implementation by invoking existing wrangler skills (writing-plans, implementing-issues) rather than reimplementing their logic. Focuses on workflow coordination and compliance verification.

## When to Use

- Implementing specifications (SPEC-XXXXXX files)
- User-facing features requiring verification gates
- Need systematic audit trail through GitHub PR
- Want to leverage existing planning and implementation skills

## Prerequisites

- Specification file exists in `.wrangler/specifications/`
- `gh` CLI installed and authenticated
- Git worktree configured (session_start will create it)
- Bash 4.0+ (for scripts)
- `jq` command-line JSON processor

## Architecture: Skill Orchestration

This skill orchestrates existing wrangler skills rather than reimplementing their logic:

**Phase 1 (INIT)**: Uses `session_start` MCP tool (from implementing-issues-spec skill)
**Phase 2 (PLAN)**: Invokes `writing-plans` skill to create MCP issues
**Phase 3 (EXECUTE)**: Invokes `implementing-issues` skill for each issue
**Phase 4 (VERIFY)**: LLM-based compliance audit
**Phase 5 (PUBLISH)**: GitHub PR finalization

**Benefits of this approach:**
- No duplicated planning logic (writing-plans is source of truth)
- No duplicated implementation logic (implementing-issues is source of truth)
- Modular and maintainable (changes to planning flow in one place)
- Testable (each skill can be tested independently)

## Workflow Phases

```
INIT → PLAN → EXECUTE → VERIFY → PUBLISH → COMPLETE
```

---

## Phase 1: INIT

Initialize session, create worktree, and establish context.

### Objective

Create isolated worktree using MCP session tools and verify environment.

### Actions

1. **Start session** - Call `session_start` MCP tool
   ```
   session_start(specFile: "{SPEC_FILE}")
   ```

   Capture response:
   - `SESSION_ID` = response.sessionId
   - `WORKTREE_ABSOLUTE` = response.worktreePath
   - `BRANCH_NAME` = response.branchName
   - `AUDIT_PATH` = response.auditPath

2. **Verify worktree** - Ensure on correct branch
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

### Quality Gate

Worktree must exist and be on correct branch.

### Reference Implementation

See `implementing-issues-spec` skill for detailed session_start usage patterns.

---

## Phase 2: PLAN

Create implementation plan using writing-plans skill.

### Objective

Break specification into implementable tasks tracked as MCP issues.

### Actions

1. **Log phase start**
   ```
   session_phase(sessionId: SESSION_ID, phase: "plan", status: "started")
   ```

2. **Invoke writing-plans skill on worktree**

   Use Task tool to dispatch planning subagent:

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

     1. Read the specification file completely
     2. Invoke the writing-plans skill to break it down into tasks
     3. The writing-plans skill will:
        - Create MCP issues for each task (issues_create)
        - Optionally create plan file if architecture context needed
        - Return list of issue IDs created
     4. Return to me:
        - Total task count
        - List of issue IDs created (e.g., ["ISS-000042", "ISS-000043"])
        - Any blockers or clarification needed

     IMPORTANT: Let writing-plans handle all planning logic. Your job
     is to invoke it and report back the results.
   ```

3. **Capture issue IDs**

   Parse planning subagent response for:
   - `ISSUE_IDS` = list of created issue IDs
   - `TASK_COUNT` = number of tasks created

4. **Create GitHub PR with overview (not full plan)**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && \
   gh pr create \
     --title "feat: {SPEC_TITLE}" \
     --body "Implements {SPEC_FILE}. See .wrangler/issues/ for task details." \
     --draft \
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
     phase: "plan",
     status: "complete",
     metadata: {
       issues_created: ISSUE_IDS,
       total_tasks: TASK_COUNT,
       pr_url: PR_URL,
       pr_number: PR_NUMBER
     }
   )
   ```

6. **Save checkpoint**
   ```
   session_checkpoint(
     sessionId: SESSION_ID,
     tasksCompleted: [],
     tasksPending: ISSUE_IDS,
     lastAction: "Created implementation plan with {TASK_COUNT} tasks",
     resumeInstructions: "Continue with execute phase, implementing-issues issues: {ISSUE_IDS}"
   )
   ```

### Outputs

- Wrangler issues created (ISS-XXXXXX files in .wrangler/issues/)
- Local plan file (if writing-plans created it for architecture context)
- GitHub PR created (draft mode)
- Issue IDs list for execution phase

### Quality Gate

Planning succeeds and issues are created. If planning fails or returns blockers, ESCALATE to user.

### Key Design Decision

**Why GitHub PR shows overview, not full plan:**
- PR is for stakeholders/reviewers (high-level context)
- MCP issues are source of truth (complete implementation details)
- Optional plan file (if created) provides architecture reference
- This keeps PR descriptions concise while maintaining full traceability

---

## Phase 3: EXECUTE

Implement all tasks using implementing-issues skill.

### Objective

Execute all implementation tasks with TDD and code review.

### Actions

1. **Log phase start**
   ```
   session_phase(sessionId: SESSION_ID, phase: "execute", status: "started")
   ```

2. **Invoke implementing-issues skill for each issue**

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
   - Update PR description with progress (periodically)

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

### Outputs

- All issues implemented
- Tests passing (verified by implementing-issues skill)
- Code reviewed (handled by implementing-issues skill)
- PR description shows progress

### Quality Gate

All tasks complete (implementing-issues skill handles escalation for blockers). If any task cannot be completed, session pauses.

### Why This Works

The implementing-issues skill already handles:
- Subagent dispatch with worktree context
- TDD enforcement
- Code review automation
- Fix retry logic
- Escalation for blockers

We simply invoke it with our session context and let it do its job.

---

## Phase 4: VERIFY

Run compliance audit using LLM-based verification.

### Objective

Verify all acceptance criteria met using intelligent extraction (not brittle scripts).

### Actions

1. **Log phase start**
   ```
   session_phase(sessionId: SESSION_ID, phase: "verify", status: "started")
   ```

2. **Extract acceptance criteria from spec (LLM-based)**

   Read specification and use LLM to extract:
   - All acceptance criteria (AC-001, AC-002, etc.)
   - E2E test requirements
   - Manual testing checklist items

   **Why LLM not script:**
   - Handles varied spec formats gracefully
   - Can infer criteria from prose descriptions
   - Won't break if spec structure differs slightly
   - More intelligent than regex parsing

3. **Verify each criterion has evidence**

   For each acceptance criterion:
   - Search for corresponding test
   - Search for implementing code
   - Search for relevant commits
   - Calculate compliance percentage

4. **Run fresh test suite**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && npm test 2>&1 | tee ".wrangler/sessions/{SESSION_ID}/final-test-output.txt"
   ```

   Capture:
   - `TEST_EXIT_CODE` = exit code
   - `TESTS_TOTAL` = total test count
   - `TESTS_PASSED` = passing test count

5. **Check git status**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && git status --short
   ```

   Capture:
   - `GIT_CLEAN` = true if output is empty

6. **Calculate compliance percentage**

   ```
   COMPLIANCE = (criteria_met / total_criteria) * 100
   ```

7. **Log phase complete**
   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "verify",
     status: "complete",
     metadata: {
       compliance_percentage: COMPLIANCE,
       tests_exit_code: TEST_EXIT_CODE,
       tests_total: TESTS_TOTAL,
       tests_passed: TESTS_PASSED,
       git_clean: GIT_CLEAN
     }
   )
   ```

### Outputs

- Compliance report (X% complete)
- Test results (all passing or failures documented)
- Git status (clean or uncommitted changes documented)

### Quality Gate

**CRITICAL:** 100% compliance required to proceed.

**Blockers:** If compliance < 100%:
1. Log unmet criteria and evidence gaps
2. Inform user of verification failure
3. Session remains in "paused" state
4. User must address gaps or approve exceptions

**Also block if:**
- `TEST_EXIT_CODE != 0` - tests failing
- `GIT_CLEAN == false` - uncommitted changes

---

## Phase 5: PUBLISH

Finalize PR and mark ready for review.

### Objective

Update PR with final summary and mark ready for merge.

### Actions

1. **Log phase start**
   ```
   session_phase(sessionId: SESSION_ID, phase: "publish", status: "started")
   ```

2. **Generate final PR description**

   Create comprehensive PR body from audit data:

   ```markdown
   ## Summary

## References

For detailed information, see:

- `references/detailed-guide.md` - Complete workflow details, examples, and troubleshooting
