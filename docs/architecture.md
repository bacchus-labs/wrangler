# Project Architecture

> Last Updated: 2026-02-17 | Version: 1.2.0

This document describes wrangler's directory structure and the purpose of each component.

---

## Top-Level Layout

```
wrangler/
├── .claude-plugin/        # Claude Code plugin configuration
│   ├── plugin.json        # Plugin manifest (MCP server config, metadata)
│   └── marketplace.json   # Marketplace listing metadata
│
├── .wrangler/             # Centralized workspace (governance, tracking, orchestration)
│   └── (see below)
│
├── bin/                   # Executable scripts
│   ├── check-workflow-status   # Check running workflow status
│   └── wrangler-workflow       # Run workflow engine from CLI
│
├── commands/              # Slash command definitions (markdown prompts)
│   ├── audit-session.md
│   ├── commit-push-pr.md
│   ├── generate-plan-for-spec.md
│   ├── help.md
│   ├── idea.md
│   ├── implement.md
│   ├── init-workspace.md
│   ├── issues.md
│   ├── run-tests.md
│   ├── setup-git-hooks.md
│   ├── sitrep.md
│   ├── update-git-hooks.md
│   ├── update-yourself.md
│   └── write-plan.md
│
├── devops/
│   └── docs/              # Developer/maintainer documentation
│
├── docs/                  # User-facing reference documentation
│   └── (see below)
│
├── hooks/                 # Session hooks for Claude Code
│   ├── hooks.json         # Hook configuration
│   ├── session-start.sh   # Runs on session start (workspace init)
│   ├── README.md
│   └── __tests__/         # Hook tests (bats)
│
├── lib/                   # Shared shell libraries
│   └── initialize-skills.sh
│
├── mcp/                   # Built-in MCP server (TypeScript)
│   ├── index.ts           # Server entry point
│   ├── server.ts          # WranglerMCPServer class
│   ├── bundle-entry.ts    # Bundled entry for distribution
│   ├── workspace-schema.ts # Workspace directory schema
│   ├── tsconfig.json
│   ├── providers/         # Storage providers
│   │   ├── base.ts        # Abstract provider interface
│   │   ├── factory.ts     # Provider factory
│   │   └── markdown.ts    # Markdown file storage
│   ├── tools/
│   │   ├── issues/        # 11 issue management tools
│   │   ├── session/       # 5 session orchestration tools
│   │   └── workspace/     # Workspace initialization tools
│   ├── types/             # TypeScript type definitions
│   ├── dist/              # Compiled output (gitignored)
│   └── __tests__/         # Test suite
│
├── reference-prompts/     # Reference prompt library
│   ├── agents/            # Agent role definitions
│   ├── commands/          # Command prompt references
│   └── skills/            # Skill prompt references
│
├── scripts/               # Utility scripts
│   └── pre-commit         # Pre-commit hook script
│
├── skills/                # Skills library (41 skills)
│   ├── analyzing-implementations/
│   ├── analyzing-research-documents/
│   ├── capturing-ideas/
│   ├── checking-constitutional-alignment/
│   ├── cleanup-dangling-worktrees/
│   ├── creating-issues/
│   ├── defining-constitution/
│   ├── designing-frontends/
│   ├── dispatching-parallel-agents/
│   ├── finishing-a-development-branch/
│   ├── frontend/
│   ├── housekeeping/
│   ├── implementing-issue/
│   ├── implementing-specs/
│   ├── initializing-governance/
│   ├── locating-code/
│   ├── organizing-root-files/
│   ├── practicing-tdd/
│   ├── receiving-code-review/
│   ├── refining-specifications/
│   ├── refreshing-metrics/
│   ├── reporting-status/
│   ├── requesting-code-review/
│   ├── researching-web-sources/
│   ├── reviewing-code/
│   ├── running-tests/
│   ├── running-workflows/
│   ├── setting-up-git-hooks/
│   ├── sharing-skills/
│   ├── testing-skills-with-subagents/
│   ├── tracing-root-causes/
│   ├── updating-git-hooks/
│   ├── updating-wrangler/
│   ├── using-git-worktrees/
│   ├── using-wrangler/
│   ├── validating-roadmaps/
│   ├── verifying-before-completion/
│   ├── verifying-governance/
│   ├── writing-plans/
│   ├── writing-skills/
│   └── writing-specifications/
│
├── workflows/             # Workflow engine and definitions
│   ├── engine/            # TypeScript workflow execution engine
│   ├── agents/            # Workflow agent definitions
│   ├── prompts/           # Workflow prompt templates
│   ├── code-review.yaml   # Code review workflow definition
│   └── spec-implementation.yaml  # Spec implementation workflow
│
├── CLAUDE.md              # Agent directives and project context
├── AGENTS.md              # Multi-agent coordination context
├── README.md              # Human-readable project overview
├── package.json           # Node.js project configuration
└── jest.config.js         # Test configuration
```

---

## .wrangler/ Directory

The `.wrangler/` directory is the centralized workspace for all project governance, tracking, and orchestration data. Everything here is git-tracked except `cache/` and `logs/`.

```
.wrangler/
├── CONSTITUTION.md          # Design principles (supreme law of the project)
├── ROADMAP.md               # Strategic multi-phase roadmap
├── ROADMAP_NEXT_STEPS.md    # Tactical execution tracker
│
├── config/                  # Runtime configuration
│   ├── workspace-schema.json  # Canonical schema defining all workspace paths
│   └── wrangler.json          # Project-level wrangler settings
│
├── docs/                    # Auto-generated governance documentation
│   └── worktree-pitfalls.md
│
├── ideas/                   # Captured ideas not yet promoted to specifications
│   ├── {slug}.md            # Idea files with frontmatter
│   └── ...
│
├── issues/                  # Implementation tasks (MCP-managed)
│   ├── {counter}-{slug}.md  # Issue files with YAML frontmatter
│   ├── ISS-{id}-{slug}.md   # Alternative naming format
│   └── archived/            # Completed/cancelled issues
│
├── memory/                  # Persistent reference material for agents
│   ├── CODING_STANDARDS.md  # Project coding standards
│   ├── TESTING_STANDARDS.md # Testing standards and patterns
│   └── claude-code-reference/  # Claude Code system reference
│
├── memos/                   # Working notes, analyses, retrospectives
│   ├── {date}-{topic}.md    # Dated memo files
│   ├── archived/            # Historical memos
│   └── deprecated-skills/   # Archived skill documentation
│
├── orchestration/           # Workflow orchestration configuration
│   ├── agents/              # Agent role definitions (analyzer, fixer, etc.)
│   ├── prompts/             # Step-level prompt templates
│   └── workflows/           # Workflow YAML definitions
│
├── plans/                   # Implementation plans (optional)
│   └── {date}-PLAN_{topic}.md
│
├── specifications/          # Feature specifications (MCP-managed)
│   ├── {counter}-{slug}.md  # Spec files with YAML frontmatter
│   └── archived/            # Completed specifications
│
├── cache/                   # Runtime cache (gitignored)
├── logs/                    # Runtime logs (gitignored)
└── sessions/                # Workflow session state (gitignored)
```

---

## docs/ Directory

```
docs/
├── README.md                    # Documentation index
├── architecture.md              # This file - project structure reference
├── information-architecture.md  # How wrangler organizes knowledge
├── governance.md                # Governance framework user guide
├── mcp-usage.md                 # MCP server tools and usage
├── session-hooks.md             # Session hooks system
├── versioning.md                # Versioning and self-update
├── slash-commands.md            # Slash commands reference
├── workflows.md                 # Core workflow descriptions
├── workflow-patterns.md         # Multi-agent workflow patterns
├── git-hooks.md                 # Git hooks enforcement framework
├── git-hooks-migration.md       # Migration guide for git hooks
├── skill-invocation-patterns.md # Task-to-skill mapping
└── verification-requirements.md # Evidence requirements for claims
```
