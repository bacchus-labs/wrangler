---
id: SPEC-000050
title: Configurable Workflow Reporters
type: specification
status: open
priority: high
labels:
  - specification
  - workflow-engine
  - reporters
  - github
createdAt: '2026-02-17T03:28:26.969Z'
updatedAt: '2026-02-17T03:35:43.208Z'
project: workflow-engine
---
# Specification: Configurable Workflow Reporters

## Executive Summary

**What:** A pluggable reporter system for the workflow engine that renders live progress updates to external surfaces (GitHub PR comments, Slack, webhooks, etc.) as a workflow executes. Includes a vision for optionally dispatching workflow steps to GitHub (via claude-code-action) as the execution environment, using the PR as both the audit surface and the orchestration channel.

**Why:** Today, workflow progress is only visible by reading raw session files (`audit.jsonl`, `context.json`). Users watching a workflow run -- especially on a PR -- want a human-friendly, live-updating view of progress without needing to ask an agent or run a status command. The Claude GitHub bot already demonstrates this pattern with live-updating PR comments that check off task list items as work completes.

**Scope:**
- Included: Reporter interface, workflow/step-level YAML config, `github-pr-comment` reporter implementation, engine integration via existing `onAuditEntry` callback, vision for GitHub-dispatched execution
- Excluded: Slack reporter, webhook reporter, custom reporter SDK (future work)

## Goals and Non-Goals

### Goals

- Let workflows declare output surfaces that receive live progress
- Support per-step visibility control (`visible`, `silent`, `summary`)
- Ship a `github-pr-comment` reporter that creates/updates a PR comment with a task list, spinner, and completion summary
- Integrate cleanly with the existing `onAuditEntry` callback pattern
- Make reporters pluggable so new reporter types can be added without engine changes
- Design step-level `runOn` config that enables future GitHub-dispatched execution while preserving local-only compatibility

### Non-Goals

- Building Slack, email, or generic webhook reporters (future work)
- Custom reporter plugin SDK for third parties
- Streaming partial step output to the comment (we report step transitions, not intermediate output)
- Replacing audit.jsonl (reporters are an additional output surface, not a replacement)
- Full implementation of GitHub-dispatched execution (this spec covers the design; implementation is a follow-up)

## Background & Context

### Current State

The workflow engine records audit entries via an `onAuditEntry` callback. The CLI wires this to `SessionManager.appendAuditEntry()`, which writes to `audit.jsonl`. Progress is checked by:

1. The `session_status` MCP tool (structured, machine-readable)
2. The `bin/check-workflow-status` bash script (human-readable terminal output)
3. Manually reading session files

None of these push updates to the user -- they all require the user to pull.

### Proposed State

Workflows can declare `reporters` in their YAML definition. Each reporter receives audit entries in real-time and renders progress to its configured surface. The first reporter type (`github-pr-comment`) creates a PR comment that looks like:

```markdown
Workflow **spec-implementation** is running... ![spinner](https://github.com/user-attachments/assets/5ac382c7-e004-429b-8e35-7feb3e8f9c6f)

- [x] analyze -- Completed in 1m 13s
- [x] plan -- Completed in 4m 21s
- [ ] execute (3/8 tasks)
  - [x] task-001: implement -> review -> fix
  - [x] task-002: implement -> review
  - [x] task-003: implement -> review
  - [ ] task-004: implement (in progress)
  - [ ] task-005
  - [ ] task-006
  - [ ] task-007
  - [ ] task-008
- [ ] verify
- [ ] publish
```

On completion, the spinner is removed and a summary is appended:

```markdown
Workflow **spec-implementation** completed in 28m 14s

- [x] analyze -- 1m 13s
- [x] plan -- 4m 21s
- [x] execute -- 19m 42s (8/8 tasks)
- [x] verify -- 1m 58s
- [x] publish -- 1m 0s

Branch: `wrangler/feature-name/wf-2026-02-16-abc123`
PR: #142
```

### Reference: claude-code-action Pattern

The Claude GitHub bot uses this exact approach:
- Creates an initial comment with an animated GIF spinner
- Provides an MCP tool (`update_claude_comment`) that PATCHes the comment body
- Task list uses standard GitHub markdown (`- [ ]` / `- [x]`)
- Comment body is fully replaced on each update
- Final update removes spinner, adds completion summary

Our implementation follows the same pattern but driven by the engine's audit entries rather than an LLM deciding when to update.

## Requirements

### Functional Requirements

- **FR-001:** Workflow YAML definitions MUST support an optional `reporters` array at the top level
- **FR-002:** Each reporter entry MUST have a `type` field and optional `config` object
- **FR-003:** Step definitions MUST support an optional `reportAs` field: `'visible'` (default), `'silent'`, or `'summary'`
- **FR-004:** `visible` steps MUST appear in the reporter output and update in real-time
- **FR-005:** `silent` steps MUST NOT appear in the reporter output at all
- **FR-006:** `summary` steps MUST appear only in the final completion summary, not during execution
- **FR-007:** The `github-pr-comment` reporter MUST create an initial PR comment with the full step list when the workflow starts
- **FR-008:** The `github-pr-comment` reporter MUST update the comment as steps start and complete
- **FR-009:** The `github-pr-comment` reporter MUST show a spinner animation during execution
- **FR-010:** The `github-pr-comment` reporter MUST replace the spinner with a completion summary when the workflow finishes
- **FR-011:** The `github-pr-comment` reporter MUST handle `per-task` steps by showing task-level progress (e.g., "3/8 tasks")
- **FR-012:** The `github-pr-comment` reporter MUST handle workflow failure/pause by updating the comment with error/blocker info
- **FR-013:** Reporters MUST NOT block workflow execution -- comment update failures MUST be logged but not halt the workflow
- **FR-014:** Multiple reporters MUST be supported simultaneously (e.g., GitHub comment + future Slack)
- **FR-015:** Step definitions MUST support an optional `runOn` field for future execution environment selection, defaulting to `'local'`
- **FR-016:** ~~DEFERRED~~ PR description tracker (HTML comment markers in PR body) moved to future work. The comment-based reporter provides sufficient visibility; a PR body tracker adds read-modify-write complexity with race condition risks.
- **FR-017:** ~~DEFERRED~~ See FR-016.
- **FR-018:** The workflow init phase MUST open a PR up front so the PR number is available to reporters from the start

### Non-Functional Requirements

- **NF-001:** Comment updates SHOULD be debounced (no more than 1 update per 2 seconds) to avoid GitHub API rate limiting
- **NF-002:** Reporter initialization MUST fail gracefully if config is invalid (log warning, continue without reporter)
- **NF-003:** The reporter system MUST NOT add dependencies to the core engine -- reporters are optional

## Architecture

### High-Level Design

```
WorkflowEngine
  │
  ├─> onAuditEntry(entry)
  │     │
  │     ├─> SessionManager.appendAuditEntry()     (existing: write to audit.jsonl)
  │     │
  │     └─> ReporterManager.onAuditEntry(entry)    (NEW: fan out to reporters)
  │           │
  │           ├─> GitHubPRCommentReporter.onEntry()
  │           ├─> [Future: SlackReporter.onEntry()]
  │           └─> [Future: WebhookReporter.onEntry()]
  │
  ├─> onWorkflowComplete(summary)
  │     │
  │     └─> ReporterManager.onComplete(summary)
  │           │
  │           └─> Each reporter renders final summary
  │
  └─> onWorkflowError(error)
        │
        └─> ReporterManager.onError(error)
```

### Components

#### Component 1: Reporter Interface

**File:** `workflows/engine/src/reporters/types.ts`

```typescript
export type StepVisibility = 'visible' | 'silent' | 'summary';

export interface ReporterConfig {
  type: string;
  config?: Record<string, unknown>;
}

export interface WorkflowReporter {
  /** Reporter type identifier */
  readonly type: string;

  /** Called once when the workflow starts, with context including step visibility */
  initialize(context: ReporterContext): Promise<void>;

  /**
   * Called for each non-silent audit entry during execution.
   * NOTE: The ReporterManager filters out silent entries before calling this --
   * reporters never see silent steps. This keeps visibility logic centralized
   * in the manager rather than duplicated across reporter implementations.
   */
  onAuditEntry(entry: WorkflowAuditEntry): Promise<void>;

  /** Called when workflow completes successfully */
  onComplete(summary: ExecutionSummary): Promise<void>;

  /** Called when workflow fails or pauses */
  onError(error: Error): Promise<void>;

  /** Cleanup (flush pending updates, etc.) */
  dispose(): Promise<void>;
}

export type ReporterFactory = (config: Record<string, unknown>) => WorkflowReporter;

export interface ReporterContext {
  sessionId: string;
  specFile: string;
  branchName: string;
  worktreePath: string;
  prNumber?: number;
  prUrl?: string;
  /** Pre-computed step visibility from the workflow definition */
  steps: Array<{ name: string; visibility: StepVisibility }>;
}
```

#### Component 2: ReporterManager

**File:** `workflows/engine/src/reporters/manager.ts`

Manages the lifecycle of all reporters for a workflow run:

- Instantiates reporters from workflow YAML config
- Resolves `reportAs` visibility for each step (walking the step tree to build a step-name -> visibility map)
- Filters out `silent` entries before fanning out to reporters (reporters never see silent steps)
- Fans out audit entries to all active reporters
- Catches and logs reporter errors without blocking the workflow
- NOTE: Debouncing is owned by individual reporters, not the manager. The manager fans out every entry immediately; each reporter decides its own update cadence.
- Calls `onComplete`/`onError` on all reporters when the workflow finishes

```typescript
export class ReporterManager {
  private reporters: WorkflowReporter[] = [];
  private visibilityMap: Map<string, StepVisibility>;

  constructor(
    workflow: WorkflowDefinition,
    registry: ReporterRegistry
  ) { ... }

  async initializeReporters(opts: ReporterManagerInitOptions): Promise<void> { ... }

  /** Filters silent entries, then fans out to all reporters */
  async onAuditEntry(entry: WorkflowAuditEntry): Promise<void> { ... }
  async onComplete(summary: ExecutionSummary): Promise<void> { ... }
  async onError(error: Error): Promise<void> { ... }
  async dispose(): Promise<void> { ... }
}
```

#### Component 3: ReporterRegistry

**File:** `workflows/engine/src/reporters/registry.ts`

Maps reporter type strings to factory functions:

```typescript
export type ReporterFactory = (config: Record<string, unknown>) => WorkflowReporter;

export class ReporterRegistry {
  private factories = new Map<string, ReporterFactory>();

  register(type: string, factory: ReporterFactory): void { ... }
  create(type: string, config: Record<string, unknown>): WorkflowReporter { ... }
}

export function createDefaultReporterRegistry(): ReporterRegistry {
  const registry = new ReporterRegistry();
  registry.register('github-pr-comment', (config) => new GitHubPRCommentReporter(config));
  return registry;
}
```

#### Component 4: GitHubPRCommentReporter

**File:** `workflows/engine/src/reporters/github-pr-comment.ts`

The first concrete reporter. Uses the GitHub REST API to create and update a PR comment.

**Config:**
```typescript
interface GitHubPRCommentConfig {
  /** GitHub token for API access */
  token: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** PR number */
  prNumber: number;
  /** Show animated spinner during execution (default: true) */
  spinner?: boolean;
  /** Debounce interval in ms (default: 2000) */
  debounceMs?: number;
}
```

**Behavior:**

1. `initialize()`: Creates the initial PR comment via `POST /repos/{owner}/{repo}/issues/{pr}/comments` with the full step list (all `visible` steps as unchecked boxes, `silent` steps omitted, `summary` steps omitted)
2. `onAuditEntry()`: Updates internal state, then debounce-PATCHes the comment:
   - `started` -> shows step as in-progress (with spinner if nested)
   - `completed` -> checks off the step (`- [x]`), appends duration
   - `failed` -> marks step with failure indicator
   - `skipped` -> marks step as skipped
3. `onComplete()`: Final PATCH removing spinner, adding completion summary with total duration, branch, and PR link
4. `onError()`: Updates comment with error/blocker information
5. `dispose()`: Flushes any pending debounced update

**Spinner:** Uses the same animated GIF as claude-code-action:
```
https://github.com/user-attachments/assets/5ac382c7-e004-429b-8e35-7feb3e8f9c6f
```

**Comment rendering:** The reporter maintains a `CommentState` object that tracks each visible step's status. On each update, it re-renders the full markdown body from this state and PATCHes the comment. No incremental edits.

**Per-task rendering:** For `per-task` steps, the reporter shows:
```markdown
- [ ] execute (3/8 tasks)
```
When expanded (if the per-task step is the active step):
```markdown
- [ ] execute (3/8 tasks)
  - [x] task-001: implement -> review -> fix (2m 14s)
  - [x] task-002: implement -> review (1m 48s)
  - [x] task-003: implement -> review (1m 22s)
  - [ ] task-004: implement (in progress)
  - [ ] task-005
  - [ ] task-006
  - [ ] task-007
  - [ ] task-008
```

### Workflow YAML Schema Changes

Add to `WorkflowDefinitionSchema`:

```typescript
const ReporterConfigSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.any()).optional(),
});

// Add to WorkflowDefinitionSchema
reporters: z.array(ReporterConfigSchema).optional(),
```

Add to `BaseStepSchema`:

```typescript
reportAs: z.enum(['visible', 'silent', 'summary']).default('visible'),
runOn: z.enum(['local', 'github']).default('local'),  // Future: execution environment
```

### Example Workflow YAML

```yaml
name: spec-implementation
version: 2

defaults:
  agent: analyzer
  model: opus
  permissionMode: bypassPermissions
  settingSources: ["project"]

reporters:
  - type: github-pr-comment
    config:
      token: "{{env.GITHUB_TOKEN}}"
      owner: "{{env.GITHUB_REPOSITORY_OWNER}}"
      repo: "{{env.GITHUB_REPOSITORY_NAME}}"
      prNumber: "{{context.prNumber}}"

safety:
  maxLoopRetries: 3
  maxStepTimeoutMs: 600000
  failOnStepError: true

phases:
  - name: analyze
    agent: analyzer
    prompt: analyze-spec
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
        prompt: implement-task
        input: task

      - name: review
        type: parallel
        output: review
        steps:
          - name: code-quality-review
            agent: reviewer
            prompt: code-quality-review
          - name: test-coverage-review
            agent: reviewer
            prompt: test-coverage-review
          - name: security-review
            agent: reviewer
            prompt: security-review

      - name: fix
        type: loop
        condition: review.hasActionableIssues
        maxRetries: 2
        onExhausted: escalate
        reportAs: summary
        steps:
          - name: fix-issues
            agent: fixer
            prompt: fix-issues
            input: review.actionableIssues
          - name: re-review
            type: parallel
            output: review
            steps:
              - name: code-quality-review
                agent: reviewer
                prompt: code-quality-review
              - name: test-coverage-review
                agent: reviewer
                prompt: test-coverage-review
              - name: security-review
                agent: reviewer
                prompt: security-review

      - name: checkpoint
        type: code
        handler: save-checkpoint
        reportAs: silent

  - name: verify
    agent: verifier
    prompt: run-verification
    output: verification

  - name: publish
    agent: publisher
    prompt: publish-changes
    output: publish
```

In this example:
- `checkpoint` steps are `silent` (internal bookkeeping, don't show to user)
- `fix` loop steps are `summary` (show in final report but don't clutter live view with fix iterations)
- Everything else is `visible` by default

## GitHub-Dispatched Execution: Phase-by-Phase Walkthrough

This section explores how each phase of the `spec-implementation` workflow could theoretically be dispatched to run on GitHub via claude-code-action, instead of (or in addition to) running locally. The goal is to show the design space, preserve full backward compatibility with local-only execution, and identify what the engine needs to support both modes.

### Execution Model Overview

Two execution modes, selectable per-step via `runOn`:

| Mode | How it works | Agent runs on | Output returned via |
|------|-------------|---------------|---------------------|
| `local` (default) | Engine calls `queryFn()` directly via Agent SDK | Local machine | In-process return value |
| `github` | Engine posts a PR comment triggering claude-code-action, then polls for completion | GitHub Actions runner | PR comment body or commit artifacts |

When `runOn: github`, the engine becomes an **orchestrator** rather than an executor. It:
1. Posts a structured comment on the PR (e.g., `@claude [step prompt here]`)
2. Waits for claude-code-action to pick it up and complete
3. Parses the result from the bot's response comment or from committed files
4. Feeds the result back into the workflow context

The PR itself becomes the audit log -- each step is a comment thread.

### Phase-by-Phase Analysis

#### Phase 1: analyze

**What it does locally:** Reads the spec file, produces a structured task breakdown (JSON output via `outputSchema`).

**GitHub dispatch version:**
```yaml
- name: analyze
  agent: analyzer
  prompt: analyze-spec
  model: sonnet
  output: analysis
  runOn: github  # <-- NEW
```

**How it would work on GitHub:**
1. Engine posts PR comment: `@claude Analyze this specification and produce a structured task breakdown. Spec: [spec content or link]. Output as JSON matching this schema: [schema]`
2. claude-code-action picks it up, runs Claude with the prompt
3. Claude's response comment contains the structured JSON output
4. Engine parses the JSON from the response comment, stores as `analysis` in context

**Feasibility: HIGH** -- This is a pure read-and-analyze step. No file modifications needed. The structured output can be extracted from the comment body. The prompt and agent markdown would need to be included in the comment or accessible from the repo.

**What the PR looks like:**
```
User (engine):    @claude Analyze spec SPEC-000050 and produce task breakdown...
Claude (bot):     Here's my analysis: { "tasks": [...], "summary": "..." }
```

---

#### Phase 2: plan (code step)

**What it does locally:** Runs `create-issues` handler -- converts analysis into wrangler MCP issues.

**GitHub dispatch version:**
```yaml
- name: plan
  type: code
  handler: create-issues
  input: analysis
  runOn: local  # Keep local -- MCP tool access needed
```

**Recommendation: KEEP LOCAL.** This step uses MCP tools (`issues_create`) which are local to the wrangler plugin. The GitHub runner wouldn't have access to the same MCP server. In the medium term, we plan to support GitHub Issues as a backend (in addition to or instead of local markdown files), which would make this step dispatchable. For now, keep local.

**Alternative approach:** If the analyze step produces a clean task list, the engine could create issues locally even when other steps run on GitHub. The `plan` step is lightweight code, not an LLM call.

---

#### Phase 3: execute (per-task)

This is the most interesting phase for GitHub dispatch because it's where the bulk of time and cost lives.

##### Step 3a: implement

**What it does locally:** For each task, runs the implementer agent which writes code, runs tests, and commits.

**GitHub dispatch version:**
```yaml
- name: implement
  agent: implementer
  prompt: implement-task
  input: task
  runOn: github  # <-- Each task dispatched as a separate PR comment
```

**How it would work on GitHub:**
1. Engine posts a comment per task: `@claude Implement task: [task description]. Branch: [branch]. Requirements: [from issue]. Follow TDD.`
2. claude-code-action runs Claude in the repo context -- it can read files, write code, run tests, and commit
3. When done, Claude's response comment describes what was implemented
4. Engine detects completion (comment posted by bot), extracts result, marks task done

**Feasibility: HIGH** -- This is exactly what claude-code-action is designed for. Each task implementation is a self-contained unit of work. The bot commits directly to the branch.

**What the PR looks like:**
```
User (engine):    @claude Implement task-001: Add input validation to init_workspace tool.
                  Branch: wrangler/feature/wf-abc123
                  Requirements: [issue description]
Claude (bot):     [x] Implemented input validation
                  [x] Added tests (5 passing)
                  [x] Committed: abc1234
```

**Per-task parallelism consideration:** On GitHub, individual `@claude` comments serialize within a concurrency group (GitHub Actions allows at most 1 running + 1 pending per group). However, using multi-job workflows or separate concurrency groups enables true parallelism. See Step 3b for details.

##### Step 3b: review (parallel)

**What it does locally:** Runs 3 review agents in parallel (code quality, test coverage, security). This already works locally via the engine's `type: parallel` step.

**GitHub dispatch version:**
```yaml
- name: review
  type: parallel
  output: review
  runOn: github
  steps:
    - name: code-quality-review
      agent: reviewer
      prompt: code-quality-review
    - name: test-coverage-review
      agent: reviewer
      prompt: test-coverage-review
    - name: security-review
      agent: reviewer
      prompt: security-review
```

**How it would work on GitHub:**

The engine dispatches parallel reviews as **separate GitHub Actions jobs** (not `@claude` PR comments). This is the pattern claude-code-action's own documentation recommends for parallel work:

1. Engine triggers a GitHub Actions workflow (via `repository_dispatch` or `workflow_dispatch`) that defines 3 parallel jobs:

```yaml
# .github/workflows/parallel-review.yml (generated or pre-defined)
jobs:
  code-quality-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: "Review code quality..."

  test-coverage-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: "Review test coverage..."

  security-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: "Perform security review..."

  collect-results:
    needs: [code-quality-review, test-coverage-review, security-review]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All reviews complete"
```

2. Each job runs on its own runner in parallel (no concurrency group conflicts)
3. Each posts its own PR comment with review results
4. Engine polls for the `collect-results` job to complete, then reads the 3 review comments
5. Results are merged into the `review` output in the workflow context

**Feasibility: HIGH** -- GitHub Actions supports up to 20 concurrent jobs on the Free plan (60 on Team, 500 on Enterprise). Three parallel review jobs are well within limits. The multi-job pattern avoids the concurrency group serialization that `@claude` comments face. Claude-code-action's [solutions guide](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md) explicitly documents this pattern.

**Alternative: matrix strategy** -- Instead of 3 separate job definitions, use a matrix:
```yaml
jobs:
  review:
    strategy:
      matrix:
        include:
          - type: code-quality
            prompt: "Review code quality..."
          - type: test-coverage
            prompt: "Review test coverage..."
          - type: security
            prompt: "Perform security review..."
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: ${{ matrix.prompt }}
```

**What the PR looks like:**
```
Claude (code-quality-review):   ## Code Quality Review
                                - No critical issues found
                                - 2 minor suggestions: [...]

Claude (test-coverage-review):  ## Test Coverage Review
                                - Coverage: 88.2%
                                - 2 untested paths identified

Claude (security-review):       ## Security Review
                                - No vulnerabilities detected
                                - Path traversal prevention verified
```

**Concurrency notes:**
- `@claude` comment triggers share a concurrency group per PR -- only 1 active + 1 queued. Not suitable for parallel dispatch.
- Multi-job workflows have no such limitation -- each job runs independently.
- `repository_dispatch` events can trigger workflows with multiple parallel jobs, making this the preferred dispatch mechanism for parallel steps.
- GitHub enforces secondary rate limits (~80-100 mutations/minute), but 3 concurrent agents are well within this.

##### Step 3c: fix (loop)

**What it does locally:** If review found issues, runs fixer agent, then re-reviews, up to maxRetries.

**GitHub dispatch version:**
```yaml
- name: fix
  type: loop
  condition: review.hasActionableIssues
  runOn: github
```

**How it would work on GitHub:**
1. Engine evaluates `review.hasActionableIssues` locally (from collected review outputs)
2. If issues exist, posts: `@claude Fix these review issues: [actionable issues list]. Commit fixes.`
3. Bot fixes and commits
4. Engine posts follow-up review comments
5. Loop continues until condition clears or maxRetries exhausted

**Feasibility: HIGH** -- The loop orchestration stays in the engine (local), only the fix and re-review steps are dispatched to GitHub. This is a natural split -- the engine decides whether to loop, GitHub does the work. The re-review step within the fix loop uses the same multi-job parallel pattern as the initial review (see Step 3b), so each fix iteration can dispatch 3 parallel review agents. The engine collects results, evaluates `review.hasActionableIssues`, and decides whether to loop again or proceed.

##### Step 3d: checkpoint (code step)

**Keep local.** Internal bookkeeping step that saves engine state. No LLM involved.

---

#### Phase 4: verify

**What it does locally:** Runs full test suite, checks all requirements met.

**GitHub dispatch version:**
```yaml
- name: verify
  agent: verifier
  prompt: run-verification
  output: verification
  runOn: github
```

**How it would work on GitHub:**
1. Engine posts: `@claude Run the full test suite and verify all requirements from the spec are met. Report results as structured JSON.`
2. Bot runs tests, checks coverage, reports results
3. Engine parses structured output

**Feasibility: HIGH** -- Verification is a natural fit for GitHub because the tests run in the same environment where the code will be CI-tested. Actually more representative than local runs if CI has different deps.

**What the PR looks like:**
```
User (engine):    @claude Run full verification suite and confirm all spec requirements met.
Claude (bot):     ## Verification Results
                  - Test suite: 532/532 passing
                  - Coverage: 87.2%
                  - All 8 requirements verified
                  - Exit code: 0
```

---

#### Phase 5: publish

**What it does locally:** Creates GitHub PR from the completed work.

**GitHub dispatch version:**
```yaml
- name: publish
  agent: publisher
  prompt: publish-changes
  output: publish
  runOn: local  # Already creates the PR -- keep local
```

**Recommendation: KEEP LOCAL** (or hybrid). If we're already on a PR (the execution was GitHub-dispatched), the PR already exists. The publish step just needs to update the PR description, add labels, and mark it ready for review. This is a thin local step using `gh` CLI.

**If running fully on GitHub:** The publish step could be a final comment: `@claude Update the PR description with a summary of all changes, add labels, and mark ready for review.`

### Hybrid Execution Model Summary

The natural split for spec-implementation:

| Phase | Recommended `runOn` | Rationale |
|-------|---------------------|-----------|
| analyze | `github` or `local` | Pure analysis, works either way |
| plan | `local` | Needs MCP tools for issue creation |
| execute/implement | `github` | Best fit -- code writing, testing, committing |
| execute/review | `github` | Natural fit -- reviewing code on a PR |
| execute/fix | `github` | Same as implement -- code changes |
| execute/checkpoint | `local` | Internal bookkeeping |
| verify | `github` | Tests run in CI-like environment |
| publish | `local` | PR management, thin orchestration |

### Example: Hybrid Workflow YAML

```yaml
name: spec-implementation
version: 3

defaults:
  agent: analyzer
  model: opus
  runOn: local  # Default: everything runs locally

reporters:
  - type: github-pr-comment
    config:
      token: "{{env.GITHUB_TOKEN}}"
      owner: "{{env.GITHUB_REPOSITORY_OWNER}}"
      repo: "{{env.GITHUB_REPOSITORY_NAME}}"
      prNumber: "{{context.prNumber}}"

phases:
  - name: analyze
    agent: analyzer
    prompt: analyze-spec
    output: analysis
    runOn: github  # Dispatch to GitHub

  - name: plan
    type: code
    handler: create-issues
    input: analysis
    # runOn: local (default)

  - name: execute
    type: per-task
    source: analysis.tasks
    runOn: github  # All execute sub-steps run on GitHub
    steps:
      - name: implement
        agent: implementer
        prompt: implement-task

      - name: review
        type: parallel
        output: review
        steps:
          - name: code-quality-review
            agent: reviewer
            prompt: code-quality-review
          - name: test-coverage-review
            agent: reviewer
            prompt: test-coverage-review
          - name: security-review
            agent: reviewer
            prompt: security-review

      - name: fix
        type: loop
        condition: review.hasActionableIssues
        maxRetries: 2
        onExhausted: escalate
        steps:
          - name: fix-issues
            agent: fixer
            prompt: fix-issues

      - name: checkpoint
        type: code
        handler: save-checkpoint
        runOn: local  # Override parent: keep local

  - name: verify
    agent: verifier
    prompt: run-verification
    output: verification
    runOn: github

  - name: publish
    agent: publisher
    prompt: publish-changes
    # runOn: local (default)
```

### Engine Changes for GitHub Dispatch (Future)

The engine would need a new `StepExecutor` abstraction:

```typescript
interface StepExecutor {
  execute(step: StepDefinition, context: WorkflowContext): Promise<StepResult>;
}

class LocalExecutor implements StepExecutor {
  // Current behavior: calls queryFn() via Agent SDK
}

class GitHubExecutor implements StepExecutor {
  // New: posts PR comment, polls for completion, parses result
  constructor(private github: GitHubClient) {}

  async execute(step, context): Promise<StepResult> {
    const prompt = renderStepPrompt(step, context);
    const commentId = await this.github.postComment(prompt);
    const response = await this.github.waitForBotResponse(commentId);
    return parseStepResult(response);
  }
}
```

The engine selects executor based on `runOn`:
```typescript
const executor = step.runOn === 'github' 
  ? this.githubExecutor 
  : this.localExecutor;
const result = await executor.execute(step, context);
```

**Key design constraint:** `runOn` inheritance works like `reportAs` -- child steps inherit from parent unless overridden. This lets you set `runOn: github` on the `execute` per-task step and have all sub-steps (implement, review, fix) run on GitHub, while `checkpoint` overrides back to `local`.

### What the PR Timeline Looks Like (Full GitHub Mode)

For a workflow running spec-implementation with GitHub dispatch, the PR comment timeline would look like a conversation:

```
[Bot] Workflow spec-implementation started
      - [ ] analyze
      - [ ] plan
      - [ ] execute (0/4 tasks)
      - [ ] verify
      - [ ] publish

[Engine] @claude Analyze spec SPEC-000050...
[Bot]    Analysis complete. Found 4 implementation tasks. { ... }

[Engine] (creates issues locally -- no comment)

[Engine] @claude Implement task-001: Add reporter interface...
[Bot]    Implemented reporter interface. Committed abc1234.
         - Created reporters/types.ts
         - Added 12 tests, all passing

[Engine] @claude Review code quality of task-001 changes...
[Bot]    Code quality: PASS. No issues found.

[Engine] @claude Implement task-002: Add ReporterManager...
[Bot]    Implemented ReporterManager. Committed def5678.

... (continues for each task)

[Engine] @claude Run full verification...
[Bot]    All tests passing (547/547). Coverage 88.1%.

[Bot] Workflow spec-implementation completed in 34m 12s
      - [x] analyze -- 1m 8s
      - [x] plan -- 0m 3s
      - [x] execute -- 28m 42s (4/4 tasks)
      - [x] verify -- 2m 19s
      - [x] publish -- 2m 0s
```

This gives the user a complete, readable audit trail right on the PR. Every step is visible, every agent response is captured, and the progress comment at top provides the summary view.

### PR Description Workflow Tracker (Future Work)

> **DEFERRED:** This feature was descoped from the initial implementation. The PR comment-based reporter provides sufficient visibility for workflow progress. The PR description tracker would add value for at-a-glance status without scrolling through comments, but introduces read-modify-write complexity and race condition risks (GitHub REST API has no atomic update for PR bodies). See FR-016/FR-017.

If implemented in the future, the reporter would use HTML comment markers (`<!-- WRANGLER_WORKFLOW_START -->` / `<!-- WRANGLER_WORKFLOW_END -->`) to maintain a progress section in the PR body via `PATCH /repos/{owner}/{repo}/pulls/{pr}`, updating on phase transitions and task completions.

### Backward Compatibility

The `runOn` field is optional and defaults to `local`. Existing workflows continue to work exactly as they do today:

- No `runOn` field -> all steps run locally (current behavior)
- No `reporters` field -> no external reporting (current behavior)
- Adding `reporters` without `runOn` -> local execution with external reporting (this spec's primary deliverable)
- Adding `runOn: github` -> GitHub-dispatched execution (future enhancement)

The version 2 workflow YAML format is fully backward compatible. The `runOn` and `reportAs` fields are additive.

## Implementation Details

### Engine Integration

The engine integration is minimal. In `cli.ts`, after creating the `SessionManager` and before calling `engine.run()`:

```typescript
// Existing
const onAuditEntry = async (entry: WorkflowAuditEntry) => {
  await sessionManager.appendAuditEntry(entry);
};

// New: initialize reporters from workflow definition
const reporterManager = new ReporterManager(
  workflow.reporters ?? [],
  workflow,
  createDefaultReporterRegistry()
);
await reporterManager.initialize({
  sessionId,
  specFile,
  branchName,
  worktreePath,
});

// Wire both into onAuditEntry
const engine = new WorkflowEngine({
  config,
  queryFn,
  onAuditEntry: async (entry) => {
    await sessionManager.appendAuditEntry(entry);
    await reporterManager.onAuditEntry(entry);
  },
});

// After engine.run() completes
const result = await engine.run(workflowPath, specPath);
await reporterManager.onComplete(result.executionSummary);
await reporterManager.dispose();
```

### GitHub API Usage

The reporter uses raw `fetch()` against the GitHub REST API -- no Octokit dependency needed:

- `POST /repos/{owner}/{repo}/issues/{pr}/comments` -- create comment (returns comment ID)
- `PATCH /repos/{owner}/{repo}/issues/comments/{id}` -- update comment body

Headers: `Authorization: Bearer {token}`, `Accept: application/vnd.github.v3+json`

### Debouncing Strategy

Rapid audit entries (e.g., parallel step starts) are debounced:

1. On each `onAuditEntry`, update internal state immediately
2. Check if a debounce timer is active; if so, skip the API call
3. If no timer, make the API call and start a timer (default 2s)
4. When timer fires, if state has changed since last API call, make another call
5. `onComplete` and `dispose` flush any pending update immediately

### Step Tree Flattening

The reporter needs to build a flat, ordered list of visible steps from the potentially nested workflow definition. The `ReporterManager` walks the step tree at initialization:

- Top-level phases: always included (unless `reportAs: silent`)
- `per-task` children: shown as sub-items under the parent
- `parallel` children: shown as sub-items under the parent
- `loop` children: shown as sub-items under the parent (if visible)
- Inherited visibility: if a parent is `silent`, all children are `silent`

### Template Variable Resolution

Reporter config values like `"{{env.GITHUB_TOKEN}}"` and `"{{context.prNumber}}"` need resolution before the reporter is initialized. The `ReporterManager` resolves these using:

- `env.*` -> `process.env[key]`
- `context.*` -> values from the `ReporterContext` object

This uses the same template syntax as the existing workflow loader's `renderTemplate()`.

## Error Handling

### Reporter Errors

All reporter operations are wrapped in try/catch. Errors are logged but never propagate to the engine:

```typescript
async onAuditEntry(entry: WorkflowAuditEntry): Promise<void> {
  const visibility = this.visibilityMap.get(entry.step) ?? 'visible';
  if (visibility === 'silent') return; // Filter before fan-out

  for (const reporter of this.reporters) {
    try {
      await reporter.onAuditEntry(entry);
    } catch (err) {
      console.warn(`[ReporterManager] Reporter "${reporter.type}" error in onAuditEntry: ${err.message}`);
    }
  }
}
```

### GitHub API Errors

- **401 Unauthorized**: Log error, disable reporter for rest of run
- **404 Not Found**: PR doesn't exist or was closed. Log and disable.
- **403 Rate Limited**: Back off exponentially, retry up to 3 times
- **Network errors**: Log and continue; next entry will retry

### Invalid Config

If reporter config is missing required fields (e.g., no token), the reporter logs a warning during initialization and is not added to the active reporter list.

## Testing Strategy

### Unit Tests

- **ReporterManager**: Test fan-out, visibility resolution, debouncing, error isolation
- **GitHubPRCommentReporter**: Test comment rendering (markdown generation), state transitions, debouncing logic. Mock fetch for API calls.
- **ReporterRegistry**: Test registration and factory creation
- **Visibility resolution**: Test inheritance (parent silent -> children silent), defaults, per-step overrides

### Integration Tests

- **End-to-end**: Run a small workflow with a mock GitHub API server, verify comment creation and updates
- **Schema validation**: Verify workflow YAML with reporters section parses correctly
- **Error resilience**: Verify workflow completes even when reporter throws

## Security Considerations

- GitHub tokens in workflow YAML configs MUST come from environment variables (`{{env.GITHUB_TOKEN}}`), never hardcoded
- The reporter MUST NOT log or expose tokens in error messages
- Comment content MUST NOT include sensitive data from step outputs (only step names and status)

## Resolved Decisions

1. **PR number discovery**: The workflow's init phase already creates the branch and worktree. This should also open the PR up front, capturing the PR number in the session context. The `--pr-number` CLI flag is available as an override, but the primary flow is: init creates branch -> opens PR -> PR number stored in `context.prNumber` -> reporters use it. Late-bind after publish is no longer needed since the PR exists from the start.

2. **Comment ownership**: Create a new comment for each workflow run, identified by a hidden HTML marker (`<!-- wrangler-workflow: {sessionId} -->`). If resuming a workflow, find and update the existing comment by marker. This matches the claude-code-action pattern.

3. **GitHub dispatch: result parsing**: JSON code block in the comment body as primary mechanism (Claude already does this with outputSchema). Committed artifact file (e.g., `.wrangler/sessions/{id}/step-output.json`) as fallback.

4. **GitHub dispatch: concurrency**: Resolved via research. `@claude` comment triggers share a concurrency group per PR (1 active + 1 queued), so they are NOT suitable for parallel dispatch. Instead, use multi-job GitHub Actions workflows triggered via `repository_dispatch` -- each job runs independently on its own runner with no concurrency group conflicts. GitHub supports 20+ concurrent jobs even on the Free plan. See Step 3b review section for the full pattern.

## Open Questions

1. **GitHub Actions workflow generation**: When the engine dispatches parallel steps to GitHub, does it generate `.github/workflows/*.yml` files dynamically, or does it expect pre-defined workflow templates? Dynamic generation is more flexible but adds complexity. Pre-defined templates are simpler but less adaptable to workflow changes.

2. **Result collection from parallel GitHub jobs**: How does the engine collect structured results from 3 parallel review jobs? Options: (a) each job posts a PR comment with a known marker, engine reads comments; (b) each job commits a result file to a known path; (c) GitHub Actions artifacts. Need to evaluate reliability and latency tradeoffs.

## Success Criteria

- [ ] Workflow YAML with `reporters` section parses and validates correctly
- [ ] `reportAs` field works on all step types (agent, code, parallel, per-task, loop)
- [ ] `github-pr-comment` reporter creates a comment on workflow start
- [ ] Comment updates in real-time as steps complete
- [ ] Per-task progress shows "X/Y tasks" with sub-items
- [ ] Spinner appears during execution, removed on completion
- [ ] Completion summary shows duration per phase and total
- [ ] Reporter errors do not halt the workflow
- [ ] Debouncing prevents API rate limit issues
- [ ] Tests cover reporter interface, manager, and GitHub reporter
- [ ] `runOn` field is accepted in schema validation (even if GitHub executor is not yet implemented)
- [ ] ~~PR description tracker~~ (DEFERRED -- see FR-016/FR-017)
- [ ] PR is created during workflow init phase, PR number captured in session context
- [ ] Parallel review steps dispatch as separate GitHub Actions jobs (not serialized `@claude` comments)
- [ ] Existing workflows without `reporters` or `runOn` continue to work unchanged

## References

- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) -- reference implementation for GitHub PR comment updates
- `workflows/engine/src/types.ts` -- `WorkflowAuditEntry`, `EngineConfig`
- `workflows/engine/src/engine.ts` -- `onAuditEntry` callback, audit recording
- `workflows/engine/src/schemas/workflow.ts` -- `WorkflowDefinitionSchema`, `BaseStepSchema`
- `workflows/engine/src/state.ts` -- `ExecutionSummary`, `WorkflowResult`
- `workflows/engine/src/cli.ts` -- CLI wiring of `onAuditEntry`
