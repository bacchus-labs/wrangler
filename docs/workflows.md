# Wrangler Workflows

This document describes the major workflows that AI agents should follow when using wrangler. These workflows are encoded in skills and enforced through systematic processes.

## Core Workflows

### 1. Test-Driven Development (TDD) Workflow

**Skill**: `skills/practicing-tdd/SKILL.md`

**When**: Always when implementing features, fixing bugs, or changing behavior

**Required Steps**:

1. **RED Phase - Write Failing Test**
   - Write one minimal test for desired behavior
   - Test must be specific (one thing only)
   - Use clear, descriptive test name
   - Test real code, not mocks (unless unavoidable)

2. **Verify RED - Watch It Fail**
   - Execute test command and capture output
   - Verify failure reason matches expectation
   - Acceptable failures:
     - "ReferenceError: [function] is not defined"
     - "AssertionError: expected X to equal undefined"
   - Unacceptable failures:
     - Syntax errors
     - Test passes (didn't write failing test)
     - Wrong failure reason (test is broken)

3. **GREEN Phase - Minimal Implementation**
   - Write simplest code to pass the test
   - No extra features
   - No refactoring other code
   - Just enough to make test pass

4. **Verify GREEN - Watch It Pass**
   - Execute test command and capture output
   - Verify all tests pass (0 failures)
   - Verify clean output (no errors/warnings)
   - Verify exit code: 0

5. **REFACTOR Phase - Clean Up**
   - Remove duplication
   - Improve names
   - Extract helpers
   - Keep tests green throughout

**Evidence Requirements**:
- RED phase: Complete test output showing failure
- GREEN phase: Complete test output showing pass
- Both outputs must be provided in conversation
- Claims without evidence violate verification requirements

**Anti-Patterns** (See `avoiding-testing-anti-patterns` skill):
- Writing tests after implementation
- Tests passing immediately
- Claiming "followed TDD" without certification
- Vague about failure messages
- No test output shown

**TDD Compliance Certification**:

Before claiming work complete, provide certification:

```markdown
## TDD Compliance Certification

- [x] **Function name**: retryOperation
  - **Test name**: test_retries_failed_operations_3_times
  - **Watched fail**: YES
  - **Failure reason**: "ReferenceError: retryOperation is not defined"
  - **Implemented minimal code**: YES
  - **Watched pass**: YES
  - **Refactored**: YES (extracted delay logic)
```

---

### 2. Verification Before Completion Workflow

**Skill**: `skills/verifying-before-completion/SKILL.md`

**When**: Before ANY completion claim, success claim, or satisfaction expression

**The Gate Function**:

```
BEFORE claiming any status:

0. TDD COMPLIANCE: Followed test-driven-development?
   - Provide TDD Compliance Certification
   - If NO: Stop, delete code, restart with TDD

1. IDENTIFY: What command proves this claim?
2. RUN: Execute FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. CAPTURE: Copy complete output to message
5. VERIFY: Does output confirm claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
6. REQUIREMENTS: Verified all requirements?
7. TDD CERTIFIED: Certified TDD compliance?
8. CODE REVIEW: Obtained code review approval?
9. ONLY THEN: Make the claim
```

**Test Verification Requirements**:

When claiming tests pass, MUST provide:

1. **Exact command executed**:
   ```bash
   npm test
   # or pytest, cargo test, go test, etc.
   ```

2. **Complete output showing**:
   - Test count: "X tests passed"
   - Failure count: "0 failed"
   - Duration: "Time: X.XXXs"
   - Exit code: 0

3. **Coverage (if available)**:
   - Statement coverage: X%
   - Branch coverage: X%
   - Function coverage: X%

**Frontend Verification Checklist**:

For UI work (HTML/CSS/JSX/components), ALSO verify:

- [ ] Browser DevTools inspection (Elements panel)
- [ ] Responsive breakpoints tested (mobile, tablet, desktop)
- [ ] Screenshot taken for visual regression baseline
- [ ] Console verification: 0 errors, 0 warnings
- [ ] Network verification: Expected requests only, no failures
- [ ] Accessibility: axe-core 0 violations, keyboard nav works, Lighthouse ≥95
- [ ] UI states: loading, success, error, empty, partial

**Code Review Gate**:

Code review MANDATORY for ALL code changes. Exceptions:

1. Pure documentation (*.md in docs/ only)
2. Configuration-only (dependency updates, no logic)
3. Emergency hotfix (production down, must review within 24h)

Must verify:
- [ ] Code review requested and completed
- [ ] Critical issues: 0 (MUST be zero)
- [ ] Important issues: 0 OR converted to tracked issue
- [ ] Review status: Approved or Approved with minor items

---

### 3. Code Review Workflow

**Skills**:
- `skills/requesting-code-review/SKILL.md` (requester)
- `skills/reviewing-code/SKILL.md` (reviewer)

**When**: After implementing ANY code changes (see exceptions above)

**Requester Steps**:

1. **Prepare for Review**:
   - [ ] All tests passing
   - [ ] No errors or warnings
   - [ ] TDD followed (tests written first)
   - [ ] Requirements met
   - [ ] Evidence captured

2. **Provide Context**:
   - Completed tasks list
   - Requirements met (reference plan/spec)
   - Tests added count
   - TDD attestation
   - Files changed with summary

3. **Dispatch Reviewer**:
   - Use Task() to dispatch code-review subagent
   - Provide plan/spec and implementation details
   - Wait for review completion

4. **Process Review Results**:
   - Read review findings
   - Address Critical issues immediately
   - Address Important issues OR create tracked issues
   - Address Minor issues or defer with comment

**Reviewer Phases** (6 phases):

1. **Plan Alignment**: Implementation matches requirements?
2. **Code Quality**: Error handling, types, organization, maintainability
3. **Architecture**: SOLID principles, design patterns, integration
4. **Testing**: TDD compliance, test quality, coverage
5. **Security/Performance**: Vulnerabilities, bottlenecks
6. **Documentation**: Code comments, API docs, user docs

**Review Output Format**:

```markdown
# Code Review Report

## Summary
- Overall: APPROVED / APPROVED_WITH_ITEMS / CHANGES_REQUIRED
- Critical Issues: [count]
- Important Issues: [count]
- Minor Issues: [count]

## Critical Issues (MUST fix)
- [Issue description with specific location and fix]

## Important Issues (MUST fix or track)
- [Issue description with specific location and fix]

## Minor Issues (Optional)
- [Issue description]

## Recommendations
- [Suggestions for improvement]
```

---

### 4. Subagent Dispatch Workflow

**Skills**:
- `skills/dispatching-parallel-agents/SKILL.md`
- `skills/writing-plans/SKILL.md` (uses subagents via /wrangler:implement)

**When**: 3+ independent failures OR complex implementation with multiple tasks

**Prerequisites**:

1. **Failures Are Logically Independent**:
   - Each can be investigated without knowing about others
   - Different features, different root causes
   - Fix one doesn't fix others

2. **Investigation Is Parallel-Safe**:
   - Reading different source files
   - Examining different test files
   - No shared state/database conflicts
   - OR: Dispatch for investigation only, fix sequentially

**Decision Tree**:

```
Do you have 3+ failures?
├─ NO → Use systematic-debugging
└─ YES → Continue

Are failures logically independent?
├─ NO → Use systematic-debugging (find common root cause)
└─ YES → Continue

Is investigation parallel-safe?
├─ YES → Dispatch parallel agents
└─ NO → Dispatch for investigation only, fix sequentially
       OR set up isolated environments, then dispatch
```

**Agent Prompt Structure**:

Good agent prompts are:
1. **Focused**: One clear problem domain
2. **Self-contained**: All context needed
3. **Specific about output**: What to return

Example:
```markdown
Fix the 3 failing tests in src/auth/session.test.ts:

1. "should validate expired tokens" - expects error, gets success
2. "should refresh valid tokens" - timeout after 5s
3. "should handle concurrent refreshes" - race condition

Your task:
1. Read test file and understand each test
2. Identify root cause
3. Fix implementation or tests
4. Verify all tests pass

Return: Summary of findings and changes
```

**Review and Integration**:

After agents return:
1. Read each summary
2. Verify fixes don't conflict
3. Run full test suite
4. Integrate all changes

---

### 5. Implementation Planning Workflow

**Skill**: `skills/writing-plans/SKILL.md`

**When**: Design is complete, need detailed implementation tasks

**Process**:

1. **Read and Analyze Specification**:
   - Read spec file completely
   - Review existing codebase for patterns
   - Understand where new code should live
   - Consider architecture and design patterns

2. **Plan Task Breakdown**:
   - Break spec into logical tasks
   - Each task should be small (<250 LOC)
   - Tasks should build incrementally
   - Prepare complete details for each task:
     - Exact files to create/modify
     - Complete code examples for all 5 TDD steps
     - Test requirements
     - Exact commands and expected output
     - Commit message

3. **Create MCP Issues** (Source of Truth):
   - Use `issues_create` for each task
   - Include complete implementation details
   - Reference specification
   - Set project field to spec filename
   - Each issue contains:
     - Step 1: Write failing test (complete code)
     - Step 2: Verify test fails (command + expected output)
     - Step 3: Write minimal implementation (complete code)
     - Step 4: Verify test passes (command + expected output)
     - Step 5: Commit (exact command)
     - Acceptance criteria
     - Dependencies on other tasks

4. **Optionally Create Plan File** (Reference Only):
   - Create when: 10+ tasks, multiple components, significant design decisions
   - Contains: Architecture overview, design rationale, component relationships
   - References MCP issues, does NOT duplicate their content
   - Location: `.wrangler/plans/YYYY-MM-DD-PLAN_<spec>.md`

5. **Verify and Report**:
   - Use `issues_list` to verify all issues created
   - Review for gaps, duplicates, ordering
   - Adjust using `issues_update` if needed

**Execution Handoff**:

After creating issues, offer:

```markdown
Plan complete:
- Issues created: [N] tasks (project: [spec])
- Plan file (optional): `.wrangler/plans/YYYY-MM-DD-PLAN_<spec>.md`

Ready to implement? Use `/wrangler:implement`
```

---

### 6. Constitutional Alignment Workflow

**Skill**: `skills/checking-constitutional-alignment/SKILL.md`

**When**: Before creating specifications, during feature discussions, reviewing PRs, roadmap updates

**Process**:

1. **Read the Constitution**:
   - Load `.wrangler/governance/CONSTITUTION.md`
   - Extract: North Star, Core Principles, Decision Framework, Anti-patterns

2. **Understand the Proposal**:
   - Gather complete picture
   - Ask clarifying questions if needed
   - Document proposal summary

3. **Apply Decision Framework**:
   - Answer each framework question in detail
   - For each principle: ALIGNED / NEUTRAL / VIOLATES
   - Provide specific reasoning

4. **Render Decision**:
   - **APPROVED**: Fully aligned, proceed
   - **REVISE**: Partially aligned, needs modification
   - **REJECT**: Violates principles, find alternative

**Decision Framework Questions** (standard):

1. Does this align with our core principles?
2. Does this reduce or increase complexity?
3. Does this solve a real user problem?
4. Is this the simplest solution?
5. Does this violate any anti-patterns?

---

## Workflow Integration Patterns

### Pattern 1: Feature Implementation

```
1. Check constitutional alignment
   ↓ (APPROVED)
2. Create specification (writing-specifications skill)
   ↓
3. Create implementation plan (writing-plans skill)
   ↓ (Creates MCP issues)
4. For each issue:
   4a. Write failing test (TDD RED)
   4b. Verify fails (TDD Verify RED)
   4c. Implement minimal code (TDD GREEN)
   4d. Verify passes (TDD Verify GREEN)
   4e. Refactor if needed (TDD REFACTOR)
   4f. Request code review (requesting-code-review skill)
   4g. Address review findings
   4h. Commit changes
   ↓
5. Verify all requirements met (verification-before-completion)
6. Mark issue complete
```

### Pattern 2: Bug Fix

```
1. Write failing test that reproduces bug (TDD RED)
   ↓
2. Verify test fails with bug present (TDD Verify RED)
   ↓
3. Fix bug with minimal code change (TDD GREEN)
   ↓
4. Verify test passes (TDD Verify GREEN)
   ↓
5. Request code review (requesting-code-review skill)
   ↓
6. Address review findings
   ↓
7. Verify all tests pass (verification-before-completion)
   ↓
8. Commit with clear message
```

### Pattern 3: Multiple Independent Failures

```
1. Identify failures
   ↓
2. Check if independent (different root causes)
   ↓ (YES)
3. Check if parallel-safe (no shared state conflicts)
   ↓ (YES)
4. Dispatch parallel agents (dispatching-parallel-agents skill)
   ↓
5. Wait for agents to complete
   ↓
6. Review each agent's findings
   ↓
7. Verify fixes don't conflict
   ↓
8. Run full test suite
   ↓
9. Integrate all changes
```

### Pattern 4: Governance Check

```
1. User proposes new feature
   ↓
2. Run constitutional alignment check
   ↓
3. If APPROVED:
     Proceed with specification
   If REVISE:
     Modify proposal, re-check
   If REJECT:
     Explain reasoning, suggest alternatives
```

---

## Workflow Enforcement Mechanisms

### Automatic Triggers

Some workflows auto-trigger based on context:

- **TDD**: Always triggered when implementing features/fixes
- **Verification**: Always triggered before completion claims
- **Code Review**: Always triggered after code changes (except 3 exceptions)

### Skill Announcements

All skills MUST announce usage:

```
🔧 Using Skill: [skill-name] | [purpose]
```

This creates audit trail for validation.

### Evidence Requirements

Many workflows require evidence:
- TDD: Test output (RED and GREEN phases)
- Verification: Command output (tests, build, etc.)
- Code Review: Review report with findings

Claims without evidence violate verification-before-completion.

---

## Anti-Patterns and Violations

### TDD Violations

❌ Writing tests after implementation
❌ Tests passing immediately
❌ Claiming "followed TDD" without certification
❌ No test output shown
❌ Vague about failure messages

### Verification Violations

❌ Claiming "tests pass" without output
❌ Using "should", "probably", "seems to"
❌ Expressing satisfaction before verification
❌ Paraphrasing results instead of showing raw output
❌ Showing partial/truncated output

### Code Review Violations

❌ Skipping review because "it's simple"
❌ Planning to "get review later"
❌ Claiming exception without documentation
❌ Proceeding with unfixed Critical/Important issues

### Subagent Violations

❌ Dispatching for related failures (should find root cause)
❌ Vague agent prompts ("fix everything")
❌ No constraints (agent might refactor everything)
❌ Parallel dispatch when not parallel-safe

---

## Cross-References

- **TDD Details**: See `skills/practicing-tdd/SKILL.md`
- **Verification Details**: See `skills/verifying-before-completion/SKILL.md`
- **Code Review Details**: See `skills/reviewing-code/SKILL.md`
- **Subagent Details**: See `skills/dispatching-parallel-agents/SKILL.md`
- **Planning Details**: See `skills/writing-plans/SKILL.md`
- **Constitutional Checks**: See `skills/checking-constitutional-alignment/SKILL.md`
- **Testing Anti-Patterns**: See `skills/avoiding-testing-anti-patterns/SKILL.md`
- **Verification Requirements**: See `docs/verification-requirements.md`
- **Skill Invocation Patterns**: See `docs/skill-invocation-patterns.md`

---

**Last Updated**: November 23, 2025
**Document Version**: 1.0.0
