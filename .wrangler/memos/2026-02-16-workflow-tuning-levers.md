# Workflow Engine Tuning Levers

**Context**: First successful end-to-end run of `spec-implementation` workflow against SPEC-000049 (init_workspace MCP tool). Completed in 3h 30m with 17 tasks, 139 agent invocations, 640/640 tests passing. The engine mechanics are solid -- all optimization opportunities are in workflow YAML and prompt tuning.

**Source data**: Session `wf-2026-02-16-ba6fcb97`, audit log at `.wrangler/sessions/wf-2026-02-16-ba6fcb97/audit.jsonl`

---

## Time Allocation (SPEC-000049 run)

| Category | Time | % of Total | Agent Invocations |
|----------|------|------------|-------------------|
| Implementation | 52m | 25% | 17 |
| Initial review | ~26m | 12% | 51 (3x17) |
| Fix | 1.5m | 1% | 17 |
| Re-review | ~27m | 13% | 51 (3x17) |
| Plan | 4.3m | 2% | 1 (code handler) |
| Analyze | 1.2m | 1% | 1 |
| Verify + Publish | 2.5m | 1% | 2 |
| Overhead/waiting | ~96m | 45% | -- |

Key stat: **102 of 139 agent invocations (73%) were reviewer agents.**

---

## Lever 1: Skip Re-Review When Fix Is a No-Op

**Problem**: Every task runs the full fix loop (fix-issues -> 3 re-reviews) even when the fixer finds nothing to change. All 17 tasks had fix durations of 5-20s (trivial/no-op), yet each still triggered 3 re-review agents averaging 207s wall clock.

**Estimated savings**: ~27 minutes (13% of total) for specs where reviews are clean.

**Implementation options**:
- A. Add a workflow-level condition: `if: fix.changesCount > 0` on the re-review step
- B. Have the fix agent set a `review.hasActionableIssues = false` signal when it finds nothing to do, breaking the loop immediately
- C. Add a `skipWhen` directive to the loop step type: `skipWhen: fix.noChanges`

**Recommendation**: Option B is simplest -- the fix-issues prompt already returns structured output. Just ensure it sets `hasActionableIssues: false` when no changes were made, and the existing loop condition handles the rest. May already work if the fixer output is wired correctly; need to verify.

---

## Lever 2: Planner Task Granularity (Right-Sizing)

**Problem**: The planner created 17 tasks for SPEC-000049, many of which were trivially small or logically the same change split across files (e.g., "update workspace-schema.json" and "update workspace-schema.ts" as separate tasks). Each task carries a fixed ~5 min overhead for review/fix cycles regardless of size.

**The sizing spectrum**:
- **Too granular** (current): 17 tasks, each ~5-8 min of implementation but 5+ min of review overhead. Many tasks are "change 2 lines in one file."
- **Too coarse**: 3 mega-tasks that each take 30+ min to implement, making reviews harder and checkpoint value lower.
- **Right-sized**: 5-8 tasks per spec of this complexity, where each task is a coherent unit of work (one logical change that might touch 2-4 files).

**Tuning approach**: Update the analyze-spec prompt to include guidance on task sizing:
- Minimum meaningful task: should involve writing at least one test and one implementation change
- Group related file changes: if updating a schema requires changing both a .json and a .ts file, that's one task
- Target: 5-10 tasks for a medium spec, 10-15 for a large spec
- Each task should be independently testable and reviewable

**Estimated savings**: Reducing from 17 to ~8 tasks saves ~9 review/fix cycles = ~45 min.

---

## Lever 3: Selective Review Types Per Task

**Problem**: Every task gets all 3 review types (code-quality, test-coverage, security) regardless of what changed. Updating a JSON schema file doesn't need a security review. Updating documentation doesn't need test-coverage review.

**Implementation options**:
- A. Let the planner tag each task with applicable review types: `reviews: [code-quality, test-coverage]`
- B. Have reviewers self-skip with a quick initial scan: "Does this diff contain security-relevant changes? If not, return clean immediately."
- C. Define task categories (code, config, docs, tests) with default review mappings

**Estimated savings**: Skipping 1 of 3 reviewers on ~50% of tasks saves ~15 minutes for a 17-task run.

**Recommendation**: Option A gives the most control. The planner already assigns `estimatedComplexity` per task -- adding `reviewTypes` is natural. The workflow YAML would need a conditional on each review step.

---

## Lever 4: Spec Complexity Classification

**Problem**: The workflow runs identically for a 3-requirement spec and a 15-requirement spec. A simple "add a parameter to an existing tool" spec doesn't need the same ceremony as "implement a new MCP tool with 13 functional requirements."

**Proposed tiers**:

| Tier | Task Count | Review Style | Fix Loop | Example |
|------|-----------|--------------|----------|---------|
| **Small** | 1-3 tasks | Single combined review | 1 iteration max | Add a parameter, fix a bug |
| **Medium** | 4-8 tasks | Full 3-reviewer parallel | 2 iterations max | New tool, new feature |
| **Large** | 9-15 tasks | Full 3-reviewer parallel | 3 iterations max | New subsystem, cross-cutting change |

**Implementation**: The analyze phase already runs first. It could output a `complexity` field that the workflow uses to select review depth. This requires either:
- Workflow-level conditionals (not currently supported in the engine)
- Multiple workflow YAML files selected by the CLI based on analysis output
- A single workflow with `skipWhen` conditions on steps

**Recommendation**: Start simple -- add `skipWhen` support to the engine and use it to gate the parallel review block based on `analysis.complexity`. This is a small engine change.

---

## Lever 5: Smarter Analyze Prompt

**Problem**: The current analyze-spec prompt is 26 lines and quite generic. It doesn't guide the analyzer on how to group changes, estimate complexity, or think about task boundaries. The quality of the plan is entirely dependent on the model's judgment.

**Improvements**:
- Add examples of good vs. bad task decomposition
- Include heuristics: "If a requirement involves changing both a type definition and its implementation, that's one task, not two"
- Ask for a complexity estimate (small/medium/large) based on requirement count, file count, and cross-cutting concerns
- Ask the analyzer to identify which review types are relevant per task

---

## Lever 6: Review Prompt Tuning

**Problem**: Review agents take 2-3 minutes each. The prompts are generic and don't tell the reviewer to be proportionate -- a 5-line config change gets the same scrutiny as a 200-line feature implementation.

**Improvements**:
- Add "proportionality" guidance: scope review depth to the size/risk of the change
- Include diff context in the prompt so reviewers don't have to discover what changed
- Tell reviewers to return quickly if no issues found (avoid padding responses)
- Consider using `sonnet` instead of `opus` for review agents (faster, cheaper, reviews don't need max reasoning)

**Estimated savings**: Switching reviewers to sonnet could halve review times (from ~2.5 min to ~1.2 min per reviewer).

---

## Lever 7: Parallel Task Implementation

**Problem**: Tasks are implemented sequentially (per-task loop). Some tasks are independent and could run in parallel.

**Current engine support**: The engine has a `parallel` step type but it's only used for reviews within a task. Using it for implementation would require:
- Dependency analysis in the planner
- Parallel per-task groups
- Merge conflict handling

**Recommendation**: Low priority. The sequential model is simpler and more predictable. Tackle the other levers first -- they offer more savings with less complexity.

---

## Priority Order

1. **Lever 2** (task granularity) -- biggest impact, prompt-only change
2. **Lever 1** (skip re-review on no-op) -- easy win, may already work with correct wiring
3. **Lever 6** (review prompt tuning + sonnet) -- fast to test, compounds with other improvements
4. **Lever 5** (analyze prompt) -- improves plan quality, reinforces Lever 2
5. **Lever 4** (complexity tiers) -- requires `skipWhen` engine support
6. **Lever 3** (selective reviews) -- requires planner + workflow changes
7. **Lever 7** (parallel tasks) -- future optimization, low priority

## Projected Impact

Applying levers 1, 2, 5, and 6 together on a SPEC-000049-equivalent run:
- Tasks: 17 -> ~8 (lever 2+5)
- Review time per task: ~5 min -> ~2.5 min (lever 6, sonnet)
- Re-review elimination on clean tasks: saves ~3.5 min/task (lever 1)
- **Projected total: ~80-100 min vs. 210 min actual = ~50-55% reduction**
