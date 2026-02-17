---
id: "000144"
title: "Update WorkflowResolver Path Resolution"
type: "issue"
status: "open"
priority: "low"
labels: ["workflow-engine", "auto-created"]
createdAt: "2026-02-16T00:00:09.000Z"
updatedAt: "2026-02-16T00:00:09.000Z"
---

## Description

Modify workflows/engine/src/resolver.ts to search .wrangler/orchestration/{kind}/ instead of .wrangler/{kind}/ for project-level assets (2 code changes at lines 48 and 63).

Spec: SPEC-000049-init-workspace-mcp-tool-idempotent-wrangler-direct

Requirements: FR-004, FR-005, FR-006
