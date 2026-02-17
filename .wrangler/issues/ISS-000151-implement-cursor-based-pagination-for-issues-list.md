---
id: "ISS-000151"
title: "Implement cursor-based pagination for issues_list"
type: "issue"
status: "open"
priority: "high"
labels:
  - "workflow-engine"
  - "auto-created"
createdAt: "2026-02-16T22:00:03.000Z"
updatedAt: "2026-02-16T22:00:03.000Z"
---

Add cursor-based pagination per MCP spec 2025-03-26. Implement opaque Base64-encoded cursors, nextCursor in responses, and explicit text prompts for next page. Deprecate offset parameter but maintain backward compatibility.

Requirements: FR-004, FR-005
Spec: SPEC-000046
