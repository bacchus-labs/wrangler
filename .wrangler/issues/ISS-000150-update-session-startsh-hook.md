---
id: "000150"
title: "Update session-start.sh Hook"
type: "issue"
status: "open"
priority: "medium"
labels: ["workflow-engine", "auto-created"]
createdAt: "2026-02-16T00:01:03.000Z"
updatedAt: "2026-02-16T00:01:03.000Z"
---

## Description

Replace initialize_workspace() function in hooks/session-start.sh with thin bootstrap that creates minimal .wrangler/issues/ then delegates to init_workspace MCP tool with fix:true.

Spec: SPEC-000049-init-workspace-mcp-tool-idempotent-wrangler-direct

Requirements: FR-013
