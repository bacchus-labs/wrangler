---
id: SPEC-000044
title: Deterministic Agent Pipeline for Spec Implementation
type: specification
status: open
priority: high
labels:
  - specification
  - architecture
  - pipeline
  - agent-sdk
  - deterministic-workflow
createdAt: '2026-02-12T03:56:37.863Z'
updatedAt: '2026-02-12T03:56:37.863Z'
project: Deterministic Pipeline
---
# Specification: Deterministic Agent Pipeline for Spec Implementation

## Executive Summary

**What:** A TypeScript pipeline script that uses the Claude Agent SDK to orchestrate spec-to-PR workflows with deterministic phase sequencing. Each phase (analyze, implement, review, test, fix, verify, publish) is a separate `query()` call with isolated context. The sequencing between phases is controlled by TypeScript code, not LLM prompts.

**Why:** The current `implement-spec-v2` skill defines workflow phases as instructions to an LLM orchestrator. The LLM treats these as suggestions and frequently skips quality gates (code review, testing, verification). This is a fundamental limitation of LLM-as-orchestrator -- the agent reasons about whether each step is "needed" and decides to skip the ones it considers unnecessary. Moving control flow from prompts to code eliminates this class of failure.

**Scope:**
- Included: Pipeline script, agent definitions, structured output schemas, session integration, hooks integration, CLI entry point, slash command
- Excluded: Changes to the existing MCP session tools (reuse as-is), changes to existing skills (coexist), new MCP tools (pipeline uses SDK directly)

**Status:** Draft

---

## Goals and Non-Goals

### Goals

1. **Deterministic phase sequencing** -- Code controls which phases run and in what order. The LLM cannot skip, reorder, or merge phases.
2. **Isolated agent contexts** -- Each phase gets a fresh `query()` session. The implement agent cannot see the review prompt; the review agent cannot skip to publishing.
3. **Structured inter-phase communication** -- Agents return Zod-validated JSON. No parsing natural language between phases.
4. **Retry logic in code** -- Review/fix loops have code-enforced retry limits (max 2 attempts), not LLM-decided retries.
5. **Resumability** -- Pipeline state checkpointed after each phase. Crashed pipelines resume from last checkpoint.
6. **Audit trail** -- Every phase transition logged to existing MCP session audit system (JSONL).
7. **MCP integration** -- Agents within the pipeline can use wrangler MCP tools for issue management.
8. **Hooks integration** -- Claude Code PostToolUse hooks fire within each agent for micro-level enforcement (lint, format).

### Non-Goals

- Replacing the existing `implement` or `implement-spec-v2` skills immediately (coexist until verified)
- Building a general-purpose workflow engine (this is purpose-built for spec implementation)
- Supporting non-Claude LLMs (SDK is Claude-specific)
- GUI or web interface (CLI and slash command only)
- Parallel task execution within a single pipeline run (sequential for v1; parallelism is a future enhancement)

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

The Claude Agent SDK's `query()` function creates isolated agent sessions. By making each phase a separate `query()` call, the pipeline guarantees:

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

- **FR-001:** Pipeline MUST accept a spec file path and execute the full analyze -> implement -> review -> test -> fix -> verify -> publish workflow
- **FR-002:** Each pipeline phase MUST be a separate `query()` call with isolated agent context
- **FR-003:** Agents MUST return structured output validated against Zod schemas
- **FR-004:** Review -> fix loop MUST retry up to 2 times for critical/important issues before escalating
- **FR-005:** Pipeline MUST checkpoint state after each completed phase
- **FR-006:** Pipeline MUST be resumable from the last checkpoint after crash/interruption
- **FR-007:** Pipeline MUST create audit entries for every phase transition using the existing MCP session audit system
- **FR-008:** Implementation agents MUST have access to wrangler MCP tools (issues, session) via MCP server config
- **FR-009:** Pipeline MUST escalate blockers (unclear requirements, flummoxed fixes) by pausing and surfacing the issue
- **FR-010:** Pipeline MUST support a `--dry-run` flag that runs analyze + plan without executing
- **FR-011:** Pipeline MUST produce a final summary report with test results, TDD compliance, review outcomes, and files changed
- **FR-012:** Pipeline MUST be invocable via CLI (`npx`) and via wrangler slash command

### Non-Functional Requirements

- **Performance:** Pipeline overhead (excluding agent execution time) MUST be under 5 seconds per phase transition
- **Reliability:** Pipeline MUST NOT lose state on process termination (checkpoint before each phase)
- **Security:** Pipeline MUST NOT pass API keys or secrets in agent prompts. Use environment variables only.
- **Observability:** Every phase start/complete/fail MUST be logged with timestamps and metadata to audit.jsonl
- **Compatibility:** Pipeline MUST work with Claude Agent SDK `@anthropic-ai/claude-agent-sdk` latest stable version
- **Testing:** Pipeline orchestration logic MUST have >80% test coverage (agent calls mocked)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Runner (TypeScript)               │
│                                                               │
│  ┌──────────┐    ┌───────────┐    ┌──────────┐              │
│  │ Analyze  │───→│ Plan      │───→│ Execute  │──→ ...       │
│  │ Agent    │    │ (code)    │    │ Loop     │              │
│  └──────────┘    └───────────┘    └──────────┘              │
│       │                                │                     │
│       │ structured                     │ for each task:      │
│       │ output                         │                     │
│       ▼                                ▼                     │
│  AnalysisResult              ┌──────────────────┐           │
│                              │  Implement Agent  │           │
│                              └────────┬─────────┘           │
│                                       │                     │
│                                       ▼                     │
│                              ┌──────────────────┐           │
│                              │  Review Agent     │  (read-only)
│                              └────────┬─────────┘           │
│                                       │                     │
│                              (code decides if fix needed)    │
│                                       │                     │
│                              ┌──────────────────┐           │
│                              │  Fix Agent        │  (max 2x) │
│                              └────────┬─────────┘           │
│                                       │                     │
│                              ┌──────────────────┐           │
│                              │  Verify Agent     │           │
│                              └────────┬─────────┘           │
│                                       │                     │
│                              ┌──────────────────┐           │
│                              │  Publish Agent    │           │
│                              └──────────────────┘           │
│                                                               │
│  ┌─────────────────────────────────────────────┐             │
│  │  State Manager                               │             │
│  │  - Pipeline state (in-memory + checkpoint)   │             │
│  │  - SessionStorageProvider (audit, context)   │             │
│  │  - Structured output accumulator             │             │
│  └─────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### Pipeline State Machine

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
- `INIT` -- Pipeline created, spec file loaded
- `ANALYZE` -- Analyze agent running
- `PLAN` -- Creating MCP issues from analysis
- `EXECUTE` -- Per-task implement/review/fix loop
- `VERIFY` -- Full test suite + requirements check
- `PUBLISH` -- Creating PR
- `COMPLETE` -- All done, summary generated
- `FAILED` -- Unrecoverable error
- `PAUSED` -- Blocker escalated, waiting for human input

### Execute Phase Detail (Per-Task Loop)

For each task in dependency order:

```
                    ┌──────────────┐
                    │  IMPLEMENT   │
                    │  (query())   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   REVIEW     │
                    │  (query())   │  read-only tools
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
              ┌─no──│  Has issues? │──yes─┐
              │     │  (code)      │      │
              │     └──────────────┘      │
              │                    ┌──────▼───────┐
              │                    │    FIX       │
              │                    │  (query())   │
              │                    └──────┬───────┘
              │                           │
              │                    ┌──────▼───────┐
              │              ┌─no──│  Retry < 2?  │──yes──→ RE-REVIEW
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
├── pipeline/                          # NEW: Deterministic pipeline
│   ├── src/
│   │   ├── index.ts                   # CLI entry point
│   │   ├── pipeline.ts                # Main pipeline orchestrator
│   │   ├── state.ts                   # Pipeline state machine
│   │   ├── agents/                    # Agent definitions per phase
│   │   │   ├── analyzer.ts            # Spec analysis agent
│   │   │   ├── implementer.ts         # Per-task implementation agent
│   │   │   ├── reviewer.ts            # Code review agent (read-only)
│   │   │   ├── fixer.ts               # Issue fix agent
│   │   │   ├── verifier.ts            # Full verification agent
│   │   │   └── publisher.ts           # PR creation agent
│   │   ├── schemas/                   # Zod schemas for structured output
│   │   │   ├── analysis.ts            # AnalysisResult schema
│   │   │   ├── implementation.ts      # ImplementResult schema
│   │   │   ├── review.ts              # ReviewResult schema
│   │   │   ├── fix.ts                 # FixResult schema
│   │   │   ├── verification.ts        # VerifyResult schema
│   │   │   └── publish.ts             # PublishResult schema
│   │   └── integration/               # Integration with existing infra
│   │       ├── session.ts             # MCP session integration
│   │       ├── issues.ts              # MCP issue creation from analysis
│   │       └── hooks.ts               # Claude Code hooks config
│   ├── __tests__/                     # Test suite
│   │   ├── pipeline.test.ts           # Pipeline orchestration tests
│   │   ├── state.test.ts              # State machine tests
│   │   ├── agents/                    # Agent definition tests
│   │   ├── schemas/                   # Schema validation tests
│   │   └── integration/               # Integration tests
│   ├── tsconfig.json
│   └── package.json
│
├── mcp/                               # EXISTING: Reuse session + issue tools
├── skills/                            # EXISTING: Coexist with implement skills
```

---

## Implementation Details

### Agent Definitions

Each agent is defined with specific tool access, system prompt, and structured output schema.

#### Analyze Agent

```typescript
const analyzerAgent: AgentConfig = {
  name: "analyzer",
  description: "Reads specification and extracts structured task list",
  tools: ["Read", "Glob", "Grep", "mcp__wrangler__issues_list", "mcp__wrangler__issues_get"],
  model: "sonnet",  // Analysis doesn't need opus
  outputSchema: AnalysisResultSchema,
  prompt: `You are a specification analyzer. Read the provided spec file and extract:
    1. A list of implementation tasks with dependencies
    2. A list of testable requirements
    3. Technical constraints and considerations
    Return structured JSON matching the output schema. Do not implement anything.`
};
```

#### Implement Agent (per-task)

```typescript
const implementerAgent: AgentConfig = {
  name: "implementer",
  description: "Implements a single task following TDD",
  tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep",
          "mcp__wrangler__issues_get", "mcp__wrangler__issues_update"],
  model: "opus",  // Implementation needs strongest model
  outputSchema: ImplementResultSchema,
  prompt: (task: TaskDefinition) => `You are implementing a single task.
    
    ## Task
    ${task.title}: ${task.description}
    
    ## Requirements
    ${task.requirements.join('\n')}
    
    ## Rules
    1. Follow TDD: Write failing test FIRST, then implement, then refactor
    2. Commit after each green phase
    3. Return structured JSON with files changed, test results, and TDD certification
    
    Do NOT skip writing tests. Do NOT skip running tests.`
};
```

#### Review Agent (read-only)

```typescript
const reviewerAgent: AgentConfig = {
  name: "reviewer",
  description: "Reviews code changes for quality issues",
  tools: ["Read", "Glob", "Grep", "Bash"],  // Bash for git diff only
  model: "sonnet",
  outputSchema: ReviewResultSchema,
  prompt: `You are a code reviewer. Review the git diff for:
    1. Correctness: Does the code do what it should?
    2. Security: Any vulnerabilities?
    3. Quality: Naming, structure, patterns?
    4. Tests: Are tests comprehensive and meaningful?
    
    Categorize each issue as critical, important, or minor.
    Return structured JSON. Do NOT modify any files.`
};
```

#### Fix Agent

```typescript
const fixerAgent: AgentConfig = {
  name: "fixer",
  description: "Fixes issues identified by code review",
  tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  model: "opus",
  outputSchema: FixResultSchema,
  prompt: (issues: ReviewIssue[]) => `You are fixing code review issues.
    
    ## Issues to Fix
    ${issues.map(i => `- [${i.severity}] ${i.description}\n  Fix: ${i.fixInstructions}`).join('\n')}
    
    Fix each issue, run tests, and commit. Return structured JSON.`
};
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
  filePaths: z.array(z.string()).default([]),  // Expected files to touch
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
});

export const ReviewResultSchema = z.object({
  assessment: z.enum(["approved", "needs_revision"]),
  issues: z.array(ReviewIssueSchema),
  strengths: z.array(z.string()),
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

### Pipeline Orchestrator Core

```typescript
// pipeline.ts (conceptual structure)
import { query, ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";

export class SpecPipeline {
  private state: PipelineState;
  private sessionStorage: SessionStorageProvider;
  private config: PipelineConfig;

  async run(specPath: string): Promise<PipelineResult> {
    // 1. INIT
    await this.initSession(specPath);

    // 2. ANALYZE -- always runs, agent cannot skip
    const analysis = await this.runAnalyzePhase(specPath);
    await this.checkpoint("analyze", { analysis });

    // 3. PLAN -- code creates MCP issues (deterministic)
    const issues = await this.runPlanPhase(analysis);
    await this.checkpoint("plan", { issues });

    // 4. EXECUTE -- per-task loop with review/fix gates
    for (const task of this.topologicalSort(analysis.tasks)) {
      // 4a. Implement (agent)
      const implResult = await this.runImplementPhase(task);

      // 4b. Review (agent, read-only) -- ALWAYS runs
      const reviewResult = await this.runReviewPhase(task);

      // 4c. Fix loop (code-controlled retry)
      if (reviewResult.assessment === "needs_revision") {
        const actionableIssues = reviewResult.issues
          .filter(i => i.severity !== "minor");
        
        let fixed = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          const fixResult = await this.runFixPhase(actionableIssues, attempt);
          const reReview = await this.runReviewPhase(task); // re-review
          
          if (reReview.assessment === "approved") {
            fixed = true;
            break;
          }
          actionableIssues = reReview.issues
            .filter(i => i.severity !== "minor");
        }
        
        if (!fixed) {
          await this.escalate(task, actionableIssues);
          // Pipeline PAUSES here -- human must intervene
          return { status: "paused", blocker: { task, issues: actionableIssues } };
        }
      }

      await this.checkpoint("task_complete", { taskId: task.id });
    }

    // 5. VERIFY -- always runs, agent cannot skip
    const verification = await this.runVerifyPhase();
    if (verification.testSuite.exitCode !== 0) {
      return { status: "failed", reason: "Test suite failed in final verification" };
    }
    await this.checkpoint("verify", { verification });

    // 6. PUBLISH -- always runs
    const publishResult = await this.runPublishPhase();
    await this.completeSession(publishResult);

    return { status: "complete", ...publishResult };
  }

  // Each phase calls query() with isolated context
  private async runAnalyzePhase(specPath: string): Promise<AnalysisResult> {
    await this.auditPhaseStart("analyze");
    
    let result: AnalysisResult | null = null;
    
    for await (const message of query({
      prompt: `Analyze the specification at ${specPath} ...`,
      options: {
        allowedTools: ["Read", "Glob", "Grep"],
        outputFormat: { type: "json_schema", schema: AnalysisResultSchema },
        cwd: this.config.workingDirectory,
        permissionMode: "bypassPermissions",
        mcpServers: this.getMcpConfig(),
        settingSources: ["project"],
      }
    })) {
      if ("structured_output" in message && message.structured_output) {
        result = AnalysisResultSchema.parse(message.structured_output);
      }
    }
    
    if (!result) throw new PipelineError("Analyze phase produced no output");
    
    await this.auditPhaseComplete("analyze", { taskCount: result.tasks.length });
    return result;
  }

  private async runReviewPhase(task: TaskDefinition): Promise<ReviewResult> {
    await this.auditPhaseStart("review");
    
    let result: ReviewResult | null = null;
    
    for await (const message of query({
      prompt: `Review the changes for task: ${task.title}...`,
      options: {
        allowedTools: ["Read", "Glob", "Grep", "Bash"],  // Bash for git diff
        outputFormat: { type: "json_schema", schema: ReviewResultSchema },
        cwd: this.config.workingDirectory,
        permissionMode: "bypassPermissions",
        mcpServers: this.getMcpConfig(),
      }
    })) {
      if ("structured_output" in message && message.structured_output) {
        result = ReviewResultSchema.parse(message.structured_output);
      }
    }
    
    if (!result) throw new PipelineError("Review phase produced no output");
    
    await this.auditPhaseComplete("review", {
      assessment: result.assessment,
      issueCount: result.issues.length,
    });
    return result;
  }

  // ... similar for other phases
}
```

### Resumability

```typescript
// When resuming from checkpoint:
async resume(sessionId: string): Promise<PipelineResult> {
  const checkpoint = await this.sessionStorage.getCheckpoint(sessionId);
  if (!checkpoint) throw new Error("No checkpoint found");

  // Restore state
  this.state = PipelineState.fromCheckpoint(checkpoint);

  // Skip completed phases, resume from current
  switch (this.state.currentPhase) {
    case "analyze":
      // Re-run analyze (idempotent)
      return this.run(this.state.specPath);
    case "plan":
      // Skip analyze, resume from plan
      return this.runFromPlan(checkpoint.variables.analysis);
    case "execute":
      // Skip completed tasks, resume from next pending
      return this.runFromTask(
        checkpoint.tasksPending[0],
        checkpoint.variables.analysis
      );
    case "verify":
      return this.runFromVerify();
    case "publish":
      return this.runFromPublish();
  }
}
```

### CLI Entry Point

```typescript
// index.ts
import { Command } from "commander";

const program = new Command();

program
  .name("wrangler-pipeline")
  .description("Deterministic agent pipeline for spec implementation");

program
  .command("run")
  .argument("<spec-file>", "Path to specification file")
  .option("--dry-run", "Run analyze + plan only")
  .option("--resume <session-id>", "Resume from checkpoint")
  .option("--working-dir <dir>", "Override working directory")
  .option("--model <model>", "Override default model", "opus")
  .action(async (specFile, options) => {
    const pipeline = new SpecPipeline(options);
    
    if (options.resume) {
      const result = await pipeline.resume(options.resume);
    } else {
      const result = await pipeline.run(specFile);
    }
    
    // Print summary
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
            "command": "./pipeline/scripts/post-edit-lint.sh"
          }
        ]
      }
    ]
  }
}
```

These hooks fire automatically within each `query()` call because the Claude Agent SDK respects the project's hook configuration when `settingSources: ["project"]` is set.

---

## Security Considerations

### API Key Management

- `ANTHROPIC_API_KEY` passed via environment variable, never in prompts
- MCP server credentials (if any) passed via environment, not prompt injection
- Agent prompts contain task descriptions only, never secrets

### Tool Restrictions

- Review agent has NO write access (read-only tools: Read, Glob, Grep, Bash for `git diff` only)
- Analyze agent has NO write access
- Only implement and fix agents get Write/Edit/Bash
- MCP tool access scoped per agent (analyzer gets read-only MCP tools, implementer gets read-write)

### Pipeline State

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
| Review finds critical issues | Enter fix loop (max 2 attempts) | If fix loop exhausted, PAUSE and escalate |
| Test suite fails in verification | Return failure with test output | Human fixes, resumes pipeline |
| MCP server unavailable | Retry with backoff (3 attempts) | If unavailable, fail with clear error |
| Process killed/crash | State preserved in checkpoint | Resume from last checkpoint |
| Unclear requirements detected by agent | Agent returns "blocker" in structured output | Pipeline PAUSES, surfaces to human |

### Escalation Protocol

When the pipeline encounters a blocker it cannot resolve:

1. Pipeline state transitions to `PAUSED`
2. Checkpoint saved with full context
3. Blocker details written to stdout and to `.wrangler/sessions/{id}/blocker.json`
4. Pipeline exits with code 2 (distinguished from 0=success, 1=error)
5. Human resolves the blocker
6. Human resumes with `wrangler-pipeline run --resume <session-id>`

---

## Testing Strategy

### Unit Tests

- **State machine tests:** All state transitions, edge cases (double-complete, resume from each state)
- **Schema validation tests:** Valid and invalid data for every Zod schema
- **Agent config tests:** Tool restrictions, prompt generation, model selection
- **Checkpoint tests:** Save, load, resume from each phase
- **Integration helper tests:** MCP server config generation, issue creation from analysis

### Integration Tests (mocked agents)

- **Full pipeline happy path:** Mock all `query()` calls to return valid structured output. Verify all phases execute in order.
- **Review rejection flow:** Mock reviewer to return issues. Verify fix loop runs exactly 2 times before escalation.
- **Resume from checkpoint:** Save checkpoint at each phase, verify resume skips completed phases.
- **Dry-run mode:** Verify only analyze + plan execute, no implementation.

### E2E Tests

- **Real agent execution:** Against a small test spec (3-task spec for a simple module). Verify full pipeline completes and produces working code.
- **Measured against skill-based workflow:** Same spec run through both `implement-spec-v2` skill and pipeline. Compare: Did pipeline actually enforce all quality gates?

---

## Deployment

### As Part of Wrangler Plugin

The pipeline ships as part of the wrangler plugin. The `package.json` for the pipeline has its own build step that compiles TypeScript to JavaScript. The compiled output is included in the plugin distribution.

### Slash Command

A new slash command `/wrangler:pipeline` invokes the CLI:

```markdown
---
name: pipeline
description: Run deterministic spec implementation pipeline
---

Run the deterministic agent pipeline for spec implementation.

Usage: /wrangler:pipeline <spec-file> [options]

Options:
  --dry-run         Analyze and plan only
  --resume <id>     Resume from checkpoint
```

### Dependencies

New dependencies for `pipeline/`:
- `@anthropic-ai/claude-agent-sdk` -- Claude Agent SDK
- `commander` -- CLI argument parsing
- `zod` -- Schema validation (already in repo)
- Existing wrangler MCP types imported directly (no duplication)

---

## Open Questions & Decisions

### Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Consistent with existing MCP server. Can import types directly. |
| Location | `pipeline/` in wrangler repo | Ships with plugin, no separate package overhead. |
| Coexistence | Keep existing skills | Verify pipeline works before deprecating skills. |
| Agent isolation | Separate `query()` per phase | Prevents phase-skipping by design. |
| Retry limit | 2 attempts for fix loop | Matches existing skill convention. |

### Open Questions

1. **Model selection per agent:** Should the user be able to override which model each agent uses, or should it be hardcoded (opus for implement/fix, sonnet for analyze/review)?
2. **Parallel task execution:** V1 is sequential. Should we design the state machine to support future parallelism, or keep it simple for now?
3. **Permission mode:** Should the pipeline always use `bypassPermissions` (since it's an automated pipeline), or should it respect the user's permission settings?
4. **Hooks passthrough:** Should the pipeline configure hooks for each agent call, or rely on the project's existing hook configuration?
5. **Cost tracking:** Should the pipeline track and report total API cost across all agent calls?

---

## Success Criteria

### Launch Criteria

- [ ] Pipeline executes full analyze -> implement -> review -> test -> fix -> verify -> publish workflow
- [ ] Review phase ALWAYS runs after implementation (verified by audit log)
- [ ] Fix loop retries exactly 2 times before escalation (verified by test)
- [ ] Pipeline resumes from checkpoint after simulated crash
- [ ] Structured output schemas validate correctly for all agent outputs
- [ ] Test coverage >80% for pipeline orchestration code
- [ ] CLI entry point works with `npx`
- [ ] Slash command invocation works

### Success Metrics (Post-Launch)

- **Quality gate enforcement rate:** 100% of implementations get reviewed (vs. ~60-70% with skill-based workflow)
- **Fix loop completion rate:** 100% of critical/important issues enter fix cycle (vs. frequently skipped)
- **Test suite execution rate:** 100% of pipeline runs include full verification (vs. sometimes skipped)
- **Resume success rate:** >90% of paused pipelines successfully resume after blocker resolution

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
