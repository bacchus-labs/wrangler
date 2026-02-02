---
id: "000012"
title: "Update testing-anti-patterns to add frontend anti-patterns"
type: "issue"
status: "closed"
priority: "medium"
labels: ["phase-4", "frontend", "testing", "anti-patterns", "skill-update"]
project: "Testing & Verification Enhancement"
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T12:30:00.000Z"
wranglerContext:
  parentTaskId: "000001"
  estimatedEffort: "3 hours"
---

## Completion Notes

Successfully implemented all three frontend anti-patterns with comprehensive examples, gate functions, and framework-agnostic patterns.

**Changes made:**
- Added Anti-Pattern 6: Testing Implementation Details (Frontend) - lines 259-425
- Added Anti-Pattern 7: No Accessibility Testing - lines 431-565
- Added Anti-Pattern 8: Testing Happy Path Only - lines 572-728
- Updated The Iron Laws to include 3 new frontend laws - lines 18-25
- Updated Quick Reference table with new anti-patterns - lines 759-769
- Added Integration with Other Skills section - lines 814-821
- Added comprehensive frontend testing examples - lines 782-812

**File metrics:**
- Original: 303 lines
- Updated: 829 lines
- Added: 526 lines of frontend testing guidance

**All acceptance criteria met:**
- Each anti-pattern has "Why This Is Wrong" section
- Multiple BAD vs GOOD examples
- Gate functions (decision trees)
- Framework-agnostic patterns (React, Vue, Angular, Web Components)
- Clear, absolute language (NEVER, MUST, STOP)
- Cross-references to frontend testing skills

## Objective

Update the testing-anti-patterns skill to add three new frontend-specific anti-patterns, preventing common mistakes when testing UI components.

## Problem

The testing-anti-patterns skill currently focuses on backend patterns (mocking, test-only methods) but has no frontend-specific guidance. Agents working on UI make predictable mistakes:
- Testing implementation details instead of user behavior
- Not testing accessibility
- Testing only happy path (ignoring loading, error, empty states)

These mistakes lead to brittle tests that break on refactoring and miss real bugs.

## Solution

Add three new anti-patterns to `skills/testing-anti-patterns/SKILL.md`:
- Anti-Pattern 6: Testing Implementation Details (Frontend)
- Anti-Pattern 7: No Accessibility Testing
- Anti-Pattern 8: Testing Happy Path Only

## Implementation Steps

### Step 1: Read the current file

```bash
cat skills/testing-anti-patterns/SKILL.md
```

Identify where to add new anti-patterns (after Anti-Pattern 5, around line 250).

### Step 2: Add Anti-Pattern 6

Insert this new section after Anti-Pattern 5:

```markdown
---

## Anti-Pattern 6: Testing Implementation Details (Frontend)

**The violation:**
Testing internal component state, props, or hooks instead of user-visible behavior.

### Why This Is Wrong

**Users don't see internal state:**
- React state, Vue data, Angular component properties
- Tests break when refactoring (state → context → store)
- Doesn't verify UI actually updates

**Tests become brittle:**
- Change from state to props → test breaks
- Extract to hook → test breaks
- Move to external store → test breaks

**Misses real bugs:**
- State updates but UI doesn't render
- UI renders but wrong value displayed
- Accessibility broken (no ARIA labels)

### Examples

#### BAD: Testing Internal State

```typescript
// ❌ BAD: Testing React state directly
test('counter increments', () => {
  const { result } = renderHook(() => useCounter());
  result.current.increment();
  expect(result.current.count).toBe(1);
});
```

**Why wrong:**
- Users don't see `result.current.count`
- Tests implementation (state), not behavior (UI)
- Breaks when refactoring to props or context

#### GOOD: Testing User-Visible Behavior

```typescript
// ✅ GOOD: Testing what user sees
test('counter increments when button clicked', async () => {
  render(<Counter />);

  // User sees initial count
  expect(screen.getByText('Count: 0')).toBeInTheDocument();

  // User clicks button
  await userEvent.click(screen.getByRole('button', { name: /increment/i }));

  // User sees updated count
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

**Why correct:**
- Tests what users experience
- Survives refactoring (state → props → context)
- Catches UI rendering bugs

### More Examples

#### BAD: Testing Props

```typescript
// ❌ BAD: Testing component props
test('button has onClick prop', () => {
  const onClick = jest.fn();
  const { container } = render(<Button onClick={onClick} />);
  expect(container.firstChild.props.onClick).toBe(onClick);
});
```

#### GOOD: Testing Behavior

```typescript
// ✅ GOOD: Testing click behavior
test('button calls onClick when clicked', async () => {
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Submit</Button>);

  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(onClick).toHaveBeenCalledTimes(1);
});
```

#### BAD: Testing CSS Classes

```typescript
// ❌ BAD: Testing CSS classes
test('button is red', () => {
  render(<Button variant="danger" />);
  expect(screen.getByRole('button')).toHaveClass('btn-danger');
});
```

#### GOOD: Testing Visual Appearance

```typescript
// ✅ GOOD: Visual regression test
test('button is red', async ({ page }) => {
  await mount('<custom-button variant="danger"></custom-button>');
  await expect(page.locator('button')).toHaveScreenshot();
});
```

### Gate Function

```
BEFORE querying component internals:

  Ask: "Can a user see this value on screen?"

  IF no (state, props, hooks, refs, CSS classes):
    STOP - Don't test it directly
    Test the visible outcome instead

  IF yes (rendered text, ARIA labels, enabled/disabled state):
    Test via user-facing queries:
      - getByRole (best - accessible)
      - getByLabelText (forms)
      - getByText (visible text)
      - NOT: getByTestId (last resort)
```

### Query Priority (Testing Library)

```typescript
// 1. BEST: Accessible queries (what screen readers see)
screen.getByRole('button', { name: /submit/i });
screen.getByRole('heading', { name: /welcome/i });
screen.getByLabelText('Email address');

// 2. GOOD: Semantic queries (visible text)
screen.getByText('Click here to continue');
screen.getByPlaceholderText('Enter your email');

// 3. ACCEPTABLE: Test IDs (when nothing else works)
screen.getByTestId('submit-button');

// 4. NEVER: Implementation details
component.state.isSubmitting;
component.props.onClick;
wrapper.find('.submit-button');
```

### Framework-Agnostic Pattern

**Works with React, Vue, Angular, Svelte, Web Components:**

```typescript
// Test user behavior, not framework internals
test('form submits with valid data', async () => {
  // Render component (framework-specific mount)
  render(<LoginForm />);

  // User interactions (framework-agnostic)
  await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  // Verify user-visible outcome (framework-agnostic)
  expect(await screen.findByText('Login successful')).toBeInTheDocument();
});
```

---

## Anti-Pattern 7: No Accessibility Testing

**The violation:**
Shipping UI without verifying it's accessible to users with disabilities.

### Why This Is Wrong

**Legal requirement:**
- WCAG 2.1 Level AA compliance mandatory in many industries
- ADA lawsuits for inaccessible websites
- Section 508 compliance for government contracts

**Excludes users:**
- ~2% of users rely on screen readers
- Many more use keyboard navigation
- Inaccessible UI is unusable for these users

**Accessibility issues ARE bugs:**
- Button with no accessible name → can't be used
- Form input with no label → can't be filled
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
```

### Step 3: Update the "Integration with Other Skills" section

Update the integration section to reference frontend skills:

```markdown
**Related skills:**
- test-driven-development: Write tests covering all states BEFORE implementing
- verification-before-completion: Verify accessibility and all states tested
- frontend-visual-regression-testing: Use for visual appearance testing
- frontend-accessibility-verification: Use for comprehensive a11y testing
- frontend-component-testing: Test components in isolation with all states
```

### Step 4: Update Examples section

Add a comprehensive frontend example at the end:

```markdown
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
```

## Acceptance Criteria

- [ ] Anti-Pattern 6 added (Testing Implementation Details - Frontend)
- [ ] Anti-Pattern 7 added (No Accessibility Testing)
- [ ] Anti-Pattern 8 added (Testing Happy Path Only)
- [ ] Each anti-pattern has:
  - [ ] Clear "Why This Is Wrong" section
  - [ ] Multiple examples (BAD vs GOOD)
  - [ ] Gate function (decision tree)
  - [ ] Framework-agnostic patterns
- [ ] Integration section updated with frontend skills
- [ ] Comprehensive frontend example added
- [ ] Language is clear and absolute (NEVER, MUST, STOP)
- [ ] Cross-references frontend testing skills
- [ ] Examples cover React, Vue, Angular, Web Components

## Verification

After implementation:

1. Read the updated skill file
2. Verify all three new anti-patterns are present
3. Check that examples clearly show BAD vs GOOD
4. Ensure gate functions are actionable
5. Verify framework-agnostic patterns work across tools
6. Check integration with frontend testing skills

## References

- Research: `.wrangler/memos/2025-11-20-testing-skills-analysis.md` lines 348-579
- Research: `.wrangler/memos/2025-11-20-testing-verification-improvement-recommendations.md` lines 242-280
- Specification: `specifications/000001-testing-verification-enhancement.md` Phase 4, item 10
- Current file: `skills/testing-anti-patterns/SKILL.md`
- Testing Library philosophy: Test what users see, not implementation
- WCAG 2.1: Accessibility is legal requirement
- Modern frontend testing: Test all UI states (loading, error, empty)
