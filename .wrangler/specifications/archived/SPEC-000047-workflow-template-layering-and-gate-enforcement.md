---
id: SPEC-000047
title: Workflow Template Layering, Agent/Prompt Separation, and Step Enforcement
type: specification
status: closed
priority: high
labels:
  - specification
  - workflow-engine
  - enforcement
createdAt: "2026-02-15T20:30:00.000Z"
updatedAt: "2026-02-15T21:45:00.000Z"
project: wrangler
---

# Specification: Workflow Template Layering, Agent/Prompt Separation, and Step Enforcement

## Executive Summary

**What:** Extend the wrangler workflow engine with (a) a layered template resolution system so projects can override or extend builtin workflows, agents, and prompts, and (b) a step execution model where the engine -- not the orchestrating agent -- runs every step in the workflow definition, making quality checks just steps that the agent cannot skip.

**Why:** The engine needs to be the thing that executes workflow steps. Currently the orchestrating agent controls flow and can rationalize past steps it deems unnecessary. When quality checks are advisory instructions rather than engine-executed steps, they get skipped. The fix: every step in a workflow is executed by the engine mechanically. The agent doesn't choose which steps to run.

Different projects also have different quality requirements. Builtin workflows provide sensible defaults, but projects need the ability to add steps, swap prompts, or define entirely new workflows -- all at the project level in `.wrangler/workflows/`.

**Design philosophy:** Agents and prompts are separate concerns. An **agent** defines a persona -- its identity, system prompt, default tools, and model. A **prompt** defines a specific task -- the instructions for what to do right now. A workflow step combines an agent with a prompt: "have the reviewer agent execute the code-quality-review prompt." Enforcement comes from the engine always executing every step in sequence.

**Scope:**

- Included: Template resolution (project > builtin), agent/prompt separation, step execution, workflow configuration, condition-based transitions, escape hatches with audit trail
- Excluded: User-global layer (~/.wrangler/), remote registries, GUI editor, real-time streaming UI

## Goals and Non-Goals

### Goals

1. Implement 2-tier resolution for workflows, agents, and prompts (project `.wrangler/` > builtin) so projects can customize without forking wrangler
2. Separate agents (personas) from prompts (task instructions) -- a workflow step combines an agent with a prompt
3. Make the engine the executor of workflow steps -- the orchestrating agent submits a workflow, the engine runs it step by step, dispatching subagents at each step
4. Condition-based transitions let steps route workflow flow based on prompt output (e.g., `condition: review.hasIssues` triggers a fix loop)
5. Record all step results in the session audit trail
6. Allow per-project workflow customization: add/remove/reorder steps, swap prompts, adjust safety limits
7. Provide explicit escape hatches for skipping steps, with audit logging

### Non-Goals

- User-global workflow layer (~/.wrangler/)
- Remote workflow registries
- GUI-based workflow editing
- Changing the query function interface
- Standalone prompt invocation outside workflows (future: prompts are designed to be reusable, but this spec does not define a `prompt_run` tool or CLI command)
- Engine-level output schema validation (prompts describe output format in natural language; engine stores output as-is)

## Background & Context

### The Problem

The workflow engine defines phases with steps, including review steps after implementation. But in practice, the orchestrating agent controls flow and skips steps it deems unnecessary. The engine is a bookkeeping system, not an executor.

The engine also loads workflows from a single hardcoded path. Projects cannot customize workflows, add steps, or adjust behavior without modifying wrangler source.

## Requirements

### Functional Requirements

#### FR-1: Template Resolution

**FR-1.1**: The engine MUST resolve templates using a 2-tier search path:

1. `.wrangler/workflows/` in the project root (highest priority)
2. `workflows/` in the wrangler plugin directory (builtin, lowest priority)

**FR-1.2**: Resolution applies uniformly to all template types:

- Workflow definitions: `workflows/{name}.yaml`
- Agent definitions: `agents/{name}.md`
- Prompt files: `prompts/{name}.md`

**FR-1.3**: When a workflow step references an agent or prompt by name, the loader MUST check project-level first, then builtin. First match wins.

**FR-1.4**: Project-level files can:

- **Override**: Same filename as a builtin -- completely replaces it
- **New**: Unique filename -- defines an entirely new workflow, agent, or prompt

**FR-1.5**: There is no separate configuration file. All configuration (safety limits, per-step model overrides, step enable/disable) lives in the workflow YAML itself. A project that wants to customize copies the builtin workflow and edits it directly.

#### FR-2: Agents and Prompts

**FR-2.1**: An **agent** is a markdown file that defines a persona:

```markdown
---
name: reviewer
description: Code review specialist
tools:
  - Read
  - Glob
  - Grep
  - Bash
model: sonnet
---

You are a code review specialist. You analyze code changes for quality,
correctness, and adherence to project conventions. You provide structured
feedback with actionable issues categorized by severity.
```

Agent files define: identity (system prompt in the body), default tools, and default model. An agent does not define _what_ to do -- that comes from the prompt.

**FR-2.2**: A **prompt** is a markdown file that defines a specific task:

```markdown
---
name: code-quality-review
description: Reviews code for quality, readability, and best practices
---

Review the recent changes for:

1. Code readability and clarity
2. Function length (flag functions >50 lines)
3. Naming conventions
   ...

## Context

Files changed: {{ changedFiles }}
Task: {{ task.title }}

## Output

Return a JSON object with:

- `hasActionableIssues` (boolean): whether any issues were found
- `actionableIssues` (array): list of issues with `severity`, `file`, `line`, `message`
- `summary` (string): brief overview of findings
```

Prompt files define: task instructions (body) and template variables. Output format is described in natural language within the prompt body -- there is no engine-level schema enforcement. A prompt does not define _who_ executes it -- that comes from the agent.

**FR-2.3**: A workflow step combines an agent with a prompt:

```yaml
- name: review-code-quality
  agent: reviewer
  prompt: code-quality-review.md
  output: codeQualityReview
```

The engine resolves both the agent and prompt files, composes the agent's system prompt with the rendered prompt body, and dispatches a subagent with the agent's tools and model.

**FR-2.4**: If a step specifies `prompt` without `agent`, the engine uses the workflow's `defaults.agent`. If no default agent is configured, the step fails at load time.

**FR-2.5**: If a step specifies a `model`, it overrides the agent's default model for that step only.

**FR-2.6**: The engine executes every step in the workflow definition sequentially (or in parallel where configured). The orchestrating agent does not choose which steps to run. The engine runs them all.

**FR-2.7**: Each step MUST record its result in the session audit trail, including:

- Step name
- Agent used (with resolution source: project or builtin)
- Prompt file used (with resolution source: project or builtin)
- Structured output
- Execution time
- Model used

#### FR-2b: Code Handlers

**FR-2b.1**: The engine supports a `code` step type for deterministic, non-agent logic:

```yaml
- name: plan
  type: code
  handler: create-issues
  input: analysis
```

Code handlers are TypeScript functions registered in the engine's `HandlerRegistry`. They receive the workflow context, an optional input (resolved from context), and engine dependencies. They manipulate workflow state directly -- no agent dispatch.

**FR-2b.2**: Code handlers are engine-internal. Projects do NOT register custom code handlers. The builtin handlers are:

- `create-issues`: Transforms analysis output into tracked MCP issues and task lists
- `save-checkpoint`: Moves the current task from pending to completed for resumability

If a project needs custom logic at a workflow step, it goes in a prompt step (an agent does it), not a code handler.

#### FR-2c: Output Handling

**FR-2c.1**: The engine stores subagent output as-is into the named output variable. There is no schema validation at the engine level.

**FR-2c.2**: Prompts describe their expected output format in natural language within their body. The agent is expected to comply. Schema enforcement is the prompt's job, not the engine's.

**FR-2c.3**: Condition expressions that reference missing output properties MUST evaluate to falsy (not throw). For example, if `codeQualityReview.hasActionableIssues` is undefined because the agent returned unexpected output, the condition evaluates to `false` and the step is skipped. This prevents malformed output from crashing the workflow.

**FR-2c.4**: The audit trail MUST record the raw output from each step regardless of format, for debugging and post-mortem analysis.

#### FR-3: Condition-Based Transitions

**FR-3.1**: Steps MUST support a `condition` field that references output variables from prior steps. The step only executes if the condition evaluates to true.

```yaml
- name: fix-issues
  agent: implementer
  prompt: fix-issues.md
  condition: codeQualityReview.hasActionableIssues || testCoverageReview.hasActionableIssues
  input:
    issues: codeQualityReview.actionableIssues
```

**FR-3.2**: Loop steps MUST support conditions for repeat execution:

```yaml
- name: fix-loop
  type: loop
  condition: review.hasActionableIssues
  maxRetries: 2
  onExhausted: escalate
  steps:
    - name: fix
      agent: implementer
      prompt: fix-issues.md
    - name: re-review
      agent: reviewer
      prompt: code-quality-review.md
      output: review
```

**FR-3.3**: `onExhausted` defines what happens when a loop's `maxRetries` is reached and the condition is still true:

- `escalate` (default): The workflow **stops**. The engine records the exhaustion in the audit trail with full context (loop name, retry count, last output). If the workflow was initiated by a parent agent (e.g., user told Claude Code to run it), control returns to that agent with the failure context. If run via CLI, it exits with a non-zero status and error message. The workflow does not silently continue past an exhausted fix loop.
- `warn`: The engine logs a warning in the audit trail and continues to the next step. Use for non-critical review loops where best-effort is acceptable.

**FR-3.4**: Conditions MUST support:

- Dot-notation property access: `review.hasIssues`
- Boolean operators: `&&`, `||`, `!`
- Comparison operators: `==`, `!=`, `>`, `<`
- String methods: `.includes()`, `.startsWith()`
- Numeric comparisons: `review.criticalCount > 0`

**FR-3.4**: Invalid condition expressions MUST produce clear error messages at workflow load time, not at runtime.

#### FR-4: Parallel Step Execution

**FR-4.1**: Steps MAY be grouped for parallel execution:

```yaml
- name: reviews
  type: parallel
  steps:
    - name: review-code-quality
      agent: reviewer
      prompt: code-quality-review.md
      output: codeQualityReview
    - name: review-test-coverage
      agent: reviewer
      prompt: test-coverage-review.md
      output: testCoverageReview
    - name: review-security
      agent: reviewer
      prompt: security-review.md
      output: securityReview
```

**FR-4.2**: All parallel steps MUST complete before the workflow advances. If any step fails (subagent error, timeout), the parallel group is treated as failed.

#### FR-5: Workflow-Level Configuration

**FR-5.1**: Safety limits and execution defaults live in the workflow YAML itself:

```yaml
name: spec-implementation
version: 2

safety:
  maxLoopRetries: 3
  maxStepTimeoutMs: 120000
  maxWorkflowDurationMs: 3600000
  failOnStepError: true

defaults:
  model: opus
  permissionMode: bypassPermissions

phases: ...
```

**FR-5.2**: Per-step configuration (model, enabled/disabled) is specified on the step definition itself:

```yaml
- name: review-security
  agent: reviewer
  prompt: security-review.md
  output: securityReview
  enabled: false # disable this step
  model: haiku # cheaper model override (overrides agent default)
```

**FR-5.3**: A project that wants to customize safety limits, disable steps, or change models copies the builtin workflow to `.wrangler/workflows/spec-implementation.yaml` and edits it. No separate config file.

#### FR-6: Escape Hatches

**FR-6.1**: Users MUST be able to skip all non-implementation steps via `--skip-checks` flag or `skipChecks: true` in `session_start`.

**FR-6.2**: Users MUST be able to skip specific steps via `--skip-step=<name>`.

**FR-6.3**: All skips MUST be recorded in the session audit trail.

**FR-6.4**: There MUST NOT be implicit skip mechanisms. The agent cannot decide to skip steps.

#### FR-7: Session Tool Integration

**FR-7.1**: `session_start` MUST accept a `workflow` parameter (defaults to `spec-implementation`), resolved via layered search.

**FR-7.2**: `session_start` MUST accept `skipChecks` and `skipStepNames` parameters.

**FR-7.3**: `session_checkpoint` MUST include step results since last checkpoint.

**FR-7.4**: `session_complete` MUST include a step execution summary:

```yaml
stepSummary:
  totalSteps: 18
  executed: 16
  skipped: 2
  skippedSteps:
    - name: review-security
      reason: "disabled in workflow definition"
    - name: review-test-coverage
      reason: "--skip-step=review-test-coverage"
```

#### FR-8: Git Isolation and Working Directory

**FR-8.1**: `session_start` MUST create a git worktree for the workflow run:

- Branch name: `wrangler/{spec-slug}/{session-id}`
- Worktree path: `.worktrees/{spec-slug}/`
- If the worktree path already exists (concurrent sessions), append a numeric suffix
- If git is unavailable (not a repo), fall back to the current working directory with a warning in the audit trail

This is engine-controlled and deterministic. The session agent and subagents do not create branches or worktrees.

**FR-8.2**: The engine MUST set the working directory of every dispatched subagent to the worktree path. Subagents MUST NOT need to know about worktree mechanics -- they just work in the directory they're given.

**FR-8.3**: The worktree path MUST be available as a workflow context variable (`{{ worktreePath }}`) for prompts that need to reference it explicitly.

**FR-8.4**: The engine MUST inject the worktree path into the session audit trail at session start.

**FR-8.5**: Git operations (committing, pushing, PR creation) are agent-driven, not engine-driven. Agents receive commit guidelines via their prompts. The relevant prompts (e.g., `implement-task.md`, `fix-issues.md`, `publish-changes.md`) MUST include clear instructions for when and how to commit:

- Implementation and fix agents: commit after completing their work, using a conventional format (e.g., `implement: {task title}`)
- Publish agent: push the branch, create PR
- Review agents: read-only, never commit

**FR-8.6**: `session_complete` MUST NOT clean up the worktree. The worktree persists so the user can inspect, amend, or continue work. Worktree cleanup is a separate manual or housekeeping operation.

### Non-Functional Requirements

**NFR-1: Simplicity**: The engine should have as few step types as possible. Target: `prompt`, `code`, `loop`, `parallel`, `per-task`.

**NFR-2: Performance**: Parallel step groups complete within 2x the slowest step.

**NFR-3: Reliability**: Step failures (timeouts, crashes) MUST NOT crash the engine. Errors are captured in step results and the configured error policy applies.

**NFR-4: No backward compatibility burden**: We are pre-v1. Existing definitions are rewritten to the new format.

**NFR-5: Observability**: All step executions and results logged to session audit trail.

## Architecture

### Core Model

```
Workflow = ordered list of Steps
Step = { name, type, agent?, prompt?, condition?, output?, model?, enabled? }
Step types: prompt | code | loop | parallel | per-task
Agent = markdown file defining persona (system prompt, tools, model)
Prompt = markdown file defining task instructions (body, output schema, template variables)
```

A workflow is a sequence of steps. The engine executes them in order. Some steps dispatch subagents by combining an agent with a prompt. Some run code (code steps). Some iterate (loop, per-task). Some fan out (parallel).

**Agent vs Prompt**: An agent is _who_ does the work (persona, capabilities). A prompt is _what_ work to do (task instructions). The same agent can execute many different prompts. The same prompt can be executed by different agents. A workflow step binds them together.

### Template Resolution

```
Resolution order (first match wins):

  .wrangler/workflows/{name}.yaml      (project workflow)
  workflows/{name}.yaml                (builtin workflow)

  .wrangler/agents/{name}.md           (project agent)
  agents/{name}.md                     (builtin agent)

  .wrangler/prompts/{name}.md          (project prompt)
  prompts/{name}.md                    (builtin prompt)
```

Agents, prompts, and workflows are all first-class concepts with independent resolution. A project can override a builtin agent (e.g., make the reviewer stricter), override a prompt (e.g., add HIPAA checks to code-quality-review), or override the entire workflow.

### Workflow Definition

The `spec-implementation.yaml` is a single self-contained file:

```yaml
name: spec-implementation
version: 2

safety:
  maxLoopRetries: 3
  maxStepTimeoutMs: 120000
  maxWorkflowDurationMs: 3600000
  failOnStepError: true

defaults:
  agent: implementer
  model: opus
  permissionMode: bypassPermissions

phases:
  - name: analyze
    agent: planner
    prompt: analyze-spec.md
    model: sonnet
    output: analysis

  - name: plan
    type: code
    handler: create-issues
    input: analysis

  - name: execute
    type: per-task
    source: analysis.tasks
    steps:
      - name: implement
        agent: implementer
        prompt: implement-task.md
        input: task

      - name: reviews
        type: parallel
        steps:
          - name: review-code-quality
            agent: reviewer
            prompt: code-quality-review.md
            output: codeQualityReview
          - name: review-test-coverage
            agent: reviewer
            prompt: test-coverage-review.md
            output: testCoverageReview
          - name: review-security
            agent: reviewer
            prompt: security-review.md
            output: securityReview

      - name: fix-loop
        type: loop
        condition: codeQualityReview.hasActionableIssues || testCoverageReview.hasActionableIssues || securityReview.hasCriticalIssues
        maxRetries: 2
        onExhausted: escalate
        steps:
          - name: fix-issues
            agent: implementer
            prompt: fix-issues.md
            input:
              codeQualityIssues: codeQualityReview.actionableIssues
              testCoverageIssues: testCoverageReview.actionableIssues
              securityIssues: securityReview.criticalIssues

          - name: re-reviews
            type: parallel
            steps:
              - name: re-review-code-quality
                agent: reviewer
                prompt: code-quality-review.md
                output: codeQualityReview
              - name: re-review-test-coverage
                agent: reviewer
                prompt: test-coverage-review.md
                output: testCoverageReview
              - name: re-review-security
                agent: reviewer
                prompt: security-review.md
                output: securityReview

      - name: checkpoint
        type: code
        handler: save-checkpoint

  - name: verify
    agent: verifier
    prompt: run-verification.md
    output: verification

  - name: publish
    condition: verification.allPassed
    agent: implementer
    prompt: publish-changes.md
    output: publish
```

### Agent File Format

Agent files are markdown with YAML frontmatter. The body is the agent's system prompt -- its identity and behavioral instructions.

```markdown
---
name: implementer
description: Code implementation specialist
tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Edit
  - Write
model: opus
---

You are a code implementation specialist. You write production-quality code
following TDD: write failing tests first, then implement the minimum code
to pass.

## Git

You are working in a git worktree managed by the workflow engine. After
completing your work (implementation passes tests), commit your changes:

- Stage relevant files (not scratch/temporary files)
- Use conventional commit format: `implement: {task title}`
- Do NOT push, create branches, or manage worktrees -- the engine handles that
```

```markdown
---
name: reviewer
description: Code review specialist
tools:
  - Read
  - Glob
  - Grep
model: sonnet
---

You are a code review specialist. You analyze code changes for quality,
correctness, and adherence to project conventions.

You provide structured feedback with actionable issues categorized by severity.
You never approve code that has critical issues. You are thorough but not
pedantic -- focus on issues that matter.

## Git

You are read-only. Do NOT commit, push, or modify any files. Use git diff
and git log to understand what changed.
```

**Frontmatter fields:**

- `name`: Agent identifier (referenced by workflow steps)
- `description`: Human-readable description
- `tools`: Default tool set available to this agent
- `model`: Default model (can be overridden per-step)

**Body**: System prompt that establishes the agent's persona, expertise, and behavioral guidelines. Includes git responsibilities appropriate to the agent's role.

### Prompt File Format

Prompt files are markdown with YAML frontmatter. The body is the task instructions -- what to do right now.

Prompts are usable in three contexts:

1. **Workflow steps**: The engine loads and executes them as part of a workflow
2. **Standalone invocation**: A user or agent runs a prompt directly (e.g., "run the code-quality-review prompt against my changes")
3. **Ad-hoc composition**: Prompts can be composed into custom pipelines without defining a full workflow

Template variables (Mustache `{{ }}`) are optional. A prompt with no variables works standalone with no context injection. A prompt with variables requires the caller to supply them.

```markdown
---
name: code-quality-review
description: Reviews code for quality, readability, and best practices
---

Review the recent changes for:

1. Code readability and clarity
2. Function length (flag functions >50 lines)
3. Naming conventions
   ...

## Context

Files changed: {{ changedFiles }}
Task: {{ task.title }}

## Output

Return structured JSON with issues found.
```

**Frontmatter fields:**

- `name`: Prompt identifier (referenced by workflow steps)
- `description`: Human-readable description

**Body**: Task instructions with optional Mustache template variables. Output format described in natural language. No persona definition -- that comes from the agent.

### How Agents and Prompts Compose

When the engine executes a step like:

```yaml
- name: review-code-quality
  agent: reviewer
  prompt: code-quality-review.md
  output: codeQualityReview
```

It does the following:

1. Resolves `reviewer` agent via layered search -> loads `agents/reviewer.md`
2. Resolves `code-quality-review.md` prompt via layered search -> loads `prompts/code-quality-review.md`
3. Renders the prompt body with current workflow context variables
4. Dispatches a subagent with:
   - **Working directory**: the session's worktree path
   - **System prompt**: agent body (reviewer persona)
   - **User prompt**: rendered prompt body (code quality review instructions)
   - **Tools**: agent's tool list
   - **Model**: step override > agent default > workflow default
5. Captures structured output into the `codeQualityReview` variable

The working directory is always the worktree. Subagents don't need to know they're in a worktree -- they just work in the directory they're given. The engine handles the plumbing.

This separation means a project can:

- Override the `reviewer` agent to be stricter, without touching any prompts
- Override the `code-quality-review` prompt to add HIPAA checks, without changing the agent
- Add a new `hipaa-compliance-review.md` prompt that reuses the existing `reviewer` agent

### Built-in Context Variables

The engine provides these variables to all prompt templates via Mustache interpolation. Step outputs (stored via `output:` fields) are also available by name.

| Variable       | Type     | Available                  | Description                                                                    |
| -------------- | -------- | -------------------------- | ------------------------------------------------------------------------------ |
| `spec`         | object   | Always                     | Parsed spec file: `spec.title`, `spec.id`, `spec.content` (full markdown body) |
| `worktreePath` | string   | Always                     | Absolute path to the session's git worktree                                    |
| `sessionId`    | string   | Always                     | Current session identifier                                                     |
| `branchName`   | string   | Always                     | Git branch name for this session                                               |
| `task`         | object   | In `per-task` steps        | Current task: `task.id`, `task.title`, `task.description`                      |
| `taskIndex`    | number   | In `per-task` steps        | Zero-based index of current task in the list                                   |
| `taskCount`    | number   | In `per-task` steps        | Total number of tasks                                                          |
| `changedFiles` | string[] | After implementation steps | Files modified since the worktree was created (via `git diff --name-only`)     |

Step outputs are available by their `output:` name. For example, after a step with `output: codeQualityReview`, subsequent prompts can reference `{{ codeQualityReview }}` or use it in conditions.

### Directory Structure

```
# Builtin (ships with wrangler)
workflows/                              # Workflow definitions
  spec-implementation.yaml              # Default workflow
  engine/                               # Engine source
    src/
      resolver.ts                       # Layered template resolution
      engine.ts                         # Step execution
      loader.ts                         # Workflow/prompt/agent loading
      types.ts                          # Step, workflow, agent types
      schemas/
        workflow.ts                     # Workflow YAML schema
        agent.ts                        # Agent file schema
        prompt.ts                       # Prompt file schema
        step-result.ts                  # Step result schema

agents/                                 # Agent personas
  planner.md                            # Spec analysis and planning
  implementer.md                        # Code implementation (TDD)
  reviewer.md                           # Code review specialist
  verifier.md                           # Verification and test running

prompts/                                # Task instructions
  analyze-spec.md                       # Analyze a spec into tasks
  implement-task.md                     # Implement a single task
  fix-issues.md                         # Fix issues found in review
  run-verification.md                   # Run tests and verify
  publish-changes.md                    # Create PR / publish
  code-quality-review.md                # Code quality checklist
  test-coverage-review.md               # Test coverage analysis
  security-review.md                    # Security audit checklist

# Project-level (user-created)
.wrangler/workflows/                    # Override or add workflows
  spec-implementation.yaml              # Optional: override entire workflow

.wrangler/agents/                       # Override or add agents
  reviewer.md                           # Override: stricter reviewer for this project

.wrangler/prompts/                      # Override or add prompts
  code-quality-review.md                # Override: add HIPAA checks
  hipaa-compliance-review.md            # New: project-specific review
```

## Implementation Plan

### Phase 1: Template Resolver

- Implement `WorkflowResolver` with 2-tier search path
- Resolution for workflows, agents, and prompts
- Schema validation for all three file types
- Unit tests with mock filesystems

### Phase 2: Agent + Prompt Step Execution

- Implement `prompt` step type in engine
- Load agent file via resolver (system prompt, tools, model)
- Load prompt file via resolver (task instructions, output schema)
- Compose agent system prompt with rendered prompt body
- Dispatch subagent with composed prompt, agent tools, and resolved model
- Capture structured output into named variable
- Record step result in audit trail (including agent and prompt sources)
- Unit tests with mock query functions

### Phase 3: Parallel Step Groups

- Implement `parallel` step type
- Dispatch all child steps concurrently
- Collect all results, fail group if any child fails
- Respect per-step timeouts

### Phase 4: Condition Evaluation

- Implement condition expression parser
- Support dot-notation, boolean/comparison operators, string methods
- Validate expressions at workflow load time
- Integrate with loop and conditional step execution

### Phase 5: Migrate Existing Definitions

- Create agent files in `agents/` from existing agent definitions (extract personas)
- Create prompt files in `prompts/` from existing `review-gates/*.md` (extract task instructions)
- Rewrite `spec-implementation.yaml` to new format (agent + prompt steps, inline config)
- Remove `gate-group` step type
- Update engine tests for new format

### Phase 6: Session Tool Integration

- Update `session_start` to accept workflow name, skipChecks, skipStepNames
- Update `session_checkpoint` to include step results
- Update `session_complete` to include step execution summary
- Validate phase transitions against workflow definition

## Testing Strategy

### Unit Tests

- **WorkflowResolver**: Resolution ordering for workflows/agents/prompts, project overrides builtin, unique project files included alongside builtin
- **Agent + prompt composition**: Agent system prompt composed with rendered prompt body, correct tools and model resolved
- **Prompt step execution**: Mock query function, verify composed prompt dispatched with correct working directory, output captured to variable
- **Parallel execution**: Multiple steps dispatched, all must complete, failure propagation
- **Condition evaluation**: Dot-notation access, boolean logic, comparison operators, invalid expression rejection
- **Step enable/disable**: Disabled step skipped with audit entry
- **Worktree creation**: Session start creates worktree and branch, path collision handling, non-git fallback

### Integration Tests

- End-to-end workflow: run spec-implementation with mock query functions, verify all steps execute in order
- Fix loop: review step finds issues, fix step runs, re-review passes, loop exits
- Step skip: `--skip-step=review-security`, verify skipped with audit entry, other steps still run
- Layered resolution: project agent and prompt overrides builtin, verify project versions used
- Git isolation: all subagents receive worktree path as working directory, worktree persists after session_complete

### Smoke Tests

- Run actual spec implementation against a test repository
- Verify review prompts execute and produce structured output
- Verify fix loop triggers on real code quality issues
- Test project-level prompt addition
- Verify implementation agent commits in worktree, commits appear on correct branch

## Risks & Mitigations

| Risk                                         | Likelihood | Impact | Mitigation                                                    |
| -------------------------------------------- | ---------- | ------ | ------------------------------------------------------------- |
| Prompt step timeouts block workflow          | Medium     | High   | Per-step timeout, configurable error policy                   |
| False positive review results block progress | Medium     | High   | Fix loop with maxRetries, escalate to user on exhaustion      |
| Condition expression complexity              | Low        | Medium | Validate at load time, keep expression language minimal       |
| Agent cost from running all review steps     | High       | Low    | Per-step model override (use haiku for reviews), step disable |

## Success Criteria

1. The engine has `prompt`, `code`, `loop`, `parallel`, `per-task` step types. Nothing else.
2. Agents (personas) and prompts (task instructions) are separate files. A workflow step combines them.
3. In a workflow run, every non-disabled step executes. The orchestrating agent has no mechanism to skip steps.
4. A project agent in `.wrangler/agents/` or prompt in `.wrangler/prompts/` overrides the builtin of the same name.
5. `session_complete` includes a summary of every step executed, with agent, prompt, and results.
6. A project can disable steps, add new steps, override agents/prompts, and change models by customizing files in `.wrangler/`.
7. Additional workflows can be added on a per-project scope by adding them to `.wrangler/workflows/` without modifying wrangler source.
8. Fix loops trigger only when review output indicates issues, using expression evaluation on step output variables.
9. The same agent can execute different prompts, and the same prompt can be executed by different agents.
