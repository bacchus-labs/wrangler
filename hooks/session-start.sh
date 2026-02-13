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

# Path to the canonical workspace schema
SCHEMA_PATH="${PLUGIN_ROOT}/.wrangler/config/workspace-schema.json"

# Function to extract JSON value from schema
# Usage: extract_json_value "directories.issues.path"
extract_json_value() {
    local key="$1"
    local value=""

    # Check if jq is available for robust parsing
    if command -v jq >/dev/null 2>&1; then
        # Use jq for robust JSON parsing
        value=$(jq -r ".$key // empty" "$SCHEMA_PATH" 2>/dev/null || echo "")
    else
        # Fall back to grep/sed parsing (less robust but no dependencies)
        # For nested keys like "directories.issues.path", we need context-aware matching
        IFS='.' read -ra KEY_PARTS <<< "$key"

        if [ ${#KEY_PARTS[@]} -eq 3 ] && [ "${KEY_PARTS[0]}" = "directories" ]; then
            # Special handling for directories.{name}.path pattern
            local dir_name="${KEY_PARTS[1]}"
            local field_name="${KEY_PARTS[2]}"

            # Use Python for more reliable JSON parsing if available
            if command -v python3 >/dev/null 2>&1; then
                value=$(python3 -c "import json; f=open('$SCHEMA_PATH'); d=json.load(f); print(d.get('$KEY_PARTS[0]', {}).get('$dir_name', {}).get('$field_name', ''))" 2>/dev/null || echo "")
            elif command -v python >/dev/null 2>&1; then
                value=$(python -c "import json; f=open('$SCHEMA_PATH'); d=json.load(f); print(d.get('$KEY_PARTS[0]', {}).get('$dir_name', {}).get('$field_name', ''))" 2>/dev/null || echo "")
            else
                # Last resort: grep for the directory name then find path within the next few lines
                value=$(grep -A5 "\"$dir_name\":" "$SCHEMA_PATH" 2>/dev/null | grep "\"$field_name\"" | head -1 | sed 's/.*"'"$field_name"'" *: *"\([^"]*\)".*/\1/' || echo "")
            fi
        else
            # Simple key extraction for top-level fields
            local last_key="${KEY_PARTS[-1]}"
            value=$(grep "\"$last_key\"" "$SCHEMA_PATH" 2>/dev/null | head -1 | sed 's/.*"'"$last_key"'" *: *"\([^"]*\)".*/\1/' || echo "")
        fi
    fi

    echo "$value"
}

# Function to extract array values from JSON
# Usage: extract_json_array "gitignorePatterns"
extract_json_array() {
    local key="$1"
    local values=""

    if command -v jq >/dev/null 2>&1; then
        # Use jq to extract array as newline-separated values
        values=$(jq -r ".$key[]? // empty" "$SCHEMA_PATH" 2>/dev/null || echo "")
    else
        # Fall back to Python if available (more reliable than grep/sed)
        if command -v python3 >/dev/null 2>&1; then
            values=$(python3 -c "import json; f=open('$SCHEMA_PATH'); d=json.load(f); print('\n'.join(d.get('$key', [])))" 2>/dev/null || echo "")
        elif command -v python >/dev/null 2>&1; then
            values=$(python -c "import json; f=open('$SCHEMA_PATH'); d=json.load(f); print('\n'.join(d.get('$key', [])))" 2>/dev/null || echo "")
        else
            # Last resort: grep/sed parsing
            # Find the array, extract strings until closing bracket
            values=$(sed -n "/\"$key\"/,/\]/p" "$SCHEMA_PATH" 2>/dev/null | grep '"' | grep -v "$key" | sed 's/.*"\([^"]*\)".*/\1/' | grep '/' || echo "")
        fi
    fi

    echo "$values"
}

# Function to validate schema file
validate_schema() {
    if [ ! -f "$SCHEMA_PATH" ]; then
        echo "Warning: workspace-schema.json not found at $SCHEMA_PATH" >&2
        return 1
    fi

    # Check if file is valid JSON (if jq available)
    if command -v jq >/dev/null 2>&1; then
        if ! jq empty "$SCHEMA_PATH" 2>/dev/null; then
            echo "Error: workspace-schema.json is malformed JSON" >&2
            return 1
        fi
    fi

    # Check for required fields
    local version=$(extract_json_value "version")
    if [ -z "$version" ]; then
        echo "Warning: workspace-schema.json missing version field" >&2
    fi

    return 0
}

# Initialize .wrangler/ directory structure based on workspace-schema.json
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

    # Read directories from workspace-schema.json if it exists
    if [ -f "$SCHEMA_PATH" ] && validate_schema; then
        # Extract directory paths from schema using robust JSON parsing
        # Create git-tracked directories
        for dir in issues specifications ideas memos plans docs; do
            dir_path=$(extract_json_value "directories.${dir}.path")
            if [ -n "$dir_path" ]; then
                mkdir -p "${GIT_ROOT}/${dir_path}"
                touch "${GIT_ROOT}/${dir_path}/.gitkeep"
            fi
        done

        # Create runtime directories (not git-tracked)
        for dir in cache logs; do
            dir_path=$(extract_json_value "directories.${dir}.path")
            if [ -n "$dir_path" ]; then
                mkdir -p "${GIT_ROOT}/${dir_path}"
            fi
        done

        # Create archived subdirectories for issues and specifications
        mkdir -p "${GIT_ROOT}/.wrangler/issues/archived"
        mkdir -p "${GIT_ROOT}/.wrangler/specifications/archived"
    else
        # Fallback to hardcoded defaults if schema not found
        mkdir -p "${GIT_ROOT}/.wrangler/issues"
        mkdir -p "${GIT_ROOT}/.wrangler/issues/archived"
        mkdir -p "${GIT_ROOT}/.wrangler/specifications"
        mkdir -p "${GIT_ROOT}/.wrangler/specifications/archived"
        mkdir -p "${GIT_ROOT}/.wrangler/ideas"
        mkdir -p "${GIT_ROOT}/.wrangler/memos"
        mkdir -p "${GIT_ROOT}/.wrangler/plans"
        mkdir -p "${GIT_ROOT}/.wrangler/docs"
        mkdir -p "${GIT_ROOT}/.wrangler/cache"
        mkdir -p "${GIT_ROOT}/.wrangler/config"
        mkdir -p "${GIT_ROOT}/.wrangler/logs"

        # Add .gitkeep files for git-tracked directories
        touch "${GIT_ROOT}/.wrangler/issues/.gitkeep"
        touch "${GIT_ROOT}/.wrangler/specifications/.gitkeep"
        touch "${GIT_ROOT}/.wrangler/ideas/.gitkeep"
        touch "${GIT_ROOT}/.wrangler/memos/.gitkeep"
        touch "${GIT_ROOT}/.wrangler/plans/.gitkeep"
        touch "${GIT_ROOT}/.wrangler/docs/.gitkeep"
    fi

    # Create .gitignore for runtime directories (read patterns from schema if available)
    if [ -f "$SCHEMA_PATH" ]; then
        # Extract gitignore patterns from schema using robust JSON parsing
        gitignore_patterns=$(extract_json_array "gitignorePatterns")
        if [ -z "$gitignore_patterns" ]; then
            # Fallback if extraction failed
            gitignore_patterns="cache/
logs/
sessions/"
        fi
    else
        gitignore_patterns="cache/
logs/
sessions/"
    fi

    cat > "${GIT_ROOT}/.wrangler/.gitignore" <<GITIGNORE
# Wrangler gitignore - generated from workspace-schema.json

# Runtime data (don't commit)
${gitignore_patterns}

# Backup directories (temporary)
../.wrangler-migration-backup-*/

# Migration markers (local)
SKIP_AUTO_MIGRATION
REMIND_NEXT_SESSION
GITIGNORE

    echo "✓ Initialized .wrangler/ directory structure (v1.2.0) at ${GIT_ROOT}" >&2
}

# Run workspace initialization
initialize_workspace

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
