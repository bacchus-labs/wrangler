---
id: "000145"
title: "Implement CachingProvider wrapper"
type: "issue"
status: "open"
priority: "high"
labels:
  - "workflow-engine"
  - "auto-created"
assignee: ""
project: ""
createdAt: "2026-02-16T21:14:14.932Z"
updatedAt: "2026-02-16T21:14:14.932Z"
---

## Description

Create in-memory caching layer for issue metadata with TTL (default 60s) and write-through invalidation. Wraps MarkdownIssueProvider.

Requirements: FR-014, FR-015
Spec: SPEC-000046
