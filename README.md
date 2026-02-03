# Wrangler

Skills library and MCP server for AI coding assistants.

## Components

### Skills Library

48 skills across testing, debugging, collaboration, governance, git hooks, and code analysis.

### MCP Server

Issue and specification tracking using markdown files with YAML frontmatter. Stored in `.wrangler/issues/` and `.wrangler/specifications/`. Provides 11 MCP tools for CRUD operations.

### Slash Commands

12 commands that activate skills:
- `/wrangler:brainstorm` - Design refinement
- `/wrangler:write-plan` - Implementation planning
- `/wrangler:implementing-issues` - Autonomous execution
- `/wrangler:run-tests` - Test execution
- `/wrangler:updating-wrangler` - Version migration
- `/wrangler:setting-up-git-hooks` - Git hooks configuration
- `/wrangler:updating-git-hooks` - Update hooks configuration
- `/wrangler:commit-push-pr` - Commit, push, and create PR
- `/wrangler:generate-plan-for-spec` - Generate plan from specification
- `/wrangler:help` - Wrangler help and documentation
- `/wrangler:issues` - Issue status summary
- `/wrangler:reporting-status` - Situational awareness report

### Git Hooks Enforcement

Automated testing and code quality enforcement through Git hooks:
- **Pre-commit**: Runs formatter, linter, unit tests before each commit
- **Pre-push**: Runs full test suite before pushing to protected branches
- **Commit-msg**: Validates commit message format (optional)

Run `/wrangler:setting-up-git-hooks` to configure. See [docs/git-hooks.md](docs/git-hooks.md) for details.

### Session Hooks

Automatic workspace initialization on session start creates `.wrangler/` directory structure and loads core skills.

## Installation

Install via Claude Code plugin system. Run `/help` to verify - should list `/wrangler:*` commands.

## Skills

### Testing
- **test-driven-development** - RED-GREEN-REFACTOR cycle enforcement
- **run-the-tests** - Test suite execution with failure fixing
- **testing-anti-patterns** - Prevents testing mock behavior and test-only production methods

### Debugging
- **systematic-debugging** - Four-phase root cause investigation framework
- **root-cause-tracing** - Backward tracing through call stack with instrumentation
- **verification-before-completion** - Requires running verification commands before success claims

### Collaboration
- **brainstorming** - Socratic design refinement
- **writing-plans** - Implementation plan creation with MCP issues
- **implement** - Autonomous implementation via subagents with TDD and code review
- **implement-spec** - Orchestrate spec-to-PR workflow with session tracking
- **code-review** - Comprehensive code review framework
- **requesting-code-review** - Pre-merge review workflow
- **receiving-code-review** - Technical rigor in feedback responses
- **reviewing-implementation-progress** - Mid-implementation checkpoint
- **dispatching-parallel-agents** - Concurrent investigation of independent failures

### Git Workflows
- **using-git-worktrees** - Isolated workspace creation with smart directory selection
- **worktree-isolation** - Ensures changes stay in correct worktree
- **cleanup-dangling-worktrees** - Removes worktrees for merged PRs
- **finishing-a-development-branch** - Structured options for merge, PR, or cleanup
- **setup-git-hooks** - Git hooks configuration for test enforcement
- **update-git-hooks** - Update existing hooks configuration

### Issue Management
- **create-new-issue** - Creates issues via MCP `issues_create` tool
- **writing-specifications** - Technical specification creation
- **capture-new-idea** - Capture user ideas verbatim in `.wrangler/ideas/`

### Governance
- **housekeeping** - Updates roadmap, reconciles issues, detects drift
- **initialize-governance** - Creates constitution, roadmap, next steps
- **constitution** - Develop and refine constitutional principles
- **verify-governance** - Validates governance file structure
- **refresh-metrics** - Updates status counts
- **check-constitutional-alignment** - Validates feature alignment
- **validating-roadmap** - Checks specification consistency
- **refining-specifications** - Reviews specs for ambiguity

### Frontend Testing
- **frontend-design** - Production-grade interface creation
- **frontend-e2e-user-journeys** - End-to-end user flow testing
- **frontend-visual-regression-testing** - Visual diff testing
- **frontend-accessibility-verification** - A11y compliance checks

### Code Analysis
- **locating-code** - Finds files by topic/feature
- **analyzing-implementations** - Documents how code works
- **finding-code-patterns** - Finds similar implementations
- **analyzing-research-documents** - Extracts insights from research docs
- **researching-web-sources** - Strategic web research

### Wrangler System
- **using-wrangler** - Skills discovery and workflow establishment
- **update-yourself** - Update wrangler to latest version
- **sitrep** - Situational awareness report showing recent activity

### Meta Skills
- **writing-skills** - TDD for creating skills
- **testing-skills-with-subagents** - Skill validation
- **sharing-skills** - Contribution workflow
- **organize-root-files** - Cleans up markdown files at root

## MCP Server

Provides 16 tools for issue management and session orchestration:

### Issue Management (11 tools)

- `issues_create` - Create new issues or specifications
- `issues_list` - List with filtering by status, priority, labels, project
- `issues_search` - Full-text search across title, description, labels
- `issues_get` - Retrieve single issue by ID
- `issues_update` - Update issue fields
- `issues_delete` - Delete issues with confirmation
- `issues_labels` - Manage labels
- `issues_metadata` - Manage wranglerContext metadata
- `issues_projects` - Manage project assignments
- `issues_mark_complete` - Mark issues as closed
- `issues_all_complete` - Check completion status

### Session Orchestration (5 tools)

- `session_start` - Initialize orchestration session with worktree and branch
- `session_phase` - Record phase transitions (plan, execute, verify, publish)
- `session_checkpoint` - Save resumable state for recovery
- `session_complete` - Finalize session with status and PR info
- `session_get` - Retrieve session state for recovery or status check

### Storage Format

Markdown files with YAML frontmatter:
- Location: `.wrangler/issues/`, `.wrangler/specifications/`
- Filename: `{counter}-{slug}.md` (e.g., `000001-add-auth.md`)
- Frontmatter: id, title, type, status, priority, labels, assignee, project, dates
- Body: Markdown content

See [docs/MCP-USAGE.md](docs/MCP-USAGE.md) for details.

## How It Works

1. Session start hook (`hooks/session-start.sh`) initializes workspace
2. Creates `.wrangler/` directory structure if missing
3. Loads `using-wrangler` skill
4. Skills activate when relevant to task
5. MCP server provides issue/spec tracking
6. Slash commands trigger specific workflows

## Directory Structure

```
wrangler/
├── skills/                  # 48 skills
├── commands/                # 12 slash commands
├── hooks/                   # Session hooks
├── mcp/                     # MCP server (TypeScript)
├── docs/                    # Documentation
├── .wrangler/               # Workspace (created on session start)
│   ├── issues/              # Issue tracking
│   ├── specifications/      # Specifications
│   ├── plans/               # Implementation plans (optional)
│   ├── memos/               # RCA, research, lessons learned
│   └── governance/          # Constitution, roadmap
└── .claude-plugin/          # Plugin config + MCP server registration
```

## Requirements

- Claude Code with plugin support
- Git repository (for workspace initialization)
- Node.js 20+ (for MCP server)

## Documentation

- [MCP Usage](docs/MCP-USAGE.md) - MCP server tools and usage
- [Governance](docs/GOVERNANCE.md) - Constitutional framework
- [Session Hooks](docs/SESSION-HOOKS.md) - Hook system and state management
- [Versioning](docs/VERSIONING.md) - Version tracking and migration
- [Slash Commands](docs/SLASH-COMMANDS.md) - Command reference
- [Git Hooks](docs/git-hooks.md) - Git hooks enforcement framework
- [Git Hooks Migration](docs/git-hooks-migration.md) - Migration from other hook managers
- [Workflows](docs/workflows.md) - Major workflow guides (TDD, verification, code review)
- [Verification Requirements](docs/verification-requirements.md) - Evidence requirements
- [Skill Invocation Patterns](docs/skill-invocation-patterns.md) - Task-to-skill mapping
- [Workflow Patterns](docs/WORKFLOW-PATTERNS.md) - Multi-agent workflows
- [Workflow Ideas](docs/WORKFLOW-IDEAS.md) - Potential workflows

## Contributing

Use `writing-skills` and `testing-skills-with-subagents` skills to create new skills. Submit PRs via `sharing-skills` workflow.

## License

MIT
