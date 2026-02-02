---
id: "000023"
title: "Flaw: dispatching-parallel-agents prerequisites say failures must be independent but prerequisites list contradicts this"
type: "issue"
status: "closed"
priority: "medium"
labels: ["skills", "workflow-flaw", "process", "parallelization"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Completion Note

Updated dispatching-parallel-agents/SKILL.md to clarify prerequisites and resolve contradictions:
- Updated skill description to separate logical independence from infrastructure concerns
- Added clear "Prerequisites" section with two distinct concepts:
  1. Failures Are Logically Independent (different features, different root causes)
  2. Investigation Is Parallel-Safe (can work concurrently without interfering)
- Added guidance for when failures are independent BUT not parallel-safe (dispatch for investigation, fix sequentially)
- Added "Decision Tree: When to Use Parallel Agents" with clear flow
- Added three comprehensive examples:
  1. Independent + Parallel-Safe → Use Skill
  2. Independent but NOT Parallel-Safe → Modified Approach
  3. NOT Independent → Don't Use Skill
- Each example includes independence check, parallel safety check, and decision with rationale

## Flaw Description

**dispatching-parallel-agents** is a skill for investigating multiple failures concurrently. The core concept is sound: if 3+ independent failures exist, dispatch separate agents to investigate them.

However, the "Prerequisites" section (lines 15-25) contains internal contradictions:

**Line 16-17 says:**
> **MUST be true** before using parallel agents:
> 1. **3+ independent failures** - Can be investigated without shared state

**But then line 22-25 lists as prerequisite:**
> - Tests in same suite/same file → Likely shared setup → NOT parallel-safe
> - Tests importing same mocks → Mock pollution possible → NOT parallel-safe
> - Tests modifying same config → Race conditions → NOT parallel-safe

**Problem:** These requirements are about TEST ISOLATION, not FAILURE INDEPENDENCE.

Two failures can be logically independent (auth failure vs payment failure) but still unsafe to investigate in parallel if they:
- Share test infrastructure
- Modify global state
- Use same database

The skill conflates "independent failures" with "parallel-safe test execution".

## Affected Skills

- `dispatching-parallel-agents/SKILL.md` (lines 15-25, 28-68)

## Specific Examples

### Example 1: Logically independent but not parallel-safe

**Scenario:** Test suite has failures in:
1. `test/auth.test.ts` - Login with expired token fails
2. `test/payment.test.ts` - Payment with invalid card fails
3. `test/profile.test.ts` - Profile update with missing field fails

**These are independent failures** (different features, different root causes).

**But:** All three test files:
- Use same test database (shared state)
- Run `beforeEach(() => resetDatabase())` (race condition)
- Import same `setupTestEnv()` mock (potential pollution)

According to line 22-25, these are "NOT parallel-safe".
But according to line 16-17, they are "independent failures".

**Agent confusion:** Are these eligible for parallel investigation or not?

### Example 2: Prerequisites list mixes concerns

Lines 22-25:
```markdown
**NOT parallel-safe if:**
- Tests in same suite/same file → Likely shared setup → NOT parallel-safe
- Tests importing same mocks → Mock pollution possible → NOT parallel-safe
- Tests modifying same config → Race conditions → NOT parallel-safe
```

This is talking about **test infrastructure safety**, not **failure independence**.

**Different concerns:**
- **Failure independence**: Can Agent A investigate failure 1 without knowing about failure 2? (Logical independence)
- **Parallel safety**: Can tests be run concurrently without interfering? (Infrastructure independence)

These are NOT the same thing.

### Example 3: "Subagent Boundaries" section doesn't clarify

Lines 28-68 describe subagent boundaries but don't clarify the prerequisite contradiction.

It says:
> Each subagent should have:
> - Distinct failure to investigate
> - Own set of files/functions to examine

But doesn't address: What if failures are distinct but tests share infrastructure?

## Impact

**Medium** - This creates confusion about when to use the skill:

1. **Agent might not use skill when appropriate**: "Failures are independent but tests share database, so NOT parallel-safe according to prerequisites"
2. **Agent might use skill when inappropriate**: "Failures are in different files, so must be parallel-safe"
3. **Unclear boundary**: Is this skill about logical independence or infrastructure safety?

**Why medium:** The skill provides value when used correctly, but prerequisites are confusing enough that agents might not use it when they should (or vice versa).

## Suggested Fix

### Fix 1: Clarify two distinct concepts

Replace Prerequisites section with:

```markdown
## Prerequisites

**MUST be true** before using parallel agents:

### 1. Failures Are Logically Independent

Each failure can be investigated without knowing about the others:

✅ **Independent failures:**
- Auth failure (login with expired token)
- Payment failure (invalid card)
- Profile failure (missing required field)
→ Different features, different root causes

❌ **NOT independent:**
- Auth failure cascades to profile failure
- Payment fails because auth failed first
- Tests fail in sequence due to shared state corruption
→ Root cause is shared, investigation must be sequential

### 2. Investigation Is Parallel-Safe

Subagents can work concurrently without interfering:

✅ **Parallel-safe investigation:**
- Reading different source files
- Examining different test files
- Running tests in isolation mode (separate processes/databases)
- Reading git history for different features

❌ **NOT parallel-safe:**
- Tests share database/filesystem (race conditions)
- Tests modify global state/environment variables
- Tests run in same process with shared setup
- Investigation requires modifying same files

**If failures are independent BUT not parallel-safe:**
  You can STILL use this pattern, with modifications:
  1. Dispatch subagents for investigation (reading code, analyzing)
  2. Implement fixes SEQUENTIALLY (not in parallel)
  3. Or set up isolated test environments (Docker containers, separate DBs)

**If failures are NOT independent:**
  Do NOT use parallel agents. Use systematic-debugging to find root cause.
```

### Fix 2: Add decision tree

Add section:

```markdown
## Decision Tree: When to Use Parallel Agents

```
Do you have 3+ failures?
├─ NO → Use systematic-debugging (single failure investigation)
└─ YES → Continue

Are failures logically independent?
(Can each be investigated without knowing about others?)
├─ NO → Use systematic-debugging (find common root cause)
└─ YES → Continue

Is investigation parallel-safe?
(Can subagents work concurrently without interfering?)
├─ YES → Dispatch parallel agents ✓
└─ NO → Two options:
        A) Dispatch for investigation only, fix sequentially
        B) Set up isolated test environments, then dispatch
```
```

### Fix 3: Add examples clarifying the distinction

Add section:

```markdown
## Examples

### Example 1: Independent + Parallel-Safe → Use Skill

**Failures:**
- Auth test fails (expired token handling)
- Payment test fails (card validation)
- Profile test fails (field validation)

**Check independence:**
- ✓ Different features
- ✓ Different root causes
- ✓ Can investigate without knowing about others

**Check parallel safety:**
- ✓ Tests in different files
- ✓ Each uses isolated test database (Docker containers)
- ✓ No shared mocks or global state
- ✓ Running tests won't interfere

**Decision:** Dispatch parallel agents ✓

---

### Example 2: Independent but NOT Parallel-Safe → Modified Approach

**Failures:**
- Auth test fails (expired token handling)
- Payment test fails (card validation)
- Profile test fails (field validation)

**Check independence:**
- ✓ Different features
- ✓ Different root causes
- ✓ Can investigate without knowing about others

**Check parallel safety:**
- ✗ All tests use same test database (shared state)
- ✗ Tests have `beforeEach(() => resetDatabase())` (race condition)
- ✗ Running tests in parallel causes interference

**Decision:** Use modified approach:
1. Dispatch 3 subagents to investigate (read code, analyze logic)
2. Implement fixes SEQUENTIALLY (one at a time, avoiding interference)
3. OR set up isolated test environments first, then dispatch

---

### Example 3: NOT Independent → Don't Use Skill

**Failures:**
- Auth test fails (session creation)
- Profile test fails (requires session)
- Settings test fails (requires session)

**Check independence:**
- ✗ Profile and Settings failures caused by Auth failure
- ✗ Root cause is shared (session creation broken)
- ✗ Cannot investigate Profile/Settings without understanding Auth failure

**Decision:** Do NOT dispatch parallel agents. Use systematic-debugging to find root cause in auth system first.
```

### Fix 4: Update skill description

Change description from:
```yaml
description: Use when facing 3+ independent failures that can be investigated without shared state or dependencies - dispatches multiple Claude agents to investigate and fix independent problems concurrently
```

To:
```yaml
description: Use when facing 3+ logically independent failures (different features, different root causes) that can be investigated concurrently - dispatches multiple agents to investigate in parallel; requires either parallel-safe test infrastructure OR sequential fix implementation
```

## Verification

After fix, test scenario:

```
You have 3 test failures:
1. `test/auth.test.ts:45` - Login with expired token fails
2. `test/payment.test.ts:87` - Payment with invalid card fails
3. `test/profile.test.ts:23` - Profile update with missing field fails

All three tests:
- Use the same test database (PostgreSQL test instance)
- Have `beforeEach(() => db.reset())` (resets database before each test)
- Run in the same process

Should you dispatch parallel agents to investigate these failures?

A) Yes - failures are independent, dispatch immediately
B) No - failures are not independent (shared root cause)
C) Modified approach - dispatch for investigation, fix sequentially
D) Modified approach - set up isolated environments first

Choose and explain.
```

Agent should:
1. Recognize failures are logically independent (different features)
2. Recognize investigation is NOT parallel-safe (shared database)
3. Choose C or D (modified approach)
4. Explain: "Failures are independent but test infrastructure is shared, so I'll dispatch for investigation but implement fixes sequentially to avoid race conditions"
5. NOT choose A (that ignores parallel safety concerns)
6. NOT choose B (failures ARE independent)
