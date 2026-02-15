# Avoiding Testing Anti Patterns - Detailed Guide

- Modal without focus trap → keyboard users stuck

### Examples

#### BAD: No Accessibility Testing

```typescript
// ❌ BAD: Only tests visual rendering
test('button works', async ({ page }) => {
  await page.click('.icon-button');
  // No keyboard navigation test
  // No screen reader verification
  // No ARIA label check
});
```

**Why wrong:**
- Might be `<div onclick>` (not keyboard accessible)
- Might have no ARIA label (screen readers can't announce)
- Might not have visible focus (keyboard users lost)

#### GOOD: Comprehensive Accessibility Testing

```typescript
// ✅ GOOD: Accessibility verification
test('button is accessible', async ({ page }) => {
  await mount('<custom-button>Submit</custom-button>');

  // Automated accessibility check
  await injectAxe(page);
  const violations = await checkA11y(page);
  expect(violations).toHaveLength(0);

  // Keyboard navigation
  await page.keyboard.press('Tab');
  await expect(page.locator('button')).toBeFocused();
  await page.keyboard.press('Enter');
  // Verify button activated

  // Screen reader verification
  const accessibleName = await page.locator('button').getAttribute('aria-label')
                       || await page.locator('button').textContent();
  expect(accessibleName).toBeTruthy();
});
```

### Common Accessibility Violations

#### 1. Buttons Without Accessible Names

```html
<!-- ❌ BAD: Icon button with no label -->
<button><img src="close.svg" /></button>

<!-- ✅ GOOD: Aria-label provided -->
<button aria-label="Close"><img src="close.svg" alt="" /></button>
```

#### 2. Divs as Buttons

```html
<!-- ❌ BAD: Not keyboard accessible -->
<div onclick="submit()">Submit</div>

<!-- ✅ GOOD: Semantic button -->
<button onclick="submit()">Submit</button>
```

#### 3. Form Inputs Without Labels

```html
<!-- ❌ BAD: No label for screen readers -->
<input type="text" placeholder="Email" />

<!-- ✅ GOOD: Explicit label -->
<label for="email">Email</label>
<input id="email" type="text" />
```

### Gate Function

```
BEFORE claiming UI work complete:

  Has accessibility testing been done?
    NO → STOP - Run accessibility tests

  axe-core violations: 0?
    NO → STOP - Fix violations before proceeding

  Keyboard navigation tested?
    NO → STOP - Test Tab, Enter, Escape keys

  All interactive elements have accessible names?
    NO → STOP - Add ARIA labels or text content

  Lighthouse accessibility score ≥95?
    NO → STOP - Investigate and fix issues

  ONLY THEN: Claim UI complete
```

### Framework-Agnostic Testing

```typescript
// Works with Playwright, Selenium, Puppeteer
test('component is accessible', async ({ page }) => {
  // Navigate to component
  await page.goto('/checkout');

  // Inject axe-core
  await injectAxe(page);

  // Run automated accessibility audit
  const violations = await checkA11y(page);
  expect(violations).toHaveLength(0);
});
```

---

## Anti-Pattern 8: Testing Happy Path Only

**The violation:**
Only testing successful scenarios, ignoring loading, error, and empty states.

### Why This Is Wrong

**Real users experience all states:**
- Loading (while fetching data)
- Error (network failure, 500 error, timeout)
- Empty (no data available)
- Partial (some data missing)

**Production bugs occur in error paths:**
- App crashes on network error
- Blank screen on empty data
- No loading indicator (users confused)
- Error messages missing or unclear

**Incomplete mental model:**
- Don't understand component behavior fully
- Surprised by production bugs
- No guidance for handling failures

### Examples

#### BAD: Only Happy Path

```typescript
// ❌ BAD: Only tests success case
test('loads user profile', async () => {
  render(<UserProfile userId="123" />);
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

**Why wrong:**
- What if API is slow? (no loading test)
- What if API fails? (no error test)
- What if user not found? (no empty test)
- Production users will experience these!

#### GOOD: All States Tested

```typescript
// ✅ GOOD: Loading state
test('shows loading spinner initially', () => {
  render(<UserProfile userId="123" />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// ✅ GOOD: Success state
test('shows user data when loaded', async () => {
  mockAPI.getUser.mockResolvedValue({ name: 'Alice', email: 'alice@example.com' });
  render(<UserProfile userId="123" />);

  expect(await screen.findByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('alice@example.com')).toBeInTheDocument();
});

// ✅ GOOD: Error state
test('shows error message when fetch fails', async () => {
  mockAPI.getUser.mockRejectedValue(new Error('Network error'));
  render(<UserProfile userId="123" />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load profile');
});

// ✅ GOOD: Empty state
test('shows empty message when user not found', async () => {
  mockAPI.getUser.mockResolvedValue(null);
  render(<UserProfile userId="123" />);

  expect(await screen.findByText('User not found')).toBeInTheDocument();
});

// ✅ GOOD: Partial state
test('handles missing email gracefully', async () => {
  mockAPI.getUser.mockResolvedValue({ name: 'Alice', email: null });
  render(<UserProfile userId="123" />);

  expect(await screen.findByText('Alice')).toBeInTheDocument();
  expect(screen.queryByText('Email:')).not.toBeInTheDocument();
});
```

### UI State Checklist

For each UI component, test:

- [ ] **Loading state**: Spinner/skeleton renders while fetching
- [ ] **Success state**: Data displays correctly
- [ ] **Error state**: Error message displays on failure
- [ ] **Empty state**: Empty message when no data
- [ ] **Partial state**: Handles missing fields gracefully
- [ ] **Disabled state**: Buttons disabled during actions
- [ ] **Validation state**: Error messages for invalid input

### Gate Function

```
BEFORE writing component test:

  List all possible UI states:
  - Loading (fetching data)
  - Success (data loaded)
  - Error (network failure, 500, timeout)
  - Empty (no data available)
  - Partial (some fields missing)
  - Disabled (buttons disabled during actions)

  Write one test per state.

  IF you only wrote one test:
    STOP - You're testing incompletely
    Add tests for other states
```

### Framework-Agnostic Pattern

```typescript
// Works with any framework (React, Vue, Angular, etc.)
test('handles all states', async () => {
  // Initial: Loading
  render(<Component />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();

  // After load: Success or Error or Empty
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  // Verify final state
  // (success data, error message, or empty message)
});
```

### Common State Combinations

```typescript
// Form submission states
test('button disabled while submitting', async () => {
  render(<CheckoutForm />);

  const button = screen.getByRole('button', { name: /submit/i });

  // Initial: Enabled
  expect(button).toBeEnabled();

  // During submit: Disabled
  await userEvent.click(button);
  expect(button).toBeDisabled();
  expect(screen.getByText('Submitting...')).toBeInTheDocument();

  // After submit: Enabled (if error) or Success message
  await waitFor(() => {
    expect(button).toBeEnabled();
  });
});
```

---

## When Mocks Become Too Complex

**Warning signs:**
- Mock setup longer than test logic
- Mocking everything to make test pass
- Mocks missing methods real components have
- Test breaks when mock changes

**your human partner's question:** "Do we need to be using a mock here?"

**Consider:** Integration tests with real components often simpler than complex mocks

## TDD Prevents These Anti-Patterns

**Why TDD helps:**
1. **Write test first** → Forces you to think about what you're actually testing
2. **Watch it fail** → Confirms test tests real behavior, not mocks
3. **Minimal implementation** → No test-only methods creep in
4. **Real dependencies** → You see what the test actually needs before mocking

**If you're testing mock behavior, you violated TDD** - you added mocks without watching test fail against real code first.

## Quick Reference

| Anti-Pattern | Fix |
|--------------|-----|
| Assert on mock elements | Test real component or unmock it |
| Test-only methods in production | Move to test utilities |
| Mock without understanding | Understand dependencies first, mock minimally |
| Incomplete mocks | Mirror real API completely |
| Tests as afterthought | TDD - tests first |
| Testing implementation details (frontend) | Test user-visible behavior with accessible queries |
| No accessibility testing | Run axe-core, test keyboard navigation, verify ARIA |
| Testing happy path only | Test all states: loading, error, empty, partial |
| Over-complex mocks | Consider integration tests |

## Red Flags

- Assertion checks for `*-mock` test IDs
- Methods only called in test files
- Mock setup is >50% of test
- Test fails when you remove mock
- Can't explain why mock is needed
- Mocking "just to be safe"

## Examples

### Example: Complete Frontend Testing

```typescript
// Anti-Pattern 6: Testing implementation details
// ❌ BAD
expect(component.state.isLoading).toBe(true);

// ✅ GOOD
expect(screen.getByRole('progressbar')).toBeInTheDocument();

// Anti-Pattern 7: No accessibility testing
// ❌ BAD
await page.click('.close-button');

// ✅ GOOD
await injectAxe(page);
await checkA11y(page);
await page.click('button[aria-label="Close"]');

// Anti-Pattern 8: Testing happy path only
// ❌ BAD
test('loads data', async () => {
  expect(await screen.findByText('Data')).toBeInTheDocument();
});

// ✅ GOOD
test('shows loading state', () => { /* ... */ });
test('shows data when loaded', async () => { /* ... */ });
test('shows error when fetch fails', async () => { /* ... */ });
test('shows empty state when no data', async () => { /* ... */ });
```

## Integration with Other Skills

**Related skills:**
- practicing-tdd: Write tests covering all states BEFORE implementing
- verifying-before-completion: Verify accessibility and all states tested
- frontend-visual-regression-testing: Use for visual appearance testing
- frontend-accessibility-verification: Use for comprehensive a11y testing
- frontend-component-testing: Test components in isolation with all states

## The Bottom Line

**Mocks are tools to isolate, not things to test.**

If TDD reveals you're testing mock behavior, you've gone wrong.

Fix: Test real behavior or question why you're mocking at all.
