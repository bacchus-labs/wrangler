---
description: Analyze session to identify workflow gaps and propose systematic improvements
---

You are analyzing the current session to identify workflow gaps, skill deficiencies, or process regressions that caused user frustration.

## Input

User provided description: "{user's description of the problem}"

## Your Task

### Phase 1: Session Analysis

1. **Understand the Problem**
   - Parse user's description carefully
   - Identify what went wrong from the user's perspective
   - Determine the gap between user expectation and reality
   - Consider the context of their frustration

2. **Trace Conversation History**
   - Review recent messages in this session (last 20-30 messages)
   - Identify the specific point where the workflow failed
   - Note which skills were invoked (if any)
   - Note which commands were executed
   - Detect what SHOULD have happened but didn't
   - Look for patterns of similar failures in the conversation

3. **Classify the Gap**

   Determine the gap type from these categories:

   - **MISSING_SKILL**: No skill exists for this scenario
     - Example: "No skill to check code style consistency across files"
     - Indicator: "I wish there was a way to..." or "Nothing caught this problem"

   - **BROKEN_SKILL**: Skill exists but didn't work correctly
     - Example: "The verification skill ran but missed the bug"
     - Indicator: Skill was invoked but failed to prevent the issue

   - **SKILL_NOT_INVOKED**: Skill exists but wasn't used when it should have been
     - Example: "Constitutional check skill exists but wasn't triggered"
     - Indicator: "We have a skill for that, why didn't you use it?"

   - **WORKFLOW_GAP**: Skills exist but aren't properly connected
     - Example: "Skills for testing and deployment exist but no bridge between them"
     - Indicator: Multiple steps needed but no orchestration

   - **VERIFICATION_GAP**: No check exists to prevent the issue
     - Example: "Nothing verified tests were actually run before claiming success"
     - Indicator: Agent made claims without evidence

   - **PROMPT_GAP**: Skill exists but prompts are unclear or ignored
     - Example: "Skill says to do X, but agent did Y instead"
     - Indicator: Skill instructions ambiguous or contradictory

### Phase 2: Root Cause Analysis

Conduct a thorough investigation by asking yourself:

1. **What was the user's expectation?**
   - What outcome did they want?
   - What standard should have been met?
   - What best practice was violated?

2. **What actually happened?**
   - Describe the actual outcome
   - Note the specific failure point
   - Identify the discrepancy

3. **Why did the gap occur?**
   - Was it a missing component?
   - Was it a broken component?
   - Was it a process failure?
   - Was it a communication failure?

4. **Which skill/workflow should have prevented this?**
   - Search existing skills in the skills/ directory
   - Check if a relevant skill exists but wasn't used
   - Determine if this is truly a new gap or an invocation failure

5. **What structural change would prevent recurrence?**
   - Think architecturally, not just about this instance
   - Consider: How can we make this failure impossible?
   - Don't rely on prompt engineering alone
   - Prefer enforcement mechanisms over reminders

### Phase 3: Solution Design

Based on gap type, propose a concrete solution:

#### For MISSING_SKILL:

**Create new skill**

- **Skill name**: `skills/{category}/{skill-name}/SKILL.md`
  - Choose category: testing, debugging, collaboration, governance, code-quality, verification, etc.
  - Use descriptive, action-oriented name

- **Purpose**: What problem does this skill solve?
  - Be specific about the scenario
  - Explain why existing skills don't cover this

- **Workflow**: Step-by-step process the skill should follow
  - Clear, numbered steps
  - Include verification checkpoints
  - Define success criteria

- **Integration**: How does it fit into existing workflows?
  - When should it trigger?
  - What skills does it depend on?
  - What skills depend on it?

- **Examples**: Provide 2-3 concrete usage examples

#### For BROKEN_SKILL:

**Update existing skill**

- **File**: Path to the skill file that's broken
  - Full path: `skills/{category}/{skill-name}/SKILL.md`

- **Problem**: What's broken in the current implementation?
  - Specific section that needs fixing
  - Why it's not working

- **Fix**: What to change
  - Exact changes to make
  - Why this fix will work
  - How to verify it's fixed

#### For SKILL_NOT_INVOKED:

**Add trigger mechanism**

- **Skill**: Which existing skill should have been used?
  - Full path to the skill

- **Trigger**: When should it auto-invoke?
  - Specific conditions or patterns
  - Before/after which actions?

- **Integration**: How to add to workflow wrapper
  - Update workflow detection logic
  - Add to appropriate execution phase
  - Ensure it can't be skipped

#### For WORKFLOW_GAP:

**Connect existing skills**

- **Skills**: Which skills need to be connected?
  - List all relevant skills
  - Show current gaps between them

- **Workflow**: How should they work together?
  - Define the orchestration
  - Show the flow diagram

- **Implementation**: What files to update
  - Workflow configuration
  - Skill cross-references
  - New wrapper if needed

#### For VERIFICATION_GAP:

**Add verification gate**

- **Check**: What needs to be verified?
  - Specific thing to validate
  - Expected evidence

- **When**: What triggers this check?
  - Before completion claims?
  - After specific actions?

- **Block**: Should it block on failure?
  - Hard block (must fix) vs soft warning

- **Integration**: Where to add in workflow
  - Which workflow phase?
  - Before which completion step?

#### For PROMPT_GAP:

**Clarify skill instructions**

- **Skill**: Which skill has unclear prompts?

- **Ambiguity**: What's unclear?
  - Specific section
  - Conflicting instructions

- **Clarification**: How to improve
  - Rewrite problematic section
  - Add examples
  - Remove ambiguity

### Phase 4: Constitutional Alignment

**CRITICAL**: Every proposed solution MUST align with the project's constitution.

1. **Read the Constitution**
   - Load `.wrangler/governance/CONSTITUTION.md` (if it exists)
   - If no constitution exists, note that and proceed with general principles

2. **Apply Decision Framework**
   - Does the solution align with each constitutional principle?
   - Does it violate any anti-patterns?
   - Is it consistent with the project's values?

3. **Verify Alignment**
   - For each principle, assess: ALIGNED / NEUTRAL / VIOLATES
   - If any violations, redesign the solution

4. **Result**:
   - **APPROVED**: Fully aligned, proceed with implementation
   - **REVISE**: Partially aligned, needs modification
   - **REJECT**: Violates principles, find alternative approach

### Phase 5: Present Analysis

Output a comprehensive analysis report in this exact format:

```markdown
# SESSION GAP ANALYSIS

## Problem Identified

{Restate user's description clearly}

## Session Trace

{Summarize the relevant conversation messages that led to this gap}

**Key Messages**:
- Message #{N}: {What happened}
- Message #{N+5}: {What happened}
- Message #{N+10}: {The failure point}

**Skills Invoked**: {List of skills that were used, or "None" if no skills}

**Commands Run**: {List of commands executed, or "None"}

**Gap Location**: {Where in the workflow the failure occurred}

## Gap Classification

- **Type**: {MISSING_SKILL / BROKEN_SKILL / SKILL_NOT_INVOKED / WORKFLOW_GAP / VERIFICATION_GAP / PROMPT_GAP}
- **Root Cause**: {Detailed explanation of why this happened}
- **Severity**: {LOW / MEDIUM / HIGH / CRITICAL}
  - LOW: Annoying but not breaking
  - MEDIUM: Impacts workflow, causes frustration
  - HIGH: Causes bugs or significant rework
  - CRITICAL: Could cause production failures or data loss
- **Frequency**: {ONCE / OCCASIONAL / RECURRING / CONSTANT}
  - ONCE: First time seeing this
  - OCCASIONAL: Happened 2-3 times
  - RECURRING: Happens regularly (4-10 times)
  - CONSTANT: Happens almost every session
- **Impact**: {Description of user and project impact}

## Proposed Solution

{Detailed solution description}

**Solution Type**: {CREATE_SKILL / UPDATE_SKILL / ADD_WORKFLOW / UPDATE_CONSTITUTION / ADD_VERIFICATION_GATE / CLARIFY_PROMPTS}

**Files to Create/Modify**:
- `{absolute file path 1}` - {what changes}
- `{absolute file path 2}` - {what changes}

**Implementation Plan**:

1. {First step - be specific}
2. {Second step - include file paths}
3. {Third step - include verification}
4. {Fourth step - include testing}
5. {Final step - include documentation}

**Estimated Effort**: {Realistic time estimate: 30min / 1-2hrs / 2-4hrs / 1 day}

**Integration Points**:
- {How this integrates with existing skills/workflows}
- {Dependencies or prerequisites}
- {Downstream impacts}

## Constitutional Alignment

{If constitution exists, show alignment check}

**Constitution Check**: {APPROVED / REVISE / REJECT}

**Principle Alignment**:
- Principle 1: {ALIGNED / NEUTRAL / VIOLATES} - {explanation}
- Principle 2: {ALIGNED / NEUTRAL / VIOLATES} - {explanation}
- ...

**Decision Framework Application**:
- Question 1: {answer}
- Question 2: {answer}
- ...

**Overall Assessment**: {Why this solution aligns or doesn't align}

{If no constitution exists}

**Note**: No constitution found at `.wrangler/governance/CONSTITUTION.md`. Proceeding with general software engineering principles.

## Alternatives Considered

1. **{Alternative approach 1}**
   - Description: {what it would involve}
   - REJECTED because: {specific reason}

2. **{Alternative approach 2}**
   - Description: {what it would involve}
   - REJECTED because: {specific reason}

3. **{Alternative approach 3}** (if applicable)
   - Description: {what it would involve}
   - REJECTED because: {specific reason}

{List at least 2 alternatives to show you considered multiple options}

## Risk Assessment

**Potential Risks**:
- {Risk 1}: {How to mitigate}
- {Risk 2}: {How to mitigate}

**Success Criteria**:
- {How we'll know this fix works}
- {What tests to run}
- {What to monitor}

## Next Steps

Would you like me to implement this solution? (y/n)

If yes, I will:

1. Create/update the necessary files
2. Write comprehensive tests for new skills
3. Update relevant documentation
4. Create a tracking issue in `.wrangler/issues/`
5. Verify the fix prevents recurrence
6. Run all existing tests to ensure no regressions

If no, I can:
- Explore alternative solutions
- Provide more details about the proposed approach
- Analyze a different gap you're experiencing
```

## Important Guidelines

### Session History Analysis

- **Look back carefully**: Review at least the last 20-30 messages
- **Identify patterns**: Multiple small failures may indicate systemic gap
- **Note near-misses**: Times when something almost failed
- **Consider context**: User's project type, their stated goals

### Gap Classification

- **Be honest**: If you're not sure, say so and explain why
- **Avoid over-classifying**: Not every hiccup is a critical gap
- **Consider frequency**: One-off issues may not need systematic fixes
- **Think structurally**: Focus on architectural solutions, not band-aids

### Solution Design

- **Be specific**: Vague solutions like "improve prompts" aren't enough
- **Think long-term**: Will this fix prevent the issue permanently?
- **Consider maintenance**: Will this solution age well?
- **Avoid complexity**: Simpler solutions are better (constitutional principle)

### Constitutional Alignment

- **Always check**: Even if you think it's obvious
- **Be rigorous**: Actually read the constitution file
- **Document reasoning**: Show your work
- **Respect rejections**: If it violates principles, find another way

### Presentation

- **Be comprehensive**: User needs full context to approve
- **Be honest**: About severity, effort, and risks
- **Be actionable**: Implementation plan should be executable
- **Be respectful**: User's time and frustration are real

## Examples

### Example 1: Test Verification Gap

**User Input**: "Agent told me it fixed the issue and everything is good to go, only for me to find out there's a major bug when I test the feature and that the agent didn't run the tests again"

**Expected Output**:

```markdown
# SESSION GAP ANALYSIS

## Problem Identified

Agent claimed completion and verification without actually running tests, leading to undetected bugs and user frustration.

## Session Trace

**Key Messages**:
- Message #15: User requested "Fix the authentication timeout bug"
- Message #18: Agent modified src/auth/session.ts
- Message #20: Agent said "Fixed! All tests pass. You're good to go."
- Message #25: User tested manually and found the bug still exists
- Message #26: User ran tests themselves - 3 tests failing

**Skills Invoked**: None (verification-before-completion skill exists but wasn't used)

**Commands Run**:
- Edit src/auth/session.ts
- (No test command was run)

**Gap Location**: Between implementation and completion claim - no verification step occurred

## Gap Classification

- **Type**: VERIFICATION_GAP
- **Root Cause**: No architectural enforcement requiring test execution before completion claims. Agent can claim tests pass without actually running them.
- **Severity**: HIGH (causes bugs in production, wastes user time, erodes trust)
- **Frequency**: RECURRING (you mentioned "again", suggesting this has happened before)
- **Impact**: User must manually verify all agent work. Bugs slip through. Significant time wasted on debugging issues that should have been caught.

## Proposed Solution

Implement a Test Verification Enforcer that architecturally prevents completion claims without evidence.

**Solution Type**: CREATE_SKILL + ADD_VERIFICATION_GATE

**Files to Create/Modify**:
- `skills/verification/test-execution-enforcer/SKILL.md` - New skill to force test execution
- `skills/verification/verification-before-completion/SKILL.md` - Update to invoke test enforcer
- `.wrangler/docs/workflow-wrappers.md` - Document integration

**Implementation Plan**:

1. **Create test-execution-enforcer skill**
   - Detects when code changes have been made
   - Identifies test command from package.json or project config
   - REQUIRES test execution before allowing completion claims
   - Collects test output as evidence
   - Compares claimed results vs actual results

2. **Integrate with verification-before-completion skill**
   - Add test-execution-enforcer as mandatory pre-completion check
   - Make it a hard blocker (cannot proceed without passing)
   - Capture test output logs

3. **Add workflow wrapper hook**
   - Trigger when agent attempts to claim completion
   - Invoke enforcer subagent
   - Block completion if tests not run or failing
   - Report discrepancy if claim doesn't match reality

4. **Write comprehensive tests**
   - Test: Skill detects code changes
   - Test: Skill blocks completion without test run
   - Test: Skill detects false claims
   - Test: Skill collects proper evidence

5. **Document and track**
   - Add examples to skill file
   - Create issue for tracking
   - Update governance docs

**Estimated Effort**: 2-3 hours

**Integration Points**:
- Integrates with existing verification-before-completion skill
- Works alongside systematic-debugging and TDD skills
- Can be expanded to check other verification types (linting, type checking, etc.)

## Constitutional Alignment

**Constitution Check**: APPROVED

**Principle Alignment**:
- Evidence over Claims: ALIGNED - Forces collection of test execution evidence
- Test-Driven Development: ALIGNED - Enforces running tests
- Systematic over Ad-Hoc: ALIGNED - Architectural enforcement, not prompts
- Verification Before Completion: ALIGNED - Core purpose of this fix
- Complexity Reduction: NEUTRAL - Adds one skill but reduces debugging complexity

**Decision Framework Application**:
- Does this reduce user burden? YES - User no longer needs to verify agent claims
- Does this prevent bugs? YES - Catches failures before user sees them
- Is this enforceable? YES - Architectural gate that can't be bypassed
- Does this scale? YES - Works for any project with tests

**Overall Assessment**: Strong alignment. This solution embodies the "evidence over claims" principle and provides architectural enforcement rather than relying on prompt engineering.

## Alternatives Considered

1. **Add reminders in prompts to run tests**
   - Description: Update system prompts to emphasize test execution
   - REJECTED because: Prompt engineering is unreliable, agents can still ignore or forget

2. **Update constitution with stronger testing principle**
   - Description: Make testing requirement more explicit in constitutional principles
   - REJECTED because: Constitution isn't architecturally enforced, same bypass problem

3. **Manual user verification (status quo)**
   - Description: User continues to verify all agent work manually
   - REJECTED because: Wastes user time, error-prone, doesn't scale

4. **Post-completion test runner**
   - Description: Run tests after agent claims completion
   - REJECTED because: Reactive instead of proactive, doesn't prevent false claims

## Risk Assessment

**Potential Risks**:
- False positives: Might block completion when tests genuinely aren't needed
  - Mitigation: Allow user override with explicit acknowledgment
- Performance: Running tests adds time
  - Mitigation: This is unavoidable and actually the point - we WANT tests run
- Integration complexity: May not work for all project types
  - Mitigation: Detect test framework, provide fallback for unknown setups

**Success Criteria**:
- Agent cannot claim "tests pass" without running tests
- Test output is captured and available for inspection
- False claims are detected and reported
- User frustration from unverified claims is eliminated

## Next Steps

Would you like me to implement this solution? (y/n)

If yes, I will:

1. Create skills/verification/test-execution-enforcer/SKILL.md with comprehensive workflow
2. Write tests for the new skill
3. Update skills/verification/verification-before-completion/SKILL.md to invoke the enforcer
4. Create a tracking issue in .wrangler/issues/
5. Verify the fix by replaying your session scenario
6. Run all existing tests to ensure no regressions
```

### Example 2: Missing Skill - Code Style Consistency

**User Input**: "Files have inconsistent formatting after multi-file refactoring"

**Expected Output**:

```markdown
# SESSION GAP ANALYSIS

## Problem Identified

After refactoring across multiple files, code formatting is inconsistent (tabs vs spaces, quote styles, import ordering).

## Session Trace

**Key Messages**:
- Message #8: User requested "Refactor the authentication module to use dependency injection"
- Messages #12-25: Agent modified 8 files in src/auth/
- Message #28: User noticed inconsistent formatting:
  - Some files use tabs, others use 2-space indent
  - Some use single quotes, others double quotes
  - Import statements have different ordering conventions

**Skills Invoked**: None relevant to code formatting

**Commands Run**: Multiple Edit operations on 8 files

**Gap Location**: After multi-file changes, before completion - no consistency check occurred

## Gap Classification

- **Type**: MISSING_SKILL
- **Root Cause**: No skill exists to verify code style consistency across modified files
- **Severity**: MEDIUM (doesn't break functionality but impacts code quality and team workflow)
- **Frequency**: RECURRING (happens whenever multi-file changes occur)
- **Impact**: Messy codebase, inconsistent style, manual cleanup needed, potential PR comments/rejections

## Proposed Solution

Create a code-style-consistency-checker skill that automatically verifies and optionally fixes formatting across modified files.

**Solution Type**: CREATE_SKILL

**Files to Create/Modify**:
- `skills/code-quality/style-consistency-checker/SKILL.md` - New skill

**Implementation Plan**:

1. **Create the skill file**
   - Detect when multiple files have been modified in one session
   - Check for common style inconsistencies:
     - Indentation (tabs vs spaces, 2 vs 4 spaces)
     - Quote styles (single vs double)
     - Import ordering
     - Line endings (CRLF vs LF)
     - Trailing whitespace

2. **Define the checking workflow**
   - Trigger: After modifications to 2+ files in same directory tree
   - Scan: Read all modified files
   - Compare: Check style consistency across files
   - Report: List all inconsistencies found with file locations
   - Offer fix: Suggest running prettier/eslint/etc. to auto-fix

3. **Integration with existing workflows**
   - Add to verification-before-completion skill as optional check
   - Can be manually invoked via /check-style-consistency
   - Auto-triggers after multi-file refactoring

4. **Write tests**
   - Test: Detects tab/space mixing
   - Test: Detects quote inconsistencies
   - Test: Detects import ordering differences
   - Test: Offers appropriate fix commands

5. **Document**
   - Add usage examples
   - Create tracking issue
   - Update code-quality skill index

**Estimated Effort**: 1-2 hours

**Integration Points**:
- Works alongside existing code-quality skills
- Can leverage prettier/eslint if available in project
- Complements TDD skills by ensuring clean code

## Constitutional Alignment

**Note**: No constitution found at `.wrangler/governance/CONSTITUTION.md`. Proceeding with general software engineering principles:
- Code quality: Maintains consistency
- Systematic over ad-hoc: Automatic checking vs manual review
- Complexity reduction: Simple check, simple fix

## Alternatives Considered

1. **Rely on pre-commit hooks**
   - Description: Assume project has pre-commit hooks for formatting
   - REJECTED because: Not all projects have them, doesn't help during development

2. **Manual user review**
   - Description: User checks formatting themselves
   - REJECTED because: Time-consuming, error-prone, easily forgotten

3. **Always run prettier/eslint after changes**
   - Description: Automatically format all modified files
   - REJECTED because: May conflict with user's style preferences, too aggressive

4. **Skill-based checking with user control**
   - Description: Check and report, let user decide whether to fix
   - APPROVED because: Gives visibility and control, non-invasive

## Risk Assessment

**Potential Risks**:
- False positives: May flag intentional style differences
  - Mitigation: Report only, don't auto-fix without approval
- Tool dependency: Assumes prettier/eslint available
  - Mitigation: Fall back to manual fix instructions if tools not found
- Performance: Checking many files might be slow
  - Mitigation: Only check modified files, skip if >20 files changed

**Success Criteria**:
- Detects common style inconsistencies accurately
- Provides actionable fix suggestions
- Runs quickly (<5 seconds for typical refactoring)
- User can accept or reject suggestions

## Next Steps

Would you like me to implement this solution? (y/n)

If yes, I will:

1. Create skills/code-quality/style-consistency-checker/SKILL.md
2. Write comprehensive tests for the skill
3. Add examples for common scenarios
4. Create a tracking issue in .wrangler/issues/
5. Test with your current refactoring scenario
6. Document usage in governance docs
```

## Success Criteria

Your analysis is successful when:

- **Accurate Classification**: Gap type correctly identified
- **Clear Root Cause**: User can understand why the failure occurred
- **Concrete Solution**: Implementation plan is specific and executable
- **Constitutional Alignment**: Solution verified against project principles
- **Thoughtful Alternatives**: Multiple options considered with clear reasoning
- **User Empowerment**: User can make informed decision to approve/reject
- **Actionable Next Steps**: Clear path forward if approved

## Metadata Tracking

After completing analysis, if the user approves implementation, you should:

1. **Create issue**: Use MCP issues_create to track the improvement
2. **Log pattern**: Update `.wrangler/cache/gap-patterns.json` (create if doesn't exist)
3. **Track metrics**: Increment gap detection counter in `.wrangler/cache/metrics.json`

Example gap pattern entry:
```json
{
  "id": "test-verification-gap-2025-11-18",
  "type": "VERIFICATION_GAP",
  "description": "Agent claims tests pass without running them",
  "frequency": 1,
  "severity": "HIGH",
  "firstOccurrence": "2025-11-18T10:30:00Z",
  "lastOccurrence": "2025-11-18T10:30:00Z",
  "proposedSolution": "skills/verification/test-execution-enforcer/SKILL.md",
  "status": "PENDING"
}
```

## Final Notes

This command is about **continuous improvement**. Every gap analysis makes wrangler better for everyone. Be thorough, be thoughtful, and always keep the user's frustration in mind - that frustration is the signal that something needs to be fixed systematically.

Remember: The goal is not just to fix this instance, but to prevent this category of failure from ever happening again.
