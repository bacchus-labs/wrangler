#!/usr/bin/env bash
# SessionStart hook for wrangler plugin

set -euo pipefail

# Determine plugin root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Verify MCP bundle exists, rebuild if missing
# This handles cases where plugin was updated but npm install wasn't run
MCP_BUNDLE="${PLUGIN_ROOT}/mcp/dist/bundle.cjs"
if [ ! -f "$MCP_BUNDLE" ]; then
    echo "MCP bundle missing, rebuilding..." >&2
    (cd "$PLUGIN_ROOT" && npm install 2>/dev/null) || true
fi

# Verify workflow engine is built, rebuild if missing
ENGINE_CLI="${PLUGIN_ROOT}/workflows/engine/dist/cli.js"
if [ ! -f "$ENGINE_CLI" ]; then
    echo "Workflow engine not built, building..." >&2
    (cd "$PLUGIN_ROOT" && npm run build:engine 2>/dev/null) || true
fi

# Thin bootstrap: create minimal .wrangler/issues/ so the MCP server can start.
# Full workspace initialization is delegated to the init_workspace MCP tool.
bootstrap_workspace() {
    # Find git repository root
    if ! GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
        # Not in a git repo - skip bootstrap gracefully
        return 0
    fi

    # Create minimal structure required for MCP server to function.
    # The init_workspace MCP tool (with fix:true) handles the full
    # schema-driven directory creation, asset provisioning, config
    # generation, and .gitignore management.
    mkdir -p "${GIT_ROOT}/.wrangler/issues"
    touch "${GIT_ROOT}/.wrangler/issues/.gitkeep"
}

# Run workspace bootstrap
bootstrap_workspace

# Check if legacy skills directory exists and build warning
warning_message=""
legacy_skills_dir="${HOME}/.config/wrangler/skills"
if [ -d "$legacy_skills_dir" ]; then
    warning_message="\n\n<important-reminder>IN YOUR FIRST REPLY AFTER SEEING THIS MESSAGE YOU MUST TELL THE USER:⚠️ **WARNING:** Wrangler now uses Claude Code's skills system. Custom skills in ~/.config/wrangler/skills will not be read. Move custom skills to ~/.claude/skills instead. To make this message go away, remove ~/.config/wrangler/skills</important-reminder>"
fi

# Read using-wrangler content
using_wrangler_content=$(cat "${PLUGIN_ROOT}/skills/using-wrangler/SKILL.md" 2>&1 || echo "Error reading using-wrangler skill")

# Escape outputs for JSON
using_wrangler_escaped=$(echo "$using_wrangler_content" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}')
warning_escaped=$(echo "$warning_message" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}')

# Output context injection as JSON
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<EXTREMELY_IMPORTANT>\nYou have wrangler.\n\n**The content below is from skills/using-wrangler/SKILL.md - your introduction to using skills:**\n\n${using_wrangler_escaped}\n\n${warning_escaped}\n</EXTREMELY_IMPORTANT>"
  }
}
EOF

exit 0
