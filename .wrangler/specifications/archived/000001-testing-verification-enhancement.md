---
id: "000001"
title: "Testing & Verification Skills Enhancement: Prevent Premature Completion Claims"
type: "specification"
status: "closed"
priority: "critical"
labels: ["testing", "verification", "frontend", "enforcement", "skills"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
---

# Testing & Verification Skills Enhancement

## Problem Statement

Agents are claiming work is "done" without proper testing/verification, leading to immediate errors when users try the code. Root cause analysis identified critical gaps:

1. **No proof tests actually ran** - Skills say "run tests" but don't require showing output
2. **No verification TDD was followed** - Can't detect test-after-implementation
3. **Code review is optional** in most workflows (only mandatory in subagent-driven-development)
4. **Zero frontend testing guidance** - No skills for UI, visual regression, E2E, or accessibility
5. **finishing-a-development-branch only checks tests pass** - Not completeness or TDD compliance

## Research Foundation

Based on comprehensive analysis of:

- Testing skills (TDD, anti-patterns, run-the-tests, condition-based-waiting)
- Verification skills (verification-before-completion, code-review framework)
- Modern frontend testing practices (2024-2025)
- Workflow integration points

See: `.wrangler/memos/2025-11-20-*.md` (4 detailed research documents)

## Objectives

### Primary Goal

**Make premature "done" claims structurally impossible** through verification enforcement and comprehensive testing guidance.

### Secondary Goals

1. Close verification gaps (evidence requirements, TDD compliance)
2. Add frontend testing skills (visual regression, accessibility, E2E)
3. Make code review mandatory across all workflows
4. Ensure framework-agnostic guidance (works with any language/framework)

## Implementation Phases

### Phase 1: Core Verification Strengthening (Week 1) - PRIORITY

**Prevent completion without proof:**

1. **Update verification-before-completion**
   - Add mandatory test evidence format (command output with pass/fail counts)
   - Add TDD compliance certification (explicit attestation per function)
   - Add code review gate (cannot complete without review)
   - Expand gate function to check TDD first
   - Add "pristine output" requirements (no errors/warnings)

2. **Update test-driven-development**
   - Add evidence requirements to RED phase (must show failing test output)
   - Add evidence requirements to GREEN phase (must show passing test output)
   - Cross-reference verification-before-completion

3. **Update finishing-a-development-branch**
   - Check completeness (not just tests pass)
   - Verify requirements checklist completed
   - Verify code review obtained
   - Verify TDD compliance certification exists

**Impact**: Closes biggest gap - agents can no longer claim "done" without evidence.

### Phase 2: Frontend Testing Foundation (Week 2) - HIGH PRIORITY

**Address complete absence of frontend guidance:**

4. **Create frontend-visual-regression-testing skill**
   - Screenshot verification before completion
   - DevTools console check (no errors)
   - Element-level vs full-page screenshots
   - Baseline management workflow
   - TDD cycle for UI (RED: no baseline → GREEN: create baseline → REFACTOR: catch regressions)

5. **Create frontend-accessibility-verification skill**
   - axe-core automated testing (0 violations required)
   - Keyboard navigation testing (Tab, Enter, Escape)
   - Screen reader verification
   - Lighthouse accessibility audit (≥95 score)
   - WCAG compliance checklist

6. **Update verification-before-completion (frontend)**
   - Add frontend verification checklist
   - Visual verification steps
   - Console verification steps
   - Network verification steps
   - Accessibility verification steps

**Impact**: Provides guidance for UI work (currently completely absent).

### Phase 3: Workflow Integration (Week 3) - HIGH PRIORITY

**Make all workflows consistent:**

7. **Update executing-plans**
   - Make code review mandatory (currently optional)
   - Add code review checkpoint after each batch
   - Reference pre-implementation-checklist

8. **Update code-review**
   - Add TDD verification to Phase 4
   - Structured TDD compliance check
   - Verify tests fail when implementation removed

9. **Update requesting-code-review**
   - Change "optional" to "required"
   - Add "cannot proceed without" language
   - Remove ambiguity about when review needed

**Impact**: Code review becomes mandatory across all workflows.

### Phase 4: Anti-Patterns & E2E (Week 4) - MEDIUM PRIORITY

**Prevent common mistakes:**

10. **Update testing-anti-patterns**
    - Add Anti-Pattern 6: Testing Implementation Details (Frontend)
    - Add Anti-Pattern 7: No Accessibility Testing
    - Add Anti-Pattern 8: Testing Happy Path Only
    - Frontend-specific examples for each

11. **Create frontend-e2e-user-journeys skill**
    - Page Object Model pattern
    - User-centric selectors (accessible roles/labels)
    - Condition-based waiting (no arbitrary timeouts)
    - When to use E2E vs component tests (10-15% only)
    - Test data management strategies

**Impact**: Prevents common frontend testing mistakes, guides E2E strategy.

### Phase 5: Additional Enhancements (Optional)

12. **Create frontend-component-testing skill** (optional)
    - Testing components in isolation
    - Real browser rendering (not jsdom)
    - User interaction testing
    - Testing trophy guidance (40-50% component tests)

13. **Create frontend-testing-pyramid-balance skill** (optional)
    - Calculate test distribution
    - Identify "ice cream cone" anti-pattern
    - Recommend rebalancing strategy
    - ROI analysis per test type

14. **Expand condition-based-waiting to eliminating-test-flakiness** (optional)
    - Shared state issues
    - Uncleaned resources
    - Non-deterministic data
    - External dependencies
    - Parallel execution conflicts

## Framework-Agnostic Requirements

All skills MUST work across:

**Languages**: TypeScript, JavaScript, Python, Go, Rust, Ruby, Java, etc.
**Frontend Frameworks**: React, Vue, Angular, Svelte, Web Components, vanilla JS
**Testing Tools**: Playwright, Selenium, Cypress, Jest, pytest, Vitest, etc.

**Key Principles** (universal):

1. Test user behavior, not implementation
2. Use semantic selectors (accessible roles/labels)
3. Wait for conditions, not time
4. Test pyramid balance (distribution by ROI)
5. Accessibility is non-negotiable
6. Visual verification for UI changes

## Success Metrics

### Metric 1: Verification Completeness (Target: 100%)

- ✓ Agent provides test output before "done" claim
- ✓ Agent provides TDD certification
- ✓ Agent obtains code review approval

### Metric 2: TDD Compliance (Target: 100%)

- ✓ Agent can attest to watching each test fail first
- ✓ Tests written before implementation (commit evidence)

### Metric 3: Frontend Quality (Target: 95%+)

- ✓ UI changes include screenshot evidence
- ✓ Accessibility tests passing (0 violations)
- ✓ DevTools console shows no errors

### Metric 4: Early Detection (Target: >80%)

- ✓ Issues caught during implementation (not at end)
- ✓ Code review happens before merge (not after)

## Non-Goals

- Technical enforcement (pre-commit hooks, CI checks) - process-based only
- Language/framework-specific guidance - keep framework-agnostic
- Comprehensive test coverage skill - separate future effort
- Database testing patterns - out of scope
- Performance testing guidance - out of scope

## References

**Research Memos**:

- `.wrangler/memos/2025-11-20-testing-skills-analysis.md` (2,089 lines)
- `.wrangler/memos/2025-11-20-verification-completion-skills-analysis.md` (1,311 lines)
- `.wrangler/memos/2025-11-20-frontend-testing-research.md` (1,692 lines)
- `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` (641 lines)

**Skills to Update**:

- verification-before-completion
- test-driven-development
- testing-anti-patterns
- finishing-a-development-branch
- executing-plans
- code-review
- requesting-code-review
- condition-based-waiting (optional)

**Skills to Create**:

- frontend-visual-regression-testing
- frontend-accessibility-verification
- frontend-e2e-user-journeys
- frontend-component-testing (optional)
- frontend-testing-pyramid-balance (optional)

## Implementation Notes

- All Phase 1 changes are highest priority (close verification gaps)
- Phase 2 addresses legally critical gap (accessibility compliance)
- Phase 3 ensures consistency across workflows
- Phase 4 prevents common mistakes
- Phase 5 is optional enhancements

Estimated effort: 4 weeks for Phases 1-4, +2 weeks for Phase 5 if desired.
