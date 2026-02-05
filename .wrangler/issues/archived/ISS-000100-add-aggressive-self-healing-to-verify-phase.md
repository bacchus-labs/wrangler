---
id: ISS-000100
title: Add aggressive self-healing to VERIFY phase
type: issue
status: closed
priority: high
labels:
  - implement-spec-v2-improvements
createdAt: '2026-02-03T20:29:34.027Z'
updatedAt: '2026-02-03T20:33:15.057Z'
project: implement-spec-v2-improvements
---
## Description

Replace the binary 100% quality gate in VERIFY phase with an aggressive self-healing workflow that auto-fixes most compliance gaps before escalating to the user.

## Context

Reference: RCA recommendations and conversation design decisions

Current VERIFY phase stops at any compliance < 100% and escalates immediately. This creates false failures for minor gaps like missing tests or documentation. Instead, VERIFY should attempt to fix gaps autonomously and only escalate for fundamental requirement failures.

## Files

- Modify: `skills/implement-spec-v2/SKILL.md` (lines ~416-427)

## Implementation Steps

**Step 1: Replace existing Quality Gate section**

Find and replace the current quality gate section (lines 416-427) with new self-healing workflow:

```markdown
### Quality Gate & Self-Healing

**Goal**: Achieve >= 95% compliance through autonomous remediation.

**Self-Healing Workflow**:

1. **Initial Compliance Audit**
   - Run compliance check
   - Calculate compliance percentage
   - Categorize gaps

2. **Gap Categorization**
   
   For each unmet acceptance criterion, classify:
   
   - **AUTO_FIX_TEST**: Missing test coverage
   - **AUTO_FIX_DOC**: Missing documentation
   - **AUTO_FIX_EDGE**: Missing edge case handling
   - **SEARCH_RETRY**: Evidence likely exists but not found
   - **FUNDAMENTAL_GAP**: Core requirement not implemented (planning failure)

3. **Autonomous Remediation** (max 3 iterations)
   
   For AUTO_FIX_* gaps:
   - Create supplemental MCP issue with specific requirement
   - Execute using implement skill
   - Commit changes
   - Re-run compliance audit
   - Loop until compliance >= 95% OR 3 iterations reached OR no more auto-fixable gaps

4. **Quality Gate Decision**
   
   | Compliance | Behavior |
   |-----------|----------|
   | **>= 95%** | ✅ PASS → Document any gaps-fixed in PR, proceed to PUBLISH |
   | **90-94%** | ⚠️ PASS WITH WARNINGS → Document minor gaps in PR, proceed to PUBLISH |
   | **< 90%** | ❌ FAIL → Escalate to user with detailed gap analysis |

5. **Escalation Format** (if < 90%)
   
   ```markdown
   VERIFY Phase: Compliance Below Threshold
   
   Current compliance: X%
   Quality gate: 90% required
   
   Self-healing attempted:
   - Created and executed Y supplemental tasks
   - Fixed Z auto-fixable gaps
   - Remaining gaps: W
   
   Gap Analysis:
   - FUNDAMENTAL_GAP: [list core requirements not implemented]
   - SEARCH_RETRY failures: [list evidence not found after retries]
   
   Options:
   1. Review and approve current implementation (partial delivery)
   2. Let me create additional tasks for remaining gaps
   3. Abort session and revisit planning
   
   Your decision?
   ```

**Critical Rules**:
- NEVER escalate for missing tests/docs/edge cases - auto-fix them
- ONLY escalate for fundamental requirement gaps or after self-healing exhaustion
- Document all self-healing activity in PR description
```

**Step 2: Add session logging for self-healing**

Add instructions to log each self-healing iteration:

```
session_phase(
  sessionId: SESSION_ID,
  phase: "verify-remediation",
  status: "started",
  metadata: {
    iteration: N,
    gaps_to_fix: GAP_COUNT,
    gap_types: ["AUTO_FIX_TEST", ...]
  }
)
```

**Step 3: Update compliance calculation logic**

Update the compliance percentage section to clarify the new thresholds:

```markdown
6. **Calculate compliance percentage**

   COMPLIANCE = (criteria_met / total_criteria) * 100
   
   Thresholds:
   - >= 95%: Excellent (proceed immediately)
   - 90-94%: Good with minor gaps (proceed with warnings)
   - < 90%: Needs work (escalate after self-healing attempts)
```

**Step 4: Add PR description update for self-healing**

Add instruction to document self-healing in PR:

```markdown
7. **Document self-healing in PR** (if any remediation occurred)

   Append to PR body:
   
   ```markdown
   ### Compliance Self-Healing
   
   During verification, the following gaps were auto-fixed:
   - Created ISS-XXXXX: Added missing test for feature X
   - Created ISS-XXXXX: Added documentation for API Y
   - Created ISS-XXXXX: Added edge case handling for Z
   
   Final compliance: 96%
   ```
```

## Acceptance Criteria

- [ ] Self-healing workflow replaces binary quality gate
- [ ] Gap categorization logic documented
- [ ] 3 quality gate levels (95%, 90%, <90%)
- [ ] Auto-fix logic for tests/docs/edge cases
- [ ] Escalation only for fundamental gaps
- [ ] Session logging for remediation iterations
- [ ] PR documentation of self-healing activity
- [ ] Max 3 remediation iterations enforced

## Dependencies

Requires completion of: ISS-000099 (REVIEW phase added)

---
**Completion Notes (2026-02-03T20:33:15.051Z):**
Replaced binary quality gate with aggressive self-healing workflow. VERIFY now auto-fixes missing tests/docs/edge cases before escalating. 3-level quality gates (95%, 90%, <90%) with autonomous remediation loop.
