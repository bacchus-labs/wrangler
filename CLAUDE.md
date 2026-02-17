# Wrangler - Project Context for AI Agents

This document provides essential context for AI agents (Claude Code, etc.) working on the wrangler project.

---

## Project Overview

**Wrangler** is a comprehensive project governance framework and skills library for AI coding assistants. Its primary goal is to **establish and maintain perfect alignment between you (the AI assistant) and your human partner** through systematic governance.

### Core Value Proposition

Wrangler ensures you and your human partner are **of one mind** about:

- **Design principles** (via Constitution documents)
- **Strategic direction** (via Roadmap files)
- **Tactical execution** (via tracked issues and specifications)
- **Development workflows** (via proven skills and patterns)

### Key Components

1. **Project Governance System**
   - Constitutional principles for consistent decision-making
   - Hierarchical planning (strategic roadmaps -> tactical execution)
   - Systematic issue and specification tracking
   - Automated governance verification and maintenance

2. **Skills Library** (49 skills)
   - Proven techniques, patterns, and workflows
   - Covers testing, debugging, planning, code review, governance, git hooks, design systems
   - Mandatory when applicable - no rationalizing away
   - Discoverable and composable

3. **Git Hooks Enforcement Framework**
   - Pre-commit, pre-push, commit-msg hooks
   - Automated testing and code quality enforcement
   - Bypass mechanism for TDD RED phase (humans only)
   - Two installation patterns (direct or version-controlled)

4. **Built-in MCP Server**
   - 16 tools (11 issue management + 5 session orchestration)
   - Markdown-based storage (git-tracked)
   - Automatic workspace initialization
   - Full-text search and metadata queries

5. **Template System**
   - Templates stored in skill directories (skill-local pattern)
   - Governance file templates (Constitution, Roadmap, etc.)
   - Issue and specification templates
   - Directory README templates
   - Referenced directly from skills, not copied

6. **Workflow Integration**
   - Slash commands for common operations
   - Session hooks for automatic setup
   - Verification and validation tools
   - Metric tracking and status reporting

---

## Information Architecture

Wrangler organizes project knowledge across multiple layers. See [docs/information-architecture.md](docs/information-architecture.md) for the full guide. Key rules for agents:

- `CLAUDE.md` (this file) = agent directives only, no duplication with docs/
- `docs/` = current-state reference documentation
- `.wrangler/memory/` = persistent reference (coding standards, patterns)
- `.wrangler/memos/` = working notes from planning and investigations
- `.wrangler/specifications/` = planned work (feature requirements)
- `.wrangler/issues/` = implementation tasks (MCP-managed)
- `.wrangler/ideas/` = captured ideas not yet promoted to specs

See [docs/architecture.md](docs/architecture.md) for the complete project directory structure.

---

## File Organization Guidelines

**IMPORTANT: When creating analysis, documentation, or reference files, DO NOT create them at project root.**

| Content Type | Location |
|---|---|
| Analysis, RCA, research | `.wrangler/memos/` |
| Implementation plans | `.wrangler/plans/` (optional -- prefer MCP issues as source of truth) |
| User-facing documentation | `docs/` |
| Maintainer documentation | `devops/docs/` |

**Naming conventions:**
- Memos: `YYYY-MM-DD-topic-slug.md` or descriptive names
- Docs: `lowercase-with-dashes.md`
- Plans: `YYYY-MM-DD-PLAN_<spec>.md`

**When in doubt:**

- If it's wrangler-specific analysis -> `.wrangler/memos/`
- If it's an implementation plan -> `.wrangler/plans/`
- If users read it -> `docs/`
- If only maintainers read it -> `devops/docs/`
- If it's no longer relevant -> Delete it

---

## Project Governance

Wrangler implements a three-tier governance hierarchy (Constitution, Roadmap, Tactical Execution). See [docs/governance.md](docs/governance.md) for the complete framework.

Key governance files:
- `.wrangler/CONSTITUTION.md` -- design principles (supreme law of the project)
- `.wrangler/ROADMAP.md` -- strategic multi-phase roadmap
- `.wrangler/ROADMAP_NEXT_STEPS.md` -- tactical execution tracker

Key governance commands:
- `/wrangler:initializing-governance` -- create governance files from templates
- `/wrangler:verifying-governance` -- validate governance file integrity
- `/wrangler:refreshing-metrics` -- update status counts
- `/wrangler:check-alignment` -- check constitutional alignment

---

## MCP Server

The built-in MCP server provides 19 tools for issue management, session orchestration, and workspace configuration. On session start, the `hooks/session-start.sh` script automatically initializes the workspace -- no manual setup required. See [docs/mcp-usage.md](docs/mcp-usage.md) for the complete reference.

**When to create issues:**
- Planning multi-step implementations
- Tracking bugs or technical debt
- Coordinating work across subagents
- Breaking down complex tasks

**Do NOT create issues for:** single simple tasks, trivial changes, informational queries.

**Issue storage**: Markdown files with YAML frontmatter in `.wrangler/issues/`. File naming: `{counter}-{slug}.md` (e.g., `000001-add-authentication.md`).

---

## Git Hooks

Git hooks enforce TDD, formatting, and linting on commit/push. See [docs/git-hooks.md](docs/git-hooks.md) for configuration and usage.

Key points:
- Bypass for TDD RED phase: `WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test"` (humans only)
- Configuration: `.wrangler/config/hooks-config.json`
- Setup: `/wrangler:setting-up-git-hooks`
- Update: `/wrangler:updating-git-hooks`

---

## Quality Assurance

Use `/wrangler:validate-session-adherence` to validate workflow compliance after complex implementations. Use `/wrangler:analyze-session-gaps` to identify missing capabilities or skills. See [docs/workflows.md](docs/workflows.md) for all workflow details including TDD, verification, code review, and subagent dispatch workflows.

---

## Development Workflow

### Test-Driven Development (MANDATORY)

**All code MUST follow TDD**:

1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Improve code quality

**Testing commands**:

```bash
# MCP tests
npm run test:mcp                              # Run all MCP tests
npm run test:mcp -- --watch                   # Watch mode
npm run test:mcp -- --coverage                # Coverage report
npm run test:mcp -- mcp/__tests__/server.test.ts  # Specific file

# Engine tests (from workflows/engine/)
npm test                                      # Run engine tests
npm run build                                 # Build engine
```

**Building**:

```bash
npm run build:mcp             # Build MCP server
npm run watch:mcp             # Auto-rebuild on changes
rm -rf mcp/dist && npm run build:mcp  # Clean build
```

**Debugging**:

```bash
WRANGLER_MCP_DEBUG=true npm run mcp:dev   # Debug mode with verbose logging
```

**Current test status**: 233 tests, all passing, 87.11% coverage

### Working with Skills

**Location**: All skills are in `skills/` directory

**Skill structure**:

```
skills/{skill-name}/
├── SKILL.md                   # Skill content (markdown)
└── templates/                 # Optional templates for the skill
```

**Creating new skills**: Follow the `skills/writing-skills/SKILL.md` guide

### Working with MCP Code

See [.wrangler/memory/MCP_DEVELOPMENT.md](.wrangler/memory/MCP_DEVELOPMENT.md) for the complete MCP development guide including tool implementation patterns, adding new tools, and testing.

### Code Standards

See [.wrangler/memory/CODING_STANDARDS.md](.wrangler/memory/CODING_STANDARDS.md) for TypeScript conventions, skill naming, token efficiency, error handling, and security patterns.

### Testing Standards

See [.wrangler/memory/TESTING_STANDARDS.md](.wrangler/memory/TESTING_STANDARDS.md) for integration testing requirements and unit testing guidelines.

---

## Project Philosophy

### Core Principles

1. **Test-Driven Development** - Write tests first, always
2. **Systematic over ad-hoc** - Follow documented processes
3. **Complexity reduction** - Simplicity as primary goal
4. **Evidence over claims** - Verify before declaring success
5. **Domain over implementation** - Work at problem level

### Skills Philosophy

- **Skills are mandatory when available** - If a skill exists for your task, you MUST use it
- **Skills activate automatically** - Claude Code discovers and uses relevant skills
- **Skills are proven patterns** - Battle-tested, not experimental

### MCP Philosophy

- **Issues track work, not ideas** - Create issues for actionable work items
- **Markdown is the source of truth** - Files in `issues/` and `specifications/` are authoritative
- **Git tracks everything** - All issues/specs are version controlled
- **Counter-based IDs** - Sequential numbering (000001, 000002...)

---

## Quick Reference

### File Locations

- **MCP Server Entry**: `mcp/index.ts`
- **Server Class**: `mcp/server.ts`
- **Provider**: `mcp/providers/markdown.ts`
- **Tools**: `mcp/tools/issues/*.ts`, `mcp/tools/session/*.ts`
- **Tests**: `mcp/__tests__/**/*.test.ts`
- **Config**: `.claude-plugin/plugin.json`
- **Issues**: `.wrangler/issues/*.md`
- **Specs**: `.wrangler/specifications/*.md`

### Important Commands

```bash
# MCP server
npm run build:mcp              # Build MCP server
npm run test:mcp               # Run all tests
npm run watch:mcp              # Watch mode
npm run mcp:dev                # Debug mode (verbose logging)

# Workflow engine (run from workflows/engine/)
npm test                       # Run engine tests
npm run build                  # Build engine

# Clean build
rm -rf mcp/dist && npm run build:mcp
```

### Environment Variables

- `WRANGLER_MCP_DEBUG` - Enable verbose logging (true/false)
- `WRANGLER_MCP_NAME` - Server name (default: "wrangler-mcp")
- `WRANGLER_MCP_VERSION` - Server version (default: "1.0.0")
- `WRANGLER_WORKSPACE_ROOT` - Workspace root (default: process.cwd())
- `WRANGLER_ISSUES_DIRECTORY` - Issues directory (default: "issues")
- `WRANGLER_SPECIFICATIONS_DIRECTORY` - Specifications directory (default: "specifications")

### Coverage Targets

- **Statements**: 80%+ (currently 84.68%)
- **Branches**: 80%+ (currently 71.37% - needs improvement)
- **Functions**: 80%+ (currently 93.5%)
- **Lines**: 80%+ (currently 86.02%)

### Key Documentation

- [Architecture](docs/architecture.md) - Project directory structure
- [Information Architecture](docs/information-architecture.md) - How wrangler organizes knowledge
- [MCP Usage](docs/mcp-usage.md) - Complete MCP tools reference
- [Governance](docs/governance.md) - Project governance framework
- [Workflows](docs/workflows.md) - Development workflows (TDD, verification, code review)
- [Git Hooks](docs/git-hooks.md) - Git hooks enforcement framework
- [Session Hooks](docs/session-hooks.md) - Session hooks system
- [Slash Commands](docs/slash-commands.md) - Slash commands reference
- [Versioning](docs/versioning.md) - Versioning and updates
- [Verification Requirements](docs/verification-requirements.md) - Evidence requirements
- [Skill Invocation Patterns](docs/skill-invocation-patterns.md) - Task-to-skill mapping
- [Workflow Patterns](docs/workflow-patterns.md) - Multi-agent workflow patterns
- [Git Hooks Migration](docs/git-hooks-migration.md) - Migration guide for git hooks

### Persistent Reference (.wrangler/memory/)

- [CODING_STANDARDS.md](.wrangler/memory/CODING_STANDARDS.md) - TypeScript, naming, token efficiency, security
- [TESTING_STANDARDS.md](.wrangler/memory/TESTING_STANDARDS.md) - Integration testing requirements
- [MCP_DEVELOPMENT.md](.wrangler/memory/MCP_DEVELOPMENT.md) - MCP tool implementation patterns

---

## Known Limitations

### MCP Server

1. **Concurrent ID Generation**: Race conditions possible when creating issues in parallel
   - **Workaround**: Use sequential creation
   - **Future fix**: Implement file-based locking

2. **Branch Coverage**: 71.37% (below 80% target for some error paths)
   - **Impact**: Main paths thoroughly tested, some edge cases not
   - **Future fix**: Add tests for remaining error branches

3. **Large Workspace Performance**: Slows down with >1,000 issues
   - **Workaround**: Archive old issues periodically
   - **Future fix**: Implement indexing/caching

### Workflow Engine

The workflow engine at `workflows/engine/` provides spec-to-implementation automation with configurable reporters for live progress updates (e.g., GitHub PR comments). It has its own test suite (run from `workflows/engine/`). The Agent SDK is installed with `--legacy-peer-deps` due to a zod v3/v4 conflict.

Known reporter limitations:
- Resume sessions don't restore PR number for reporters (reporters self-disable on resume)
- Template variable resolution only supports `{{env.*}}` and `{{context.*}}` namespaces

### General

- **Markdown-only provider** - GitHub/Linear backends not yet implemented
- **No issue templates** - Future enhancement

---

## Dependencies

### Production

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `gray-matter` - YAML frontmatter parsing
- `fast-glob` - Efficient file scanning
- `fs-extra` - Enhanced file operations
- `zod` - Runtime schema validation
- `zod-to-json-schema` - Convert Zod to JSON Schema

### Development

- `typescript` - TypeScript compiler
- `jest` - Testing framework
- `ts-jest` - TypeScript preprocessor for Jest
- `@types/node` - Node.js type definitions
- `@types/fs-extra` - fs-extra type definitions
- `@types/jest` - Jest type definitions

---

## Version History

See [docs/versioning.md](docs/versioning.md) for version history and update procedures.

---

## Contact & Support

**Project Owner**: Sam Hecht (samjhecht@gmail.com)
**License**: MIT
**Repository**: wrangler-marketplace/wrangler

---

## Quick Start for New Agents

1. **Understand the dual nature**: Wrangler is both a skills library AND an MCP server
2. **Check if .wrangler/ exists**: If not, it will be created automatically on session start
3. **Use issues for planning**: Create issues for complex, multi-step work
4. **Follow TDD strictly**: Write tests first, always
5. **Consult skills**: Check `skills/` directory for relevant workflows
6. **Read the docs**: Start with `docs/mcp-usage.md` for MCP features

---

**Last Updated**: February 17, 2026
**Document Version**: 1.2.0
