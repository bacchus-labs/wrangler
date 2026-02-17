# Information Architecture

> Last Updated: 2026-02-17 | Version: 1.2.0

This document describes how wrangler organizes project knowledge. Each layer of the information architecture serves a distinct purpose, and content belongs in exactly one place.

---

## Purpose

Wrangler structures project knowledge across multiple layers so that both humans and AI agents can find the right information at the right time. The layers range from high-level vision and governance down to tactical implementation details, with clear rules for what belongs where and how content flows between layers.

---

## Documentation Layers

### docs/ -- Current-State Reference Documentation

User-facing documentation describing how wrangler works today. Every file in `docs/` should reflect the actual current behavior of the system. If a feature changes, the corresponding doc file should be updated in the same PR.

- **Audience**: Users and agents learning or referencing wrangler
- **Format**: lowercase-with-dashes filenames (e.g., `mcp-usage.md`)
- **Lifecycle**: Updated alongside code changes; should never describe aspirational features

### CLAUDE.md -- Agent Directives

The primary entry point for AI agents working in a wrangler-enabled project. Contains essential project context, links to deeper documentation, development workflow instructions, and code standards. This file is loaded into agent context at session start.

- **Audience**: AI agents (Claude Code)
- **Format**: Single file at project root
- **Lifecycle**: Updated when project conventions change; kept concise to minimize token cost

### README.md -- Human-Readable Overview

The project's front door for human readers. Provides installation instructions, a high-level feature summary, and links to detailed documentation.

- **Audience**: Humans discovering or evaluating the project
- **Format**: Single file at project root
- **Lifecycle**: Updated for major releases or significant feature changes

### .wrangler/memos/ -- Working Notes

Accumulated notes from planning sessions, investigations, analyses, and retrospectives. Memos capture the reasoning and context behind decisions. They are not expected to stay current -- they are point-in-time records.

- **Audience**: Developers and agents needing historical context
- **Format**: `YYYY-MM-DD-topic-slug.md` or descriptive names
- **Lifecycle**: Created during work, archived when no longer actively referenced, never deleted (they are the project's institutional memory)

### .wrangler/memory/ -- Persistent Agent Reference

Curated reference material optimized for agent consumption. Unlike memos (which are raw), memory files are maintained and kept current. They contain coding standards, testing patterns, and consolidated decisions that agents should follow.

- **Audience**: AI agents needing authoritative project conventions
- **Format**: UPPERCASE descriptive names (e.g., `CODING_STANDARDS.md`)
- **Lifecycle**: Actively maintained; updated when conventions evolve

### .wrangler/specifications/ -- Planned Work

Detailed requirements for features that have been approved for implementation. Specifications define what needs to be built, acceptance criteria, and technical constraints. A specification in draft status is still being refined; a locked specification is approved for implementation.

- **Audience**: Agents and developers implementing features
- **Format**: `{counter}-{slug}.md` with YAML frontmatter
- **Lifecycle**: Created from promoted ideas, broken into issues for implementation, archived after completion

### .wrangler/issues/ -- Implementation Tasks

Tactical work items broken down from specifications. Each issue represents a concrete, actionable task. Managed through the MCP server tools.

- **Audience**: Agents executing implementation work
- **Format**: `{counter}-{slug}.md` or `ISS-{id}-{slug}.md` with YAML frontmatter
- **Lifecycle**: Created during planning, updated during implementation, archived after completion

### .wrangler/ideas/ -- Captured Ideas

Ideas and proposals that have not yet been promoted to specifications. This is the intake funnel for new concepts. Ideas may be rough or exploratory.

- **Audience**: Anyone proposing or evaluating potential features
- **Format**: Free-form markdown files
- **Lifecycle**: Created at any time, either promoted to specifications or left as reference

### .wrangler/ROADMAP.md -- Strategic Direction

Documents what was recently completed, what is currently in progress, and what is planned for upcoming phases. Provides the strategic arc of the project.

- **Audience**: Anyone needing to understand project direction
- **Format**: Single file in `.wrangler/`
- **Lifecycle**: Updated at phase boundaries or when strategic priorities shift

### .wrangler/CONSTITUTION.md -- Design Principles

The supreme governing document. Defines core principles that guide all development decisions. Features and changes must align with constitutional principles.

- **Audience**: Agents and developers making design decisions
- **Format**: Single file in `.wrangler/`
- **Lifecycle**: Amended deliberately through a defined process; changes are rare

---

## What Belongs Where

| Content Type | Location | Example |
|---|---|---|
| How a feature works today | `docs/` | `docs/mcp-usage.md` |
| Agent coding instructions | `CLAUDE.md` | Development workflow, code standards |
| Human project overview | `README.md` | Installation, feature summary |
| Investigation or analysis | `.wrangler/memos/` | `2026-02-10-gastown-analysis.md` |
| Coding conventions for agents | `.wrangler/memory/` | `CODING_STANDARDS.md` |
| Feature requirements | `.wrangler/specifications/` | `000050-documentation-overhaul.md` |
| Actionable work items | `.wrangler/issues/` | `ISS-000108-sdk-simulator.md` |
| Rough feature idea | `.wrangler/ideas/` | `self-healing-mcp-plugin.md` |
| Project direction | `.wrangler/ROADMAP.md` | Phase plans, milestones |
| Design principles | `.wrangler/CONSTITUTION.md` | Core architectural tenets |

---

## How Agents Interact with Each Layer

Different layers are consumed differently during an agent session:

**Loaded into context at session start:**
- `CLAUDE.md` -- always loaded; provides essential directives and links

**Linked and read on demand:**
- `docs/` files -- read when the agent needs reference material on a specific topic
- `.wrangler/CONSTITUTION.md` -- read when making design decisions or checking alignment
- `.wrangler/ROADMAP.md` -- read when planning work or understanding priorities

**Searched when investigating:**
- `.wrangler/memos/` -- searched for historical context, past decisions, prior analyses
- `.wrangler/memory/` -- read for coding standards, testing patterns, consolidated conventions
- `.wrangler/specifications/` -- read when implementing features
- `.wrangler/issues/` -- queried via MCP tools for task status and details

**Written to during work:**
- `.wrangler/issues/` -- created and updated via MCP tools during implementation
- `.wrangler/memos/` -- created during investigations or retrospectives
- `.wrangler/ideas/` -- created when capturing new concepts

---

## Content Lifecycle

Content flows through a defined progression:

```
Idea (rough concept)
  -> Specification (detailed requirements, approved for implementation)
    -> Issues (tactical tasks broken down from the spec)
      -> Implementation (code changes, tests, docs)
        -> Archived (spec and issues moved to archived/ subdirectories)
```

Working notes follow a parallel path:

```
Memo (point-in-time analysis or investigation)
  -> Memory (if the findings become a lasting convention)
  -> Archived (if the memo is no longer actively referenced)
```

Documentation stays current:

```
docs/ files are updated alongside the code they describe.
They never contain aspirational content -- only current-state reference.
```

---

## Naming Conventions

| Location | Convention | Examples |
|---|---|---|
| `docs/` | lowercase-with-dashes | `mcp-usage.md`, `git-hooks.md` |
| `CLAUDE.md`, `README.md` | UPPERCASE | Standard project root files |
| `.wrangler/CONSTITUTION.md` | UPPERCASE | Governance files |
| `.wrangler/ROADMAP.md` | UPPERCASE | Governance files |
| `.wrangler/memory/` | UPPERCASE | `CODING_STANDARDS.md` |
| `.wrangler/memos/` | date-prefixed or descriptive | `2026-02-10-analysis.md` |
| `.wrangler/issues/` | counter-prefixed | `000001-add-auth.md` |
| `.wrangler/specifications/` | counter-prefixed | `000050-doc-overhaul.md` |
| `.wrangler/ideas/` | descriptive slugs | `self-healing-mcp-plugin.md` |

---

## Staleness Expectations

| Layer | Staleness Tolerance | Maintenance Cadence |
|---|---|---|
| `docs/` | None -- must reflect current state | Updated with each relevant change |
| `CLAUDE.md` | Low -- should be current | Updated when conventions change |
| `.wrangler/memory/` | Low -- should be current | Updated when standards evolve |
| `.wrangler/ROADMAP.md` | Moderate -- updated at phase boundaries | Quarterly or per phase |
| `.wrangler/specifications/` | Moderate -- archived after implementation | Per feature lifecycle |
| `.wrangler/memos/` | High -- historical records by design | Never updated after creation |
| `.wrangler/ideas/` | High -- may sit indefinitely | No maintenance required |
