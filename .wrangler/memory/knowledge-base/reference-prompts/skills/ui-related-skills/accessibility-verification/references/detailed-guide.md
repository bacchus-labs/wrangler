# Accessibility Verification - Detailed Guide

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
- practicing-tdd: Write a11y tests BEFORE implementing UI
- verifying-before-completion: Accessibility verification required before completion
- frontend-visual-regression-testing: Run AFTER visual verification
- reviewing-code: Reviewers verify a11y tests exist and pass

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
