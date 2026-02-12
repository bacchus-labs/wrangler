---
id: SPEC-000044
title: Deterministic Workflow Engine for Spec Implementation
type: specification
status: open
priority: high
labels:
  - specification
  - architecture
  - workflow-engine
  - agent-sdk
  - deterministic-workflow
createdAt: '2026-02-12T03:56:37.863Z'
updatedAt: '2026-02-12T04:30:00.000Z'
project: Deterministic Workflows
---
# Specification: Deterministic Workflow Engine for Spec Implementation

## Executive Summary

**What:** A declarative workflow engine that uses the Claude Agent SDK to orchestrate spec-to-PR workflows with deterministic phase sequencing. Workflows are defined in YAML files (`workflows/<name>.yaml`), agent prompts are markdown files, and review gates are drop-in `.md` files in a directory. The engine interprets these definitions, executing each step as a separate `query()` call with isolated context. The sequencing between steps is controlled by the engine (TypeScript code), not LLM prompts.

**Why:** The current `implement-spec-v2` skill defines workflow phases as instructions to an LLM orchestrator. The LLM treats these as suggestions and frequently skips quality gates (code review, testing, verification). This is a fundamental limitation of LLM-as-orchestrator -- the agent reasons about whether each step is "needed" and decides to skip the ones it considers unnecessary. Moving control flow from prompts to code eliminates this class of failure.

**Scope:**
- Included: Workflow engine, YAML workflow definitions, markdown agent definitions, pluggable review gates, structured output schemas, session integration, hooks integration, CLI entry point, slash command
- Excluded: Changes to the existing MCP session tools (reuse as-is), changes to existing skills (coexist), new MCP tools (engine uses SDK directly)

**Status:** Draft

---

## Goals and Non-Goals

### Goals

1. **Deterministic phase sequencing** -- Code controls which phases run and in what order. The LLM cannot skip, reorder, or merge phases.
2. **Isolated agent contexts** -- Each phase gets a fresh `query()` session. The implement agent cannot see the review prompt; the review agent cannot skip to publishing.
3. **Structured inter-phase communication** -- Agents return Zod-validated JSON. No parsing natural language between phases.
4. **Retry logic in code** -- Review/fix loops have code-enforced retry limits (max 2 attempts), not LLM-decided retries.
5. **Resumability** -- Workflow state checkpointed after each phase. Crashed workflows resume from last checkpoint.
6. **Audit trail** -- Every phase transition logged to existing MCP session audit system (JSONL).
7. **MCP integration** -- Agents within the workflow can use wrangler MCP tools for issue management.
8. **Hooks integration** -- Claude Code PostToolUse hooks fire within each agent for micro-level enforcement (lint, format).
9. **Pluggable review gates** -- Review steps discover agent definitions from a directory. Adding a new review focus (security, performance, test coverage) means dropping a `.md` file -- zero code changes.
10. **Declarative workflow definitions** -- The workflow structure (phases, loops, gates) is defined in YAML, not hardcoded in TypeScript. Modifying the workflow means editing a YAML file, not the engine.

### Non-Goals

- Replacing the existing `implement` or `implement-spec-v2` skills immediately (coexist until verified)
- Supporting non-Claude LLMs (SDK is Claude-specific)
- GUI or web interface (CLI and slash command only)
- Parallel task execution within a single workflow run (sequential for v1; parallelism is a future enhancement)

---

## Background & Context

### The Problem

The current `implement-spec-v2` skill defines a 7-phase workflow:

```
ANALYZE -> PLAN -> EXECUTE (per-task: implement -> review -> fix) -> VERIFY -> PUBLISH
```

These phases are defined as markdown instructions in `SKILL.md`. The LLM orchestrator reads these instructions and is supposed to follow them. In practice:

- **Code review gets skipped** -- The agent decides "the implementation looks good, no need for review"
- **Testing gets skipped** -- The agent declares "tests pass" without running them
- **Fix loops terminate early** -- The agent marks issues as "minor" to avoid the fix cycle
- **Verification is perfunctory** -- The agent runs a subset of checks and declares success

This is not a prompt engineering problem. It is a fundamental limitation: LLMs reason about instructions and decide which ones to follow. Quality gates defined as instructions are suggestions, not gates.

### The Fix

From Anthropic's own engineering blog on effective agent harnesses: **use agents within steps, but use code for sequencing between steps.**

The Claude Agent SDK's `query()` function creates isolated agent sessions. By making each phase a separate `query()` call, the workflow engine guarantees:

1. The review agent ALWAYS runs after implementation (code calls it)
2. The review agent CANNOT skip ahead (it doesn't know publishing exists)
3. The fix loop ALWAYS retries up to the limit (code counts retries)
4. The test suite ALWAYS runs before declaring success (code executes it)

### Current State

| Component | Status | Reuse? |
|-----------|--------|--------|
| `implement-spec-v2` skill | Working but unreliable phases | Coexist |
| `implement` skill | Working, subagent-based | Coexist |
| MCP session tools (5 tools) | Working, well-tested | Reuse directly |
| `SessionStorageProvider` | Working (context.json, checkpoint.json, audit.jsonl) | Reuse directly |
| Session types + Zod schemas | Working | Import directly |
| Audit entry types | Working (9 audit entry types) | Import directly |
| MCP issue tools (11 tools) | Working | Pass via MCP to agents |

---

## Requirements

### Functional Requirements

- **FR-001:** Engine MUST accept a workflow YAML definition and execute it deterministically
- **FR-002:** Each agent step MUST be a separate `query()` call with isolated agent context
- **FR-003:** Agents MUST return structured output validated against Zod schemas
- **FR-004:** `loop` steps MUST enforce code-controlled retry limits before escalating
- **FR-005:** Engine MUST checkpoint state after each completed step
- **FR-006:** Engine MUST be resumable from the last checkpoint after crash/interruption
- **FR-007:** Engine MUST create audit entries for every phase transition using the existing MCP session audit system
- **FR-008:** Implementation agents MUST have access to wrangler MCP tools (issues, session) via MCP server config
- **FR-009:** Engine MUST escalate blockers (unclear requirements, flummoxed fixes) by pausing and surfacing the issue
- **FR-010:** Engine MUST support a `--dry-run` flag that runs analyze + plan without executing
- **FR-011:** Engine MUST produce a final summary report with test results, TDD compliance, review outcomes, and files changed
- **FR-012:** Engine MUST be invocable via CLI (`npx`) and via wrangler slash command
- **FR-013:** `gate-group` steps MUST discover agent definitions from a directory of `.md` files
- **FR-014:** Adding a new review gate MUST require only adding a `.md` file -- zero engine code changes
- **FR-015:** Workflow definitions MUST be YAML files in `workflows/` directory

### Non-Functional Requirements

- **Performance:** Engine overhead (excluding agent execution time) MUST be under 5 seconds per phase transition
- **Reliability:** Engine MUST NOT lose state on process termination (checkpoint before each phase)
- **Security:** Engine MUST NOT pass API keys or secrets in agent prompts. Use environment variables only.
- **Observability:** Every step start/complete/fail MUST be logged with timestamps and metadata to audit.jsonl
- **Compatibility:** Engine MUST work with Claude Agent SDK `@anthropic-ai/claude-agent-sdk` latest stable version
- **Testing:** Engine orchestration logic MUST have >80% test coverage (agent calls mocked)

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Workflow Engine (TypeScript)                    │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  YAML Definition (workflows/spec-implementation.yaml)      │  │
│  │  Declares: phases, per-task loops, gate-groups, fix loops  │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │ parsed into                           │
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Engine Interpreter                                         │  │
│  │  Recursively executes step types:                          │  │
│  │    agent      → single query() call                        │  │
│  │    code       → TypeScript handler function                │  │
│  │    per-task   → iterate over list, run steps for each      │  │
│  │    gate-group → discover *.md in directory, run each       │  │
│  │    loop       → repeat steps while condition, up to max    │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                       │
│  ┌────────────────────────▼───────────────────────────────────┐  │
│  │  State Manager                                              │  │
│  │  - Workflow state (in-memory + checkpoint)                  │  │
│  │  - SessionStorageProvider (audit, context)                  │  │
│  │  - Structured output accumulator                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Workflow Definition

The core of the architecture is the YAML workflow definition. The engine is a generic interpreter for this definition -- it does not hardcode any workflow structure.

```yaml
# workflows/spec-implementation.yaml
name: spec-implementation
version: 1

defaults:
  model: opus
  permissionMode: bypassPermissions
  settingSources: ["project"]

phases:
  - name: analyze
    agent: agents/analyzer.md
    model: sonnet                    # override: analysis doesn't need opus
    output: analysis                 # name for structured result

  - name: plan
    type: code                       # not an agent -- runs TypeScript function
    handler: create-issues           # maps to a registered handler function
    input: analysis

  - name: execute
    type: per-task                   # iterates over analysis.tasks
    source: analysis.tasks
    steps:

      - name: implement
        agent: agents/implementer.md
        input: task                  # current task from iteration

      - name: review
        type: gate-group             # discovers + runs all gates in directory
        gates: review-gates/
        output: review

      - name: fix
        type: loop
        condition: review.hasActionableIssues
        maxRetries: 2
        onExhausted: escalate
        steps:
          - name: fix-issues
            agent: agents/fixer.md
            input: review.actionableIssues

          - name: re-review
            type: gate-group
            gates: review-gates/
            output: review           # overwrites -- loop re-evaluates condition

      - name: checkpoint
        type: code
        handler: save-checkpoint

  - name: verify
    agent: agents/verifier.md
    output: verification
    failWhen: verification.testSuite.exitCode != 0

  - name: publish
    agent: agents/publisher.md
    output: publish
```

### Step Types

The engine interprets 5 step types:

| Step Type | What it does | YAML key |
|-----------|-------------|----------|
| `agent` | Single `query()` call using a markdown agent definition | `agent: path.md` |
| `code` | Runs a registered TypeScript handler function (not an agent) | `type: code`, `handler: name` |
| `per-task` | Iterates over a list, runs nested `steps` for each item | `type: per-task`, `source: expr` |
| `gate-group` | Discovers all `.md` files in a directory, runs each as a `query()` | `type: gate-group`, `gates: dir/` |
| `loop` | Repeats nested `steps` while `condition` is true, up to `maxRetries` | `type: loop`, `condition: expr` |

### Agent Definitions (Markdown)

Each agent is a markdown file with YAML frontmatter:

```markdown
---
name: implementer
description: Implements a single task following TDD
tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep",
        "mcp__wrangler__issues_get", "mcp__wrangler__issues_update"]
model: opus
outputSchema: schemas/implementation.ts#ImplementResultSchema
---

You are implementing a single task.

## Task
{{task.title}}: {{task.description}}

## Requirements
{{#each task.requirements}}
- {{this}}
{{/each}}

## Rules
1. Follow TDD: Write failing test FIRST, then implement, then refactor
2. Commit after each green phase
3. Return structured JSON with files changed, test results, and TDD certification

Do NOT skip writing tests. Do NOT skip running tests.
```

### Review Gates (Drop-in Markdown)

Review gates live in a directory. The engine discovers all `.md` files and runs each as a separate `query()` call:

```
workflows/
├── review-gates/
│   ├── security.md
│   ├── code-quality.md
│   ├── test-coverage.md
│   └── ...add more by dropping files here
```

Each gate file:

```markdown
---
name: security-review
description: Check for security vulnerabilities
tools: ["Read", "Glob", "Grep", "Bash"]
model: sonnet
outputSchema: schemas/review.ts#ReviewResultSchema
runCondition: always               # always | changed-files-match | manual
filePatterns: ["**/*.ts"]          # only run if changed files match (optional)
---

You are a security review specialist. Review the git diff for:

1. SQL injection vulnerabilities
2. XSS attack vectors
3. Authentication/authorization bypass
4. Secrets or credentials in code
5. Path traversal risks

Categorize each issue as critical, important, or minor.
Return structured JSON matching the ReviewResult schema. Do NOT modify any files.
```

**What changes look like:**

| Action | What to do |
|--------|-----------|
| Add a new review focus (e.g., performance) | Drop a `.md` file in `review-gates/`. Zero code changes. |
| Adjust a review's strictness | Edit the `.md` prompt. Zero code changes. |
| Disable a review temporarily | Rename to `.md.disabled` or add `enabled: false` in frontmatter. |
| Change model per review | Update `model:` in frontmatter. |
| Restrict which files trigger a gate | Set `filePatterns:` in frontmatter. |
| Use different gate groups for different steps | Point to different directories: `gates: review-gates/fast/` vs `gates: review-gates/thorough/` |

### Workflow State Machine

```
INIT ──→ ANALYZE ──→ PLAN ──→ EXECUTE ──→ VERIFY ──→ PUBLISH ──→ COMPLETE
  │         │          │         │           │          │           │
  └─────────┴──────────┴─────────┴───────────┴──────────┴───────────┘
                              │
                           FAILED (any phase)
                              │
                           PAUSED (blocker escalation)
```

States:
- `INIT` -- Workflow created, spec file loaded
- `ANALYZE` -- Analyze agent running
- `PLAN` -- Creating MCP issues from analysis
- `EXECUTE` -- Per-task implement/review/fix loop
- `VERIFY` -- Full test suite + requirements check
- `PUBLISH` -- Creating PR
- `COMPLETE` -- All done, summary generated
- `FAILED` -- Unrecoverable error
- `PAUSED` -- Blocker escalated, waiting for human input

### Execute Phase Detail (Per-Task Loop with Gate Groups)

For each task in dependency order:

```
                    ┌──────────────┐
                    │  IMPLEMENT   │
                    │  (query())   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  GATE GROUP  │  discovers review-gates/*.md
                    │  (N queries) │  runs each gate as query()
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐   aggregate results from all gates
              ┌─no──│  Has issues? │──yes─┐
              │     │  (code)      │      │
              │     └──────────────┘      │
              │                    ┌──────▼───────┐
              │                    │    FIX       │
              │                    │  (query())   │
              │                    └──────┬───────┘
              │                           │
              │                    ┌──────▼───────┐
              │                    │  GATE GROUP  │  re-run all gates
              │                    │  (N queries) │
              │                    └──────┬───────┘
              │                           │
              │                    ┌──────▼───────┐
              │              ┌─no──│  Retry < 2?  │──yes──→ back to FIX
              │              │     │  (code)      │
              │              │     └──────────────┘
              │              │
              │       ┌──────▼───────┐
              │       │  ESCALATE    │ → PAUSED
              │       │  (blocker)   │
              │       └──────────────┘
              │
       ┌──────▼───────┐
       │  CHECKPOINT   │
       │  (code)       │  → save state, next task
       └──────────────┘
```

### Directory Structure

```
wrangler/
├── workflows/                         # NEW: Declarative workflow system
│   ├── engine/                        # Workflow engine (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts               # CLI entry point
│   │   │   ├── engine.ts              # Generic workflow engine/interpreter
│   │   │   ├── state.ts               # Workflow state machine
│   │   │   ├── loader.ts             # YAML + markdown parser/loader
│   │   │   ├── handlers/             # Built-in code handlers
│   │   │   │   ├── create-issues.ts   # Plan phase: create MCP issues
│   │   │   │   ├── save-checkpoint.ts # Checkpoint handler
│   │   │   │   └── registry.ts        # Handler registry
│   │   │   ├── schemas/              # Zod schemas for structured output
│   │   │   │   ├── analysis.ts        # AnalysisResult schema
│   │   │   │   ├── implementation.ts  # ImplementResult schema
│   │   │   │   ├── review.ts          # ReviewResult schema
│   │   │   │   ├── fix.ts             # FixResult schema
│   │   │   │   ├── verification.ts    # VerifyResult schema
│   │   │   │   └── publish.ts         # PublishResult schema
│   │   │   └── integration/           # Integration with existing infra
│   │   │       ├── session.ts         # MCP session integration
│   │   │       └── mcp.ts            # MCP server config for agents
│   │   ├── __tests__/                 # Test suite
│   │   │   ├── engine.test.ts         # Engine interpreter tests
│   │   │   ├── state.test.ts          # State machine tests
│   │   │   ├── loader.test.ts         # YAML/markdown loading tests
│   │   │   ├── schemas/              # Schema validation tests
│   │   │   └── integration/           # Integration tests
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── spec-implementation.yaml       # Default workflow definition
│   │
│   ├── agents/                        # Agent definitions (markdown)
│   │   ├── analyzer.md                # Spec analysis agent
│   │   ├── implementer.md             # Per-task implementation agent
│   │   ├── fixer.md                   # Issue fix agent
│   │   ├── verifier.md               # Full verification agent
│   │   └── publisher.md              # PR creation agent
│   │
│   └── review-gates/                  # Drop-in review gate definitions
│       ├── code-quality.md            # Code quality review
│       ├── security.md                # Security review
│       └── test-coverage.md           # Test coverage review
│
├── mcp/                               # EXISTING: Reuse session + issue tools
├── skills/                            # EXISTING: Coexist with implement skills
```

---

## Implementation Details

### Workflow Engine Core

The engine is a recursive interpreter for the YAML workflow definition. It does not hardcode any workflow structure -- it only understands the 5 step types.

```typescript
// engine.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

export class WorkflowEngine {
  private state: WorkflowState;
  private sessionStorage: SessionStorageProvider;
  private handlerRegistry: HandlerRegistry;
  private config: EngineConfig;

  async run(definitionPath: string, specPath: string): Promise<WorkflowResult> {
    const definition = await loadWorkflowYaml(definitionPath);
    const context = new WorkflowContext({ specPath });

    await this.initSession(specPath);

    for (const phase of definition.phases) {
      await this.executeStep(phase, context);
    }

    return context.getResult();
  }

  private async executeStep(
    step: StepDefinition,
    ctx: WorkflowContext
  ): Promise<void> {
    await this.auditStepStart(step.name);

    switch (step.type ?? "agent") {
      case "agent":
        return this.runAgent(step, ctx);

      case "code":
        return this.runHandler(step, ctx);

      case "per-task": {
        const items = ctx.resolve(step.source);
        for (const item of this.topologicalSort(items)) {
          const taskCtx = ctx.withTask(item);
          for (const childStep of step.steps) {
            await this.executeStep(childStep, taskCtx);
          }
        }
        break;
      }

      case "gate-group":
        return this.runGateGroup(step, ctx);

      case "loop": {
        for (let attempt = 0; attempt < step.maxRetries; attempt++) {
          for (const childStep of step.steps) {
            await this.executeStep(childStep, ctx);
          }
          if (!ctx.evaluate(step.condition)) break; // condition cleared
        }
        if (ctx.evaluate(step.condition)) {
          // exhausted retries, condition still true
          await this.handleExhausted(step, ctx);
        }
        break;
      }
    }

    await this.auditStepComplete(step.name);
  }

  private async runAgent(step: StepDefinition, ctx: WorkflowContext): Promise<void> {
    const agentDef = await loadAgentMarkdown(step.agent);
    const prompt = renderTemplate(agentDef.prompt, ctx.getTemplateVars());
    const schema = await resolveSchema(agentDef.outputSchema);

    let result = null;

    for await (const message of query({
      prompt,
      options: {
        allowedTools: agentDef.tools,
        outputFormat: schema ? { type: "json_schema", schema } : undefined,
        model: step.model ?? agentDef.model ?? this.config.defaults.model,
        cwd: this.config.workingDirectory,
        permissionMode: this.config.defaults.permissionMode,
        mcpServers: this.getMcpConfig(),
        settingSources: this.config.defaults.settingSources,
      }
    })) {
      if ("structured_output" in message && message.structured_output) {
        result = message.structured_output;
      }
    }

    if (step.output && result) {
      ctx.set(step.output, result);
    }

    // Check failWhen condition if specified
    if (step.failWhen && ctx.evaluate(step.failWhen)) {
      throw new WorkflowFailure(step.name, step.failWhen);
    }
  }

  private async runGateGroup(step: StepDefinition, ctx: WorkflowContext): Promise<void> {
    const gateFiles = await discoverGates(step.gates); // glob *.md
    const allIssues: ReviewIssue[] = [];
    const gateResults: GateResult[] = [];

    for (const gateFile of gateFiles) {
      const gateDef = await loadAgentMarkdown(gateFile);

      // Check runCondition
      if (gateDef.runCondition === "changed-files-match" && gateDef.filePatterns) {
        if (!ctx.changedFilesMatch(gateDef.filePatterns)) continue;
      }
      if (gateDef.enabled === false) continue;

      const result = await this.runSingleGate(gateDef, ctx);
      gateResults.push({ gate: gateDef.name, ...result });
      allIssues.push(...result.issues.map(i => ({ ...i, foundBy: gateDef.name })));
    }

    // Aggregate into unified review result
    const aggregated = aggregateGateResults(gateResults);
    if (step.output) {
      ctx.set(step.output, aggregated);
    }
  }
}
```

### Agent Definition Format

Agent markdown files use YAML frontmatter for configuration and the body as the prompt template:

```markdown
---
name: analyzer
description: Reads specification and extracts structured task list
tools: ["Read", "Glob", "Grep", "mcp__wrangler__issues_list", "mcp__wrangler__issues_get"]
model: sonnet
outputSchema: schemas/analysis.ts#AnalysisResultSchema
---

You are a specification analyzer. Read the provided spec file and extract a
structured task list with dependencies, testable requirements, and technical
constraints.

## Spec File
{{specPath}}

## Instructions
1. Read the specification thoroughly
2. Extract implementation tasks with clear boundaries
3. Identify dependencies between tasks
4. List all testable requirements
5. Note technical constraints and stack requirements

Return structured JSON matching the output schema. Do not implement anything.
```

### Review Gate Format

Same markdown format, with additional gate-specific frontmatter:

```markdown
---
name: security-review
description: Check for security vulnerabilities
tools: ["Read", "Glob", "Grep", "Bash"]
model: sonnet
outputSchema: schemas/review.ts#ReviewResultSchema
runCondition: always
filePatterns: ["**/*.ts", "**/*.js"]
enabled: true
---

You are a security review specialist. Review the git diff for:

1. SQL injection vulnerabilities
2. XSS attack vectors
3. Authentication/authorization bypass
4. Secrets or credentials in code
5. Path traversal risks
6. Unsafe deserialization
7. Dependency vulnerabilities

Categorize each issue as critical, important, or minor.
Return structured JSON. Do NOT modify any files.
```

### Structured Output Schemas

```typescript
// schemas/analysis.ts
export const TaskDefinitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  dependencies: z.array(z.string()).default([]),
  estimatedComplexity: z.enum(["low", "medium", "high"]),
  filePaths: z.array(z.string()).default([]),
});

export const AnalysisResultSchema = z.object({
  tasks: z.array(TaskDefinitionSchema),
  requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
    source: z.string(),
    testable: z.boolean(),
  })),
  constraints: z.array(z.string()),
  techStack: z.object({
    language: z.string(),
    testFramework: z.string(),
    buildTool: z.string().optional(),
  }),
});

// schemas/review.ts
export const ReviewIssueSchema = z.object({
  severity: z.enum(["critical", "important", "minor"]),
  description: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
  fixInstructions: z.string(),
  foundBy: z.string().optional(),  // which gate found this
});

export const ReviewResultSchema = z.object({
  assessment: z.enum(["approved", "needs_revision"]),
  issues: z.array(ReviewIssueSchema),
  strengths: z.array(z.string()),
  hasActionableIssues: z.boolean(),  // computed: any critical/important?
  testCoverage: z.object({
    adequate: z.boolean(),
    notes: z.string().optional(),
  }).optional(),
});

// schemas/implementation.ts
export const ImplementResultSchema = z.object({
  filesChanged: z.array(z.object({
    path: z.string(),
    action: z.enum(["created", "modified", "deleted"]),
    linesAdded: z.number(),
    linesRemoved: z.number(),
  })),
  testResults: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    exitCode: z.number(),
  }),
  tddCertification: z.object({
    functions: z.array(z.object({
      name: z.string(),
      testFile: z.string(),
      watchedFail: z.boolean(),
      watchedPass: z.boolean(),
    })),
  }),
  commits: z.array(z.string()),
});

// schemas/verification.ts
export const VerifyResultSchema = z.object({
  testSuite: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    exitCode: z.number(),
    coverage: z.number().optional(),
  }),
  requirements: z.array(z.object({
    id: z.string(),
    description: z.string(),
    met: z.boolean(),
    evidence: z.string(),
  })),
  gitClean: z.boolean(),
});
```

### Resumability

```typescript
async resume(sessionId: string): Promise<WorkflowResult> {
  const checkpoint = await this.sessionStorage.getCheckpoint(sessionId);
  if (!checkpoint) throw new Error("No checkpoint found");

  const context = WorkflowContext.fromCheckpoint(checkpoint);
  const definition = await loadWorkflowYaml(checkpoint.variables.definitionPath);

  // Find the step we were on and resume from there
  const resumeFrom = checkpoint.lastAction;
  const phases = definition.phases;
  const startIdx = phases.findIndex(p => p.name === resumeFrom);

  for (let i = startIdx; i < phases.length; i++) {
    await this.executeStep(phases[i], context);
  }

  return context.getResult();
}
```

### CLI Entry Point

```typescript
// index.ts
import { Command } from "commander";

const program = new Command();

program
  .name("wrangler-workflow")
  .description("Deterministic workflow engine for spec implementation");

program
  .command("run")
  .argument("<spec-file>", "Path to specification file")
  .option("-w, --workflow <name>", "Workflow definition to use", "spec-implementation")
  .option("--dry-run", "Run analyze + plan only")
  .option("--resume <session-id>", "Resume from checkpoint")
  .option("--working-dir <dir>", "Override working directory")
  .option("--model <model>", "Override default model", "opus")
  .action(async (specFile, options) => {
    const workflowPath = `workflows/${options.workflow}.yaml`;
    const engine = new WorkflowEngine(options);

    if (options.resume) {
      const result = await engine.resume(options.resume);
    } else {
      const result = await engine.run(workflowPath, specFile);
    }

    console.log(formatResult(result));
  });
```

### Hooks Integration

For micro-level enforcement within each agent's execution:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./workflows/engine/scripts/post-edit-lint.sh"
          }
        ]
      }
    ]
  }
}
```

These hooks fire automatically within each `query()` call because the Claude Agent SDK respects the project's hook configuration when `settingSources: ["project"]` is set.

---

## Workflow Extensibility Examples

### Adding a Performance Review Gate

Drop a new file in `review-gates/`:

```markdown
---
name: performance-review
description: Check for performance anti-patterns
tools: ["Read", "Glob", "Grep"]
model: sonnet
outputSchema: schemas/review.ts#ReviewResultSchema
runCondition: changed-files-match
filePatterns: ["**/*.ts", "**/*.sql"]
---

You are a performance review specialist. Review the changes for:

1. N+1 query patterns
2. Unbounded loops over collections
3. Missing pagination
4. Synchronous I/O in hot paths
5. Missing caching opportunities

Categorize each issue as critical, important, or minor.
```

That's it. Next workflow run picks it up automatically.

### Creating a Variant Workflow

Copy and modify the YAML:

```yaml
# workflows/quick-fix.yaml -- lightweight variant for small fixes
name: quick-fix
version: 1

defaults:
  model: sonnet                      # cheaper model for small fixes

phases:
  - name: implement
    agent: agents/implementer.md
    input: task

  - name: review
    type: gate-group
    gates: review-gates/
    output: review

  - name: verify
    agent: agents/verifier.md
    output: verification
    failWhen: verification.testSuite.exitCode != 0
```

No analyze, no plan, no fix loop, no publish. Just implement -> review -> verify.

### Splitting Reviews into Fast and Thorough

```yaml
      - name: fast-review
        type: gate-group
        gates: review-gates/fast/    # quick checks (lint, types)
        output: fastReview

      - name: fix-fast
        type: loop
        condition: fastReview.hasActionableIssues
        maxRetries: 1
        onExhausted: escalate
        steps:
          - name: fix-fast-issues
            agent: agents/fixer.md
            input: fastReview.actionableIssues
          - name: re-fast-review
            type: gate-group
            gates: review-gates/fast/
            output: fastReview

      - name: thorough-review
        type: gate-group
        gates: review-gates/thorough/ # deeper analysis (security, perf)
        output: thoroughReview

      - name: fix-thorough
        type: loop
        condition: thoroughReview.hasActionableIssues
        maxRetries: 2
        onExhausted: escalate
        steps:
          - name: fix-thorough-issues
            agent: agents/fixer.md
            input: thoroughReview.actionableIssues
          - name: re-thorough-review
            type: gate-group
            gates: review-gates/thorough/
            output: thoroughReview
```

---

## Security Considerations

### API Key Management

- `ANTHROPIC_API_KEY` passed via environment variable, never in prompts
- MCP server credentials (if any) passed via environment, not prompt injection
- Agent prompts contain task descriptions only, never secrets

### Tool Restrictions

- Review gates have NO write access (read-only tools: Read, Glob, Grep, Bash for `git diff` only)
- Analyze agent has NO write access
- Only implement and fix agents get Write/Edit/Bash
- MCP tool access scoped per agent (analyzer gets read-only MCP tools, implementer gets read-write)

### Workflow State

- Checkpoint files stored in `.wrangler/sessions/` (same as existing MCP sessions)
- No sensitive data in checkpoint state (task IDs and phase names only)
- Audit log is append-only JSONL

---

## Error Handling

### Error Categories

| Category | Response | Recovery |
|----------|----------|----------|
| Agent produces invalid structured output | Retry query() once with correction prompt | If retry fails, mark phase as failed |
| Agent exceeds max_turns without result | Mark phase as timed out | Resume from checkpoint |
| Gate group finds critical issues | Enter fix loop (max retries from YAML) | If fix loop exhausted, PAUSE and escalate |
| Test suite fails in verification | Return failure with test output | Human fixes, resumes workflow |
| MCP server unavailable | Retry with backoff (3 attempts) | If unavailable, fail with clear error |
| Process killed/crash | State preserved in checkpoint | Resume from last checkpoint |
| Unclear requirements detected by agent | Agent returns "blocker" in structured output | Workflow PAUSES, surfaces to human |
| Invalid workflow YAML | Fail fast with validation error | Human fixes YAML, re-runs |
| Agent markdown missing/malformed | Fail fast with file path | Human fixes markdown, re-runs |

### Escalation Protocol

When the engine encounters a blocker it cannot resolve:

1. Workflow state transitions to `PAUSED`
2. Checkpoint saved with full context
3. Blocker details written to stdout and to `.wrangler/sessions/{id}/blocker.json`
4. Process exits with code 2 (distinguished from 0=success, 1=error)
5. Human resolves the blocker
6. Human resumes with `wrangler-workflow run --resume <session-id>`

---

## Testing Strategy

### Unit Tests

- **Engine interpreter tests:** All 5 step types execute correctly, nested steps work, context propagation
- **State machine tests:** All state transitions, edge cases (double-complete, resume from each state)
- **Schema validation tests:** Valid and invalid data for every Zod schema
- **Loader tests:** YAML parsing, markdown frontmatter parsing, template rendering
- **Gate discovery tests:** Glob finds gates, respects enabled/disabled, runCondition filtering
- **Handler registry tests:** Register, lookup, execute code handlers
- **Checkpoint tests:** Save, load, resume from each phase

### Integration Tests (mocked agents)

- **Full workflow happy path:** Mock all `query()` calls to return valid structured output. Verify all phases execute in order.
- **Gate group aggregation:** Mock multiple gate agents returning different issues. Verify aggregation and deduplication.
- **Review rejection flow:** Mock gates to return issues. Verify fix loop runs exactly maxRetries times before escalation.
- **Resume from checkpoint:** Save checkpoint at each phase, verify resume skips completed phases.
- **Dry-run mode:** Verify only analyze + plan execute, no implementation.
- **Variant workflows:** Test quick-fix and other variant YAML definitions.

### E2E Tests

- **Real agent execution:** Against a small test spec (3-task spec for a simple module). Verify full workflow completes and produces working code.
- **Measured against skill-based workflow:** Same spec run through both `implement-spec-v2` skill and workflow engine. Compare: Did the engine actually enforce all quality gates?

---

## Deployment

### As Part of Wrangler Plugin

The workflow engine ships as part of the wrangler plugin. The `package.json` for `workflows/engine/` has its own build step that compiles TypeScript to JavaScript. The compiled output is included in the plugin distribution.

### Slash Command

A new slash command `/wrangler:workflow` invokes the CLI:

```markdown
---
name: workflow
description: Run deterministic workflow for spec implementation
---

Run the deterministic workflow engine for spec implementation.

Usage: /wrangler:workflow <spec-file> [options]

Options:
  -w, --workflow <name>   Workflow to use (default: spec-implementation)
  --dry-run               Analyze and plan only
  --resume <id>           Resume from checkpoint
```

### Dependencies

New dependencies for `workflows/engine/`:
- `@anthropic-ai/claude-agent-sdk` -- Claude Agent SDK
- `commander` -- CLI argument parsing
- `yaml` -- YAML parsing
- `gray-matter` -- Markdown frontmatter parsing (already in repo)
- `zod` -- Schema validation (already in repo)
- Existing wrangler MCP types imported directly (no duplication)

---

## Open Questions & Decisions

### Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Consistent with existing MCP server. Can import types directly. |
| Location | `workflows/` in wrangler repo | Ships with plugin, natural naming. |
| Coexistence | Keep existing skills | Verify engine works before deprecating skills. |
| Agent isolation | Separate `query()` per phase | Prevents phase-skipping by design. |
| Workflow structure | Declarative YAML | Editable without touching engine code. |
| Review extensibility | Drop-in markdown gate files | Zero code changes to add/remove review focuses. |
| Naming | `workflows/` not `pipeline/` | More intuitive, less implementation jargon. |

### Open Questions

1. **Model selection per agent:** Should the user be able to override which model each agent uses, or should it be hardcoded (opus for implement/fix, sonnet for analyze/review)?
2. **Parallel task execution:** V1 is sequential. Should we design the state machine to support future parallelism, or keep it simple for now?
3. **Permission mode:** Should the engine always use `bypassPermissions` (since it's an automated workflow), or should it respect the user's permission settings?
4. **Hooks passthrough:** Should the engine configure hooks for each agent call, or rely on the project's existing hook configuration?
5. **Cost tracking:** Should the engine track and report total API cost across all agent calls?
6. **Template engine:** What template syntax for agent prompts? Handlebars (`{{task.title}}`), simple string interpolation, or something else?

---

## Success Criteria

### Launch Criteria

- [ ] Engine executes the `spec-implementation` workflow end-to-end
- [ ] Review gates ALWAYS run after implementation (verified by audit log)
- [ ] Fix loop retries exactly maxRetries times before escalation (verified by test)
- [ ] Engine resumes from checkpoint after simulated crash
- [ ] Structured output schemas validate correctly for all agent outputs
- [ ] Adding a new `.md` gate file works without code changes (verified by test)
- [ ] Test coverage >80% for engine orchestration code
- [ ] CLI entry point works with `npx`
- [ ] Slash command invocation works

### Success Metrics (Post-Launch)

- **Quality gate enforcement rate:** 100% of implementations get reviewed (vs. ~60-70% with skill-based workflow)
- **Fix loop completion rate:** 100% of critical/important issues enter fix cycle (vs. frequently skipped)
- **Test suite execution rate:** 100% of workflow runs include full verification (vs. sometimes skipped)
- **Resume success rate:** >90% of paused workflows successfully resume after blocker resolution

---

## References

### Internal

- Current `implement-spec-v2` skill: `skills/implement-spec-v2/SKILL.md`
- Current `implement` skill: `skills/implement/SKILL.md`
- MCP session types: `mcp/types/session.ts`
- Session storage provider: `mcp/providers/session-storage.ts`
- MCP server: `mcp/server.ts`

### External

- [Claude Agent SDK (TypeScript)](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Claude Agent SDK Structured Output](https://platform.claude.com/docs/en/agent-sdk/structured-outputs)
- [Claude Agent SDK Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [Claude Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [Effective Harnesses for Long-Running Agents (Anthropic Engineering)](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Building Agents with Claude Agent SDK (Anthropic Engineering)](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
