---
id: "000148"
title: "Write Unit Tests for init_workspace Tool"
type: "issue"
status: "open"
priority: "high"
labels: ["workflow-engine", "auto-created"]
createdAt: "2026-02-16T00:01:01.000Z"
updatedAt: "2026-02-16T00:01:01.000Z"
---

## Description

Create comprehensive test suite at mcp/__tests__/tools/workspace/init.test.ts covering all 12 scenarios: fresh workspace, existing compliant workspace, missing dirs, customized assets, partial assets, report-only mode, apply mode, gitignore idempotency, gitignore custom entries, config not overwritten, schema version check, no git repo.

Spec: SPEC-000049-init-workspace-mcp-tool-idempotent-wrangler-direct

Requirements: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013
