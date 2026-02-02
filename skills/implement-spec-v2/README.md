# implement-spec-v2: GitHub-Centric Specification Implementation

## Overview

`implement-spec-v2` is a comprehensive workflow system for implementing specifications using GitHub PR as the primary audit trail. It replaces local plan files with a living PR description that updates through five distinct phases: ANALYZE, PLAN, EXECUTE, VERIFY, and PUBLISH.

**Key Features:**
- GitHub PR as single source of truth
- Mandatory verification gates (cannot skip VERIFY)
- Automatic E2E test requirement detection
- Spec compliance tracking (must reach 100%)
- Phase-based PR description updates
- TDD enforcement throughout

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Workflow Phases](#workflow-phases)
- [Scripts](#scripts)
- [Templates](#templates)
- [Quality Gates](#quality-gates)
- [Testing](#testing)
- [Migration from V1](#migration-from-v1)
- [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- Node.js 16+ and npm
- Git
- GitHub CLI (`gh`) installed and authenticated
- TypeScript compiler

### Setup

```bash
cd skills/implement-spec-v2
npm install
npm run build
```

### Verify Installation

```bash
# Check gh CLI is authenticated
gh auth status

# Test script execution
ts-node scripts/analyze-spec.ts --help
```

## Quick Start

### 1. Invoke the Skill

```bash
/wrangler:implement-v2 SPEC-000042
```

### 2. Follow the Five-Phase Workflow

The skill will guide you through:
- **ANALYZE:** Extract acceptance criteria from spec
- **PLAN:** Create GitHub PR with planning description
- **EXECUTE:** Implement features with TDD
- **VERIFY:** Verify 100% compliance (mandatory)
- **PUBLISH:** Mark PR ready for review

### 3. Monitor Progress

All progress is visible in the GitHub PR description, which updates through each phase.

## Workflow Phases

### Phase 1: ANALYZE

**Purpose:** Extract structured data from specification file.

**Actions:**
```bash
ts-node scripts/analyze-spec.ts .wrangler/specifications/SPEC-000042.md session-123 > analysis.json
```

**Outputs:**
- Acceptance criteria list (AC-001, AC-002, etc.)
- E2E test requirements (boolean + reasons)
- Manual testing checklist (MT-001, MT-002, etc.)

**Quality Gate:** Analysis complete and validated.

---

### Phase 2: PLAN

**Purpose:** Create GitHub PR with planning description.

**Actions:**
```bash
git checkout -b feature/spec-000042-implementation

ts-node scripts/generate-pr-description.ts planning templates/ analysis.json > planning.md

gh pr create \
  --title "feat: implement SPEC-000042" \
  --body "$(cat planning.md)" \
  --base main \
  --draft
```

**Outputs:**
- GitHub PR created (draft mode)
- Planning description visible
- PR number recorded

**Quality Gate:** PR created successfully.

---

### Phase 3: EXECUTE

**Purpose:** Implement features following TDD.

**Actions:**
- Write tests FIRST (RED phase)
- Implement features (GREEN phase)
- Refactor code (REFACTOR phase)
- Update PR description with progress

```bash
# After milestone completion
ts-node scripts/generate-pr-description.ts execution templates/ analysis.json tasks.json > execution.md

ts-node scripts/update-pr-description.ts 123 execution.md update-sections
```

**Outputs:**
- All tests passing
- Features implemented
- PR shows progress

**Quality Gate:** All acceptance criteria implemented.

---

### Phase 4: VERIFY

**Purpose:** Verify 100% compliance with quality gates.

**THIS PHASE IS MANDATORY AND CANNOT BE SKIPPED.**

**Actions:**
```bash
# Audit compliance
ts-node scripts/audit-spec-compliance.ts analysis.json tasks.json > compliance.json

# Verify compliance = 100%
# If < 100%, return to EXECUTE phase

# Update PR with verification status
ts-node scripts/generate-pr-description.ts verification templates/ analysis.json > verification.md

ts-node scripts/update-pr-description.ts 123 verification.md update-sections
```

**Quality Gates:**
- [ ] All unit tests passing (80%+ coverage)
- [ ] All E2E tests passing (if required)
- [ ] Manual testing checklist complete
- [ ] Spec compliance = 100%

**Blocker:** If compliance < 100%, must return to EXECUTE.

---

### Phase 5: PUBLISH

**Purpose:** Finalize PR and request review.

**Actions:**
```bash
# Generate completion summary
ts-node scripts/generate-pr-description.ts complete templates/ analysis.json > complete.md

ts-node scripts/update-pr-description.ts 123 complete.md update-sections

# Mark PR as ready
gh pr ready 123

# Request reviews (optional)
gh pr edit 123 --add-reviewer reviewer-username
```

**Outputs:**
- PR marked as ready for review
- Reviewers notified
- CI/CD checks running

**Quality Gate:** PR ready for merge after approval.

---

## Scripts

### analyze-spec.ts

**Purpose:** Extract acceptance criteria from specification file.

**Usage:**
```bash
ts-node scripts/analyze-spec.ts <specFile> <sessionId> [--output analysis.json]
```

**Example:**
```bash
ts-node scripts/analyze-spec.ts .wrangler/specifications/SPEC-000042.md session-123 > analysis.json
```

**Output Format:**
```json
{
  "acceptanceCriteria": [
    {
      "id": "AC-001",
      "description": "User can log in",
      "section": "FR-001",
      "priority": "must",
      "met": false
    }
  ],
  "e2eTestFeatures": ["AC-001: User can log in"],
  "manualTestingChecklist": [
    {
      "id": "MT-001",
      "description": "Start application"
    }
  ],
  "totalCriteria": 1
}
```

---

### generate-pr-description.ts

**Purpose:** Generate PR description from template and analysis data.

**Usage:**
```bash
ts-node scripts/generate-pr-description.ts <phase> <templatesDir> <analysisPath> [--tasks tasksPath] [--compliance compliancePath]
```

**Phases:**
- `planning` - Initial planning phase
- `execution` - Progress tracking
- `verification` - Quality gates
- `complete` - Final summary

**Example:**
```bash
ts-node scripts/generate-pr-description.ts planning templates/ analysis.json > planning.md
```

---

### audit-spec-compliance.ts

**Purpose:** Calculate spec compliance percentage and generate recommendations.

**Usage:**
```bash
ts-node scripts/audit-spec-compliance.ts <analysisPath> <tasksPath> [--output compliance.json]
```

**Example:**
```bash
ts-node scripts/audit-spec-compliance.ts analysis.json tasks.json > compliance.json
```

**Output Format:**
```json
{
  "totalCriteria": 4,
  "metCriteria": 2,
  "percentage": 50,
  "criteriaBreakdown": [...],
  "completedTasksCount": 2,
  "recommendations": ["Address must-have criterion: AC-003 - ..."],
  "summary": "Specification 50% complete: 2/4 criteria met"
}
```

---

### update-pr-description.ts

**Purpose:** Update GitHub PR description via gh CLI.

**Usage:**
```bash
ts-node scripts/update-pr-description.ts <prNumber> <newDescriptionPath> [strategy] [--dry-run]
```

**Merge Strategies:**
- `replace` - Replace entire description
- `append` - Append new content
- `update-sections` - Update specific sections (default)

**Example:**
```bash
ts-node scripts/update-pr-description.ts 123 execution.md update-sections

# Dry run (preview without updating)
ts-node scripts/update-pr-description.ts 123 execution.md update-sections --dry-run
```

---

## Templates

All templates use Handlebars syntax and are located in `templates/` directory.

### planning.hbs

**Purpose:** Initial planning phase description.

**Sections:**
- Spec information
- Analysis results
- E2E test requirements
- Acceptance criteria checklist
- Manual testing checklist
- Next steps

**Variables:**
- `specId`, `specTitle`, `status`, `priority`
- `taskCount`, `analyzedAt`
- `acceptanceCriteria`, `manualTestingChecklist`
- `requiresE2ETests`, `e2eTestFeatures`

---

### execution.hbs

**Purpose:** Progress tracking during implementation.

**Sections:**
- Implementation progress (tasks)
- Acceptance criteria (with checkboxes)
- Manual testing checklist
- Progress percentage

**Variables:**
- All planning variables
- `tasks` (array of {id, title, status})
- `complianceMet`, `complianceTotal`, `compliancePercentage`

---

### verification.hbs

**Purpose:** Quality gates and verification status.

**Sections:**
- Compliance status
- Quality gates (unit tests, E2E tests, manual testing)
- Spec compliance checklist
- Blockers (unmet criteria)

**Variables:**
- All execution variables
- `complianceReport` object

---

### complete.hbs

**Purpose:** Final summary when implementation complete.

**Sections:**
- Implementation complete banner
- All acceptance criteria (checked)
- Quality gates (all passed)
- Implementation summary
- Review checklist

**Variables:**
- All verification variables

---

## Quality Gates

### Required Gates

| Gate | When | Criteria |
|------|------|----------|
| Analysis Complete | ANALYZE → PLAN | All criteria extracted |
| PR Created | PLAN → EXECUTE | GitHub PR exists |
| Features Implemented | EXECUTE → VERIFY | All criteria implemented |
| **100% Compliance** | **VERIFY → PUBLISH** | **All criteria met** |
| Tests Passing | VERIFY → PUBLISH | 80%+ coverage |
| Manual Testing Complete | VERIFY → PUBLISH | If E2E required |
| PR Ready | PUBLISH → MERGE | Reviewers approved |

### Mandatory Verification

**The VERIFY phase cannot be skipped.** You must:
- Run compliance audit
- Achieve 100% compliance
- Pass all quality gates
- Update PR with verification results

**If compliance < 100%, you MUST return to EXECUTE phase.**

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Unit tests
npm test -- analyze-spec.test.ts
npm test -- audit-spec-compliance.test.ts
npm test -- generate-pr-description.test.ts
npm test -- update-pr-description.test.ts

# Integration tests
npm test -- integration.test.ts

# E2E tests
npm test -- e2e.test.ts
```

### Test Coverage

```bash
npm test -- --coverage
```

**Current Coverage:**
- Statements: 85%+
- Branches: 80%+
- Functions: 90%+
- Lines: 85%+

---

## Migration from V1

### Key Differences

| Feature | V1 | V2 |
|---------|----|----|
| Audit Trail | Local plan files | GitHub PR |
| VERIFY Phase | Optional | **Mandatory** |
| Compliance | Optional | **100% required** |
| PR Updates | Manual | Automated |
| E2E Detection | Manual | Automatic |

### Migration Steps

1. **For existing branches:**
   ```bash
   # Create PR if not exists
   gh pr create --title "feat: ..." --body "..." --draft

   # Generate analysis
   ts-node scripts/analyze-spec.ts .wrangler/specifications/SPEC-XXX.md session-id > analysis.json

   # Audit current state
   ts-node scripts/audit-spec-compliance.ts analysis.json tasks.json > compliance.json

   # Update PR with current status
   ts-node scripts/generate-pr-description.ts execution templates/ analysis.json tasks.json > execution.md
   ts-node scripts/update-pr-description.ts <prNumber> execution.md
   ```

2. **Resume at appropriate phase:**
   - If features incomplete: Resume at EXECUTE
   - If features complete: Move to VERIFY
   - If verified: Move to PUBLISH

---

## Troubleshooting

### Spec File Not Found

**Error:** `Spec file not found: /path/to/spec.md`

**Solution:**
- Verify spec file path is correct
- Check file exists in `.wrangler/specifications/`
- Use absolute path or relative from project root

### PR Creation Failed

**Error:** `gh: PR creation failed`

**Solution:**
- Ensure `gh` CLI is authenticated: `gh auth status`
- Check branch is pushed to remote: `git push -u origin branch-name`
- Verify base branch exists: `gh repo view`

### Compliance Less Than 100%

**Error:** Cannot proceed to PUBLISH with <100% compliance

**Solution:**
- Review compliance report for unmet criteria
- Return to EXECUTE phase
- Address all unmet criteria
- Re-run compliance audit
- Only proceed when percentage = 100%

### Template Not Found

**Error:** `Template file not found: templates/phase.hbs`

**Solution:**
- Verify templates directory path
- Check template file exists
- Use correct phase name (planning, execution, verification, complete)

### Script Execution Errors

**Error:** `Cannot find module` or `SyntaxError`

**Solution:**
- Install dependencies: `npm install`
- Build TypeScript: `npm run build`
- Use ts-node for direct execution: `ts-node scripts/script-name.ts`

---

## Examples

### Example 1: Simple Backend Feature

```bash
# ANALYZE
ts-node scripts/analyze-spec.ts .wrangler/specifications/SPEC-000042.md session-123 > analysis.json

# PLAN
git checkout -b feature/spec-000042-api
ts-node scripts/generate-pr-description.ts planning templates/ analysis.json > planning.md
gh pr create --title "feat: implement API endpoints" --body "$(cat planning.md)" --draft

# EXECUTE
# ... implement features with TDD ...
echo '[{"id":"ISS-001","title":"Add API route","status":"closed"}]' > tasks.json
ts-node scripts/generate-pr-description.ts execution templates/ analysis.json tasks.json > execution.md
ts-node scripts/update-pr-description.ts 123 execution.md

# VERIFY
ts-node scripts/audit-spec-compliance.ts analysis.json tasks.json > compliance.json
# Verify compliance.json shows 100%
ts-node scripts/generate-pr-description.ts verification templates/ analysis.json > verification.md
ts-node scripts/update-pr-description.ts 123 verification.md

# PUBLISH
ts-node scripts/generate-pr-description.ts complete templates/ analysis.json > complete.md
ts-node scripts/update-pr-description.ts 123 complete.md
gh pr ready 123
```

### Example 2: User-Facing Feature with E2E

Same as Example 1, but VERIFY phase includes:
- Running E2E test suite: `npm run test:e2e`
- Completing manual testing checklist
- Recording verification evidence

---

## Contributing

### Adding New Scripts

1. Create script in `scripts/` directory
2. Write comprehensive tests FIRST (TDD)
3. Implement script logic
4. Add CLI entry point
5. Document usage in this README

### Adding New Templates

1. Create template in `templates/` directory
2. Use Handlebars syntax
3. Follow existing template structure
4. Test with generate-pr-description script
5. Document template variables

---

## Support

**Issues:** Report bugs or feature requests via GitHub Issues

**Documentation:** See `SKILL.md` for detailed workflow documentation

**Examples:** See `__tests__/e2e.test.ts` for complete workflow examples

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** 2026-02-02
**Version:** 2.0.0
