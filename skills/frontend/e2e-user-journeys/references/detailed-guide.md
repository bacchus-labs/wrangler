# Frontend/E2E User Journeys - Detailed Guide

  const driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('http://localhost:3000/signup');

    await driver.findElement(By.name('email')).sendKeys('test@example.com');
    await driver.findElement(By.name('password')).sendKeys('password123');
    await driver.findElement(By.css('button[type="submit"]')).click();

    await driver.wait(until.urlContains('/verify-email'));
    const heading = await driver.findElement(By.css('h1')).getText();
    expect(heading).toContain('Check your email');
  } finally {
    await driver.quit();
  }
});
```

### Cypress

```typescript
describe('User signup flow', () => {
  it('allows user to sign up', () => {
    cy.visit('/signup');

    cy.get('[name="email"]').type('test@example.com');
    cy.get('[name="password"]').type('password123');
    cy.get('[name="confirmPassword"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/verify-email');
    cy.get('h1').should('contain', 'Check your email');
  });
});
```

## Mandatory Verification Checklist

BEFORE claiming E2E test complete:

### Test Design
- [ ] Tests critical user journey (not component behavior)
- [ ] Uses Page Object Model (not raw selectors)
- [ ] Uses user-centric selectors (accessible roles/labels)
- [ ] Waits for conditions (not arbitrary timeouts)
- [ ] Test data is unique per test
- [ ] Test cleans up after itself

### Test Execution
- [ ] Test passes consistently (run 10 times)
- [ ] Test fails when expected (verify negative cases)
- [ ] Test runs in reasonable time (<30 seconds)
- [ ] Test doesn't depend on other tests

### Test Quality
- [ ] Page Objects encapsulate selectors
- [ ] Actions have clear domain names
- [ ] Tests read like user instructions
- [ ] Assertions verify user-visible outcomes

**If ANY checkbox unchecked**: E2E test is incomplete or incorrect.

## Red Flags - STOP IMMEDIATELY

If you catch yourself:
- Writing E2E tests for component behavior
- Testing every edge case at E2E level
- Using CSS class selectors
- Using `waitForTimeout()` with arbitrary values
- Sharing test data between tests
- Not using Page Objects (raw selectors everywhere)
- E2E tests taking >1 minute each
- E2E tests are >20% of total test suite

THEN:
- STOP immediately
- Consider if E2E is appropriate level
- Use Page Objects and user-centric selectors
- Fix test isolation and waiting issues

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

Run test: FAILS at step 2 (add to cart doesn't exist)

GREEN: Implement add to cart
Run test: FAILS at step 3 (checkout doesn't exist)

GREEN: Implement checkout
Run test: FAILS at step 4 (payment doesn't exist)

... continue until all steps implemented

**When to use each approach:**
- Incremental: When iterating rapidly, want fast feedback
- Skeleton: When have complete flow spec, want to track overall progress

**Both approaches follow TDD**: Write test, watch fail, implementing-issues, watch pass.

**Cross-reference:** See practicing-tdd skill for core RED-GREEN-REFACTOR principles.

---

## Integration with Other Skills

**Combines with:**
- practicing-tdd: Write E2E test BEFORE implementing flow (see E2E TDD section above)
- condition-based-waiting: Wait for conditions, not time
- verifying-before-completion: E2E tests required for critical flows
- frontend-component-testing: Use component tests for most UI testing
- frontend-accessibility-verification: E2E tests verify accessible selectors

## Testing Pyramid Guidance

**Modern frontend testing distribution:**

```
       /\
      /E2E\       10-15% - Critical journeys only
     /------\
    /Integration\  40-50% - Highest ROI
   /------------\
  /  Component  \  30-40% - User behavior
 /--------------\
/     Unit      \  5-10% - Pure logic
/----------------\
```

**E2E tests should be the SMALLEST portion** of your test suite.

## Common Rationalizations

| Rationalization | Counter |
|----------------|---------|
| "I need E2E test for every feature" | No. Use component tests. E2E for critical journeys only. |
| "E2E tests are more thorough" | They're slower and more brittle. Higher ROI at component level. |
| "I don't have time for Page Objects" | You'll spend more time maintaining brittle tests. |
| "CSS selectors are easier" | They break on every UI change. Use accessible selectors. |
| "I'll add timeouts to make it stable" | That's covering up race conditions. Wait for conditions. |

## Example Session

```
Agent: "I'm implementing user checkout flow."

[Uses frontend-e2e-user-journeys skill]

1. Determine if E2E appropriate:
   - Complete workflow? YES (add to cart → checkout → payment)
   - Business critical? YES (checkout is revenue-critical)
   - Could be component test? NO (spans multiple pages)
   → E2E test appropriate

2. Create Page Objects:
   - ProductPage (for adding to cart)
   - CheckoutPage (for checkout form)
   - ConfirmationPage (for order confirmation)

3. Write E2E test with TDD:
   - RED: Write test expecting checkout flow works
   - GREEN: Implement checkout flow
   - REFACTOR: Improve code, E2E test catches regressions

4. Use user-centric selectors:
   - button[name="add-to-cart"]
   - input[name="cardNumber"]
   - [role="alert"] (for error messages)

5. Wait for conditions:
   - waitForResponse('/api/checkout')
   - waitForSelector('[data-testid="confirmation"]')

6. Test isolation:
   - Create unique test user
   - Create unique test product
   - Clean up after test

7. Verify test:
   - Runs in <30s
   - Passes 10 times consecutively
   - Fails when expected (invalid card)

"Checkout E2E test complete. Critical user journey verified."
```

## References

- Page Object Model: Industry standard pattern
- Testing Library philosophy: User-centric testing
- Playwright: Built-in support for E2E testing
- condition-based-waiting skill: Comprehensive waiting guidance

---

**Remember**: E2E TESTS ONLY FOR CRITICAL USER JOURNEYS. Use component tests for most UI testing.
