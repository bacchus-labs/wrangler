# Skill Invocation Patterns

> Last Updated: 2026-02-17 | Version: 1.2.0

This document maps common task patterns to the skills that should be invoked. Use this to validate whether appropriate skills were used during a session.

**Purpose**: Enable compliance validation - did the agent use the right skills for the task?

---

## Always-Required Skills

These skills are **MANDATORY** for specific activities and should NEVER be skipped:

### test-driven-development

**Always required when**:
- Implementing new features
- Fixing bugs
- Changing behavior
- Refactoring code

**Exception scenarios** (ask user first):
- Throwaway prototypes
- Generated code
- Configuration files

**Detection patterns**:
- Keywords: "implement", "add feature", "fix bug", "change", "refactor"
- File operations: Creating/modifying `.ts`, `.js`, `.py`, `.rs`, `.go` files
- Behavior changes: Modifying functions, classes, modules

**Compliance check**:
- Were tests written FIRST?
- Was RED phase verified (test failed)?
- Was GREEN phase verified (test passed)?
- Was TDD Compliance Certification provided?

---

### verification-before-completion

**Always required when**:
- Making ANY completion claim
- Making ANY success claim
- Expressing ANY satisfaction ("Great!", "Done!", "Perfect!")
- About to commit/push/PR
- About to move to next task

**Detection patterns**:
- Keywords: "complete", "done", "finished", "ready", "works", "passes", "succeeds"
- Positive language: "great", "perfect", "good to go"
- Action verbs: "commit", "merge", "deploy", "ship"

**Compliance check**:
- Was verification command run FRESH?
- Was COMPLETE output provided?
- Were TDD compliance requirements met?
- Was code review obtained?
- Were all requirements verified?

---

### requesting-code-review

**Always required when**:
- Completing ANY code change
- Before committing code changes
- Before creating pull request
- Before claiming task complete

**Exceptions** (ONLY these 3):
1. Pure documentation (*.md in docs/ only, ZERO code)
2. Configuration-only (dependency updates, NO logic)
3. Emergency hotfix (production down, MUST review within 24h)

**Detection patterns**:
- File changes: Any `.ts`, `.js`, `.py`, `.rs`, `.go`, etc.
- Code modifications: Functions, classes, logic changes
- Feature implementation: New capabilities added
- Bug fixes: Behavior corrections

**Compliance check**:
- Was code-review skill invoked?
- Was review completed?
- Were Critical issues: 0?
- Were Important issues: 0 OR converted to tracked issues?
- Was review status: Approved?

---

## Context-Triggered Skills

These skills should trigger based on specific contexts:

### dispatching-parallel-agents

**Triggers when**:
- 3+ test files failing with different root causes
- 3+ independent bugs identified
- Multiple subsystems broken independently
- Complex implementation with 10+ independent tasks

**Prerequisites**:
- Failures are logically independent (different root causes)
- Investigation is parallel-safe (no shared state conflicts)
  OR dispatch for investigation only, fix sequentially

**Detection patterns**:
- Multiple test file failures across different features
- Multiple bug reports for different subsystems
- Large implementation plans with independent modules

**Compliance check**:
- Were failures verified as independent?
- Was parallel safety checked?
- Were focused agent prompts created?
- Were agent results verified independently?

---

### writing-plans

**Triggers when**:
- Design is complete, need implementation tasks
- Specification exists, need breakdown
- Complex feature requires task organization
- User asks for implementation plan

**Detection patterns**:
- Keywords: "plan", "break down", "tasks", "implementation steps"
- After specification creation
- Before complex implementation

**Compliance check**:
- Were MCP issues created for each task?
- Do issues contain complete code examples?
- Do issues include all 5 TDD steps?
- Is optional plan file created if needed (10+ tasks, multiple components)?
- Do issues reference specification?

---

### check-constitutional-alignment

**Triggers when**:
- User proposes new feature
- Before creating specification
- During roadmap discussions
- Reviewing significant changes
- When uncertain if feature fits project

**Detection patterns**:
- Keywords: "should we", "what about", "new feature idea"
- Feature proposals
- Scope discussions
- Architecture debates

**Compliance check**:
- Was constitution read?
- Were all decision framework questions answered?
- Was clear decision rendered (APPROVED/REVISE/REJECT)?
- Was reasoning provided for each principle?

---

### systematic-debugging

**Triggers when**:
- Bug exists but root cause unknown
- Multiple related failures (same root cause)
- Test failures are cascading
- Need to understand system behavior

**Prerequisites**:
- Bug is reproducible
- Failures are related (NOT independent)

**Detection patterns**:
- Keywords: "bug", "broken", "failing", "error", "crash"
- Test failures with unknown cause
- Unexpected behavior

**Compliance check**:
- Was hypothesis formed?
- Was hypothesis tested?
- Was root cause identified?
- Was fix minimal?
- Was regression test added?

---

## Task Pattern → Skill Mapping

### Pattern: Implementing New Feature

**Task indicators**:
- "Add X feature"
- "Implement Y functionality"
- "Create new Z component"

**Required skills (in order)**:
1. `checking-constitutional-alignment` - Verify feature aligns
2. `writing-specifications` - Document requirements (if complex)
3. `writing-plans` - Break into tasks (if multi-step)
4. `practicing-tdd` - Implement with TDD
5. `requesting-code-review` - Get review
6. `verifying-before-completion` - Verify complete

**Compliance checks**:
- Constitutional check performed?
- Specification created (if needed)?
- Plan with MCP issues created (if complex)?
- TDD followed for all code?
- Code review obtained?
- Verification completed?

---

### Pattern: Fixing Bug

**Task indicators**:
- "Fix X bug"
- "Resolve Y issue"
- "Correct Z behavior"

**Required skills (in order)**:
1. `debugging-systematically` - Find root cause (if unknown)
2. `practicing-tdd` - Write failing test, fix, verify
3. `requesting-code-review` - Get review
4. `verifying-before-completion` - Verify complete

**Compliance checks**:
- Root cause identified?
- Regression test written FIRST?
- Test failed before fix?
- Test passed after fix?
- Code review obtained?
- Verification completed?

---

### Pattern: Refactoring Code

**Task indicators**:
- "Refactor X"
- "Clean up Y"
- "Reorganize Z"

**Required skills (in order)**:
1. `practicing-tdd` - Ensure tests exist, keep green
2. `requesting-code-review` - Get review
3. `verifying-before-completion` - Verify complete

**Compliance checks**:
- Tests existed before refactor?
- Tests stayed green throughout?
- No behavior changes?
- Code review obtained?
- Verification completed?

---

### Pattern: Multiple Test Failures

**Task indicators**:
- "X tests are failing"
- "Several failures in test suite"
- "Multiple bugs found"

**Decision tree**:

```
Are failures independent?
├─ YES → Are they parallel-safe?
│         ├─ YES → dispatching-parallel-agents
│         └─ NO → dispatching-parallel-agents (investigation only)
│                  + sequential fixes
└─ NO → systematic-debugging (find common root cause)
```

**Compliance checks**:
- Independence verified?
- Parallel safety checked?
- If parallel: focused agent prompts created?
- If serial: root cause identified first?

---

### Pattern: Complex Implementation

**Task indicators**:
- "Build X system"
- "Implement Y architecture"
- Large feature with multiple components

**Required skills (in order)**:
1. `checking-constitutional-alignment` - Verify alignment
2. `writing-specifications` - Document requirements
3. `writing-plans` - Break into tasks
4. For each task:
   - `practicing-tdd` - Implement
   - `requesting-code-review` - Review
5. `verifying-before-completion` - Final verification

**Compliance checks**:
- Constitutional check performed?
- Specification created?
- Plan with MCP issues created?
- Each task followed TDD?
- Each task reviewed?
- Final verification performed?

---

### Pattern: Frontend Development

**Task indicators**:
- "Add UI for X"
- "Create component Y"
- "Build page Z"

**Required skills (in order)**:
1. `designing-frontends` - Design mockups/wireframes
2. `practicing-tdd` - Implement with tests
3. `requesting-code-review` - Get review
4. `verifying-before-completion` - Including frontend checklist:
   - Visual verification (DevTools, screenshots)
   - Console verification (0 errors)
   - Network verification (expected requests)
   - Accessibility verification (axe-core, keyboard nav)
   - Interaction verification (all states tested)

**Compliance checks**:
- Design created first?
- Component tests written first?
- All frontend verification items completed?
- Screenshots provided?
- Accessibility verified?
- Code review obtained?

---

## Keyword → Skill Mapping

### Implementation Keywords

| Keyword | Primary Skill | Supporting Skills |
|---------|---------------|-------------------|
| "implement" | test-driven-development | writing-plans (if complex) |
| "add feature" | test-driven-development | check-constitutional-alignment, writing-specifications |
| "create" | test-driven-development | - |
| "build" | writing-plans | test-driven-development, requesting-code-review |

### Debugging Keywords

| Keyword | Primary Skill | Supporting Skills |
|---------|---------------|-------------------|
| "bug" | systematic-debugging | test-driven-development (for regression test) |
| "fix" | systematic-debugging | test-driven-development |
| "broken" | systematic-debugging | - |
| "failing" | systematic-debugging | dispatching-parallel-agents (if 3+ independent) |
| "error" | systematic-debugging | - |

### Planning Keywords

| Keyword | Primary Skill | Supporting Skills |
|---------|---------------|-------------------|
| "plan" | writing-plans | writing-specifications |
| "break down" | writing-plans | - |
| "organize tasks" | writing-plans | - |
| "implementation steps" | writing-plans | - |

### Verification Keywords

| Keyword | Primary Skill | Supporting Skills |
|---------|---------------|-------------------|
| "done" | verification-before-completion | - |
| "complete" | verification-before-completion | requesting-code-review |
| "finished" | verification-before-completion | requesting-code-review |
| "ready" | verification-before-completion | requesting-code-review |
| "works" | verification-before-completion | - |

### Review Keywords

| Keyword | Primary Skill | Supporting Skills |
|---------|---------------|-------------------|
| "review" | requesting-code-review | code-review (as subagent) |
| "ready to merge" | requesting-code-review | verification-before-completion |
| "ready for PR" | requesting-code-review | verification-before-completion |

---

## File Pattern → Skill Mapping

### Code Files Created/Modified

**Patterns**:
- `*.ts`, `*.js`, `*.tsx`, `*.jsx`
- `*.py`
- `*.rs`
- `*.go`
- `*.java`, `*.kt`

**Triggers**:
1. `practicing-tdd` - ALWAYS
2. `requesting-code-review` - ALWAYS (except 3 exceptions)
3. `verifying-before-completion` - ALWAYS before completion claims

---

### Test Files Created/Modified

**Patterns**:
- `*.test.ts`, `*.spec.ts`
- `test_*.py`, `*_test.py`
- `*_test.rs`
- `*_test.go`
- `*Test.java`, `*Test.kt`

**Compliance checks**:
- Were test files created BEFORE implementation files?
- Do test files have corresponding implementation files?
- Were tests run and shown to fail (RED)?
- Were tests run and shown to pass (GREEN)?

---

### Specification Files

**Patterns**:
- `.wrangler/specifications/*.md`
- `specs/*.md`

**Triggers**:
1. `checking-constitutional-alignment` - BEFORE creation
2. `writing-plans` - AFTER creation

**Compliance checks**:
- Was constitutional check performed?
- Was plan created from specification?

---

### Configuration Files

**Patterns**:
- `package.json` (if adding scripts/logic)
- `tsconfig.json` (if changing compiler logic)
- `*.config.js`, `*.config.ts`
- CI/CD files (`.github/workflows/*.yml`)

**Triggers**:
- `requesting-code-review` - If logic changes
- Exception: Dependency updates only (no review needed)

**Compliance checks**:
- If logic changed: was code review obtained?
- If dependency only: documented as exception?

---

## Subagent Usage Patterns

### When Subagents Should Be Used

**Pattern 1: Code Review**
- Always dispatch `reviewing-code` subagent after code changes
- Never skip review (except 3 documented exceptions)

**Pattern 2: Parallel Investigation**
- Dispatch investigation subagents for 3+ independent failures
- Each subagent investigates one problem domain

**Pattern 3: Implementation**
- `/wrangler:implement` dispatches subagents for plan tasks
- Each subagent implements one task with TDD + review

**Compliance checks**:
- Were subagents actually dispatched?
- Were subagent results verified independently?
- Were subagent claims verified with evidence?

---

## Skill Announcement Verification

All skills MUST announce usage with:

```
🔧 Using Skill: [skill-name] | [purpose]
```

**Compliance check**:
- Search conversation for skill announcements
- Verify announcements match expected skills for task
- Flag missing announcements as violations

---

## Common Compliance Violations

### Violation: TDD Skipped

**Indicators**:
- Code files modified without corresponding test files
- Tests modified AFTER implementation files
- No RED/GREEN output shown
- No TDD Compliance Certification

**Severity**: Critical

---

### Violation: Verification Skipped

**Indicators**:
- Completion claims without command output
- Success claims without evidence
- Paraphrased results instead of raw output
- Partial/truncated output shown

**Severity**: High

---

### Violation: Code Review Skipped

**Indicators**:
- Code changes committed without review
- No code-review skill invocation
- Exception claimed without documentation
- Proceeding with unfixed Critical/Important issues

**Severity**: High

---

### Violation: Constitutional Check Skipped

**Indicators**:
- New feature specification without alignment check
- Feature discussion without constitution reference
- No decision framework answers

**Severity**: Medium

---

### Violation: Subagent Not Used

**Indicators**:
- 3+ independent failures investigated sequentially
- Code changes without code review subagent
- Complex plan without implementation subagents

**Severity**: Medium

---

## Validation Workflow

To validate skill invocation compliance:

1. **Identify task type** from conversation
2. **Look up expected skills** in this document
3. **Search for skill announcements** in conversation
4. **Verify skill steps were followed** (check evidence)
5. **Flag violations** with severity and explanation
6. **Recommend corrections** for any violations

---

## Integration with Validation Command

The `/wrangler:validate-session-adherence` command uses this document to:

1. Parse conversation messages
2. Identify task patterns
3. Determine expected skills
4. Compare expected vs actual skill usage
5. Generate compliance report with violations

---

## References

- **Workflows**: `docs/workflows.md`
- **Verification Requirements**: `docs/verification-requirements.md`
- **Skills Directory**: `skills/`
- **TDD Skill**: `skills/practicing-tdd/SKILL.md`
- **Verification Skill**: `skills/verifying-before-completion/SKILL.md`
- **Code Review Skill**: `skills/reviewing-code/SKILL.md`

---

**Last Updated**: November 23, 2025
**Document Version**: 1.0.0
