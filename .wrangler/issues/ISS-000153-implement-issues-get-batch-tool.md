---
id: "ISS-000153"
title: "Implement issues_get_batch tool"
type: "issue"
status: "open"
priority: "medium"
labels:
  - "workflow-engine"
  - "auto-created"
createdAt: "2026-02-16T22:00:05.000Z"
updatedAt: "2026-02-16T22:00:05.000Z"
---

Create new issues_get_batch tool that accepts array of issue IDs (max 50) and returns all matching issues in single response. Support same `fields` parameter as issues_get. Handle partial failures with notFound array in metadata.

Requirements: FR-006
Spec: SPEC-000046
