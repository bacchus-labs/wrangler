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
