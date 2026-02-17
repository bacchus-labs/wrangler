---
id: SPEC-000048
title: Codify Procedural Skill Steps into MCP Tools and Add workspace_sync Command
type: specification
status: open
priority: high
labels:
  - specification
  - mcp
  - workspace
  - governance
  - skills-refactoring
createdAt: "2026-02-16T05:55:20.008Z"
updatedAt: "2026-02-16T05:55:20.008Z"
project: Wrangler Core
---

# Proposal: Codify Procedural Skill Steps and Add workspace_sync

## Executive Summary

**What:** Extract deterministic, procedural operations from skills into MCP tools and a `workspace_sync` command, so that agents execute code instead of following multi-step natural-language instructions for file/directory manipulation.

**Why:** Today, skills like `verifying-governance`, `refreshing-metrics`, `setting-up-git-hooks`, and `initializing-governance` spend 70-85% of their token budget instructing agents through deterministic file operations (create directory, check file exists, count issues, substitute template placeholder). These steps are error-prone when agent-executed (missed `chmod`, forgotten directory, wrong count) and expensive in tokens. Moving them to code makes outcomes deterministic, reduces token cost, and lets skills focus on what agents are good at: judgment, interaction, and synthesis.

**Scope:**

- Included: New MCP tools for governance verification, metrics calculation, workspace sync, and issue archival. Refactoring of affected skills to call these tools instead of spelling out procedural steps.
- Excluded: Judgment-heavy skills (constitutional alignment, specification writing, roadmap validation) remain as-is. No changes to the MCP protocol or storage provider abstractions.

## Goals and Non-Goals

### Goals

- Deterministic execution of all file/directory manipulation currently described in skill prose
- A `workspace_sync` MCP tool that non-lossily brings any project's `.wrangler/` directory up to date with the current schema (like wingman's `init` command)
- Reduced token cost for procedural skills (target: 60-80% reduction in skill file size for affected skills)
- Skills become thin wrappers: "call tool, present results, apply judgment where needed"

### Non-Goals

- Replacing judgment-based skills with code (constitutional alignment, specification writing, roadmap contradiction detection)
- Building a general-purpose CLI binary -- all new functionality lives as MCP tools
- Changing the workspace-schema.json format (we build on top of it)
- Migrating away from markdown-based storage

## Background & Context

### Problem Statement

Skills currently contain two very different kinds of content mixed together:

1. **Procedural instructions** -- "Create `.wrangler/config/` directory", "Run `issues_list` with status filter and count results", "Read template file, substitute placeholders, write to `.git/hooks/pre-commit`, chmod +x"
2. **Judgment guidance** -- "Ask the user about their project mission", "Determine if this feature aligns with constitutional principles", "Decide whether this issue is truly complete"

When agents execute procedural instructions from natural language, failure modes include:

- Forgetting steps (especially in 10+ step procedures)
- Getting file paths slightly wrong
- Missing permissions (`chmod +x`)
- Arithmetic errors in metric calculations
- Inconsistent template substitution
- Skipping verification steps

These are all problems that code solves trivially.

### Current State

**`session-start.sh`** handles initial workspace creation but has a critical limitation: it checks `if [ -d ".wrangler/issues" ]` and skips if already initialized. This means new directories added to `workspace-schema.json` (e.g., `workflows/`, `prompts/`) are never created in existing projects.

**Skills with highest procedural content:**

| Skill                     | Procedural % | Steps    | Token cost |
| ------------------------- | ------------ | -------- | ---------- |
| `refreshing-metrics`      | 85%          | 14 steps | ~400 lines |
| `setting-up-git-hooks`    | 85%          | 10 steps | ~500 lines |
| `verifying-governance`    | 80%          | 10 steps | ~350 lines |
| `initializing-governance` | 70%          | 12 steps | ~400 lines |
| `housekeeping`            | 60%          | 10 steps | ~300 lines |

### Proposed State

Each procedural skill becomes a thin skill that calls an MCP tool:

```
Before: Skill (500 lines of procedural + judgment) → Agent follows steps → Files change
After:  Skill (100 lines of judgment) → MCP tool (deterministic code) → Files change
```

The `workspace_sync` tool replaces the one-shot initialization in `session-start.sh` with an idempotent sync that can be run anytime.

## Requirements

### Functional Requirements

#### FR-001: `workspace_sync` MCP Tool

The system MUST provide a `workspace_sync` MCP tool that:

- Reads `workspace-schema.json` from the plugin directory
- Creates any missing directories defined in the schema
- Creates `.gitkeep` files in git-tracked directories that are empty
- Creates/updates `.wrangler/.gitignore` with patterns from schema (additive only -- never removes user-added patterns)
- Detects and reports legacy directory names (e.g., `.wrangler/issues/complete` should be `.wrangler/issues/archived`)
- Reports what was created, what already existed, and what legacy paths were found
- Is fully idempotent -- safe to run on every session start
- NEVER deletes or overwrites existing files
- Accepts an optional `fix` parameter: when true, renames legacy directories to canonical names; when false (default), only reports drift

**Non-lossy guarantees:**

- Existing files in directories are never modified or deleted
- Existing `.gitignore` entries are preserved (new patterns appended)
- User-created subdirectories within `.wrangler/` are preserved
- Governance files (CONSTITUTION.md, ROADMAP.md, etc.) are never overwritten if they exist

#### FR-002: `governance_metrics` MCP Tool

The system MUST provide a `governance_metrics` MCP tool that:

- Queries `issues_list` to count issues by status, priority, type, and project
- Counts specifications by status and roadmap phase
- Greps specification files for "Constitutional Alignment" sections
- Counts principle references across specifications
- Calculates percentages, velocity (issues closed in last N days), and trends
- Returns all metrics as structured JSON (not prose)
- Does NOT modify any files -- returns data only

#### FR-003: `governance_verify` MCP Tool

The system MUST provide a `governance_verify` MCP tool that:

- Validates directory structure against `workspace-schema.json`
- Checks governance file existence (CONSTITUTION.md, ROADMAP.md, ROADMAP_NEXT_STEPS.md)
- Validates `.wrangler/.gitignore` contains all required patterns
- Detects legacy directory/file locations
- Returns a structured drift report with categories: `missing_directories`, `missing_files`, `legacy_paths`, `missing_gitignore_patterns`
- Returns an overall status: `COMPLIANT`, `DRIFT_DETECTED`, or `CRITICAL`

#### FR-004: `issues_archive` MCP Tool

The system MUST provide an `issues_archive` MCP tool that:

- Identifies all issues with status `closed` or `cancelled` that are not in `archived/` subdirectory
- Moves identified issue files to the appropriate `archived/` subdirectory
- Preserves file content and frontmatter completely
- Returns list of moved files and count
- Accepts an optional `dry_run` parameter (default: true) that reports what would be archived without moving

#### FR-005: Skill Refactoring

The following skills MUST be refactored to call the new MCP tools instead of containing procedural steps:

- `verifying-governance` → calls `governance_verify`, then presents results and offers fixes via `workspace_sync(fix: true)`
- `refreshing-metrics` → calls `governance_metrics`, then applies returned data to update README files
- `housekeeping` → calls `governance_metrics` + `issues_archive` + `governance_verify` to gather data, then dispatches judgment-heavy agents
- `initializing-governance` → calls `workspace_sync` for structure, then focuses on interactive governance content creation
- `setting-up-git-hooks` → calls a `hooks_generate` tool (or script) for template substitution and file writing

#### FR-006: Session Start Integration

`session-start.sh` MUST be updated to:

- Remove the "skip if already initialized" check (`if [ -d ".wrangler/issues" ]`)
- Instead, always ensure minimal structure exists (directories only, no governance files)
- The heavy sync logic moves to the `workspace_sync` MCP tool which agents can call explicitly

### Non-Functional Requirements

- **Performance:** `workspace_sync` MUST complete in under 2 seconds for a workspace with up to 1000 issues
- **Idempotency:** All new tools MUST be safe to call multiple times with identical results
- **Backwards compatibility:** Existing workspaces MUST continue to work without running sync manually
- **Test coverage:** All new tools MUST have 80%+ test coverage

## Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────┐
│                    MCP Server                       │
│                                                     │
│  Existing Tools          New Tools                  │
│  ┌──────────────┐       ┌──────────────────┐       │
│  │ issues_*     │       │ workspace_sync   │       │
│  │ session_*    │       │ governance_verify│       │
│  └──────────────┘       │ governance_metrics│      │
│                         │ issues_archive   │       │
│                         └──────────────────┘       │
│                                │                    │
│                    ┌───────────┴──────────┐        │
│                    │ workspace-schema.json │        │
│                    │ (source of truth)     │        │
│                    └──────────────────────┘        │
└────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
  ┌──────────────┐     ┌──────────────────────┐
  │  .wrangler/  │     │  Skills (refactored) │
  │  directory   │     │  - thin wrappers     │
  │  structure   │     │  - judgment only     │
  └──────────────┘     └──────────────────────┘
```

### Components

#### Component 1: workspace_sync Tool

**Responsibility:** Ensure `.wrangler/` directory structure matches `workspace-schema.json`

**Location:** `mcp/tools/workspace/sync.ts`

**Interfaces:**

- Input: `{ fix?: boolean }` (default false = report only)
- Output: `{ status: 'compliant' | 'synced' | 'drift_detected', created: string[], existing: string[], legacy: { from: string, to: string }[], gitignore_added: string[] }`

**Key behaviors:**

- Reads schema from plugin directory (not project directory)
- Creates directories with `mkdir -p` (naturally idempotent)
- Appends to `.gitignore` without duplicating
- Renames legacy paths only when `fix: true`
- Never touches file content

#### Component 2: governance_verify Tool

**Responsibility:** Validate workspace structure and report drift

**Location:** `mcp/tools/workspace/verify.ts`

**Interfaces:**

- Input: `{}` (no parameters)
- Output: `{ status: 'COMPLIANT' | 'DRIFT_DETECTED' | 'CRITICAL', missing_directories: string[], missing_files: string[], legacy_paths: { current: string, expected: string }[], missing_gitignore_patterns: string[] }`

**Dependencies:** Reads workspace-schema.json, reads filesystem

#### Component 3: governance_metrics Tool

**Responsibility:** Calculate all governance metrics from issue data

**Location:** `mcp/tools/workspace/metrics.ts`

**Interfaces:**

- Input: `{ velocity_days?: number }` (default 7)
- Output:

```typescript
{
  issues: {
    total: number,
    by_status: Record<string, number>,
    by_priority: Record<string, number>,
    by_type: Record<string, number>,
    by_project: Record<string, number>
  },
  specifications: {
    total: number,
    by_status: Record<string, number>,
    with_constitutional_alignment: number,
    constitutional_alignment_pct: number,
    principle_coverage: Record<string, number>
  },
  velocity: {
    closed_last_n_days: number,
    period_days: number
  }
}
```

**Dependencies:** Uses existing `issues_list` internally

#### Component 4: issues_archive Tool

**Responsibility:** Archive closed/cancelled issues

**Location:** `mcp/tools/issues/archive.ts`

**Interfaces:**

- Input: `{ dry_run?: boolean }` (default true)
- Output: `{ candidates: string[], moved: string[], count: number }`

**Dependencies:** Reads issue files, moves to `archived/` subdirectory

### File Structure

```
mcp/
├── tools/
│   ├── issues/
│   │   ├── archive.ts          # NEW: issues_archive
│   │   └── ... (existing)
│   └── workspace/              # NEW directory
│       ├── sync.ts             # workspace_sync
│       ├── verify.ts           # governance_verify
│       └── metrics.ts          # governance_metrics
├── __tests__/
│   └── tools/
│       ├── issues/
│       │   └── archive.test.ts # NEW
│       └── workspace/          # NEW directory
│           ├── sync.test.ts
│           ├── verify.test.ts
│           └── metrics.test.ts
└── server.ts                   # Register new tools
```

## Security Considerations

### Path Traversal

All new tools MUST use the existing `assertWithinWorkspace()` pattern from `MarkdownProvider` to prevent path traversal attacks. The `workspace_sync` tool creates directories only within `.wrangler/` at the git root.

### File Safety

- `workspace_sync` MUST NOT delete or overwrite existing files
- `issues_archive` MUST preserve file content exactly (move, not copy+delete)
- `governance_metrics` is read-only
- `governance_verify` is read-only

## Testing Strategy

### Test Coverage

- **Unit tests:** Each tool gets its own test file with 80%+ coverage
- **Integration tests:** End-to-end tests that create a temp workspace, run sync, verify structure
- **Idempotency tests:** Run each tool twice, verify identical output
- **Legacy path tests:** Create legacy directory names, verify detection and optional fix

### Key Test Scenarios

1. **Fresh workspace:** `workspace_sync` on empty `.wrangler/` creates full structure
2. **Existing workspace:** `workspace_sync` on populated workspace creates only missing dirs, touches nothing else
3. **New schema version:** Add directory to schema, verify sync creates it in existing workspace
4. **Legacy paths:** Create `.wrangler/issues/complete/`, verify `governance_verify` detects it, verify `workspace_sync(fix: true)` renames it
5. **Gitignore merge:** Existing `.gitignore` with custom patterns, verify sync appends without duplicating
6. **Metrics accuracy:** Create known set of issues, verify `governance_metrics` returns correct counts
7. **Archive dry run:** Verify `issues_archive(dry_run: true)` reports but doesn't move
8. **Archive execution:** Verify `issues_archive(dry_run: false)` moves files correctly

## Open Questions & Decisions

### Resolved Decisions

| Decision                   | Options Considered                        | Chosen                  | Rationale                                                               |
| -------------------------- | ----------------------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| Where to put new tools     | `tools/governance/` vs `tools/workspace/` | `tools/workspace/`      | "Governance" implies judgment; "workspace" implies structure            |
| Schema location at runtime | Ship with plugin vs copy to project       | Ship with plugin        | Single source of truth, no drift between plugin and project schema      |
| Hook generation approach   | MCP tool vs standalone script             | Defer to implementation | Need to evaluate whether template substitution is better in TS or shell |

### Open Questions

- [ ] **Q1: Should `workspace_sync` also seed template README files into empty directories?**
  - Impact: Determines whether initializing-governance still needs to create READMEs
  - Options: (a) Sync creates READMEs from templates if dir is empty (wingman pattern), (b) Sync only creates dirs, READMEs come from governance init skill
  - Leaning: Option (a) for directories that have README templates in schema, following wingman's "seed if empty" pattern

- [ ] **Q2: Should `hooks_generate` be an MCP tool or a shell script?**
  - Impact: Determines whether setting-up-git-hooks skill calls MCP or runs a script
  - Options: (a) MCP tool in TypeScript, (b) Shell script invoked by agent, (c) Defer to later spec
  - Leaning: Option (c) -- hooks are complex enough to warrant their own spec

- [ ] **Q3: Should `session-start.sh` call `workspace_sync` via MCP, or should it keep doing minimal dir creation in shell?**
  - Impact: Determines startup latency and dependency on MCP server being ready
  - Options: (a) session-start.sh does minimal dirs, agent calls workspace_sync on first interaction, (b) session-start.sh invokes MCP tool directly
  - Leaning: Option (a) -- keep session-start.sh fast and simple, let the agent do the full sync

## Risks & Mitigations

| Risk                                          | Probability | Impact | Mitigation                                                           |
| --------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------- |
| Breaking existing workspaces during migration | Medium      | High   | Non-lossy guarantees enforced by tests; `fix` defaults to false      |
| Schema divergence between plugin versions     | Low         | Medium | Schema ships with plugin; version field enables compatibility checks |
| Token cost savings smaller than expected      | Low         | Low    | Even modest savings compound across every session                    |
| Skills become too thin to be useful           | Low         | Medium | Skills retain judgment, interaction, and presentation logic          |

## Success Criteria

### Launch Criteria

- [ ] All 4 new MCP tools implemented with 80%+ test coverage
- [ ] `workspace_sync` is idempotent and non-lossy (verified by tests)
- [ ] At least 3 skills refactored to use new tools (verifying-governance, refreshing-metrics, housekeeping)
- [ ] `session-start.sh` updated to be idempotent (no skip-if-exists check)
- [ ] All existing MCP tests still pass
- [ ] All existing engine tests still pass

### Success Metrics (Post-Launch)

- Affected skills reduced by 50%+ in line count
- Zero reports of workspace corruption from `workspace_sync`
- Agent-executed governance verification produces consistent results (no missed steps)

## References

### Related Specifications

- SPEC-000047: Workflow Template Layering and Gate Enforcement (may interact with workspace structure)

### Prior Art

- Wingman `init` command (`/Users/sam/medb/projects/bacchus-labs/wingman/wingman-main/src/cli/commands/init.ts`) -- non-lossy workspace sync with `ensureDir()` + "seed if empty" pattern
- Wingman `DirectoryManager.initializeWorkspace()` (`/Users/sam/medb/projects/bacchus-labs/wingman/wingman-main/src/utils/directory.ts:233-294`)

### Existing Code

- Current workspace schema: `/Users/sam/medb/projects/wrangler/.wrangler/config/workspace-schema.json`
- Current session-start hook: `/Users/sam/medb/projects/wrangler/hooks/session-start.sh`
- MCP server registration: `/Users/sam/medb/projects/wrangler/mcp/server.ts`
- Session storage provider pattern: `/Users/sam/medb/projects/wrangler/mcp/providers/session-storage.ts`

## Appendix

### Skills Affected (Full Inventory)

**Will be refactored (call new tools):**

- `verifying-governance` -- calls `governance_verify` + `workspace_sync`
- `refreshing-metrics` -- calls `governance_metrics`
- `housekeeping` -- calls `governance_metrics` + `issues_archive` + `governance_verify`
- `initializing-governance` -- calls `workspace_sync` for scaffolding

**Deferred (separate spec recommended):**

- `setting-up-git-hooks` -- hook template generation is complex enough for its own spec
- `updating-git-hooks` -- depends on hooks spec

**No changes needed (judgment-heavy):**

- `checking-constitutional-alignment` (85% judgment)
- `validating-roadmaps` (75% judgment)
- `writing-specifications` (70% judgment)
- `defining-constitution` (65% judgment)
- `writing-plans` (60% judgment)
- `creating-issues` (70% judgment)
- `capturing-ideas` (preservation, not generation)

### Glossary

- **Non-lossy:** Operation guarantees no existing data is deleted or overwritten
- **Idempotent:** Running the operation multiple times produces the same result as running it once
- **Procedural step:** A deterministic file/directory operation that requires no judgment
- **Judgment step:** An operation requiring analysis, decision-making, or user interaction
- **Drift:** Difference between actual workspace state and expected state per schema
- **Legacy path:** A directory or file path that was valid in a previous schema version but has been renamed
