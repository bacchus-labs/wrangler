# Implementing Specs V2 - Detailed Guide


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

- **Always follow TDD:** Tests before implementation (enforced by implementing-issues skill)
- **Never skip VERIFY:** Mandatory compliance check (100% required)
- **Use PR as audit trail:** All progress visible in GitHub
- **Update PR regularly:** Keep stakeholders informed
- **100% compliance required:** Cannot merge without all criteria met

---

## Integration with Existing Skills

**Phase 1 (INIT):**
- Uses `session_start` MCP tool (from wrangler MCP server)
- Pattern from `implementing-issues-spec` skill

**Phase 2 (PLAN):**
- Invokes `writing-plans` skill (subagent dispatch)
- Creates MCP issues (source of truth)
- Optional plan file for architecture context

**Phase 3 (EXECUTE):**
- Invokes `implementing-issues` skill (autonomous execution)
- TDD enforcement via `practicing-tdd` skill
- Code review via `requesting-reviewing-code` skill

**Phase 4 (VERIFY):**
- LLM-based extraction (intelligent, not brittle)
- Test suite verification
- Compliance calculation

**Phase 5 (PUBLISH):**
- GitHub PR operations
- Final summary generation

This modular approach means:
- Changes to planning logic happen in `writing-plans` (one place)
- Changes to implementation logic happen in `implementing-issues` (one place)
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
