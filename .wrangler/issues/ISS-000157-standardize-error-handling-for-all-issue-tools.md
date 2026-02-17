---
id: ISS-000157
title: Standardize error handling for all issue tools
type: issue
status: open
priority: medium
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T21:40:56.671Z'
updatedAt: '2026-02-16T21:40:56.671Z'
---
Migrate all issue tools from raw error objects to createErrorResponse() helper with MCPErrorCode. Rewrite error messages to include current state, what went wrong, and recovery guidance for LLM.

Requirements: FR-011, FR-012, FR-013
Spec: SPEC-000046
