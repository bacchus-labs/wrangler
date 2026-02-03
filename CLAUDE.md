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
   - Hierarchical planning (strategic roadmaps → tactical execution)
   - Systematic issue and specification tracking
   - Automated governance verification and maintenance

2. **Skills Library** (49 skills)
   - Proven techniques, patterns, and workflows
   - Covers testing, debugging, planning, code review, governance, git hooks, design systems
   - Mandatory when applicable - no rationalizing away
   - Discoverable and composable

6. **Git Hooks Enforcement Framework**
   - Pre-commit, pre-push, commit-msg hooks
   - Automated testing and code quality enforcement
   - Bypass mechanism for TDD RED phase (humans only)
   - Two installation patterns (direct or version-controlled)

3. **Built-in MCP Server**
   - 16 tools (11 issue management + 5 session orchestration)
   - Markdown-based storage (git-tracked)
   - Automatic workspace initialization
   - Full-text search and metadata queries

4. **Template System**
   - Templates stored in skill directories (skill-local pattern)
   - Governance file templates (Constitution, Roadmap, etc.)
   - Issue and specification templates
   - Directory README templates
   - Referenced directly from skills, not copied

5. **Workflow Integration**
   - Slash commands for common operations
   - Session hooks for automatic setup
   - Verification and validation tools
   - Metric tracking and status reporting

---

## Architecture

### Directory Structure

```
wrangler/
├── .wrangler/                     # Centralized wrangler workspace (v1.2.0+)
│   ├── workspace-schema.json      # Canonical schema defining all paths
│   ├── CONSTITUTION.md            # Project constitution (design principles)
│   ├── ROADMAP.md                 # Strategic multi-phase roadmap
│   ├── ROADMAP_NEXT_STEPS.md      # Tactical execution tracker
│   ├── issues/                    # Issue tracking (git-tracked)
│   ├── specifications/            # Feature specs (git-tracked)
│   ├── ideas/                     # Ideas and proposals (git-tracked)
│   ├── memos/                     # Reference material, RCA archives
│   ├── plans/                     # Implementation plans (git-tracked)
│   ├── docs/                      # Auto-generated governance docs
│   ├── cache/                     # Runtime cache (gitignored)
│   ├── config/                    # Runtime config (gitignored)
│   └── logs/                      # Runtime logs (gitignored)
│
├── skills/                        # Skills library (flat structure, 47 skills)
│   ├── {skill-name}/              # Each skill in its own directory
│   │   ├── SKILL.md               # Skill definition and instructions
│   │   └── templates/             # Optional templates for the skill
│   ├── ...                        # Skills cover: debugging, testing, governance,
│   │                              # collaboration, design, implementation, etc.
│
├── mcp/                           # Built-in MCP server
│   ├── types/                     # TypeScript type definitions
│   │   ├── config.ts              # MCP configuration types
│   │   ├── issues.ts              # Issue types + Zod schemas
│   │   └── errors.ts              # Error handling types
│   ├── providers/                 # Storage providers
│   │   ├── base.ts                # Abstract provider interface
│   │   ├── factory.ts             # Provider factory
│   │   └── markdown.ts            # Markdown-based storage (540 lines)
│   ├── tools/issues/              # 11 issue management tools
│   │   ├── create.ts              # issues_create
│   │   ├── list.ts                # issues_list
│   │   ├── search.ts              # issues_search
│   │   ├── update.ts              # issues_update
│   │   ├── get.ts                 # issues_get
│   │   ├── delete.ts              # issues_delete
│   │   ├── labels.ts              # issues_labels
│   │   ├── metadata.ts            # issues_metadata
│   │   ├── projects.ts            # issues_projects
│   │   ├── mark-complete.ts       # issues_mark_complete
│   │   └── all-complete.ts        # issues_all_complete
│   ├── observability/             # Metrics collection
│   │   └── metrics.ts             # Tool invocation metrics
│   ├── server.ts                  # WranglerMCPServer main class
│   ├── index.ts                   # Server entry point
│   ├── tsconfig.json              # TypeScript config
│   ├── dist/                      # Compiled output (gitignored)
│   └── __tests__/                 # Comprehensive test suite (233 tests)
│
├── docs/                          # User-facing product documentation
├── devops/
│   └── docs/                      # Developer/maintainer documentation
│
├── commands/                      # Slash commands
│   ├── brainstorm.md              # /wrangler:brainstorm
│   ├── write-plan.md              # /wrangler:write-plan
│   ├── execute-plan.md            # /wrangler:execute-plan
│   ├── analyze-session-gaps.md    # /wrangler:analyze-session-gaps
│   └── validate-session-adherence.md  # /wrangler:validate-session-adherence
│
├── hooks/                         # Session hooks
│   ├── session-start.sh           # Auto-initializes .wrangler/
│   └── hooks.json                 # Hook configuration
│
├── .claude-plugin/                # Plugin configuration
│   └── plugin.json                # Includes MCP server config
│
└── docs/                          # Documentation
    └── MCP-USAGE.md               # MCP server user guide
```

### File Organization Guidelines

**IMPORTANT: When creating analysis, documentation, or reference files, DO NOT create them at project root.**

Use these directories for different file types:

**`.wrangler/memos/` - Wrangler Reference Material & Lessons Learned**
- Root cause analyses (RCA-*.md)
- Post-mortems and incident reports
- Lessons learned from debugging sessions
- Technical investigations and research findings
- Decision records and rationale
- Meeting notes or discussion summaries
- **Naming:** `YYYY-MM-DD-topic-slug.md` or descriptive names

**`docs/` - User-Facing Documentation**
- Product documentation
- User guides and tutorials
- API documentation for end users
- Getting started guides
- FAQ and troubleshooting (user perspective)
- **Naming:** lowercase-with-dashes.md

**`devops/docs/` - Developer/Maintainer Documentation**
- Architecture decision records (ADR)
- Deployment procedures
- CI/CD configuration guides
- Infrastructure documentation
- Maintenance procedures
- **Naming:** Organized by topic, lowercase-with-dashes.md

**`.wrangler/plans/` - Implementation Plans & Design Documents**
- Implementation plans created by `writing-plans` skill (OPTIONAL)
- Architecture overviews and design decisions
- Component relationships and system diagrams
- Design rationale and alternatives considered
- Cross-cutting concerns and patterns
- **Naming:** `YYYY-MM-DD-PLAN_<spec>.md` for implementation plans, `YYYY-MM-DD-<topic>-design.md` for design docs
- **Note:** Plan files are OPTIONAL - only create when architecture/design context needs documentation (10+ tasks, multiple components, significant design decisions). MCP issues are always the source of truth for implementation details.

**Examples:**

Creating root cause analysis:
```bash
# ❌ DON'T create at root
RCA-AUTH-FAILURE.md

# ✅ DO create in .wrangler/memos/
.wrangler/memos/2025-11-17-auth-failure-rca.md
```

Creating implementation summary:
```bash
# ❌ DON'T create at root
IMPLEMENTATION-SUMMARY-MCP.md

# ✅ DO create in .wrangler/memos/
.wrangler/memos/2024-10-29-mcp-integration-summary.md
```

Creating user documentation:
```bash
# ❌ DON'T create at root
USING-WORKFLOWS.md

# ✅ DO create in docs/
docs/using-workflows.md
```

Creating developer documentation:
```bash
# ❌ DON'T create at root
DEPLOYMENT-GUIDE.md

# ✅ DO create in devops/docs/
devops/docs/deployment-guide.md
```

Creating implementation plan:
```bash
# ❌ DON'T create at root
PLAN-AUTH-REFACTOR.md

# ✅ DO create in .wrangler/plans/ (only if needed for architecture context)
.wrangler/plans/2025-11-21-PLAN_auth-refactor.md
```

**When in doubt:**
- If it's wrangler-specific analysis → `.wrangler/memos/`
- If it's an implementation plan → `.wrangler/plans/` (but prefer MCP issues as source of truth)
- If users read it → `docs/`
- If only maintainers read it → `devops/docs/`
- If it's no longer relevant → Delete it

---

## Project Governance Framework

Wrangler implements a three-tier governance hierarchy to ensure consistency across all projects:

### Tier 1: Constitution (Immutable Principles)

**File**: `.wrangler/CONSTITUTION.md`

**Purpose**: Defines core design principles that guide all development decisions

**Structure**:
- Mission statement ("North Star")
- 5-12 core principles with practice examples and anti-patterns
- Decision framework (questions to evaluate features)
- Amendment process (how principles can evolve)

**Integration**:
- Referenced in CLAUDE.md as mandatory reading
- Checked via `wrangler:check-constitutional-alignment` skill
- Informs roadmap planning and issue creation

### Tier 2: Strategic Roadmap

**File**: `.wrangler/ROADMAP.md`

**Purpose**: Maps vision to execution timeline with phases

**Structure**:
- Current state (completed features)
- Phases (1-N) with timelines and goals
- Success metrics per phase
- Technical debt tracking
- Links to constitution for decision-making

**Updates**: Quarterly or upon phase completion

### Tier 3: Tactical Execution

**File**: `.wrangler/ROADMAP_NEXT_STEPS.md`

**Purpose**: Detailed implementation status and next actions

**Structure**:
- Executive summary (X% complete)
- Implementation completeness analysis (✅ ⚠️ ❌)
- Partially implemented features table
- Prioritized roadmap (🔴 🟡 🟢)
- Quick wins checklist

**Updates**: Weekly/daily as implementation progresses

### Directory Governance

Each governance directory (`issues/`, `specifications/`) contains:

**README.md** (minimal, 100-200 lines):
- Current status metrics
- Directory structure
- Workflow steps (reference skills)
- Link to comprehensive docs in `.wrangler/docs/`

**Templates**: Generated via skills, not embedded in README

**Validation**: Automated via `wrangler:verify-governance` skill

### Governance Workflow

```
Feature Request
    ↓
Constitutional Check (Does this align with principles?)
    ↓ (yes)
Phase Check (Which roadmap phase?)
    ↓
Specification Check (Spec exists or needs creation?)
    ↓
Issue Creation (Break into tasks)
    ↓
Implementation (Following skills/patterns)
    ↓
Testing (TDD enforced)
    ↓
Mark Complete (Update metrics)
    ↓
Update NEXT_STEPS (Track progress)
```

### Initialization

Run `/wrangler:initialize-governance` to create:
- `.wrangler/CONSTITUTION.md` (template)
- `.wrangler/ROADMAP.md` (template)
- `.wrangler/ROADMAP_NEXT_STEPS.md` (template)
- `.wrangler/issues/README.md` (minimal guidance)
- `.wrangler/specifications/README.md` (minimal guidance)
- `.wrangler/docs/governance.md` (comprehensive reference)

### Verification & Maintenance

**Automated checks** (on session start):
- Governance file existence
- Frontmatter validation
- Status-location consistency
- Broken link detection
- Metric staleness

**Manual commands**:
- `/wrangler:verify-governance` - Detailed validation report
- `/wrangler:refresh-metrics` - Update status counts
- `/wrangler:check-alignment` - Constitutional alignment check

### Best Practices

1. **Constitution is supreme law** - All features must align
2. **Start small** - 5-8 principles initially, evolve as needed
3. **Be specific** - "Functions ≤50 lines" not "clean code"
4. **Include anti-patterns** - Show what NOT to do
5. **Metrics auto-generated** - Skills update counts, don't manual edit
6. **README references skills** - Don't duplicate workflow logic
7. **Templates in wrangler** - Not project-specific
8. **Git tracks everything** - All governance files version-controlled

---

## MCP Server - Critical Information

### What It Does

The built-in MCP server provides **systematic issue and specification tracking** using markdown files stored in `issues/` and `specifications/` at the project root.

### Automatic Initialization

On session start, the `hooks/session-start.sh` script automatically:
1. Detects git repository root
2. Creates `issues/` directory at project root
3. Creates `specifications/` directory at project root
4. Adds `.gitkeep` files to track empty directories

**This happens automatically - no manual setup required.**

### Issue Storage Format

Issues are stored as **Markdown files with YAML frontmatter**:

**File naming**: `{counter}-{slug}.md` (e.g., `000001-add-authentication.md`)

**Example issue**:
```markdown
---
id: "000001"
title: "Implement authentication system"
type: "issue"                      # "issue" or "specification"
status: "open"                     # "open", "in_progress", "closed", "cancelled"
priority: "high"                   # "low", "medium", "high", "critical"
labels: ["backend", "security"]
assignee: "claude-code"
project: "Auth Refactor"
createdAt: "2024-10-29T10:00:00.000Z"
updatedAt: "2024-10-29T10:00:00.000Z"
wranglerContext:
  agentId: "claude-code"
  parentTaskId: "000000"
  estimatedEffort: "2 days"
---

## Description

Implement a secure authentication system using OAuth2...

### Requirements
- Support JWT tokens
- Rate limiting
```

### Available MCP Tools

When working with issues, you have access to these 11 tools:

1. **issues_create** - Create new issues or specifications
2. **issues_list** - List issues with filtering (status, priority, labels, etc.)
3. **issues_search** - Full-text search across title, description, labels
4. **issues_get** - Retrieve single issue by ID
5. **issues_update** - Update issue fields
6. **issues_delete** - Delete issues (requires confirmation)
7. **issues_labels** - Manage labels (list/add/remove)
8. **issues_metadata** - Manage wranglerContext metadata
9. **issues_projects** - Manage project assignments
10. **issues_mark_complete** - Mark issues as closed
11. **issues_all_complete** - Check completion status across issues

### When to Use Issues

**CREATE ISSUES WHEN:**
- Planning multi-step implementations
- Tracking bugs or technical debt
- Coordinating work across subagents
- Managing feature specifications
- Breaking down complex tasks

**DON'T CREATE ISSUES FOR:**
- Single, simple tasks
- Trivial changes
- Informational queries

---

## Git Hooks Enforcement Framework

### What It Does

The Git Hooks Enforcement Framework provides automated testing and code quality enforcement through Git hooks. It ensures code is tested, formatted, and linted before commits and pushes.

### Key Components

**3 Hooks:**
- `pre-commit` - Runs formatter, linter, unit tests before each commit
- `pre-push` - Runs full test suite before pushing to protected branches
- `commit-msg` - Validates commit message format (optional)

**2 Skills:**
- `setup-git-hooks` - Interactive hook configuration and installation
- `update-git-hooks` - Update existing hook configuration

**2 Slash Commands:**
- `/wrangler:setup-git-hooks` - Set up git hooks
- `/wrangler:update-git-hooks` - Update hook configuration

### Installation Patterns

**Pattern A (Default): Direct Installation**
- Hooks installed directly to `.git/hooks/`
- Configuration in `.wrangler/config/hooks-config.json`
- Best for individual developers

**Pattern B: Version-Controlled**
- Hooks stored in `.wrangler/config/git-hooks/`
- Symlinked via `scripts/install-hooks.sh`
- Best for teams wanting identical hooks

### Quick Start

```bash
# Run setup command
/wrangler:setup-git-hooks

# Follow interactive prompts

# Normal commit (hooks run automatically)
git commit -m "feat: add feature"
```

### Bypass Mechanism

For TDD RED phase or emergency fixes:

```bash
# Bypass for single command
WRANGLER_SKIP_HOOKS=1 git commit -m "WIP: failing test"
```

**Important**: This bypass is only available to humans. AI agents cannot set environment variables, ensuring they always face test enforcement.

### TDD Integration

| TDD Phase | Hook Behavior | What To Do |
|-----------|---------------|------------|
| RED | Pre-commit fails (expected) | Use bypass |
| GREEN | Pre-commit passes | Normal commit |
| REFACTOR | Pre-commit passes | Normal commit |

### Configuration

Configuration stored in `.wrangler/config/hooks-config.json`:

```json
{
  "testCommand": "npm test",
  "unitTestCommand": "npm run test:unit",
  "formatCommand": "npm run format",
  "lintCommand": "npm run lint",
  "protectedBranches": ["main", "master", "develop"],
  "skipDocsOnlyChanges": true
}
```

### File Locations

- `.wrangler/config/hooks-config.json` - Hook configuration
- `.wrangler/TESTING.md` - Test documentation
- `.git/hooks/pre-commit` - Pre-commit hook
- `.git/hooks/pre-push` - Pre-push hook
- `.git/hooks/commit-msg` - Commit-msg hook (optional)

### Documentation

See [docs/git-hooks.md](docs/git-hooks.md) for comprehensive documentation.

---

## Figma Design Workflow

### What It Does

The Figma integration bridges the design-implementation gap by providing systematic design workflows:
1. **Design System Setup** - Initialize design systems from templates or custom Q&A
2. **Mockup Generation** - Create Figma mockups from specifications
3. **Design Governance** - Track token drift between Figma and code

### Key Components

**3 Skills:**
- `design-system-setup` - Initialize design systems (3 templates: minimal, modern, vibrant)
- `figma-design-workflow` - Generate mockups from specs with hierarchical file structure
- `design-system-governance` - Detect drift, create issues (report-only, no auto-fix)

**3 Templates:**
- **Minimal**: 9 colors, 5 font sizes, 4 components
- **Modern**: 61 colors, 9 sizes, 20+ components (recommended default)
- **Vibrant**: 44 colors, bold typography, playful aesthetic

**3 Slash Commands:**
- `/wrangler:setup-design-system` - Initialize design system
- `/wrangler:generate-figma-mocks` - Create mockups from spec
- `/wrangler:check-design-drift` - Audit token drift

### Prerequisites

**Required:**
- Figma account (free tier sufficient)
- `FIGMA_ACCESS_TOKEN` environment variable
  - Get token: https://www.figma.com/developers/api#access-tokens
  - Add to environment: `export FIGMA_ACCESS_TOKEN=your-token-here`

**Optional:**
- Organization/Enterprise Figma plan for Code Connect features

### Quick Start

1. **Set up design system:**
   ```
   /wrangler:setup-design-system
   ```
   Choose template or custom Q&A workflow

2. **Generate mockups from spec:**
   ```
   /wrangler:generate-figma-mocks
   ```
   Provide spec ID or let agent infer from context

3. **Check for drift:**
   ```
   /wrangler:check-design-drift
   ```
   Creates issues for any detected drift

### Metadata Storage

Design system metadata stored in wrangler issues/specs:
- `figmaFileUrl` - URL to Figma design system file
- `figmaFileKey` - Figma file key
- `figmaFrameUrls` - Map of page names to frame URLs
- `approvalStatus` - pending_review | approved | rejected
- `verificationBaseline` - true for approved mocks

### Token Export Formats

**CSS Variables:**
```css
:root {
  --color-primary: #3B82F6;
  --spacing-md: 1rem;
}
```

**Tailwind Config:**
```js
module.exports = {
  theme: {
    extend: {
      colors: { primary: '#3B82F6' },
      spacing: { md: '1rem' }
    }
  }
}
```

**Design Tokens JSON (W3C):**
```json
{
  "color": {
    "primary": { "$value": "#3B82F6", "$type": "color" }
  }
}
```

### Workflow Integration

**Typical flow:**
1. User creates specification → agent detects no design system
2. Agent prompts: setup-design-system skill
3. User creates UI spec → agent runs figma-design-workflow
4. User reviews mockups in Figma, approves
5. Agent implements with design context
6. Periodic governance checks detect drift

### Future Enhancements

- Visual regression testing (pixel-perfect verification)
- Automated mock refinement
- Design system versioning
- Component usage analytics

---

## Quality Assurance & Compliance

### Session Adherence Validation

**Purpose**: Validate whether AI agent followed wrangler's workflows and skill guidelines during a session.

**Command**: `/wrangler:validate-session-adherence`

**What It Does**:
- Analyzes last 30-50 messages of conversation
- Validates skill invocation compliance
- Checks workflow step compliance (TDD, verification, code review)
- Verifies evidence requirements were met
- Detects violations with severity ratings
- Generates comprehensive compliance report

**When to Use**:
- After completing complex implementations
- When suspicious that processes weren't followed
- Before claiming work is production-ready
- As part of code review process
- For "trust but verify" workflow validation

**Example Usage**:

```bash
# General audit
/wrangler:validate-session-adherence

# Focused audit
/wrangler:validate-session-adherence I don't think TDD was actually followed

# Check specific concern
/wrangler:validate-session-adherence Did code review happen for all changes?
```

**What It Validates**:

1. **Skill Invocation Compliance**
   - Were appropriate skills used for each task?
   - Which skills were announced vs expected?
   - Missing skill invocations

2. **TDD Compliance**
   - Tests written FIRST?
   - RED phase verified (test failed)?
   - GREEN phase verified (test passed)?
   - TDD Compliance Certification provided?

3. **Verification Compliance**
   - Evidence provided for claims?
   - Complete command output shown?
   - Requirements verified?

4. **Code Review Compliance**
   - Code review obtained for all changes?
   - Valid exceptions documented?
   - Critical/Important issues fixed?

5. **Subagent Usage**
   - Subagents used when required?
   - Subagent results verified independently?

**Output**: Structured compliance report with:
- Overall compliance score (PASS/PARTIAL/FAIL)
- Violation count by severity (Critical/High/Medium/Low)
- Specific violations with evidence (message references)
- Systemic pattern analysis
- Actionable recommendations
- Trust level assessment

**Comparison with Gap Analysis**:

`/wrangler:analyze-session-gaps` asks:
- What CAPABILITY is missing?
- What SKILL should exist?
- What GAP prevents success?

`/wrangler:validate-session-adherence` asks:
- Was the RIGHT SKILL used?
- Were WORKFLOW STEPS followed?
- Was EVIDENCE provided?
- Did COMPLIANCE occur?

**Documentation**:
- Command: `commands/validate-session-adherence.md`
- Workflows: `docs/workflows.md`
- Verification Requirements: `docs/verification-requirements.md`
- Skill Patterns: `docs/skill-invocation-patterns.md`

---

## Development Workflow

### Test-Driven Development (MANDATORY)

**All code MUST follow TDD**:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Improve code quality

**Testing commands**:
```bash
npm run test:mcp              # Run all MCP tests
npm run build:mcp             # Build MCP server
npm run watch:mcp             # Watch mode for development
```

**Current test status**: 233 tests, all passing, 87.11% coverage

### Working with MCP Code

**Location**: All MCP code is in `mcp/` directory

**TypeScript compilation**:
- Source: `mcp/**/*.ts`
- Output: `mcp/dist/**/*.js`
- Config: `mcp/tsconfig.json`

**Adding new tools**:
1. Create tool file in `mcp/tools/issues/{name}.ts`
2. Write comprehensive tests FIRST in `mcp/__tests__/tools/issues/{name}.test.ts`
3. Implement Zod schema for validation
4. Implement tool function returning MCP-compliant response
5. Register in `mcp/server.ts` switch statement
6. Add to `getAvailableTools()` list
7. Export from `mcp/tools/issues/index.ts`

**Tool implementation pattern**:
```typescript
// 1. Zod schema
export const myToolSchema = z.object({
  param: z.string().min(1)
});

// 2. Type
export type MyToolParams = z.infer<typeof myToolSchema>;

// 3. Tool function
export async function myTool(
  params: MyToolParams,
  providerFactory: ProviderFactory
): Promise<CallToolResult> {
  try {
    const provider = providerFactory.getIssueProvider();
    // ... implementation
    return createSuccessResponse(message, metadata);
  } catch (error) {
    return createErrorResponse(MCPErrorCode.TOOL_EXECUTION_ERROR, error.message);
  }
}
```

### Working with Skills

**Location**: All skills are in `skills/` directory

**Skill structure**:
```
skills/{category}/{skill-name}/
├── SKILL.md                   # Skill content (markdown)
└── example.ts                 # Optional usage example
```

**Creating new skills**: Follow the `skills/meta/writing-skills/SKILL.md` guide

### Skill Naming Conventions

**Standard**: All skills use gerund form (verb + -ing)

**Rationale**: Anthropic 2026 standard for consistency and discoverability

**Examples**:
- ✅ `writing-skills` (gerund)
- ✅ `practicing-tdd` (gerund)
- ✅ `reviewing-code` (gerund)
- ❌ `test-driven-development` (noun phrase)
- ❌ `code-review` (noun)
- ❌ `create-issue` (imperative verb)

**Requirements**:
- Directory name matches frontmatter `name` field
- Use lowercase-with-dashes format
- Present continuous tense (verb + -ing)

### Token Efficiency Guidelines

**Principle**: "The context window is a public good"

**Skill File Size Limits**:
- SKILL.md body: <500 lines (target: 300-400 lines)
- Getting-started workflows: <150 words
- Frequently-used skills: <200 words total
- Complex skills: <500 words main content, rest in `references/`

**Progressive Disclosure**:
- Skills >500 lines MUST use progressive disclosure
- Heavy content moves to `references/` subdirectory
- SKILL.md explicitly references supporting files

**Verbosity Reduction**:
- Only add context Claude doesn't have
- Challenge each paragraph: "Does this justify its token cost?"
- Assume Claude knows common concepts
- Focus on unique skill-specific guidance

---

## Code Standards

### TypeScript

- **Strict mode**: Enabled
- **Target**: ES2022
- **Module**: Node16 (ESM)
- **All types must be explicit**
- **Use Zod for runtime validation**

### Testing

- **Framework**: Jest with ts-jest
- **Coverage requirement**: 80%+ (currently at 87%)
- **Test location**: `mcp/__tests__/`
- **Pattern**: `**/*.test.ts`

### Error Handling

**Always use MCPErrorCode enum**:
- `VALIDATION_ERROR` - Zod validation failures
- `RESOURCE_NOT_FOUND` - Missing issues/files
- `PERMISSION_DENIED` - Access denied
- `TOOL_EXECUTION_ERROR` - General tool errors
- `PATH_TRAVERSAL_DENIED` - Security violation

**Error response format**:
```typescript
return createErrorResponse(
  MCPErrorCode.VALIDATION_ERROR,
  "Clear error message",
  { context: additionalInfo }
);
```

### Security

**Path traversal prevention is MANDATORY**:
```typescript
private assertWithinWorkspace(targetPath: string, action: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(this.basePath, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Attempted to ${action} outside of workspace`);
  }
}
```

**Always validate paths before file operations.**

---

## Common Tasks

### Running Tests

```bash
# All tests
npm run test:mcp

# Watch mode
npm run test:mcp -- --watch

# Coverage report
npm run test:mcp -- --coverage

# Specific test file
npm run test:mcp -- mcp/__tests__/server.test.ts
```

### Building

```bash
# Build MCP server
npm run build:mcp

# Watch mode (auto-rebuild on changes)
npm run watch:mcp

# Clean build
rm -rf mcp/dist && npm run build:mcp
```

### Debugging MCP Server

```bash
# Enable debug mode
WRANGLER_MCP_DEBUG=true npm run mcp:dev

# Debug output will show:
# - Tool invocations with parameters
# - Execution results
# - Error stack traces
# - Server lifecycle events
```

### Creating Issues Programmatically

```typescript
// Example: Create issue via MCP tool
const result = await createIssueTool({
  title: "Implement new feature",
  description: "Detailed description...",
  type: "issue",
  status: "open",
  priority: "high",
  labels: ["backend", "api"],
  project: "Q4 Roadmap",
  wranglerContext: {
    agentId: "implementation-agent",
    estimatedEffort: "2 days"
  }
}, providerFactory);
```

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

### General

- **No workflow engine** - Unlike wingman, wrangler doesn't have workflow automation
- **Markdown-only provider** - GitHub/Linear backends not yet implemented
- **No issue templates** - Future enhancement

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
npm run build:mcp              # Build MCP server
npm run test:mcp               # Run all tests
npm run watch:mcp              # Watch mode
npm run mcp:dev                # Debug mode
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

## Documentation Resources

### For Users

- **[README.md](README.md)** - Quick start and overview
- **[docs/MCP-USAGE.md](docs/MCP-USAGE.md)** - Comprehensive MCP usage guide
  - Getting started
  - All 16 tools with examples
  - Workflows and best practices
  - Troubleshooting
- **[docs/GOVERNANCE.md](docs/GOVERNANCE.md)** - Governance framework guide
  - Constitutional principles
  - Strategic roadmap planning
  - Tactical execution tracking
  - Ideas and proposals workflow
- **[docs/SESSION-HOOKS.md](docs/SESSION-HOOKS.md)** - Session hooks system
  - Automatic workspace initialization
  - Context injection mechanism
  - State management across sessions
  - Hook configuration and troubleshooting
- **[docs/VERSIONING.md](docs/VERSIONING.md)** - Versioning and updates
  - Version tracking in constitution
  - Automatic version detection
  - Breaking changes and migration
  - `/update-yourself` command workflow
- **[docs/SLASH-COMMANDS.md](docs/SLASH-COMMANDS.md)** - Slash commands reference
  - All available commands with examples
  - Creating custom commands
  - Command best practices
  - Troubleshooting guide
- **[docs/git-hooks.md](docs/git-hooks.md)** - Git hooks enforcement framework
  - Pre-commit, pre-push, commit-msg hooks
  - Configuration and installation patterns
  - Bypass mechanism and TDD integration
  - Troubleshooting guide
- **[docs/workflows.md](docs/workflows.md)** - Major workflows guide
  - TDD workflow (RED-GREEN-REFACTOR)
  - Verification workflow (evidence requirements)
  - Code review workflow
  - Subagent dispatch workflow
  - Implementation planning workflow
  - Constitutional alignment workflow
- **[docs/verification-requirements.md](docs/verification-requirements.md)** - Evidence requirements
  - Test verification requirements
  - TDD evidence requirements
  - Build verification requirements
  - Code review requirements
  - Frontend verification requirements
  - Performance/security verification
- **[docs/skill-invocation-patterns.md](docs/skill-invocation-patterns.md)** - Skill invocation patterns
  - Task pattern → skill mapping
  - Keyword → skill mapping
  - File pattern → skill mapping
  - Always-required skills
  - Context-triggered skills
  - Compliance validation guide

### For Developers

- **[mcp/README.md](mcp/README.md)** - Technical implementation guide
  - Architecture overview
  - Component descriptions
  - TDD development guide
  - Testing guide
  - API reference

### Implementation Documentation

- **[SPEC-WRANGLER-MCP-INTEGRATION.md](SPEC-WRANGLER-MCP-INTEGRATION.md)** - Original specification
- **[IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)** - Detailed implementation report
- **[mcp/__tests__/INTEGRATION_TEST_REPORT.md](mcp/__tests__/INTEGRATION_TEST_REPORT.md)** - Test results

---

## Contact & Support

**Project Owner**: Sam Hecht (samjhecht@gmail.com)
**License**: MIT
**Repository**: wrangler-marketplace/wrangler

---

## Version History

### v1.2.0 (December 7, 2025)

**Centralized .wrangler/ Directory**:
- ✅ Centralized `.wrangler/` directory structure for all governance files
- ✅ Constitution at `.wrangler/CONSTITUTION.md` (top-level, not in subdirectory)
- ✅ 11 issue management MCP tools
- ✅ 47 skills (expanded from 39)
- ✅ Versioning system with wranglerVersion in constitution frontmatter
- ✅ Release notes tracking in `skills/.wrangler-releases/`
- ✅ Startup version check skill (SUCCESS/WARN/OUTDATED signals)
- ✅ `/update-yourself` command for LLM-driven migrations
- ✅ Comprehensive documentation suite:
  - Session hooks and state management
  - Versioning and update workflows
  - Slash commands reference
  - Governance framework guide

### v1.0.0 (October 29, 2024)

**Initial Release**:
- ✅ Skills library (testing, debugging, collaboration, meta)
- ✅ Built-in MCP server with 11 issue management tools
- ✅ Automatic workspace initialization
- ✅ Markdown-based issue storage
- ✅ 233 comprehensive tests (87.11% coverage)
- ✅ Complete documentation suite

---

## Quick Start for New Agents

1. **Understand the dual nature**: Wrangler is both a skills library AND an MCP server
2. **Check if .wrangler/ exists**: If not, it will be created automatically on session start
3. **Use issues for planning**: Create issues for complex, multi-step work
4. **Follow TDD strictly**: Write tests first, always
5. **Consult skills**: Check `skills/` directory for relevant workflows
6. **Read the docs**: Start with `docs/MCP-USAGE.md` for MCP features

---

**Last Updated**: December 7, 2025
**Document Version**: 1.2.0
