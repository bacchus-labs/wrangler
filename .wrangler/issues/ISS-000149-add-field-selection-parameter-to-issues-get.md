---
id: "ISS-000149"
title: "Add field selection parameter to issues_get"
type: "issue"
status: "open"
priority: "medium"
labels:
  - "workflow-engine"
  - "auto-created"
createdAt: "2026-02-16T22:00:01.000Z"
updatedAt: "2026-02-16T22:00:01.000Z"
---

Add optional `fields` parameter to issues_get tool allowing clients to request specific fields (title, status, labels, etc.). When omitted, return full content for backward compatibility.

Requirements: FR-002
Spec: SPEC-000046
