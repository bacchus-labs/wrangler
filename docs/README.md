# Wrangler Documentation Index

**Last Updated**: 2025-11-18
**Version**: 1.1.0

This is the comprehensive documentation hub for wrangler. All guides, references, and technical documentation are organized here.

---

## Quick Links

| Documentation | Description | Audience |
|---------------|-------------|----------|
| [Getting Started](#getting-started) | First steps with wrangler | New users |
| [Core Concepts](#core-concepts) | Foundational knowledge | All users |
| [User Guides](#user-guides) | How-to guides and workflows | Users |
| [Technical Reference](#technical-reference) | Detailed technical docs | Developers |
| [Ideas & Proposals](#ideas--proposals) | Future possibilities | Contributors |

---

## Getting Started

### New to Wrangler?

Start here for a quick introduction:

1. **[Project README](../README.md)** - Overview, installation, skills list
2. **[Quick Start Guide](#quick-start)** - Get up and running in 5 minutes
3. **[CLAUDE.md](../CLAUDE.md)** - Comprehensive project context for AI agents

### Quick Start

**Prerequisites**: Claude Code v2.0+ installed

**Installation**:
```bash
# Wrangler installs as a Claude Code plugin
# Verify installation
/help

# Should show wrangler commands:
# - /wrangler:brainstorm
# - /wrangler:write-plan
# - /wrangler:execute-plan
```

**First Steps**:
1. **Initialize project**: Navigate to a git repository, wrangler auto-creates `issues/` and `specifications/` directories
2. **Try a command**: Run `/wrangler:brainstorm` to refine an idea
3. **Explore skills**: Browse `skills/` directory in plugin installation
4. **Read governance guide**: [GOVERNANCE.md](GOVERNANCE.md) for project organization

**Common First Tasks**:
- Create a specification: See [MCP-USAGE.md](MCP-USAGE.md#creating-specifications)
- Start a feature: `/wrangler:brainstorm` → `/wrangler:write-plan` → `/wrangler:execute-plan`
- Initialize governance: Use `initializing-governance` skill

---

## Core Concepts

### What is Wrangler?

Wrangler is a **comprehensive project governance framework and skills library** for AI coding assistants (Claude Code). It provides:

1. **Skills Library** (36 skills) - Proven techniques for testing, debugging, planning, code review
2. **MCP Server** (11 tools) - Issue and specification management
3. **Governance Framework** - Constitutional principles, strategic roadmap, tactical execution
4. **Versioning System** - Automatic version detection and self-updating
5. **Session Hooks** - Automatic workspace initialization and context injection

### Key Principles

From wrangler's constitutional framework:

1. **Test-Driven Development** - Write tests first, always
2. **Systematic over Ad-Hoc** - Follow documented processes
3. **Complexity Reduction** - Simplicity as primary goal
4. **Evidence over Claims** - Verify before declaring success
5. **Domain over Implementation** - Work at problem level

### Architecture Overview

```
Wrangler Plugin
│
├── Skills (36)           → Workflow instructions
│   ├── Testing           → TDD, async testing, anti-patterns
│   ├── Debugging         → Systematic debugging, root cause tracing
│   ├── Collaboration     → Planning, code review, parallel work
│   ├── Governance        → Constitution, roadmap, verification
│   └── Meta              → Creating/testing skills
│
├── MCP Server           → Issue/spec management
│   ├── 11 Tools         → issues_create, issues_list, issues_search, etc.
│   └── Markdown Storage → Git-tracked files in issues/, specifications/
│
├── Session Hooks        → Automatic initialization
│   └── SessionStart     → Create directories, inject context
│
├── Slash Commands (7)   → Shortcuts to workflows
│   ├── /wrangler:brainstorm
│   ├── /wrangler:write-plan
│   ├── /wrangler:execute-plan
│   ├── /wrangler:updating-wrangler
│   └── ... (diagnostics)
│
└── Governance Templates → Constitution, roadmap, issues, specs
```

---

## User Guides

### By Topic

#### Project Organization

- **[GOVERNANCE.md](GOVERNANCE.md)** - Complete governance framework guide
  - Constitutional principles
  - Strategic roadmap (phases, timelines)
  - Tactical execution (_NEXT_STEPS tracker)
  - Ideas and proposals workflow
  - Metrics and status tracking

#### Session Management

- **[SESSION-HOOKS.md](SESSION-HOOKS.md)** - Session hooks system
  - Automatic workspace initialization
  - Context injection mechanism
  - State management (session, workspace, plugin, cache)
  - Hook configuration and troubleshooting

#### Version Control

- **[VERSIONING.md](VERSIONING.md)** - Versioning and updates
  - Version tracking in constitution
  - Release notes structure
  - Automatic version detection (startup skill)
  - Breaking changes and migration
  - `/update-yourself` command workflow

#### Issue Management

- **[MCP-USAGE.md](MCP-USAGE.md)** - MCP server complete guide
  - 11 tools with examples
  - Creating issues and specifications
  - Searching and filtering
  - Metadata management
  - Workflows and best practices

#### Commands

- **[SLASH-COMMANDS.md](SLASH-COMMANDS.md)** - Slash commands reference
  - All available commands
  - When to use each command
  - Creating custom commands
  - Troubleshooting

### By Workflow

#### Planning a Feature

**Workflow**: Idea → Design → Plan → Implementation

**Steps**:
1. **Brainstorm**: `/wrangler:brainstorm` - Refine rough idea into design
2. **Create Spec**: Use MCP `issues_create` with type="specification"
3. **Constitutional Check**: `/wrangler:checking-constitutional-alignment` skill
4. **Write Plan**: `/wrangler:write-plan` - Detailed implementation steps
5. **Execute**: `/wrangler:execute-plan` - Batch execution with review gates

**Documentation**:
- [SLASH-COMMANDS.md](SLASH-COMMANDS.md#planning--design)
- [GOVERNANCE.md](GOVERNANCE.md#graduating-ideas-to-specifications)
- [MCP-USAGE.md](MCP-USAGE.md#workflow-1-feature-development)

---

#### Fixing a Bug

**Workflow**: Reproduce → Diagnose → Fix → Verify

**Steps**:
1. **Systematic Debugging**: Use `debugging-systematically` skill
2. **Root Cause**: Use `tracing-root-causes` skill if needed
3. **TDD**: Write failing test first (`practicing-tdd` skill)
4. **Fix**: Implement minimal code to pass test
5. **Verify**: Run full test suite before completion

**Documentation**:
- Skills: `debugging-systematically`, `tracing-root-causes`, `practicing-tdd`
- [CLAUDE.md](../CLAUDE.md#skills)

---

#### Updating Wrangler Version

**Workflow**: Detect → Review → Migrate → Verify

**Steps**:
1. **Detection**: Startup skill reports OUTDATED status
2. **Review**: Check release notes for breaking changes
3. **Migrate**: Run `/update-yourself` for migration instructions
4. **Execute**: Follow step-by-step instructions
5. **Verify**: Startup skill reports SUCCESS

**Documentation**:
- [VERSIONING.md](VERSIONING.md#update-workflow)
- [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerupdate-yourself)

---

#### Creating a New Skill

**Workflow**: Test → Write → Deploy

**Steps**:
1. **TDD for Skills**: Use `writing-skills` skill
2. **Test with Subagents**: Use `testing-skills-with-subagents` skill
3. **Deploy**: Add to `skills/` directory
4. **Share**: Use `sharing-skills` skill for PR

**Documentation**:
- Skills: `writing-skills`, `testing-skills-with-subagents`, `sharing-skills`
- [CLAUDE.md](../CLAUDE.md#skills)

---

## Technical Reference

### For Developers

#### MCP Server Implementation

- **[mcp/README.md](../mcp/README.md)** - MCP server technical guide
  - Architecture overview
  - Component descriptions
  - TDD development workflow
  - Testing guide (233 tests, 87% coverage)
  - API reference

#### Code Standards

- **[CLAUDE.md](../CLAUDE.md#code-standards)** - TypeScript, testing, error handling, security
- **Project Philosophy** - [CLAUDE.md](../CLAUDE.md#project-philosophy)

#### Development Workflow

- **[CLAUDE.md](../CLAUDE.md#development-workflow)** - TDD requirements, working with MCP code, working with skills

#### Common Tasks

- **[CLAUDE.md](../CLAUDE.md#common-tasks)** - Running tests, building, debugging MCP server

### API Reference

#### MCP Tools

| Tool | Description | Documentation |
|------|-------------|---------------|
| `issues_create` | Create issue or specification | [MCP-USAGE.md](MCP-USAGE.md#issues_create) |
| `issues_list` | List with filtering | [MCP-USAGE.md](MCP-USAGE.md#issues_list) |
| `issues_search` | Full-text search | [MCP-USAGE.md](MCP-USAGE.md#issues_search) |
| `issues_get` | Retrieve by ID | [MCP-USAGE.md](MCP-USAGE.md#issues_get) |
| `issues_update` | Update fields | [MCP-USAGE.md](MCP-USAGE.md#issues_update) |
| `issues_delete` | Delete with confirmation | [MCP-USAGE.md](MCP-USAGE.md#issues_delete) |
| `issues_labels` | Manage labels | [MCP-USAGE.md](MCP-USAGE.md#issues_labels) |
| `issues_metadata` | Manage wranglerContext | [MCP-USAGE.md](MCP-USAGE.md#issues_metadata) |
| `issues_projects` | Manage projects | [MCP-USAGE.md](MCP-USAGE.md#issues_projects) |
| `issues_mark_complete` | Mark as closed | [MCP-USAGE.md](MCP-USAGE.md#issues_mark_complete) |
| `issues_all_complete` | Check completion | [MCP-USAGE.md](MCP-USAGE.md#issues_all_complete) |

#### Slash Commands

| Command | Skill | Documentation |
|---------|-------|---------------|
| `/wrangler:brainstorm` | `brainstorming` | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerbrainstorm) |
| `/wrangler:write-plan` | `writing-plans` | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerwrite-plan) |
| `/wrangler:execute-plan` | `executing-plans` | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerexecute-plan) |
| `/wrangler:updating-wrangler` | `startup-checklist` | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerupdate-yourself) |
| `/wrangler:run-tests` | (utility) | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerrun-tests) |
| `/wrangler:scan-dependencies` | (utility) | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wranglerscan-dependencies) |
| `/wrangler:analyze-session-gaps` | (utility) | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#wrangleranalyze-session-gaps) |

---

## Ideas & Proposals

### Future Possibilities

Wrangler maintains an `ideas/` directory for exploratory concepts that may become features:

1. **[Self-Healing MCP Plugin](../ideas/self-healing-mcp-plugin.md)**
   - Bundle MCP source in plugin
   - AI-driven bug detection and fixing
   - Automatic PR submission for fixes
   - Status: Brainstorming

2. **[Adaptive Workflow Modes](../ideas/adaptive-workflow-modes.md)**
   - DOUBLE_CHECK / BALANCED / FAST / EXPLORATION modes
   - Configurable quality gates via `.wrangler/settings.json`
   - Intelligent parallelization and latency optimization
   - Status: Brainstorming

3. **[Verification Workflow Layer](../ideas/verification-workflow-layer.md)**
   - Automatic quality firewall wrapping all requests
   - 4 parallel verification subagents (tests, constitution, requirements, code review)
   - Prevents "done but not verified" problem
   - "Demanding user" satisfaction validator
   - Status: Brainstorming

**Learn More**: [GOVERNANCE.md](GOVERNANCE.md#ideas-and-proposals)

---

## FAQ

### General

**Q: What's the difference between a skill, command, and tool?**

A:
- **Skill** - Detailed workflow instructions (e.g., `practicing-tdd`)
- **Command** - Shortcut to invoke skill (e.g., `/wrangler:brainstorm`)
- **Tool** - Programmatic function (e.g., `issues_create`)

Commands activate skills, skills may use tools.

**Q: Do I need to run commands manually?**

A: No. Skills activate automatically when applicable (per `using-wrangler` skill's mandatory protocol). Commands are shortcuts for user-initiated workflows.

**Q: How do I know which wrangler version my project uses?**

A: Check `.wrangler/governance/CONSTITUTION.md` frontmatter for `wranglerVersion` field. Or run startup skill (auto-runs on session start).

**Q: Where are issues and specifications stored?**

A: Currently in `issues/` and `specifications/` at project root. v1.1.0 will move to `.wrangler/issues/` and `.wrangler/specifications/`.

### Governance

**Q: What's the difference between constitution, roadmap, and specifications?**

A:
- **Constitution** - Immutable design principles (supreme law)
- **Roadmap** - Strategic phases and timelines
- **Specifications** - Detailed feature requirements
- **Issues** - Tactical implementation tasks

**Q: How do I initialize governance in my project?**

A: Use the `initializing-governance` skill. It creates constitution, roadmap, and README templates.

**Q: Can I modify the constitution?**

A: Yes, but follow the amendment process documented in the constitution template. Changes should be deliberate and well-justified.

### Technical

**Q: How do I test MCP server changes?**

A:
```bash
npm run test:mcp              # Run all tests
npm run build:mcp             # Build server
npm run watch:mcp             # Watch mode
```

See [mcp/README.md](../mcp/README.md) for details.

**Q: How do I create a custom slash command?**

A: Create a markdown file in `commands/` directory with your prompt. See [SLASH-COMMANDS.md](SLASH-COMMANDS.md#creating-custom-commands).

**Q: How do I debug session hooks?**

A:
```bash
# Run manually to see errors
~/.claude/plugins/wrangler/hooks/session-start.sh

# Validate JSON output
~/.claude/plugins/wrangler/hooks/session-start.sh | jq .
```

See [SESSION-HOOKS.md](SESSION-HOOKS.md#troubleshooting) for more.

---

## Troubleshooting

### Common Issues

| Problem | Solution | Documentation |
|---------|----------|---------------|
| Wrangler commands not found | Verify plugin installed, restart Claude Code | [SLASH-COMMANDS.md](SLASH-COMMANDS.md#command-not-found) |
| Workspace not initialized | Check you're in git repo, verify hook ran | [SESSION-HOOKS.md](SESSION-HOOKS.md#workspace-not-initialized) |
| Version check reports outdated | Run `/update-yourself` for migration | [VERSIONING.md](VERSIONING.md#troubleshooting) |
| MCP tools fail | Check `issues/` directory exists, permissions OK | [MCP-USAGE.md](MCP-USAGE.md#troubleshooting) |
| Skill not activating | Check `using-wrangler` skill loaded on session start | [SESSION-HOOKS.md](SESSION-HOOKS.md#context-not-injected) |

### Getting Help

1. **Check documentation** - Search this index for relevant guides
2. **Review CLAUDE.md** - Comprehensive project context
3. **Inspect logs** - Session hooks log to stderr
4. **File an issue** - Use MCP `issues_create` to track problem
5. **Ask in conversation** - Claude Code can help troubleshoot

---

## Contributing

### How to Contribute

1. **Submit Ideas** - Create markdown file in `ideas/` directory
2. **Create Skills** - Follow `writing-skills` and `testing-skills-with-subagents` workflows
3. **Report Bugs** - Use MCP `issues_create` with detailed reproduction steps
4. **Improve Docs** - Submit PRs to documentation files
5. **Share Workflows** - Contribute useful command patterns

### Contribution Guidelines

- Follow TDD for all code changes
- Update documentation when adding features
- Test skills with subagents before submitting
- Check constitutional alignment for new features
- Include rollback instructions for migrations

**See**: `sharing-skills` skill for PR workflow

---

## Appendix

### File Organization

```
wrangler/
├── docs/                      # User documentation (this directory)
│   ├── README.md              # This index
│   ├── GOVERNANCE.md          # Governance framework
│   ├── SESSION-HOOKS.md       # Session hooks system
│   ├── VERSIONING.md          # Versioning and updates
│   ├── SLASH-COMMANDS.md      # Commands reference
│   ├── MCP-USAGE.md           # MCP server guide
│   ├── WORKFLOW-PATTERNS.md   # Workflow examples
│   └── WORKFLOW-IDEAS.md      # Workflow explorations
│
├── skills/                    # Skills library (36 skills)
│   ├── using-wrangler/        # Mandatory first skill
│   ├── testing/               # TDD, async, anti-patterns
│   ├── debugging/             # Systematic debugging
│   ├── collaboration/         # Planning, code review
│   ├── governance/            # Constitution, verification
│   ├── wrangler/              # Startup checklist
│   └── ...
│
├── mcp/                       # MCP server implementation
│   ├── src/                   # TypeScript source
│   ├── tests/                 # 233 tests
│   └── README.md              # Technical guide
│
├── hooks/                     # Session hooks
│   ├── session-start.sh       # Initialization script
│   └── hooks.json             # Hook configuration
│
├── commands/                  # Slash commands
│   ├── brainstorm.md
│   ├── write-plan.md
│   ├── execute-plan.md
│   ├── update-yourself.md
│   └── ...
│
├── templates/                 # Templates
│   ├── constitution.md
│   └── specification.md
│
├── ideas/                     # Future proposals
│   ├── self-healing-mcp-plugin.md
│   ├── adaptive-workflow-modes.md
│   └── verification-workflow-layer.md
│
├── CLAUDE.md                  # Comprehensive project context
└── README.md                  # Quick start overview
```

### Glossary

| Term | Definition |
|------|------------|
| **Constitution** | Immutable design principles guiding all project decisions |
| **Skill** | Workflow instruction document in markdown format |
| **MCP** | Model Context Protocol - standard for tool integration |
| **Session Hook** | Script that runs on Claude Code session events |
| **Slash Command** | User-typed shortcut to activate workflows |
| **Specification** | Detailed feature requirements document |
| **Issue** | Tactical implementation task |
| **wranglerVersion** | Project's wrangler compatibility version |
| **Startup Skill** | Skill that auto-runs on session start |
| **Breaking Change** | Change requiring manual project migration |

---

## Document Changelog

### v1.1.0 (2025-11-18)
- Initial comprehensive documentation index
- Added session hooks guide
- Added versioning guide
- Added slash commands reference
- Reorganized documentation structure

---

**Last Updated**: 2025-11-18
**Maintainer**: Wrangler Team
**Status**: Current
