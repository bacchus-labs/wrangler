# Blocker Detection & Escalation

## What Is a Blocker?

A blocker is when:
1. Cannot proceed without user input/clarification
2. Automated fix attempts failed multiple times
3. External dependencies missing and cannot be auto-installed

## Blocker Categories

### 1. Unclear Requirements (IMMEDIATE ESCALATION)
- Task description ambiguous or contradictory
- Acceptance criteria missing
- Multiple valid implementation approaches

Do NOT guess. Stop and ask.

### 2. Flummoxed Agents (AFTER 2 ATTEMPTS)
- Fix subagent fails 2x on same issue
- Pattern of failure indicates need for human insight

### 3. Missing Dependencies (IF CANNOT AUTO-INSTALL)
- Can auto-install: npm/pip packages
- Must escalate: External services, private packages

### 4. Test Failures After Fixes (AFTER 2 ATTEMPTS)
Same as Flummoxed Agents.

### 5. Git Conflicts (IMMEDIATE ESCALATION)
Do not attempt to auto-resolve conflicts - too risky.

## Decision Flowchart

```
Issue encountered
  ├─ Can I fix it automatically? (fix subagent)
  │  ├─ First attempt successful? → Continue
  │  ├─ Second attempt successful? → Continue
  │  └─ Both attempts failed? → ESCALATE
  │
  ├─ Is it unclear requirements?
  │  └─ → ESCALATE (immediate, don't guess)
  │
  ├─ Is it missing dependency?
  │  ├─ Can auto-install? → Install, continue
  │  └─ Cannot auto-install? → ESCALATE
  │
  ├─ Is it git conflict?
  │  └─ → ESCALATE
  │
  └─ Is it just a warning/minor issue?
     └─ → Document, continue
```

## Escalation Template

```markdown
🛑 BLOCKER: [Short description]

## Issue
[Detailed explanation]

## Context
Task: [N] - [title]
Scope: [spec/plan/issue reference]

## What I Tried
[If applicable: attempts made]

## What I Need
[Specific question or input needed]

## Current State
[Git status, test output, error messages]
```
