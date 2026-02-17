# Builtin Agents and Prompts

## Overview

The workflow engine separates **agents** from **prompts** to enable flexible composition:

- **Agents** define _who_ runs a step: the system prompt, allowed tools, and default model. An agent file configures the AI persona and its capabilities.
- **Prompts** define _what_ the agent should do: the user-facing instruction template with variable placeholders. A prompt file is a reusable task description.

In workflow YAML, a step references both by name:

```yaml
- name: analyze
  agent: planner        # .wrangler/orchestration/agents/planner.md (project) or agents/planner.md (builtin)
  prompt: analyze-spec  # .wrangler/orchestration/prompts/analyze-spec.md (project) or prompts/analyze-spec.md (builtin)
  output: analysis
```

The engine resolves files through `WorkflowResolver` with a 2-tier search:
1. **Project level**: `{projectRoot}/.wrangler/orchestration/agents/` and `{projectRoot}/.wrangler/orchestration/prompts/`
2. **Builtin level**: `{pluginRoot}/agents/` and `{pluginRoot}/prompts/`

First match wins. This enables project-level overrides of any builtin.

---

## Builtin Agents

### planner

**Purpose**: Analyzes specifications and produces structured task plans. Also handles publishing (PR creation).

| Field | Value |
|-------|-------|
| File | `agents/planner.md` |
| Tools | `Read`, `Glob`, `Grep`, `Bash` |
| Default model | `sonnet` |

**Used in**: The `analyze` phase (reads a spec, outputs a structured task breakdown) and the `publish` phase (creates a PR from completed work). Set as the `defaults.agent` in the spec-implementation workflow, so it is also the fallback when a step omits its agent.

### implementer

**Purpose**: Writes code following TDD discipline. Implements individual tasks and fixes review issues.

| Field | Value |
|-------|-------|
| File | `agents/implementer.md` |
| Tools | `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep` |
| Default model | (workflow default -- `opus`) |

**Used in**: The `implement` step (writes code for each task) and the `fix-issues` step inside the review loop (addresses actionable issues from reviewers).

### reviewer

**Purpose**: Reviews code changes for quality, test coverage, and security concerns. Read-only -- does not modify files.

| Field | Value |
|-------|-------|
| File | `agents/reviewer.md` |
| Tools | `Read`, `Glob`, `Grep`, `Bash` |
| Default model | (workflow default -- `opus`) |

**Used in**: The parallel `review` step, which dispatches three reviewer instances concurrently -- one per review prompt (code-quality, test-coverage, security). Also used in `re-review` after fixes.

### verifier

**Purpose**: Runs the full test suite and verifies that all spec requirements are met with evidence.

| Field | Value |
|-------|-------|
| File | `agents/verifier.md` |
| Tools | `Bash`, `Read`, `Glob`, `Grep` |
| Default model | (workflow default -- `opus`) |

**Used in**: The `verify` phase. The step includes a `failWhen` condition that fails the workflow if tests do not pass (`verification.testSuite.exitCode != 0`).

---

## Builtin Prompts

### analyze-spec

**Purpose**: Read a specification file and produce a structured breakdown of tasks, requirements, constraints, and tech stack.

| Field | Value |
|-------|-------|
| File | `prompts/analyze-spec.md` |
| Run by | `planner` agent |

**Template variables**:
- `{{specPath}}` -- Absolute path to the specification file.

**Expected output** (`AnalysisResultSchema`):
```json
{
  "tasks": [{ "id": "", "title": "", "description": "", "requirements": [], "dependencies": [], "estimatedComplexity": "low|medium|high", "filePaths": [] }],
  "requirements": [{ "id": "", "description": "", "source": "", "testable": true }],
  "constraints": ["..."],
  "techStack": { "language": "", "testFramework": "", "buildTool": "" }
}
```

### implement-task

**Purpose**: Implement a single task following TDD (write failing test, make it pass, refactor).

| Field | Value |
|-------|-------|
| File | `prompts/implement-task.md` |
| Run by | `implementer` agent |

**Template variables**:
- `{{task.id}}` -- Task identifier.
- `{{task.title}}` -- Short task title.
- `{{task.description}}` -- Full task description.
- `{{task.requirements}}` -- Array of requirement strings (use `{{#each task.requirements}}`).
- `{{task.dependencies}}` -- Array of dependency task IDs.
- `{{task.filePaths}}` -- Suggested file paths.
- `{{specPath}}` -- Path to the original spec.

**Expected output** (`ImplementResultSchema`):
```json
{
  "filesChanged": [{ "path": "", "action": "created|modified|deleted", "linesAdded": 0, "linesRemoved": 0 }],
  "testResults": { "total": 0, "passed": 0, "failed": 0, "exitCode": 0 },
  "tddCertification": { "functions": [{ "name": "", "testFile": "", "watchedFail": true, "watchedPass": true }] },
  "commits": ["..."]
}
```

### fix-issues

**Purpose**: Address actionable issues identified during code review.

| Field | Value |
|-------|-------|
| File | `prompts/fix-issues.md` |
| Run by | `implementer` agent |

**Template variables**:
- `{{review.actionableIssues}}` -- Array of issue objects from the review step (via `input: review.actionableIssues`).
- `{{specPath}}` -- Path to the original spec.

**Expected output** (`FixResultSchema`):
```json
{
  "fixesApplied": [{ "issueDescription": "", "severity": "critical|important|minor", "action": "fixed|disputed|deferred", "explanation": "", "filesModified": [] }],
  "testResults": { "total": 0, "passed": 0, "failed": 0, "exitCode": 0 },
  "commits": ["..."],
  "disputedIssues": [{ "description": "", "reason": "" }]
}
```

### code-quality-review

**Purpose**: Review implementation for code quality -- naming, structure, complexity, adherence to project conventions.

| Field | Value |
|-------|-------|
| File | `prompts/code-quality-review.md` |
| Run by | `reviewer` agent |

**Template variables**:
- `{{specPath}}` -- Path to the original spec.
- `{{task.id}}`, `{{task.title}}` -- Current task context (when inside per-task).

**Expected output**: Review result with `hasActionableIssues` boolean and `actionableIssues` array.

### test-coverage-review

**Purpose**: Review test coverage -- are all requirements tested, are edge cases covered, is TDD certification valid.

| Field | Value |
|-------|-------|
| File | `prompts/test-coverage-review.md` |
| Run by | `reviewer` agent |

**Template variables**:
- `{{specPath}}` -- Path to the original spec.
- `{{task.id}}`, `{{task.title}}` -- Current task context.

**Expected output**: Review result with `hasActionableIssues` boolean and `actionableIssues` array.

### security-review

**Purpose**: Review for security concerns -- injection, path traversal, secrets exposure, unsafe operations.

| Field | Value |
|-------|-------|
| File | `prompts/security-review.md` |
| Run by | `reviewer` agent |

**Template variables**:
- `{{specPath}}` -- Path to the original spec.
- `{{task.id}}`, `{{task.title}}` -- Current task context.

**Expected output**: Review result with `hasActionableIssues` boolean and `actionableIssues` array.

### run-verification

**Purpose**: Run the full test suite, check coverage, and verify each spec requirement is met with evidence.

| Field | Value |
|-------|-------|
| File | `prompts/run-verification.md` |
| Run by | `verifier` agent |

**Template variables**:
- `{{specPath}}` -- Path to the original spec.
- `{{analysis.requirements}}` -- Array of requirements from the analysis phase (use `{{#each analysis.requirements}}`).

**Expected output** (`VerifyResultSchema`):
```json
{
  "testSuite": { "total": 0, "passed": 0, "failed": 0, "exitCode": 0, "coverage": 85.0 },
  "requirements": [{ "id": "", "description": "", "met": true, "evidence": "" }],
  "gitClean": true
}
```

### publish-changes

**Purpose**: Create a pull request summarizing all changes made during the workflow.

| Field | Value |
|-------|-------|
| File | `prompts/publish-changes.md` |
| Run by | `planner` agent |

**Template variables**:
- `{{specPath}}` -- Path to the original spec.
- `{{verification}}` -- Verification results from the verify phase.
- `{{analysis}}` -- Analysis results (task list, requirements).

**Expected output** (`PublishResultSchema`):
```json
{
  "prUrl": "https://github.com/...",
  "prNumber": 42,
  "branchName": "wrangler/...",
  "commitCount": 5,
  "summary": "..."
}
```

---

## Overriding Builtins

To override any builtin agent or prompt, create a file with the same name in your project's `.wrangler/orchestration/` directory:

```
your-project/
  .wrangler/
    orchestration/
      agents/
        reviewer.md        # overrides the builtin reviewer
      prompts/
        security-review.md # overrides the builtin security-review prompt
```

The `WorkflowResolver` checks the project path first. If a file exists there, it is used instead of the builtin. This lets you:

- Customize the reviewer's system prompt for your project's conventions.
- Add project-specific tools to an agent.
- Change the review criteria in a prompt template.
- Use a different model for a specific agent.

No workflow YAML changes are needed -- the resolver handles it transparently.

---

## Creating Custom Agents and Prompts

### Agent file format

Agent files are Markdown with YAML frontmatter. The body becomes the `systemPrompt` sent to the AI model.

```markdown
---
name: my-agent
description: Optional description of what this agent does
tools:
  - Read
  - Write
  - Bash
model: sonnet
---

You are a specialized agent that does X.

Follow these rules:
- Rule 1
- Rule 2
```

**Frontmatter fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Unique agent identifier |
| `description` | string | no | Human-readable description |
| `tools` | string[] | yes | Allowed tool names (empty array for none) |
| `model` | string | no | Default model; overridden by step-level `model` |

### Prompt file format

Prompt files are Markdown with YAML frontmatter. The body is a template with `{{variable}}` placeholders.

```markdown
---
name: my-prompt
description: Optional description of what this prompt does
---

Analyze the specification at {{specPath}}.

Requirements to verify:
{{#each analysis.requirements}}
- {{this.id}}: {{this.description}}
{{/each}}

{{#if task}}
Current task: {{task.title}}
{{/if}}
```

**Frontmatter fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Unique prompt identifier |
| `description` | string | no | Human-readable description |

**Template syntax**:

| Syntax | Description |
|--------|-------------|
| `{{varName}}` | Simple interpolation |
| `{{obj.field}}` | Dot-notation access |
| `{{#each items}}...{{this}}...{{/each}}` | Iterate over arrays |
| `{{#each items}}...{{this.field}}...{{/each}}` | Iterate with property access |
| `{{#if varName}}...{{/if}}` | Conditional block |
| `{{@index}}` | Loop index (inside `#each`) |

Template variables come from the workflow context: `specPath` is always available (set from the `run()` argument), and other variables are populated as steps produce output (e.g., `analysis`, `task`, `review`, `verification`).
