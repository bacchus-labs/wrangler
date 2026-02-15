---
id: SPEC-000041
title: Git Hooks Enforcement Framework for Wrangler
type: specification
status: closed
priority: high
labels:
  - specification
  - git-hooks
  - enforcement
  - testing
  - security
  - code-quality
  - governance
createdAt: '2026-01-21T21:48:49.875Z'
updatedAt: '2026-02-13T20:49:52.776Z'
project: Wrangler Core Framework
wranglerContext:
  agentId: spec-writer
  estimatedEffort: >-
    4 weeks implementation (2 weeks core, 1 week integration, 1 week
    testing/polish)
---
# Specification: Git Hooks Enforcement Framework for Wrangler

## Executive Summary

**What:** A standardized Git hooks system for wrangler that prevents process violations (security vulnerabilities, test failures, code quality issues) from entering codebases through technical enforcement at commit and push time.

**Why:** Documentation alone is insufficient for preventing critical failures. AI agents and human developers need technical barriers that make bad behaviors hard and good behaviors automatic. This addresses a pattern observed in the MEDB project where clear documentation existed but was bypassed, resulting in hardcoded secrets, failing tests being merged, and process discipline breaking down.

**Scope:**

**Included:**
- `/wrangler:setup-git-hooks` slash command for initialization
- Integration with `initialize-governance` skill (optional hooks setup question)
- Parameterized hook templates (pre-commit, pre-push, commit-msg)
- Project-specific test command configuration
- User bypass mechanism (environment variable)
- Agent enforcement (cannot bypass)
- Security checklist template
- PR template with test verification
- Definition of Done template
- Automatic hook installation on workspace setup

**Excluded:**
- Husky or other third-party hook managers (use native Git hooks)
- Server-side hooks (focus on client-side enforcement)
- Complex hook orchestration (keep simple)
- Language-specific linting (project provides commands)
- IDE integrations (hooks are IDE-agnostic)

**Status:** Draft

## Goals and Non-Goals

### Goals

1. **Prevent security vulnerabilities** from being committed (hardcoded secrets, credentials)
2. **Ensure tests pass** before commits can be pushed to protected branches
3. **Maintain code quality** through automated formatting and linting
4. **Differentiate user and agent behavior** - users can bypass when needed, agents cannot
5. **Provide clear guidance** through templates and error messages
6. **Be project-agnostic** - work across any language/framework with minimal configuration
7. **Integrate seamlessly** with existing wrangler governance and skills
8. **Support common workflows** - format on commit, test on push, enforce standards

### Non-Goals

- Replace existing CI/CD systems (complement them)
- Provide language-specific tooling (projects provide their own)
- Enforce code review (GitHub branch protection handles this)
- Support server-side hooks (client-side only)
- Create complex hook orchestration systems
- Build hook debugging tools (use Git's built-in mechanisms)
- Support pre-commit framework or other managers (native Git only)

## Background & Context

### Problem Statement

The MEDB project development session (2026-01-21) revealed four critical process failures despite comprehensive documentation:

1. **Security vulnerability**: Hardcoded encryption key committed to repository
2. **Test execution**: PR merged with failing CI checks
3. **Test methodology**: Tests run outside prescribed Docker environment
4. **PR process**: No verification that tests passed before merging

**Root cause:** Lack of technical enforcement allowed shortcuts that violated documented processes.

### Current State

Most projects using wrangler have:
- Constitution with design principles
- Specifications and issue tracking
- Skills for TDD, verification, code review
- Documentation about testing requirements

But lack:
- Technical enforcement of documented processes
- Automated prevention of common mistakes
- Differentiation between user and agent capabilities
- Systematic barriers to security vulnerabilities

### Proposed State

With Git hooks framework, wrangler-enabled projects will have:

**Pre-commit hook:**
- Auto-format code (project-specific formatter)
- Run linters (project-specific linter)
- Run fast unit tests
- Scan for secrets (optional)

**Pre-push hook:**
- Run full test suite on protected branches (main, feature/*, fix/*)
- Verify all tests pass before push

**Commit-msg hook (optional):**
- Enforce commit message conventions
- Validate format and content

**Bypass mechanism:**
- User: Set `WRANGLER_SKIP_HOOKS=1` in shell profile (once)
- Agent: Cannot bypass (no environment variable access)

**Documentation templates:**
- Security checklist for sensitive code
- PR template with test verification requirements
- Definition of Done criteria

## Requirements

### Functional Requirements

**FR-001: Hook Installation Command**
- MUST provide `/wrangler:setup-git-hooks` slash command
- MUST create hook scripts in `.git/hooks/` directory
- MUST make hooks executable
- MUST verify Git repository exists before installation
- MUST detect existing hooks and ask user about overwriting

**FR-002: Interactive Configuration**
- MUST ask user for test command (e.g., `npm test`, `pytest`, `./scripts/docker-test.sh`)
- SHOULD detect common test patterns and suggest defaults
- MAY ask user about optional features (secret scanning, commit-msg validation)
- MUST save configuration to `.wrangler/hooks-config.json`

**FR-003: Pre-Commit Hook Template**
- MUST support parameterized test command
- MUST support optional formatting command
- MUST support optional linting command
- MUST check `WRANGLER_SKIP_HOOKS` environment variable
- MUST run fast unit tests (if configured)
- MUST provide clear error messages on failure
- SHOULD auto-format and re-stage files
- SHOULD skip tests for docs-only changes

**FR-004: Pre-Push Hook Template**
- MUST run full test suite on protected branches (main, master, feature/*, fix/*)
- MUST check `WRANGLER_SKIP_HOOKS` environment variable
- MUST provide clear error messages with remediation steps
- SHOULD skip for non-protected branches
- MAY support custom branch patterns

**FR-005: Commit-Msg Hook Template (Optional)**
- MAY enforce conventional commit format
- MAY validate commit message length
- MAY check for issue references
- MUST check `WRANGLER_SKIP_HOOKS` environment variable

**FR-006: Bypass Mechanism**
- MUST support `WRANGLER_SKIP_HOOKS=1` environment variable
- MUST allow users to bypass hooks when set
- MUST NOT allow AI agents to bypass (no env var access)
- SHOULD log bypasses for audit trail
- MUST provide clear setup instructions for users

**FR-007: Integration with Initialize-Governance**
- MUST add question to `initialize-governance` skill about Git hooks setup
- Question format: "Set up Git hooks for automated testing and code quality?"
- Options: "Yes (Recommended)", "No, I'll set up manually", "Skip for now"
- MUST invoke `/wrangler:setup-git-hooks` if user selects "Yes"

**FR-008: Template Files**
- MUST provide security checklist template (`.wrangler/templates/SECURITY_CHECKLIST.md`)
- MUST provide PR template (`.wrangler/templates/pull_request_template.md`)
- MUST provide Definition of Done template (`.wrangler/templates/DEFINITION_OF_DONE.md`)
- Templates MUST be parameterized with project-specific commands

**FR-009: Configuration Persistence**
- MUST save hook configuration to `.wrangler/hooks-config.json`
- Format:
```json
{
  "version": "1.0.0",
  "testCommand": "npm test",
  "unitTestCommand": "npm run test:unit",
  "formatCommand": "npm run format",
  "lintCommand": "npm run lint",
  "protectedBranches": ["main", "master", "feature/*", "fix/*"],
  "enableSecretScanning": false,
  "enableCommitMsgValidation": false
}
```

**FR-010: Hook Update Command**
- SHOULD provide `/wrangler:update-git-hooks` command
- MUST re-read `.wrangler/hooks-config.json`
- MUST regenerate hooks with updated configuration
- MUST preserve user customizations in config file

### Non-Functional Requirements

**NFR-001: Performance**
- Pre-commit hook MUST complete in < 30 seconds for unit tests
- Pre-push hook MAY take up to 10 minutes for full test suite
- Hook execution SHOULD not block interactive workflows

**NFR-002: Reliability**
- Hooks MUST fail safe (block commit/push on error, not allow)
- Hooks MUST handle missing dependencies gracefully
- Hooks MUST provide actionable error messages

**NFR-003: Portability**
- Hooks MUST work on macOS, Linux, Windows (Git Bash)
- Hooks MUST use POSIX-compliant shell (bash)
- Hooks MUST not require sudo/admin privileges

**NFR-004: Maintainability**
- Hook templates MUST be well-documented
- Configuration format MUST be self-describing
- Updates MUST be backward compatible

**NFR-005: Security**
- Hooks MUST NOT log sensitive information
- Hooks MUST validate all user input
- Bypass mechanism MUST be auditable

**NFR-006: Usability**
- Setup MUST complete in < 2 minutes
- Error messages MUST include remediation steps
- Documentation MUST include quick start guide

### User Experience Requirements

**UX-001: Onboarding**
- First-time users MUST be guided through configuration
- Defaults MUST be sensible for common projects
- Setup MUST feel helpful, not obstructive

**UX-002: Error Handling**
- Failed hooks MUST explain what went wrong
- Error messages MUST suggest fixes
- Users MUST always have escape hatch (bypass)

**UX-003: Transparency**
- Hooks MUST log what they're doing
- Users MUST understand when hooks run
- Bypasses MUST be visible

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Wrangler Project (User's Codebase)           │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐            ┌─────────────────┐
│ Slash Commands  │            │ Skills Library  │
│                 │            │                 │
│ /setup-git-hooks│───────────▶│initialize-      │
│ /update-git-    │            │governance       │
│  hooks          │            └─────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Hook Templates (in wrangler)               │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ pre-commit   │  │ pre-push     │  │ commit-msg   │ │
│  │ .template.sh │  │ .template.sh │  │ .template.sh │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
         │
         │ Copy & Parameterize
         ▼
┌─────────────────────────────────────────────────────────┐
│           Project .git/hooks/ (Generated)               │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ pre-commit   │  │ pre-push     │  │ commit-msg   │ │
│  │ (executable) │  │ (executable) │  │ (executable) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
         │
         │ Read Configuration
         ▼
┌─────────────────────────────────────────────────────────┐
│      .wrangler/hooks-config.json (User's Config)        │
│                                                         │
│  {                                                      │
│    "testCommand": "npm test",                          │
│    "unitTestCommand": "npm run test:unit",             │
│    "protectedBranches": ["main", "feature/*"]          │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
         │
         │ Hook Execution Flow
         ▼
┌─────────────────────────────────────────────────────────┐
│                  Git Operations                         │
│                                                         │
│  git commit ───▶ pre-commit hook ───▶ Allow/Block      │
│  git push   ───▶ pre-push hook   ───▶ Allow/Block      │
└─────────────────────────────────────────────────────────┘
         │
         │ Check Bypass
         ▼
┌─────────────────────────────────────────────────────────┐
│              Environment Variables                      │
│                                                         │
│  User:  WRANGLER_SKIP_HOOKS=1 (in ~/.zshrc)           │
│  Agent: (no environment variable) ──▶ Cannot bypass    │
└─────────────────────────────────────────────────────────┘
```

### Components

#### Component 1: Slash Command Handler

**Responsibility:** Execute hook setup workflow

**Location:** `commands/setup-git-hooks.md`

**Interfaces:**
- Input: User invocation via `/wrangler:setup-git-hooks`
- Output: Invokes `setup-git-hooks` skill

**Key behaviors:**
- Delegates to skill for actual implementation
- Provides command-level documentation

#### Component 2: Setup Skill

**Responsibility:** Interactive hook configuration and installation

**Location:** `skills/setup-git-hooks/SKILL.md`

**Interfaces:**
- Input: User answers to configuration questions
- Output: Generated hooks in `.git/hooks/`, config in `.wrangler/hooks-config.json`

**Dependencies:**
- AskUserQuestion tool for configuration
- Bash tool for file operations
- Read/Write tools for template processing

**Key behaviors:**
1. Verify Git repository exists
2. Detect project type (language, test framework)
3. Ask user for configuration (test commands, options)
4. Copy and parameterize hook templates
5. Install hooks to `.git/hooks/`
6. Save configuration to `.wrangler/hooks-config.json`
7. Create documentation templates
8. Provide setup summary

#### Component 3: Hook Templates

**Responsibility:** Reusable, parameterized hook scripts

**Location:** `skills/setup-git-hooks/templates/`

**Files:**
- `pre-commit.template.sh`
- `pre-push.template.sh`
- `commit-msg.template.sh`

**Parameterization:** Uses `{{PLACEHOLDER}}` syntax for substitution

**Example placeholders:**
- `{{TEST_COMMAND}}` → `npm test`
- `{{UNIT_TEST_COMMAND}}` → `npm run test:unit`
- `{{FORMAT_COMMAND}}` → `npm run format`
- `{{LINT_COMMAND}}` → `npm run lint`
- `{{PROTECTED_BRANCHES}}` → `main|master|feature/*|fix/*`

#### Component 4: Configuration Storage

**Responsibility:** Persist hook configuration

**Location:** `.wrangler/hooks-config.json` (in user's project)

**Format:**
```json
{
  "version": "1.0.0",
  "createdAt": "2026-01-21T10:00:00Z",
  "testCommand": "npm test",
  "unitTestCommand": "npm run test:unit",
  "formatCommand": "npm run format",
  "lintCommand": "npm run lint",
  "protectedBranches": ["main", "master", "feature/*", "fix/*"],
  "skipDocsOnlyChanges": true,
  "docsPatterns": ["*.md", "docs/**/*"],
  "enableSecretScanning": false,
  "enableCommitMsgValidation": false,
  "bypassEnvVar": "WRANGLER_SKIP_HOOKS"
}
```

**Validation:** JSON schema in skill documentation

#### Component 5: Documentation Templates

**Responsibility:** Provide process documentation for users

**Location:** `skills/setup-git-hooks/templates/`

**Files:**
- `SECURITY_CHECKLIST.md` → `.wrangler/templates/SECURITY_CHECKLIST.md`
- `pull_request_template.md` → `.github/pull_request_template.md`
- `DEFINITION_OF_DONE.md` → `.wrangler/templates/DEFINITION_OF_DONE.md`

**Key sections:**
- Security checklist: Pre-commit verification for sensitive code
- PR template: Test verification, evidence requirements
- Definition of Done: Clear criteria for completion

#### Component 6: Integration with Initialize-Governance

**Responsibility:** Offer Git hooks setup during governance initialization

**Location:** Modify `skills/initialize-governance/SKILL.md`

**Change:** Add question in Phase 1 (Discovery and Planning):

```typescript
{
  question: "Set up Git hooks for automated testing and code quality?",
  header: "Git Hooks",
  options: [
    { 
      label: "Yes (Recommended)", 
      description: "Auto-format code, run tests before commits/pushes, prevent common mistakes" 
    },
    { 
      label: "No, manual setup", 
      description: "I'll configure hooks manually later" 
    },
    { 
      label: "Skip for now", 
      description: "Don't set up hooks" 
    }
  ],
  multiSelect: false
}
```

**Behavior:** If "Yes" selected, invoke Skill tool with `setup-git-hooks` after governance files created.

### Data Models

#### Hook Configuration Schema

```typescript
interface HookConfiguration {
  version: string;                    // Config format version
  createdAt: string;                  // ISO 8601 timestamp
  testCommand: string;                // Full test suite command
  unitTestCommand?: string;           // Fast unit tests only
  formatCommand?: string;             // Code formatter command
  lintCommand?: string;               // Linter command
  protectedBranches: string[];        // Branch patterns for full tests
  skipDocsOnlyChanges: boolean;       // Skip hooks for doc-only commits
  docsPatterns: string[];             // Glob patterns for docs
  enableSecretScanning: boolean;      // Enable secret detection
  secretPatterns?: string[];          // Custom secret patterns
  enableCommitMsgValidation: boolean; // Enforce commit format
  commitMsgPattern?: string;          // Regex for commit messages
  bypassEnvVar: string;               // Env var name for bypass
}
```

#### Hook Execution Context

```typescript
interface HookContext {
  hookType: 'pre-commit' | 'pre-push' | 'commit-msg';
  gitRoot: string;                    // Repository root path
  config: HookConfiguration;          // Loaded configuration
  bypassEnabled: boolean;             // User has bypass set
  changedFiles?: string[];            // Files in staging area
  targetBranch?: string;              // Branch being pushed to
}
```

### API / Interface Definitions

#### Slash Command Interface

**Command:** `/wrangler:setup-git-hooks`

**Description:** "Set up Git hooks for automated testing and code quality enforcement"

**Parameters:** None (interactive)

**Example:**
```
User: /wrangler:setup-git-hooks
Agent: I'll help you set up Git hooks for your project.
       [Proceeds with interactive configuration]
```

#### Skill Interface

**Skill Name:** `setup-git-hooks`

**Input:** None (uses AskUserQuestion for configuration)

**Output:** 
- Hooks installed in `.git/hooks/`
- Configuration saved to `.wrangler/hooks-config.json`
- Templates created in `.wrangler/templates/` and `.github/`
- Summary message to user

**Success Criteria:**
- All hooks executable
- Configuration valid JSON
- Templates created
- User provided with setup instructions

## Implementation Details

### Technology Stack

**Core Technologies:**
- **Shell scripting:** Bash (POSIX-compliant)
- **Configuration format:** JSON
- **Template engine:** Simple `{{PLACEHOLDER}}` substitution

**Dependencies:**
- Git (required, assumed present)
- Project-specific tools (npm, pytest, etc.) - provided by project

**No external dependencies:** Use native Git hooks, no Husky or other managers

### File Structure

```
wrangler/
├── commands/
│   ├── setup-git-hooks.md           # Slash command entry point
│   └── update-git-hooks.md          # Optional: Update existing hooks
│
├── skills/
│   └── setup-git-hooks/
│       ├── SKILL.md                 # Main skill implementation
│       └── templates/
│           ├── pre-commit.template.sh
│           ├── pre-push.template.sh
│           ├── commit-msg.template.sh
│           ├── SECURITY_CHECKLIST.md
│           ├── pull_request_template.md
│           └── DEFINITION_OF_DONE.md
│
└── skills/initialize-governance/
    └── SKILL.md                     # Modified to include hooks question
```

**In user's project after setup:**

```
project/
├── .git/
│   └── hooks/
│       ├── pre-commit               # Generated, executable
│       ├── pre-push                 # Generated, executable
│       └── commit-msg               # Generated, executable (optional)
│
├── .wrangler/
│   ├── hooks-config.json            # Hook configuration
│   └── templates/
│       ├── SECURITY_CHECKLIST.md    # For sensitive code review
│       └── DEFINITION_OF_DONE.md    # Completion criteria
│
└── .github/
    └── pull_request_template.md     # PR template with test requirements
```

### Algorithms & Logic

#### Hook Bypass Check

```bash
#!/bin/bash
# Check if user has bypass enabled
# Agents won't have this environment variable set

check_bypass() {
  if [ "$WRANGLER_SKIP_HOOKS" = "1" ]; then
    echo "ℹ️  Bypassing hook (WRANGLER_SKIP_HOOKS=1)"
    echo "   Set in shell profile: export WRANGLER_SKIP_HOOKS=1"
    exit 0
  fi
}

check_bypass
# Continue with hook logic...
```

#### Docs-Only Change Detection

```bash
#!/bin/bash
# Skip tests if only documentation changed

get_changed_files() {
  git diff --cached --name-only --diff-filter=ACMR
}

is_docs_only() {
  local changed_files=$(get_changed_files)
  
  # If no changes, not docs-only
  if [ -z "$changed_files" ]; then
    return 1
  fi
  
  # Check if all files match docs patterns
  local non_docs_files=$(echo "$changed_files" | grep -vE '(\.md$|^docs/|^\.wrangler/memos/)' || true)
  
  if [ -z "$non_docs_files" ]; then
    echo "ℹ️  Only documentation changed, skipping tests"
    return 0
  fi
  
  return 1
}

if is_docs_only; then
  echo "✅ Docs-only commit, skipping hook"
  exit 0
fi
```

#### Protected Branch Detection

```bash
#!/bin/bash
# Check if pushing to protected branch

is_protected_branch() {
  local branch="$1"
  local protected_patterns="main master feature/.* fix/.*"
  
  for pattern in $protected_patterns; do
    if echo "$branch" | grep -qE "^${pattern}$"; then
      return 0
    fi
  done
  
  return 1
}

# In pre-push hook
while read local_ref local_sha remote_ref remote_sha; do
  branch=$(echo "$local_ref" | sed 's/refs\/heads\///')
  
  if is_protected_branch "$branch"; then
    echo "📋 Pushing to protected branch '$branch', running full tests..."
    {{TEST_COMMAND}}
  else
    echo "ℹ️  Pushing to non-protected branch '$branch', skipping full tests"
  fi
done
```

#### Template Parameterization

```bash
#!/bin/bash
# Simple template substitution

parameterize_template() {
  local template_file="$1"
  local output_file="$2"
  local test_command="$3"
  local unit_test_command="$4"
  
  sed -e "s|{{TEST_COMMAND}}|${test_command}|g" \
      -e "s|{{UNIT_TEST_COMMAND}}|${unit_test_command}|g" \
      "$template_file" > "$output_file"
  
  chmod +x "$output_file"
}
```

### Configuration Management

**Default Configuration:** If user skips questions, use sensible defaults

**JavaScript/TypeScript projects:**
```json
{
  "testCommand": "npm test",
  "unitTestCommand": "npm run test:unit || npm test",
  "formatCommand": "npm run format || npx prettier --write .",
  "lintCommand": "npm run lint || npx eslint .",
  "protectedBranches": ["main", "master", "feature/*", "fix/*"]
}
```

**Python projects:**
```json
{
  "testCommand": "pytest",
  "unitTestCommand": "pytest tests/unit",
  "formatCommand": "black . || ruff format .",
  "lintCommand": "ruff check . || pylint src",
  "protectedBranches": ["main", "master", "feature/*", "fix/*"]
}
```

**Go projects:**
```json
{
  "testCommand": "go test ./...",
  "unitTestCommand": "go test -short ./...",
  "formatCommand": "go fmt ./...",
  "lintCommand": "golangci-lint run",
  "protectedBranches": ["main", "master", "feature/*", "fix/*"]
}
```

**Configuration Update:** Users can manually edit `.wrangler/hooks-config.json` then run `/wrangler:update-git-hooks`

## Security Considerations

### Authentication & Authorization

**Not applicable** - Git hooks run in user's local environment, no auth needed

### Data Protection

**Configuration file:**
- Contains only command strings, no secrets
- Git-tracked (safe to commit)
- No PII or sensitive data

**Hook execution:**
- Runs with user's shell permissions
- Cannot escalate privileges
- No network access required

### Threats & Mitigations

**Threat 1: Malicious hook installation**
- **Scenario:** Attacker modifies wrangler templates to inject malicious code
- **Mitigation:** Users verify wrangler source (official plugin), hooks are transparent scripts
- **Severity:** Low (requires compromising wrangler distribution)

**Threat 2: Bypass mechanism abuse**
- **Scenario:** Agent attempts to set `WRANGLER_SKIP_HOOKS=1` programmatically
- **Mitigation:** Environment variables don't persist across agent sessions
- **Severity:** Low (agents can't modify shell profiles)

**Threat 3: Hook performance DoS**
- **Scenario:** Hook runs extremely slow tests, blocking user workflow
- **Mitigation:** User can bypass with env var, hooks log progress
- **Severity:** Low (user has control)

**Threat 4: Secret leakage in hook logs**
- **Scenario:** Hook logs command output containing secrets
- **Mitigation:** Hooks only log status, not full output
- **Severity:** Low (minimal logging)

### Compliance

**No compliance requirements** - Local tool, no data collection, no regulatory concerns

## Error Handling

### Error Categories

**Category 1: Configuration Errors**
- Missing `.wrangler/hooks-config.json`
- Invalid JSON in config file
- Missing required fields

**Handling:**
```bash
if [ ! -f ".wrangler/hooks-config.json" ]; then
  echo "❌ Error: Hook configuration not found"
  echo ""
  echo "Run: /wrangler:setup-git-hooks"
  echo ""
  exit 1
fi
```

**Category 2: Test Execution Errors**
- Test command not found
- Tests fail
- Timeout

**Handling:**
```bash
if ! {{TEST_COMMAND}} 2>&1; then
  echo ""
  echo "❌ Tests failed!"
  echo ""
  echo "Fix the failing tests or set WRANGLER_SKIP_HOOKS=1 to bypass."
  echo "Add to ~/.zshrc: export WRANGLER_SKIP_HOOKS=1"
  echo ""
  exit 1
fi
```

**Category 3: Git Errors**
- Not in Git repository
- Detached HEAD state
- Merge conflicts

**Handling:**
```bash
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Error: Not in a Git repository"
  exit 1
fi
```

**Category 4: Dependency Errors**
- Docker not running (for Docker-based tests)
- npm not installed
- Python not found

**Handling:**
```bash
if ! command -v npm > /dev/null 2>&1; then
  echo "❌ Error: npm not found"
  echo ""
  echo "Install Node.js or update PATH"
  echo ""
  exit 1
fi
```

### Recovery Strategies

**Strategy 1: User bypass**
- Set `WRANGLER_SKIP_HOOKS=1` temporarily or permanently
- Use `git commit --no-verify` as last resort (not recommended for agents)

**Strategy 2: Hook removal**
- Delete hooks: `rm .git/hooks/pre-commit .git/hooks/pre-push`
- Re-run setup: `/wrangler:setup-git-hooks`

**Strategy 3: Manual configuration**
- Edit `.wrangler/hooks-config.json`
- Run `/wrangler:update-git-hooks` to regenerate hooks

**Strategy 4: Fallback commands**
- If primary test command fails, try fallback
- Example: `npm run test:unit || npm test`

## Observability

### Logging

**Hook execution logs:**
```bash
echo "🔍 Running pre-commit hook..."
echo "   - Checking for staged files"
echo "   - Running code formatter"
echo "   - Running linter"
echo "   - Running unit tests"
echo "✅ Pre-commit checks passed!"
```

**Log location:** stdout (visible to user during commit/push)

**Log levels:**
- ℹ️  Info: Normal execution
- ✅ Success: All checks passed
- ⚠️  Warning: Non-critical issues
- ❌ Error: Hook failed, blocking operation

### Metrics

**No automated metrics collection** - Local tool, no telemetry

**Manual metrics users can track:**
- Hook bypass frequency (check shell history for `WRANGLER_SKIP_HOOKS`)
- Hook failure rate (user observes how often commits are blocked)
- Test execution time (displayed in hook output)

### Monitoring

**No automated monitoring** - User observes hook behavior during Git operations

**User feedback:**
- Hook runs visibly during commit/push
- Clear output shows what's happening
- Errors explain what went wrong and how to fix

### Tracing

**Execution trace:**
```bash
# Add to hooks for debugging
set -x  # Enable trace mode
# Hook logic here
set +x  # Disable trace mode
```

**User can enable trace:** Edit hook file temporarily to debug issues

## Testing Strategy

### Test Coverage

**Unit tests:** N/A (shell scripts, manual verification)

**Integration tests:**
1. Hook installation on fresh repository
2. Hook execution with passing tests
3. Hook execution with failing tests
4. Bypass mechanism verification
5. Template parameterization
6. Configuration loading

**Manual testing checklist:**
- [ ] Install hooks on JavaScript project
- [ ] Install hooks on Python project
- [ ] Install hooks on Go project
- [ ] Commit with passing tests
- [ ] Commit with failing tests (blocked)
- [ ] Set bypass, commit succeeds
- [ ] Unset bypass, commit blocked again
- [ ] Push to protected branch (runs full tests)
- [ ] Push to non-protected branch (skips tests)
- [ ] Docs-only commit (skips tests)
- [ ] Update config, regenerate hooks

### Test Scenarios

**Scenario 1: First-time setup**
```
Given: Fresh wrangler project with Git
When: User runs /wrangler:setup-git-hooks
Then: 
  - Skill asks configuration questions
  - Hooks installed to .git/hooks/
  - Config saved to .wrangler/hooks-config.json
  - Templates created
  - User sees success message
```

**Scenario 2: Commit with failing tests**
```
Given: Hooks installed, tests fail
When: User runs git commit
Then:
  - Pre-commit hook runs
  - Tests execute and fail
  - Commit is blocked
  - Error message shows how to fix or bypass
```

**Scenario 3: User bypass**
```
Given: Hooks installed, WRANGLER_SKIP_HOOKS=1 set
When: User runs git commit
Then:
  - Pre-commit hook checks env var
  - Hook logs "Bypassing..."
  - Commit succeeds without running tests
```

**Scenario 4: Agent cannot bypass**
```
Given: Hooks installed, agent has no env var
When: Agent attempts git commit with failing tests
Then:
  - Pre-commit hook runs
  - Tests fail
  - Commit blocked
  - Agent must fix tests to proceed
```

**Scenario 5: Integration with initialize-governance**
```
Given: New project, running /wrangler:initialize-governance
When: User selects "Yes" for Git hooks question
Then:
  - Governance setup completes
  - setup-git-hooks skill invoked
  - Hooks configured and installed
  - User has complete governance + enforcement
```

### Test Types

**Smoke tests:** Basic hook execution
**Functional tests:** All hook scenarios (pass, fail, bypass)
**Integration tests:** Works with real Git operations
**Usability tests:** Setup flow is clear and quick

## Deployment

### Deployment Strategy

**Distribution:** Part of wrangler plugin, no separate deployment

**Installation:**
1. User updates wrangler plugin (or uses existing version with hooks feature)
2. User runs `/wrangler:setup-git-hooks` in their project
3. Hooks installed locally in user's project `.git/hooks/`

**Updates:**
- Wrangler plugin updates include template improvements
- Users re-run `/wrangler:update-git-hooks` to get latest templates
- Backward compatible with existing configurations

### Migration Path

**From no hooks → wrangler hooks:**
1. User runs `/wrangler:setup-git-hooks`
2. Answers configuration questions
3. Hooks installed, ready to use

**From existing custom hooks → wrangler hooks:**
1. Setup detects existing hooks
2. Asks user: "Existing hooks found. Overwrite or cancel?"
3. If overwrite: Backs up existing hooks to `.git/hooks.backup/`
4. Installs wrangler hooks
5. User can manually merge custom logic if needed

**From husky/other managers → wrangler hooks:**
1. User uninstalls husky: `npm uninstall husky`
2. Removes husky config
3. Runs `/wrangler:setup-git-hooks`
4. Wrangler hooks replace husky

### Dependencies

**Required:**
- Git (assumed present)
- Bash shell (available on macOS, Linux, Windows Git Bash)

**Optional:**
- Project-specific tools (npm, pytest, etc.) - project provides

**No npm packages required** - Pure shell scripts

### Rollback Plan

**Rollback procedure:**
1. Remove hooks: `rm .git/hooks/pre-commit .git/hooks/pre-push .git/hooks/commit-msg`
2. Remove config: `rm .wrangler/hooks-config.json`
3. Restore backups if available: `cp .git/hooks.backup/* .git/hooks/`

**Rollback triggers:**
- Hooks cause too much friction
- Performance unacceptable
- Compatibility issues

## Performance Characteristics

### Expected Performance

**Pre-commit hook:**
- Formatting: < 1 second
- Linting: 1-3 seconds
- Unit tests: 5-30 seconds
- **Total:** < 30 seconds typical

**Pre-push hook:**
- Full test suite: 30 seconds - 10 minutes
- Depends on project size
- Only runs on protected branches

**Commit-msg hook:**
- Validation: < 1 second
- Regex matching: instant

### Scalability

**Small projects (< 100 tests):**
- Pre-commit: 5-10 seconds
- Pre-push: 30-60 seconds
- Acceptable friction

**Medium projects (100-1000 tests):**
- Pre-commit: 10-20 seconds (unit tests only)
- Pre-push: 2-5 minutes (full suite)
- Still acceptable with bypass option

**Large projects (1000+ tests):**
- Pre-commit: 15-30 seconds (unit tests only)
- Pre-push: 5-10 minutes (full suite)
- May want to optimize test selection

**Optimization strategies:**
- Run only changed tests (project-specific)
- Use test caching (project-specific)
- Parallel test execution (project-specific)
- Skip tests for docs-only changes (built-in)

### Load Characteristics

**No server load** - Runs locally

**Local resource usage:**
- CPU: Tests consume CPU, hooks minimal overhead
- Memory: Tests consume memory, hooks minimal
- Disk: No significant disk usage

## Open Questions & Decisions

### Resolved Decisions

**Decision 1: Native Git hooks vs. Husky**
- **Options:** Native Git hooks, Husky, other managers
- **Chosen:** Native Git hooks
- **Rationale:** Simpler, no dependencies, works everywhere
- **Trade-offs:** Less feature-rich, but sufficient for needs

**Decision 2: Bypass mechanism**
- **Options:** Environment variable, flag, git config, file-based
- **Chosen:** Environment variable (`WRANGLER_SKIP_HOOKS=1`)
- **Rationale:** Users can set once in shell profile, agents cannot access
- **Trade-offs:** Requires shell profile editing, but clear separation

**Decision 3: Configuration format**
- **Options:** JSON, YAML, TOML, .env
- **Chosen:** JSON (`.wrangler/hooks-config.json`)
- **Rationale:** Easy to parse in shell (jq), structured, git-tracked
- **Trade-offs:** Less human-friendly than YAML, but universal

**Decision 4: Template parameterization**
- **Options:** Jinja2, Mustache, sed replacement, script generation
- **Chosen:** Simple `{{PLACEHOLDER}}` with sed
- **Rationale:** No dependencies, easy to understand
- **Trade-offs:** Limited logic, but sufficient

**Decision 5: Integration with initialize-governance**
- **Options:** Separate setup, automatic inclusion, optional question
- **Chosen:** Optional question during governance init
- **Rationale:** Natural fit, low friction, user choice
- **Trade-offs:** Adds question to setup flow, but valuable

### Open Questions

**Question 1: Should we support pre-receive hooks for server-side enforcement?**
- **Context:** Client-side hooks can be bypassed, server-side cannot
- **Answer needed by:** Future enhancement decision
- **Impact:** Would require GitHub/GitLab integration, more complex

**Question 2: Should we provide secret scanning by default?**
- **Context:** Requires additional tools (git-secrets, detect-secrets)
- **Options:** Include by default, make optional, skip for v1
- **Answer needed by:** v1 release decision
- **Impact:** More dependencies, slower hooks, better security

**Question 3: Should we support husky migration tool?**
- **Context:** Many projects use husky, migration could be friction point
- **Options:** Provide migration script, manual only, auto-detect
- **Answer needed by:** v1 release decision
- **Impact:** Better adoption, more maintenance

**Question 4: Should we log hook execution to file for debugging?**
- **Context:** Failed hooks only show stdout, might want persistent log
- **Options:** Log to `.wrangler/hooks.log`, no logging, opt-in
- **Answer needed by:** v1 release decision
- **Impact:** Easier debugging, more disk usage

## Risks & Mitigations

### Risk 1: Hook Performance

**Description:** Hooks slow down development workflow, frustrating users

**Impact:** High - Users disable hooks if too slow

**Probability:** Medium - Depends on test suite size

**Mitigation:**
- Only run unit tests in pre-commit (fast)
- Skip hooks for docs-only changes
- Provide clear bypass mechanism
- Optimize test commands (project-specific)

**Contingency:** If too slow, user can bypass or disable hooks

### Risk 2: Hook Bypass Abuse

**Description:** Users bypass hooks too frequently, defeating purpose

**Impact:** Medium - Process violations still occur

**Probability:** Low - Hooks are generally helpful, not obstructive

**Mitigation:**
- Make hooks fast and reliable
- Clear error messages with actionable fixes
- Log bypasses for audit
- Culture: Bypassing should be exception, not norm

**Contingency:** If widespread bypass, revisit hook strictness

### Risk 3: Configuration Drift

**Description:** Hooks-config.json gets out of sync with project

**Impact:** Medium - Hooks run wrong commands

**Probability:** Medium - Projects change over time

**Mitigation:**
- Document how to update config
- Provide `/wrangler:update-git-hooks` command
- Make config file easy to edit
- Validate commands before running

**Contingency:** User manually edits config and regenerates hooks

### Risk 4: Cross-Platform Compatibility

**Description:** Hooks work on macOS but fail on Windows Git Bash

**Impact:** High - Windows users cannot use hooks

**Probability:** Low - Bash is POSIX-compliant, should work

**Mitigation:**
- Test on all platforms (macOS, Linux, Windows Git Bash)
- Use POSIX-compliant syntax
- Avoid bashisms
- Document platform-specific issues

**Contingency:** Provide platform-specific templates if needed

### Risk 5: Git Hook Limitations

**Description:** Git hooks have limitations (can be deleted, not in remote)

**Impact:** Medium - Not foolproof enforcement

**Probability:** High - Inherent to client-side hooks

**Mitigation:**
- Complement with GitHub branch protection (server-side)
- Document limitations clearly
- Set expectations: Hooks help, not guarantee
- Focus on AI agent enforcement (main use case)

**Contingency:** Rely on CI/CD as final enforcement

## Success Criteria

### Launch Criteria

**Must have before release:**
- [ ] Slash command implemented (`/wrangler:setup-git-hooks`)
- [ ] Setup skill complete with interactive configuration
- [ ] Pre-commit hook template working (format, lint, test)
- [ ] Pre-push hook template working (full test suite)
- [ ] Configuration storage implemented
- [ ] Bypass mechanism working (env var)
- [ ] Integration with initialize-governance skill
- [ ] Documentation templates created
- [ ] Tested on JavaScript, Python, Go projects
- [ ] Tested on macOS, Linux, Windows Git Bash
- [ ] Clear error messages and user guidance
- [ ] README documentation complete

**Nice to have:**
- [ ] Commit-msg hook template
- [ ] Secret scanning integration
- [ ] Update command (`/wrangler:update-git-hooks`)
- [ ] Husky migration guide

### Success Metrics

**Adoption:**
- 50%+ of wrangler projects enable Git hooks within 1 month
- 80%+ keep hooks enabled after 3 months (not disabled)

**Effectiveness:**
- Zero security vulnerabilities from hardcoded secrets in projects using hooks
- < 5% of commits bypass hooks in production projects
- 95%+ of hooks complete in < 30 seconds (pre-commit)

**User Satisfaction:**
- Positive feedback on setup ease (< 5 minutes)
- Clear error messages rated helpful (user surveys)
- Hooks perceived as helpful, not obstructive

**Quality:**
- No critical bugs reported in first month
- Cross-platform compatibility confirmed
- Performance acceptable across project sizes

## Timeline & Milestones

**Phase 1: Core Implementation (Week 1-2)**
- Milestone 1.1: Slash command and skill skeleton
- Milestone 1.2: Hook templates (pre-commit, pre-push)
- Milestone 1.3: Configuration storage and loading
- Milestone 1.4: Template parameterization

**Phase 2: Integration (Week 3)**
- Milestone 2.1: Integration with initialize-governance
- Milestone 2.2: Documentation templates
- Milestone 2.3: Cross-platform testing

**Phase 3: Polish & Release (Week 4)**
- Milestone 3.1: Error handling and user guidance
- Milestone 3.2: Documentation and examples
- Milestone 3.3: Testing on real projects
- Milestone 3.4: Release to wrangler plugin

**Future Enhancements (Post v1):**
- Update command
- Secret scanning integration
- Commit-msg validation
- Performance optimizations
- Advanced configuration options

### Dependencies

**Blocks:**
- Nothing (independent feature)

**Blocked by:**
- wrangler plugin infrastructure (already exists)

**Parallel work:**
- Can implement while other wrangler features developed

## References

### Related Specifications

- Wrangler Governance Framework (in CLAUDE.md)
- TDD Skill (skills/test-driven-development)
- Run Tests Skill (skills/run-the-tests)
- Verification Before Completion Skill (skills/verification-before-completion)

### External Resources

- Git Hooks Documentation: https://git-scm.com/docs/githooks
- Git Hooks Tutorial: https://www.atlassian.com/git/tutorials/git-hooks
- POSIX Shell Scripting: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html

### Inspiration

- MEDB Project Spec: Development Process Enforcement with Git Hooks (SPEC-000026)
- Husky: https://typicode.github.io/husky/
- Pre-commit framework: https://pre-commit.com/

## Appendix

### Glossary

**Git hooks:** Scripts that Git executes before or after events (commit, push, etc.)

**Client-side hooks:** Hooks that run on developer's local machine (pre-commit, pre-push)

**Server-side hooks:** Hooks that run on Git server (pre-receive, update)

**Protected branches:** Branches with special rules (main, feature/*, fix/*)

**Bypass mechanism:** Way for users to skip hook execution

**POSIX-compliant:** Shell scripts that work on any Unix-like system

**Parameterization:** Replacing placeholders in templates with actual values

### Assumptions

**Assumption 1:** Users have Git installed and configured

**Assumption 2:** Projects have test commands that can be run from CLI

**Assumption 3:** Users understand basic Git concepts (commit, push, branches)

**Assumption 4:** AI agents run in clean environments without persistent env vars

**Assumption 5:** Wrangler plugin infrastructure supports skills and slash commands

### Constraints

**Constraint 1:** Must work without external dependencies (npm packages, etc.)

**Constraint 2:** Must be cross-platform (macOS, Linux, Windows Git Bash)

**Constraint 3:** Must not require elevated privileges (sudo/admin)

**Constraint 4:** Must complete quickly enough to not disrupt workflow (< 30s pre-commit)

**Constraint 5:** Cannot enforce server-side (client-side hooks only)

### Examples

#### Example Hook Template (Pre-Commit)

```bash
#!/bin/bash
# Pre-commit hook generated by wrangler setup-git-hooks
# Configuration: .wrangler/hooks-config.json

set -e

# Allow user bypass (agents won't have this set)
if [ "$WRANGLER_SKIP_HOOKS" = "1" ]; then
  echo "ℹ️  Bypassing pre-commit hook (WRANGLER_SKIP_HOOKS=1)"
  exit 0
fi

echo "🔍 Running pre-commit checks..."

# Get staged files
changed_files=$(git diff --cached --name-only --diff-filter=ACMR)

# Check if only docs changed
docs_only=true
for file in $changed_files; do
  if ! echo "$file" | grep -qE '(\.md$|^docs/|^\.wrangler/memos/)'; then
    docs_only=false
    break
  fi
done

if [ "$docs_only" = "true" ]; then
  echo "ℹ️  Only documentation changed, skipping tests"
  echo "✅ Pre-commit checks complete!"
  exit 0
fi

# Run formatter (auto-fix)
if [ -n "{{FORMAT_COMMAND}}" ]; then
  echo "   - Formatting code..."
  {{FORMAT_COMMAND}} || echo "⚠️  Formatting failed (non-blocking)"
  git add -u  # Re-stage formatted files
fi

# Run linter
if [ -n "{{LINT_COMMAND}}" ]; then
  echo "   - Running linter..."
  if ! {{LINT_COMMAND}}; then
    echo ""
    echo "❌ Linting failed!"
    echo "Fix the issues or bypass: export WRANGLER_SKIP_HOOKS=1"
    exit 1
  fi
fi

# Run unit tests
if [ -n "{{UNIT_TEST_COMMAND}}" ]; then
  echo "   - Running unit tests..."
  if ! {{UNIT_TEST_COMMAND}}; then
    echo ""
    echo "❌ Unit tests failed!"
    echo "Fix the tests or bypass: export WRANGLER_SKIP_HOOKS=1"
    exit 1
  fi
fi

echo "✅ Pre-commit checks complete!"
exit 0
```

#### Example Configuration

```json
{
  "version": "1.0.0",
  "createdAt": "2026-01-21T10:30:00Z",
  "testCommand": "./scripts/docker-test.sh",
  "unitTestCommand": "./scripts/docker-test.sh unit",
  "formatCommand": "npm run format",
  "lintCommand": "npm run lint",
  "protectedBranches": ["main", "master", "feature/*", "fix/*"],
  "skipDocsOnlyChanges": true,
  "docsPatterns": ["*.md", "docs/**/*", ".wrangler/memos/**/*"],
  "enableSecretScanning": false,
  "enableCommitMsgValidation": false,
  "bypassEnvVar": "WRANGLER_SKIP_HOOKS"
}
```

#### Example Setup Flow

```
User: /wrangler:setup-git-hooks

Agent: I'll help you set up Git hooks for automated testing and code quality.

       First, let me detect your project type...
       
       ✓ Detected: JavaScript/TypeScript project (package.json found)
       ✓ Detected: npm test script exists
       
       Now I need some information to configure the hooks:

[AskUserQuestion]
Question: What command should run your full test suite?
Detected: "npm test"
Options: 
- "npm test" (Recommended - detected in package.json)
- "npm run test:ci"
- Custom command

User: npm test

[AskUserQuestion]
Question: What command runs only fast unit tests?
Options:
- "npm run test:unit"
- "npm test" (same as full suite)
- Skip unit tests
- Custom command

User: npm run test:unit

[AskUserQuestion]
Question: Which branches should trigger full test suite on push?
Options:
- "main, feature/*, fix/*" (Recommended)
- "main only"
- "All branches"
- Custom pattern

User: main, feature/*, fix/*

Agent: Perfect! Setting up Git hooks...

       ✓ Created .wrangler/hooks-config.json
       ✓ Installed pre-commit hook (format, lint, unit tests)
       ✓ Installed pre-push hook (full test suite on protected branches)
       ✓ Created security checklist template
       ✓ Created PR template
       ✓ Created Definition of Done
       
       Git hooks are now active!
       
       What happens now:
       - Every commit: Auto-format, lint, run unit tests (~10-15s)
       - Push to main/feature/*: Run full test suite (~3-4min)
       - Docs-only changes: Skip tests automatically
       
       Bypass (for you, not AI agents):
       Add to your ~/.zshrc:
       
       export WRANGLER_SKIP_HOOKS=1
       
       Then reload: source ~/.zshrc
       
       Try it out:
       git add .
       git commit -m "Test commit with hooks"
```

---

**End of Specification**

---
**Completion Notes (2026-02-13T20:49:52.743Z):**
Fully implemented. Skills (setting-up-git-hooks, updating-git-hooks), templates (11 files including pre-commit, pre-push, commit-msg), documentation (docs/git-hooks.md), slash commands, and active usage on the wrangler repo itself.
