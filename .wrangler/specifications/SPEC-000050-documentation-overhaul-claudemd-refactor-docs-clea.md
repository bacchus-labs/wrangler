---
id: SPEC-000050
title: 'Documentation Overhaul: CLAUDE.md Refactor, docs/ Cleanup, README Rewrite'
type: specification
status: open
priority: high
labels:
  - specification
  - documentation
  - cleanup
  - refactor
createdAt: '2026-02-17T21:36:36.192Z'
updatedAt: '2026-02-17T22:09:42.280Z'
project: Documentation Overhaul
---
# Specification: Documentation Overhaul

## Executive Summary

**What:** A comprehensive refactoring of the wrangler project's documentation layer -- CLAUDE.md, docs/ directory, and README.md -- to eliminate duplication, remove stale content, and establish a clean information architecture where each document has a clear purpose and appropriate scope.

**Why:** CLAUDE.md has grown to ~1,150 lines and become a "kitchen sink" that duplicates docs/ content. The docs/ directory has stale files, missing version headers, and misplaced content. The README omits the Workflow Engine entirely and contains factual inaccuracies. This creates maintenance burden, token waste on every agent session, and misleading information.

**Scope:**
- Included: CLAUDE.md refactor, docs/ cleanup, README rewrite, .wrangler/memory/ expansion
- Excluded: Governance file content (CONSTITUTION.md, ROADMAP.md), .wrangler/issues/ content, skills content, MCP server code changes, memos/ refactoring (future "notes" rename per IDEA-9), VISION.md creation (separate near-term initiative per IDEA-9)

**Status:** Open

**Aligns with:** IDEA-000009 (Wrangler Documentation Hierarchy)

## Information Architecture (from IDEA-9)

This spec implements the documentation hierarchy defined in IDEA-000009:

- **`docs/`** - All documentation a user or agent can reference to understand current state. No brainstorming, no stale historical content.
- **`CLAUDE.md`** - Strictly agent directives -- essential project context, how to work effectively, and links to docs/ for deeper reference. No duplication with docs/.
- **`README.md`** - High-level project overview for human readers. Features, quick start, links to docs. No implementation details or agent directives.
- **`.wrangler/memos/`** - Miscellaneous notes and references from planning process. Kept as-is for now (future rename to "notes" is out of scope).
- **`.wrangler/memory/`** - Persistent reference material optimized for agent consumption. CODING_STANDARDS, TESTING_STANDARDS, development patterns. Referenced from CLAUDE.md.
- **`.wrangler/specifications/`** - Planned work. Unlocked specs labeled as drafts in frontmatter.

**Out of scope but noted as near-term follow-ups:**
- `.wrangler/VISION.md` - New concept: aspirational project state we're building toward (will be a separate initiative)
- Memos-to-notes rename and knowledge base curation workflow (IDEA-9 medium-term)

## Goals and Non-Goals

### Goals

- Reduce CLAUDE.md from ~1,150 lines to ~400-450 lines (~60% reduction) by extracting content to linked documents
- Establish clear information architecture per IDEA-9: CLAUDE.md (agent directives) -> docs/ (reference docs) -> .wrangler/memory/ (coding standards)
- Remove or archive stale documentation
- Make README an accurate, succinct overview of current project state including Workflow Engine
- Ensure every doc file has a version/date header for staleness tracking

### Non-Goals

- Rewriting skill SKILL.md files
- Changing MCP tool implementations
- Updating governance content (constitution, roadmap)
- Creating new features or changing behavior
- Refactoring .wrangler/memos/ content or renaming to "notes" (future work per IDEA-9)
- Creating .wrangler/VISION.md (separate near-term initiative)

## Background & Context

### Current State

**CLAUDE.md (~1,150 lines):** Contains full copies of content that also lives in docs/. Sections on governance framework (130 lines), MCP server (84 lines), git hooks (95 lines), code standards (52 lines), and documentation resources (55 lines) are all duplicated in dedicated doc files. Every agent session loads this entire file, wasting context window tokens.

**docs/ (14 files):** Mix of current (8 files), partially stale (3 files), misplaced (1 file), and unclear-purpose (2 files). Five files lack version/date headers. FIGMA-WRITE-MCP-SETUP.md is user-specific setup that doesn't belong. WORKFLOW-IDEAS.md is brainstorming, not documentation.

**README.md (208 lines):** Does not mention the Workflow Engine (532 tests, major project pillar). Reports 16 MCP tools (actually 19). Lists 12 slash commands (actually 14+). Directory structure diagram is incomplete. Misrepresents workspace initialization as automatic.

**.wrangler/memory/ (2 files):** Has CODING_STANDARDS.md (66 lines) and TESTING_STANDARDS.md (23 lines) but these don't yet cover content being extracted from CLAUDE.md.

### Proposed State

- **CLAUDE.md (~400 lines):** Agent directives only -- project overview, philosophy, essential workflow rules, quick reference, and links to detailed docs
- **docs/ (~10-11 files):** Clean, current, versioned reference documentation with a README.md index
- **README.md (~300 lines):** Accurate project overview including all major components
- **.wrangler/memory/ (expanded):** Coding standards, MCP development patterns, and other persistent reference material

---

## Requirements

### Part 1: CLAUDE.md Refactor

#### Sections to KEEP (with tightening)

| Section | Current Lines | Target Lines | Notes |
|---------|--------------|-------------|-------|
| Project Overview | ~50 | ~50 | Keep as-is, essential agent context |
| File Organization Guidelines | ~100 | ~30 | Keep directory rules, cut examples (reference memos/README.md) |
| QA & Compliance | ~95 | ~30 | Compress to summary + link to docs/workflows.md |
| TDD mandate | ~17 | ~17 | Keep as-is, essential enforcement |
| Working with Skills | ~13 | ~13 | Keep as-is |
| Common Tasks (commands) | ~65 | ~65 | Keep as-is, practical reference |
| Project Philosophy | ~22 | ~22 | Keep as-is, essential |
| Known Limitations | ~20 | ~20 | Keep but verify accuracy |
| Quick Reference | ~38 | ~50 | Keep + add doc links section |
| Dependencies | ~19 | ~19 | Keep as-is |
| Contact & Support | ~5 | ~5 | Keep as-is |
| Quick Start for New Agents | ~8 | ~8 | Keep as-is |

#### Sections to MOVE/DELETE

| Section | Current Lines | Destination | Action |
|---------|--------------|-------------|--------|
| Architecture (directory tree) | ~78 | docs/architecture.md (new) | Replace with 2-line summary + link |
| Project Governance Framework | ~130 | Already in docs/governance.md | Replace with 2-line summary + link |
| MCP Server info | ~84 | Already in docs/mcp-usage.md | Replace with 2-line summary + link |
| Git Hooks Framework | ~95 | Already in docs/git-hooks.md | Replace with 2-line summary + link |
| Working with MCP Code | ~48 | .wrangler/memory/MCP_DEVELOPMENT.md (new) | Extract tool pattern + registration steps |
| Skill Naming Conventions | ~20 | .wrangler/memory/CODING_STANDARDS.md | Merge into existing file |
| Token Efficiency Guidelines | ~23 | .wrangler/memory/CODING_STANDARDS.md | Merge into existing file |
| Code Standards | ~52 | .wrangler/memory/CODING_STANDARDS.md | Merge (TypeScript rules, error handling, security) |
| Documentation Resources | ~70 | docs/README.md (update index) | Replace with 1-line link |
| Version History (details) | ~30 | docs/versioning.md (append to existing) | Keep 1-line version note in CLAUDE.md, merge details into existing versioning doc |

#### New CLAUDE.md Structure (target)

```
# Wrangler - Project Context for AI Agents
## Project Overview (~50 lines) [KEEP]
## File Organization Guidelines (~30 lines) [TIGHTEN]
## Development Workflow (~30 lines) [TIGHTEN]
  - TDD mandate
  - Working with Skills
  - Key commands
## Project Philosophy (~22 lines) [KEEP]
## Quick Reference (~50 lines) [KEEP + ENHANCE]
  - File locations
  - Commands
  - Environment variables
  - Key documentation links (NEW - links to docs/, memory/)
## Known Limitations (~20 lines) [KEEP, verify]
## Dependencies (~19 lines) [KEEP]
## Contact & Quick Start (~13 lines) [KEEP]
```

#### Key principle (per IDEA-9)
CLAUDE.md should contain ZERO duplicated content with docs/. Every detailed topic should exist in exactly one place, with CLAUDE.md linking to it. The test: "If I update this information, do I need to update it in two places?" If yes, it's wrong.

### Part 2: docs/ Directory Cleanup

#### File Naming Convention

All docs/ files should use **lowercase-with-dashes** naming (except `README.md` which follows standard convention). Think of docs/ as a directory that will eventually become a navigable docs site.

**Renames required:**

| Current | New Name |
|---------|----------|
| `GOVERNANCE.md` | `governance.md` |
| `MCP-USAGE.md` | `mcp-usage.md` |
| `SESSION-HOOKS.md` | `session-hooks.md` |
| `SLASH-COMMANDS.md` | `slash-commands.md` |
| `VERSIONING.md` | `versioning.md` |
| `WORKFLOW-PATTERNS.md` | `workflow-patterns.md` |

Note: `FIGMA-WRITE-MCP-SETUP.md` and `WORKFLOW-IDEAS.md` are being moved out so no rename needed. All internal cross-references (in CLAUDE.md, README.md, and between doc files) must be updated to use the new lowercase names.

#### Files to Keep (with rename)
- `governance.md` (was GOVERNANCE.md) - Current (v1.2.0), comprehensive
- `mcp-usage.md` (was MCP-USAGE.md) - Current (v1.2.0), comprehensive, well-maintained
- `session-hooks.md` (was SESSION-HOOKS.md) - Current (v1.2.0)
- `versioning.md` (was VERSIONING.md) - Current (v1.2.0) -- will also absorb version history details from CLAUDE.md
- `workflows.md` - Current, well-structured (already lowercase)

#### Files to Update (with rename where applicable)
- `slash-commands.md` (was SLASH-COMMANDS.md) - Update to v1.2.0, add missing commands (/audit-session, /idea, /init-workspace)
- `git-hooks.md` - Add version/date header, verify config schema against implementation (already lowercase)
- `skill-invocation-patterns.md` - Add version/date header, cross-check skill names against actual directories (already lowercase)
- `verification-requirements.md` - Add version/date header (already lowercase)
- `README.md` (docs index) - Update to reflect current doc inventory and new filenames

#### Files to Move/Delete
- `FIGMA-WRITE-MCP-SETUP.md` - MOVE to `.wrangler/memos/figma-mcp-setup.md` (user-specific, not general docs)
- `WORKFLOW-IDEAS.md` - MOVE to `.wrangler/ideas/` as an MCP idea artifact (brainstorming content, not documentation per IDEA-9 information architecture)
- `git-hooks-migration.md` - EVALUATE: if still relevant keep with version header; if obsolete, archive to memos/
- `workflow-patterns.md` (was WORKFLOW-PATTERNS.md) - EVALUATE: verify completeness and whether content is current; if patterns are aspirational rather than implemented, move to memos/

#### Files to Create
- `docs/architecture.md` (new) - Full directory structure tree extracted from CLAUDE.md, expanded to cover workflows/engine/ and all .wrangler/ subdirectories
- `docs/information-architecture.md` (new) - Explains the wrangler documentation and knowledge management conventions. This is a core "how wrangler works" page that users need to understand since project management and governance are central to what wrangler does. Should cover:
  - The role of each documentation layer (`docs/`, `CLAUDE.md`, `README.md`, `.wrangler/memos/`, `.wrangler/memory/`, `.wrangler/specifications/`, `.wrangler/ROADMAP.md`, `.wrangler/VISION.md`)
  - What content belongs where and why
  - How agents interact with each layer (what gets loaded into context, what gets linked, what gets searched on demand)
  - How the layers relate to each other (e.g., memos -> memory curation workflow, specs -> issues -> implementation)
  - Naming conventions and staleness expectations for each layer
  - This page will eventually be linked from documentation-maintenance skills as the authoritative reference for where things go. For now it serves as user-facing documentation of wrangler's information architecture.

#### Version Header Standard

All doc files must have this header pattern:
```markdown
# [Document Title]

> Last Updated: YYYY-MM-DD | Version: X.Y.Z
```

#### Key principle (per IDEA-9)
docs/ should contain ONLY documentation about the current state of how the project works. No brainstorming (goes to ideas/), no stale historical content (delete or archive to memos/), no user-specific setup guides (goes to memos/).

### Part 3: README.md Rewrite

#### Structure (target ~300 lines)

```markdown
# Wrangler

One-paragraph description of what wrangler is.

## What Wrangler Does
- Skills Library (48 skills)
- MCP Server (19 tools)
- Workflow Engine (spec-to-PR orchestration)
- Git Hooks Enforcement
- Project Governance Framework

## Quick Start
- Installation/setup
- First command examples

## Skills Library
- Brief description + category summary
- Link to full skills list

## MCP Server
- Brief description
- Tool categories (11 issue + 6 session + 1 workspace + 1 init = 19)
- Link to docs/mcp-usage.md

## Workflow Engine (NEW SECTION)
- What it does (spec-to-implementation, code-review workflows)
- Architecture overview
- Current status (532 tests)
- Link to workflows/engine/ docs

## Slash Commands
- Complete list (14+ commands)
- Link to docs/slash-commands.md

## Directory Structure
- Accurate .wrangler/ layout including ALL subdirectories
- Top-level project layout

## Documentation
- Links to all docs/ files
- Links to key reference material

## Development
- Build/test commands
- Contributing guidance
```

#### Factual Corrections Required
- MCP tool count: 16 -> 19 (add session_status, workspace_init, init_workspace)
- Slash commands: 12 -> 14+ (add /audit-session, /idea, /init-workspace)
- Directory structure: Add missing dirs (orchestration/, sessions/, memory/, config/, ideas/, workflows/, cache/, logs/, docs/)
- Workspace initialization: Not automatic on session start; user-triggered via /init-workspace
- Add Workflow Engine section (currently completely absent)
- Remove or fill empty AGENTS.md at project root (1 byte placeholder)

#### Key principle (per IDEA-9)
README is for human readers. High-level overview, features, quick start, links. No implementation details, no agent directives.

### Part 4: .wrangler/memory/ Expansion

#### Update Existing Files

**CODING_STANDARDS.md** - Merge in from CLAUDE.md:
- TypeScript strict mode, ES2022 target, Node16 module
- Zod for runtime validation
- MCPErrorCode enum usage patterns
- Path traversal prevention pattern
- Skill naming conventions (gerund form)
- Token efficiency guidelines (context window is public good, file size limits, progressive disclosure)

#### Create New Files

**MCP_DEVELOPMENT.md** (new) - Extract from CLAUDE.md:
- Tool implementation pattern (Zod schema -> Type -> Tool function)
- How to add new tools (8-step process)
- Tool registration in server.ts
- Error response format

#### CLAUDE.md must reference memory/ files
Add explicit links in CLAUDE.md Quick Reference section:
```markdown
### Persistent Reference (`.wrangler/memory/`)
- [CODING_STANDARDS.md](.wrangler/memory/CODING_STANDARDS.md) - TypeScript, naming, token efficiency
- [TESTING_STANDARDS.md](.wrangler/memory/TESTING_STANDARDS.md) - Integration testing requirements
- [MCP_DEVELOPMENT.md](.wrangler/memory/MCP_DEVELOPMENT.md) - MCP tool implementation patterns
```

#### Key principle (per IDEA-9)
memory/ is for persistent reference material optimized for agent consumption. Content here should be stable knowledge (standards, patterns, decisions) not ephemeral notes.

---

## Implementation Notes

### Ordering

This work can be parallelized into 4 largely independent workstreams:

1. **Part 4: memory/ expansion** - Run first (creates files that CLAUDE.md will link to)
2. **Part 2: docs/ cleanup** - Can run in parallel with Part 4 (creates docs/architecture.md that CLAUDE.md will link to)
3. **Part 3: README rewrite** - Can run in parallel with Parts 2 and 4
4. **Part 1: CLAUDE.md refactor** - Run last (depends on Parts 2 and 4 completing, since it links to their outputs)

### Verification

After all changes:
- Every link in CLAUDE.md resolves to an existing file
- Every doc file has a version/date header
- No duplicate content blocks exist across CLAUDE.md and docs/
- README accurately reflects current tool counts, command counts, directory structure
- `npm run test:mcp` still passes (no functional changes, but verify nothing broke)
- The IDEA-9 information architecture principles are respected: each document type contains only appropriate content

### What NOT to touch
- `.wrangler/memos/` content (future refactoring per IDEA-9)
- `.wrangler/CONSTITUTION.md`, `.wrangler/ROADMAP.md` (governance content out of scope)
- Skills SKILL.md files
- MCP server code
- Workflow engine code

---

## Success Criteria

- [ ] CLAUDE.md is under 500 lines
- [ ] Zero duplicated content blocks between CLAUDE.md and docs/
- [ ] All docs/ files have version/date headers
- [ ] FIGMA-WRITE-MCP-SETUP.md moved out of docs/
- [ ] WORKFLOW-IDEAS.md moved out of docs/
- [ ] README mentions Workflow Engine
- [ ] README has correct MCP tool count (19)
- [ ] README has correct slash command count
- [ ] README has accurate directory structure
- [ ] All docs/ files use lowercase-with-dashes naming (except README.md)
- [ ] All cross-references updated to use new lowercase filenames
- [ ] docs/architecture.md exists with full project layout
- [ ] docs/information-architecture.md exists documenting wrangler's knowledge management conventions
- [ ] .wrangler/memory/CODING_STANDARDS.md expanded with CLAUDE.md extractions
- [ ] .wrangler/memory/MCP_DEVELOPMENT.md exists
- [ ] All links in CLAUDE.md resolve to real files
- [ ] No functional changes (tests still pass)
- [ ] Each document type contains only content appropriate per IDEA-9 information architecture
