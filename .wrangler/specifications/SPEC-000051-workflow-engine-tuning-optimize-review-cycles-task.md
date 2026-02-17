---
id: SPEC-000051
title: >-
  Workflow Engine Tuning: Optimize Review Cycles, Task Granularity, and Prompt
  Quality
type: specification
status: open
priority: high
labels:
  - specification
  - workflow-engine
  - performance
  - optimization
createdAt: '2026-02-17T22:30:28.203Z'
updatedAt: '2026-02-17T22:30:28.203Z'
project: Workflow Engine
---
# Specification: Workflow Engine Tuning

## Executive Summary

**What:** A set of targeted optimizations to the `spec-implementation` workflow that reduce end-to-end execution time by ~50% without engine changes, primarily through prompt tuning, smarter task decomposition, and conditional review skipping.

**Why:** The first successful end-to-end run (SPEC-000049, init_workspace MCP tool) completed in 3h 30m with 17 tasks and 139 agent invocations. Analysis shows 73% of agent invocations were reviewer agents, and ~45% of wall-clock time was overhead/waiting. Most savings come from prompt-only and workflow YAML changes -- no engine modifications needed for the highest-impact levers.

**Scope:**
- Included: Analyze prompt improvements, review prompt tuning, re-review skip on no-op fix, task granularity guidance, selective review types, complexity tiering
- Excluded: Parallel task implementation (future), engine architectural changes, new MCP tools

**Source data:** Session `wf-2026-02-16-ba6fcb97`, audit log at `.wrangler/sessions/wf-2026-02-16-ba6fcb97/audit.jsonl`

**Aligns with:** Workflow engine maturation (post-dogfood optimization)

## Baseline Metrics (SPEC-000049 Run)

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

**Key stat:** 102 of 139 agent invocations (73%) were reviewer agents.

## Goals and Non-Goals

### Goals

1. Reduce end-to-end workflow execution time by 40-55% on medium-complexity specs
2. Reduce agent invocation count by 50%+ through smarter task decomposition and conditional review skipping
3. Improve plan quality so tasks are coherently sized (5-10 tasks for medium specs vs. 17)
4. Make reviews proportionate to change size and risk
5. All changes achievable via prompt tuning and workflow YAML -- no engine changes required for P0/P1 levers

### Non-Goals

- Parallel task implementation (deferred -- higher complexity, lower marginal return after other levers)
- Engine architectural changes (the engine mechanics are solid)
- Changing the MCP tool interface or adding new tools
- Optimizing the implementation agent itself (already efficient at 25% of time)

## Requirements

### R1: Skip Re-Review When Fix Is a No-Op (Lever 1)

**Priority:** P0

When the fix-issues agent finds nothing to change (fix duration <30s, no file modifications), the re-review cycle must be skipped entirely.

**Acceptance criteria:**
- Fix agent sets `hasActionableIssues: false` (or equivalent signal) when no changes were made
- Workflow loop terminates immediately on this signal instead of running 3 re-review agents
- No behavioral change when fix agent actually makes changes (re-review still runs)
- Saves ~27 minutes on clean-review runs (13% of total)

### R2: Planner Task Granularity Guidance (Lever 2)

**Priority:** P0

The analyze-spec prompt must include explicit guidance on task sizing to produce 5-10 coherently-sized tasks for medium-complexity specs instead of 15-20 over-granular tasks.

**Acceptance criteria:**
- Analyze prompt includes task sizing heuristics:
  - Minimum meaningful task: at least one test and one implementation change
  - Group related file changes: if updating a schema requires changing both a .json and a .ts file, that's one task
  - Target ranges: 3-5 tasks (small spec), 5-10 tasks (medium spec), 10-15 tasks (large spec)
  - Each task must be independently testable and reviewable
- Analyze prompt includes examples of good vs. bad task decomposition
- Planner outputs a complexity estimate (small/medium/large) based on requirement count, file count, and cross-cutting concerns

### R3: Review Prompt Proportionality (Lever 6)

**Priority:** P1

Review agent prompts must guide proportionate review depth based on change size and risk.

**Acceptance criteria:**
- Review prompts include proportionality guidance: scope depth to size/risk of change
- Diff context included in review prompt so reviewers don't re-discover what changed
- Explicit instruction to return quickly when no issues found (avoid padding responses)
- Review agents configured to use `sonnet` model instead of `opus` (faster, cheaper, reviews don't need max reasoning)
- Target: reduce per-reviewer time from ~2.5 min to ~1.2 min

### R4: Smarter Analyze Prompt (Lever 5)

**Priority:** P1

The analyze-spec prompt must be expanded with heuristics, examples, and structured output guidance.

**Acceptance criteria:**
- Prompt includes heuristics for grouping changes (e.g., "type definition + implementation = one task")
- Prompt asks for complexity estimate that downstream steps can reference
- Prompt asks analyzer to identify which review types are relevant per task
- Prompt includes examples of good vs. bad task decomposition for calibration

### R5: Selective Review Types Per Task (Lever 3)

**Priority:** P2

Tasks should only receive review types relevant to their content (e.g., config changes skip security review).

**Acceptance criteria:**
- Planner tags each task with applicable review types: `reviewTypes: [code-quality, test-coverage]` (or similar)
- Workflow YAML conditionally runs review agents based on task's `reviewTypes` field
- Default: all 3 review types if `reviewTypes` not specified (backward compatible)
- Estimated savings: ~15 minutes on a 17-task run (skipping 1 reviewer on ~50% of tasks)

### R6: Spec Complexity Classification (Lever 4)

**Priority:** P2

The workflow should adapt its ceremony level based on spec complexity.

**Acceptance criteria:**
- Analyze phase outputs a `complexity` field (small/medium/large)
- Complexity tiers define review and fix loop behavior:

| Tier | Task Count | Review Style | Fix Loop |
|------|-----------|--------------|----------|
| Small | 1-3 tasks | Single combined review | 1 iteration max |
| Medium | 4-8 tasks | Full 3-reviewer parallel | 2 iterations max |
| Large | 9-15 tasks | Full 3-reviewer parallel | 3 iterations max |

- Requires `skipWhen` directive support in workflow YAML (small engine addition)
- Workflow YAML uses `skipWhen` to gate review blocks based on `analysis.complexity`

## Implementation Priority

1. **P0 -- Prompt-only changes (R2, R4):** Task granularity guidance and smarter analyze prompt. Biggest impact, zero engine changes.
2. **P0 -- Wiring fix (R1):** Skip re-review on no-op fix. Verify if existing loop condition handles this; if not, small workflow YAML change.
3. **P1 -- Prompt + config (R3):** Review proportionality and sonnet model switch. Fast to test, compounds with other improvements.
4. **P2 -- Workflow + engine (R5, R6):** Selective reviews and complexity tiers. Require `skipWhen` engine support and planner output changes.

## Projected Impact

Applying R1, R2, R3, R4 together on a SPEC-000049-equivalent run:
- Tasks: 17 -> ~8 (R2 + R4)
- Review time per task: ~5 min -> ~2.5 min (R3, sonnet)
- Re-review elimination on clean tasks: saves ~3.5 min/task (R1)
- **Projected total: ~80-100 min vs. 210 min actual = 50-55% reduction**

## Deferred: Parallel Task Implementation (Lever 7)

Tasks are currently implemented sequentially. Some tasks are independent and could run in parallel, but this requires dependency analysis, parallel per-task groups, and merge conflict handling. Deferred as lower priority -- the sequential model is simpler and more predictable. Tackle after the other levers prove out.

## Verification

- Run the optimized workflow against a medium-complexity spec and compare wall-clock time and agent invocation count to the SPEC-000049 baseline
- Confirm task count falls within target range (5-10 for medium specs)
- Confirm re-review is skipped when fix is a no-op
- Confirm review agents complete in ~1.2 min average (sonnet)
- Confirm no regression in output quality (code passes tests, reviews catch real issues)
