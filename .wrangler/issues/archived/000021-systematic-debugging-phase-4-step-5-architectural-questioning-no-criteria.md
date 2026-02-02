---
id: "000021"
title: "Flaw: systematic-debugging Phase 4 Step 5 says question architecture after 3+ failed fixes but provides no criteria for what constitutes 'architectural problem'"
type: "issue"
status: "closed"
priority: "medium"
labels: ["skills", "workflow-flaw", "process", "debugging"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Completion Note

Updated systematic-debugging/SKILL.md to add comprehensive architectural vs implementation problem criteria:
- Added "Distinguishing Architectural vs Implementation Problems" section with specific indicators
- 4 architectural problem indicators (shared state, tight coupling, missing abstraction, wrong separation of concerns)
- 3 implementation problem indicators (single root cause, edge case handling, timing/concurrency)
- Clear guidance on when to question architecture after 3+ failed fixes
- Added two detailed examples (auth token architectural problem vs implementation problem)
- Added "Having the Architectural Discussion" section with structured approach for presenting case to human partner
- Updated Red Flags section to reference new criteria with specific guidance

## Flaw Description

**systematic-debugging** Phase 4 Step 5 (lines 199-214) introduces an important concept:

> **If 3+ Fixes Failed: Question Architecture**

This is great! It prevents agents from thrashing with endless fix attempts. However, the guidance is vague:

1. **Pattern indicating architectural problem** (lines 201-206):
   - "Each fix reveals new shared state/coupling/problem in different place"
   - "Fixes require 'massive refactoring' to implement"
   - "Each fix creates new symptoms elsewhere"

2. **Problem:** These patterns are subjective and unclear:
   - What is "massive refactoring"? 50 lines? 500 lines? Touching 5 files?
   - "Each fix reveals new problem" - How many is "each"? 2 fixes? All 3?
   - "Different place" - Different function? Different file? Different module?

3. **No examples** of what architectural vs implementation problems look like

4. **No guidance** on how to have the architectural discussion with human partner

5. **Unclear next steps** after questioning architecture

## Affected Skills

- `systematic-debugging/SKILL.md` (lines 199-214, lines 225-232 Red Flags)

## Specific Examples

### Example 1: Vague pattern descriptions

Lines 201-206:
```markdown
**Pattern indicating architectural problem:**
- Each fix reveals new shared state/coupling/problem in different place
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere
```

**Agent scenario:**
Agent is fixing auth token refresh bug. Attempts:
1. Fix 1: Add token refresh in API client → Tests fail because store not updated
2. Fix 2: Update store in API client → Tests fail because components not re-rendering
3. Fix 3: Add re-render trigger → Tests fail because race condition with logout

**Question:** Is this an architectural problem? The pattern matches "each fix reveals new problem in different place". But maybe this is just a complex bug with multiple manifestations?

Agent has no clear criteria to decide.

### Example 2: No examples

The skill describes the pattern but gives no examples of:
- **Architectural problem**: "Auth state stored in 3 places (localStorage, context, API client). Should be single source of truth."
- **Implementation problem**: "Auth token refresh timing is off by 100ms. Need to adjust comparison."

Without examples, agent can't distinguish.

### Example 3: No discussion guide

Line 213 says:
```markdown
**Discuss with your human partner before attempting more fixes**
```

But doesn't say HOW. Should agent:
- Present the 3 failed fix attempts with analysis?
- Propose alternative architectures?
- Ask open-ended "What should we do?"
- Create issue for architectural refactor?

### Example 4: Red Flags list mentions this but no elaboration

Lines 228-232:
```markdown
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**
```

These Red Flags are listed but not explained. How does agent know if they're hitting these flags?

## Impact

**Medium** - This creates confusion during debugging:

1. **Agents might continue thrashing**: If unclear whether it's architectural, agent might try fix #4, #5, #6...
2. **Agents might give up prematurely**: After 3 failed fixes to complex bug, agent might incorrectly claim "architectural problem" when it's just tricky
3. **Unclear how to escalate**: No guidance on how to have architectural discussion
4. **No examples to calibrate**: Agent can't learn from examples what architectural vs implementation problems look like

**Why medium:** The 3-fix limit is good guidance, but vagueness reduces effectiveness.

## Suggested Fix

### Fix 1: Add concrete criteria for architectural problems

Add section after line 214:

```markdown
## Distinguishing Architectural vs Implementation Problems

### Architectural Problem Indicators

**Strong signals** (any one indicates architectural issue):
1. **Shared state in multiple places**
   - Same data stored in 3+ locations (localStorage, context, store, DB cache)
   - Updates to one location don't propagate to others
   - Synchronization bugs appear repeatedly

2. **Tight coupling across modules**
   - Fix in module A breaks module B unexpectedly
   - Can't change one component without changing 5 others
   - Dependencies are circular or tangled

3. **Missing abstraction layer**
   - Similar code repeated in 10+ places
   - Fix requires updating all instances
   - No central place to change behavior

4. **Wrong separation of concerns**
   - UI logic mixed with business logic
   - Database queries in presentation layer
   - Can't test one piece without testing everything

### Implementation Problem Indicators

**Strong signals** (indicates implementation bug, not architecture):
1. **Single root cause, multiple symptoms**
   - All failures trace back to one incorrect assumption
   - Fix in one place resolves all symptoms
   - Not coupled to other modules

2. **Edge case handling**
   - Works in 99% of cases, fails on corner cases
   - Fix is adding bounds checking or validation
   - Isolated to one function/module

3. **Timing or concurrency issue**
   - Race condition with clear sequence
   - Fix is synchronization primitive
   - Not a design problem, execution order problem

### When to Question Architecture

After 3 failed fix attempts:

**IF any Strong architectural signal present:**
  Stop fixing symptoms
  Discuss architectural refactor with your human partner

**IF only Implementation signals:**
  Return to Phase 1 (re-investigate with new information)
  May still be solvable without architectural change
```

### Fix 2: Add examples

Add after architectural criteria:

```markdown
## Examples

### Example: Architectural Problem

**Scenario:** Auth token refresh bug

Fix attempts:
1. Add refresh in API client → Store not updated
2. Update store in API client → Components not re-rendering
3. Add re-render trigger → Race condition with logout

**Analysis:**
- Pattern: Each fix reveals new shared state issue
- Root cause: Auth state stored in 4 places (localStorage, React context, API client, URL params)
- Architectural issue: No single source of truth for auth state

**Correct action:** Refactor to single auth state manager. Fixes are band-aids.

### Example: Implementation Problem

**Scenario:** Token refresh happening 100ms early

Fix attempts:
1. Adjust expiry check to `< expiryTime - 100` → Still fails occasionally
2. Adjust to `< expiryTime - 200` → Works but feels wrong
3. Check token validity in addition to expiry → Reveals expiry time parsing bug

**Analysis:**
- Pattern: Getting closer to root cause with each attempt
- Root cause: Expiry time parsing doesn't account for timezone
- Implementation issue: Single bug with misleading symptoms

**Correct action:** Fix parsing logic. Architecture is fine.
```

### Fix 3: Add discussion guide

Add section:

```markdown
## Having the Architectural Discussion

When you've determined it's an architectural problem:

**Prepare your case:**

1. **Summarize the issue:**
   "I've attempted 3 fixes for [problem]. Each revealed new issues in [places]. This indicates an architectural problem: [specific issue]."

2. **Present the evidence:**
   - Fix 1: [what you tried] → [what failed]
   - Fix 2: [what you tried] → [what failed]
   - Fix 3: [what you tried] → [what failed]
   - Pattern: [which architectural indicator matches]

3. **Propose options:**
   "Possible approaches:
    A) Refactor [component] to [new architecture] (high effort, solves root cause)
    B) Continue fixing symptoms (low effort, technical debt)
    C) Defer to later, document workaround (lowest effort, future pain)

   I recommend A because [reasoning]."

4. **Ask for decision:**
   "Should we refactor the architecture now, or work around it?"

**Don't:**
- Just say "I'm stuck"
- Propose fixes without explaining why architecture is wrong
- Make the decision unilaterally (this is strategic, not tactical)
```

### Fix 4: Update Red Flags with clarification

Lines 228-232, add:
```markdown
- **"One more fix attempt" (when already tried 2+)**
  → Stop. Count your attempts. If ≥3, question architecture (see Phase 4.5)

- **Each fix reveals new problem in different place**
  → Stop. This is architectural indicator. See criteria in Phase 4.5 to confirm.
```

## Verification

After fix, test scenario:

```
You're debugging auth token refresh. You've tried:
1. Adding refresh call in API client → Store doesn't update
2. Updating store in API client → Components don't re-render
3. Adding re-render trigger → Race condition with logout

Do you:
A) Try fix #4 (add synchronization)
B) Question if this is an architectural problem
C) Return to Phase 1 (re-investigate)

Choose and explain.
```

Agent should:
1. Recognize 3 fixes attempted
2. Check architectural criteria
3. Identify "shared state in multiple places" indicator
4. Choose B (question architecture)
5. Prepare case using discussion guide
6. Present options to human partner
7. Not attempt fix #4 without architectural discussion
