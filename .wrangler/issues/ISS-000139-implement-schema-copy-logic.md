---
id: "000139"
title: "Implement Schema Copy Logic"
type: "issue"
status: "open"
priority: "low"
labels: ["workflow-engine", "auto-created"]
createdAt: "2026-02-16T00:00:04.000Z"
updatedAt: "2026-02-16T00:00:04.000Z"
---

## Description

Copy workspace-schema.json from plugin directory to .wrangler/config/workspace-schema.json if missing or if plugin version is newer.

Spec: SPEC-000049-init-workspace-mcp-tool-idempotent-wrangler-direct

Requirements: FR-011, FR-012
