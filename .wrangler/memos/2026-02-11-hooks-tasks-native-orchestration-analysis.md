# Memo: Claude Code Native Orchestration via Hooks + Tasks

**Date:** 2026-02-11
**Author:** Claude (research synthesis)
**Context:** Evaluating whether Claude Code's built-in hooks system and Tasks API could provide pipeline orchestration as an alternative to Spec 44's Agent SDK pipeline. Specifically: could skill-scoped hooks enforce phase sequencing, and could the Tasks API serve as the pipeline state tracker?

---

## The Question

Claude Code has built-in infrastructure that wasn't fully considered in Spec 44:
1. **Tasks API** -- persistent task tracking with DAG dependencies (`blockedBy`/`addBlocks`)
2. **Hooks system** -- 14 event types that can block, modify, or observe tool/session behavior
3. **Skill-scoped hooks** -- hooks defined in skill YAML frontmatter, active only while the skill runs
4. **Three hook types** -- `command` (shell), `prompt` (single-turn LLM), `agent` (multi-turn subagent)

Could these combine into a pipeline without the Agent SDK?

---

## Finding 1: The Hook System Is More Powerful Than Expected

Claude Code provides **14 hook events**, several of which can actively control execution:

| Event | Blocks? | Orchestration Use |
|-------|---------|-------------------|
| `PreToolUse` | Yes (allow/deny/ask, can modify input) | Enforce tool restrictions per phase |
| `PostToolUse` | No (observe only) | Log actions, check for phase completion signals |
| `TaskCompleted` | Yes (exit 2 blocks completion) | Quality gate -- validate before marking phase done |
| `Stop` | Yes (`decision: "block"`) | Continuation driver -- force Claude to keep working |
| `SubagentStart` | No (but can inject context) | Inject phase-specific instructions into subagents |
| `SubagentStop` | Yes | Validate subagent work before accepting |
| `SessionStart` | No | Initialize pipeline state |

Three hook types provide escalating intelligence:
- **`command`**: Shell script. Fast, deterministic. Good for running tests, checking file existence.
- **`prompt`**: Single-turn LLM call. Can evaluate whether a phase's output meets criteria.
- **`agent`**: Multi-turn subagent with Read/Grep/Glob tools (up to 50 turns). Can perform actual code review.

**The critical capability**: Hooks are captured at session startup as a snapshot. Direct edits during a session don't take effect until reviewed. This is a security feature, not a bug -- it prevents mid-session hook injection.

---

## Finding 2: Skill-Scoped Hooks Are Real and Exactly What You'd Want

Since Claude Code v2.1, skills can define hooks in their YAML frontmatter that are **scoped to the skill's lifetime**:

```yaml
---
name: implement-spec-pipeline
description: Deterministic spec implementation with phase gates
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/check-phase-permissions.sh"
  TaskCompleted:
    - hooks:
        - type: agent
          prompt: |
            Verify this task meets quality criteria:
            - Tests written and passing
            - Code review completed
            - No TODO/FIXME markers remaining
            $ARGUMENTS
          timeout: 120
  Stop:
    - hooks:
        - type: agent
          prompt: |
            Check if all pipeline phases are complete.
            Read the task list. If incomplete phases remain,
            return decision: block with the next phase to work on.
            $ARGUMENTS
          timeout: 60
---
```

When `/implement-spec-pipeline` is invoked:
- These hooks activate
- They fire alongside any global/project hooks
- When the skill finishes, they deactivate automatically

This is functionally equivalent to "dynamic hook registration" for pipeline purposes. The hooks exist in the skill definition, not in settings files.

---

## Finding 3: The Tasks API Has DAG Support

The Tasks API (v2.1.16+, default since v2.1.19) supports directed acyclic graph dependencies:

```
Task 1: "Analyze spec" (no dependencies)
Task 2: "Write tests for feature A" (blockedBy: ["1"])
Task 3: "Implement feature A" (blockedBy: ["2"])
Task 4: "Review feature A" (blockedBy: ["3"])
Task 5: "Write tests for feature B" (blockedBy: ["1"])
Task 6: "Implement feature B" (blockedBy: ["5"])
```

Key properties:
- **Persistent to disk** -- survives `/compact`, `/clear`, terminal closure
- **Cross-session** -- multiple Claude sessions can share a task list via `CLAUDE_CODE_TASK_LIST_ID`
- **Enforced ordering** -- a task cannot move to `in_progress` until all blocking tasks are `completed`
- **Metadata field** -- arbitrary key-value pairs for phase tracking

This is the natural state store for pipeline phases.

---

## Finding 4: What a Hooks+Tasks Pipeline Actually Looks Like

Here's the most viable architecture using only Claude Code built-ins:

### Architecture

```
User invokes /implement-spec-pipeline
    |
    v
Skill activates with scoped hooks:
  - Stop hook (agent-type): prevents premature stop
  - TaskCompleted hook (agent-type): validates quality gates
  - PreToolUse hook (command-type): phase-aware tool restrictions
    |
    v
Skill body instructs Claude to:
  1. Read the spec
  2. Create Tasks with DAG dependencies:
     Phase 1: Analyze (no deps)
     Phase 2: Plan (blocked by Phase 1)
     Phase 3: Implement task A (blocked by Phase 2)
     Phase 4: Review task A (blocked by Phase 3)
     Phase 5: Fix task A (blocked by Phase 4, if needed)
     Phase 6: Verify all (blocked by all impl/review tasks)
     Phase 7: Publish PR (blocked by Phase 6)
  3. Work through tasks in dependency order
    |
    v
For each task:
  Claude marks task in_progress
  Claude does the work
  Claude marks task completed
    -> TaskCompleted hook fires
    -> Agent-type hook validates:
       - Did tests pass?
       - Was review done?
       - Are quality criteria met?
    -> If validation fails: exit 2, task stays in_progress
    -> If validation passes: exit 0, task completed
    |
    v
When Claude tries to stop:
  -> Stop hook fires
  -> Agent-type hook reads task list
  -> If incomplete tasks remain: decision=block, reason="Phase N awaits"
  -> If all complete: decision=allow
    |
    v
Pipeline complete. Skill deactivates. Hooks removed.
```

### What This Gets You

| Capability | How It's Achieved |
|-----------|-------------------|
| Phase sequencing | Tasks API DAG -- `blockedBy` enforces order |
| Quality gates | `TaskCompleted` hook blocks completion unless criteria met |
| Continuation enforcement | `Stop` hook prevents Claude from stopping early |
| Tool restrictions per phase | `PreToolUse` hook checks current phase, allows/denies tools |
| Resumability | Tasks persist to disk; pipeline can resume after crash |
| Audit trail | Task metadata tracks phase transitions and outcomes |
| Phase-specific instructions | Skill body + task descriptions provide context per phase |

---

## Finding 5: The Critical Gaps

This architecture has real limitations compared to Spec 44:

### Gap 1: No Structured Output Validation

The Agent SDK's `query()` returns Zod-validated structured output. Hook-based orchestration relies on Claude's free-form reasoning. When a `TaskCompleted` hook runs an agent to verify quality, that agent is doing unstructured evaluation ("does this look right?") rather than schema-validated structured output ("does this JSON match the ReviewResult Zod schema?").

**Impact**: The review quality depends on the hook agent's prompt, not on compile-time schema guarantees. You're trading type safety for flexibility.

### Gap 2: No Deterministic Phase Routing

Hooks can block and provide feedback, but they **cannot force specific next actions**. A `Stop` hook can say "Phase 3 remains, keep working" but cannot say "invoke `query()` with these exact parameters for Phase 3." Claude must interpret the feedback and decide what to do.

**Impact**: This is "soft orchestration" -- guardrails + Claude's judgment -- not "hard orchestration" -- code-controlled sequencing. An LLM could potentially skip or reorder phases if it rationalizes doing so, despite the hooks.

### Gap 3: Hooks Cannot Invoke Skills or Tools

Hooks communicate through stdout/stderr/exit codes only. A hook **cannot**:
- Trigger a slash command
- Invoke a tool call
- Start a subagent with specific tools
- Pass structured data to Claude's next turn

The only way a hook influences Claude's next action is by returning text that Claude reads and (hopefully) acts on.

**Impact**: The pipeline driver is ultimately Claude's own planning, not deterministic code. The hooks provide strong signals ("you must continue", "this task isn't done") but the execution is Claude's interpretation of those signals.

### Gap 4: No Per-Phase Context Isolation

With the Agent SDK, each `query()` call starts a fresh subprocess with its own context window. The reviewer doesn't see the implementer's reasoning (preventing confirmation bias). With hooks+tasks, everything runs in a single Claude Code session sharing one context window.

**Impact**: The reviewer phase sees all implementation context. This makes it harder to get independent review -- the model has already formed opinions about the code during implementation.

### Gap 5: No Per-Phase Model Selection

The Agent SDK lets you use different models per phase (Haiku for analysis, Sonnet for implementation, Opus for review). In a single Claude Code session, you use whatever model the session started with.

**Impact**: No cost optimization through model routing. Every phase runs on the same model.

### Gap 6: No Reactive Task Events

There is no `TaskUnblocked` hook event. When a blocking task completes, blocked tasks become available, but nothing fires to trigger the next phase. The pipeline relies on the `Stop` hook polling the task list.

**Impact**: Phase transitions happen when Claude tries to stop and gets blocked, not when the previous phase completes. This is less responsive than event-driven sequencing.

---

## Finding 6: The Hybrid Insight -- Hooks as Enforcement Layer

The most interesting finding is that hooks+tasks don't have to replace Spec 44. They could **augment it**:

### Pattern: Spec 44 Pipeline + Skill-Scoped Hooks

```yaml
---
name: implement-spec-v3
hooks:
  TaskCompleted:
    - hooks:
        - type: command
          command: "npm test -- --bail"  # Tests must pass to complete any task
  Stop:
    - hooks:
        - type: agent
          prompt: |
            Check if all specification requirements are implemented.
            Read the task list and verify each requirement has a
            completed task with passing tests.
          timeout: 120
  PreToolUse:
    - matcher: "Bash(git push|gh pr create)"
      hooks:
        - type: command
          command: "./scripts/verify-all-phases-complete.sh"
---

# Implement Spec V3

This skill orchestrates Spec 44's pipeline with hook-enforced quality gates...
```

In this pattern:
- **Spec 44's TypeScript pipeline** handles deterministic sequencing, structured output, model selection, and context isolation
- **Skill-scoped hooks** add an enforcement layer that the pipeline code can't bypass:
  - `TaskCompleted` ensures tests pass before any phase is marked done
  - `Stop` prevents the skill from completing until all phases succeed
  - `PreToolUse` on git push/PR creation ensures everything is verified before publish

This is analogous to the GitHub Actions recommendation from the first memo: Spec 44 is the process gate, hooks are the enforcement gate.

---

## Finding 7: The "Hooks-Only" Pipeline -- When It Makes Sense

A hooks+tasks pipeline without the Agent SDK is viable for **simpler workflows** that don't need Spec 44's full capabilities:

**Good fit:**
- Single-model, single-session workflows
- Where Claude's judgment is trusted for phase routing
- Where quality gates (tests pass, lint clean) are the main enforcement need
- Where context isolation between phases isn't critical
- Simpler specs with 3-5 tasks, not 20-task multi-feature specs

**Bad fit:**
- Multi-model pipelines (cost optimization via model routing)
- High-stakes specs where LLM phase-skipping is unacceptable
- Workflows requiring independent review (context isolation)
- Complex retry/escalation logic
- Pipelines that must run without human presence (CI/CD)

The hooks-only approach is effectively **"Claude Code with training wheels"** -- the same agent with guardrails that prevent it from stopping too early or claiming tasks are done when they aren't. For many day-to-day tasks, this is plenty.

---

## Comparison: All Four Options

| Dimension | Spec 44 (Agent SDK) | GitHub Actions | SAH Fork | Hooks + Tasks (Native) |
|-----------|-------------------|----------------|----------|----------------------|
| Deterministic sequencing | Code-controlled | Workflow YAML | Interpreter-dependent | Soft (Claude's judgment + guardrails) |
| Structured output | Zod-validated | JSON job outputs | Parse stdout | Unstructured (free-form) |
| Quality gates | Code logic | Required checks | Mermaid transitions | TaskCompleted hooks |
| Continuation enforcement | Code logic | N/A | State machine | Stop hooks |
| Context isolation | Separate subprocess per phase | Separate job per check | Separate subprocess | **None** (shared session) |
| Model selection per phase | Native | N/A | CLI flags | **None** (single model) |
| Tool restriction per phase | Native `allowedTools` | N/A | N/A | PreToolUse hooks |
| Resumability | Planned checkpoint | Not built-in | SAH runs/ | Tasks persist to disk |
| Implementation effort | Medium (TypeScript pipeline) | Low (single YAML) | High (Rust fork) | **Low** (skill YAML + scripts) |
| Maintenance | Anthropic maintains SDK | GitHub maintains Actions | You maintain fork | **Zero** (built-in features) |
| Works without GitHub | Yes | No | Yes | Yes |
| Works in CI/CD | Yes | Native | Yes | **No** (needs interactive session) |
| Same-model bias risk | Low (separate contexts) | Low (separate job) | Low (separate subprocess) | **High** (shared context) |

---

## Recommendation

### The Layered Architecture

The four approaches map to different layers of the same system:

1. **Hooks + Tasks (innermost layer)**: Always-on guardrails. Every skill that implements anything should use `TaskCompleted` hooks to enforce test passage and `Stop` hooks to prevent premature completion. This costs nothing -- it's YAML in the skill frontmatter. **Do this immediately for existing skills.**

2. **Spec 44 Pipeline (core layer)**: For complex specs requiring deterministic multi-phase execution with context isolation and structured output. This is the investment piece. **Implement as planned.**

3. **GitHub Actions (outer layer)**: External verification gate for PRs. Independent review persona, audit trail, merge gate enforcement. **Add after Spec 44 works.**

4. **SAH Fork**: Not recommended. Adds complexity without unique capability.

### Concrete Next Step for Hooks

The lowest-hanging fruit is adding skill-scoped hooks to the existing `implement-spec` and `implement` skills:

```yaml
hooks:
  TaskCompleted:
    - hooks:
        - type: command
          command: "bash -c 'cd \"$PROJECT_DIR\" && npm test -- --bail 2>&1 || exit 2'"
  Stop:
    - hooks:
        - type: agent
          prompt: "Check if all implementation tasks are completed and tests pass."
          timeout: 120
```

This gives you quality gate enforcement today, with zero new infrastructure, while Spec 44 is being built for the harder problems.

---

## Sources

Research conducted via parallel subagent investigations covering:
- Claude Code hooks documentation (14 event types, 3 hook types, matcher system)
- Claude Code Tasks API vs TodoWrite (DAG dependencies, persistence, cross-session sharing)
- Skill-scoped hooks (YAML frontmatter, lifecycle scoping, activation/deactivation)
- Wrangler's existing hook architecture (session-start.sh, hooks.json, git hooks, workspace schema)
- Claude Code settings hierarchy (global, project, local, managed policy, plugin, skill-scoped)
- Hook limitations (static snapshot, no reactive events, no tool invocation, no skill triggering)
