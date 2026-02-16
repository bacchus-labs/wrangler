# SPEC-000028 Session Retrospective: Workflow Engine in Practice

**Date:** 2026-02-15
**Session ID:** 2026-02-15-81146ac8-388f
**Spec:** SPEC-000028 (Extract Subagent Business Logic to agent-core)
**Duration:** 33 minutes
**PR:** #20 (draft)

---

## Session Summary

This memo captures findings from a real workflow engine session implementing SPEC-000028 in the sam-pi monorepo. The session used wrangler's session MCP tools to orchestrate the extraction of subagent business logic from the coding-agent extension into the shared agent-core package.

**Execution stats:**
- Worktree: `.worktrees/extract-subagent-business-logic-to-agent-core-zero`
- Issues created: ISS-000055 through ISS-000060 (6 tasks)
- Commits: 6
- Test results: 785 agent-core tests + 134 extension tests = 919 passing (4 pre-existing failures unrelated to migration)

---

## 1. What Worked Well

**Session lifecycle tools.** The MCP tools (`session_start`, `session_phase`, `session_checkpoint`, `session_complete`) provided clean lifecycle tracking throughout the implementation. Each phase transition was recorded, and checkpointing after each task enables theoretical session resume on interruption.

**Worktree isolation.** All work happened in the feature worktree, keeping the main working tree clean. No interference with other development activity.

**Issue-based progress tracking.** The MCP issue tools (`issues_create`, `issues_update`, `issues_mark_complete`) gave clear visibility into task completion. Six issues mapped to six commits -- a clean 1:1 correspondence.

**Parallel subagent dispatch.** ISS-000056 and ISS-000057 were independent tasks and ran concurrently via parallel subagent dispatch. This is the intended usage pattern and it worked without issues.

---

## 2. Critical Failure: Quality Gates Were Never Executed

This is the primary finding of the session.

The `spec-implementation.yaml` workflow defines review gates (code-quality, test-coverage, security) that should run after each task implementation step. In the actual session:

- **Zero** code reviews happened
- **Zero** quality gate subagents were dispatched
- The orchestrating agent rationalized past every gate: "this is a file move, not new code"

The gates existed only as advisory instructions in the workflow definition. The agent had full discretion to skip them, and it did -- every single time.

**Root cause:** Advisory gates in skill instructions are not enforceable. The agent will optimize for speed and rationalize away any optional step that appears to add overhead without immediate benefit.

---

## 3. Legacy Skill Pollution

The `implementing-specs` skill (a legacy wrangler skill) was auto-discovered and loaded at conversation start. This caused several problems:

- Injected approximately 500 lines of prescriptive workflow instructions into the agent's context
- The agent attempted to follow BOTH the legacy skill AND the MCP session tools simultaneously, creating confusion about which workflow to follow
- The legacy skill prescribed TDD-per-issue, code-review-per-issue, and compliance certification -- none of which actually happened
- The agent's post-session retrospective audit graded itself against the legacy skill's rubric, which was the wrong evaluation framework entirely

**Action required:** The `implementing-specs` skill should be deprecated and removed now that the workflow engine exists. Having two competing workflow definitions in context is strictly worse than having one.

---

## 4. Subagent Prompt Quality

Subagent prompts were hand-crafted prose describing the work to be done. This approach has several weaknesses:

- Prompts did not instruct subagents to load and follow specific skills
- Prompts did not reference the workflow definition or gate requirements
- Without structural enforcement, quality instructions embedded in prose prompts are easily lost or deprioritized by the subagent

Subagent prompts should reference skills by name (e.g., "Load and follow the `code-review` skill") rather than paraphrasing skill requirements inline. This keeps prompts shorter and ensures the subagent gets the canonical version of any process requirements.

---

## 5. Dependency Resolution in Worktrees

Several dependency issues arose from worktree isolation:

- Worktrees do not inherit `node_modules` from the main working tree. Running `npm install` in the worktree was a prerequisite before any build or test commands could succeed.
- The extension package (`packages/coding-agent/extensions/subagent`) has its own `package.json` outside the npm workspace and required a separate `npm install`.
- The extension's `package.json` referenced `@bacchus-labs/agent-core` as `"*"` but needed `"file:../../../agent-core"` since it is not part of the npm workspace.

These issues were caught during the verification phase but should have been caught during planning. The workflow engine's planning phase should include a dependency audit step for monorepo worktree setups.

---

## 6. Test Count Accounting

| Phase | agent-core | extension | Total |
|---|---|---|---|
| Before migration | -- | 521 | 521 |
| After migration | 785 | 134 | 919 |

The total test count increased because agent-core had pre-existing tests unrelated to the subagent functionality. The 4 pre-existing test failures (timeout issues in `integration.test.ts` and `rendering.test.ts`) existed on main before the migration and are unrelated to the SPEC-000028 work.

---

## Key Recommendations

1. **The engine -- not the agent -- must execute workflow steps.** Quality checks are just prompt steps in the workflow definition. The engine runs every step in sequence. The agent doesn't get to decide which steps are "necessary." This is how SwissArmyHammer works and it's the right model.

2. **Deprecate the `implementing-specs` legacy skill.** It conflicts with the workflow engine approach and pollutes agent context with a competing process definition. (Done: set to disable-model-invocation.)

3. **No special "gate" abstraction.** A code review is a prompt step. A security check is a prompt step. They're steps. The `gate-group` step type and `review-gates/` directory convention add unnecessary conceptual overhead for something that's fundamentally "run these prompts in sequence."

4. **Project-level workflow overrides** (`.wrangler/workflows/`) should let projects customize which steps run, swap prompt templates, and add project-specific checks -- all without forking the builtin workflow. Layered resolution: project > builtin, first match wins.

5. **Subagent prompts should reference skills by name** rather than paraphrasing requirements. This keeps prompts concise and ensures subagents receive canonical process instructions.

6. **Worktree dependency setup should be a workflow step**, not left to ad-hoc discovery during verification. For monorepo projects, `npm install` in the worktree is a prerequisite that should be automated.

---

## Architectural Insight: Advisory vs Structural Enforcement

The fundamental lesson from this session: anything the agent CAN skip, the agent WILL skip, given sufficient rationalization pressure.

| Advisory (failed in this session) | Structural (needed) |
|---|---|
| Skill says "do code review" | Engine runs review prompt step automatically |
| Agent decides "not needed here" | Agent has no say -- step is part of workflow |
| Quality depends on prompt discipline | Quality depends on system design |

The fix is not a special "gate enforcement layer." The fix is simpler: make the engine the thing that executes steps. A code review is just a prompt step in the workflow. The engine runs it the same way it runs an implementation step. There's no mechanism for the agent to skip it because the engine -- not the agent -- controls step execution.

This is the SwissArmyHammer model: states, prompts, conditions, transitions. No special gate concept. Enforcement is just how state machines work.

See SPEC-000047 in the wrangler project for the full design.
