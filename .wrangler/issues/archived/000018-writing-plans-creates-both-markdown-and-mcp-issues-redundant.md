---
id: "000018"
title: "Flaw: writing-plans creates both plan file AND MCP issues, creating redundant artifacts and unclear source of truth"
type: "issue"
status: "closed"
priority: "medium"
labels: ["skills", "workflow-flaw", "process", "redundancy"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Flaw Description

**writing-plans** skill says:

> Create both:
> 1. **Plan file** (`plans/YYYY-MM-DD-PLAN_<spec>.md`) - Detailed implementation guide
> 2. **MCP issues** (via `issues_create`) - Tracked tasks in issue system

This creates significant redundancy:

1. **Two places for same information**: Plan file has tasks 1-N with steps, code examples, acceptance criteria. MCP issues have same tasks 1-N with (supposedly) same information.

2. **Synchronization problem**: If plan changes, do issues need updating? If issues change (discovered complexity, different approach), does plan need updating?

3. **Unclear source of truth**: Which is authoritative? Plan file or issues?

4. **Double maintenance burden**: Change requires updating both plan file and all issues.

5. **Tool complexity**: writing-plans has 4 phases, with Phase 3 entirely dedicated to converting plan tasks into MCP issues.

## Affected Skills

- `writing-plans/SKILL.md`
- `executing-plans/SKILL.md`
- `subagent-driven-development/SKILL.md`

## Specific Examples

### Example 1: writing-plans Phase 2 creates detailed plan draft

Phase 2 says:
```markdown
### Phase 2: Draft Plan Document

1. Create draft plan at `plans/.drafts/YYYY-MM-DD-PLAN_<spec>.md`
2. Break specification into logical tasks
3. For each task, document:
   - Exact files to create/modify
   - Complete code examples
   - Test requirements
   - Verification steps
   - Commit message
```

Then Phase 3 says create MCP issues with:
```markdown
## Implementation Steps
1. Write failing test
2. Implement minimal code to pass
3. Verify tests pass
4. Commit changes

## Code Examples
[Include key code snippets from plan]

## Acceptance Criteria
- [ ] Test written and failing (RED)
- [ ] Implementation passes test (GREEN)
...
```

**Problem:** This is duplicating information. The plan has "Complete code examples" and "Verification steps". The issue has "Code Examples" and "Acceptance Criteria". Why maintain both?

### Example 2: executing-plans and subagent-driven-development reference different artifacts

**executing-plans** Step 1:
```markdown
### Step 1: Load and Review Plan

1. Read plan file
2. Review critically - identify any questions or concerns about the plan
```

**subagent-driven-development** Step 1:
```markdown
### 1. Load Plan

Read plan file, create TodoWrite with all tasks.
```

**But neither skill mentions MCP issues at all!**

If writing-plans creates issues, why don't the execution skills reference them?

### Example 3: Unclear which artifact to update during execution

During execution, agent discovers Task 3 is more complex than planned. Should they:
- Update the plan file?
- Update the MCP issue?
- Update both?
- Update neither (it's already in execution)?

**writing-plans** doesn't answer this. Neither does **executing-plans** or **subagent-driven-development**.

## Impact

**Medium** - This creates confusion and wasted effort:

1. **Time waste**: Creating both artifacts doubles planning time
2. **Confusion**: Agents unsure which to reference during execution
3. **Sync issues**: Changes made to one but not the other
4. **Maintenance burden**: Future changes require updating multiple places
5. **Tool complexity**: writing-plans is unnecessarily complex with Phase 3 dedicated to issue creation

**Why not high:** Work still gets done, but with unnecessary overhead.

## Suggested Fix

### Option A: Issues ONLY (eliminate plan file)

**Rationale:** If issues have all the information (code examples, steps, acceptance criteria), why have a separate plan file?

Changes:
1. **writing-plans** creates issues ONLY (no plan file)
2. **executing-plans** loads issues instead of plan file
3. **subagent-driven-development** loads issues instead of plan file
4. Issues become the single source of truth

**Pros:**
- Single source of truth
- Issues trackable, searchable, filterable via MCP
- No synchronization issues
- Less time spent on planning

**Cons:**
- Harder to see "big picture" (multiple issues vs single document)
- Issues may not render as nicely for long-form content
- Can't version control plan file easily (issues are in separate files)

### Option B: Plan file ONLY (eliminate MCP issues)

**Rationale:** Plan file is comprehensive, version controlled, easy to review. Why duplicate into issues?

Changes:
1. **writing-plans** creates plan file ONLY (no MCP issues)
2. **executing-plans** loads plan file, creates TodoWrite from tasks
3. **subagent-driven-development** loads plan file, dispatches subagent per task
4. Plan file becomes single source of truth

**Pros:**
- Single source of truth
- Easier to review entire plan
- Version controlled with git
- Simpler writing-plans skill (remove Phase 3)

**Cons:**
- Lose MCP tracking/search/filter capabilities
- TodoWrite todos are ephemeral (lost between sessions)
- No persistent tracking of completion status

### Option C: Plan file for DESIGN, Issues for TRACKING (recommended)

**Rationale:** Different purposes - plan describes HOW, issues track WHAT'S DONE.

Changes:
1. **writing-plans** creates:
   - **Plan file**: Detailed implementation guide (HOW to implement)
     - Architecture decisions
     - Code examples
     - Patterns to follow
     - Verification approaches
   - **MCP issues**: High-level task tracking (WHAT needs doing)
     - Task titles only (no detailed steps)
     - Dependencies between tasks
     - Status tracking (open/in_progress/closed)
     - Brief description (1-2 sentences)

2. **executing-plans** and **subagent-driven-development**:
   - Load plan file for HOW to implement
   - Load issues for WHAT to work on and track status
   - Update issue status as tasks complete
   - Don't update plan file during execution

3. Make distinction explicit:
   ```markdown
   ## Plan File vs Issues

   **Plan file (plans/YYYY-MM-DD-PLAN_<spec>.md):**
   - Detailed HOW-TO guide
   - Read-only during execution
   - Complete code examples
   - Architecture decisions
   - Implementation patterns

   **MCP issues:**
   - High-level WHAT-TO-DO tracking
   - Updated during execution (status changes)
   - Titles and brief descriptions only
   - Dependencies between tasks
   - No detailed implementation steps
   ```

**Pros:**
- Clear separation of concerns
- Plan file is implementation guide (comprehensive)
- Issues are tracking mechanism (lightweight)
- No duplication (different information in each)
- Status tracking without duplicating implementation details

**Cons:**
- Still maintaining two artifacts (but different purposes)
- Need to keep them conceptually aligned

## Recommended Fix: Option C

Update **writing-plans** Phase 3 to create lightweight tracking issues:

```markdown
### Phase 3: Create MCP Issues (Tracking Only)

For each task in the plan, call `issues_create` with:

```typescript
{
  title: "Task N: [Short action-oriented title]",
  description: `## Task Overview
[1-2 sentence summary from plan]

**Implementation guide:** See plans/YYYY-MM-DD-PLAN_<spec>.md Task N for detailed steps, code examples, and verification approach.

## Dependencies
- Requires completion of: Task [N-1]
`,
  type: "issue",
  status: "open",
  priority: "medium",
  labels: ["plan-step", "implementation"],
  project: "[specification filename]"
}
```

**Note:** Issues are for tracking only. Implementation details are in plan file.
```

Update **executing-plans** and **subagent-driven-development** to clarify they reference plan for implementation details but update issues for status tracking.

## Verification

After fix:
1. Agent creates plan file with detailed implementation guide
2. Agent creates lightweight tracking issues
3. Agent starts execution
4. Agent reads plan file for HOW to implement
5. Agent marks issue as in_progress
6. Agent implements according to plan
7. Agent marks issue as closed
8. No confusion about which to update or reference

## Resolution

**Status:** CLOSED

**Fix implemented:** Updated `skills/writing-plans/SKILL.md` to make MCP issues the source of truth.

**Changes made:**
1. Updated skill description to emphasize "creates tracked MCP issues" with "optional reference plan file"
2. Changed overview to state "MCP issues are the source of truth - each tracked task contains complete implementation details"
3. Made plan file OPTIONAL (for architecture overview and design decisions only)
4. Renamed "Plan Document Header" to "Optional Plan Document (Reference Only)"
5. Updated Phase 3 to "Create MCP Issues (Source of Truth)" with complete implementation details:
   - All 5 TDD steps with exact code examples
   - Exact commands with expected output
   - Complete acceptance criteria
   - Added note: "Issues are the single source of truth - include complete code examples and exact commands"
   - Added note: "If creating optional plan file, it should reference issues, NOT duplicate their content"
6. Replaced "Task Structure" section with "MCP Issue Content Requirements" that clarifies:
   - What MUST be in issues (exact paths, complete code, exact commands, all 5 TDD steps)
   - What should NOT be in issues (architecture rationale, design alternatives - goes in optional plan file)
7. Updated "Remember" section to emphasize MCP issues as source of truth
8. Updated Phase 2 to "Plan Task Breakdown" (removed "Draft Plan Document")
9. Updated execution handoff to list issues first, plan file second (if created)
10. Updated checklist to ensure "Every task has corresponding MCP issue with COMPLETE details"

**Result:** 
- No duplication between plan file and issues
- Clear separation: issues = implementation details, plan file = architecture context
- Single source of truth for what needs to be done (MCP issues)
- Optional reference documentation for why/how decisions were made (plan file)
