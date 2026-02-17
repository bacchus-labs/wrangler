# Session Hooks System

> Last Updated: 2026-02-17 | Version: 1.2.0

This document explains wrangler's session hooks system and how it manages plugin state across Claude Code sessions.

---

## Table of Contents

- [Overview](#overview)
- [Session Start Hook](#session-start-hook)
- [Workspace Initialization](#workspace-initialization)
- [Context Injection](#context-injection)
- [State Management](#state-management)
- [Hook Configuration](#hook-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

Wrangler uses Claude Code's **session hooks system** to automatically initialize project workspaces and inject critical context when sessions start. This ensures every interaction begins with proper setup and awareness of wrangler's capabilities.

### What Are Session Hooks?

Session hooks are shell scripts or commands that execute when specific Claude Code events occur:
- **SessionStart**: Fires when starting Claude Code, resuming from compact mode, or clearing conversation history
- **UserPromptSubmit**: Fires after each user message
- **AssistantResponse**: Fires after each assistant response (not used by wrangler)

Wrangler uses **SessionStart** and **UserPromptSubmit** hooks.

### Why Session Hooks?

Session hooks enable:
1. **Automatic workspace initialization** - Create required directories without user intervention
2. **Context injection** - Load critical skills and reminders into conversation context
3. **State persistence** - Ensure consistent environment across sessions
4. **User notifications** - Alert users to important configuration issues

---

## Session Start Hook

**Location**: `hooks/session-start.sh`

**Triggers**: Session startup, resume from compact mode, clearing history

**Execution**: Runs before first user interaction in session

### Hook Workflow

```
Claude Code Session Starts
    ↓
SessionStart hook triggered
    ↓
hooks/session-start.sh executes
    ↓
├─ Read .wrangler/config/workspace-schema.json for directory structure
├─ Initialize .wrangler/ directory structure
├─ Check for legacy configuration warnings
├─ Read using-wrangler skill content
└─ Inject context via JSON response
    ↓
Context available in conversation
    ↓
User's first message processed with wrangler context loaded
```

### Hook Implementation

The session start hook performs three main functions:

#### 1. Workspace Initialization

```bash
initialize_workspace() {
    # Find git repository root
    if ! GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
        # Not in a git repo - skip initialization gracefully
        return 0
    fi

    # Check if already initialized
    if [ -d "${GIT_ROOT}/.wrangler/issues" ]; then
        # Already initialized - skip
        return 0
    fi

    # Read directories from .wrangler/config/workspace-schema.json
    # Create git-tracked directories
    for dir in issues specifications ideas memos plans docs templates; do
        mkdir -p "${GIT_ROOT}/.wrangler/${dir}"
        touch "${GIT_ROOT}/.wrangler/${dir}/.gitkeep"
    done

    # Create runtime directories (not git-tracked)
    for dir in cache logs; do
        mkdir -p "${GIT_ROOT}/.wrangler/${dir}"
    done

    # Create archived subdirectories for issues and specifications
    mkdir -p "${GIT_ROOT}/.wrangler/issues/archived"
    mkdir -p "${GIT_ROOT}/.wrangler/specifications/archived"

    echo "✓ Initialized .wrangler/ directory structure at ${GIT_ROOT}" >&2
}
```

**Behavior**:
- Detects git repository root
- Reads directory structure from `.wrangler/config/workspace-schema.json`
- Creates `.wrangler/` directory with all subdirectories
- Adds `.gitkeep` files to track empty directories in git
- Creates `.wrangler/.gitignore` for runtime directories
- Idempotent (safe to run multiple times)
- Gracefully skips if not in git repository

#### 2. Legacy Configuration Check

```bash
legacy_skills_dir="${HOME}/.config/wrangler/skills"
if [ -d "$legacy_skills_dir" ]; then
    warning_message="⚠️ **WARNING:** Wrangler now uses Claude Code's skills system.
    Custom skills in ~/.config/wrangler/skills will not be read.
    Move custom skills to ~/.claude/skills instead."
fi
```

**Purpose**: Alert users who have outdated wrangler configurations from pre-plugin era

#### 3. Context Injection

```bash
# Read using-wrangler content
using_wrangler_content=$(cat "${PLUGIN_ROOT}/skills/using-wrangler/SKILL.md")

# Output as JSON for Claude Code
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>
You have wrangler.

**The content below is from skills/using-wrangler/SKILL.md:**

${using_wrangler_content}
</EXTREMELY_IMPORTANT>"
  }
}
EOF
```

**Injects**:
- Entire `using-wrangler` skill content (mandatory first response protocol)
- Legacy warnings if applicable
- Wrapped in `<EXTREMELY_IMPORTANT>` tags for visibility

---

## Workspace Initialization

### What Gets Initialized

On first session start in a git repository, wrangler creates the centralized `.wrangler/` directory:

```
project-root/
└── .wrangler/                    # Centralized wrangler workspace
    ├── issues/                   # Issue tracking (git-tracked)
    │   ├── completed/            # Archived completed issues
    │   └── .gitkeep
    ├── specifications/           # Feature specs (git-tracked)
    │   └── .gitkeep
    ├── ideas/                    # Ideas and proposals (git-tracked)
    │   └── .gitkeep
    ├── memos/                    # Reference material (git-tracked)
    │   └── .gitkeep
    ├── plans/                    # Implementation plans (git-tracked)
    │   └── .gitkeep
    ├── docs/                     # Auto-generated docs (git-tracked)
    │   └── .gitkeep
    ├── templates/                # Issue/spec templates (git-tracked)
    │   └── .gitkeep
    ├── cache/                    # Runtime cache (gitignored)
    ├── config/                   # Runtime config (gitignored)
    ├── logs/                     # Runtime logs (gitignored)
    └── .gitignore                # Ignores cache/, config/, logs/
```

### Initialization Logic

**Detection**:
1. Check if current directory is in a git repository (`git rev-parse --show-toplevel`)
2. If not in git repo → Skip gracefully (no error)
3. If in git repo → Proceed with initialization

**Creation**:
1. Check if `.wrangler/issues/` already exists
2. If exists → Skip (already initialized)
3. If missing → Create full directory structure

**Schema-Driven**:
- Reads `.wrangler/config/workspace-schema.json` from plugin directory
- Creates directories defined in schema
- Falls back to hardcoded defaults if schema not found

**Idempotency**:
- Safe to run multiple times
- No duplicate directories created
- No errors if already initialized

### Why `.gitkeep` Files?

Git doesn't track empty directories. The `.gitkeep` file ensures:
- Empty directories appear in git
- Users can commit initial project structure
- Directories survive `git clone` even when empty

**Note**: `.gitkeep` is a convention, not a git feature. Any file would work, but `.gitkeep` clearly communicates intent.

### Directory Purposes

| Directory | Purpose | Git Tracked |
|-----------|---------|-------------|
| `issues/` | Issue tracking files | Yes |
| `issues/archived/` | Archived closed/cancelled issues | Yes |
| `specifications/` | Feature specifications | Yes |
| `specifications/archived/` | Archived closed/cancelled specifications | Yes |
| `ideas/` | Ideas and proposals | Yes |
| `memos/` | Reference material, RCAs | Yes |
| `plans/` | Implementation plans | Yes |
| `docs/` | Auto-generated governance docs | Yes |
| `templates/` | Issue/spec templates | Yes |
| `cache/` | Runtime cache | No |
| `config/` | Configuration files | Yes |
| `logs/` | Runtime logs | No |

---

## Context Injection

### Purpose

Context injection ensures Claude Code **always** knows:
1. Wrangler is available
2. How to discover and use skills
3. Mandatory workflows (brainstorming before coding, TDD, etc.)
4. Where to find documentation

### Injection Mechanism

**Hook Output Format**:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>...</EXTREMELY_IMPORTANT>"
  }
}
```

**Claude Code Behavior**:
- Parses JSON from hook output
- Extracts `additionalContext` field
- Injects as system-level context in conversation
- Available for entire session (until next SessionStart)

### What Gets Injected

**Primary Content**: `skills/using-wrangler/SKILL.md`
- Mandatory first response protocol
- Skills discovery checklist
- Anti-rationalization warnings
- Constitutional principles enforcement

**Secondary Content**: Warnings and reminders
- Legacy configuration alerts
- Version update notifications
- Important announcements

### Context Visibility

**For Claude Code**:
- Context appears in system-level messages
- Wrapped in `<EXTREMELY_IMPORTANT>` tags
- Highly visible and prioritized

**For Users**:
- Context injection is invisible
- No clutter in conversation
- Effects visible through Claude's behavior (uses skills correctly)

---

## State Management

Wrangler manages state across multiple layers:

### 1. Session State (Transient)

**Lifetime**: Single Claude Code session

**Storage**: In-memory conversation context

**Contents**:
- Injected skill content
- Loaded governance documents
- Conversation history

**Reset**: Every SessionStart event

### 2. Workspace State (Persistent)

**Lifetime**: Permanent (git-tracked)

**Storage**: Files in `.wrangler/` directory

**Contents**:
- `.wrangler/issues/*.md` - Issue tracking
- `.wrangler/specifications/*.md` - Feature specifications
- `.wrangler/memos/*.md` - Reference material
- `.wrangler/ideas/*.md` - Ideas and proposals
- `.wrangler/plans/*.md` - Implementation plans
- `.wrangler/CONSTITUTION.md` - Project constitution
- `.wrangler/ROADMAP.md` - Strategic roadmap
- `.wrangler/ROADMAP_NEXT_STEPS.md` - Tactical tracker

**Versioned**: Yes (git commit history)

### 3. Plugin State (Static)

**Lifetime**: Until plugin update

**Storage**: Plugin installation directory

**Contents**:
- Skills (`skills/`)
- Templates (`skills/*/templates/`)
- Hooks (`hooks/`)
- Release notes (`skills/.wrangler-releases/`)

**Updated**: Only when plugin version changes

### 4. Cache State (Ephemeral)

**Lifetime**: Until manually cleared

**Storage**: `.wrangler/cache/` (gitignored)

**Contents**:
- MCP issue index
- Search optimization data
- Performance metrics
- Temporary workspaces

**Versioned**: No (gitignored)

### State Persistence Strategy

| State Type | Persistence | Git Tracked | Shared Across Sessions |
|------------|-------------|-------------|------------------------|
| Session Context | In-memory | No | No (reset each session) |
| Issues | File-based | Yes | Yes |
| Specifications | File-based | Yes | Yes |
| Governance | File-based | Yes | Yes |
| Memos | File-based | Yes | Yes |
| Cache | File-based | No | Yes |
| Config | File-based | No | Yes |

---

## Hook Configuration

### Configuration File

**Location**: `hooks/hooks.json`

**Format**:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/user-prompt-submit.sh"
          }
        ]
      }
    ]
  }
}
```

### Configuration Fields

**`matcher`**: Regex pattern matching session start triggers
- `startup` - Fresh Claude Code launch
- `resume` - Resuming from compact mode
- `clear` - After clearing conversation history
- `compact` - After compacting conversation

**`type`**: Hook execution type
- `command` - Execute shell command/script
- `inline` - Execute inline code (not used)

**`command`**: Shell command to execute
- `${CLAUDE_PLUGIN_ROOT}` - Automatically replaced with plugin directory path
- Relative paths resolved from plugin root

### Environment Variables

Available in hook execution context:

| Variable | Description | Example |
|----------|-------------|---------|
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory | `/Users/sam/.claude/plugins/wrangler` |
| `PWD` | Current working directory | `/Users/sam/code/myproject` |
| `HOME` | User home directory | `/Users/sam` |

**Custom Variables** (set by wrangler):
| Variable | Description | Set By |
|----------|-------------|--------|
| `SCRIPT_DIR` | Hook script directory | `session-start.sh` |
| `PLUGIN_ROOT` | Plugin root (computed) | `session-start.sh` |
| `GIT_ROOT` | Git repository root | `session-start.sh` |
| `SCHEMA_PATH` | Path to .wrangler/config/workspace-schema.json | `session-start.sh` |

---

## Troubleshooting

### Hook Not Running

**Symptom**: No workspace initialization, no context injection

**Causes**:
1. **Hook file missing**: `hooks/session-start.sh` deleted or corrupted
2. **Hook not executable**: Missing execute permission
3. **Invalid JSON**: `hooks/hooks.json` syntax error
4. **Claude Code version**: Hooks not supported in old versions

**Solutions**:
```bash
# Verify hook file exists
ls -la ~/.claude/plugins/wrangler/hooks/session-start.sh

# Check execute permission
chmod +x ~/.claude/plugins/wrangler/hooks/session-start.sh

# Validate JSON syntax
cat ~/.claude/plugins/wrangler/hooks/hooks.json | jq .

# Check Claude Code version (hooks require v2.0+)
/help
```

### Workspace Not Initialized

**Symptom**: No `.wrangler/` directory created

**Causes**:
1. **Not in git repository**: Hook skips initialization outside git repos
2. **Permission denied**: User lacks write permission to repository root
3. **Hook failed silently**: Error suppressed by `set -euo pipefail`

**Solutions**:
```bash
# Verify you're in a git repository
git rev-parse --show-toplevel

# Check write permissions
ls -ld $(git rev-parse --show-toplevel)

# Manually run hook to see errors
~/.claude/plugins/wrangler/hooks/session-start.sh

# Manually initialize if needed
mkdir -p $(git rev-parse --show-toplevel)/.wrangler/{issues,specifications,ideas,memos,plans,docs,templates,cache,config,logs}
```

### Context Not Injected

**Symptom**: Claude doesn't know about wrangler skills

**Causes**:
1. **Hook succeeded but JSON malformed**: Context not parsed
2. **Skill file missing**: `skills/using-wrangler/SKILL.md` not found
3. **Escape sequence error**: Special characters broke JSON

**Solutions**:
```bash
# Test hook output manually
~/.claude/plugins/wrangler/hooks/session-start.sh | jq .

# Verify skill file exists
cat ~/.claude/plugins/wrangler/skills/using-wrangler/SKILL.md

# Check for JSON escaping issues (look for unescaped quotes)
~/.claude/plugins/wrangler/hooks/session-start.sh | grep -o '"' | wc -l
```

### Legacy Warning Persists

**Symptom**: Warning about `~/.config/wrangler/skills` appears every session

**Cause**: Old skills directory still exists

**Solution**:
```bash
# Remove legacy directory (backup first if needed)
mv ~/.config/wrangler/skills ~/.config/wrangler/skills.backup
# Or delete permanently
rm -rf ~/.config/wrangler/skills
```

### Hook Runs But No Effect

**Symptom**: Hook executes successfully but changes not visible

**Causes**:
1. **Already initialized**: Directories existed, hook skipped creation
2. **Wrong directory**: Initialized different git repo than expected
3. **Cached state**: Claude Code using stale session state

**Solutions**:
```bash
# Verify initialization location
git rev-parse --show-toplevel

# Check if .wrangler directory exists
ls -la $(git rev-parse --show-toplevel)/.wrangler/

# Restart Claude Code to clear cached state
# (Exit and restart application)
```

---

## Advanced Topics

### Custom Hook Modifications

**Warning**: Modifying hook files can break wrangler functionality. Proceed with caution.

**To modify session-start hook**:
1. Copy original to backup: `cp hooks/session-start.sh hooks/session-start.sh.backup`
2. Edit `hooks/session-start.sh`
3. Test thoroughly: `./hooks/session-start.sh | jq .`
4. Verify JSON output is valid
5. Restart Claude Code to test

**To add additional hooks**:
1. Create new script in `hooks/` directory
2. Make executable: `chmod +x hooks/my-hook.sh`
3. Update `hooks/hooks.json` to reference new hook
4. Test manually before relying on it

### Hook Debugging

**Enable verbose output**:
```bash
# Add to top of session-start.sh (after set -euo pipefail)
set -x  # Print commands as they execute

# Run manually to see trace
bash -x ./hooks/session-start.sh
```

**Capture hook output**:
```bash
# Redirect stderr to file
./hooks/session-start.sh 2> /tmp/hook-debug.log

# View captured errors
cat /tmp/hook-debug.log
```

**Test JSON validity**:
```bash
# Pipe hook output to jq for validation
./hooks/session-start.sh | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

### Performance Considerations

**Hook execution time**:
- Typical: <100ms
- Reading workspace schema: ~5ms
- Reading skill file: ~20ms
- JSON escaping: ~10ms
- Directory creation: ~5ms (if needed)

**Optimization opportunities**:
- Cache skill content (avoid re-reading every session)
- Skip legacy checks after first warning
- Lazy initialization (only create directories when first needed)

**Current decision**: Prioritize simplicity over micro-optimizations. 100ms is acceptable for session start.

---

## Related Documentation

- [MCP Server Usage](mcp-usage.md) - How MCP interacts with workspace directories
- [Governance Framework](governance.md) - How governance files use workspace structure
- [Versioning](versioning.md) - Version tracking and updates

---

## Changelog

### v1.2.0 (2025-12-07)
- Updated to reflect centralized `.wrangler/` directory structure
- Added workspace-schema.json driven initialization
- Documented all subdirectories (ideas, memos, plans, etc.)
- Updated troubleshooting for new directory structure
- Added UserPromptSubmit hook to configuration

### v1.0.0 (2025-11-18)
- Initial documentation of session hooks system
- Documented workspace initialization workflow
- Explained context injection mechanism
- Added troubleshooting guide

---

**Last Updated**: 2025-12-07
**Maintainer**: Wrangler Team
**Status**: Current
