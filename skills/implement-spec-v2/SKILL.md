# implement-spec-v2: Modular Specification Implementation

## Purpose

Orchestrates specification implementation by invoking existing wrangler skills (writing-plans, implement) rather than reimplementing their logic. Focuses on workflow coordination and compliance verification.

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

**Phase 1 (INIT)**: Uses `session_start` MCP tool (from implement-spec skill)
**Phase 2 (PLAN)**: Invokes `writing-plans` skill to create MCP issues
**Phase 3 (EXECUTE)**: Invokes `implement` skill for each issue
**Phase 4 (VERIFY)**: LLM-based compliance audit
**Phase 5 (PUBLISH)**: GitHub PR finalization

**Benefits of this approach:**
- No duplicated planning logic (writing-plans is source of truth)
- No duplicated implementation logic (implement is source of truth)
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

See `implement-spec` skill for detailed session_start usage patterns.

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
     resumeInstructions: "Continue with execute phase, implement issues: {ISSUE_IDS}"
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

Implement all tasks using implement skill.

### Objective

Execute all implementation tasks with TDD and code review.

### Actions

1. **Log phase start**
   ```
   session_phase(sessionId: SESSION_ID, phase: "execute", status: "started")
   ```

2. **Invoke implement skill for each issue**

   Use the `implement` skill with worktree context:

   ```markdown
   I'm using the implement skill to execute all tasks.

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
- Tests passing (verified by implement skill)
- Code reviewed (handled by implement skill)
- PR description shows progress

### Quality Gate

All tasks complete (implement skill handles escalation for blockers). If any task cannot be completed, session pauses.

### Why This Works

The implement skill already handles:
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

   Implements specification: `{SPEC_FILE}`

   ### Changes

   {git log main..HEAD --oneline formatted as bullet list}

   ### Test Results

   - All tests passing ({TESTS_TOTAL} tests)
   - Compliance: {COMPLIANCE}%

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

3. **Update PR description**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && \
   gh pr edit {PR_NUMBER} --body "{PR_BODY}"
   ```

4. **Mark PR as ready**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && \
   gh pr ready {PR_NUMBER}
   ```

5. **Request reviews if needed**

   ```bash
   cd "{WORKTREE_ABSOLUTE}" && \
   gh pr edit {PR_NUMBER} --add-reviewer {REVIEWER}
   ```

6. **Log phase complete**
   ```
   session_phase(
     sessionId: SESSION_ID,
     phase: "publish",
     status: "complete",
     metadata: {
       pr_url: PR_URL,
       pr_number: PR_NUMBER,
       pr_ready: true
     }
   )
   ```

### Outputs

- PR marked as ready
- Complete description visible
- Reviewers notified (if configured)

### Quality Gate

PR ready for merge after review approval.

---

## Phase 6: COMPLETE

Finalize session and present summary.

### Objective

Complete session tracking and present summary to user.

### Actions

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
   | Compliance | {COMPLIANCE}% |
   | Code reviews | {TASK_COUNT} approved |

   ### Audit Trail

   Location: `.wrangler/sessions/{SESSION_ID}/`

   **Verify execution:**
   ```bash
   cat .wrangler/sessions/{SESSION_ID}/audit.jsonl | jq -s '{
     phases: [.[].phase] | unique,
     tasks: [.[] | select(.phase == "task")] | length,
     pr_created: ([.[] | select(.phase == "publish")] | length) > 0
   }'
   ```
   ```

### Outputs

- Session marked complete
- PR URL shared with user
- Audit trail location provided

---

## Quality Gates Summary

| Phase | Gate | Required |
|-------|------|----------|
| INIT | Worktree created | Yes |
| PLAN | Issues created | Yes |
| EXECUTE | All tasks complete | Yes |
| VERIFY | 100% compliance | Yes |
| VERIFY | All tests passing | Yes |
| PUBLISH | PR ready | Yes |

**VERIFY phase is mandatory.** You cannot skip from EXECUTE to PUBLISH.

---

## Scripts Reference

### generate-pr-description.sh

**Purpose:** Generate PR description from template and session data.
**Usage:** `./scripts/generate-pr-description.sh <phase> <session-data>`
**Phases:** planning, execution, verification, complete
**Output:** Markdown PR description

### update-pr-description.sh

**Purpose:** Update GitHub PR description via gh CLI with sensitive data sanitization.
**Usage:** `./scripts/update-pr-description.sh <prNumber> <newDescription>`
**Output:** Updated PR on GitHub

**Note:** analyze-spec.sh has been removed in favor of LLM-based extraction.

---

## Error Handling

**Spec not found:**
- Verify spec file path is correct
- Check `.wrangler/specifications/` directory

**Session start failed:**
- Check MCP server is running
- Verify git repository is clean
- Check disk space for worktree

**PR creation failed:**
- Ensure `gh` CLI is authenticated (`gh auth status`)
- Check Git branch is pushed to remote
- Verify base branch exists

**Compliance < 100% in VERIFY:**
- Review unmet criteria in compliance report
- Address gaps or document exceptions
- Do NOT skip to PUBLISH phase

**Script execution errors:**
- Ensure all dependencies installed
- Check TypeScript compilation if using TS scripts
- Verify file paths are correct

---

## Examples

See `examples/` directory for detailed examples:
- `examples/simple-feature.md` - Simple feature (no E2E)
- `examples/complex-feature.md` - User-facing feature (with E2E)
- `examples/recovery.md` - Session recovery after interruption

---

## Compliance Notes

- **Always follow TDD:** Tests before implementation (enforced by implement skill)
- **Never skip VERIFY:** Mandatory compliance check (100% required)
- **Use PR as audit trail:** All progress visible in GitHub
- **Update PR regularly:** Keep stakeholders informed
- **100% compliance required:** Cannot merge without all criteria met

---

## Integration with Existing Skills

**Phase 1 (INIT):**
- Uses `session_start` MCP tool (from wrangler MCP server)
- Pattern from `implement-spec` skill

**Phase 2 (PLAN):**
- Invokes `writing-plans` skill (subagent dispatch)
- Creates MCP issues (source of truth)
- Optional plan file for architecture context

**Phase 3 (EXECUTE):**
- Invokes `implement` skill (autonomous execution)
- TDD enforcement via `test-driven-development` skill
- Code review via `requesting-code-review` skill

**Phase 4 (VERIFY):**
- LLM-based extraction (intelligent, not brittle)
- Test suite verification
- Compliance calculation

**Phase 5 (PUBLISH):**
- GitHub PR operations
- Final summary generation

This modular approach means:
- Changes to planning logic happen in `writing-plans` (one place)
- Changes to implementation logic happen in `implement` (one place)
- This skill focuses on orchestration and verification
- No duplication, easier to maintain

---

## Migration from V1

**Key Differences:**
- GitHub PR replaces local plan files as primary audit trail
- VERIFY phase is now mandatory (was optional in v1)
- Spec compliance must be 100% before PUBLISH
- PR description is living document (updated through phases)
- Uses skill orchestration instead of reimplementing logic

**Migration Steps:**
1. Create PR for existing feature branches
2. Run compliance audit on current implementation
3. Resume at appropriate phase (EXECUTE or VERIFY)
