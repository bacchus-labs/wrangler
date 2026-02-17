---
id: "SPEC-IDWF-V2"
title: "Integrated Development Workflow v2 - Draft-First PRs, Automated Reviews, and Unified Implementation"
type: "specification"
status: "closed"
priority: "high"
labels: ["specification", "workflow", "github", "automation", "configuration"]
assignee: ""
project: "Wrangler v1.3.0"
createdAt: "2026-01-18T00:00:00.000Z"
updatedAt: "2026-01-18T00:00:00.000Z"
wranglerContext:
  agentId: "spec-writer"
  parentTaskId: ""
  estimatedEffort: "4-6 weeks"
---

# Specification: Integrated Development Workflow v2

## Executive Summary

**What:** A comprehensive overhaul of wrangler's implementation workflow that introduces draft-first PR creation, automated GitHub-based code review, a unified "implement it" command that routes intelligently, a layered configuration system, and a template override mechanism.

**Why:** Current wrangler workflows require too much manual prompting for common steps (running tests, using worktrees, creating PRs). The implementation flow is fragmented across multiple skills without clear orchestration. There's no automated code review integration, and settings can't be customized per-project without modifying skill files.

**Scope:**

- **Included:** Draft-first PR pattern, GitHub Actions for automated review, unified implement command, layered config system, template overrides, PR summary templates with progress tracking
- **Excluded:** Enterprise SSO integration, visual regression testing, automated fix application (human reviews fixes initially), Figma design system changes

## Goals and Non-Goals

### Goals

1. **Reduce repetitive prompting** - User says "implement it" and the right workflow runs without specifying worktrees, tests, PRs each time
2. **Draft-first PR pattern** - Create draft PR at start of implementation, incrementally update as work progresses
3. **Automated code review** - GitHub Actions trigger Claude-based code review on PR events, findings appear as PR comments
4. **Unified implementation entry point** - Single command handles specs (with/without plans), issues, and issue ranges
5. **Project-customizable settings** - Toggle worktree mode, auto-PR creation, test requirements via config file
6. **Template override system** - Users can customize PR summaries, issue templates in their .wrangler/ directory
7. **Full auditability** - All reviews, test runs, and status changes visible in GitHub PR interface

### Non-Goals

- **Automated fix application** - Code review identifies issues; human decides when to fix (future enhancement)
- **Per-commit review** - For simplicity, review runs at end of implementation, not per-commit (future enhancement)
- **Complex workflow engine** - Not building a general-purpose workflow automation system
- **Breaking changes to existing skills** - Must maintain backward compatibility

## Background & Context

### Problem Statement

Current pain points:

1. User must repeatedly prompt for steps: "run the tests", "use a worktree", "create a PR", "do code review"
2. No clear orchestration between planning, implementing, reviewing, and completing work
3. PR creation happens at end, missing opportunity for incremental progress tracking
4. Code review happens ad-hoc, not systematically integrated with GitHub
5. Can't toggle features (worktree mode) without editing skill files
6. Template customization requires forking/modifying wrangler itself

### Current State

```
User: "implement SPEC-000041"
  │
  ├─→ Agent asks: "worktree or main branch?"
  ├─→ Agent implements
  ├─→ User prompts: "run tests"
  ├─→ User prompts: "create PR"
  ├─→ User prompts: "do code review"
  └─→ Multiple back-and-forth exchanges
```

### Proposed State

```
User: "implement it" (referring to spec/issue in context)
  │
  ├─→ Auto-detect: spec without issues? Run planning first
  ├─→ Read config: worktree enabled? Create worktree
  ├─→ Create draft PR immediately
  ├─→ Implement each issue, updating PR summary
  ├─→ Run tests (per config requirements)
  ├─→ GitHub Action triggers code review
  ├─→ Review findings appear as PR comments
  ├─→ Toggle PR from draft to ready
  └─→ Notify user: "PR ready for your review"
```

## Requirements

### Functional Requirements

#### FR-100: Unified Implement Command

- **FR-101:** System MUST detect context when user says "implement it" without explicit reference
- **FR-102:** System MUST route to appropriate workflow based on artifact type:
  - Specification without issues → invoke writing-plans, then implement
  - Specification with issues → implement existing issues
  - Single issue → implement directly
  - Issue range → implement all issues
- **FR-103:** Context detection MUST complete in <2 seconds
- **FR-104:** System MUST announce routing decision to user before proceeding

#### FR-200: Draft-First PR Pattern

- **FR-201:** System MUST create draft PR at start of implementation (after first commit)
- **FR-202:** PR title MUST follow template: \`[Draft] {spec/issue title}\`
- **FR-203:** PR body MUST use template from config resolution (project override or built-in)
- **FR-204:** For spec PRs, body MUST include progress table listing all sub-issues
- **FR-205:** System MUST update PR body as each sub-issue completes
- **FR-206:** PR body MUST include "Tests Run" section confirming local test execution
- **FR-207:** System MUST toggle PR from draft to ready when implementation complete

#### FR-300: GitHub-Based Code Review

- **FR-301:** GitHub Action MUST trigger on PR events: opened, synchronize, ready_for_review
- **FR-302:** Action MUST invoke Claude API with code review skill prompt
- **FR-303:** Review findings MUST be posted as PR review comments
- **FR-304:** Findings MUST be categorized: Critical, Important, Minor
- **FR-305:** System MUST check for spec/plan compliance if applicable
- **FR-306:** Action MUST respect rate limits and API quotas

#### FR-400: Configuration System

- **FR-401:** System MUST read settings from \`.wrangler/config/settings.json\`
- **FR-402:** Configuration hierarchy MUST be: user settings > team settings > defaults
- **FR-403:** Settings MUST include:
  - \`workflows.worktreeMode.enabled\` (boolean, default: true)
  - \`workflows.prCreation.autoCreate\` (boolean, default: true)
  - \`workflows.prCreation.draftFirst\` (boolean, default: true)
  - \`workflows.codeReview.required\` (boolean, default: true)
  - \`testing.autoRunAfterImplementation\` (boolean, default: true)
- **FR-404:** Skills MUST read config with <1ms overhead (cache at skill start)
- **FR-405:** Missing config MUST fall back to built-in defaults gracefully

#### FR-500: Template Override System

- **FR-501:** System MUST resolve templates in order: project (.wrangler/templates/) → plugin (skills/\*/templates/)
- **FR-502:** PR summary template MUST be customizable
- **FR-503:** Issue templates MUST be customizable
- **FR-504:** System MUST provide command to copy built-in template for customization
- **FR-505:** Templates MUST support placeholder substitution syntax: \`{PLACEHOLDER_NAME}\`

### Non-Functional Requirements

- **Performance:** Config reads MUST complete in <1ms (use caching)
- **Performance:** Context detection MUST complete in <2s
- **Reliability:** GitHub Action MUST handle API failures gracefully (retry with backoff)
- **Reliability:** Workflow MUST continue if code review action fails (not blocking)
- **Maintainability:** Skills MUST not duplicate config-reading logic (use standard pattern)
- **Backward Compatibility:** Existing workflows MUST continue working without config file

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User: "implement it"                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Unified Implement Router                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Context   │→ │    Type     │→ │   Config    │→ │   Route     │ │
│  │  Detection  │  │  Detection  │  │   Loading   │  │  Decision   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │ Spec without  │       │  Spec with    │       │    Issue(s)   │
    │    issues     │       │    issues     │       │               │
    └───────────────┘       └───────────────┘       └───────────────┘
            │                       │                       │
            ▼                       │                       │
    ┌───────────────┐               │                       │
    │ writing-plans │               │                       │
    │     skill     │               │                       │
    └───────────────┘               │                       │
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Implementation Orchestrator                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Worktree   │→ │  Draft PR   │→ │  Implement  │→ │    Tests    │ │
│  │  (if cfg)   │  │   Create    │  │   Issues    │  │  (if cfg)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                          │                │                         │
│                          ▼                ▼                         │
│                   ┌─────────────┐  ┌─────────────┐                  │
│                   │  Update PR  │← │  Per-Issue  │                  │
│                   │   Summary   │  │  Completion │                  │
│                   └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       GitHub Integration                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Push     │→ │   GitHub    │→ │    Code     │→ │   Post      │ │
│  │   Commit    │  │   Action    │  │   Review    │  │  Comments   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                             │       │
│                   ┌─────────────┐                           │       │
│                   │  PR Ready   │←──────────────────────────┘       │
│                   │  for Review │                                   │
│                   └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### Component 1: Unified Implement Router

**Responsibility:** Detect context, determine artifact type, load config, route to appropriate workflow

**Interfaces:**

- Input: User message ("implement it", "implement SPEC-000041", "implement issue 42")
- Output: Routing decision with scope and config

**Dependencies:**

- MCP issues_get, issues_list tools
- Config file reader
- Conversation context

**Key behaviors:**

- Scan last 5 messages for artifact references
- Call MCP to determine type (spec vs issue)
- For specs, check if issues exist
- Load user config, merge with defaults
- Announce routing decision

#### Component 2: Implementation Orchestrator

**Responsibility:** Execute implementation with draft-first PR, progress tracking, test execution

**Interfaces:**

- Input: Routing decision, scope, config
- Output: Completed implementation with PR

**Dependencies:**

- Git/gh CLI
- Test runner
- Template resolver

**Key behaviors:**

- Create worktree if enabled
- Create draft PR after first commit
- Implement each issue sequentially
- Update PR summary after each issue
- Run tests after implementation
- Update PR to ready for review

#### Component 3: GitHub Action - Code Review

**Responsibility:** Trigger Claude-based code review on PR events, post findings

**Interfaces:**

- Input: PR webhook event (opened, synchronize, ready_for_review)
- Output: PR review comments

**Dependencies:**

- Anthropic API (Claude)
- GitHub API (review comments)

**Key behaviors:**

- Fetch PR diff
- Construct code review prompt (following wrangler code-review skill)
- Call Claude API
- Parse structured review output
- Post findings as review comments with severity labels

#### Component 4: Configuration System

**Responsibility:** Provide layered configuration with caching

**File Structure:**

```
.wrangler/config/
├── settings.json           # User-specific (gitignored)
├── team-settings.json      # Team defaults (git-tracked)
└── settings.schema.json    # JSON Schema for validation
```

**Key behaviors:**

- Read config at skill start (once)
- Merge: user > team > defaults
- Cache in shell environment variables
- Provide default if file missing

#### Component 5: Template Resolver

**Responsibility:** Resolve templates with project-override priority

**Resolution Order:**

1. \`.wrangler/templates/{template-name}\`
2. \`skills/{skill-name}/templates/{template-name}\`

**Key behaviors:**

- Check project override first
- Fall back to built-in
- Substitute placeholders
- Return rendered content

### Data Model

#### Entity: Configuration Settings

```json
{
  "$schema": ".wrangler/config/settings.schema.json",
  "version": "1.0",
  "workflows": {
    "worktreeMode": {
      "enabled": true,
      "defaultLocation": ".worktrees"
    },
    "prCreation": {
      "autoCreate": true,
      "draftFirst": true,
      "template": "default"
    },
    "codeReview": {
      "required": true,
      "autoRequest": true
    }
  },
  "testing": {
    "autoRunAfterImplementation": true,
    "failFast": false
  }
}
```

#### Entity: PR Summary Template

```markdown
## Summary

{SUMMARY}

## Implementation Progress

| Issue | Title | Status |
| ----- | ----- | ------ |

{ISSUE_TABLE}

## Test Results

- **Tests Run:** {TESTS_RUN}
- **Status:** {TEST_STATUS}
- **Command:** \`{TEST_COMMAND}\`

## Changes Made

{CHANGES}

## Verification

- [ ] All tests pass locally
- [ ] Code review completed
- [ ] Spec compliance verified

---

Generated with Claude Code and Wrangler
```

## Implementation Details

### Technology Stack

- **Skills:** Markdown-based skill definitions
- **Config:** JSON with JSON Schema validation
- **Templates:** Markdown with placeholder substitution
- **GitHub Integration:** GitHub Actions, gh CLI, GitHub API
- **AI Provider:** Anthropic Claude API

### File Structure

```
wrangler/
├── .wrangler/
│   ├── config/
│   │   ├── settings.json           # User settings (gitignored)
│   │   ├── team-settings.json      # Team settings (tracked)
│   │   └── settings.schema.json    # Validation schema
│   └── templates/                  # Project template overrides
│       ├── pr-summary.md
│       └── issue.md
│
├── skills/
│   ├── implement/                  # Enhanced unified implement
│   │   ├── SKILL.md
│   │   └── templates/
│   │       └── pr-summary.md       # Default PR template
│   │
│   ├── reading-config/             # New: config reading helper
│   │   └── SKILL.md
│   │
│   └── finishing-a-development-branch/
│       └── templates/
│           └── pr-summary.md
│
├── .github/
│   └── workflows/
│       └── wrangler-code-review.yml  # GitHub Action template
│
└── commands/
    ├── implement.md                  # Updated slash command
    └── copy-template.md              # New: template copying
```

### GitHub Action: Code Review

```yaml
# .github/workflows/wrangler-code-review.yml
name: Wrangler Code Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

jobs:
  code-review:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false || github.event.action == 'ready_for_review'
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR diff
        id: diff
        run: |
          git diff origin/${{ github.base_ref }}...${{ github.sha }} > pr.diff
          echo "DIFF_SIZE=$(wc -c < pr.diff)" >> $GITHUB_OUTPUT

      - name: Run Claude Code Review
        if: steps.diff.outputs.DIFF_SIZE > 0
        uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          model: "claude-sonnet-4-5-20250514"
          direct_prompt: |
            You are a code reviewer following the wrangler code-review skill.

            ## Review Framework

            Analyze this PR using these phases:
            1. **Plan Alignment** - Does implementation match requirements?
            2. **Code Quality** - Clean, maintainable, follows patterns?
            3. **Architecture** - Appropriate design, no over-engineering?
            4. **Testing/TDD** - Tests written first? Adequate coverage?
            5. **Security/Performance** - Any vulnerabilities? Performance issues?
            6. **Documentation** - Comments where needed?

            ## Output Format

            Categorize findings:
            - **CRITICAL** - Must fix before merge
            - **IMPORTANT** - Should fix, discuss if not
            - **MINOR** - Nice to have, optional

            For each finding:
            - File and line number
            - Issue description
            - Suggested fix

            ## PR Context

            Title: ${{ github.event.pull_request.title }}

            ## Diff

            $(cat pr.diff | head -5000)

      - name: Handle large diffs
        if: steps.diff.outputs.DIFF_SIZE > 100000
        run: |
          gh pr comment ${{ github.event.pull_request.number }} --body "PR diff is too large for automated review. Please request manual review."
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Configuration Reading Pattern

Skills read config using this standard pattern:

```bash
# At skill start - read once, cache in env vars
if [ -f .wrangler/config/settings.json ]; then
  export WRANGLER_WORKTREE_MODE=$(jq -r '.workflows.worktreeMode.enabled // true' .wrangler/config/settings.json)
  export WRANGLER_AUTO_PR=$(jq -r '.workflows.prCreation.autoCreate // true' .wrangler/config/settings.json)
  export WRANGLER_DRAFT_FIRST=$(jq -r '.workflows.prCreation.draftFirst // true' .wrangler/config/settings.json)
  export WRANGLER_CODE_REVIEW_REQUIRED=$(jq -r '.workflows.codeReview.required // true' .wrangler/config/settings.json)
  export WRANGLER_AUTO_TEST=$(jq -r '.testing.autoRunAfterImplementation // true' .wrangler/config/settings.json)
else
  # Defaults
  export WRANGLER_WORKTREE_MODE=true
  export WRANGLER_AUTO_PR=true
  export WRANGLER_DRAFT_FIRST=true
  export WRANGLER_CODE_REVIEW_REQUIRED=true
  export WRANGLER_AUTO_TEST=true
fi
```

### Template Resolution Pattern

```markdown
## Load PR Summary Template

1. Check for project override:
   \`\`\`bash
   if [ -f .wrangler/templates/pr-summary.md ]; then
   TEMPLATE=$(cat .wrangler/templates/pr-summary.md)
   else
     TEMPLATE=$(cat ${CLAUDE_PLUGIN_ROOT}/skills/implement/templates/pr-summary.md)
   fi
   \`\`\`

2. Substitute placeholders:
   - {SUMMARY} → Generated from commit messages
   - {ISSUE_TABLE} → Built from issue list
   - {TEST_STATUS} → From test run output
   - {CHANGES} → From git diff summary
```

### Unified Implement Routing Logic

```markdown
## Scope Detection Algorithm

1. **Parse explicit reference** (if provided)
   - "SPEC-000041" → specification
   - "issue 42" or "#42" → single issue
   - "issues 5-7" → issue range

2. **Infer from context** (if no explicit reference)
   - Scan last 5 user messages
   - Look for spec/issue references
   - Use most recent match

3. **Determine artifact type via MCP**
   \`\`\`
   issues_get({ id: detected_ref })
   → Check frontmatter.type: "specification" | "issue"
   \`\`\`

4. **For specifications, check implementation readiness**
   \`\`\`
   issues_list({ project: spec.id, type: "issue" })
   → If 0 issues: needs planning
   → If >0 issues: ready to implement
   \`\`\`

5. **Route based on detection**
   - Spec without issues → writing-plans skill → implement skill
   - Spec with issues → implement skill (scope = linked issues)
   - Issue(s) → implement skill (scope = specified issues)
```

## Testing Strategy

### Test Coverage

- **Unit Tests:** Config parsing, template resolution, routing logic
- **Integration Tests:** Full workflow from "implement it" to PR creation
- **E2E Tests:** GitHub Action triggering and comment posting
- **Manual Tests:** User experience validation

### Test Scenarios

1. **Happy Path - Spec with issues:**
   - User says "implement SPEC-000041"
   - Spec has 3 linked issues
   - Draft PR created, issues implemented, tests run, PR ready

2. **Happy Path - Spec without issues:**
   - User says "implement SPEC-000042"
   - Spec has no issues
   - Planning runs first, then implementation

3. **Happy Path - Single issue:**
   - User says "implement issue 5"
   - Single issue implemented, PR created

4. **Config Override - Worktree disabled:**
   - Config has worktreeMode.enabled = false
   - Implementation happens in current branch

5. **Template Override:**
   - Project has custom .wrangler/templates/pr-summary.md
   - Custom template used for PR body

6. **GitHub Action - Large diff:**
   - PR diff > 100KB
   - Action posts warning instead of full review

7. **Error Recovery:**
   - Code review action fails
   - Implementation continues (not blocking)

## Open Questions & Decisions

### Resolved Decisions

| Decision         | Options Considered           | Chosen             | Rationale                                         |
| ---------------- | ---------------------------- | ------------------ | ------------------------------------------------- |
| Config format    | YAML, JSON, TOML             | JSON               | JSON Schema validation, jq parsing, no extra deps |
| Template syntax  | Mustache, Handlebars, Simple | Simple ({NAME})    | Minimal complexity, easy to understand            |
| Review timing    | Per-commit, End of impl      | End of impl        | Simpler initial implementation                    |
| Action framework | Custom, claude-code-action   | claude-code-action | Official Anthropic support                        |

### Open Questions

- [ ] **Q1:** Should we provide a wrangler init command that sets up the GitHub Action?
  - **Impact:** Affects ease of adoption
  - **Options:** Copy workflow file, guide user through setup, automated PR to add file
  - **Owner:** Implementation team

- [ ] **Q2:** How to handle multi-spec PRs (implementing multiple specs in one PR)?
  - **Impact:** Affects PR summary template structure
  - **Options:** One PR per spec (enforce), allow multi-spec (complex tracking)
  - **Owner:** Product decision

- [ ] **Q3:** Should config support project-level overrides via CLAUDE.md?
  - **Impact:** Alternative config location
  - **Options:** JSON only, support CLAUDE.md directives, both
  - **Owner:** Architecture decision

## Risks & Mitigations

| Risk                                  | Probability | Impact | Mitigation                                         |
| ------------------------------------- | ----------- | ------ | -------------------------------------------------- |
| GitHub Action API rate limits         | Medium      | Medium | Batch comments, cache results, exponential backoff |
| Large PR diffs exceed Claude context  | Medium      | High   | Truncate diff, split review by file, warn user     |
| User forgets to set ANTHROPIC_API_KEY | High        | Medium | Clear error message, setup documentation           |
| Config breaking changes               | Low         | High   | Versioned schema, migration path                   |
| Template placeholder conflicts        | Low         | Low    | Use distinctive syntax {WRANGLER\_\*}              |

## Success Criteria

### Launch Criteria

- [ ] Unified implement command routes correctly for all artifact types
- [ ] Draft-first PR pattern working with progress updates
- [ ] GitHub Action template provided and documented
- [ ] Config system working with defaults fallback
- [ ] Template override system working
- [ ] All existing workflows still function (backward compatibility)
- [ ] Documentation complete

### Success Metrics (Post-Launch)

- **Adoption:** 50% of wrangler users enable GitHub Action within 30 days
- **Efficiency:** 30% reduction in prompts required per implementation session
- **Satisfaction:** User feedback indicates reduced friction in workflow

## References

### Related Specifications

- Template Migration Spec (follow-up) - Moving templates to .wrangler/ for user overrides

### External Resources

- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) - Official GitHub Action
- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [gh CLI manual](https://cli.github.com/manual/)

## Appendix

### Glossary

- **Draft PR:** GitHub pull request in draft state, not ready for merge
- **Worktree:** Git feature for working on multiple branches simultaneously
- **Routing:** Determining which workflow to execute based on context

### Assumptions

- Users have gh CLI installed and authenticated
- Users have Anthropic API access for GitHub Action
- Projects are git repositories hosted on GitHub

### Constraints

- GitHub Actions minutes limits on free tier (2000 min/month)
- Claude API token limits and costs
- Existing skill structure must be maintained for backward compatibility
