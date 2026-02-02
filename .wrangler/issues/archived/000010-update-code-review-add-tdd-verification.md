---
id: "000010"
title: "Update code-review skill to add TDD verification to Phase 4"
type: "issue"
status: "closed"
priority: "high"
labels: ["phase-3", "code-review", "tdd", "skill-update"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Completion Note

Successfully implemented TDD verification in code-review skill Phase 4.

**Completed Changes:**

1. Added comprehensive "TDD Compliance (FIRST CHECK)" subsection to Phase 4 with 5 structured verification questions
2. Updated review output format to include TDD Compliance section with findings and issues
3. Added TDD Compliance items to Final Review Checklist (4 specific checks)
4. Added detailed "Example: TDD Compliance Review" showing NEEDS IMPROVEMENT scenario
5. Updated Integration section with cross-references to test-driven-development and testing-anti-patterns skills
6. Added "See Also" references to test-driven-development skill in Phase 4

**All Acceptance Criteria Met:**
- TDD Compliance subsection added as FIRST CHECK in Phase 4
- 5 structured checks: functions have tests, author attestation, tests fail without implementation, git history check, no untested files
- TDD Compliance summary template with PASS/NEEDS IMPROVEMENT/FAIL ratings
- Review output template updated with TDD compliance findings
- Final checklist includes 4 TDD compliance verification items
- Example showing TDD review with Important issues flagged correctly
- Integration section updated with skill cross-references
- Clear, actionable language using IMPORTANT/CRITICAL flags
- Cross-references to test-driven-development and testing-anti-patterns skills

The skill now enforces systematic TDD verification, making it impossible for reviewers to skip checking whether tests were written before implementation.

---

## Objective

Update the code-review skill Phase 4 to include structured TDD compliance verification, ensuring reviewers explicitly check that tests were written before implementation.

## Problem

The code-review skill mentions testing in Phase 4 but doesn't have a structured check for TDD compliance. Reviewers don't know to verify:
- Tests were written BEFORE implementation
- Tests fail when implementation removed
- Each function has corresponding tests
- RED-GREEN-REFACTOR cycle was followed

This allows test-after-implementation to pass code review undetected.

## Solution

Add a comprehensive "TDD Compliance" subsection to Phase 4 of `skills/code-review/SKILL.md` with structured checks and verification steps.

## Implementation Steps

### Step 1: Read the current file

```bash
cat skills/code-review/SKILL.md
```

Identify Phase 4 "Testing Review" section (around line 108-133).

### Step 2: Add TDD Compliance subsection to Phase 4

Insert this new subsection at the beginning of Phase 4 (before "Test Coverage"):

```markdown
### Phase 4: Testing Review

**Purpose**: Ensure adequate test coverage, quality, and TDD compliance.

#### TDD Compliance (FIRST CHECK)

**Verify tests were written BEFORE implementation:**

**Questions to ask:**

1. **Does each function/method have corresponding tests?**
   ```
   For each public function in implementation files:
   - [ ] Test file exists
   - [ ] Test covers function behavior
   - [ ] Test name clearly describes what's tested
   ```

   **If NO**: Flag as Important issue
   ```
   IMPORTANT: Missing tests for [function_name] in [file].
   All functions require tests. Add tests before merging.
   ```

2. **Can author attest to RED-GREEN-REFACTOR cycle?**
   ```
   Ask: "For each function, did you:
   1. Watch test fail first? (RED)
   2. Implement minimal code to pass? (GREEN)
   3. Refactor for quality? (REFACTOR)"
   ```

   **If author cannot attest**: Flag as Important issue
   ```
   IMPORTANT: Unable to verify TDD followed for [function_name].
   Tests may have been written after implementation.
   Recommend: Verify tests actually fail when implementation removed.
   ```

3. **Do tests fail when implementation removed?**

   **If suspicious that tests written after** (e.g., all tests pass immediately, no git history showing test-first):

   ```bash
   # Verify tests actually test implementation
   # Comment out implementation
   git stash  # Temporarily remove implementation
   npm test   # Tests should FAIL
   git stash pop  # Restore implementation
   ```

   **If tests still pass with no implementation**: Flag as Critical issue
   ```
   CRITICAL: Tests for [function_name] pass without implementation.
   Tests are not actually testing the code.
   See testing-anti-patterns skill (Anti-Pattern 1: Testing Mock Behavior).
   Rewrite tests to verify real behavior.
   ```

4. **Does git history suggest test-first?**

   **Optional check** (not definitive, but helpful indicator):

   ```bash
   git log --oneline --all -- tests/[file].test.ts src/[file].ts
   ```

   **Look for:**
   - Test commits before implementation commits
   - Separate commits for RED → GREEN → REFACTOR
   - Commit messages mentioning TDD phases

   **If commits show implementation before tests**: Flag as Important issue
   ```
   IMPORTANT: Git history suggests tests written after implementation.
   Commits show [file].ts before [file].test.ts.
   Verify TDD was followed. If not, recommend rewriting with TDD.
   ```

5. **Are there any files with implementation but no tests?**

   ```bash
   # Find source files
   find src/ -name "*.ts" -o -name "*.js"

   # For each source file, check if test exists
   # tests/[name].test.ts or tests/[name].spec.ts
   ```

   **If source file has no corresponding test file**: Flag as Important issue
   ```
   IMPORTANT: No tests found for src/[file].ts
   All implementation files require tests.
   Add comprehensive tests before merging.
   ```

**TDD Compliance Summary:**

After checking above:

```markdown
### TDD Compliance: [PASS / NEEDS IMPROVEMENT / FAIL]

- Functions with tests: X / Y (Z% coverage)
- Author attestation to RED-GREEN-REFACTOR: [Yes / No / Partial]
- Tests verified to fail without implementation: [Yes / No / Not checked]
- Files without tests: [List or "None"]

[If NEEDS IMPROVEMENT or FAIL]:
Recommendations:
- Add tests for [list functions]
- Verify tests for [list functions] actually fail when implementation removed
- Consider rewriting [list functions] with TDD for higher confidence
```

#### Test Coverage
[... existing Test Coverage content ...]

#### Test Quality
[... existing Test Quality content ...]

#### Test Patterns and RED-GREEN-REFACTOR
[... existing content ...]
```

### Step 3: Add TDD verification to review output template

Update the review output template (around line 190) to include TDD compliance:

```markdown
## Code Review: [Feature/PR Title]

**Reviewed by**: [Reviewer name]
**Date**: [YYYY-MM-DD]
**Status**: [Needs revision / Approved with minor items / Approved]

---

### Phase 4: Testing Review

#### TDD Compliance: [PASS / NEEDS IMPROVEMENT / FAIL]

**Findings:**
- Functions with tests: X / Y (Z% coverage)
- Author attestation to TDD: [Yes / No]
- Tests verified to fail without implementation: [Yes / No / Not checked]
- Files without tests: [List or "None"]

**Issues identified:**
[List TDD compliance issues here]

[... rest of existing template ...]
```

### Step 4: Add TDD check to review checklist

Update the final checklist (around line 270) to include TDD compliance:

```markdown
## Final Review Checklist

Before approving:

- [ ] **Phase 4 - TDD Compliance**:
  - [ ] All functions have corresponding tests
  - [ ] Author attested to RED-GREEN-REFACTOR cycle
  - [ ] No files without tests (or documented exceptions)
  - [ ] Tests appear to verify real behavior (not mocks)

- [ ] **Phase 4 - Test Coverage**: Adequate coverage, edge cases tested
- [ ] **Phase 4 - Test Quality**: Tests verify behavior, not mocks

[... existing checklist items ...]
```

### Step 5: Add example TDD review

Add a new example showing TDD verification:

```markdown
### Example: TDD Compliance Review

```markdown
## Phase 4: Testing Review

### TDD Compliance: NEEDS IMPROVEMENT

**Findings:**
- Functions with tests: 8 / 10 (80% coverage)
- Author attestation to TDD: Partial (6 functions attested, 2 uncertain)
- Tests verified to fail without implementation: No (trusted author)
- Files without tests: src/utils/validation.ts

**Issues identified:**

**IMPORTANT #3**: Missing tests for validation.ts
File: src/utils/validation.ts
Issue: No tests found for validation utility functions
Impact: validateEmail, validatePassword not tested
Recommendation: Add comprehensive tests before merging

**IMPORTANT #4**: Unable to verify TDD for retryOperation
File: src/api/retry.ts
Issue: Author uncertain if test was written before implementation
Git history shows retry.ts committed before retry.test.ts
Recommendation:
1. Verify test fails when retryOperation implementation removed
2. If test doesn't fail, rewrite test to verify real behavior
3. Consider rewriting function with TDD for higher confidence

**Recommendations:**
1. Add tests for validation.ts (5 functions need tests)
2. Verify retry.test.ts actually tests retry.ts behavior
3. For future work, commit tests before implementation (clearer TDD evidence)
```
```

### Step 6: Update Integration section

Update the "Integration with Other Skills" section:

```markdown
**Integration with:**
- test-driven-development: Reviewers verify TDD was followed
- testing-anti-patterns: Reference when tests smell wrong
- verification-before-completion: Ensure verification happened before review
```

## Acceptance Criteria

- [ ] TDD Compliance subsection added to Phase 4
- [ ] Structured checks added:
  - [ ] Each function has tests
  - [ ] Author attestation to RED-GREEN-REFACTOR
  - [ ] Tests fail when implementation removed
  - [ ] Git history check (optional)
  - [ ] No files without tests
- [ ] TDD Compliance summary template added
- [ ] Review output template updated to include TDD compliance
- [ ] Final checklist updated with TDD compliance items
- [ ] Example TDD review added
- [ ] Integration section updated
- [ ] Language is clear and actionable (Flag as Important/Critical)
- [ ] Cross-references test-driven-development and testing-anti-patterns skills

## Verification

After implementation:

1. Read the updated skill file
2. Verify TDD Compliance is the FIRST check in Phase 4
3. Check that all 5 structured questions are present
4. Ensure examples show how to flag TDD violations
5. Verify checklist includes TDD compliance verification
6. Check integration with test-driven-development skill

## References

- Research: `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` lines 708-733
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` (Phase 3, item 8)
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 3, item 8
- Current file: `skills/code-review/SKILL.md` Phase 4 (lines 108-133)
- Reference: `skills/test-driven-development/SKILL.md` (RED-GREEN-REFACTOR cycle)
- Reference: `skills/testing-anti-patterns/SKILL.md` (Anti-Pattern 1: Testing Mock Behavior)
