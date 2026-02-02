---
id: '000033'
title: 'Task 7: Add examples and documentation to implement skill'
type: issue
status: closed
priority: medium
labels:
  - implementation
  - plan-step
  - documentation
createdAt: '2025-11-21T00:00:00.000Z'
updatedAt: '2026-02-02T21:54:17.485Z'
assignee: claude-code
project: implement-skill-unification
wranglerContext:
  agentId: implementation-agent
  parentTaskId: '000032'
  estimatedEffort: 30 minutes
---
## Description

Add comprehensive examples, red flags, and integration notes to the implement skill. This makes the skill easier to understand and follow by providing concrete scenarios and anti-patterns to avoid.

## Context

Reference: `plans/2025-11-21-PLAN_implement-skill.md`

Examples are critical for skill adoption. They show:
1. How scope parsing works in practice
2. Full autonomous execution flow
3. How blockers are detected and escalated
4. What successful completion looks like

Red flags prevent common mistakes (like stopping early).

## Files

- Modify: `skills/implement/SKILL.md` (add examples and red flags sections)

## Implementation Steps

**Step 1: Verify existing structure complete**

```bash
grep "^## " skills/implement/SKILL.md
```

Expected sections:
- Overview
- Scope Parsing
- Task Executor Workflow
- Code Review Automation
- Blocker Detection & Escalation
- Final Verification & Completion

**Step 2: Add comprehensive example section**

Append to `skills/implement/SKILL.md`:

```markdown

## Examples

### Example 1: Implementing a Specification

```
User: /wrangler:implement spec-auth-system.md

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
User: /wrangler:implement issues 10-12

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
User: /wrangler:implement

SCOPE PARSING:
→ No scope parameter provided
→ Scan last 5 messages
→ Found: "plan-db-refactor.md" in previous message
→ Load from: plans/plan-db-refactor.md
→ Extract: Task list from plan

EXECUTION:
→ [Proceeds with tasks from plan file]
```

```

**Step 3: Add red flags section**

Append after examples:

```markdown

## Red Flags - Anti-Patterns to Avoid

If you catch yourself doing any of these, STOP - you're using the skill incorrectly:

**❌ Stopping to ask "should I continue?" after each task**
- This defeats autonomous execution
- Only stop for genuine blockers (unclear requirements, flummoxed agents)
- The skill is designed to run all tasks without checkpoints

**❌ Guessing or making assumptions about unclear requirements**
- If requirements are ambiguous, ESCALATE immediately
- Don't implement based on "probably what they meant"
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

```

**Step 4: Add integration notes section**

Append after red flags:

```markdown

## Integration with Other Skills

**Required sub-skills** (must be available):
- `test-driven-development` - Subagents follow TDD for implementation
- `verification-before-completion` - Final verification checklist
- `requesting-code-review` - Code review template for reviewer subagents
- `finishing-a-development-branch` - Present completion options

**Optional but recommended:**
- `using-git-worktrees` - If user wants isolated environment
- `systematic-debugging` - If complex bugs encountered during implementation

**Replaced by this skill** (deprecated):
- `executing-plans` - Old batch execution model (DELETE)
- `subagent-driven-development` - Old same-session execution (DELETE)

**When to use this skill vs. alternatives:**
- Use `implement` for: Full execution of specs/plans/issues
- Use `writing-plans` for: Creating implementation plans (before executing)
- Use `brainstorming` for: Refining ideas (before planning)
- Use manual execution for: User wants control over each step (rare)

```

**Step 5: Add troubleshooting section**

Append after integration notes:

```markdown

## Troubleshooting

**"Cannot infer scope" error:**
→ Provide explicit scope: `/wrangler:implement spec-name.md`
→ Or reference file in message before running command

**Subagent not providing TDD Compliance Certification:**
→ Request it explicitly: "Please provide TDD Compliance Certification"
→ Template is in test-driven-development skill

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

```

**Step 6: Verify all sections added**

```bash
grep "^## " skills/implement/SKILL.md
```

Expected to include:
- Examples
- Red Flags - Anti-Patterns to Avoid
- Integration with Other Skills
- Troubleshooting

**Step 7: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add examples, red flags, and documentation

- Add 3 comprehensive examples (spec, issue range, context inference)
- Add red flags section with 9 anti-patterns to avoid
- Add integration notes (required skills, replacements)
- Add troubleshooting section for common issues
- Document full autonomous execution flow
- Show blocker detection and escalation in examples

Completes core implement skill documentation
"
```

## Acceptance Criteria

- [ ] Examples section added with 3 comprehensive scenarios
- [ ] Example 1 shows full spec implementation with blocker
- [ ] Example 2 shows issue range with flummoxed escalation
- [ ] Example 3 shows context inference
- [ ] Red flags section added with 9 anti-patterns
- [ ] Integration notes section documents required/optional skills
- [ ] Integration notes clarify when to use this vs. alternatives
- [ ] Troubleshooting section addresses common issues
- [ ] All sections flow naturally with existing content
- [ ] Examples demonstrate key concepts (autonomous, blockers, fixes)
- [ ] Committed with descriptive message

## Dependencies

- Requires completion of: Task 000032 (slash command should exist for examples)
