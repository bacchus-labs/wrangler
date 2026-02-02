---
id: "000008"
title: "Update verification-before-completion with frontend verification checklist"
type: "issue"
status: "closed"
priority: "high"
labels: ["phase-2", "frontend", "verification", "skill-update"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T12:05:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "2 hours"
---

## Objective

Update the verification-before-completion skill to include frontend-specific verification steps, ensuring agents verify visual correctness, console errors, network requests, and accessibility before claiming UI work complete.

## Problem

The verification-before-completion skill currently has no frontend-specific guidance. Agents working on UI don't know they need to:
- Check DevTools console for errors
- Verify network requests are correct
- Take screenshots for visual verification
- Run accessibility tests

This allows agents to claim "UI complete" without proper frontend verification.

## Solution

Add a comprehensive "Frontend Verification Checklist" section to `skills/verification-before-completion/SKILL.md` that agents MUST follow for any UI work.

## Implementation Steps

### Step 1: Read the current file

```bash
cat skills/verification-before-completion/SKILL.md
```

Identify where to insert the new section (after the existing "Before ANY Completion Claim" section, around line 100).

### Step 2: Add Frontend Verification section

Insert this new section after the core gate function:

```markdown
## Frontend Verification Checklist

IF your work involves UI (HTML, CSS, JSX, templates, components):

BEFORE claiming UI work complete, verify ALL of these:

### Visual Verification
- [ ] **Open browser DevTools** (F12 or Cmd+Option+I)
- [ ] **Inspect rendered output** in Elements panel
- [ ] **Test responsive breakpoints**:
  - Mobile: 375x667 (iPhone SE)
  - Tablet: 768x1024 (iPad)
  - Desktop: 1920x1080
- [ ] **Take screenshot** for visual regression baseline
- [ ] **Compare against baseline** (if exists)
- [ ] **Review differences**: Intentional or regression?

**Evidence required**: Screenshot showing correct rendering

### Console Verification
- [ ] **Open Console panel** in DevTools
- [ ] **Refresh page** (Cmd+R or Ctrl+R)
- [ ] **Verify NO errors** (0 red messages)
- [ ] **Verify NO warnings** (or document expected ones)
- [ ] **Take console screenshot** showing clean output

**Evidence required**: Console screenshot with 0 errors

### Network Verification
- [ ] **Open Network panel** in DevTools
- [ ] **Refresh page** and perform actions
- [ ] **Verify expected API calls made**:
  - Check URLs are correct
  - Check request methods (GET, POST, etc.)
  - Check response status codes (200, 201, etc.)
- [ ] **Verify no unexpected requests**:
  - No failed requests (red in network tab)
  - No requests to wrong endpoints
  - No tracking/analytics if not expected
- [ ] **Check response data** is correct

**Evidence required**: Network tab screenshot or description of verified requests

### Accessibility Verification
- [ ] **Run axe-core test** (automated):
  ```typescript
  await injectAxe(page);
  await checkA11y(page); // Expect 0 violations
  ```
- [ ] **Test keyboard navigation**:
  - Tab through all interactive elements
  - Verify Enter/Space activates buttons
  - Verify Escape closes modals
- [ ] **Verify focus visible** on all elements
- [ ] **Run Lighthouse accessibility audit**:
  - Open Lighthouse in DevTools
  - Select "Accessibility" category
  - Run audit
  - Verify score ≥95

**Evidence required**: axe-core output (0 violations) + Lighthouse score

### Interaction Verification
- [ ] **Test all user interactions**:
  - Click all buttons → Verify expected result
  - Fill all forms → Verify validation works
  - Hover states → Verify visible
- [ ] **Test loading states**:
  - Verify spinner/skeleton renders during loading
  - Verify loading completes correctly
- [ ] **Test error states**:
  - Trigger errors (invalid input, network failure)
  - Verify error messages display correctly
- [ ] **Test empty states**:
  - Verify empty state message renders when no data

**Evidence required**: Description of tested interactions and results

## Frontend Verification Gate

```
BEFORE claiming UI work complete:

  IF you modified HTML/CSS/JSX/templates:
    STOP - Have you completed Frontend Verification Checklist?

    IF ANY checkbox unchecked:
      STOP - Work is NOT complete
      Complete all verification steps first

    IF console has errors:
      STOP - Fix errors before proceeding

    IF accessibility violations found:
      STOP - Fix violations before proceeding

    IF visual regression detected and unintentional:
      STOP - Fix regression before proceeding

  ONLY IF all frontend verification complete:
    Continue with completion claim
```

## Frontend Evidence Template

When claiming UI work complete, provide:

```markdown
## Frontend Verification Evidence

### Visual Verification
Screenshot: [component-name].png
Responsive breakpoints tested: Mobile (375x667), Tablet (768x1024), Desktop (1920x1080)
Visual regression: [Baseline created | No changes | Intentional changes approved]

### Console Verification
Console errors: 0
Console warnings: 0 (or: 1 expected warning about X)
[Screenshot of clean console]

### Network Verification
Expected requests:
- ✓ GET /api/products (200 OK)
- ✓ POST /api/checkout (201 Created)

Failed requests: 0

### Accessibility Verification
axe-core violations: 0
Keyboard navigation: ✓ All elements accessible
Lighthouse score: 97/100

### Interaction Verification
Tested interactions:
- ✓ Submit button → Form submits successfully
- ✓ Cancel button → Form clears
- ✓ Invalid email → Error message displays
- ✓ Loading state → Spinner renders
```

**You CANNOT claim UI complete without this evidence.**
```

### Step 3: Update Red Flags section

Add frontend-specific red flags to the existing "Red Flags" section (around line 52):

```markdown
## Red Flags - STOP IMMEDIATELY

If you catch yourself doing ANY of these:

[... existing red flags ...]

**Frontend-specific red flags:**
- Claiming "looks good" without DevTools verification
- Proceeding with console errors visible
- Skipping accessibility testing
- Not testing responsive breakpoints
- Taking full-page screenshots for component changes
- Updating visual baseline without reviewing diff
- Claiming "UI complete" without screenshot evidence
```

### Step 4: Update Example Scenarios section

Add a frontend example to the "Example Scenarios" section (after line 120):

```markdown
### Scenario 5: Frontend Component Implementation

```
Agent: "I need to implement a checkout form component."

[Uses frontend-visual-regression-testing + frontend-accessibility-verification]

Agent: "I've implemented the checkout form."

GATE FUNCTION CHECK:

0. TDD COMPLIANCE: Did you write tests first?
   ✓ YES - Wrote component test, then implementation

1. IDENTIFY: What proves checkout form works?
   Command: npm test -- checkout.test.ts
   Command: Open DevTools console
   Command: Run axe-core test

2. RUN: Execute commands
   [Runs tests]

3. READ: Test output
   ```
   PASS tests/checkout.test.ts
     ✓ renders form correctly
     ✓ submits with valid data
     ✓ shows errors for invalid data
     ✓ is accessible (0 a11y violations)

   Tests: 4 passed, 4 total
   ```

   [Opens DevTools]
   Console: 0 errors, 0 warnings
   Network: 2 requests (both 200 OK)

   [Runs axe-core]
   Accessibility violations: 0
   Lighthouse score: 98/100

4. VERIFY: Complete Frontend Verification Checklist
   ✓ Visual: Screenshot taken, responsive tested
   ✓ Console: 0 errors
   ✓ Network: Expected requests only
   ✓ Accessibility: 0 violations, keyboard nav works
   ✓ Interactions: All tested

5. PROVIDE EVIDENCE:

## Frontend Verification Evidence

### Visual Verification
Screenshot: checkout-form.png (baseline created)
Responsive breakpoints tested: ✓ Mobile, Tablet, Desktop

### Console Verification
Console errors: 0
[Screenshot showing clean console]

### Network Verification
Expected requests:
- ✓ POST /api/validate-address (200 OK)
- ✓ POST /api/checkout (201 Created)

### Accessibility Verification
axe-core violations: 0
Keyboard navigation: ✓ All accessible
Lighthouse score: 98/100

### Interaction Verification
- ✓ Submit with valid data → Success message
- ✓ Submit with invalid data → Error messages
- ✓ Tab navigation → All inputs accessible

6. ONLY THEN: "Checkout form complete. All tests pass. Frontend verification complete."
```
```

### Step 5: Update the Integration section

Add frontend skills to the "Integration with Other Skills" section:

```markdown
**Frontend work:**
- frontend-visual-regression-testing: Screenshot verification required
- frontend-accessibility-verification: Accessibility testing required
- frontend-e2e-user-journeys: E2E tests for critical flows
```

## Acceptance Criteria

- [ ] Frontend Verification Checklist section added to verification-before-completion/SKILL.md
- [ ] All subsections present:
  - [ ] Visual Verification (with screenshot requirements)
  - [ ] Console Verification (0 errors required)
  - [ ] Network Verification (expected requests only)
  - [ ] Accessibility Verification (axe-core + Lighthouse)
  - [ ] Interaction Verification (all states tested)
- [ ] Frontend Verification Gate added (decision tree)
- [ ] Frontend Evidence Template added (clear format)
- [ ] Frontend-specific red flags added to Red Flags section
- [ ] Frontend example scenario added to Example Scenarios
- [ ] Integration section updated with frontend skills
- [ ] Language is mandatory (MUST, CANNOT, not SHOULD)
- [ ] Evidence requirements are explicit and non-optional
- [ ] Cross-references frontend skills correctly

## Verification

After implementation:

1. Read the updated skill file
2. Verify Frontend Verification Checklist is comprehensive
3. Check that evidence template is clear and actionable
4. Ensure gate function prevents claiming completion without frontend verification
5. Verify integration with frontend-visual-regression-testing and frontend-accessibility-verification skills
6. Check that red flags cover common frontend mistakes

## References

- Research: `.wrangler/memos/2025-11-20-frontend-testing-research.md` lines 559-674
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 362-384
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 2, item 6
- Current file: `skills/verification-before-completion/SKILL.md`
- DevTools Console: Verify 0 errors before completion
- DevTools Network: Verify expected requests only
- Lighthouse: Built into Chrome DevTools, target score ≥95
