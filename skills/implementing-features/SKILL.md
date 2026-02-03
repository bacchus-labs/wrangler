---
name: implementing-features
description: Autonomously implements features from specs/plans/issues using subagents with TDD and code review. Use when executing implementation tasks that require systematic orchestration of development workflows.
---

# Implement

## Overview

Autonomous implementation workflow that handles specifications, plans, issue ranges, or standalone issues.

**Core principle:** Dispatch subagent per task, automatic code review and fixes, only stop for genuine blockers

**Entry point:** `/wrangler:implementing-features [scope]`

**Works in main branch OR worktree (no preference)**

**Headless mode:** Runs autonomously - does not stop for user checkpoints unless blocked

## When to Use

**Use this skill when:**
- Executing a complete specification or plan
- Implementing a range of related issues
- Working on a standalone issue that needs full implementation
- You want autonomous execution with quality gates

**Do NOT use this skill when:**
- Exploring or understanding code (use locating-code or analyzing-implementations)
- Answering questions about implementation (just answer directly)
- User wants manual control over each step (rare - ask user if unclear)

## Scope Parsing

The skill automatically determines what to implementing-features based on your input.

### Supported Formats

**1. Specification files**

```bash
/wrangler:implementing-features spec-auth-system.md
```

→ Loads spec from `.wrangler/specifications/`
→ Extracts linked MCP issues OR parses inline tasks
→ Executes all tasks sequentially

**2. Plan files**

```bash
/wrangler:implementing-features plan-refactor.md
```

→ Loads plan from `.wrangler/plans/`
→ Extracts task list from plan
→ Executes all tasks sequentially

**3. Single issue**

```bash
/wrangler:implementing-features issue #42
/wrangler:implementing-features issue 42
```

→ Loads issue from MCP using issues_get
→ Treats entire issue as single task
→ Executes immediately

**4. Issue range**

```bash
/wrangler:implementing-features issues 5-7
/wrangler:implementing-features issues 5,6,7
```

→ Loads multiple issues from MCP
→ Executes sequentially (respects dependencies if specified)

**5. Context inference (no parameter)**

```bash
/wrangler:implementing-features
```

→ Scans last 5 user messages for file or issue references
→ Uses most recent valid reference found
→ Error if nothing found: "Cannot infer scope. Specify file or issue."

### Parsing Algorithm

```
1. Check if scope parameter provided
   YES → Parse parameter (see format patterns above)
   NO → Go to step 2

2. Scan last 5 user messages in conversation
   - Look for file references (.md files)
   - Look for issue references (#N or "issue N")

3. Determine scope type:
   - Starts with "spec-" OR in .wrangler/specifications/ → Specification
   - Starts with "plan-" OR in plans/ → Plan
   - Contains "issue" or "#" → Issue reference

4. Load tasks:
   - Specification: Read file, extract linked issues via issues_list OR parse inline
   - Plan: Read file, extract task list
   - Issue(s): Load via MCP (issues_get or issues_list)

5. If nothing found:
   ERROR: "Cannot infer scope. Please specify:
   - Specification file (spec-name.md)
   - Plan file (plan-name.md)
   - Issue (#N or issue N)
   - Issue range (issues N-M)"
```

### Normalized Task Format

All scope types convert to standard task objects:

```typescript
interface Task {
  id: string;           // "spec-auth:task-1", "issue-42", "plan:task-3"
  title: string;        // Short task description
  description: string;  // Full requirements and context
  requirements: string; // What counts as "done" (acceptance criteria)
  relatedFiles: string[]; // Files likely to change (hints for subagent)
  dependencies: string[]; // IDs of tasks that must complete first
}
```

**Dependency handling:**
- Tasks with dependencies wait until prerequisite tasks complete
- If circular dependencies detected: ERROR and escalate to user
- If dependency references non-existent task: ERROR and escalate

## Task Executor Workflow

After scope is parsed and tasks are loaded, execute them in order.

### Setup Phase

1. **Create TodoWrite tracking**

   Create one todo per task:
   ```
   - Task 1: [title] (status: pending)
   - Task 2: [title] (status: pending)
   ...
   ```

2. **Verify and capture working directory**

   **CRITICAL:** Capture the ABSOLUTE path for subagent context:
   ```bash
   WORK_DIR="$(pwd)"
   WORK_BRANCH="$(git branch --show-current)"
   GIT_ROOT="$(git rev-parse --show-toplevel)"

   echo "Working directory: $WORK_DIR"
   echo "Git root: $GIT_ROOT"
   echo "Branch: $WORK_BRANCH"

   # Check if this is a worktree
   if [ "$GIT_ROOT" != "$(git rev-parse --git-common-dir | xargs dirname)" ]; then
     echo "STATUS: Working in git worktree"
     IS_WORKTREE=true
   else
     echo "STATUS: Working in main repository"
     IS_WORKTREE=false
   fi
   ```

   **Store these values** - you'll need them for every subagent prompt.

   **If working in a worktree:** All subagent prompts MUST include worktree isolation protocol (see step 2b below).

3. **Check dependencies**

   Build dependency graph:
   - If task has dependencies, mark as "blocked"
   - Only tasks with no pending dependencies are "ready"

### Execution Loop

For each task in "ready" state:

#### 1. Mark Task In Progress

```
TodoWrite: Mark task as in_progress
```

#### 2. Dispatch Implementation Subagent

Use the Task tool (general-purpose subagent):

```markdown
Tool: Task
Description: "Implement Task [N]: [title]"
Prompt: |
  You are implementing Task [N] from [scope reference].

  ## CRITICAL: Working Directory Context

  **Working directory:** [ABSOLUTE_WORK_DIR from setup phase]
  **Branch:** [WORK_BRANCH from setup phase]
  **Git root:** [GIT_ROOT from setup phase]

  ### MANDATORY: Verify Location First

  Before ANY work, run this verification:

  ```bash
  cd [ABSOLUTE_WORK_DIR] && \
    echo "=== LOCATION VERIFICATION ===" && \
    echo "Directory: $(pwd)" && \
    echo "Git root: $(git rev-parse --show-toplevel)" && \
    echo "Branch: $(git branch --show-current)" && \
    echo "Expected: [ABSOLUTE_WORK_DIR] on [WORK_BRANCH]" && \
    test "$(pwd)" = "[ABSOLUTE_WORK_DIR]" && echo "VERIFIED" || echo "FAILED - STOP"
  ```

  **If verification fails, STOP immediately and report the mismatch.**

  ### Command Pattern (REQUIRED)

  ALL bash commands MUST use this pattern:
  ```bash
  cd [ABSOLUTE_WORK_DIR] && [your command]
  ```

  Examples:
  - Tests: `cd [ABSOLUTE_WORK_DIR] && npm test`
  - Git: `cd [ABSOLUTE_WORK_DIR] && git status`
  - Build: `cd [ABSOLUTE_WORK_DIR] && npm run build`

  **Never run git commands without the `cd [ABSOLUTE_WORK_DIR] &&` prefix.**

  ## Task Requirements

  [Full task description from task.description]

  ## Acceptance Criteria

  [task.requirements]

  ## Related Files

  [task.relatedFiles]

  ## Your Job

  1. **Verify location** (FIRST - see above)

  2. **Follow TDD** (practicing-tdd skill):
     - RED: Write failing test first
     - GREEN: Implement minimal code to pass
     - REFACTOR: Improve code quality

  3. **Create TDD Compliance Certification**
     For each function you implementing-features, document:
     - Function name and signature
     - Test file path
     - Whether you followed RED-GREEN-REFACTOR
     - Any deviations justified

     Format (from practicing-tdd skill):
     ```
     | Function | Test File | Watched Fail? | Watched Pass? | Notes |
     |----------|-----------|---------------|---------------|-------|
     | funcName | test.ts:L | YES/NO        | YES/NO        | ...   |
     ```

  4. **Verify implementation works**
     - Run tests: `cd [ABSOLUTE_WORK_DIR] && npm test`
     - Check for errors/warnings
     - Ensure requirements met

  5. **Commit your work**
     ```bash
     cd [ABSOLUTE_WORK_DIR] && git add [files] && git commit -m "[type]: [description]"
     ```

  6. **Report back**
     Provide:
     - **Location verification output** (proving correct directory)
     - Summary of what you implemented
     - Test results (pass/fail counts, output)
     - TDD Compliance Certification table
     - Files changed
     - Commit hash: `cd [ABSOLUTE_WORK_DIR] && git rev-parse HEAD`
     - Any issues or blockers encountered

  IMPORTANT: If you encounter unclear requirements or missing information,
  STOP and report the blocker. Do not guess or make assumptions.
```

#### 3. Verify Subagent Response

Check subagent's report for:

- ✅ **Location verification output** (MUST show "VERIFIED")
- ✅ Implementation summary provided
- ✅ Test results provided (all passing)
- ✅ TDD Compliance Certification included
- ✅ Files changed list provided
- ✅ Work committed to git
- ✅ Commit hash provided

**If location verification missing or shows "FAILED":**
→ STOP - subagent may have worked in wrong directory
→ Verify where commits actually landed before proceeding

**If certification missing:**
→ STOP and request: "Please provide TDD Compliance Certification for functions implemented"

**If tests failing:**
→ Continue to code review (reviewer will catch issues)

**If blocker reported:**
→ ESCALATE to user immediately with blocker details

#### 4. Update Dependencies

After task completes:

1. Mark this task's ID as "complete" in dependency tracker
2. Check all "blocked" tasks
3. For each blocked task, remove this task from its dependency list
4. If blocked task now has zero dependencies, mark as "ready"

#### 5. Continue to Code Review

(This will be added in next task - code review automation)

### Dependency Resolution Example

```
Task graph:
- Task A: no dependencies → "ready"
- Task B: depends on [A] → "blocked"
- Task C: depends on [A, B] → "blocked"

Execution:
1. Execute Task A
2. Task A completes → mark "complete"
3. Task B: remove A from dependencies → [empty] → "ready"
4. Task C: remove A from dependencies → [B] → still "blocked"
5. Execute Task B
6. Task B completes → mark "complete"
7. Task C: remove B from dependencies → [empty] → "ready"
8. Execute Task C
```

### Error Handling

**Subagent fails to complete:**
- First attempt: Dispatch another subagent with same prompt (fresh context)
- Second attempt: ESCALATE to user with failure details

**Subagent reports blocker:**
- ESCALATE immediately (unclear requirements, missing deps, etc.)

**Tests fail after implementation:**
- Continue to code review (will be fixed in review automation)

**Circular dependencies detected:**
- ERROR: "Circular dependency detected: [A → B → C → A]"
- ESCALATE to user

## Code Review Automation

After each task's implementation subagent completes, automatically request and handle code review.

### Step 1: Dispatch Code Reviewer

Use the Task tool with requesting-reviewing-code template:

```markdown
Tool: Task
Description: "Code review for Task [N]"
Prompt: |
  You are reviewing code for Task [N] from [scope reference].

  ## What Was Implemented

  [Implementation subagent's summary]

  ## Requirements

  Task [N]: [task.title]

  [task.description]

  ## Acceptance Criteria

  [task.requirements]

  ## Code Changes

  Base commit: [git SHA before task]
  Head commit: [git SHA after task]

  ## Your Job

  Follow the reviewing-code skill framework:

  1. **Review the implementation** against requirements
  2. **Identify issues** and categorize:
     - **Critical**: Must fix (breaks functionality, security issue, tests fail)
     - **Important**: Should fix (doesn't meet requirements, poor design, missing edge cases)
     - **Minor**: Nice to fix (style, naming, comments)

  3. **Provide assessment**:
     - Strengths: What was done well
     - Issues: List with category and specific fix instructions
     - Overall: Approved / Needs Revision

  4. **Return structured report**

  See requesting-reviewing-code skill for full template.
```

### Step 2: Parse Review Feedback

Extract from code reviewer's response:

```typescript
interface ReviewFeedback {
  strengths: string[];
  issues: {
    category: "Critical" | "Important" | "Minor";
    description: string;
    fixInstructions: string;
  }[];
  assessment: "Approved" | "Needs Revision";
}
```

Count issues by category:
- `criticalCount = issues.filter(i => i.category === "Critical").length`
- `importantCount = issues.filter(i => i.category === "Important").length`
- `minorCount = issues.filter(i => i.category === "Minor").length`

### Step 3: Handle Critical Issues (AUTO-FIX)

**If criticalCount > 0:**

For each Critical issue:

1. **First fix attempt**

   Dispatch fix subagent:
   ```markdown
   Tool: Task
   Description: "Fix Critical issue: [issue.description]"
   Prompt: |
     You are fixing a Critical code review issue from Task [N].

     ## Issue

     [issue.description]

     ## Fix Instructions

     [issue.fixInstructions]

     ## Your Job

     1. Implement the fix
     2. Run tests to verify fix works
     3. Commit the fix
     4. Report: What you changed, test results

     IMPORTANT: This is a Critical issue - must be fixed before proceeding.
   ```

2. **Verify fix**

   Check fix subagent's report:
   - ✅ Fix implemented
   - ✅ Tests passing
   - ✅ Committed

3. **If fix fails: Second attempt**

   Dispatch fresh fix subagent with "start from scratch" instruction:
   ```markdown
   Prompt: |
     PREVIOUS FIX ATTEMPT FAILED.

     ## Original Issue

     [issue.description]

     ## What Was Tried

     [first subagent's report]

     ## Your Job

     Start from scratch. Analyze the problem fresh and implementing-features a different approach.

     1. Read the code to understand current state
     2. Implement fix using a DIFFERENT approach than previous attempt
     3. Run tests
     4. Commit
     5. Report
   ```

4. **If second fix fails: ESCALATE**

   ```markdown
   BLOCKER: Unable to fix Critical issue after 2 attempts

   ## Issue

   [issue.description]

   ## Fix Attempts

   Attempt 1: [summary]
   Attempt 2: [summary]

   ## Current State

   [test output, error messages]

   I need your help to resolve this issue before proceeding.
   ```

   STOP execution and wait for user response.

### Step 4: Handle Important Issues (AUTO-FIX)

**If importantCount > 0:**

Same process as Critical issues:
- Dispatch fix subagent (attempt 1)
- If fails: Fresh subagent (attempt 2)
- If fails again: ESCALATE with blocker

**Important issues MUST be resolved before continuing to next task.**

### Step 5: Handle Minor Issues (DOCUMENT)

**If minorCount > 0:**

Do NOT auto-fix. Instead, document for reference:

```markdown
## Minor Issues Noted (not fixed automatically)

- [issue 1 description]
- [issue 2 description]
...

These can be addressed in a future refactoring pass if desired.
```

Continue to next task without fixing Minor issues.

### Step 6: Verify All Critical/Important Fixed

Before proceeding to next task, verify:

```
criticalCount === 0 AND importantCount === 0
```

If false: STOP (should never happen - means fix logic failed)
If true: Continue to next task

### Auto-Fix Retry Example

```
Task 5 implementation complete

Code review dispatched
→ Review returns:
  - Critical: 1 (missing null check in parseUser())
  - Important: 1 (error not logged in catch block)
  - Minor: 2 (naming suggestions)

Fix Critical issue (null check):
→ Attempt 1: Dispatch fix subagent
  → Subagent adds null check but tests fail (wrong logic)
→ Attempt 2: Dispatch fresh fix subagent with "start from scratch"
  → Subagent uses different approach (early return), tests pass ✓

Fix Important issue (logging):
→ Attempt 1: Dispatch fix subagent
  → Subagent adds logging, tests pass ✓

Document Minor issues (naming):
→ "Minor issues noted: [list]"

Verify: 0 Critical, 0 Important → Continue to Task 6
```

### Integration with Task Executor

After code review completes and all Critical/Important issues fixed:

1. Mark task as "completed" in TodoWrite
2. Update dependency graph (see task executor workflow)
3. Move to next ready task
4. Repeat process

## Blocker Detection & Escalation

The skill runs autonomously but MUST stop for genuine blockers.

### What Is a Blocker?

A blocker is a condition where:
1. You cannot proceed without user input/clarification
2. Automated fix attempts have failed multiple times (flummoxed)
3. External dependencies are missing and cannot be auto-installed

### Blocker Categories

#### 1. Unclear Requirements (IMMEDIATE ESCALATION)

**When to escalate:**
- Task description is ambiguous or contradictory
- Acceptance criteria missing or unclear
- Implementation approach not specified and multiple valid options exist
- Specification references non-existent files or components

**Example:**
```
Task: "Add rate limiting to API"

Blocker: Rate limit threshold not specified in requirements.

Question for user:
- What should the rate limit be? (requests per minute)
- Should it be configurable or hardcoded?
- Per-user or per-IP?
```

**Do NOT guess or make assumptions. Stop and ask.**

#### 2. Flummoxed Agents (ESCALATION AFTER 2 ATTEMPTS)

**Detection:** Fix subagent fails 2x on same issue

**When this happens:**
- Attempt 1: Fix subagent tries to fix issue
- Attempt 2: Fresh fix subagent with "start from scratch" approach
- Attempt 3: ESCALATE (we're flummoxed)

**Example:**
```
Critical issue: "Tests fail in parseUser() - null reference error"

Fix attempt 1: Add null check → Tests still fail (different error)
Fix attempt 2: Rewrite function → Tests still fail (same error)

Escalation:
BLOCKER: Unable to fix test failures after 2 attempts

[Include: Issue description, both fix attempts, current error output]

I'm flummoxed. Need your help to identify root cause.
```

**Why 2 attempts?**
- First attempt catches simple mistakes
- Second attempt (fresh context) catches approach problems
- Third attempt = pattern of failure, human needed

#### 3. Missing Dependencies (ESCALATION IF CANNOT AUTO-INSTALL)

**When to auto-handle:**
- npm/pip/gem packages can be installed via package manager
- Files can be created from templates
- Configuration can be inferred from existing patterns

**When to escalate:**
- External service/API not available (need credentials, setup)
- Library requires manual installation (complex setup)
- Dependency not found in package registry (typo or private package?)

**Example auto-handle:**
```
Task requires `zod` package

Auto-handle:
1. Check package.json → not installed
2. Run: npm install zod
3. Continue with task
```

**Example escalation:**
```
Task requires `@company/internal-auth` package

Issue: Package not found in npm registry

Blocker: This appears to be a private package. I need:
- Package registry configuration
- Authentication credentials
- Or alternative public package to use
```

#### 4. Test Failures After Fixes (ESCALATION AFTER 2 ATTEMPTS)

Handled same as Flummoxed Agents - auto-fix with 2-attempt limit.

**NOT blockers (handle automatically):**
- First test failure → dispatch fix subagent
- Linting errors → dispatch fix subagent
- Type errors → dispatch fix subagent

#### 5. Git Conflicts (ESCALATION)

**When to escalate:**
- Merge conflicts when pulling latest
- Rebase conflicts during worktree work
- Conflicts that cannot be auto-resolved

**Do not attempt to auto-resolve conflicts** - too risky.

### Escalation Template

When escalating, use this format:

```markdown
🛑 BLOCKER: [Short description]

## Issue

[Detailed explanation of what blocked execution]

## Context

Task: [N] - [title]
Scope: [spec/plan/issue reference]

## What I Tried

[If applicable: attempts made and why they failed]

## What I Need

[Specific question or input needed to proceed]

## Current State

[Git status, test output, error messages - evidence]
```

### Non-Blockers (Continue Autonomously)

**Do NOT stop for:**

✅ Test failures (first occurrence) → Auto-fix
✅ Code review feedback (Critical/Important) → Auto-fix (2 attempts)
✅ Linting/type errors → Auto-fix
✅ Task completion → Continue to next task
✅ Batch boundaries → No artificial checkpoints
✅ Warnings (non-breaking) → Document, continue
✅ Minor code review issues → Document, continue
✅ Missing nice-to-have features → Continue (out of scope)

**The goal is autonomous execution. Only stop when truly blocked.**

### Decision Flowchart

```
Issue encountered
  ├─ Can I fix it automatically? (fix subagent)
  │  ├─ First attempt successful? → Continue
  │  ├─ Second attempt successful? → Continue
  │  └─ Both attempts failed? → ESCALATE (flummoxed)
  │
  ├─ Is it unclear requirements?
  │  └─ → ESCALATE (immediate, don't guess)
  │
  ├─ Is it missing dependency?
  │  ├─ Can auto-install (npm/pip)? → Install, continue
  │  └─ Cannot auto-install? → ESCALATE
  │
  ├─ Is it git conflict?
  │  └─ → ESCALATE (don't auto-resolve)
  │
  └─ Is it just a warning/minor issue?
     └─ → Document, continue
```

## Final Verification & Completion

After all tasks complete, verify entire implementation before presenting to user.

### Verification Phase

#### 1. Run Full Test Suite

Execute complete test suite to verify no regressions:

```bash
# Run all tests (adjust command for project's test framework)
npm test  # or: pytest, cargo test, go test, etc.
```

**Capture:**
- Total tests run
- Pass/fail counts
- Execution time
- Any warnings or errors

**Expected:** All tests pass, exit code 0

**If tests fail:**
1. Check if failures are in newly implemented code → Dispatch fix subagent
2. Check if failures are regressions → Dispatch fix subagent
3. If fix fails after 2 attempts → ESCALATE (blocker)

**Do NOT proceed to completion if tests failing.**

#### 2. Verify Requirements Met

Re-read original scope (specification/plan/issues) and create checklist:

```markdown
## Requirements Verification

Scope: [spec/plan/issues reference]

### Requirements Checklist

From original scope:
- [ ] Requirement 1: [description]
  → Implemented in: [files]
  → Verified by: [tests]

- [ ] Requirement 2: [description]
  → Implemented in: [files]
  → Verified by: [tests]

...

Status: [X/Y] requirements met
```

**Check each requirement:**
- ✅ Code exists for this requirement
- ✅ Tests exist for this requirement
- ✅ Tests pass for this requirement

**If any requirement not met:**
→ STOP - This is a gap in implementation
→ ESCALATE to user: "Requirement [X] not fully implemented"

#### 3. Aggregate TDD Compliance Certifications

Collect TDD Compliance Certifications from all implementation subagents:

```markdown
## TDD Compliance Summary

[Aggregate all certification tables from subagent reports]

### Task 1: [title]
| Function | Test File | Watched Fail? | Watched Pass? | Notes |
|----------|-----------|---------------|---------------|-------|
| funcA    | test.ts:5 | YES           | YES           | ✓     |
| funcB    | test.ts:12| YES           | YES           | ✓     |

### Task 2: [title]
| Function | Test File | Watched Fail? | Watched Pass? | Notes |
|----------|-----------|---------------|---------------|-------|
| funcC    | test.ts:20| YES           | YES           | ✓     |

...

### Summary
- Total functions: [N]
- Followed RED-GREEN-REFACTOR: [N/N]
- Deviations: [list any "NO" entries with justification]
```

**Verify:**
- Every new function has certification entry
- No missing certifications (subagents provided complete reports)
- Any "NO" entries are justified with valid reason

#### 4. Code Review Summary

Aggregate all code review feedback across tasks:

```markdown
## Code Review Summary

### Reviews Completed: [N]

### Issues Found and Fixed
- Critical: [N] found, [N] fixed
- Important: [N] found, [N] fixed
- Minor: [N] found, [N] deferred

### Outstanding Minor Issues
[List any Minor issues documented but not fixed]

### Assessment
All Critical and Important issues resolved ✓
Ready for merge/PR
```

#### 5. Git Status Check

Verify working directory is clean:

```bash
git status
```

**Expected:**
- All changes committed (working tree clean)
- No uncommitted changes
- On correct branch

**If uncommitted changes exist:**
→ Review what's uncommitted
→ If valid work: Commit it
→ If accidental: Clean up

### Completion Presentation

Present comprehensive summary to user:

```markdown
## ✅ Implementation Complete

### Summary
Implemented [N] tasks from [scope]:

**Tasks Completed:**
1. Task 1: [title] ✓
2. Task 2: [title] ✓
...

**Duration:** [time estimate if tracked]

### Verification Results

✅ **Tests:** [X/X] passing
✅ **Requirements:** [Y/Y] met
✅ **TDD Compliance:** [Z] functions, all certified
✅ **Code Reviews:** [N] completed, 0 Critical, 0 Important, [M] Minor deferred
✅ **Git Status:** Working tree clean, all changes committed

### Files Changed
- [file1] (modified, +X/-Y lines)
- [file2] (new, +X lines)
- [file3] (modified, +X/-Y lines)
...

### TDD Compliance Summary
[Show aggregate certification - see Step 3 above]

### Code Review Summary
[Show aggregate reviews - see Step 4 above]

### Outstanding Items
[If any Minor issues deferred, list here]

---

Ready for next steps.
```

### Integration with Finishing-a-Development-Branch

After presenting summary, automatically invoke skill:

```markdown
I'm using the finishing-a-development-branch skill to present completion options.
```

**Use Skill tool:** `finishing-a-development-branch`

That skill will:
1. Verify tests pass (redundant check, but ensures compliance)
2. Present options:
   - Merge to main
   - Create pull request
   - Continue working
   - Discard changes
3. Execute user's choice

**Do NOT duplicate finishing-a-development-branch logic** - just invoke it.

### Verification Example

```
All 7 tasks complete

FINAL VERIFICATION:

1. Run test suite:
   → npm test
   → 147 tests, 147 passing, 0 failing ✓

2. Check requirements:
   → Requirement 1: JWT auth ✓ (implemented in auth.ts, tested in auth.test.ts)
   → Requirement 2: Token refresh ✓ (implemented in tokens.ts, tested in tokens.test.ts)
   → Requirement 3: Rate limiting ✓ (implemented in middleware.ts, tested in middleware.test.ts)
   → Status: 3/3 met ✓

3. TDD Compliance:
   → 12 functions implemented
   → 12/12 followed RED-GREEN-REFACTOR
   → 0 deviations ✓

4. Code Reviews:
   → 7 reviews completed
   → 2 Critical found, 2 fixed ✓
   → 3 Important found, 3 fixed ✓
   → 5 Minor found, 5 deferred (documented)

5. Git status:
   → Working tree clean ✓

PRESENT SUMMARY TO USER + INVOKE finishing-a-development-branch
```

## Examples

### Example 1: Implementing a Specification

```
User: /wrangler:implementing-features spec-auth-system.md

SCOPE PARSING:
→ Detected: Specification file
→ Load from: .wrangler/specifications/spec-auth-system.md
→ Extract: Linked issues via MCP (project: "spec-auth-system")
→ Found: 5 tasks

SETUP:
→ Create TodoWrite with 5 tasks
→ Working directory: /Users/user/project (main branch)
→ Check dependencies: Task 2 depends on Task 1, rest independent

EXECUTION:

Task 1: Implement JWT token generation
→ Dispatch implementation subagent
  → Subagent: Follows TDD (RED-GREEN-REFACTOR)
  → Subagent: Provides certification, commits work
  → Report: Implemented, 8 tests passing, certification included
→ Dispatch code-reviewer subagent
  → Review: 1 Important issue (missing token expiry validation)
→ Dispatch fix subagent (attempt 1)
  → Fix: Added expiry validation, tests pass ✓
→ Mark Task 1 complete
→ Update dependencies: Task 2 now ready

Task 2: Implement token refresh endpoint (depends on Task 1)
→ Dispatch implementation subagent
  → Subagent: TDD, certification, commit
  → Report: Implemented, 6 tests passing
→ Dispatch code-reviewer subagent
  → Review: Approved, no issues ✓
→ Mark Task 2 complete

Task 3: Add rate limiting middleware
→ Dispatch implementation subagent
  → Subagent: Reports blocker - "Rate limit threshold not specified"
→ ESCALATE to user:

  🛑 BLOCKER: Unclear Requirements

  Task 3 requires rate limit threshold, but spec doesn't specify:
  - Requests per minute?
  - Per-user or per-IP?
  - Configurable or hardcoded?

  Please clarify before I can proceed.

[USER provides: "100 req/min, per-user, hardcoded for now"]

→ Re-dispatch implementation subagent with clarification
  → Subagent: Implements with 100/min hardcoded, TDD, commit
  → Report: Implemented, 5 tests passing
→ Dispatch code-reviewer subagent
  → Review: Approved ✓
→ Mark Task 3 complete

Task 4: Implement user authentication flow
→ [Execute normally, no issues]

Task 5: Add authentication middleware
→ [Execute normally, no issues]

FINAL VERIFICATION:
→ Run: npm test
  → 42 tests, 42 passing ✓
→ Check requirements: 5/5 met ✓
→ TDD compliance: 18 functions, all certified ✓
→ Code reviews: 5 completed, 0 Critical, 1 Important (fixed), 3 Minor (deferred)
→ Git status: Clean ✓

COMPLETION:
✅ Implementation Complete

Summary: Implemented 5 tasks from spec-auth-system.md
Tests: 42/42 passing
Requirements: 5/5 met
TDD Compliance: 18 functions certified

Ready for next steps.

→ Invoke finishing-a-development-branch skill
```

### Example 2: Implementing an Issue Range

```
User: /wrangler:implementing-features issues 10-12

SCOPE PARSING:
→ Detected: Issue range
→ Load via MCP: issues_list with filter [10, 11, 12]
→ Found: 3 issues

EXECUTION:
→ Issue 10: Refactor parseUser function [executes normally]
→ Issue 11: Add input validation [executes normally]
→ Issue 12: Fix memory leak in cache
  → Implementation: Subagent tries to fix
  → Code review: Critical issue (fix incomplete, tests still fail)
  → Fix attempt 1: Subagent tries different approach → tests still fail
  → Fix attempt 2: Fresh subagent, start from scratch → tests still fail
  → ESCALATE (flummoxed after 2 attempts)

COMPLETION:
Issues 10-11 complete, Issue 12 blocked (escalated to user)
```

### Example 3: Context Inference

```
User: Here's the plan file for the refactor (attached plan-db-refactor.md)
User: /wrangler:implementing-features

SCOPE PARSING:
→ No scope parameter provided
→ Scan last 5 messages
→ Found: "plan-db-refactor.md" in previous message
→ Load from: plans/plan-db-refactor.md
→ Extract: Task list from plan

EXECUTION:
→ [Proceeds with tasks from plan file]
```

## Red Flags - Anti-Patterns to Avoid

If you catch yourself doing any of these, STOP - you're using the skill incorrectly:

**❌ Stopping to ask "should I continue?" after each task**
- This defeats autonomous execution
- Only stop for genuine blockers (unclear requirements, flummoxed agents)
- The skill is designed to run all tasks without checkpoints

**❌ Guessing or making assumptions about unclear requirements**
- If requirements are ambiguous, ESCALATE immediately
- Don't implementing-features based on "probably what they meant"
- User clarification is better than wrong implementation

**❌ Proceeding with failing tests "to check with user later"**
- Tests MUST pass before moving to next task
- Use fix subagents (2 attempts) then escalate if can't fix
- Never leave broken tests

**❌ Skipping code review between tasks**
- Code review is mandatory after every task
- Catches issues early when they're cheap to fix
- No shortcuts

**❌ Manually fixing code review issues instead of using fix subagent**
- Use subagents for fixes (maintains fresh context)
- Manual fixes pollute context and skip TDD
- Only exception: trivial typos (but still prefer subagent)

**❌ Not collecting TDD Compliance Certifications from subagents**
- Every implementation subagent must provide certification
- If missing, request it before proceeding to code review
- Certification is proof TDD was followed

**❌ Creating artificial batch boundaries**
- No "complete 3 tasks then stop" logic
- Execute ALL tasks in scope continuously
- Dependencies may create natural pauses (that's fine)

**❌ Proceeding with unresolved Critical/Important code review issues**
- Critical: MUST be 0 before next task
- Important: MUST be 0 before next task
- Auto-fix (2 attempts) then escalate if can't resolve

**❌ Invoking this skill for exploration or understanding code**
- This skill is for implementation only
- For exploration: use locating-code or analyzing-implementations
- For questions: just answer directly

## Integration with Other Skills

**Required sub-skills** (must be available):
- `practicing-tdd` - Subagents follow TDD for implementation
- `verifying-before-completion` - Final verification checklist
- `requesting-reviewing-code` - Code review template for reviewer subagents
- `finishing-a-development-branch` - Present completion options

**Optional but recommended:**
- `using-git-worktrees` - If user wants isolated environment
- `debugging-systematically` - If complex bugs encountered during implementation

**Replaced by this skill** (deprecated):
- `executing-plans` - Old batch execution model (DELETE)
- `subagent-driven-development` - Old same-session execution (DELETE)

**When to use this skill vs. alternatives:**
- Use `implementing-features` for: Full execution of specs/plans/issues
- Use `writing-plans` for: Creating implementation plans (before executing)
- Use `brainstorming` for: Refining ideas (before planning)
- Use manual execution for: User wants control over each step (rare)

## Troubleshooting

**"Cannot infer scope" error:**
→ Provide explicit scope: `/wrangler:implementing-features spec-name.md`
→ Or reference file in message before running command

**Subagent not providing TDD Compliance Certification:**
→ Request it explicitly: "Please provide TDD Compliance Certification"
→ Template is in practicing-tdd skill

**Code review taking too long:**
→ Check task size - should be <250 LOC per task
→ Consider breaking large tasks into smaller ones
→ Review may be thorough, be patient

**Stuck in fix-retry loop:**
→ Should escalate after 2 attempts automatically
→ If not, manually escalate with blocker details
→ Fresh perspective (user or different approach) needed

**Tests passing locally but failing in CI:**
→ This skill verifies local tests only
→ CI failures need separate investigation
→ May need environment-specific configuration

**Dependencies not resolving correctly:**
→ Check dependency IDs match task IDs
→ Verify no circular dependencies (A→B→C→A)
→ Manual dependency graph may help visualize
