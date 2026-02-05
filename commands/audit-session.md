---
name: audit-session
description: Comprehensive session audit to identify where wrangler skills/tooling failed to deliver expected results
slash_command: /wrangler:audit-session
---

# Wrangler Session Audit

You are conducting a **comprehensive session audit** to identify where wrangler's skills, tooling, and governance framework failed to prevent problems or deliver expected results.

## Context

This command is used when:
- An implementation went off the rails despite following (or claiming to follow) wrangler workflows
- User suspects processes weren't followed correctly
- User wants to understand why expected safeguards didn't catch problems
- User wants to identify gaps in wrangler's skills/tooling to improve the system

## Your Mission

Analyze the current session and any subsessions to identify:
1. **Process deviations** - Where did execution deviate from expected wrangler workflows?
2. **Enforcement failures** - Where did safeguards fail to prevent problems?
3. **Skill connection failures** - Where did user prompts fail to trigger appropriate skills?
4. **Quality gate bypasses** - Where were quality gates missing or bypassed?
5. **Testing failures** - Where did testing strategy fail to catch bugs?
6. **Verification failures** - Where were verification steps skipped or inadequate?
7. **Documentation gaps** - Where did skills/docs fail to guide correct behavior?

## What to Analyze

### 1. Session Structure Analysis

Examine:
- Main session conversation flow
- Subsessions created via Task tool (check for their transcripts/outputs)
- Task handoffs and checkpoints
- Completion claims and their timing
- Evidence provided (or lack thereof)

### 2. Skill Invocation Analysis

Check:
- Which skills were announced/used
- Which skills SHOULD have been used but weren't
- Whether skill invocation happened at appropriate times
- Whether skills were bypassed or rationalized away
- Whether skill instructions were actually followed

### 3. Workflow Compliance Analysis

Verify:
- TDD workflow (RED-GREEN-REFACTOR)
- Verification workflow (evidence requirements)
- Code review workflow
- Manual testing workflow
- Spec compliance verification
- Quality gate enforcement

### 4. Testing Strategy Analysis

Evaluate:
- Test coverage (unit vs integration vs E2E)
- Test types appropriate for the work
- Whether E2E tests were written for user-facing features
- Whether integration tests were written for cross-service flows
- Whether manual testing was performed
- Whether testing gave false confidence (unit tests passing but system broken)

### 5. Completion Claims Analysis

Review:
- When "done" was claimed
- What state the code was actually in
- Whether verification preceded completion claims
- Whether PR descriptions were accurate or exaggerated
- Whether handoff documentation acknowledged incompleteness

### 6. Git Hooks Analysis

Check:
- Whether git hooks were configured
- Whether hooks ran successfully
- Whether hooks were bypassed (legitimately or illegitimately)
- Whether TDD bypass mechanism was used appropriately
- Whether hooks caught problems or failed to catch them

### 7. Spec Compliance Analysis (if applicable)

If implementing a spec:
- Which acceptance criteria were claimed complete
- Which acceptance criteria were actually complete
- Whether phases were skipped or deferred without documentation
- Whether spec compliance audit was performed
- What the actual completion percentage was

## Analysis Framework

Use this systematic framework:

### Phase 1: Evidence Gathering

1. **Read session transcript** - Scan through main session looking for:
   - Skill invocations (or lack thereof)
   - "Done" claims and their timing
   - Test execution and results
   - Verification steps (or absence)
   - User concerns or bug reports

2. **Check subsession outputs** - If subsessions were created:
   - Read their output files or transcripts
   - Identify what they claimed to accomplish
   - Identify what they actually accomplished
   - Check for premature completion claims

3. **Examine code changes** - If applicable:
   - What files were modified
   - What tests were written
   - What tests are missing
   - What bugs exist in the code

4. **Review git history** - If applicable:
   - What commits were made
   - Whether hooks ran
   - Whether hooks were bypassed
   - Commit message quality

### Phase 2: Failure Mode Identification

For each category, identify specific failures:

#### Testing Failures
- Missing E2E tests for user-facing features
- Missing integration tests for cross-service flows
- Over-reliance on unit tests
- Mocked tests that don't catch real bugs
- No manual testing performed
- Tests passing but system broken

#### Verification Failures
- No verification phase before completion
- No manual testing checklist
- No spec compliance audit
- No acceptance criteria verification
- Evidence not provided for claims
- Premature "done" claims

#### Skill Connection Failures
- User prompt didn't trigger appropriate skill
- Skill was available but not used
- Skill was rationalized away
- Skill instructions were ignored
- Skill was started but not completed

#### Enforcement Failures
- Quality gates missing
- Quality gates present but bypassed
- Git hooks not configured
- Git hooks failed to catch problems
- Git hooks bypassed inappropriately
- No enforcement mechanism for critical steps

#### Workflow Deviations
- TDD not followed (no RED phase)
- Tests not written first
- Code written without tests
- Refactoring without test coverage
- Implementation without verification
- PR created without review

#### Documentation/Guidance Gaps
- Skill exists but wasn't discoverable
- Skill documentation unclear
- Workflow not documented
- Best practice not captured
- Anti-pattern not documented
- Template missing

### Phase 3: Root Cause Analysis

For each failure, identify:
- **Immediate cause** - What directly caused the problem?
- **Contributing factors** - What made it worse?
- **Systemic cause** - What systemic gap allowed it?
- **Wrangler gap** - Where did wrangler fail to prevent it?

Example:
```
Failure: Missing async keyword in production code

Immediate Cause: Developer forgot to add await
Contributing Factors: TypeScript doesn't enforce await, no integration tests
Systemic Cause: Over-reliance on unit tests, no E2E testing
Wrangler Gap: implement-spec skill doesn't mandate E2E tests for user-facing features
```

### Phase 4: Pattern Detection

Look for:
- **Repeated failures** - Same type of failure multiple times
- **Cascading failures** - One failure leading to others
- **Systemic patterns** - Organizational/process issues
- **Tool gaps** - Missing automation or enforcement
- **Skill gaps** - Missing or inadequate skills

## Output Format

Provide your findings in this structured format:

```markdown
# Wrangler Session Audit Report

**Session:** [session ID or date/time]
**Duration:** [how long the session ran]
**Outcome:** [what was the user's experience - success/partial/failure]
**Audit Date:** [current date]

---

## Executive Summary

[2-3 paragraphs summarizing:
- What was attempted
- What went wrong
- Primary root causes
- Key wrangler gaps identified]

**Overall Assessment:** [SEVERE / MODERATE / MINOR issues detected]

---

## Detailed Findings

### 1. Testing Failures

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW / NONE]

[For each issue found:]
- **Issue:** [describe the problem]
- **Evidence:** [message number or file:line reference]
- **Impact:** [what harm did this cause]
- **Wrangler Gap:** [what should have prevented this]
- **Recommendation:** [how to fix wrangler]

### 2. Verification Failures

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW / NONE]

[Same structure as above]

### 3. Skill Connection Failures

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW / NONE]

[Same structure as above]

### 4. Enforcement Failures

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW / NONE]

[Same structure as above]

### 5. Workflow Deviations

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW / NONE]

[Same structure as above]

### 6. Documentation/Guidance Gaps

**Severity:** [CRITICAL / HIGH / MEDIUM / LOW / NONE]

[Same structure as above]

---

## Root Cause Analysis

### Primary Root Causes

1. **[Root Cause 1]**
   - **Symptom:** [what was observed]
   - **Evidence:** [where we saw it]
   - **Wrangler Gap:** [what's missing from wrangler]
   - **Fix:** [how to fix wrangler]

2. **[Root Cause 2]**
   [Same structure]

### Contributing Factors

[List secondary factors that made things worse]

---

## Systemic Patterns

[Describe any patterns observed across multiple failures]

- **Pattern 1:** [description]
- **Pattern 2:** [description]

---

## Wrangler Gaps Summary

### Missing Skills
- [ ] [Skill name] - [why needed]

### Skill Improvements Needed
- [ ] [Skill name] - [what to add/change]

### Missing Tools
- [ ] [Tool name] - [what it should do]

### Missing Quality Gates
- [ ] [Where gate needed] - [what it should enforce]

### Documentation Gaps
- [ ] [What needs documentation]

---

## Recommendations

### Immediate (Can fix now)
1. [Recommendation 1]
2. [Recommendation 2]

### Short-Term (Next sprint)
1. [Recommendation 1]
2. [Recommendation 2]

### Long-Term (Systematic improvements)
1. [Recommendation 1]
2. [Recommendation 2]

---

## Specific Examples

[For the most egregious failures, provide detailed examples:]

### Example 1: [Failure Name]

**What Happened:**
[Detailed description]

**What Should Have Happened:**
[What wrangler should have enforced]

**Code Example:**
```[language]
// WRONG (what was done)
[code]

// CORRECT (what should have been done)
[code]
```

**Root Cause:**
[Why wrangler didn't prevent this]

**Fix:**
[How to improve wrangler]

---

## GitHub Issue Recommendation

[Provide a recommendation about filing GitHub issues]

**Should file issues for:**
1. [Gap 1] - [why important]
2. [Gap 2] - [why important]

**Priority:**
- **Critical:** [number] issues
- **High:** [number] issues
- **Medium:** [number] issues

```

## After Providing the Report

After providing your detailed audit report, ask the user:

```
This audit identified [X] critical gaps and [Y] high-priority gaps in wrangler's skills and tooling.

Would you like me to:

1. **File GitHub issues** for the critical gaps identified (I can draft the issues)
2. **Create improvement specs** for wrangler enhancements
3. **Update existing skills** to address the gaps found
4. **Draft new skills** to fill the missing capabilities

What would you like to do next?
```

## Important Notes

### What This Audit Is NOT

- **Not a blame exercise** - Focus on system gaps, not individual performance
- **Not a compliance check** - That's `/wrangler:validate-session-adherence`
- **Not a capability gap analysis** - That's `/wrangler:analyze-session-gaps`
- **Not a code review** - That's `/wrangler:reviewing-code`

### What This Audit IS

- **System improvement focus** - Find where wrangler failed to prevent problems
- **Enforcement gap analysis** - Identify missing quality gates and safeguards
- **Skill gap analysis** - Find where skills were inadequate or missing
- **Tooling gap analysis** - Identify missing automation or enforcement

### Be Thorough But Constructive

- Call out failures clearly and specifically
- Always tie back to wrangler gaps (what should have prevented this)
- Provide actionable recommendations
- Focus on systematic improvements, not one-off fixes
- Be honest about severity (don't sugarcoat critical issues)

### Evidence Standards

- Reference specific messages, files, or commits
- Quote relevant code or conversation
- Show before/after or expected/actual comparisons
- Quantify when possible (% complete, # tests, etc.)

### Root Cause Rigor

- Don't stop at "developer forgot" - why did the system allow forgetting?
- Don't accept "should have known" - what should have enforced it?
- Look for missing guardrails, not missing knowledge
- Focus on preventing future occurrences, not explaining past ones

## Example Audit Scenarios

### Scenario 1: Implementation Claims Complete But Has Critical Bugs

**Your analysis should identify:**
- Was verification performed before "done" claim?
- Were E2E tests written?
- Was manual testing performed?
- Was spec compliance audited?
- What quality gates were missing?
- Why did the skill allow premature completion?

### Scenario 2: Git Hooks Were Bypassed Inappropriately

**Your analysis should identify:**
- How were hooks bypassed?
- Was bypass mechanism documented?
- Was it appropriate for the situation?
- What enforcement could prevent inappropriate bypass?
- Does the skill explain bypass mechanism?

### Scenario 3: Skill Wasn't Used Despite Being Relevant

**Your analysis should identify:**
- Why didn't the user prompt trigger the skill?
- Was the skill discoverable?
- Was the skill documentation clear?
- Should the skill auto-trigger?
- What pattern matching failed?

### Scenario 4: Tests Passing But System Broken

**Your analysis should identify:**
- What type of tests were written?
- What type of tests were missing?
- Why didn't test strategy catch the bug?
- Does the skill mandate appropriate test types?
- What testing guidance is missing?

## Begin the Audit

Start by asking the user:

1. **What was the outcome of the session?** (What went wrong? What worked? What was surprising?)
2. **Which subsessions should I review?** (If there were background agents or subtasks)
3. **What specific concerns do you have?** (Any particular areas to focus on?)

Then proceed with your systematic analysis using the framework above.

---

**Remember:** The goal is to identify gaps in wrangler so we can improve it for everyone, not to criticize past performance. Be thorough, be specific, and be constructive.
