---
id: "000026"
title: "Flaw: frontend-visual-regression-testing and frontend-e2e-user-journeys claim to integrate with TDD but don't explain how to follow RED-GREEN-REFACTOR"
type: "issue"
status: "closed"
priority: "medium"
labels: ["skills", "workflow-flaw", "process", "frontend", "tdd"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Resolution

Fixed TDD integration in all three frontend skills:

**frontend-visual-regression-testing**: Clarified TWO sequential TDD cycles - (1) Functional TDD first (component must work), then (2) Visual TDD second (baseline generation, then future changes trigger RED when screenshots differ). Added cross-reference to test-driven-development skill.

**frontend-e2e-user-journeys**: Added new "E2E Testing with TDD" section showing two approaches - (1) Incremental (build E2E test one page at a time with RED-GREEN-REFACTOR per iteration), and (2) Skeleton (write entire flow, implement incrementally). Both follow TDD: write test, watch fail, implement, watch pass.

**test-driven-development**: Added new "Frontend-Specific TDD" section explaining how visual regression (baseline generation after functional impl), E2E (incremental or skeleton), and component tests integrate with RED-GREEN-REFACTOR.

## Flaw Description

Both **frontend-visual-regression-testing** and **frontend-e2e-user-journeys** claim to integrate with test-driven-development skill:

**frontend-visual-regression-testing** line 32:
> Visual regression fits into TDD:
> 1. **RED**: No baseline exists (or baseline shows old state)
> 2. **GREEN**: Implement UI, screenshot becomes new baseline
> 3. **REFACTOR**: Change code, screenshot comparison catches visual regressions

**frontend-e2e-user-journeys** lines 532-537:
> **Combines with:**
> - test-driven-development: Write E2E test BEFORE implementing flow

BUT neither skill explains:
1. How to write a failing visual/E2E test BEFORE implementation exists
2. What "watch test fail" means for visual regression (no baseline? wrong baseline?)
3. How RED-GREEN-REFACTOR applies when first run generates baseline
4. When visual verification happens in TDD cycle

This creates confusion: test-driven-development says "write failing test first, watch it fail". But:
- First visual regression test run GENERATES baseline (doesn't compare)
- E2E test for non-existent feature just fails with "element not found"
- Unclear how to follow TDD rigorously with frontend tests

## Affected Skills

- `frontend-testing/visual-regression-testing/SKILL.md` (lines 32-48, Integration section)
- `frontend-testing/e2e-user-journeys/SKILL.md` (lines 532-537, Integration section)
- `test-driven-development/SKILL.md` (doesn't mention frontend specifics)

## Specific Examples

### Example 1: Visual TDD Flow is unclear

**frontend-visual-regression-testing** lines 39-48:
```markdown
### Example Visual TDD Flow:

1. Write component test (RED - component doesn't exist)
2. Implement component (GREEN - test passes)
3. Take screenshot → becomes baseline
4. Refactor CSS (changes detected in screenshot)
5. Review diff → intentional or regression?
6. Update baseline if intentional
```

**Problems:**
- Step 1 says "Write component test (RED)" but what IS the test? Just `expect(component).toExist()`?
- Step 2 says "Implement component (GREEN - test passes)" but screenshot isn't taken yet
- Step 3 says "Take screenshot → becomes baseline" - so visual test happens AFTER implementation?
- This contradicts "write test first" if screenshot is taken AFTER component works

**The confusion:** When implementing NEW component:
- Functional test (exists, renders) comes first (RED-GREEN)
- Visual test (screenshot) comes second (generates baseline)
- But skill claims this is TDD

Is it TDD if visual verification happens after implementation?

### Example 2: E2E "write test first" is unclear for complex flows

**frontend-e2e-user-journeys** claims integration with TDD but doesn't explain how to write E2E test before feature exists.

**Scenario:** Implementing checkout flow (login → add to cart → checkout → payment → confirmation)

**Questions:**
1. Do I write entire E2E test first (all 5 pages) even though none exist?
2. Do I write E2E test incrementally (one page at a time)?
3. When E2E test runs before checkout exists, it fails immediately at "login" - is that the "RED" phase?
4. Do I watch E2E test fail for each page as I implement?

**Skill doesn't answer these questions.**

### Example 3: test-driven-development doesn't mention frontend specifics

**test-driven-development** describes RED-GREEN-REFACTOR for unit tests:
```markdown
1. RED: Write test, watch it fail
2. GREEN: Implement minimal code to pass
3. REFACTOR: Improve code quality
```

But doesn't mention:
- Visual regression tests (baseline generation)
- E2E tests (complex flows across pages)
- Integration with browser testing (DevTools verification)
- When to take screenshots in TDD cycle

## Impact

**Medium** - This creates confusion about frontend TDD:

1. **Agents might skip TDD**: "Visual tests need component first, so I'll implement then test"
2. **Unclear RED phase**: "What does failing visual test look like? No baseline?"
3. **Workflow confusion**: "Do I take screenshot before or after implementation?"
4. **E2E uncertainty**: "Write entire E2E flow first, or build incrementally?"

**Why medium:** The skills are correct that visual/E2E tests CAN integrate with TDD, but lack detail on HOW. This leads to agents treating frontend tests as post-implementation verification rather than TDD.

## Suggested Fix

### Fix 1: Clarify Visual TDD Cycle in frontend-visual-regression-testing

Replace lines 32-48 with:

```markdown
## Visual TDD Cycle

Visual regression testing fits TDD, but with nuance:

### Phase 1: Component Functionality (Traditional TDD)

**RED Phase:**
```typescript
test('checkout form renders with required fields', async ({ mount }) => {
  const component = await mount('<checkout-form></checkout-form>');

  // Test functionality (TDD RED - this will fail)
  await expect(component.locator('[name="cardNumber"]')).toBeVisible();
  await expect(component.locator('[name="expiry"]')).toBeVisible();
  await expect(component.locator('[name="cvc"]')).toBeVisible();
});
```
→ Run test: ❌ FAILS (component doesn't exist)

**GREEN Phase:**
```typescript
// Implement checkout-form component
// Add cardNumber, expiry, cvc fields
```
→ Run test: ✅ PASSES (component renders fields)

**REFACTOR Phase:**
Improve component structure, styling, accessibility

### Phase 2: Visual Correctness (Visual TDD)

**After component functionally works**, add visual verification:

```typescript
test('checkout form visual appearance', async ({ mount, page }) => {
  await mount('<checkout-form></checkout-form>');

  // Visual regression test
  await expect(page.locator('.checkout-form'))
    .toHaveScreenshot('checkout-form.png');
});
```

**First run (Baseline Generation):**
→ No baseline exists
→ Test generates baseline screenshot
→ Review baseline: Does it look correct?
→ Commit baseline to git

**RED Phase (Visual Regression):**
After baseline exists, make CSS change:
```css
/* Change button color from blue to red */
.submit-button { background: red; }
```
→ Run test: ❌ FAILS (screenshot doesn't match baseline)
→ Review diff: Is change intentional?

**GREEN Phase (Update Baseline if Intentional):**
If red button is intentional:
```bash
npm test -- --update-snapshots
```
→ New baseline committed
→ Run test: ✅ PASSES

If red button is NOT intentional (regression):
```css
/* Revert change */
.submit-button { background: blue; }
```
→ Run test: ✅ PASSES

### Summary: Two TDD Cycles

1. **Functional TDD**: Write test for component behavior → Implement → Refactor
2. **Visual TDD**: Generate baseline → Make changes → Verify no regressions

**Integration:**
- Functional tests come FIRST (component must work)
- Visual tests come SECOND (component must look right)
- Both follow TDD, but visual baseline generation is special case
```

### Fix 2: Add E2E TDD guidance to frontend-e2e-user-journeys

Add section after line 537:

```markdown
## E2E Testing with TDD

E2E tests CAN follow TDD, but require incremental approach:

### Approach 1: Incremental E2E (Recommended)

Build E2E test one page at a time following TDD:

**Iteration 1: Login Page**

RED:
```typescript
test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard'); // FAILS - login doesn't work
});
```

GREEN: Implement login page and authentication

REFACTOR: Improve login page code

**Iteration 2: Add to Cart**

RED:
```typescript
test('user can add product to cart', async ({ page }) => {
  // Reuse login from iteration 1
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');

  // New functionality (RED - doesn't exist yet)
  await page.goto('/product/123');
  await page.click('button[name="add-to-cart"]');

  await expect(page.locator('.cart-badge')).toHaveText('1'); // FAILS
});
```

GREEN: Implement add to cart functionality

REFACTOR: Improve cart code

**Iteration 3-5: Continue incrementally**

---

### Approach 2: Skeleton E2E First (Alternative)

Write skeleton E2E test with all steps, expect ALL to fail:

RED:
```typescript
test('complete checkout flow', async ({ page }) => {
  // Step 1: Login (exists)
  await loginPage.login('test@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');

  // Step 2: Add to cart (doesn't exist - will fail here)
  await page.goto('/product/123');
  await page.click('button[name="add-to-cart"]');

  // Step 3: Checkout (doesn't exist)
  await page.goto('/checkout');
  await checkoutPage.fillShippingInfo({...});

  // Step 4: Payment (doesn't exist)
  await checkoutPage.fillPaymentInfo({...});
  await checkoutPage.submitOrder();

  // Step 5: Confirmation (doesn't exist)
  await expect(page.locator('.order-confirmation')).toBeVisible();
});
```

Run test: ❌ FAILS at step 2 (add to cart doesn't exist)

GREEN: Implement add to cart
Run test: ❌ FAILS at step 3 (checkout doesn't exist)

GREEN: Implement checkout
Run test: ❌ FAILS at step 4 (payment doesn't exist)

... continue until all steps implemented

**When to use each approach:**
- Incremental: When iterating rapidly, want fast feedback
- Skeleton: When have complete flow spec, want to track overall progress

**Both approaches follow TDD**: Write test, watch fail, implement, watch pass.
```

### Fix 3: Add frontend section to test-driven-development

Add to **test-driven-development** skill:

```markdown
## Frontend-Specific TDD

Frontend testing has special cases:

### Visual Regression Tests

**First run generates baseline** (special case):
1. Write functional test (RED-GREEN-REFACTOR)
2. Add visual test (generates baseline)
3. Future changes: Visual test catches regressions (RED if broken)

See frontend-visual-regression-testing skill for details.

### E2E Tests

**Build incrementally** (recommended):
- Write E2E test for page 1 (RED-GREEN-REFACTOR)
- Extend E2E test to page 2 (RED-GREEN-REFACTOR)
- Continue until complete flow tested

See frontend-e2e-user-journeys skill for detailed approaches.

### Component Tests

**Standard TDD applies:**
1. RED: Write test for component behavior
2. GREEN: Implement component
3. REFACTOR: Improve code

No special cases for component tests.
```

## Verification

After fix, test scenario:

```
You need to implement a checkout form component with visual regression testing.

Following TDD, what order do you:
A) Write functional test → Implement component → Take screenshot
B) Take screenshot → Write test → Implement component
C) Implement component → Write test → Take screenshot
D) Write test → Take screenshot → Implement component

Choose and explain how this follows RED-GREEN-REFACTOR.
```

Agent should:
1. Choose A
2. Explain: "Functional TDD first (RED: test, GREEN: implement, REFACTOR: improve), then visual baseline second (generates on first run)"
3. Cite frontend-visual-regression-testing updated section on "Two TDD Cycles"
4. Demonstrate understanding that baseline generation is special case, not violation of TDD
