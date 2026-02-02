---
id: "000017"
title: "Flaw: TDD compliance certification required by verification-before-completion but not consistently referenced in implementation skills"
type: "issue"
status: "closed"
priority: "medium"
labels: ["skills", "workflow-flaw", "process", "tdd"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Resolution

Successfully added TDD Compliance Certification format and references across all affected skills:

1. **test-driven-development/SKILL.md** - Added full certification section with format, example, requirements, and rationale before "Verification Checklist"
2. **executing-plans/SKILL.md** - Added certification requirements in Steps 2.2, 2.3, and 3.1
3. **subagent-driven-development/SKILL.md** - Added certification requirement to subagent prompt template and Step 3 verification
4. **systematic-debugging/SKILL.md** - Added certification note in Phase 4 Step 1
5. **code-review/SKILL.md** - Replaced verbal attestation with certification request in Phase 4

All skills now consistently reference the TDD Compliance Certification format, making it clear to agents when to create it (during implementation), where to include it (completion message), and why it's required (verification-before-completion).

---

## Flaw Description

**verification-before-completion** introduces a "TDD Compliance Certification" requirement (Step 0 of The Gate Function) that requires explicit attestation for each function:
- Function name
- Test name
- Watched fail: YES/NO
- Failure reason seen
- Implemented minimal code: YES/NO
- Watched pass: YES/NO
- Refactored: YES/NO/N/A

This is a great quality gate. HOWEVER:

1. **test-driven-development** skill doesn't mention this certification format
2. **executing-plans** doesn't tell agents to create this certification
3. **subagent-driven-development** doesn't mention certification
4. **systematic-debugging** Phase 4 Step 1 says "REQUIRED SUB-SKILL: Use wrangler:test-driven-development for writing proper failing tests" but TDD skill doesn't have certification format
5. **code-review** Phase 4 mentions TDD compliance but doesn't reference the certification format

This means agents can follow TDD perfectly but still fail verification-before-completion because they didn't know to create the certification.

## Affected Skills

- `verification-before-completion/SKILL.md`
- `test-driven-development/SKILL.md`
- `executing-plans/SKILL.md`
- `subagent-driven-development/SKILL.md`
- `systematic-debugging/SKILL.md`
- `code-review/SKILL.md`

## Specific Examples

### Example 1: test-driven-development has "Verification Checklist" but not "TDD Compliance Certification"

**test-driven-development** ends with:
```markdown
## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
...
```

But **verification-before-completion** requires:
```markdown
## TDD Compliance Certification

- [x] **Function name**: retryOperation
  - **Test name**: test_retries_failed_operations_3_times
  - **Watched fail**: YES
  - **Failure reason**: "ReferenceError: retryOperation is not defined"
  ...
```

**Problem:** Checklist format ≠ Certification format. Agent following TDD skill won't produce certification format expected by verification-before-completion.

### Example 2: executing-plans doesn't mention certification

**executing-plans** Step 2.2 says:
```markdown
#### 2.2: Implement with TDD

**MUST follow test-driven-development for each task:**

1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code quality
```

But doesn't say: "Create TDD Compliance Certification for each function".

When agent reaches Step 3 (Report, Review, and Code Review), they report what was implemented but may not have certification ready for verification-before-completion.

### Example 3: code-review Phase 4 asks for attestation but doesn't reference certification format

**code-review** Phase 4 TDD Compliance section says:
```markdown
2. **Can author attest to RED-GREEN-REFACTOR cycle?**
   Ask: "For each function, did you:
   1. Watch test fail first? (RED)
   2. Implement minimal code to pass? (GREEN)
   3. Refactor for quality? (REFACTOR)"
```

But doesn't say: "Request TDD Compliance Certification from verification-before-completion skill".

This means code reviewer might ask verbally and accept "Yes" but verification-before-completion will later fail because no written certification exists.

## Impact

**Medium** - This creates friction and rework:

1. **Agents follow TDD correctly** but fail verification because they didn't create certification
2. **Rework required**: After implementation complete, agent must go back and reconstruct certification from memory/git history
3. **Quality gate delayed**: Certification happens at end, not during implementation
4. **Code review mismatch**: Code reviewer asks for verbal attestation, verification expects written certification

**Not High severity** because the work itself is likely correct (TDD was followed), but the documentation is missing.

## Suggested Fix

### Fix 1: Add certification template to test-driven-development skill

Add new section to **test-driven-development**:

```markdown
## TDD Compliance Certification (REQUIRED)

As you implement, track each function in this format:

- [ ] **Function name**: [function_name]
  - **Test name**: [test_function_name]
  - **Watched fail**: YES / NO (if NO, explain why)
  - **Failure reason**: [expected failure message you saw]
  - **Implemented minimal code**: YES / NO
  - **Watched pass**: YES / NO
  - **Refactored**: YES / NO / N/A

**When to create:**
- As you complete each function (not at end)
- Before moving to next function
- Before claiming work complete

**Why this matters:**
- Required by verification-before-completion skill
- Proves you followed TDD (not just testing after)
- Creates audit trail for code review
- Makes rationalization harder (explicit lying vs fuzzy thinking)

**Integration with other skills:**
See verification-before-completion for complete requirements.
```

### Fix 2: Reference certification in executing-plans

Change **executing-plans** Step 2.2:

```markdown
#### 2.2: Implement with TDD

**MUST follow test-driven-development for each task:**

1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Improve code quality

**IMPORTANT**: As you implement, create TDD Compliance Certification
for each function (format specified in test-driven-development skill).
You will need this for verification-before-completion.
```

### Fix 3: Reference certification in subagent-driven-development

Add to **subagent-driven-development** Step 2:

```markdown
**Dispatch fresh subagent:**
```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N from [plan-file].

    IMPORTANT: As you implement, create TDD Compliance Certification
    for each function you write. Format specified in test-driven-development skill.
    You will need this for verification.
```

### Fix 4: Update code-review to reference certification

Change **code-review** Phase 4 TDD Compliance:

```markdown
2. **Request TDD Compliance Certification**

   Ask implementer to provide certification from verification-before-completion:

   "Please provide TDD Compliance Certification for each function
    (format from verification-before-completion skill)."

   Verify:
   - [ ] Certification provided for all new functions
   - [ ] All "Watched fail" are YES (or justified NO)
   - [ ] All "Watched pass" are YES
   - [ ] Failure reasons are specific (not vague)

   If certification missing or incomplete:
     Flag as Important issue: "TDD Compliance Certification required"
```

### Fix 5: Update systematic-debugging to reference certification

Change **systematic-debugging** Phase 4 Step 1:

```markdown
1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - **REQUIRED SUB-SKILL:** Use wrangler:test-driven-development for writing proper failing tests
   - **IMPORTANT:** Create TDD Compliance Certification for the fix
```

## Verification

After fix, agent implementing a feature should:

1. Read test-driven-development skill
2. See certification format and requirement
3. Create certification AS THEY IMPLEMENT (not at end)
4. Have certification ready when verification-before-completion runs
5. Pass code review because certification was provided

Test scenario:
```
Implement a retry function with exponential backoff.
Follow TDD.
Claim completion when done.
```

Agent should:
- Create certification during implementation
- Include certification in completion message
- Pass verification-before-completion without rework
