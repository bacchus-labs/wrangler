---
name: implementing-issues
description: Autonomously implements issues (bugs, features, enhancements) from specs/plans/issues using subagents with TDD and code review. Use when executing implementation tasks that require systematic orchestration of development workflows.
---

# Implement

## Overview

Autonomous implementation workflow that handles specifications, plans, issue ranges, or standalone issues.

**Core principle:** Dispatch subagent per task, automatic code review and fixes, only stop for genuine blockers

**Entry point:** `/wrangler:implementing-issues [scope]`

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

The skill automatically determines what to implement based on your input.

### Supported Formats

**1. Specification files**
```bash
/wrangler:implementing-issues spec-auth-system.md
```
→ Loads spec from `.wrangler/specifications/`
→ Extracts linked MCP issues OR parses inline tasks
→ Executes all tasks sequentially

**2. Plan files**
```bash
/wrangler:implementing-issues plan-refactor.md
```
→ Loads plan from `.wrangler/plans/`
→ Extracts task list from plan
→ Executes all tasks sequentially

**3. Single issue**
```bash
/wrangler:implementing-issues issue #42
```
→ Loads issue from MCP using issues_get
→ Treats entire issue as single task

**4. Issue range**
```bash
/wrangler:implementing-issues issues 5-7
```
→ Loads multiple issues from MCP
→ Executes sequentially

**5. Context inference (no parameter)**
```bash
/wrangler:implementing-issues
```
→ Scans last 5 user messages for file or issue references

For detailed parsing algorithm, see `references/scope-parsing.md`.

## Core Workflow

### 1. Setup Phase

1. Create todo tracking for all tasks
2. Capture working directory and branch (see `references/working-directory-protocol.md`)
3. Build dependency graph

### 2. Execution Loop

For each task:

**a) Mark task in progress**

**b) Dispatch implementation subagent**

Use Task tool with full requirements, TDD instructions, and working directory protocol. Subagent must:
- Verify location first
- Follow TDD (RED-GREEN-REFACTOR)
- Provide TDD Compliance Certification
- Commit work
- Report results

See `references/subagent-prompts.md` for template.

**c) Verify subagent response**

Check for:
- ✅ Location verification output (MUST show "VERIFIED")
- ✅ Implementation summary
- ✅ Test results (all passing)
- ✅ TDD Compliance Certification
- ✅ Work committed

**d) Dispatch code reviewer**

Use requesting-code-review skill. Parse feedback and categorize issues as Critical/Important/Minor.

**e) Handle code review issues**

- **Critical/Important**: Auto-fix with up to 2 attempts, escalate if fails
- **Minor**: Document only, don't fix

See `references/code-review-automation.md` for details.

**f) Update dependencies**

Mark task complete, unblock dependent tasks.

### 3. Final Verification

After all tasks:
1. Run full test suite
2. Verify requirements met
3. Aggregate TDD compliance certifications
4. Aggregate code review summaries
5. Check git status (working tree clean)

See `references/verification-checklist.md`.

### 4. Completion

Present comprehensive summary and invoke `finishing-a-development-branch` skill.

## Blocker Detection & Escalation

Only stop for genuine blockers:

**Immediate escalation:**
- Unclear requirements (don't guess)
- Git conflicts (don't auto-resolve)

**Escalation after 2 fix attempts:**
- Flummoxed agents (can't fix issue)
- Test failures persisting
- Missing dependencies (can't auto-install)

**Non-blockers (continue autonomously):**
- First test failure → auto-fix
- Code review feedback → auto-fix (2 attempts)
- Warnings → document

See `references/blocker-detection.md` for flowchart and detailed criteria.

## Red Flags - Anti-Patterns to Avoid

❌ Stopping to ask "should I continue?" after each task
❌ Guessing about unclear requirements
❌ Proceeding with failing tests
❌ Skipping code review
❌ Creating artificial batch boundaries
❌ Manual fixes instead of using fix subagents

## Integration with Other Skills

**Required sub-skills:**
- `practicing-tdd` - Implementation TDD workflow
- `verifying-before-completion` - Final verification
- `requesting-code-review` - Code review template
- `finishing-a-development-branch` - Completion options

## Troubleshooting

**"Cannot infer scope" error:**
→ Provide explicit scope or reference file in message

**Subagent not providing TDD Compliance Certification:**
→ Request it explicitly using practicing-tdd template

**Stuck in fix-retry loop:**
→ Should auto-escalate after 2 attempts

**Dependencies not resolving:**
→ Check for circular dependencies or ID mismatches

## References

Detailed documentation in `references/` subdirectory:

- `scope-parsing.md` - Parsing algorithm and normalized task format
- `working-directory-protocol.md` - Location verification and command patterns
- `subagent-prompts.md` - Full subagent prompt templates
- `code-review-automation.md` - Detailed review handling process
- `verification-checklist.md` - Final verification steps
- `blocker-detection.md` - Decision flowchart and escalation criteria
- `examples.md` - Complete workflow examples

For workflow checklists, see `assets/workflow-checklist.md`.
