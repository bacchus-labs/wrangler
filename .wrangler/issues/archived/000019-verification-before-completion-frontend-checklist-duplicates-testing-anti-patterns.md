---
id: "000019"
title: "Flaw: verification-before-completion Frontend Verification Checklist duplicates content from testing-anti-patterns Anti-Patterns 6-8"
type: "issue"
status: "closed"
priority: "low"
labels: ["skills", "workflow-flaw", "process", "duplication"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Flaw Description

**verification-before-completion** has a "Frontend Verification Checklist" section (lines 177-319) that describes:
- Visual Verification (DevTools, responsive breakpoints)
- Console Verification
- Network Verification
- Accessibility Verification
- Interaction Verification

**testing-anti-patterns** has Anti-Patterns 6-8 (lines 258-732) that cover:
- Anti-Pattern 6: Testing Implementation Details (Frontend)
- Anti-Pattern 7: No Accessibility Testing
- Anti-Pattern 8: Testing Happy Path Only

There is significant overlap:

1. **Accessibility verification**: Both skills describe axe-core, keyboard navigation, screen reader verification, Lighthouse scores
2. **Testing all states**: Both skills describe testing loading, error, empty, partial states
3. **DevTools console**: Both mention verifying 0 errors
4. **User-visible behavior**: Both emphasize testing what users see (not implementation)

This creates:
- **Duplication**: Same information in two places
- **Synchronization risk**: Update one skill but forget the other
- **Confusion**: Which skill should I follow for accessibility testing?
- **Token waste**: Loading both skills means loading duplicate content

## Affected Skills

- `verification-before-completion/SKILL.md` (lines 177-319)
- `testing-anti-patterns/SKILL.md` (lines 258-732, Anti-Patterns 6-8)
- `frontend-testing/visual-regression-testing/SKILL.md`
- `frontend-testing/accessibility-verification/SKILL.md` (if it exists)

## Specific Examples

### Example 1: Accessibility verification

**verification-before-completion** lines 217-240:
```markdown
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
  - No keyboard traps found
- [ ] **Verify screen reader compatibility**:
  - All buttons have accessible names
  - All form inputs have labels
  - All images have alt text or are decorative
- [ ] **Verify focus visible** on all elements
- [ ] **Run Lighthouse accessibility audit**:
  - Open Lighthouse in DevTools
  - Select "Accessibility" category
  - Run audit
  - Verify score ≥95
```

**testing-anti-patterns** Anti-Pattern 7 lines 432-551:
```markdown
## Anti-Pattern 7: No Accessibility Testing

**The violation:**
Shipping UI without verifying it's accessible to users with disabilities.

### Why This Is Wrong
[Lists same legal/user reasons]

### Examples

#### GOOD: Comprehensive Accessibility Testing

```typescript
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

  // Screen reader verification
  const accessibleName = await page.locator('button').getAttribute('aria-label')
                       || await page.locator('button').textContent();
  expect(accessibleName).toBeTruthy();
});
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
```

**Problem:** Nearly identical content. verification-before-completion is a checklist format, testing-anti-patterns is an anti-pattern format, but they cover the same ground.

### Example 2: Testing all UI states

**verification-before-completion** Interaction Verification lines 242-257:
```markdown
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
```

**testing-anti-patterns** Anti-Pattern 8 lines 571-732:
```markdown
## Anti-Pattern 8: Testing Happy Path Only

**The violation:**
Only testing successful scenarios, ignoring loading, error, and empty states.

### Why This Is Wrong
[Explains importance]

### Examples

#### GOOD: All States Tested

```typescript
// ✅ GOOD: Loading state
test('shows loading spinner initially', () => {
  render(<UserProfile userId="123" />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

// ✅ GOOD: Success state
test('shows user data when loaded', async () => { ... });

// ✅ GOOD: Error state
test('shows error message when fetch fails', async () => { ... });

// ✅ GOOD: Empty state
test('shows empty message when user not found', async () => { ... });
```

### UI State Checklist

For each UI component, test:

- [ ] **Loading state**: Spinner/skeleton renders while fetching
- [ ] **Success state**: Data displays correctly
- [ ] **Error state**: Error message displays on failure
- [ ] **Empty state**: Empty message when no data
- [ ] **Partial state**: Handles missing fields gracefully
```

**Problem:** Same content in different format. verification-before-completion expects you to test these states, testing-anti-patterns teaches why and shows examples. But there's significant overlap.

## Impact

**Low** - This is mostly a maintenance/clarity issue:

1. **Token waste**: Loading both skills loads duplicate content
2. **Synchronization risk**: Update one but forget the other
3. **Minor confusion**: "Should I follow verification checklist or anti-pattern guidance?"

**Why not higher:** Both skills are correct and complementary. The overlap doesn't cause incorrect behavior, just inefficiency.

## Suggested Fix

### Option A: Cross-reference instead of duplicate

**verification-before-completion** becomes:
```markdown
### Frontend Verification Checklist

IF your work involves UI (HTML, CSS, JSX, templates, components):

BEFORE claiming UI work complete, verify ALL of these:

**See testing-anti-patterns skill for detailed guidance:**
- Anti-Pattern 6: Avoid testing implementation details
- Anti-Pattern 7: Accessibility testing required
- Anti-Pattern 8: Test all states (loading, error, empty, partial)

**Checklist:**

### Accessibility Verification (see testing-anti-patterns Anti-Pattern 7)
- [ ] axe-core violations: 0
- [ ] Keyboard navigation: All elements accessible
- [ ] Lighthouse accessibility score: ≥95
- [ ] Screen reader: All elements have accessible names

**For detailed guidance and examples, see testing-anti-patterns skill.**

### UI States Verification (see testing-anti-patterns Anti-Pattern 8)
- [ ] Loading state tested
- [ ] Success state tested
- [ ] Error state tested
- [ ] Empty state tested
- [ ] Partial state tested

**For detailed guidance and examples, see testing-anti-patterns skill.**
```

**Pros:**
- Eliminates duplication
- Makes testing-anti-patterns the source of truth for frontend testing guidance
- verification-before-completion stays focused on verification checklist

**Cons:**
- Requires jumping between skills
- May slow down agents (need to load testing-anti-patterns)

### Option B: Move frontend verification to separate skill

Create new skill: `frontend-testing/verification-checklist` that contains complete frontend verification guidance.

Then:
- **verification-before-completion**: References frontend-verification-checklist skill
- **testing-anti-patterns**: References frontend-verification-checklist skill for detailed guidance
- Frontend verification guidance lives in ONE place

**Pros:**
- Single source of truth
- Both skills reference it
- Reduces duplication
- Allows for comprehensive frontend verification guidance

**Cons:**
- Creates new skill
- Adds another layer of indirection

### Option C: Keep as-is but add cross-references

Add to **verification-before-completion** Frontend Verification Checklist:
```markdown
**Note:** This checklist summarizes verification requirements. For detailed guidance on avoiding common frontend testing mistakes, see testing-anti-patterns skill Anti-Patterns 6-8.
```

Add to **testing-anti-patterns** Anti-Patterns 6-8:
```markdown
**Note:** These anti-patterns inform the Frontend Verification Checklist in verification-before-completion skill. Use that checklist to ensure you've covered all verification steps.
```

**Pros:**
- Minimal change
- Clarifies relationship between skills
- Agents can use either or both

**Cons:**
- Duplication remains
- Still requires maintaining content in two places

## Recommended Fix: Option A

**verification-before-completion** should be a high-level checklist that references testing-anti-patterns for details. This:
- Reduces token usage
- Makes testing-anti-patterns the authoritative source for frontend testing guidance
- Keeps verification-before-completion focused on verification gates (not teaching)

Update verification-before-completion Frontend Verification section to be lightweight checklist with cross-references to testing-anti-patterns.

## Verification

After fix:
1. Agent implementing frontend component follows testing-anti-patterns (learns WHY and HOW)
2. Agent completing work uses verification-before-completion checklist (verifies WHAT)
3. No confusion about which skill to follow
4. Content maintained in one place (testing-anti-patterns)
5. verification-before-completion stays focused on gate function
