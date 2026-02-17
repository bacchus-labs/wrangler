---
id: "000137"
title: "Implement Builtin Asset Provisioning"
type: "issue"
status: "open"
priority: "medium"
labels: ["workflow-engine", "auto-created"]
createdAt: "2026-02-16T00:00:02.000Z"
updatedAt: "2026-02-16T00:00:02.000Z"
---

## Description

Add file copying logic for agents (6 files), prompts (13 files), and workflows (2 files) from plugin workflows/ directory to .wrangler/orchestration/ subdirectories, with existence checks to prevent overwriting.

Spec: SPEC-000049-init-workspace-mcp-tool-idempotent-wrangler-direct

Requirements: FR-004, FR-005, FR-006, FR-012, FR-013
