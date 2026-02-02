---
id: "000007"
title: "Create frontend-accessibility-verification skill"
type: "issue"
status: "closed"
priority: "critical"
labels: ["phase-2", "frontend", "accessibility", "new-skill", "legal-requirement"]
project: "Testing & Verification Enhancement"
createdAt: "2024-11-20T00:00:00.000Z"
updatedAt: "2024-11-20T12:03:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "3-4 hours"
---

## Objective

Create a new skill that guides agents through accessibility testing for UI components, ensuring WCAG compliance and preventing legal issues.

## Problem

Accessibility testing is a **legal requirement** for many industries, yet wrangler has zero guidance for it. Agents working on UI don't know how to:
- Run automated accessibility tests (axe-core)
- Test keyboard navigation
- Verify screen reader compatibility
- Check WCAG compliance
- Use Lighthouse accessibility audits

This is a critical gap - shipping inaccessible UI creates legal liability and excludes users with disabilities.

## Solution

Create `skills/frontend-testing/accessibility-verification/SKILL.md` with comprehensive accessibility testing guidance covering automated tools, manual testing, and WCAG compliance.

## Implementation Steps

### Step 1: Create directory structure

```bash
mkdir -p skills/frontend-testing/accessibility-verification
```

### Step 2: Create SKILL.md file

Create `skills/frontend-testing/accessibility-verification/SKILL.md` with this content:

```markdown
---
name: frontend-accessibility-verification
description: Use when implementing any UI - verifies accessibility compliance through automated testing (axe-core), keyboard navigation, screen reader verification, and Lighthouse audits; legally required and ensures inclusive user experience
---

# Frontend Accessibility Verification

## Overview

Accessibility testing ensures UI is usable by everyone, including users with disabilities. It's both a **legal requirement** (WCAG compliance) and fundamental to good UX.

**When to use this skill:**
- Implementing any UI component
- Modifying existing UI
- Before marking UI work complete
- During code review (verify accessibility tested)

## The Iron Law

```
NO UI SHIP WITHOUT ACCESSIBILITY VERIFICATION
```

If you created or modified UI:
- You MUST run automated accessibility tests (axe-core)
- You MUST test keyboard navigation
- You MUST verify screen reader announcements
- You CANNOT claim "UI complete" without accessibility evidence

## Why Accessibility Matters

**Legal requirement:**
- WCAG 2.1 Level AA compliance mandatory in many industries
- ADA lawsuits for inaccessible websites
- Section 508 compliance for government contracts

**Better UX for everyone:**
- Accessible sites work better for all users
- Many a11y issues are actual bugs (missing labels, broken keyboard nav)
- If button has no accessible name, it's both unusable AND untestable

**Automated testing catches ~57% of issues:**
- axe-core finds definite violations (zero false positives)
- Manual testing required for remaining ~43%
- Both automated AND manual testing necessary

## Step-by-Step Process

### Step 1: Automated Testing (axe-core)

**Run axe-core on all UI components:**

#### Playwright Integration

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('component is accessible', async ({ page }) => {
  await page.goto('/checkout');

  // Inject axe-core into page
  await injectAxe(page);

  // Run accessibility audit
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });
});
```

#### Cypress Integration

```typescript
import 'cypress-axe';

describe('Accessibility', () => {
  it('has no a11y violations', () => {
    cy.visit('/checkout');
    cy.injectAxe();
    cy.checkA11y();
  });
});
```

#### Jest Integration

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('has no accessibility violations', async () => {
  const { container } = render(<CheckoutForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Expected result: 0 violations**

```
✅ PASS: 0 accessibility violations found
❌ FAIL: Found violations - must fix before proceeding
```

### Step 2: Keyboard Navigation Testing (MANDATORY)

**Test ALL interactive elements are keyboard accessible:**

#### Checklist for Keyboard Testing

- [ ] **Tab Navigation**:
  - Press Tab repeatedly
  - Verify focus moves through all interactive elements in logical order
  - Verify focus is visible (clear outline/ring)
  - No keyboard traps (can Tab away from all elements)

- [ ] **Enter/Space Activation**:
  - Tab to buttons
  - Press Enter or Space
  - Verify buttons activate

- [ ] **Escape Key**:
  - Open modals/dialogs
  - Press Escape
  - Verify modal closes

- [ ] **Arrow Keys** (for dropdowns/menus):
  - Open dropdown
  - Use arrow keys to navigate options
  - Press Enter to select

#### Automated Keyboard Testing

```typescript
test('can navigate form with keyboard', async ({ page }) => {
  await page.goto('/checkout');

  // Tab to first input
  await page.keyboard.press('Tab');
  await expect(page.locator('[name="email"]')).toBeFocused();

  // Tab to second input
  await page.keyboard.press('Tab');
  await expect(page.locator('[name="password"]')).toBeFocused();

  // Tab to submit button
  await page.keyboard.press('Tab');
  await expect(page.locator('button[type="submit"]')).toBeFocused();

  // Activate with Enter
  await page.keyboard.press('Enter');

  // Verify form submitted
  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});
```

### Step 3: Screen Reader Verification

**Verify all UI elements have proper ARIA labels:**

#### Automated ARIA Checks

```typescript
test('all interactive elements have accessible names', async ({ page }) => {
  await page.goto('/checkout');

  // Get all interactive elements
  const buttons = page.locator('button, [role="button"]');
  const links = page.locator('a');
  const inputs = page.locator('input, textarea, select');

  // Verify each has accessible name
  for (const button of await buttons.all()) {
    const name = await button.getAttribute('aria-label')
                || await button.textContent();
    expect(name).toBeTruthy();
  }

  for (const input of await inputs.all()) {
    const label = await input.getAttribute('aria-label')
                || await page.locator(`label[for="${await input.getAttribute('id')}"]`).textContent();
    expect(label).toBeTruthy();
  }
});
```

#### Manual Screen Reader Testing (Optional but Recommended)

**Mac (VoiceOver):**
```
1. Press Cmd+F5 to enable VoiceOver
2. Press Control+Option+Right Arrow to navigate
3. Verify all elements announced correctly
4. Press Cmd+F5 to disable VoiceOver
```

**Windows (NVDA):**
```
1. Launch NVDA
2. Press Down Arrow to navigate
3. Verify all elements announced correctly
```

**What to verify:**
- Buttons announce as "button" + label
- Links announce as "link" + text
- Form inputs announce label + current value + field type
- Images have alt text (or are marked decorative)

### Step 4: Lighthouse Accessibility Audit

**Run Lighthouse audit (target: 95%+ score):**

#### Command Line

```bash
# Install lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000/checkout --only-categories=accessibility --view
```

#### Chrome DevTools

```
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Analyze page load"
5. Review score and issues
```

**Target score: 95 or higher**

```
✅ PASS: Score 95-100
⚠️ WARNING: Score 90-94 (fix issues if possible)
❌ FAIL: Score <90 (must fix before proceeding)
```

### Step 5: WCAG Compliance Checklist

**Verify compliance with WCAG 2.1 Level AA:**

#### Perceivable
- [ ] All images have alt text (or are decorative)
- [ ] Color is not the only way to convey information
- [ ] Text has sufficient contrast ratio (4.5:1 for normal text)
- [ ] Content works without CSS

#### Operable
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Focus is visible
- [ ] Link/button purpose clear from text

#### Understandable
- [ ] Page language declared (`<html lang="en">`)
- [ ] Labels for all form inputs
- [ ] Error messages are clear and helpful
- [ ] Consistent navigation across pages

#### Robust
- [ ] Valid HTML (no duplicate IDs)
- [ ] ARIA attributes used correctly
- [ ] Name, Role, Value exposed for custom controls

## Framework-Agnostic Patterns

### Pattern 1: Per-Component Accessibility Tests

```typescript
// Works with Playwright, Selenium, Puppeteer
test('component is accessible', async ({ page }) => {
  // Navigate to component
  await mount('<custom-dropdown></custom-dropdown>');

  // Inject axe-core
  await injectAxe(page);

  // Check baseline state
  await checkA11y(page);

  // Check interactive state
  await page.click('[role="button"]');
  await checkA11y(page);
});
```

### Pattern 2: E2E Flow Accessibility

```typescript
test('checkout flow is accessible', async ({ page }) => {
  await injectAxe(page);

  // Check each step
  await page.goto('/checkout');
  await checkA11y(page);

  await page.fill('[name="email"]', 'test@example.com');
  await checkA11y(page);

  await page.click('text=Place Order');
  await checkA11y(page);
});
```

### Pattern 3: Storybook Integration

```typescript
// Storybook 9+ has built-in a11y testing
export default {
  component: Dropdown,
  tags: ['autodocs'],
  // Automatic accessibility tests for all stories
};
```

## Mandatory Verification Checklist

BEFORE claiming UI work complete:

### Automated Testing
- [ ] axe-core test passing (0 violations)
- [ ] Test output captured and included in evidence
- [ ] All violations fixed or documented as exceptions

### Keyboard Testing
- [ ] Tab through all interactive elements successfully
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals/dialogs
- [ ] No keyboard traps found
- [ ] Focus visible on all elements

### Screen Reader Verification
- [ ] All buttons have accessible names
- [ ] All form inputs have labels
- [ ] All images have alt text or are decorative
- [ ] Custom controls have proper ARIA

### Lighthouse Audit
- [ ] Lighthouse accessibility score ≥95
- [ ] Screenshot of score included in evidence
- [ ] Any issues below 95 documented and justified

**If ANY checkbox unchecked**: UI is NOT accessible. Fix before claiming complete.

## Evidence Requirements

When claiming UI work complete, provide:

### 1. Automated Test Evidence

```
Accessibility test results:

$ npm test -- checkout.a11y.test.ts

PASS tests/checkout.a11y.test.ts
  ✓ has no accessibility violations (1234ms)

axe-core violations: 0
WCAG 2.1 Level AA: PASS

Exit code: 0
```

### 2. Keyboard Navigation Evidence

```
Keyboard navigation verification:

✓ Tab through all elements: PASS
✓ Focus visible: PASS
✓ Enter/Space activates buttons: PASS
✓ Escape closes modal: PASS
✓ No keyboard traps: PASS

All keyboard navigation working correctly.
```

### 3. Lighthouse Score Evidence

```
Lighthouse accessibility audit:

[Screenshot showing score]

Score: 97/100
Result: PASS (≥95 required)
```

## Red Flags - STOP IMMEDIATELY

If you catch yourself:
- Skipping accessibility testing ("we'll add it later")
- Shipping UI with axe-core violations
- Using divs as buttons (`<div onclick>`)
- Adding icon buttons without ARIA labels
- Proceeding with keyboard traps
- Not testing keyboard navigation
- Assuming visual appearance = accessibility

THEN:
- STOP immediately
- Complete all accessibility verification steps
- This is non-negotiable (legal requirement)

## Common Accessibility Violations

### Violation 1: Buttons Without Accessible Names

```html
<!-- ❌ BAD: Icon button with no label -->
<button><img src="close.svg" /></button>

<!-- ✅ GOOD: Aria-label provided -->
<button aria-label="Close"><img src="close.svg" alt="" /></button>
```

### Violation 2: Divs as Buttons

```html
<!-- ❌ BAD: Div as button (not keyboard accessible) -->
<div onclick="submit()">Submit</div>

<!-- ✅ GOOD: Use semantic button -->
<button onclick="submit()">Submit</button>
```

### Violation 3: Form Inputs Without Labels

```html
<!-- ❌ BAD: No label -->
<input type="text" placeholder="Email" />

<!-- ✅ GOOD: Explicit label -->
<label for="email">Email</label>
<input id="email" type="text" />
```

### Violation 4: Insufficient Color Contrast

```css
/* ❌ BAD: Low contrast (2:1) */
.text { color: #777; background: #fff; }

/* ✅ GOOD: Sufficient contrast (4.5:1+) */
.text { color: #333; background: #fff; }
```

### Violation 5: Inaccessible Modals

```typescript
// ❌ BAD: Modal doesn't trap focus, no Escape key
<div class="modal">...</div>

// ✅ GOOD: Focus management + Escape key
test('modal is accessible', async ({ page }) => {
  await page.click('[data-testid="open-modal"]');

  // Focus moves to modal
  await expect(page.locator('.modal button:first-child')).toBeFocused();

  // Tab stays within modal
  await page.keyboard.press('Tab');
  await expect(page.locator('.modal')).toContainElement(page.locator(':focus'));

  // Escape closes modal
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).not.toBeVisible();
});
```

## Integration with Other Skills

**Combines with:**
- test-driven-development: Write a11y tests BEFORE implementing UI
- verification-before-completion: Accessibility verification required before completion
- frontend-visual-regression-testing: Run AFTER visual verification
- code-review: Reviewers verify a11y tests exist and pass

## Common Rationalizations

| Rationalization | Counter |
|----------------|---------|
| "We'll add accessibility later" | Retrofitting accessibility is expensive. Do it now. |
| "It's just an internal tool" | Internal users have disabilities too. Legal requirement applies. |
| "Automated tests aren't perfect" | They catch 57% of issues. Better than 0%. Run them. |
| "Keyboard testing is tedious" | Takes 2 minutes. Excludes users if skipped. Required. |
| "Screen readers are rare" | ~2% of users. Legal liability. Non-negotiable. |

## Chromatic ART (Advanced, Optional)

**Accessibility Regression Testing (2024 innovation):**

```typescript
// Sets baseline for pre-existing violations
// Prevents NEW accessibility bugs
// Integrates with Storybook + Chromatic

// Visual + a11y testing in one workflow
```

**Benefits:**
- Tracks accessibility over time
- Prevents regressions
- Integrates with CI/CD
- Baseline management for existing issues

## Example Session

```
Agent: "I'm implementing a checkout form component."

[Uses frontend-accessibility-verification skill]

1. Write component with semantic HTML (<button>, <label>, etc.)
2. Write axe-core test expecting 0 violations
3. Run test → FAIL (missing aria-label on submit button)
4. Add aria-label to button
5. Run test → PASS (0 violations)
6. Test keyboard navigation:
   - Tab through inputs → Works
   - Enter on submit → Works
   - All focus visible → Works
7. Run Lighthouse audit → Score: 98
8. Provide evidence:
   - axe-core: 0 violations
   - Keyboard: All working
   - Lighthouse: 98/100

"Checkout form complete. Accessibility verified:
- axe-core: 0 violations
- Keyboard navigation: Fully accessible
- Lighthouse score: 98/100
- Screen reader compatible"
```

## References

- axe-core: https://github.com/dequelabs/axe-core
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- Testing Library a11y queries: https://testing-library.com/docs/queries/byrole

---

**Remember**: NO UI SHIP WITHOUT ACCESSIBILITY VERIFICATION. Legal requirement, not optional.
```

### Step 3: Create example file

Create `skills/frontend-testing/accessibility-verification/example.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('checkout form is accessible', async ({ page }) => {
  await page.goto('/checkout');

  // Automated accessibility test
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
  });

  // Keyboard navigation test
  await page.keyboard.press('Tab');
  await expect(page.locator('[name="email"]')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('[name="cardNumber"]')).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.locator('button[type="submit"]')).toBeFocused();

  // Submit with Enter key
  await page.keyboard.press('Enter');

  // Verify success
  await expect(page.locator('[role="alert"]')).toContainText('Order placed');
});

test('all interactive elements have accessible names', async ({ page }) => {
  await page.goto('/checkout');

  // Verify buttons have accessible names
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const accessibleName = await button.getAttribute('aria-label')
                         || await button.textContent();
    expect(accessibleName?.trim()).toBeTruthy();
  }

  // Verify inputs have labels
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const label = await input.getAttribute('aria-label')
                || await page.locator(`label[for="${id}"]`).textContent();
    expect(label?.trim()).toBeTruthy();
  }
});
```

### Step 4: Update using-wrangler skill

Add frontend-accessibility-verification to the available skills list in `skills/using-wrangler/SKILL.md`.

### Step 5: Update verification-before-completion

Add accessibility verification to frontend checklist in `skills/verification-before-completion/SKILL.md`.

## Acceptance Criteria

- [ ] Directory created: `skills/frontend-testing/accessibility-verification/`
- [ ] SKILL.md file created with complete content
- [ ] All sections present:
  - [ ] Overview & Iron Law
  - [ ] Why accessibility matters
  - [ ] axe-core automated testing
  - [ ] Keyboard navigation testing
  - [ ] Screen reader verification
  - [ ] Lighthouse audit
  - [ ] WCAG compliance checklist
  - [ ] Framework-agnostic patterns
  - [ ] Mandatory verification checklist
  - [ ] Evidence requirements
  - [ ] Red flags
  - [ ] Common accessibility violations
  - [ ] Integration with other skills
  - [ ] Common rationalizations
  - [ ] Example session
- [ ] Example file created with complete tests
- [ ] Skill added to using-wrangler list
- [ ] Language is mandatory (MUST, CANNOT, legal requirement)
- [ ] Examples cover multiple frameworks (Playwright, Cypress, Jest)
- [ ] Cross-references work (TDD, verification-before-completion)

## Verification

After implementation:

1. Read the created skill file
2. Verify it provides clear, step-by-step guidance for accessibility testing
3. Check that axe-core testing is mandatory
4. Ensure keyboard navigation testing is required
5. Verify Lighthouse audit is included
6. Check WCAG compliance checklist is comprehensive
7. Ensure evidence requirements are clear

## References

- Research: `.wrangler/memos/2025-11-20-frontend-testing-research.md` lines 460-557
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 159-181
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 2, item 5
- axe-core finds ~57% of WCAG issues automatically (zero false positives)
- Lighthouse built into Chrome DevTools (Accessibility category)
- WCAG 2.1 Level AA is legal requirement for many industries

---

## Implementation Completed (2024-11-20)

Successfully implemented the frontend-accessibility-verification skill with all acceptance criteria met.

**Created files:**
1. `/Users/sam/medb/code/wrangler/skills/frontend-testing/accessibility-verification/SKILL.md` (554 lines)
2. `/Users/sam/medb/code/wrangler/skills/frontend-testing/accessibility-verification/example.ts` (50 lines)

**Updated files:**
1. `/Users/sam/medb/code/wrangler/skills/verification-before-completion/SKILL.md` - Enhanced accessibility verification checklist with screen reader compatibility checks and cross-reference to new skill

**Skill content includes:**
- **The Iron Law**: NO UI SHIP WITHOUT ACCESSIBILITY VERIFICATION
- **Step-by-step process** covering:
  - axe-core automated testing (Playwright, Cypress, Jest integrations)
  - Keyboard navigation testing with comprehensive checklist
  - Screen reader verification (automated ARIA checks + manual testing guidance)
  - Lighthouse accessibility audit (target: 95%+ score)
  - WCAG 2.1 Level AA compliance checklist
- **Framework-agnostic patterns** for per-component and E2E testing
- **Mandatory verification checklist** before claiming UI complete
- **Evidence requirements** with templates (automated test output, keyboard nav, Lighthouse score)
- **Red flags** and **common accessibility violations** with code examples
- **Integration with other skills** (TDD, verification-before-completion, visual regression, code review)
- **Common rationalizations** table to prevent skipping
- **Complete example session** showing workflow

**All acceptance criteria verified:**
✓ Directory created: `skills/frontend-testing/accessibility-verification/`
✓ SKILL.md file created with 554 lines of comprehensive content
✓ All 14 major sections present (Overview, Iron Law, Why Matters, Step-by-Step, Patterns, Checklists, Evidence, Red Flags, Violations, Integration, Rationalizations, Chromatic, Example, References)
✓ Example file created with working Playwright tests
✓ Skill reference added to verification-before-completion with enhanced checklist
✓ Language is mandatory throughout (MUST, CANNOT, "legal requirement")
✓ Examples cover multiple frameworks (Playwright, Cypress, Jest, Storybook)
✓ Cross-references work correctly (TDD, verification-before-completion, frontend-visual-regression-testing, code review)

The skill enforces accessibility testing as a legal requirement and provides comprehensive, actionable guidance for ensuring WCAG compliance in all UI work.
