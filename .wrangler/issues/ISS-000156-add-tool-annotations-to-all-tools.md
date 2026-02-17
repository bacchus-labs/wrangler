---
id: ISS-000156
title: Add tool annotations to all tools
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T21:40:51.081Z'
updatedAt: '2026-02-16T21:40:51.081Z'
---
Add MCP tool annotations (readOnlyHint, destructiveHint, idempotentHint) to all 16 existing tools plus 3 new tools. Update server.ts tool definitions with correct annotation values per FR-010 specification.

Requirements: FR-009, FR-010
Spec: SPEC-000046
