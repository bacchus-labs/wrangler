---
name: testing-anti-patterns
description: Use when writing or changing tests, adding mocks, or tempted to add test-only methods to production code - prevents testing mock behavior, production pollution with test-only methods, and mocking without understanding dependencies
---

# Testing Anti-Patterns

## Overview

Tests must verify real behavior, not mock behavior. Mocks are a means to isolate, not the thing being tested.

**Core principle:** Test what the code does, not what the mocks do.

**Following strict TDD prevents these anti-patterns.**

## The Iron Laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies
4. NEVER test implementation details - test user-visible behavior
5. NEVER ship UI without accessibility testing
6. NEVER test only happy path - test all UI states
```

## Anti-Pattern 1: Testing Mock Behavior

**The violation:**
```typescript
// ❌ BAD: Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});
```

**Why this is wrong:**
- You're verifying the mock works, not that the component works
- Test passes when mock is present, fails when it's not
- Tells you nothing about real behavior

**your human partner's correction:** "Are we testing the behavior of a mock?"

**The fix:**
```typescript
// ✅ GOOD: Test real component or don't mock it
test('renders sidebar', () => {
  render(<Page />);  // Don't mock sidebar
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});

// OR if sidebar must be mocked for isolation:
// Don't assert on the mock - test Page's behavior with sidebar present
```

### Gate Function

```
BEFORE asserting on any mock element:
  Ask: "Am I testing real component behavior or just mock existence?"

  IF testing mock existence:
    STOP - Delete the assertion or unmock the component

  Test real behavior instead
```

## Anti-Pattern 2: Test-Only Methods in Production

**The violation:**
```typescript
// ❌ BAD: destroy() only used in tests
class Session {
  async destroy() {  // Looks like production API!
    await this._workspaceManager?.destroyWorkspace(this.id);
    // ... cleanup
  }
}

// In tests
afterEach(() => session.destroy());
```

**Why this is wrong:**
- Production class polluted with test-only code
- Dangerous if accidentally called in production
- Violates YAGNI and separation of concerns
- Confuses object lifecycle with entity lifecycle

**The fix:**
```typescript
// ✅ GOOD: Test utilities handle test cleanup
// Session has no destroy() - it's stateless in production

// In test-utils/
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) {
    await workspaceManager.destroyWorkspace(workspace.id);
  }
}

// In tests
afterEach(() => cleanupSession(session));
```

### Gate Function

```
BEFORE adding any method to production class:
  Ask: "Is this only used by tests?"

  IF yes:
    STOP - Don't add it
    Put it in test utilities instead

  Ask: "Does this class own this resource's lifecycle?"

  IF no:
    STOP - Wrong class for this method
```

## Anti-Pattern 3: Mocking Without Understanding

**The violation:**
```typescript
// ❌ BAD: Mock breaks test logic
test('detects duplicate server', () => {
  // Mock prevents config write that test depends on!
  vi.mock('ToolCatalog', () => ({
    discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
  }));

  await addServer(config);
  await addServer(config);  // Should throw - but won't!
});
```

**Why this is wrong:**
- Mocked method had side effect test depended on (writing config)
- Over-mocking to "be safe" breaks actual behavior
- Test passes for wrong reason or fails mysteriously

**The fix:**
```typescript
// ✅ GOOD: Mock at correct level
test('detects duplicate server', () => {
  // Mock the slow part, preserve behavior test needs
  vi.mock('MCPServerManager'); // Just mock slow server startup

  await addServer(config);  // Config written
  await addServer(config);  // Duplicate detected ✓
});
```

### Gate Function

```
BEFORE mocking any method:
  STOP - Don't mock yet

  1. Ask: "What side effects does the real method have?"
  2. Ask: "Does this test depend on any of those side effects?"
  3. Ask: "Do I fully understand what this test needs?"

  IF depends on side effects:
    Mock at lower level (the actual slow/external operation)
    OR use test doubles that preserve necessary behavior
    NOT the high-level method the test depends on

  IF unsure what test depends on:
    Run test with real implementation FIRST
    Observe what actually needs to happen
    THEN add minimal mocking at the right level

  Red flags:
    - "I'll mock this to be safe"
    - "This might be slow, better mock it"
    - Mocking without understanding the dependency chain
```

## Anti-Pattern 4: Incomplete Mocks

**The violation:**
```typescript
// ❌ BAD: Partial mock - only fields you think you need
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
  // Missing: metadata that downstream code uses
};

// Later: breaks when code accesses response.metadata.requestId
```

**Why this is wrong:**
- **Partial mocks hide structural assumptions** - You only mocked fields you know about
- **Downstream code may depend on fields you didn't include** - Silent failures
- **Tests pass but integration fails** - Mock incomplete, real API complete
- **False confidence** - Test proves nothing about real behavior

**The Iron Rule:** Mock the COMPLETE data structure as it exists in reality, not just fields your immediate test uses.

**The fix:**
```typescript
// ✅ GOOD: Mirror real API completeness
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
  // All fields real API returns
};
```

### Gate Function

```
BEFORE creating mock responses:
  Check: "What fields does the real API response contain?"

  Actions:
    1. Examine actual API response from docs/examples
    2. Include ALL fields system might consume downstream
    3. Verify mock matches real response schema completely

  Critical:
    If you're creating a mock, you must understand the ENTIRE structure
    Partial mocks fail silently when code depends on omitted fields

  If uncertain: Include all documented fields
```

## Anti-Pattern 5: Integration Tests as Afterthought

**The violation:**
```
✅ Implementation complete
❌ No tests written
"Ready for testing"
```

**Why this is wrong:**
- Testing is part of implementation, not optional follow-up
- TDD would have caught this
- Can't claim complete without tests

**The fix:**
```
TDD cycle:
1. Write failing test
2. Implement to pass
3. Refactor
4. THEN claim complete
```

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
- test-driven-development: Write tests covering all states BEFORE implementing
- verification-before-completion: Verify accessibility and all states tested
- frontend-visual-regression-testing: Use for visual appearance testing
- frontend-accessibility-verification: Use for comprehensive a11y testing
- frontend-component-testing: Test components in isolation with all states

## The Bottom Line

**Mocks are tools to isolate, not things to test.**

If TDD reveals you're testing mock behavior, you've gone wrong.

Fix: Test real behavior or question why you're mocking at all.
