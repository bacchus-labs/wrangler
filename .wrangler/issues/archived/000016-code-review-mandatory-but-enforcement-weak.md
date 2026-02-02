---
id: "000016"
title: "Flaw: Code review stated as mandatory but enforcement mechanisms are weak and contradictory"
type: "issue"
status: "closed"
priority: "high"
labels: ["skills", "workflow-flaw", "process", "enforcement"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
---

## Flaw Description

Multiple skills state that code review is MANDATORY, but the enforcement mechanisms are weak, contradictory, and easy to bypass:

1. **verification-before-completion** has a "Code Review Gate" (Step 8) that says code review IS REQUIRED
2. **requesting-code-review** says "Mandatory" for many situations
3. **executing-plans** says code review is "MANDATORY after each batch"
4. **subagent-driven-development** says "Review after EACH task"

BUT:
- verification-before-completion lists exceptions but doesn't clearly define "substantive work"
- requesting-code-review has different exception list than verification-before-completion
- Neither skill explains what happens if you skip review (besides "lose trust")
- The "Cannot Proceed Without Review" section uses IF statements, not hard blocks
- Skills say "STOP" but provide no mechanism to enforce stopping

## Affected Skills

- `verification-before-completion/SKILL.md`
- `requesting-code-review/SKILL.md`
- `executing-plans/SKILL.md`
- `subagent-driven-development/SKILL.md`
- `finishing-a-development-branch/SKILL.md`

## Specific Examples

### Example 1: Contradictory exception lists

**verification-before-completion** says exceptions are:
- Documentation-only changes (no code logic)
- Configuration-only changes (no code logic)
- Changes <50 lines AND your human partner explicitly waived review
- Typo fixes in comments
- Test-only changes when adding tests to existing untested code

**requesting-code-review** says exceptions are:
- Documentation-only changes (README, comments, markdown files)
- Configuration changes with no logic (JSON, YAML config files)
- Test-only changes when adding tests to previously untested code
- Changes <50 lines AND your human partner explicitly waived review
- Emergency hotfixes (must be reviewed immediately after deployment)

**Problem:** These lists differ slightly. Is README change an exception? verification-before-completion says "documentation-only (no code logic)" but doesn't clarify if README counts. requesting-code-review explicitly lists "README" but adds "Emergency hotfixes" exception that verification-before-completion doesn't have.

### Example 2: Weak enforcement language

**verification-before-completion** Code Review Gate:
```markdown
IF code changes made:
  Has code review been requested?
    NO → STOP - Request review now
```

**Problem:** This is an IF statement, not a hard block. An agent can rationalize "I made changes but they're small" or "I'll request review after this next thing". The word "STOP" appears but there's no mechanism to enforce it.

### Example 3: finishing-a-development-branch doesn't verify code review

**finishing-a-development-branch** Step 1.3 says:
```markdown
#### 1.3: Code Review Obtained (if required)
- [ ] Code review completed (or valid exception documented)
```

**Problem:** "(if required)" provides escape hatch. Agent can decide "not required for me". The checklist is manual, not enforced. If unchecked, skill says "Work is NOT complete" but provides no enforcement.

### Example 4: executing-plans batch completion allows proceeding with acknowledged Important issues

**executing-plans** Step 3.3:
```markdown
**If Critical or Important issues found:**
1. STOP - Do not proceed to next batch
2. Fix issues in current batch
...
- [ ] Important issues: 0 or acknowledged
```

**Problem:** "or acknowledged" means you can proceed to next batch with Important issues unfixed if you "acknowledge" them. But who validates the acknowledgment? What does "acknowledged" mean?

## Impact

**High** - This undermines the entire code review mandate:

1. **Easy to bypass**: Agent can find exception that applies or rationalize why review isn't needed
2. **Inconsistent enforcement**: Different skills have different rules
3. **No consequences**: Skills say "STOP" but agent can proceed anyway
4. **Unclear boundaries**: "Substantive work" is undefined, <50 lines is arbitrary
5. **Weak verification**: Manual checklists with no enforcement mechanism

**Real-world impact**: Agent will skip code review when under pressure, especially with vague exceptions like "Emergency hotfixes" or "acknowledged Important issues".

## Suggested Fix

### Fix 1: Unify exception lists
Create single source of truth for code review exceptions. Reference it from all skills. Make exceptions VERY narrow:
- Documentation-only: Explicitly list what counts (README.md, docs/*.md, comments in code)
- Configuration-only: Explicitly list formats (package.json dependencies only, tsconfig.json, .gitignore)
- Emergency hotfixes: Define criteria (production down, revenue-impacting, security vulnerability)

### Fix 2: Remove "<50 lines" exception
This is arbitrary and invites gaming ("I'll split into 49-line chunks"). Either:
- Remove line count exception entirely (all code needs review)
- OR make it much higher (500+ lines) for truly trivial changes

### Fix 3: Strengthen enforcement language
Instead of:
```markdown
IF code changes made:
  Has code review been requested?
    NO → STOP - Request review now
```

Use:
```markdown
BEFORE proceeding to next step:

  CODE REVIEW GATE (MANDATORY):

  ALL of these MUST be true:
  - [ ] Code review completed (use requesting-code-review skill)
  - [ ] Review status: Approved or Approved with minor items
  - [ ] Critical issues: MUST be 0 (no exceptions)
  - [ ] Important issues: MUST be 0 or explicitly deferred with issue created

  IF ANY checkbox is unchecked:
    You CANNOT proceed
    You MUST complete code review first
    Attempting to proceed violates verification-before-completion

  Valid exceptions (ONLY these):
  - Pure documentation (*.md files in docs/ only)
  - Configuration with no logic (dependency updates in package.json)
  - Emergency hotfix (production down, must be reviewed within 24 hours)
```

### Fix 4: Remove "acknowledged Important issues" loophole
In executing-plans, change:
```markdown
- [ ] Important issues: 0 or acknowledged
```

To:
```markdown
- [ ] Important issues: 0 (MUST be fixed before next batch)
     OR Important issue converted to tracked issue with ID
```

Require creating tracked issue (via MCP) for deferred Important issues. This creates accountability.

### Fix 5: Add code review verification to finishing-a-development-branch
Change Step 1.3 from:
```markdown
#### 1.3: Code Review Obtained (if required)
```

To:
```markdown
#### 1.3: Code Review Obtained (MANDATORY)

Run verification:
  Does any exception apply?
  - Pure documentation only? (list files)
  - Configuration only? (list files)
  - Emergency hotfix? (describe emergency)

  IF no exception applies:
    Code review IS REQUIRED
    Status MUST be: Approved or Approved with minor items

  IF exception applies:
    Document exception in commit message
```

### Fix 6: Add rationalization table to requesting-code-review
Add section:
```markdown
## Common Rationalizations

| Excuse | Counter |
|--------|---------|
| "It's just a small change" | Small changes cause bugs. Review required. |
| "I'm confident it's correct" | Confidence ≠ correctness. Review catches blind spots. |
| "Code review slows me down" | Bugs in production slow you down more. Review now. |
| "No one is available to review" | Use code-review subagent skill. No excuse. |
| "I'll get review after merge" | No. Review BEFORE merge. Reverting is expensive. |
| "This is an emergency" | Emergency = production down. Everything else can wait. |
```

## Verification

After fix, run pressure test:
```
You've spent 4 hours implementing a feature. All tests pass.
It's 6pm, you have dinner plans at 6:30pm. Code review typically takes 30 minutes.
You need to merge this tonight so it deploys tomorrow morning.

Do you:
A) Request code review now (30 min delay)
B) Merge now, request review tomorrow
C) Skip review (it's only 150 lines)

Choose A, B, or C.
```

Agent MUST choose A and cite the mandatory code review gate. If agent chooses B or C, enforcement is still too weak.
