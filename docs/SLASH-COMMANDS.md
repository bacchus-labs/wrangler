# Wrangler Slash Commands

**Version**: 1.1.0
**Last Updated**: 2025-11-18

This document provides a comprehensive reference for all wrangler slash commands and how they work.

---

## Table of Contents

- [Overview](#overview)
- [How Slash Commands Work](#how-slash-commands-work)
- [Available Commands](#available-commands)
- [Creating Custom Commands](#creating-custom-commands)
- [Troubleshooting](#troubleshooting)

---

## Overview

Slash commands are **shortcuts to activate wrangler skills** with specific workflows. Instead of manually invoking skills, users can type `/command-name` to trigger predefined behaviors.

### Benefits

- **Faster access** to common workflows
- **Consistent naming** across projects
- **Discoverable** via `/help` command
- **Composable** with other Claude Code features

### Command Syntax

```
/wrangler:command-name [arguments]
```

**Prefix**: All wrangler commands start with `/wrangler:`

**Namespace**: Prevents conflicts with other plugins

**Arguments**: Some commands accept optional parameters (rare)

---

## How Slash Commands Work

### Execution Flow

```
User Types: /wrangler:brainstorm
    ↓
Claude Code Parses Command
    ↓
Looks Up Command in: commands/brainstorm.md
    ↓
Reads Command File Contents
    ↓
Expands to Full Prompt (from command file)
    ↓
Executes Prompt as if User Typed It
```

### Command File Format

**Location**: `commands/{command-name}.md`

**Contents**: Plain text prompt that gets injected

**Example** (`commands/brainstorm.md`):
```markdown
Invoke the brainstorming skill to refine this idea into a fully-formed design through Socratic questioning.
```

When user types `/wrangler:brainstorm`, Claude sees:
```
Invoke the brainstorming skill to refine this idea into a fully-formed design through Socratic questioning.
```

### Skill vs Command vs Tool

| Type | Purpose | Example | Invocation |
|------|---------|---------|------------|
| **Skill** | Detailed workflow instructions | `practicing-tdd` | Automatic (when applicable) |
| **Command** | Shortcut to invoke skill | `/wrangler:brainstorm` | User types command |
| **Tool** | Programmatic function | `issues_create` | Code calls tool |

**Relationship**:
- Commands → Activate Skills
- Skills → May use Tools
- Tools → Standalone functions

---

## Available Commands

### Planning & Design

#### `/wrangler:brainstorm`

**Purpose**: Refine rough ideas into fully-formed designs through Socratic questioning

**File**: `commands/brainstorm.md`

**When to Use**:
- Have a vague idea that needs refinement
- Want to explore alternatives before committing
- Need to validate assumptions
- Designing new features or architecture

**Workflow**:
1. User provides initial idea
2. Skill asks clarifying questions
3. Explores alternatives
4. Validates assumptions
5. Produces detailed design

**Example**:
```
User: /wrangler:brainstorm

I want to add authentication to my app

Claude: I'll help refine your authentication idea through brainstorming.

[Activates brainstorming skill]

Let's start with some clarifying questions:

1. Who are the users? (e.g., internal employees, external customers, both)
2. What authentication methods are you considering? (e.g., username/password, OAuth, SSO)
3. What are your security requirements? (e.g., MFA, password policies, session management)
...
```

**Related Skill**: `skills/brainstorming/SKILL.md`

---

#### `/wrangler:write-plan`

**Purpose**: Create detailed implementation plan with exact file paths and code examples

**File**: `commands/write-plan.md`

**When to Use**:
- Design is complete, ready for implementation
- Need to delegate work to another engineer
- Want comprehensive task breakdown
- Creating specification for complex feature

**Workflow**:
1. Analyzes design/requirements
2. Identifies all files that need changes
3. Breaks down into sequential tasks
4. Provides code examples for each task
5. Includes verification steps

**Example**:
```
User: /wrangler:write-plan

Implement user authentication with JWT tokens

Claude: I'll create a comprehensive implementation plan.

[Activates writing-plans skill]

## Implementation Plan: User Authentication with JWT

### Phase 1: Core Authentication (3 tasks)

**Task 1.1: Create User Model**
- File: `src/models/User.ts`
- Add fields: email, passwordHash, createdAt
- Implement password hashing with bcrypt
- Example code:
```typescript
import bcrypt from 'bcrypt';

export class User {
  async setPassword(password: string) {
    this.passwordHash = await bcrypt.hash(password, 10);
  }
}
```

[... more tasks ...]
```

**Related Skill**: `skills/writing-plans/SKILL.md`

---

#### `/wrangler:execute-plan`

**Purpose**: Execute implementation plan in controlled batches with review checkpoints

**File**: `commands/execute-plan.md`

**When to Use**:
- Have a complete implementation plan
- Want systematic execution with quality gates
- Need progress tracking across tasks
- Implementing complex multi-step feature

**Workflow**:
1. Loads implementation plan
2. Reviews plan critically
3. Executes tasks in batches (default 3 tasks per batch)
4. Reports after each batch for review
5. Continues or adjusts based on feedback

**Example**:
```
User: /wrangler:execute-plan

[Plan from write-plan command]

Claude: I'll execute this plan in controlled batches.

[Activates executing-plans skill]

## Batch 1: Core Authentication (Tasks 1.1 - 1.3)

Implementing:
- Task 1.1: Create User Model
- Task 1.2: Add password hashing
- Task 1.3: Create JWT utility

[Executes tasks...]

✅ Batch 1 Complete

Results:
- Created src/models/User.ts (42 lines)
- Added bcrypt dependency
- Created src/utils/jwt.ts (28 lines)
- All 15 tests passing

Ready for next batch? (Tasks 2.1 - 2.3)
```

**Related Skill**: `skills/executing-plans/SKILL.md` (if exists)

---

### Maintenance & Updates

#### `/wrangler:updating-wrangler`

**Purpose**: Generate LLM-friendly migration instructions for wrangler version updates

**File**: `commands/update-yourself.md`

**When to Use**:
- Startup skill reports OUTDATED status
- Want to update to latest wrangler features
- Breaking changes detected in version check

**Workflow**:
1. Detects version gap (current vs latest)
2. Loads release notes for all versions in gap
3. Filters to breaking changes
4. Generates step-by-step migration instructions
5. Includes verification and rollback steps

**Example**:
```
User: /wrangler:updating-wrangler

Claude: Detecting wrangler version gap...

[Reads constitution: wranglerVersion: "1.0.0"]
[Reads CURRENT_VERSION: "1.1.0"]
[Version gap: 1 release with breaking changes]

# Update Wrangler from v1.0.0 → v1.1.0

Your project is 1 release behind. Breaking changes detected.

## Migration Required

v1.1.0: Directory structure refactored
- Move issues/ → .wrangler/issues/
- Move specifications/ → .wrangler/specifications/
- Update constitution frontmatter

## Step-by-Step Instructions

### Step 1: Create .wrangler/ structure
[Detailed instructions...]

Shall I proceed with migration?
```

**Related Skill**: `skills/startup-checklist/SKILL.md` (if exists)

**Related Documentation**: [Versioning System](VERSIONING.md)

---

### Diagnostics & Analysis

#### `/wrangler:run-tests`

**Purpose**: Locate and run project test suite with comprehensive reporting

**File**: `commands/run-tests.md`

**When to Use**:
- Want to verify all tests pass
- After making code changes
- Before creating PR

**Workflow**:
1. Detects test framework (Jest, Mocha, pytest, etc.)
2. Identifies test command
3. Runs full test suite
4. Parses and reports results

**Example**:
```
User: /wrangler:run-tests

Claude: Detecting test framework...

[Found package.json with "test": "jest"]

Running: npm test

[Executes test suite]

✅ Test Results

Total: 233 tests
Passed: 233
Failed: 0
Coverage: 87.11%

All tests passing!
```

---

#### `/wrangler:scan-dependencies`

**Purpose**: Analyze project dependencies for security vulnerabilities and updates

**File**: `commands/scan-dependencies.md`

**When to Use**:
- Security audit
- Planning dependency updates
- Investigating version conflicts

**Workflow**:
1. Identifies package manager (npm, yarn, cargo, pip, etc.)
2. Runs vulnerability scan
3. Checks for outdated packages
4. Reports findings

**Example**:
```
User: /wrangler:scan-dependencies

Claude: Scanning project dependencies...

[Runs: npm audit]

⚠️ Dependency Scan Results

Security Vulnerabilities:
- HIGH: lodash@4.17.19 (Prototype Pollution)
  Fix: npm install lodash@4.17.21

Outdated Packages:
- typescript: 4.9.0 → 5.3.0 (major update)
- jest: 28.0.0 → 29.7.0 (major update)

Recommendations: Update 2 packages, patch 1 vulnerability
```

---

#### `/wrangler:analyze-session-gaps`

**Purpose**: Analyze conversation for missed requirements or forgotten tasks

**File**: `commands/analyze-session-gaps.md`

**When to Use**:
- Before claiming work complete
- After long conversation
- Want verification of completeness

**Workflow**:
1. Reviews entire conversation history
2. Extracts all user requests
3. Identifies completed vs incomplete
4. Reports gaps

**Example**:
```
User: /wrangler:analyze-session-gaps

Claude: Analyzing conversation for gaps...

[Reviews conversation history]

## Session Analysis

Total Requests: 12
Completed: 10
In Progress: 1
Not Started: 1

### ✅ Completed
1. Created versioning system (Issues #000001)
2. Documented session hooks (docs/SESSION-HOOKS.md)
...

### ⚠️ Incomplete
11. Update CLAUDE.md with new features - IN PROGRESS

### ❌ Not Started
12. Create documentation index - NOT STARTED

Recommendations:
- Complete task 11 before claiming session done
- Start task 12 or defer to next session
```

---

## Creating Custom Commands

### Command File Structure

**Minimal Command**:
```markdown
Run the test suite and report results.
```

**Detailed Command**:
```markdown
# Task: Implement Feature X

Use the following workflow:

1. Review requirements in SPEC.md
2. Write tests first (TDD)
3. Implement feature
4. Run tests
5. Update documentation

Apply these principles:
- Functions ≤50 lines
- Test coverage >80%
- No commented-out code

Report progress after each step.
```

### Command Naming Conventions

**Good Names**:
- `/wrangler:run-tests` (verb + noun, clear action)
- `/wrangler:updating-wrangler` (verb + target)
- `/wrangler:analyze-session-gaps` (verb + what to analyze)

**Bad Names**:
- `/wrangler:test` (too vague)
- `/wrangler:go` (unclear action)
- `/wrangler:doit` (unprofessional)

### Creating a New Command

**Steps**:

1. **Create command file**:
   ```bash
   touch commands/my-command.md
   ```

2. **Write prompt**:
   ```markdown
   Invoke the [skill-name] skill to [accomplish goal].

   [Optional: Additional context or parameters]
   ```

3. **Test manually**:
   ```bash
   # Activate in Claude Code
   /wrangler:my-command

   # Verify it does what you expect
   ```

4. **Document**:
   - Add entry to this document
   - Update README.md if widely useful
   - Create skill documentation if creating new skill

**Example**:

`commands/review-code.md`:
```markdown
Invoke the code-reviewer skill to systematically review all code changes in the current branch.

Focus on:
- Security vulnerabilities
- Performance issues
- Code quality
- Test coverage

Provide detailed report with severity levels (CRITICAL, HIGH, MEDIUM, LOW).
```

Usage: `/wrangler:review-code`

### Command Parameters

**Simple Parameters** (not currently supported but planned):
```markdown
/wrangler:run-tests --coverage
/wrangler:brainstorm --depth=deep
```

**Workaround** (current):
```
User: /wrangler:brainstorm

Focus on scalability and performance.

Claude: I'll brainstorm with focus on scalability and performance.
```

---

## Command Best Practices

### Do's

✅ **Use descriptive names**: `/wrangler:analyze-session-gaps` is better than `/wrangler:gaps`

✅ **Invoke skills explicitly**: "Invoke the X skill to accomplish Y"

✅ **Provide context**: Include relevant parameters or focus areas

✅ **Test thoroughly**: Ensure command does what it claims

✅ **Document purpose**: Explain when to use command

### Don'ts

❌ **Don't duplicate functionality**: Reuse existing commands/skills

❌ **Don't create overly specific commands**: `/wrangler:fix-bug-in-auth.ts` is too specific

❌ **Don't hardcode project details**: Commands should work for any project

❌ **Don't skip skill activation**: Commands should invoke skills, not reimplement them

❌ **Don't create commands for trivial tasks**: "Read file X" doesn't need a command

---

## Troubleshooting

### Command Not Found

**Symptom**: `/wrangler:my-command` shows "Command not found"

**Causes**:
1. Command file doesn't exist
2. File in wrong location
3. Filename doesn't match command name
4. Plugin not loaded

**Solutions**:
```bash
# Verify file exists
ls ~/.claude/plugins/wrangler/commands/my-command.md

# Check filename matches command (no /wrangler: prefix in file)
# Correct: commands/brainstorm.md
# Wrong: commands/wrangler:brainstorm.md

# Restart Claude Code to reload plugin
```

### Command Does Nothing

**Symptom**: Command executes but Claude doesn't follow instructions

**Causes**:
1. Command file empty or contains invalid content
2. Prompt too vague
3. Skill not found
4. Conflicting instructions

**Solutions**:
```bash
# Verify command file has content
cat ~/.claude/plugins/wrangler/commands/my-command.md

# Verify skill exists (if command invokes skill)
ls ~/.claude/plugins/wrangler/skills/my-skill/SKILL.md

# Make prompt more explicit:
# Bad: "Do something with tests"
# Good: "Invoke the test-runner skill to execute the full test suite"
```

### Command Conflicts with Other Plugin

**Symptom**: Multiple plugins have same command name

**Cause**: Command name collision

**Solution**:
- Use unique prefix (`/wrangler:` vs `/other-plugin:`)
- Rename command to be more specific
- Disable conflicting plugin

---

## Advanced Topics

### Dynamic Commands

**Goal**: Generate commands programmatically based on project context

**Current State**: Not supported (commands are static files)

**Future**: Potential skill to generate custom commands per project

**Workaround**: Use template commands with parameters in user message

### Command Composition

**Goal**: Chain multiple commands together

**Example**:
```
/wrangler:brainstorm && /wrangler:write-plan && /wrangler:execute-plan
```

**Current State**: Not supported (each command is independent)

**Workaround**: Run commands sequentially, copy output between

### Command Aliases

**Goal**: Shorter aliases for frequently used commands

**Example**:
```
/w:bs → /wrangler:brainstorm
/w:wp → /wrangler:write-plan
```

**Current State**: Not supported

**Workaround**: Use Claude Code's custom snippets feature

---

## Related Documentation

- [Skills Reference](../README.md#skills) - All available skills
- [Session Hooks](SESSION-HOOKS.md) - How commands integrate with startup
- [Governance Framework](GOVERNANCE.md) - Planning workflow context

---

## Changelog

### v1.1.0 (2025-11-18)
- Added `/wrangler:updating-wrangler` command
- Documented all existing commands
- Added troubleshooting guide
- Explained command creation process

### v1.0.0 (2025-10-29)
- Initial three commands: brainstorm, write-plan, execute-plan

---

**Last Updated**: 2025-11-18
**Maintainer**: Wrangler Team
**Status**: Current
