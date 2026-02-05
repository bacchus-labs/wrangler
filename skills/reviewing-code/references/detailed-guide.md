# Reviewing Code - Detailed Guide


**Integration with:**
- `practicing-tdd`: Reviewers verify TDD was followed
- `avoiding-testing-anti-patterns`: Reference when tests smell wrong
- `verifying-before-completion`: Ensure verification happened before review

---

## Communication Protocol

### When Providing Feedback

**Do**:
- Be specific with file:line references
- Provide evidence for claims
- Explain why something is a problem
- Suggest concrete fixes
- Acknowledge what's working well

**Don't**:
- Make vague criticisms
- Assume without checking code
- Nitpick style without reason
- Focus only on negatives
- Use subjective language without backing

### If Original Plan Has Issues

Sometimes the implementation reveals flaws in the plan itself.

**If you find**:
- Requirements were incomplete
- Planned approach won't work
- Better approach exists

**Then**:
- Note this explicitly in review
- Recommend plan updates
- Acknowledge implementation did best with what it had
- Suggest next steps for course correction

---

## Review Checklist

Before submitting review, verify:

- [ ] **Phase 4 - TDD Compliance**:
  - [ ] All functions have corresponding tests
  - [ ] Author attested to RED-GREEN-REFACTOR cycle
  - [ ] No files without tests (or documented exceptions)
  - [ ] Tests appear to verify real behavior (not mocks)
- [ ] **Phase 4 - Test Coverage**: Adequate coverage, edge cases tested
- [ ] **Phase 4 - Test Quality**: Tests verify behavior, not mocks
- [ ] Reviewed all changed files
- [ ] Checked against plan/requirements
- [ ] Looked for security issues
- [ ] Considered performance
- [ ] Checked error handling
- [ ] Verified documentation
- [ ] Categorized issues by priority
- [ ] Provided specific file:line references
- [ ] Suggested actionable fixes
- [ ] Acknowledged strengths

---

## Common Review Patterns

### Pattern: Missing Error Handling

**Finding**:
```typescript
// file.ts:45
const data = await fetchData(id);
return processData(data);
```

**Issue**: No error handling if fetchData fails

**Fix**:
```typescript
try {
  const data = await fetchData(id);
  return processData(data);
} catch (error) {
  logger.error('Failed to fetch data', { id, error });
  throw new DataFetchError(`Failed to fetch data for ${id}`, { cause: error });
}
```

---

### Pattern: Plan Deviation

**Planned**: Use Redis for caching
**Implemented**: In-memory cache with LRU eviction

**Assessment**:
- **Problematic** if multi-instance deployment (cache not shared)
- **Acceptable** if single instance and plan didn't specify why Redis

**Recommendation**: Clarify deployment model. If multi-instance, implementing-issue Redis as planned.

---

### Pattern: Test Quality Issue

**Finding**:
```typescript
// Tests mock everything, never test actual integration
it('should process order', () => {
  const mockDb = { save: jest.fn() };
  const mockPayment = { charge: jest.fn() };
  // ... everything mocked
});
```

**Issue**: Tests verify mocks work, not actual functionality

**Fix**: Add integration tests that test real behavior with test database/payment sandbox

**See**: `avoiding-testing-anti-patterns` skill

---

### Example: TDD Compliance Review

```markdown
## Phase 4: Testing Review

### TDD Compliance: NEEDS IMPROVEMENT

**Findings:**
- Functions with tests: 8 / 10 (80% coverage)
- Author attestation to TDD: Partial (6 functions attested, 2 uncertain)
- Tests verified to fail without implementation: No (trusted author)
- Files without tests: src/utils/validation.ts

**Issues identified:**

**IMPORTANT #3**: Missing tests for validation.ts
File: src/utils/validation.ts
Issue: No tests found for validation utility functions
Impact: validateEmail, validatePassword not tested
Recommendation: Add comprehensive tests before merging

**IMPORTANT #4**: Unable to verify TDD for retryOperation
File: src/api/retry.ts
Issue: Author uncertain if test was written before implementation
Git history shows retry.ts committed before retry.test.ts
Recommendation:
1. Verify test fails when retryOperation implementation removed
2. If test doesn't fail, rewrite test to verify real behavior
3. Consider rewriting function with TDD for higher confidence

**Recommendations:**
1. Add tests for validation.ts (5 functions need tests)
2. Verify retry.test.ts actually tests retry.ts behavior
3. For future work, commit tests before implementation (clearer TDD evidence)
```

---

## Advanced Scenarios

### Reviewing Refactoring

When reviewing refactors:
1. Verify behavior unchanged (tests still pass)
2. Check if complexity actually reduced
3. Ensure no new bugs introduced
4. Validate performance not degraded
5. Confirm readability improved

### Reviewing Bug Fixes

When reviewing fixes:
1. Verify fix addresses root cause, not symptom
2. Check if similar bugs exist elsewhere
3. Ensure fix doesn't break other cases
4. Validate tests added to prevent regression
5. Consider if architecture change needed to prevent class of bugs

### Reviewing New Features

When reviewing features:
1. Check all acceptance criteria met
2. Verify edge cases handled
3. Ensure consistent with existing features
4. Check if feature is actually needed (YAGNI)
5. Validate UX is reasonable

---

## Quality Bar

### Excellent Implementation
- Meets all requirements
- High test coverage with quality tests
- Clean, maintainable code
- Proper error handling
- Well documented
- No security issues
- Good performance

### Acceptable Implementation
- Meets core requirements
- Adequate test coverage
- Readable code
- Basic error handling
- Security basics covered
- No major performance issues
- Minor improvements possible

### Needs Revision
- Missing requirements
- Inadequate tests
- Hard to understand
- Poor error handling
- Security concerns
- Performance problems
- Architectural issues

---

## Success Criteria

A successful code review:

✅ Identifies all critical issues that must be fixed
✅ Provides specific, actionable feedback
✅ Acknowledges what was done well
✅ Categorizes issues by priority
✅ Includes file:line references
✅ Suggests concrete improvements
✅ Helps improve both current code and future practices

---

*See also*: `requesting-reviewing-code`, `receiving-reviewing-code`, `avoiding-testing-anti-patterns`, `verifying-before-completion`
