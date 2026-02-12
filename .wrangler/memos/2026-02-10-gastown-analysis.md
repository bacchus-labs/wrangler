# Gas Town Analysis: Deterministic Post-Implementation Review Triggers

**Date**: 2026-02-10
**Source**: https://github.com/steveyegge/gastown (Steve Yegge)
**Related**: IDEA-000002

## What Gas Town Is

Multi-agent orchestration system for Claude Code with persistent work tracking. Coordinates 20-30 AI agents doing parallel work across git repos. Core problem it solves: ensuring complex multi-step agent workflows complete all steps — especially post-implementation review and fix loops.

## Architecture Overview

```
Mayor (AI Coordinator)
    │
    ├── Town (workspace ~/gt/)
    │     ├── Rig (project container, wraps a git repo)
    │     │     ├── Crew (human workspace)
    │     │     ├── Polecats (worker agents — ephemeral sessions, persistent identity)
    │     │     ├── Witness (per-rig pit boss — oversight, verification, lifecycle)
    │     │     └── Refinery (merge queue processor — rebase, test, merge)
    │     └── Hooks (git worktree-based persistent storage)
    │
    ├── Deacon (AI patrol — continuous health monitoring)
    ├── Boot (ephemeral AI triage — checks if Deacon is alive)
    └── Daemon (Go process — mechanical heartbeat, spawns Boot)
```

## Five Key Architectural Patterns

### 1. Formulas: Workflows as Data, Not Prose

TOML-defined workflow DAGs with explicit step dependencies:

```toml
[[steps]]
id = "implement"
title = "Implement the solution"
needs = ["preflight-tests"]

[[steps]]
id = "self-review"
title = "Self-review changes"
needs = ["implement"]

[[steps]]
id = "run-tests"
needs = ["self-review"]
```

Go formula engine computes `ReadySteps(completed)` — what can run next is determined by code, not by the agent reading instructions. Four formula types:

| Type | Execution | Use Case |
|------|-----------|----------|
| **workflow** | Sequential DAG with `needs` | Standard step-by-step work |
| **convoy** | Parallel legs + synthesis | Multi-aspect code review |
| **expansion** | Template-based generation | Parameterized workflows |
| **aspect** | Parallel analysis | Multi-perspective analysis |

**Molecules** are instantiated formulas with persistent step-level tracking that survives crashes. Each step becomes a trackable bead (issue) with status. `bd mol current` shows where you are; `bd close <step> --continue` advances automatically.

### 2. The Propulsion Principle: Event-Driven, Not Memory-Driven

> "If you find something on your hook, YOU RUN IT."

Work existence IS the trigger. Mail-based inter-agent signaling:

```
Polecat finishes → gt done (push + submit to MQ + self-nuke)
    → MERGE_READY mail → Witness inbox
        → Witness verifies → sends to Refinery
            → Refinery rebases + tests
                → If conflict: creates NEW task → NEW polecat spawned
                → If pass: merges → MERGED mail back to Witness
```

Each transition is a discrete event. The review doesn't happen because someone followed Step 6 — it happens because `gt done` deterministically fires a signal.

### 3. Self-Cleaning Agents with Deterministic Lifecycle

Polecats have exactly THREE states (no idle state):

| State | Description | Cause |
|-------|-------------|-------|
| **Working** | Actively doing assigned work | Normal operation |
| **Stalled** | Session stopped mid-work | Crash/timeout, never nudged |
| **Zombie** | Completed but failed to die | `gt done` failed during cleanup |

Three lifecycle layers:
- **Identity** (permanent): agent bead, CV chain, work history
- **Sandbox** (ephemeral per assignment): git worktree, branch
- **Session** (ephemeral per step): Claude instance, context window

Sessions cycle frequently via `gt handoff` — work persists in sandbox and beads.

### 4. Separation of Concerns Through Specialized Roles

| Role | Responsibility | Formula |
|------|---------------|---------|
| **Polecat** | Implement only, self-clean | `mol-polecat-work` |
| **Witness** | Oversight, verification, lifecycle | `mol-witness-patrol` |
| **Refinery** | Merge queue, test, conflict spawning | `mol-refinery-patrol` |
| **Deacon** | Cross-rig health monitoring | `mol-deacon-patrol` |

Each role runs its OWN patrol loop formula continuously. The code review is a separate formula (`code-review`) with parallel specialized legs (correctness, security, performance, elegance, resilience, style, smells, wiring, commit-discipline, test-quality) and configurable presets:

```toml
[presets.gate]
description = "Light review for automatic flow"
legs = ["wiring", "security", "smells", "test-quality"]

[presets.full]
description = "Comprehensive review - all legs"
legs = ["correctness", "performance", "security", "elegance", "resilience", "style", "smells", "wiring", "commit-discipline", "test-quality"]
```

### 5. Watchdog Chain for Reliability

```
Daemon (Go, 3-min heartbeat) → Boot (ephemeral AI triage) → Deacon (AI patrol) → Witnesses
```

- Daemon is mechanical (can't reason), Boot bridges to intelligent triage
- Heartbeat freshness: <5min = fresh, 5-15min = stale, >15min = very stale
- Stale escalations auto-bump severity on timers (low → medium → high → critical)
- Multiple fallback layers ensure nothing falls through cracks

Escalation system: unified `gt escalate` with severity-based routing:

```json
{
  "routes": {
    "low": ["bead"],
    "medium": ["bead", "mail:mayor"],
    "high": ["bead", "mail:mayor", "email:human"],
    "critical": ["bead", "mail:mayor", "email:human", "sms:human"]
  }
}
```

## How This Maps to Our Problem

### Current State (pi/wrangler)

- `implementing-specs` skill = one giant prompt (~500 lines) the coordinator follows
- Phase 4 EXECUTE dispatches implementers, then Step 6 embeds two-stage code review
- If reviews fail, fix subagents dispatched with retry logic
- ALL of this relies on coordinator following steps in order from the prompt

### Comparison

| Aspect | Our Current | Gas Town |
|--------|------------|----------|
| Workflow definition | Markdown prose in SKILL.md | TOML DAG with computed ReadySteps() |
| Review trigger | Coordinator remembers Step 6 | Mail event from `gt done` triggers Witness |
| Fix loop on failure | Coordinator remembers retry count | Refinery creates NEW task → NEW agent |
| State persistence | Tracking .md updated by coordinator | Beads DB + file state, mechanically checked |
| Missed step recovery | Nothing catches it | Watchdog patrol detects and escalates |
| Agent roles | One coordinator does everything | Polecat/Witness/Refinery separation |

### Core Insight

**The review trigger should be a deterministic consequence of implementation completion, not a step the coordinator remembers to follow.**

## Possible V1 Approaches for Pi

### Option A: State-file + trigger script (lightest lift)
- JSON state file per-issue tracks: `implemented → reviewing → review_passed/failed → fixing → fixed → re-reviewing`
- Shell script runs after each implementer completes — mechanically verifies, dispatches review, parses results, decides next action
- Coordinator's job simplifies from "follow 200 lines" to "run the review-gate script and do what it says"

### Option B: Formula-lite (medium lift)
- Define workflow steps in TOML/JSON with dependencies
- A `ReadySteps()` function (bash/script) determines next action
- Coordinator queries "what's ready?" instead of following prose
- Each step completion updates persistent state

### Option C: Event-driven roles (larger lift, closer to Gas Town)
- Separate reviewer "role" watches for completed implementations
- Signal system between implementer → reviewer → fixer
- Each role has its own simple patrol loop

## Key Gas Town Files for Reference

| File | What It Contains |
|------|-----------------|
| `.beads/formulas/mol-polecat-work.formula.toml` | Full polecat work lifecycle (10 steps) |
| `.beads/formulas/code-review.formula.toml` | Parallel code review with 10 legs + presets |
| `.beads/formulas/shiny.formula.toml` | Canonical workflow: design → implement → review → test → submit |
| `.beads/formulas/mol-refinery-patrol.formula.toml` | Merge queue patrol loop |
| `.beads/formulas/mol-witness-patrol.formula.toml` | Worker monitoring patrol loop |
| `internal/formula/types.go` | Formula data structures (Step, Leg, Convoy, etc.) |
| `internal/formula/parser.go` | ReadySteps(), TopologicalSort(), cycle detection |
| `internal/beads/molecule.go` | Molecule instantiation, template expansion |
| `docs/concepts/propulsion-principle.md` | "If you find it on your hook, you run it" |
| `docs/concepts/molecules.md` | Formula → Proto → Molecule lifecycle |
| `docs/concepts/polecat-lifecycle.md` | Three-layer architecture (identity/sandbox/session) |
| `docs/design/watchdog-chain.md` | Daemon → Boot → Deacon → Witnesses |
| `docs/design/escalation-system.md` | Severity-based routing with auto-re-escalation |
| `templates/polecat-CLAUDE.md` | Polecat agent instructions (injected into Claude) |
| `templates/witness-CLAUDE.md` | Witness agent instructions |
