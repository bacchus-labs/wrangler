# Wrangler Hooks System

This directory contains session hooks that automatically execute during Claude Code workflows.

## Overview

Wrangler uses Claude Code's hook system to:

1. **Initialize workspace** - Automatically create `.wrangler/` directory structure on session start

## Available Hooks

### SessionStart Hook

**File**: `session-start.sh`

**When it runs**: Every time a Claude Code session starts (startup, resume, clear, compact)

**What it does**:
- Detects git repository root
- Creates `.wrangler/` directory structure if not present:
  - `.wrangler/issues/` - Issue tracking
  - `.wrangler/specifications/` - Feature specifications
  - `.wrangler/memos/` - Reference material and RCA archives
  - `.wrangler/logs/` - Runtime logs (gitignored)
  - `.wrangler/governance/` - Constitution, roadmap, next steps
  - `.wrangler/docs/` - Auto-generated governance documentation
- Injects wrangler context into the session
- Exits successfully to allow Claude Code to proceed

**Configuration**: Registered in `hooks.json` with matcher `startup|resume|clear|compact`

## Hook Configuration

Hooks are registered in `hooks/hooks.json`:

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
    ]
  }
}
```

**Variables**:
- `${CLAUDE_PLUGIN_ROOT}` - Absolute path to wrangler plugin directory

## Troubleshooting

### Hook Not Running

**Check hook is executable**:
```bash
ls -la hooks/session-start.sh
# Should show: -rwxr-xr-x (executable)
```

**Make it executable**:
```bash
chmod +x hooks/session-start.sh
```

**Verify hook registration**:
```bash
cat hooks/hooks.json | jq '.hooks.SessionStart'
```

### Hook Blocking Claude Code

If the hook script hangs or times out, it can block Claude Code from starting.

**Common causes**:
- Git command hanging
- Filesystem issues (disk full, permissions)

**Solution**: Ensure hook exits quickly (< 1 second). Current implementation includes:
- Fallback values for error cases
- `2>/dev/null` to suppress errors
- `exit 0` to always succeed

## See Also

- **[Session Hooks Documentation](https://code.claude.com/docs/en/hooks)** - Official Claude Code hooks reference
- **[Wrangler MCP Usage Guide](../docs/mcp-usage.md)** - Issue and specification tracking
- **[Wrangler Governance Guide](../docs/governance.md)** - Constitution and roadmap system
