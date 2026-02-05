---
description: Detailed documentation for Wrangler commands and concepts.
argument-hint: "[command-name]"
---

# Wrangler Help

Comprehensive documentation for the Wrangler project governance plugin.

## Arguments

Parse `$ARGUMENTS` for one optional positional argument:

- `$1` (optional) — **command-name**: Show help for a specific command

| Argument | Shows |
|----------|-------|
| (none) | Full help documentation |
| `brainstorm` | Brainstorming workflow details |
| `write-plan` | Plan creation details |
| `generate-plan-for-spec` | Spec-to-issues breakdown |
| `implement` | Autonomous implementation |
| `issues` | Status display details |

---

## Overview

Wrangler is a **project governance framework and skills library** for Claude Code. It provides:

- **Specification documents** for planning features and changes
- **MCP-based issue tracking** for discrete, completable tasks
- **Skills library** with proven workflows and patterns
- **Session hooks** for automatic workspace initialization
- **Constitutional governance** for consistent decision-making

### Core Principles

1. **MCP tools are the source of truth** — Issues and specs managed via MCP
2. **Skills are mandatory when available** — If a skill exists, use it
3. **TDD is non-negotiable** — Write tests first, always
4. **Evidence over claims** — Verify before declaring success
5. **Files in `.wrangler/`** — Centralized workspace directory

---

## Commands

### /wrangler:brainstorm

Refine rough ideas into fully-formed designs using Socratic method.

#### Usage

```bash
/wrangler:brainstorm
/wrangler:brainstorm "I want to add user authentication"
```

#### What It Does

- Asks clarifying questions to understand requirements
- Explores alternatives and trade-offs
- Produces a validated design ready for specification
- Invokes the `brainstorming` skill

---

### /wrangler:write-plan

Create detailed implementation plans with bite-sized tasks.

#### Usage

```bash
/wrangler:write-plan
/wrangler:write-plan .wrangler/specifications/SPEC-000001-feature.md
```

#### What It Does

- Analyzes specification or requirements
- Breaks down into discrete MCP issues
- Each issue includes TDD steps and exact file paths
- Optionally creates architecture reference document
- Invokes the `writing-plans` skill

#### Output

- MCP issues in `.wrangler/issues/`
- Optional plan file in `.wrangler/plans/` (for complex implementations)

---

### /wrangler:generate-plan-for-spec

Break a specification directly into MCP issues (no prompts).

#### Usage

```bash
/wrangler:generate-plan-for-spec .wrangler/specifications/SPEC-000001-auth.md
```

#### Arguments

| Position | Name | Description |
|----------|------|-------------|
| `$1` | spec-path | Path to spec file (required) |

#### Difference from write-plan

- **write-plan**: Interactive, may prompt for input
- **generate-plan-for-spec**: Direct, takes spec file argument

---

### /wrangler:implement

Autonomously implement tasks from specs or issues.

#### Usage

```bash
/wrangler:implement
/wrangler:implement issue #42
/wrangler:implement .wrangler/specifications/SPEC-000001-feature.md
```

#### What It Does

- Routes to `implementing-specs` skill for specification references
- Routes to `implementing-issue` skill for single issue references
- Follows TDD (RED-GREEN-REFACTOR)
- Runs code review after each task
- Only stops for genuine blockers

---

### /wrangler:issues

Display status summary of specifications and issues.

#### Usage

```bash
/wrangler:issues
/wrangler:issues --status=open
/wrangler:issues --project=SPEC-000001-auth
```

#### Arguments

| Flag | Description |
|------|-------------|
| `--status` | Filter by status (open, in_progress, closed, cancelled) |
| `--project` | Filter by linked specification |
| `--labels` | Filter by labels |

#### Output

Formatted table showing specs, issues, status, and progress metrics.

---

## Concepts

### MCP Tools

Wrangler uses MCP (Model Context Protocol) tools for issue management:

| Tool | Purpose |
|------|---------|
| `issues_create` | Create new issues or specifications |
| `issues_list` | List with filtering |
| `issues_search` | Full-text search |
| `issues_get` | Retrieve single issue |
| `issues_update` | Modify issue fields |
| `issues_delete` | Delete issues |
| `issues_mark_complete` | Mark as closed |
| `issues_all_complete` | Check completion status |

### Directory Structure

```
.wrangler/
├── issues/              # Issue tracking (git-tracked)
├── specifications/      # Feature specs (git-tracked)
├── ideas/               # Ideas and proposals
├── memos/               # Reference material, RCAs
├── plans/               # Implementation plans
├── docs/                # Auto-generated docs
├── templates/           # Issue and spec templates
├── CONSTITUTION.md      # Design principles (optional)
├── ROADMAP.md           # Strategic roadmap (optional)
└── ROADMAP_NEXT_STEPS.md # Tactical execution (optional)
```

### Issue Status Model

| Status | Meaning |
|--------|---------|
| `open` | Not yet started |
| `in_progress` | Currently being worked on |
| `closed` | Completed successfully |
| `cancelled` | Will not be done |

### Issue Naming

- Pattern: `{counter}-{slug}.md`
- Counter: 6-digit zero-padded (000001, 000002, ...)
- Slug: kebab-case from title

Example: `000042-implement-user-authentication.md`

### Specification Naming

- Pattern: `SPEC-{counter}-{slug}.md` or `{counter}-{slug}.md`
- Same counter format as issues
- Stored in `.wrangler/specifications/`

---

## Skills

Wrangler includes 47+ skills covering:

### Core Workflows
- `brainstorming` — Socratic design refinement
- `writing-plans` — Implementation planning
- `writing-specifications` — Spec creation
- `implementing-issue` — Single issue TDD implementation
- `implementing-specs` — Spec-to-PR orchestrated workflow
- `test-driven-development` — TDD enforcement
- `code-review` — Review framework

### Debugging & Analysis
- `systematic-debugging` — 4-phase debugging framework
- `root-cause-tracing` — Trace bugs to source
- `analyzing-implementations` — Document how code works

### Governance
- `constitution` — Design principles
- `initialize-governance` — Setup framework
- `verify-governance` — Validation checks
- `check-constitutional-alignment` — Feature alignment

### Using Skills

Skills are invoked via the Skill tool:

```
Skill: writing-plans
```

**Skills are mandatory when applicable.** If a skill exists for your task, you must use it.

---

## TDD Workflow

All implementation follows Test-Driven Development:

```
RED → GREEN → REFACTOR
```

1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Improve code quality

### TDD in Issues

Every implementation issue includes 5 steps:

1. Write the failing test (with code)
2. Run test to verify it fails
3. Write minimal implementation (with code)
4. Run test to verify it passes
5. Commit

---

## Governance Framework

Optional but recommended for larger projects:

### Constitution (`.wrangler/CONSTITUTION.md`)
- Core design principles
- Decision framework
- Amendment process

### Roadmap (`.wrangler/ROADMAP.md`)
- Strategic phases
- Success metrics
- Timeline overview

### Next Steps (`.wrangler/ROADMAP_NEXT_STEPS.md`)
- Tactical execution tracker
- Completion metrics
- Prioritized tasks

---

## Quick Reference

| Task | Command |
|------|---------|
| Refine an idea | `/wrangler:brainstorm` |
| Create a plan | `/wrangler:write-plan` |
| Generate issues from spec | `/wrangler:generate-plan-for-spec <spec>` |
| View status | `/wrangler:issues` |
| Implement tasks | `/wrangler:implement` |
| Get help | `/wrangler:help [command]` |

---

## Troubleshooting

### ".wrangler/ doesn't exist"

The session hook should create it automatically. If not:

```bash
mkdir -p .wrangler/issues .wrangler/specifications .wrangler/memos .wrangler/plans
```

### "MCP tools not available"

Ensure the wrangler plugin is properly installed and the MCP server is running.

### "Skill not found"

Check that you're using the correct skill name. List available skills with:

```bash
ls skills/
```

### "Issues not showing"

Use the MCP tool directly:

```typescript
issues_list({ type: "issue" })
```

---

## See Also

- `CLAUDE.md` — Project context for AI agents
- `docs/MCP-USAGE.md` — Comprehensive MCP guide
- `docs/GOVERNANCE.md` — Governance framework guide
- `skills/using-wrangler/SKILL.md` — Getting started with skills
