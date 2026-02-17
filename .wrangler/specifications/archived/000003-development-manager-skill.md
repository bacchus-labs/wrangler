---
id: "000003"
title: "Development Manager: End-to-End Feature Orchestration Skill"
type: "specification"
status: "closed"
priority: "high"
labels:
  [
    "skills",
    "orchestration",
    "development-workflow",
    "accountability",
    "audit-trail",
  ]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
---

# Development Manager: End-to-End Feature Orchestration Skill

## Problem Statement

Users need to give high-level goals (e.g., "finish the testing framework spec and implement the authentication feature") and have an AI agent act as both **project manager** and **principal engineer** to orchestrate complete implementation with:

1. **Strategic oversight** - Break down work, track progress, ensure alignment with specs
2. **Tactical execution** - Delegate to subagents efficiently (parallel/sequential)
3. **Quality enforcement** - Mandate TDD, code review, verification at every step
4. **Persistence** - Don't stop until everything is complete and verified
5. **Accountability** - Full audit trail of all decisions, delegations, verifications
6. **Completion assurance** - Verify all spec requirements met before claiming done

### Current Gaps

While wrangler has excellent **tactical** skills (TDD, code review, executing plans, subagent dispatch), there is no **strategic orchestrator** that:

- Coordinates entire feature lifecycle from spec → verified completion
- Enforces "step back and review alignment with spec" checkpoints
- Provides systematic re-verification that requirements are actually met
- Holds subagents accountable for TDD compliance and evidence
- Generates comprehensive audit trails for review
- Handles both single and multi-goal scenarios

**Existing skills** (executing-plans, subagent-driven-development) handle execution well, but lack:

- Automatic alignment checkpoints
- Manager re-verification of subagent claims
- Strategic "does this still match the spec?" reviews
- Multi-goal orchestration
- Comprehensive audit logging

## Objectives

### Primary Goal

Create a **meta-skill** that orchestrates complete feature development from high-level goals through verified completion, integrating existing workflow skills with strategic oversight and accountability.

### Secondary Goals

1. Enable "set it and forget it" development (user provides goals, agent handles everything)
2. Ensure nothing falls through cracks (systematic verification at every level)
3. Provide full audit trail (traceable decision history for debugging)
4. Support both single and multi-goal scenarios
5. Detect and correct alignment drift before too much work done wrong

## Success Criteria

### Functional Requirements

**FR1: Complete Lifecycle Orchestration**

- Input: User provides 1-N goals (spec references or descriptions)
- Output: Verified implementation with completion report and audit log
- Process: Intake → Planning → Execution → Verification → Completion

**FR2: Strategic Alignment Checkpoints**

- Every N tasks (configurable, default 3), STOP and:
  - Re-read specification requirements
  - Check: are we on track?
  - Identify any drift or missing requirements
  - Take corrective action if drift detected

**FR3: Strict Subagent Accountability**

- Every subagent dispatch includes mandatory requirements:
  - MUST follow test-driven-development skill
  - MUST provide TDD compliance certification
  - MUST show test evidence (full output)
  - MUST pass verification-before-completion
- Manager re-verifies every subagent claim independently

**FR4: Mandatory Quality Gates**

- Code review required after every task (no exceptions)
- Manager runs tests independently (doesn't trust subagent claims)
- Checks git diff to verify changes match task
- Reviews TDD certification for completeness

**FR5: Comprehensive Audit Logging**

- Every action logged to `.wrangler/logs/YYYY-MM-DD-HH-MM-SS-{feature}.jsonl`
- Log entries include: timestamp, phase, action, context, outcome
- Searchable, parseable, human-readable
- Full traceability: decision → action → verification → outcome

**FR6: Multi-Goal Support**

- Handle multiple specs/features in single invocation
- Analyze dependencies (sequential vs parallel)
- Track progress per goal
- Generate per-goal and aggregate reports

**FR7: Completion Reports**

- Generate detailed completion report in `.wrangler/memos/`
- Include: requirements met, issues completed, test evidence, code review summary
- Reference audit log for full execution trace
- Provide evidence for every claim

### Non-Functional Requirements

**NFR1: Leverage Existing Skills**

- Don't reinvent TDD, code review, plan execution
- Orchestrate existing skills as building blocks
- Add strategic layer on top of tactical skills

**NFR2: Configurable**

- Checkpoint frequency (every N tasks)
- Parallelization strategy (auto-detect or user-specified)
- Audit log format (JSONL default)
- Strictness level (strict vs lenient)

**NFR3: Resilient**

- Handle subagent failures gracefully
- Retry with different approach or escalate to user
- Detect and correct alignment drift
- Continue from checkpoint on interruption

**NFR4: Transparent**

- Clear announcements at each phase
- Real-time progress updates
- Visible quality gates (show when blocking on review)
- Audit trail readable by humans

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│             DEVELOPMENT MANAGER SKILL                       │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 1. INTAKE & PLANNING PHASE                         │   │
│  │   - Parse user goals                               │   │
│  │   - Load specs (or create if missing)              │   │
│  │   - Use brainstorming if design unclear            │   │
│  │   - Use writing-plans to create plan + issues      │   │
│  │   - Initialize audit log                           │   │
│  └────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 2. EXECUTION PHASE (loop per task)                 │   │
│  │   - Get next task from MCP issues (status=open)    │   │
│  │   - Analyze dependencies → decide parallel/seq     │   │
│  │   - Dispatch subagent with strict contract         │   │
│  │   - Wait for subagent completion                   │   │
│  │   - Log: dispatch action                           │   │
│  └────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 3. VERIFICATION PHASE (per task)                   │   │
│  │   - Subagent returns with claim                    │   │
│  │   - Manager re-verifies independently:             │   │
│  │     • Run tests (don't trust claim)                │   │
│  │     • Check git diff                               │   │
│  │     • Verify TDD certification provided            │   │
│  │   - Dispatch code-review subagent (mandatory)      │   │
│  │   - If review fails: retry or escalate             │   │
│  │   - Mark issue complete via MCP (only if verified) │   │
│  │   - Log: verification evidence                     │   │
│  └────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 4. ALIGNMENT CHECKPOINT (every N tasks)            │   │
│  │   - Trigger: every 3-5 tasks (configurable)        │   │
│  │   - Re-read specification requirements             │   │
│  │   - Check: requirements met vs pending             │   │
│  │   - Use reviewing-implementation-progress          │   │
│  │   - Detect drift (missing/extra functionality)     │   │
│  │   - Corrective action: create issues, adjust plan  │   │
│  │   - Log: alignment check result                    │   │
│  └────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  │  Loop back to Execution Phase until all complete   │   │
│                         ↓                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 5. COMPLETION PHASE                                │   │
│  │   - Verify all issues complete (issues_all_complete) │   │
│  │   - Re-read spec: verify ALL requirements met      │   │
│  │   - Run full test suite independently              │   │
│  │   - Final code review of entire implementation     │   │
│  │   - Use finishing-a-development-branch             │   │
│  │   - Generate completion report                     │   │
│  │   - Log: final completion                          │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Skill Integration

The development manager **orchestrates** existing skills:

| Phase                  | Skill Used                                     | Purpose                                  |
| ---------------------- | ---------------------------------------------- | ---------------------------------------- |
| **Intake**             | brainstorming                                  | Refine vague requirements → clear design |
| **Planning**           | writing-plans                                  | Create detailed plan + MCP issues        |
| **Execution**          | subagent-driven-development OR executing-plans | Dispatch subagents per task              |
| **Parallel**           | dispatching-parallel-agents                    | For independent tasks                    |
| **Per-Task Review**    | requesting-code-review → code-review           | Mandatory after each task                |
| **Checkpoint**         | reviewing-implementation-progress              | Periodic spec alignment check            |
| **Final Verification** | verification-before-completion                 | Evidence before claiming done            |
| **Completion**         | finishing-a-development-branch                 | Merge/PR/cleanup workflow                |
| **Every Subagent**     | test-driven-development                        | TDD enforcement                          |

### Audit Log Schema

```typescript
type AuditLogEntry = {
  timestamp: string; // ISO 8601
  phase:
    | "intake"
    | "planning"
    | "execution"
    | "verification"
    | "checkpoint"
    | "completion";
  action: string; // dispatch_subagent, verify_tests, alignment_check, etc.

  // Context (varies by action)
  issue?: string; // Issue ID
  spec?: string; // Spec file path
  plan?: string; // Plan file path
  task?: string; // Task description
  subagent_id?: string; // Subagent identifier
  reviewer_id?: string; // Code reviewer identifier

  // Outcomes
  result?: "success" | "failure" | "blocked";
  claim?: string; // What subagent claimed
  verified?: boolean; // Did manager verify?
  evidence?: string; // Path to evidence file or inline output

  // Metadata
  command?: string; // Command executed
  exit_code?: number; // Command exit code
  drift_detected?: boolean; // Alignment drift?
  requirements_met?: number; // Count of requirements met
  requirements_total?: number; // Total requirements
};
```

### Subagent Contract Template

When dispatching subagents, include this mandatory contract:

```markdown
You are implementing [Task N] from [plan-file].

MANDATORY REQUIREMENTS (non-negotiable):

1. Follow test-driven-development skill (RED-GREEN-REFACTOR)
2. Provide TDD Compliance Certification (see verification-before-completion)
   - For each function: test name, watched fail, failure message, watched pass
3. Run tests and show COMPLETE output (not summary, full output)
4. Do NOT claim success without evidence
5. Follow verification-before-completion skill before reporting back

REPORT BACK WITH:

- What you implemented (description)
- Test evidence (full command output showing all tests pass)
- TDD certification (table with: function, test, watched fail?, watched pass?)
- Files changed (list with git diff --stat)
- Any blockers or issues encountered

IF YOU SKIP TDD OR VERIFICATION:
Your work will be rejected and you'll be re-dispatched to do it correctly.

WORKING DIRECTORY: [directory]
READ THE TASK CAREFULLY: [task details]
```

## Implementation Specification

### Phase 1: Core Orchestration (MVP)

**Deliverables:**

1. `skills/development-manager/SKILL.md` - Main skill file
2. `skills/development-manager/templates/subagent-contract.md` - Subagent dispatch template
3. `skills/development-manager/templates/completion-report.md` - Report template

**Core Features:**

- Single-goal orchestration (one spec/feature)
- Sequential execution only (no parallelization yet)
- Manager re-verification (run tests, check diff, verify TDD cert)
- Mandatory code review per task
- Basic audit log (JSONL format)
- Completion report generation

**Skill Behavior:**

1. Parse user goal → load spec
2. Use writing-plans → create plan + issues via MCP
3. Loop through issues (status=open):
   - Dispatch subagent with strict contract
   - Wait for return
   - Re-verify independently (run tests, check git)
   - Dispatch code review
   - Mark complete only if verified
   - Log everything
4. When all issues complete:
   - Re-read spec, verify all requirements met
   - Run full test suite
   - Final code review
   - Use finishing-a-development-branch
   - Generate completion report

### Phase 2: Advanced Features

**Deliverables:**

1. Alignment checkpoint logic
2. Drift detection and correction
3. Parallel execution support
4. Enhanced completion reports

**New Features:**

- Configurable checkpoint frequency (every N tasks)
- Automatic drift detection (missing/extra requirements)
- Corrective action (create new issues on drift)
- Parallel dispatch for independent tasks
- Enhanced audit log with metrics

### Phase 3: Multi-Goal Support

**Deliverables:**

1. Multi-goal parsing and orchestration
2. Dependency analysis
3. Aggregate reporting

**New Features:**

- Handle multiple specs/features in one invocation
- Analyze dependencies (sequential vs parallel goals)
- Per-goal progress tracking
- Aggregate completion report

### Phase 4: Enhanced Audit & Observability

**Deliverables:**

1. Searchable audit logs
2. Metrics collection
3. Optional web UI for log review

**New Features:**

- Structured log indexing
- Queryable logs (filter by phase, action, outcome)
- Metrics dashboard (tasks completed, review pass rate, etc.)
- Timeline visualization

## Usage Examples

### Example 1: Single Feature

```
User: "Implement the authentication feature from specifications/auth-system.md"

Manager:
═══════════════════════════════════════════════════════════
🎯 SKILL: development-manager
═══════════════════════════════════════════════════════════
Managing complete implementation of authentication feature
from spec through verified completion with full audit trail.

[Phase 1: Intake & Planning]
✓ Loaded spec: specifications/auth-system.md
✓ Requirements found: 12
✓ Using writing-plans skill...
✓ Created plan: plans/2025-11-20-auth-system.md
✓ Created 8 issues via MCP: 000014-000021
✓ Initialized audit log: .wrangler/logs/2025-11-20-15-30-00-auth-system.jsonl

[Phase 2: Execution - Task 1/8]
→ Issue 000014: Implement JWT token generation
→ Dispatching subagent with strict TDD contract...
→ Subagent agent-abc123 working...
✓ Subagent returned: "Complete, 8/8 tests passing"

[Phase 3: Verification - Task 1/8]
→ Manager re-verification (don't trust claims):
  $ npm test tests/auth/token.test.ts
  ✓ Output shows 8/8 tests pass
  ✓ TDD certification provided (all functions certified)
  ✓ Git diff matches task scope
→ Dispatching code-review subagent...
✓ Code review approved (0 critical, 0 important)
✓ Issue 000014 marked complete

[Phase 2: Execution - Task 2/8]
[... repeat for tasks 2-3 ...]

[Phase 4: Alignment Checkpoint (after task 3)]
→ Re-reading specification requirements...
→ Requirements status: 3/12 met, 9 pending
→ Drift analysis: NONE detected
→ Continue execution: YES

[... continue through remaining tasks ...]

[Phase 5: Completion]
✓ All 8 issues complete (verified via MCP)
✓ Re-reading spec: all 12 requirements met
✓ Full test suite: 45/45 passing
✓ Final code review: Approved
✓ Using finishing-a-development-branch...
✓ Generated completion report

IMPLEMENTATION COMPLETE
→ Report: .wrangler/memos/2025-11-20-auth-system-completion.md
→ Audit log: .wrangler/logs/2025-11-20-15-30-00-auth-system.jsonl
→ Duration: 4h 15m
→ Issues: 8/8 complete
→ Requirements: 12/12 met
→ Tests: 45/45 passing
→ Code reviews: 8/8 approved
```

### Example 2: Multi-Goal

```
User: "Finish the testing framework spec AND implement user management"

Manager:
═══════════════════════════════════════════════════════════
🎯 SKILL: development-manager
═══════════════════════════════════════════════════════════
Managing 2 goals: testing framework, user management
Will orchestrate sequentially with full accountability

[Multi-Goal Analysis]
Goal 1: Testing framework (specifications/testing-framework.md)
Goal 2: User management (specifications/user-management.md)
Strategy: Sequential (Goal 1 → Goal 2, no dependencies)

[Goal 1: Testing Framework]
[... same flow as single goal ...]
✓ Goal 1 complete

[Transition]
→ Goal 1 verified complete, starting Goal 2
→ No dependency conflicts detected

[Goal 2: User Management]
[... same flow ...]
✓ Goal 2 complete

[Final Multi-Goal Report]
BOTH GOALS COMPLETE
→ Goals: 2/2 complete
→ Total issues: 15
→ Total duration: 8h 23m
→ Audit logs: .wrangler/logs/2025-11-20-*-multi-goal-*.jsonl
→ Reports: .wrangler/memos/2025-11-20-*-completion.md (x2)
```

## Completion Report Format

`.wrangler/memos/YYYY-MM-DD-{feature}-completion.md`

```markdown
# {Feature Name} - Completion Report

**Feature**: {Feature description}
**Specification**: {spec file path}
**Plan**: {plan file path}
**Started**: {ISO timestamp}
**Completed**: {ISO timestamp}
**Duration**: {human readable}

## Summary

✓ All {N} requirements met
✓ All {M} issues completed
✓ All code reviewed and approved
✓ Full test suite passing ({X}/{X} tests)
✓ {0 or N} alignment drift(s) detected and corrected

## Issues Completed

| Issue | Task          | Subagent   | TDD? | Review   | Status   |
| ----- | ------------- | ---------- | ---- | -------- | -------- |
| {ID}  | {description} | {agent ID} | ✓    | Approved | Complete |

[... all issues ...]

## Alignment Checkpoints

- Checkpoint 1 (after task {N}): {✓ On track | ⚠ Drift detected}
- Checkpoint 2 (after task {M}): {status}
  [... all checkpoints ...]

## Test Evidence
```

$ {test command}

{full test output showing all passing}

```

## Code Review Summary

- Total reviews: {N}
- Critical issues: {0}
- Important issues: {N} (all fixed)
- Minor issues: {N} (noted)
- Approval rate: 100%

## Audit Trail

Full execution log: {audit log path}
Total log entries: {N}
Phases executed: {list}

## Files Changed

```

{git diff --stat output}

```

## Next Steps

✓ Feature complete and ready for merge
✓ Used finishing-a-development-branch skill
→ {merge decision or PR created}

## Certification

I certify that:
- ✓ All requirements from specification met
- ✓ All tasks followed TDD (RED-GREEN-REFACTOR)
- ✓ All code reviewed and approved
- ✓ All tests passing
- ✓ No shortcuts taken
- ✓ Audit trail complete and accurate
```

## Configuration Options

The skill accepts optional configuration:

```markdown
## Configuration

**checkpoint_frequency**: every N tasks (default: 3)
**parallelization**: "auto" | "sequential" | "parallel" (default: "auto")
**audit_format**: "jsonl" | "json" | "markdown" (default: "jsonl")
**strictness**: "strict" | "lenient" (default: "strict")

- strict: Reject any verification failure, no overrides
- lenient: Allow manager to override for minor issues
  **max_retries**: N retries for failed tasks (default: 2)
```

## Error Handling

### Subagent Failures

**Scenario**: Subagent fails to complete task after N retries

**Action**:

1. Log failure with details
2. Mark issue as "blocked"
3. Escalate to user with:
   - Task description
   - Attempts made
   - Failure reasons
   - Suggested next steps
4. Wait for user input

### Alignment Drift

**Scenario**: Checkpoint detects missing requirements

**Action**:

1. Log drift detection
2. Create new issues for missing requirements
3. Update plan document
4. Insert new issues into queue
5. Continue execution

### Code Review Failures

**Scenario**: Code review returns Critical issues

**Action**:

1. Log review failure
2. DO NOT mark issue complete
3. Dispatch fix subagent with specific issues to address
4. Re-verify after fix
5. Re-request code review
6. Only proceed when approved

## Testing Strategy

### Unit Testing (Not Applicable)

This is a skill (markdown documentation), not code, so no unit tests.

### Integration Testing

Test with real scenarios:

1. Single-feature implementation (auth system)
2. Multi-goal scenario (2 specs)
3. Alignment drift scenario (missing requirement)
4. Subagent failure scenario (task fails repeatedly)
5. Code review failure scenario (Critical issues found)

### Success Metrics

- All issues marked complete
- All spec requirements verified
- Audit log contains expected entries
- Completion report generated
- No unverified claims in log

## Open Questions

1. **Checkpoint frequency**: Every 3 tasks optimal? Make configurable?
2. **Parallel execution limits**: Max N concurrent subagents?
3. **Failure threshold**: How many retries before escalation?
4. **Audit log retention**: Rotation policy? Size limits?
5. **User interruption**: How to resume from checkpoint?

## Dependencies

### Required Skills (Must Exist)

- brainstorming
- writing-plans
- test-driven-development
- requesting-code-review
- code-review
- verification-before-completion
- reviewing-implementation-progress
- finishing-a-development-branch

### Optional Skills (Enhance Functionality)

- subagent-driven-development (for sequential execution)
- dispatching-parallel-agents (for parallel execution)
- systematic-debugging (for investigating failures)

### MCP Tools

- issues_create
- issues_list
- issues_update
- issues_get
- issues_mark_complete
- issues_all_complete

## Implementation Phases

### Phase 1: MVP (Week 1)

- Core orchestration (single goal, sequential)
- Manager re-verification
- Mandatory code review
- Basic audit log (JSONL)
- Completion report

**Success**: Can take one spec and implement it end-to-end with full accountability.

### Phase 2: Advanced (Week 2)

- Alignment checkpoints
- Drift detection and correction
- Parallel execution support
- Enhanced reporting

**Success**: Detects and corrects drift, executes independent tasks in parallel.

### Phase 3: Multi-Goal (Week 3)

- Multiple specs/features in one invocation
- Dependency analysis
- Aggregate reporting

**Success**: Can handle "finish A and B and C" in single command.

### Phase 4: Observability (Week 4)

- Searchable audit logs
- Metrics and analytics
- Optional web UI

**Success**: Can query "show me all code review failures" or "what took the longest?".

## Acceptance Criteria

**AC1: End-to-End Orchestration**

- Given: User provides spec reference
- When: Skill invoked
- Then: Spec → Plan → Issues → Execution → Verification → Completion with no intervention

**AC2: Manager Re-Verification**

- Given: Subagent claims "tests passing"
- When: Verification phase
- Then: Manager independently runs tests and confirms claim before marking complete

**AC3: Alignment Checkpoints**

- Given: 3 tasks completed
- When: Checkpoint triggered
- Then: Spec re-read, requirements checked, drift analysis performed, logged

**AC4: Audit Trail Completeness**

- Given: Feature implementation complete
- When: Reviewing audit log
- Then: Can trace every decision, delegation, verification from start to finish

**AC5: No Unverified Claims**

- Given: Any completion claim
- When: Reviewing log
- Then: Evidence exists (test output, git diff, code review approval)

## Risks and Mitigations

| Risk                          | Impact | Mitigation                                                  |
| ----------------------------- | ------ | ----------------------------------------------------------- |
| Subagent doesn't follow TDD   | High   | Strict contract, manager re-verification, reject if no cert |
| Alignment drift undetected    | High   | Mandatory checkpoints every N tasks                         |
| Audit log grows unbounded     | Medium | Rotation policy, compression, archival                      |
| User interrupts mid-execution | Medium | Checkpoint-based resume capability                          |
| Parallel execution conflicts  | Medium | Phase 1: sequential only, add parallel carefully in Phase 2 |

## Related Documentation

- `.wrangler/memos/2025-11-20-skill-announcement-format.md` - Skill announcement standard
- `skills/executing-plans/SKILL.md` - Batch execution workflow
- `skills/subagent-driven-development/SKILL.md` - Per-task subagent dispatch
- `skills/verification-before-completion/SKILL.md` - Evidence requirements
- `docs/MCP-USAGE.md` - Issue tracking via MCP tools

## Changelog

- 2025-11-20: Initial specification created
