---
id: "000001"
title: "Fix update-yourself skill missing npm install step for MCP bundle"
type: "issue"
status: "closed"
priority: "critical"
labels: ["bug", "mcp", "update-yourself"]
assignee: ""
project: ""
createdAt: "2026-01-18T00:00:00.000Z"
updatedAt: "2026-01-18T00:00:00.000Z"
closedAt: "2026-01-18T00:00:00.000Z"
wranglerContext:
  agentId: "claude-code"
  parentTaskId: ""
  estimatedEffort: "30 minutes"
---

# Fix update-yourself skill missing npm install step for MCP bundle

## Problem

The update-yourself skill cleared the plugin cache but did not instruct users to run \`npm install\` to rebuild the MCP bundle. Claude Code's plugin system copies files from the marketplace clone but does not run postinstall scripts.

This caused the MCP server to fail to start with:
\`\`\`
Cannot find module 'mcp/dist/bundle.cjs'
\`\`\`

## Root Cause

1. Plugin cached at \`~/.claude/plugins/cache/.../wrangler/\`
2. MCP server requires \`mcp/dist/bundle.cjs\` (built by postinstall script)
3. Update-yourself skill cleared cache but didn't rebuild bundle
4. Claude Code copies files but doesn't run \`npm install\`

## Solution

Added \`npm install\` step to:
1. \`skills/update-yourself/SKILL.md\` - Step 3 now rebuilds MCP bundle
2. \`skills/update-yourself/scripts/update-wrangler.sh\` - Script now runs npm install
3. \`hooks/session-start.sh\` - Safety check rebuilds bundle if missing

## Files Changed

- \`skills/update-yourself/SKILL.md\`
- \`skills/update-yourself/scripts/update-wrangler.sh\`
- \`hooks/session-start.sh\`
