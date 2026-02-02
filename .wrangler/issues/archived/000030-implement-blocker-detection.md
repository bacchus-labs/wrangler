---
id: '000030'
title: 'Task 4: Add blocker detection and escalation to implement skill'
type: issue
status: closed
priority: high
labels:
  - implementation
  - plan-step
  - documentation
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:16.043Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: 000029
  estimatedEffort: 20 minutes
---
## Description

Add the blocker detection section to the implement skill. This section defines what conditions warrant stopping execution and escalating to the user vs. what should be handled autonomously.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

Key design principle: **Autonomous execution means handling expected issues automatically, but stopping for genuine blockers.**

The skill must clearly differentiate between:
- **Auto-handle:** Test failures, code review issues (use fix subagents)
- **Escalate:** Unclear requirements, flummoxed agents, missing dependencies

This section prevents the skill from either:
1. Being too hesitant (stopping for every minor issue) ← current problem
2. Being too aggressive (plowing through blockers with guesses)

## Files

- Modify: `skills/implement/SKILL.md` (add blocker detection after code review automation)

## Implementation Steps

**Step 1: Read existing sections to verify structure**

```bash
grep "## Code Review Automation" skills/implement/SKILL.md
```

Expected: Section exists (from previous task)

**Step 2: Add blocker detection section**

Append to `skills/implement/SKILL.md` after code review automation:

```markdown

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

```

**Step 3: Verify blocker categories documented**

```bash
grep "#### " skills/implement/SKILL.md | grep -A 1 "Blocker"
```

Expected: All 5 blocker categories listed

**Step 4: Verify non-blocker list present**

```bash
grep -A 5 "Non-Blockers" skills/implement/SKILL.md
```

Expected: List of ✅ items that should NOT stop execution

**Step 5: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add blocker detection and escalation rules

- Define what constitutes a blocker vs. auto-fixable issue
- Document 5 blocker categories with examples
- Add escalation template for user communication
- Add decision flowchart for issue handling
- List non-blockers to prevent early stopping
- Emphasize autonomous execution principle

Part of unified implement skill
"
```

## Acceptance Criteria

- [ ] Blocker detection section added after code review automation
- [ ] "What Is a Blocker?" defined clearly
- [ ] 5 blocker categories documented with examples
- [ ] Each category explains when to escalate vs. auto-handle
- [ ] Escalation template provided for user communication
- [ ] Non-blockers list prevents early stopping
- [ ] Decision flowchart helps determine blocker vs. auto-fix
- [ ] 2-attempt limit for fixes clearly explained
- [ ] Examples show both auto-handle and escalation scenarios
- [ ] Section emphasizes autonomous execution principle
- [ ] Committed with descriptive message

## Dependencies

- Requires completion of: Task 000029 (code review automation must exist)
