---
id: 000029
title: 'Task 3: Add code review automation to implement skill'
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - documentation
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:15.455Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: 000028
  estimatedEffort: 35 minutes
---
## Description

Add the automatic code review section to the implement skill. This section defines how code-reviewer subagents are dispatched after each task, how feedback is parsed, and how fix subagents are automatically dispatched with retry logic.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

This is the key differentiator from manual execution - automatic code review with auto-fix for Critical and Important issues, with retry logic and escalation when fixes fail.

Critical design decision: **Auto-fix with 2-attempt limit**
- Attempt 1: Dispatch fix subagent with specific instructions
- Attempt 2: Fresh fix subagent with "start from scratch" instruction
- Attempt 3+: ESCALATE (flummoxed detected)

## Files

- Modify: `skills/implement/SKILL.md` (add code review automation after task executor)

## Implementation Steps

**Step 1: Read existing file to verify structure**

```bash
grep "## Task Executor Workflow" skills/implement/SKILL.md
```

Expected: Section exists (from previous task)

**Step 2: Add code review automation section**

Append to `skills/implement/SKILL.md` after task executor section:

```markdown

## Code Review Automation

After each task's implementation subagent completes, automatically request and handle code review.

### Step 1: Dispatch Code Reviewer

Use the Task tool with requesting-code-review template:

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

  Follow the code-review skill framework:

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

  See requesting-code-review skill for full template.
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

     Start from scratch. Analyze the problem fresh and implement a different approach.

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

```

**Step 3: Verify section structure**

```bash
grep -E "^## |^### " skills/implement/SKILL.md
```

Expected output includes:
```
## Code Review Automation
### Step 1: Dispatch Code Reviewer
### Step 2: Parse Review Feedback
### Step 3: Handle Critical Issues (AUTO-FIX)
### Step 4: Handle Important Issues (AUTO-FIX)
### Step 5: Handle Minor Issues (DOCUMENT)
### Step 6: Verify All Critical/Important Fixed
```

**Step 4: Verify retry logic documented**

```bash
grep -A 3 "Second fix attempt" skills/implement/SKILL.md
```

Expected: Found with "start from scratch" instruction

**Step 5: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add automatic code review with retry logic

- Add code reviewer dispatch after each task
- Add review feedback parsing (Critical/Important/Minor)
- Add auto-fix for Critical and Important issues
- Add 2-attempt retry logic with escalation
- Add Minor issue documentation (no auto-fix)
- Add integration with task executor workflow
- Include auto-fix retry example

Part of unified implement skill
"
```

## Acceptance Criteria

- [ ] Code review automation section added after task executor
- [ ] Code reviewer dispatch documented with prompt template
- [ ] Review feedback parsing documented with TypeScript interface
- [ ] Critical issue handling documented (auto-fix, 2 attempts, escalate)
- [ ] Important issue handling documented (same as Critical)
- [ ] Minor issue handling documented (document only, no fix)
- [ ] Retry logic clearly explained with escalation on failure
- [ ] Auto-fix retry example provided
- [ ] Integration with task executor explained
- [ ] Section flows naturally from task executor section
- [ ] Committed with descriptive message

## Dependencies

- Requires completion of: Task 000028 (task executor workflow must exist)
