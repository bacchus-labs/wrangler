#!/usr/bin/env bash
# Update wrangler plugin - clears all caching layers
#
# Usage:
#   ./update-wrangler.sh              # Run directly
#   source update-wrangler.sh         # Source to get update-wrangler function
#   update-wrangler                   # Call function after sourcing
#
# Can also be added to ~/.zshrc or ~/.bashrc:
#   source /path/to/update-wrangler.sh

set -euo pipefail

update-wrangler() {
  local plugins_dir="$HOME/.claude/plugins"
  local installed_json="$plugins_dir/installed_plugins.json"

  # Verify plugins directory exists
  if [ ! -d "$plugins_dir" ]; then
    echo "Error: Claude plugins directory not found at $plugins_dir"
    return 1
  fi

  # Find marketplace name from installed_plugins.json
  local marketplace
  marketplace=$(grep -o '"wrangler@[^"]*"' "$installed_json" 2>/dev/null | head -1 | sed 's/"wrangler@\([^"]*\)"/\1/')

  if [ -z "$marketplace" ]; then
    echo "Error: Could not find wrangler installation in $installed_json"
    return 1
  fi

  echo "Found wrangler installed from marketplace: $marketplace"

  # 1. Update marketplace clone
  local marketplace_dir="$plugins_dir/marketplaces/$marketplace"
  if [ -d "$marketplace_dir" ]; then
    echo "Updating marketplace clone..."
    (cd "$marketplace_dir" && git fetch origin && git reset --hard origin/main)
    echo "Marketplace updated to: $(cd "$marketplace_dir" && git log --oneline -1)"
  else
    echo "Warning: Marketplace directory not found at $marketplace_dir"
  fi

  # 2. Clear plugin cache
  local cache_dir="$plugins_dir/cache/$marketplace/wrangler"
  if [ -d "$cache_dir" ]; then
    echo "Clearing plugin cache..."
    rm -rf "$cache_dir"
    echo "Cache cleared."
  else
    echo "Cache directory not found (may already be cleared)."
  fi

  # 3. Rebuild MCP bundle (CRITICAL - Claude Code doesn't run postinstall)
  echo "Rebuilding MCP bundle..."
  if [ -d "$marketplace_dir" ]; then
    (cd "$marketplace_dir" && npm install)
    echo "MCP bundle rebuilt."
  else
    echo "Warning: Cannot rebuild MCP bundle - marketplace directory not found."
  fi

  # 4. Reset installed_plugins.json entry
  echo "Resetting installed_plugins.json entry..."
  if command -v jq &> /dev/null; then
    jq --arg key "wrangler@$marketplace" '.plugins[$key] = []' "$installed_json" > /tmp/installed_plugins.json && \
    mv /tmp/installed_plugins.json "$installed_json"
    echo "installed_plugins.json updated."
  else
    echo ""
    echo "jq not installed. Please manually edit $installed_json"
    echo "Set \"wrangler@$marketplace\" to []"
    echo ""
    return 1
  fi

  echo ""
  echo "Done! Restart Claude Code to complete the update."
}

# If script is run directly (not sourced), execute the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  update-wrangler "$@"
fi
