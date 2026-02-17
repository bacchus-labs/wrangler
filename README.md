# Wrangler

Wrangler is a Claude Code plugin that provides project governance, systematic workflows, and development tooling for AI-assisted software development. It ensures alignment between developers and AI agents through constitutional principles, tracked specifications, proven skill patterns, and automated quality enforcement.

## What Wrangler Does

- **Skills Library** -- 40 proven workflow patterns covering TDD, debugging, code review, governance, and more
- **MCP Server** -- 18 tools for issue tracking, session orchestration, and workspace management
- **Workflow Engine** -- Automated spec-to-PR orchestration with phase-based execution and TDD enforcement
- **Git Hooks** -- Pre-commit and pre-push testing and quality gates
- **Project Governance** -- Constitution, roadmap, specifications, and issue tracking

## Quick Start

Install Wrangler as a Claude Code plugin, then verify the installation:

```
/wrangler:help
```

Initialize the `.wrangler/` workspace in your project:

```
/wrangler:init-workspace
```

Explore available commands and skills:

```
/wrangler:sitrep
/wrangler:issues
```

## Skills Library

Skills are proven, reusable workflow patterns that Claude Code discovers and activates automatically when relevant to a task. When a skill exists for your current work, it is mandatory -- not optional.

**40 skills** organized across these areas:

| Category | Skills | Examples |
|----------|--------|---------|
| Testing | 3 | TDD enforcement, test execution, anti-pattern detection |
| Debugging | 3 | Systematic debugging, root cause tracing, verification |
| Collaboration | 7 | Brainstorming, code review, implementation, parallel agents |
| Git Workflows | 6 | Worktrees, branch management, hooks setup |
| Issue Management | 3 | Issue creation, specifications, idea capture |
| Governance | 8 | Constitution, roadmap, metrics, alignment checks |
| Frontend | 4 | Design, E2E testing, visual regression, accessibility |
| Code Analysis | 5 | Code location, pattern finding, research |
| System | 3 | Wrangler usage, self-update, status reporting |
| Meta | 4 | Skill authoring, testing, sharing, file organization |

See [docs/skill-invocation-patterns.md](docs/skill-invocation-patterns.md) for task-to-skill mapping.

## MCP Server

The built-in MCP server provides markdown-based tracking for issues, specifications, and workflow sessions. All data is stored as markdown files with YAML frontmatter in the `.wrangler/` directory and version-controlled with git.

### Issue Management (11 tools)

`issues_create`, `issues_list`, `issues_search`, `issues_get`, `issues_update`, `issues_delete`, `issues_labels`, `issues_metadata`, `issues_projects`, `issues_mark_complete`, `issues_all_complete`

### Session Orchestration (6 tools)

`session_start`, `session_phase`, `session_checkpoint`, `session_complete`, `session_get`, `session_status`

### Workspace Management (1 tool)

`init_workspace`

Issues and specifications are stored as `{counter}-{slug}.md` files (e.g., `000001-add-auth.md`) with structured frontmatter for status, priority, labels, assignee, and project metadata.

See [docs/mcp-usage.md](docs/mcp-usage.md) for the complete tools reference.

## Workflow Engine

The workflow engine (`workflows/engine/`) orchestrates complex spec-to-implementation workflows using the Claude Agent SDK. It provides deterministic, phase-based execution with built-in quality gates.

- **Spec-implementation workflow** -- Takes a specification and drives it through plan, execute, verify, and publish phases
- **Code-review workflow** -- Automated review with structured feedback
- **Phase-based execution** -- Each phase has defined entry/exit criteria
- **Session tracking** -- Checkpoints enable pause, resume, and recovery
- **TDD enforcement** -- Tests must pass before phase transitions

The engine is actively developed with 532 tests. See [workflows/engine/](workflows/engine/) for details.

## Slash Commands

14 commands that trigger specific workflows:

| Command | Purpose |
|---------|---------|
| `/wrangler:implement` | Implement from specs, plans, or issues |
| `/wrangler:run-tests` | Run tests and fix failures |
| `/wrangler:commit-push-pr` | Commit, push, and create PR |
| `/wrangler:write-plan` | Create an implementation plan |
| `/wrangler:generate-plan-for-spec` | Break a specification into issues |
| `/wrangler:issues` | Show issue and specification status |
| `/wrangler:idea` | Capture a new idea |
| `/wrangler:audit-session` | Audit session workflow adherence |
| `/wrangler:init-workspace` | Initialize `.wrangler/` workspace |
| `/wrangler:sitrep` | Situational report on project state |
| `/wrangler:help` | Documentation and help |
| `/wrangler:setup-git-hooks` | Configure git hooks |
| `/wrangler:update-git-hooks` | Update hook configuration |
| `/wrangler:update-yourself` | Update wrangler plugin |

See [docs/slash-commands.md](docs/slash-commands.md) for detailed usage.

## Project Governance

Wrangler implements a three-tier governance framework:

1. **Constitution** (`.wrangler/CONSTITUTION.md`) -- Core design principles that guide all development decisions. Immutable unless formally amended.
2. **Roadmap** (`.wrangler/ROADMAP.md`) -- Strategic planning with phased execution milestones.
3. **Specifications and Issues** -- Tactical execution. Specifications define planned work; issues track implementation tasks.

The governance system includes automated verification, constitutional alignment checks, and metric tracking. Run `/wrangler:init-workspace` to initialize governance files for a new project.

See [docs/governance.md](docs/governance.md) for the full governance guide.

## Git Hooks

Automated testing and code quality enforcement through git hooks:

- **Pre-commit** -- Runs formatter, linter, and unit tests before each commit
- **Pre-push** -- Runs full test suite before pushing to protected branches
- **Commit-msg** -- Validates commit message format (optional)

TDD-aware: hooks can be bypassed during the RED phase when failing tests are expected. Run `/wrangler:setup-git-hooks` to configure.

See [docs/git-hooks.md](docs/git-hooks.md) for details.

## Directory Structure

```
wrangler/
├── skills/                     # 40 workflow skills
├── commands/                   # 14 slash commands
├── mcp/                        # MCP server (TypeScript)
│   ├── tools/
│   │   ├── issues/             # 11 issue management tools
│   │   ├── session/            # 6 session orchestration tools
│   │   └── workspace/          # 1 workspace management tool
│   ├── providers/              # Storage providers (markdown)
│   ├── types/                  # TypeScript types and schemas
│   └── __tests__/              # MCP test suite
├── workflows/
│   └── engine/                 # Workflow engine (Claude Agent SDK)
│       ├── src/                # Engine source
│       └── __tests__/          # Engine test suite (532 tests)
├── hooks/                      # Session hooks
├── docs/                       # Documentation
├── .claude-plugin/             # Plugin configuration
└── .wrangler/                  # Workspace (per-project)
    ├── CONSTITUTION.md         # Design principles
    ├── ROADMAP.md              # Strategic roadmap
    ├── issues/                 # Issue tracking
    ├── specifications/         # Feature specifications
    ├── ideas/                  # Ideas and proposals
    ├── plans/                  # Implementation plans
    ├── memos/                  # Reference material, RCAs
    ├── memory/                 # Persistent agent memory
    ├── docs/                   # Generated governance docs
    ├── config/                 # Runtime configuration
    ├── orchestration/          # Workflow orchestration data
    ├── cache/                  # Runtime cache (gitignored)
    └── logs/                   # Runtime logs (gitignored)
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/mcp-usage.md](docs/mcp-usage.md) | Complete MCP tools reference |
| [docs/governance.md](docs/governance.md) | Project governance framework |
| [docs/workflows.md](docs/workflows.md) | Development workflows (TDD, verification, code review) |
| [docs/slash-commands.md](docs/slash-commands.md) | Slash commands reference |
| [docs/skill-invocation-patterns.md](docs/skill-invocation-patterns.md) | Task-to-skill mapping |
| [docs/session-hooks.md](docs/session-hooks.md) | Session hooks and state management |
| [docs/git-hooks.md](docs/git-hooks.md) | Git hooks enforcement framework |
| [docs/versioning.md](docs/versioning.md) | Versioning and updates |
| [docs/verification-requirements.md](docs/verification-requirements.md) | Evidence requirements for claims |
| [docs/workflow-patterns.md](docs/workflow-patterns.md) | Multi-agent workflow patterns |

## Development

### MCP Server

```bash
npm run build:mcp              # Build
npm run test:mcp               # Run tests
npm run watch:mcp              # Watch mode
```

### Workflow Engine

```bash
cd workflows/engine
npm run build                  # Build
npm test                       # Run tests
npm run test:coverage          # Coverage report
```

### Requirements

- Claude Code with plugin support
- Git repository
- Node.js 20+

## License

MIT
