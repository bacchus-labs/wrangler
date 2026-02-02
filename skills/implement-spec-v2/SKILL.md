# implement-spec-v2: GitHub-Centric Specification Implementation

## Purpose

Implements specifications using a five-phase GitHub-centric workflow with mandatory verification gates. The GitHub PR serves as the primary audit trail, replacing local plan files.

## When to Use

- Implementing specifications (SPEC-XXXXXX files)
- User-facing features requiring verification
- Complex implementations with multiple acceptance criteria
- When audit trail and progress tracking are critical

## Prerequisites

- Specification file exists in `.wrangler/specifications/`
- `gh` CLI installed and authenticated
- Git worktree configured (if using worktree pattern)
- Node.js and npm installed (for scripts)

## Workflow

### Phase 1: ANALYZE

**Objective:** Extract acceptance criteria and identify testing requirements.

**Actions:**
1. Run analyze-spec script:
   ```bash
   ts-node scripts/analyze-spec.ts <specFile> <sessionId>
   ```
2. Review extracted acceptance criteria
3. Verify E2E test requirements identified
4. Confirm manual testing checklist generated

**Outputs:**
- Acceptance criteria list (AC-001, AC-002, etc.)
- E2E test requirements (boolean + reasons)
- Manual testing checklist (MT-001, MT-002, etc.)
- Total criteria count

**Quality Gate:** Analysis results complete and validated.

---

### Phase 2: PLAN

**Objective:** Create GitHub PR and generate initial planning description.

**Actions:**
1. Create feature branch:
   ```bash
   git checkout -b feature/<spec-id>-<slug>
   ```

2. Generate planning PR description:
   ```bash
   ts-node scripts/generate-pr-description.ts planning templates/ analysis.json > planning.md
   ```

3. Create GitHub PR:
   ```bash
   gh pr create \
     --title "feat: <spec-title>" \
     --body "$(cat planning.md)" \
     --base main \
     --draft
   ```

4. Record PR number in session

**Outputs:**
- GitHub PR created (draft mode)
- Planning description visible in PR
- PR URL recorded

**Quality Gate:** PR created successfully with planning description.

---

### Phase 3: EXECUTE

**Objective:** Implement features and update PR with progress.

**Actions:**
1. For each acceptance criterion:
   - Write tests FIRST (TDD RED phase)
   - Implement feature (TDD GREEN phase)
   - Refactor (TDD REFACTOR phase)
   - Mark criterion as met

2. Update PR description with progress (after each major milestone):
   ```bash
   # Get task status from wrangler
   # Generate execution description
   ts-node scripts/generate-pr-description.ts execution templates/ analysis.json tasks.json > execution.md

   # Update PR
   ts-node scripts/update-pr-description.ts <prNumber> execution.md update-sections
   ```

3. Commit regularly with clear messages

**Outputs:**
- All tests passing
- Features implemented
- PR description shows progress
- Commits pushed to branch

**Quality Gate:** All acceptance criteria implemented (may not all be verified yet).

---

### Phase 4: VERIFY

**Objective:** Verify all acceptance criteria met and quality gates passed.

**This phase is MANDATORY and CANNOT be skipped.**

**Actions:**
1. Run compliance audit:
   ```bash
   ts-node scripts/audit-spec-compliance.ts analysis.json tasks.json > compliance.json
   ```

2. Review compliance report:
   - Check percentage complete
   - Review unmet criteria
   - Address recommendations

3. Execute quality gates:
   - [ ] All unit tests passing (80%+ coverage)
   - [ ] All E2E tests passing (if required)
   - [ ] Manual testing checklist complete
   - [ ] All acceptance criteria met (100%)

4. Update PR description with verification results:
   ```bash
   ts-node scripts/generate-pr-description.ts verification templates/ analysis.json > verification.md

   ts-node scripts/update-pr-description.ts <prNumber> verification.md update-sections
   ```

**Outputs:**
- Compliance report (100% complete)
- All quality gates passed
- PR description shows verification status

**Quality Gate:** 100% compliance + all quality gates passed.

**Blockers:** If compliance <100%, return to EXECUTE phase to address unmet criteria.

---

### Phase 5: PUBLISH

**Objective:** Finalize PR and request review.

**Actions:**
1. Update PR description with completion summary:
   ```bash
   ts-node scripts/generate-pr-description.ts complete templates/ analysis.json > complete.md

   ts-node scripts/update-pr-description.ts <prNumber> complete.md update-sections
   ```

2. Mark PR as ready for review:
   ```bash
   gh pr ready <prNumber>
   ```

3. Request reviews if needed:
   ```bash
   gh pr edit <prNumber> --add-reviewer <reviewer>
   ```

4. Monitor CI/CD checks

**Outputs:**
- PR marked as ready
- Complete description visible
- Reviewers notified

**Quality Gate:** PR ready for merge after review approval.

---

## Quality Gates Summary

| Phase | Gate | Required |
|-------|------|----------|
| ANALYZE | Analysis complete | Yes |
| PLAN | PR created | Yes |
| EXECUTE | Features implemented | Yes |
| VERIFY | 100% compliance | Yes |
| VERIFY | All tests passing | Yes |
| VERIFY | Manual testing complete | If E2E required |
| PUBLISH | PR ready | Yes |

**VERIFY phase is mandatory.** You cannot skip from EXECUTE to PUBLISH.

---

## Scripts Reference

### analyze-spec.ts
**Purpose:** Extract acceptance criteria from specification file.
**Usage:** `ts-node analyze-spec.ts <specFile> <sessionId>`
**Output:** JSON with acceptance criteria, E2E requirements, manual checklist

### generate-pr-description.ts
**Purpose:** Generate PR description from template and analysis.
**Usage:** `ts-node generate-pr-description.ts <phase> <templatesDir> <analysisPath>`
**Phases:** planning, execution, verification, complete
**Output:** Markdown PR description

### audit-spec-compliance.ts
**Purpose:** Calculate spec compliance percentage.
**Usage:** `ts-node audit-spec-compliance.ts <analysisPath> <tasksPath>`
**Output:** JSON with compliance report (percentage, recommendations)

### update-pr-description.ts
**Purpose:** Update GitHub PR description via gh CLI.
**Usage:** `ts-node update-pr-description.ts <prNumber> <newDescriptionPath> [strategy] [--dry-run]`
**Strategies:** replace, append, update-sections (default)
**Output:** Updated PR on GitHub

---

## Templates Reference

All templates are in `templates/` directory and use Handlebars syntax.

**planning.hbs:** Initial planning phase description (criteria, checklist, next steps)
**execution.hbs:** Progress tracking (task completion, compliance percentage)
**verification.hbs:** Quality gates and verification status (tests, manual testing, blockers)
**complete.hbs:** Final summary (all criteria met, ready for review)

---

## Error Handling

**Spec not found:**
- Verify spec file path is correct
- Check `.wrangler/specifications/` directory

**PR creation failed:**
- Ensure `gh` CLI is authenticated (`gh auth status`)
- Check Git branch is pushed to remote
- Verify base branch exists

**Compliance < 100% in VERIFY:**
- Review unmet criteria in compliance report
- Return to EXECUTE phase to address gaps
- Do NOT skip to PUBLISH phase

**Script execution errors:**
- Ensure all dependencies installed (`npm install`)
- Check TypeScript compilation (`npm run build`)
- Verify file paths are correct

---

## Examples

### Example 1: Simple Feature (No E2E)

```bash
# ANALYZE
ts-node scripts/analyze-spec.ts .wrangler/specifications/SPEC-000042.md session-123 > analysis.json

# PLAN
git checkout -b feature/spec-000042-auth
ts-node scripts/generate-pr-description.ts planning templates/ analysis.json > planning.md
gh pr create --title "feat: authentication system" --body "$(cat planning.md)" --draft

# EXECUTE
# ... implement features, run tests ...
ts-node scripts/generate-pr-description.ts execution templates/ analysis.json tasks.json > execution.md
ts-node scripts/update-pr-description.ts 123 execution.md

# VERIFY
ts-node scripts/audit-spec-compliance.ts analysis.json tasks.json > compliance.json
# Check compliance.json shows 100%
ts-node scripts/generate-pr-description.ts verification templates/ analysis.json > verification.md
ts-node scripts/update-pr-description.ts 123 verification.md

# PUBLISH
ts-node scripts/generate-pr-description.ts complete templates/ analysis.json > complete.md
ts-node scripts/update-pr-description.ts 123 complete.md
gh pr ready 123
```

### Example 2: User-Facing Feature (With E2E)

Same as Example 1, but VERIFY phase includes:
- Running E2E test suite
- Completing manual testing checklist
- Recording verification evidence

---

## Compliance Notes

- **Always follow TDD:** Tests before implementation
- **Never skip VERIFY:** Mandatory compliance check
- **Use PR as audit trail:** All progress visible in GitHub
- **Update PR regularly:** Keep stakeholders informed
- **100% compliance required:** Cannot merge without all criteria met

---

## Migration from V1

**Key Differences:**
- GitHub PR replaces local plan files
- VERIFY phase is now mandatory (was optional in v1)
- Spec compliance must be 100% before PUBLISH
- PR description is living document (updated through phases)

**Migration Steps:**
1. Create PR for existing feature branches
2. Generate analysis from existing spec
3. Audit current compliance status
4. Resume at appropriate phase (EXECUTE or VERIFY)
