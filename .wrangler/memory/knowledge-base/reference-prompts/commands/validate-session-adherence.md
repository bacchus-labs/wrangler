---
description: Validate whether AI agent followed wrangler's workflows and skill guidelines during session - comprehensive compliance audit of skill invocation, workflow steps, TDD, verification, and subagent usage
---

You are conducting a compliance audit of the AI agent's adherence to wrangler workflows and skill guidelines during this session.

**Purpose**: Trust but verify - validate that wrangler's systematic processes were actually followed.

**This is NOT gap analysis** (that's `/wrangler:analyze-session-gaps`). This is **compliance auditing**: Did we follow the processes we said we would?

## Input

**User suspicion** (optional): "{user's specific concern or focus area}"

If user provided suspicion, focus analysis there while still covering all areas.

## Your Task

### Phase 1: Conversation Analysis (Scope and Context)

**Analyze last 30-50 messages** to understand what work was done:

1. **Identify Tasks Performed**:
   - Feature implementations
   - Bug fixes
   - Refactoring
   - Code reviews
   - Planning activities
   - Documentation work
   - Testing activities

2. **Extract Key Events**:
   - File modifications (code, tests, specs)
   - Completion claims ("done", "ready", "works")
   - Skill announcements (🔧 Using Skill: ...)
   - Test executions
   - Build commands
   - Commit operations
   - Subagent dispatches

3. **Build Timeline**:
   ```markdown
   Message #N: User requested feature X
   Message #N+2: Agent modified file.ts
   Message #N+5: Agent claimed "tests pass"
   Message #N+7: Agent committed changes
   ```

4. **Note User Feedback**:
   - Corrections requested
   - Concerns raised
   - Questions asked
   - Skepticism expressed

---

### Phase 2: Skill Invocation Compliance

**Reference**: `docs/skill-invocation-patterns.md`

For each task identified, determine:

#### 2.1 Expected Skills

Based on task pattern, which skills SHOULD have been invoked?

**Use skill-invocation-patterns.md mappings**:

- Feature implementation → `check-constitutional-alignment`, `test-driven-development`, `requesting-code-review`, `verification-before-completion`
- Bug fix → `systematic-debugging`, `test-driven-development`, `requesting-code-review`, `verification-before-completion`
- Code changes → `test-driven-development` (ALWAYS), `requesting-code-review` (ALWAYS except 3 exceptions)
- Multiple failures → `dispatching-parallel-agents` (if 3+ independent)
- Complex implementation → `writing-plans`

#### 2.2 Actual Skills Used

Search conversation for skill announcements:

```
🔧 Using Skill: [skill-name] | [purpose]
```

List all skills announced and when.

#### 2.3 Compliance Analysis

Compare expected vs actual:

```markdown
### Task: [task name]

**Expected Skills**:
- test-driven-development
- requesting-code-review
- verification-before-completion

**Actually Used**:
- test-driven-development ✓
- verification-before-completion ✓

**Missing**:
- requesting-code-review ❌

**Violation**: Code review skipped
**Severity**: HIGH
**Evidence**: Message #N shows code committed without review
```

---

### Phase 3: Workflow Step Compliance

**Reference**: `docs/workflows.md`

For skills that WERE invoked, verify they followed documented workflow steps:

#### 3.1 TDD Workflow Compliance

**Required steps** (from `workflows.md`):
1. RED Phase - Write failing test
2. Verify RED - Watch it fail, show output
3. GREEN Phase - Minimal implementation
4. Verify GREEN - Watch it pass, show output
5. REFACTOR Phase - Clean up

**Compliance checks**:

```markdown
### TDD Compliance for [function/feature]

**Step 1: RED Phase**
- [ ] Test written first? [YES/NO/UNCLEAR]
  - Evidence: [message number where test written]
- [ ] Test shows what should happen? [YES/NO]

**Step 2: Verify RED**
- [ ] Test execution output shown? [YES/NO]
  - Evidence: [message number with output]
- [ ] Test failed correctly? [YES/NO]
  - Failure reason: "[actual failure message]"
  - Expected reason: "[what should fail]"
  - Match: [YES/NO]
- [ ] Output was COMPLETE? (not paraphrased) [YES/NO]

**Step 3: GREEN Phase**
- [ ] Minimal implementation written? [YES/NO]
- [ ] Implemented AFTER test failed? [YES/NO]

**Step 4: Verify GREEN**
- [ ] Test execution output shown? [YES/NO]
  - Evidence: [message number]
- [ ] All tests passed? (0 failures) [YES/NO]
- [ ] Exit code: 0? [YES/NO]
- [ ] Output was COMPLETE? [YES/NO]

**Step 5: REFACTOR**
- [ ] Refactoring performed? [YES/NO/N/A]
- [ ] Tests stayed green? [YES/NO/N/A]

**TDD Compliance Certification**
- [ ] Provided? [YES/NO]
- [ ] Complete? (all functions listed) [YES/NO]
- [ ] All "Watched fail" = YES? [YES/NO]
  - Exceptions noted: [if any]

**Overall TDD Compliance**: [COMPLIANT/PARTIAL/VIOLATED]
**Violations**: [list specific issues]
```

#### 3.2 Verification Workflow Compliance

**Reference**: `verification-before-completion` skill and `verification-requirements.md`

**Required before ANY completion claim**:

```markdown
### Verification Compliance for [claim]

**Claim Made**: "[exact quote from message #N]"

**Gate Function Compliance**:

0. TDD COMPLIANCE
   - [ ] TDD followed? [YES/NO]
   - [ ] Certification provided? [YES/NO]

1. IDENTIFY
   - [ ] Identified verification command? [YES/NO]
   - Command: [what should prove the claim]

2. RUN
   - [ ] Command executed FRESH? [YES/NO]
   - [ ] Complete command shown? [YES/NO]

3. READ
   - [ ] Full output provided? [YES/NO]
   - [ ] Exit code checked? [YES/NO]
   - [ ] Failure count verified? [YES/NO]

4. CAPTURE
   - [ ] Output copied to message? [YES/NO]
   - [ ] Output was COMPLETE? (not truncated) [YES/NO]

5. VERIFY
   - [ ] Output confirms claim? [YES/NO]
   - Claim: "[what was claimed]"
   - Reality: "[what output shows]"
   - Match: [YES/NO]

6. REQUIREMENTS
   - [ ] All requirements verified? [YES/NO]
   - Checklist provided? [YES/NO]

7. TDD CERTIFIED
   - [ ] Certification provided? [YES/NO]

8. CODE REVIEW
   - [ ] Review obtained? [YES/NO/EXCEPTION]
   - If exception: [which exception 1/2/3?]
   - If exception: [evidence provided?]

**Violations Found**:
- [List each step violated with evidence]

**Severity**: [CRITICAL/HIGH/MEDIUM/LOW]

**Overall Verification Compliance**: [COMPLIANT/PARTIAL/VIOLATED]
```

#### 3.3 Code Review Workflow Compliance

**Reference**: `requesting-code-review` skill

**Required for ALL code changes** (except 3 exceptions):

```markdown
### Code Review Compliance

**Code Changes Made**:
- [List files modified]

**Exception Check**:

Is this one of the 3 valid exceptions?
1. Pure documentation (*.md in docs/, ZERO code)? [YES/NO]
2. Configuration-only (dependencies, NO logic)? [YES/NO]
3. Emergency hotfix (production down)? [YES/NO]

**If NO to all**: Code review is MANDATORY

**Review Status**:
- [ ] Code review requested? [YES/NO]
  - Evidence: [skill announcement or Task() call]
- [ ] Review completed? [YES/NO]
  - Evidence: [review report in messages]
- [ ] Critical issues: [count]
  - MUST be 0 to proceed
- [ ] Important issues: [count]
  - MUST be 0 OR converted to tracked issues
- [ ] Review status: [APPROVED/APPROVED_WITH_ITEMS/CHANGES_REQUIRED]

**Violations**:
- [List if review skipped without valid exception]
- [List if proceeded with unfixed Critical/Important issues]

**Severity**: [HIGH if skipped, MEDIUM if incomplete]

**Overall Code Review Compliance**: [COMPLIANT/VIOLATED]
```

#### 3.4 Subagent Usage Compliance

**Reference**: `dispatching-parallel-agents` skill, `writing-plans` skill

**Check if subagents should have been used**:

```markdown
### Subagent Usage Compliance

**Scenario**: [describe situation]

**Subagent Decision Tree**:

For multiple failures:
- 3+ failures present? [YES/NO]
- Failures independent? [YES/NO]
- Parallel-safe? [YES/NO]
→ Expected: [dispatching-parallel-agents / systematic-debugging]

For complex implementation:
- Plan created? [YES/NO]
- 10+ tasks? [YES/NO]
→ Expected: [/wrangler:implement with subagents]

For code review:
- Code changes made? [YES/NO]
- Review required? [YES/NO]
→ Expected: [code-review subagent dispatch]

**Actual Subagent Usage**:
- [List any Task() calls or subagent dispatches]

**Compliance**:
- [ ] Subagents used when required? [YES/NO]
- [ ] Subagent results verified? [YES/NO]
  - Did agent verify subagent claims independently?
  - Did agent check VCS diff?
  - Did agent run tests after subagent?

**Violations**:
- [List if subagents should have been used but weren't]
- [List if subagent results weren't verified]

**Overall Subagent Compliance**: [COMPLIANT/PARTIAL/VIOLATED]
```

---

### Phase 4: Evidence Compliance

**Reference**: `verification-requirements.md`

For each verification claim, check evidence quality:

#### 4.1 Test Evidence

**For "tests pass" claims**:

```markdown
### Test Evidence for Message #N

**Claim**: "[exact quote]"

**Required Evidence** (from verification-requirements.md):
- [ ] Exact command shown? [YES/NO]
- [ ] Complete output? [YES/NO]
  - Test count shown? [YES/NO]
  - Failure count shown? [YES/NO]
  - Duration shown? [YES/NO]
  - Exit code shown? [YES/NO]
- [ ] Coverage report? [YES/NO/N/A]

**Actual Evidence Provided**:
[Quote the evidence or note "NONE"]

**Evidence Quality**: [COMPLETE/PARTIAL/MISSING]
**Violation**: [YES/NO]
```

#### 4.2 TDD Evidence

**For TDD claims**:

```markdown
### TDD Evidence for [function]

**RED Phase Evidence**:
- [ ] Test failure output shown? [YES/NO]
- [ ] Failure reason specific? [YES/NO]
- [ ] Failure matches expectation? [YES/NO]

**GREEN Phase Evidence**:
- [ ] Test pass output shown? [YES/NO]
- [ ] All tests pass? [YES/NO]
- [ ] Exit code 0? [YES/NO]

**Certification Evidence**:
- [ ] TDD Compliance Certification provided? [YES/NO]
- [ ] All functions listed? [YES/NO]
- [ ] All "Watched fail" = YES? [YES/NO]

**Evidence Quality**: [COMPLETE/PARTIAL/MISSING]
```

#### 4.3 Frontend Evidence

**For UI work**:

```markdown
### Frontend Evidence for [component]

**Required** (from verification-requirements.md):
- [ ] Screenshot provided? [YES/NO]
- [ ] Responsive breakpoints tested? [YES/NO]
- [ ] Console verification (0 errors)? [YES/NO]
- [ ] Network verification? [YES/NO]
- [ ] Accessibility verification (axe-core)? [YES/NO]
- [ ] Keyboard navigation tested? [YES/NO]
- [ ] UI states tested (loading, error, empty)? [YES/NO]

**Actual Evidence**:
[List what was provided]

**Evidence Quality**: [COMPLETE/PARTIAL/MISSING]
**Violations**: [List missing items]
```

---

### Phase 5: Pattern Recognition

Identify systemic issues:

```markdown
### Systemic Patterns

**TDD Patterns**:
- Tests written first: [X/Y times]
- Tests written after: [X/Y times]
- RED verification shown: [X/Y times]
- GREEN verification shown: [X/Y times]
- Pattern: [CONSISTENT TDD / INCONSISTENT / VIOLATED]

**Verification Patterns**:
- Claims with evidence: [X/Y times]
- Claims without evidence: [X/Y times]
- Complete output shown: [X/Y times]
- Paraphrased results: [X/Y times]
- Pattern: [COMPLIANT / INCONSISTENT / VIOLATED]

**Code Review Patterns**:
- Reviews requested: [X/Y times]
- Reviews skipped: [X/Y times]
- Valid exceptions: [X/Y times]
- Pattern: [COMPLIANT / INCONSISTENT / VIOLATED]

**Skill Announcement Patterns**:
- Skills properly announced: [X/Y times]
- Skills used without announcement: [X/Y times]
- Pattern: [COMPLIANT / INCONSISTENT]
```

---

### Phase 6: Generate Compliance Report

## Output Format

```markdown
# SESSION ADHERENCE VALIDATION REPORT

Generated: [timestamp]
Session scope: Messages [N]-[M] (last 30-50 messages)

## Executive Summary

**Overall Compliance**: [PASS/PARTIAL/FAIL]
- **PASS**: All required workflows followed, evidence complete
- **PARTIAL**: Most workflows followed, some violations found
- **FAIL**: Major workflows violated, evidence missing

**Compliance Scores**:
- TDD Compliance: [X/Y tasks] ([percentage]%)
- Verification Compliance: [X/Y claims] ([percentage]%)
- Code Review Compliance: [X/Y changes] ([percentage]%)
- Subagent Compliance: [X/Y opportunities] ([percentage]%)
- Evidence Quality: [X/Y items] ([percentage]%)

**Critical Violations**: [count]
**High Violations**: [count]
**Medium Violations**: [count]
**Low Violations**: [count]

**Risk Level**: [CRITICAL/HIGH/MEDIUM/LOW]
- CRITICAL: Multiple critical violations, code unverified
- HIGH: Code review skipped or major TDD violations
- MEDIUM: Evidence incomplete but work likely correct
- LOW: Minor compliance issues, work appears solid

---

## Conversation Analysis

**Messages Analyzed**: #[N] to #[M] ([count] messages)

**Tasks Identified**:
1. [Task type]: [description] (Messages #[range])
2. [Task type]: [description] (Messages #[range])
...

**Key Events Timeline**:
- Message #N: [event]
- Message #N+5: [event]
- Message #N+10: [event]
...

**Files Modified**:
- [file path] - [what changed]
- [file path] - [what changed]
...

---

## Skill Invocation Compliance

### Task 1: [task name] (Messages #[range])

**Expected Skills** (from skill-invocation-patterns.md):
- [skill-name]: [when/why required]
- [skill-name]: [when/why required]

**Actually Invoked**:
- ✓ [skill-name] (Message #N: 🔧 Using Skill: ...)
- ❌ [skill-name] (MISSING - not announced)

**Compliance**: [COMPLIANT/PARTIAL/VIOLATED]

**Violations**:
- [SEVERITY] [skill-name] not invoked when required
  - **Evidence**: [message references]
  - **Impact**: [what could go wrong]
  - **Should have**: [what should have happened]

---

### Task 2: [task name]
... (repeat for each task)

---

## Workflow Step Compliance

### TDD Workflow (test-driven-development skill)

**Functions/Features Implemented**: [count]

#### Function: [function_name] (Messages #[range])

**RED Phase**:
- Test written first? [✓/✗]
- Test failure shown? [✓/✗]
- Failure reason correct? [✓/✗]
- **Evidence**: [message #N or "MISSING"]

**GREEN Phase**:
- Minimal implementation? [✓/✗]
- Test pass shown? [✓/✗]
- All tests passed? [✓/✗]
- **Evidence**: [message #N or "MISSING"]

**Certification**:
- Provided? [✓/✗]
- Complete? [✓/✗]
- **Evidence**: [message #N or "MISSING"]

**Compliance**: [COMPLIANT/PARTIAL/VIOLATED]

**Violations**:
- [List specific issues with severity]

---

### Verification Workflow (verification-before-completion skill)

**Completion Claims**: [count]

#### Claim: "[exact quote]" (Message #N)

**Gate Function Steps**:
0. TDD COMPLIANCE: [✓/✗]
1. IDENTIFY: [✓/✗]
2. RUN: [✓/✗]
3. READ: [✓/✗]
4. CAPTURE: [✓/✗]
5. VERIFY: [✓/✗]
6. REQUIREMENTS: [✓/✗]
7. TDD CERTIFIED: [✓/✗]
8. CODE REVIEW: [✓/✗]

**Compliance**: [COMPLIANT/PARTIAL/VIOLATED]

**Violations**:
- [SEVERITY] [Step name] not followed
  - **Evidence**: [what's missing]
  - **Impact**: [cannot trust claim]
  - **Should have**: [what evidence needed]

---

### Code Review Workflow (requesting-code-review skill)

**Code Changes**: [count]

#### Change: [files modified] (Messages #[range])

**Exception Check**:
- Pure docs? [YES/NO]
- Config-only? [YES/NO]
- Emergency? [YES/NO]
→ Review required: [YES/NO]

**Review Status**:
- Requested? [✓/✗] (Evidence: [message #N])
- Completed? [✓/✗] (Evidence: [message #N])
- Critical issues: [count] (must be 0)
- Important issues: [count] (must be 0 or tracked)
- Status: [APPROVED/etc.]

**Compliance**: [COMPLIANT/VIOLATED]

**Violations**:
- [SEVERITY] Code review [skipped/incomplete]
  - **Evidence**: [what's missing]
  - **Impact**: [unreviewed code in production]

---

### Subagent Usage (dispatching-parallel-agents, writing-plans skills)

**Subagent Opportunities**: [count]

#### Opportunity: [scenario] (Messages #[range])

**Analysis**:
- Should subagents be used? [YES/NO]
- Reason: [explanation]

**Actual Usage**:
- Subagents dispatched? [✓/✗]
- Results verified? [✓/✗]

**Compliance**: [COMPLIANT/VIOLATED]

**Violations**:
- [SEVERITY] Subagents [not used/results not verified]
  - **Evidence**: [what happened]
  - **Impact**: [missed parallelization / unverified work]

---

## Evidence Compliance

### Test Evidence Quality

**Test Claims**: [count]

**Evidence Quality Analysis**:

| Claim (Message) | Command | Output | Coverage | Quality | Violations |
|-----------------|---------|--------|----------|---------|------------|
| "tests pass" (#N) | ✓ | ✓ | ✗ | PARTIAL | Missing coverage |
| "all green" (#M) | ✗ | ✗ | ✗ | MISSING | No evidence |

**Overall Test Evidence**: [COMPLETE/PARTIAL/MISSING]

---

### TDD Evidence Quality

**TDD Claims**: [count]

**Evidence Analysis**:

| Function | RED Output | GREEN Output | Certification | Quality | Violations |
|----------|------------|--------------|---------------|---------|------------|
| func1 | ✓ | ✓ | ✓ | COMPLETE | None |
| func2 | ✗ | ✗ | ✗ | MISSING | All evidence missing |

**Overall TDD Evidence**: [COMPLETE/PARTIAL/MISSING]

---

### Frontend Evidence Quality (if applicable)

**UI Changes**: [count]

**Evidence Analysis**:

| Component | Screenshot | Console | Network | A11y | Quality | Violations |
|-----------|------------|---------|---------|------|---------|------------|
| Button | ✓ | ✓ | N/A | ✗ | PARTIAL | Missing a11y |
| Form | ✗ | ✗ | ✗ | ✗ | MISSING | All missing |

**Overall Frontend Evidence**: [COMPLETE/PARTIAL/MISSING]

---

## Systemic Patterns

**TDD Pattern Analysis**:
- Tests written first: [X/Y] ([percentage]%)
- RED verification shown: [X/Y] ([percentage]%)
- GREEN verification shown: [X/Y] ([percentage]%)
- Certification provided: [X/Y] ([percentage]%)

**Pattern**: [CONSISTENT TDD / INCONSISTENT / VIOLATED]

**Verification Pattern Analysis**:
- Claims with complete evidence: [X/Y] ([percentage]%)
- Claims with partial evidence: [X/Y] ([percentage]%)
- Claims without evidence: [X/Y] ([percentage]%)

**Pattern**: [COMPLIANT / INCONSISTENT / VIOLATED]

**Code Review Pattern Analysis**:
- Reviews requested: [X/Y] ([percentage]%)
- Valid exceptions: [X/Y] ([percentage]%)
- Skipped without exception: [X/Y] ([percentage]%)

**Pattern**: [COMPLIANT / INCONSISTENT / VIOLATED]

**Skill Announcement Pattern**:
- Skills announced: [X/Y] ([percentage]%)
- Skills used silently: [X/Y] ([percentage]%)

**Pattern**: [COMPLIANT / INCONSISTENT]

---

## Violations Summary

### Critical Violations (MUST fix immediately)

1. **[Violation category]**: [description]
   - **Evidence**: Message #N - [what happened]
   - **Impact**: [serious consequences]
   - **Fix**: [what to do now]
   - **Prevent**: [how to avoid in future]

... (list all critical)

---

### High Violations (MUST fix before claiming complete)

1. **[Violation category]**: [description]
   - **Evidence**: Message #N - [what happened]
   - **Impact**: [significant consequences]
   - **Fix**: [what to do]
   - **Prevent**: [how to avoid]

... (list all high)

---

### Medium Violations (Should fix)

1. **[Violation category]**: [description]
   - **Evidence**: Message #N
   - **Impact**: [moderate consequences]
   - **Fix**: [recommended action]

... (list all medium)

---

### Low Violations (Nice to fix)

1. **[Violation category]**: [description]
   - **Evidence**: Message #N
   - **Impact**: [minor consequences]
   - **Fix**: [optional improvement]

... (list all low)

---

## Recommendations

### Immediate Actions (Required)

1. **[Action]**: [what to do right now]
   - Addresses: [which violations]
   - Steps: [specific steps]
   - Verification: [how to verify done correctly]

... (list all immediate actions)

---

### Process Improvements (Recommended)

1. **[Improvement]**: [what to change going forward]
   - Problem: [what pattern caused issues]
   - Solution: [how to fix the pattern]
   - Benefit: [why this helps]

... (list all improvements)

---

### Skills to Review

Based on violations, review these skills:

1. **[skill-name]**: `skills/[path]/SKILL.md`
   - **Why**: [what was misunderstood or violated]
   - **Focus on**: [specific sections]

... (list all skills needing review)

---

## Overall Assessment

**Compliance Level**: [PASS/PARTIAL/FAIL]

**Trust Level**: [HIGH/MEDIUM/LOW]
- HIGH: Work is verified, processes followed, can trust claims
- MEDIUM: Most work verified, some gaps, verify critical parts
- LOW: Significant gaps, must verify all claims independently

**Risk Assessment**:

**Code Quality Risk**: [LOW/MEDIUM/HIGH/CRITICAL]
- Risk that code has bugs: [assessment]
- Risk that tests are inadequate: [assessment]
- Risk that requirements not met: [assessment]

**Process Risk**: [LOW/MEDIUM/HIGH/CRITICAL]
- Risk of future violations: [assessment]
- Risk of systemic issues: [assessment]

**Summary**:

[2-3 sentences summarizing overall session compliance, main issues found, and overall trustworthiness of the work]

---

## Next Steps

**If PASS**: Work appears compliant, can proceed with confidence.

**If PARTIAL**: Review violations, address Critical/High items before proceeding.

**If FAIL**: Significant compliance issues found. Recommend:
1. Review all violations listed above
2. Fix Critical violations immediately
3. Re-verify all completion claims
4. Consider re-implementing with strict TDD adherence
5. Request fresh code review
6. Run this validation again after fixes

**Questions for User**:

1. Do you want me to fix the violations found?
2. Should I re-verify specific claims that lacked evidence?
3. Are there specific areas you want deeper analysis?

```

---

## Important Guidelines

### Objectivity

- **Be ruthless**: Don't give benefit of doubt
- **Cite evidence**: Every claim needs message reference
- **No assumptions**: If evidence not shown, it's missing
- **Call out patterns**: Systemic issues are worse than one-offs

### Severity Classification

**Critical**:
- Code shipped without verification
- TDD completely bypassed
- Tests passing without being run
- Code review skipped on substantive changes

**High**:
- TDD followed but incomplete evidence
- Code review incomplete (unfixed issues)
- Verification partial (some evidence missing)
- Subagents not used when clearly beneficial

**Medium**:
- Skills not announced
- Evidence paraphrased instead of complete
- Constitutional check skipped
- Minor workflow deviations

**Low**:
- Documentation gaps
- Incomplete skill announcements
- Non-critical evidence missing (e.g., coverage report)

### Focus Areas

If user provided suspicion:
- **Prioritize that area** in analysis
- **But still cover all areas** comprehensively
- **Connect suspicion** to systemic patterns if found

Common suspicions:
- "I don't think TDD was actually followed"
- "Tests might not have been run"
- "Code review was skipped"
- "Subagents weren't used correctly"

### Evidence Requirements

**Trust nothing without evidence**:
- Claims need command output
- Workflow adherence needs skill announcements
- TDD needs RED/GREEN outputs
- Reviews need review reports
- Subagents need dispatch evidence

**Paraphrasing = No Evidence**:
- "I ran tests and they passed" ≠ evidence
- Must see actual command output

### Comparison with Gap Analysis

**/wrangler:analyze-session-gaps** asks:
- What CAPABILITY is missing?
- What SKILL should exist but doesn't?
- What GAP prevents success?

**/wrangler:validate-session-adherence** asks:
- Was the RIGHT SKILL used?
- Were WORKFLOW STEPS followed?
- Was EVIDENCE provided?
- Did COMPLIANCE occur?

**This command is about ADHERENCE, not GAPS.**

---

## Success Criteria

Your validation is successful when:

- **Comprehensive**: All tasks and claims analyzed
- **Objective**: Evidence-based, no assumptions
- **Actionable**: Violations have clear fixes
- **Prioritized**: Critical issues highlighted
- **Constructive**: Helps user trust future work
- **Honest**: Calls out violations clearly

Remember: The user is asking "Did my agent actually follow the rules?" Be thorough, be honest, and provide clear evidence for every claim you make.
