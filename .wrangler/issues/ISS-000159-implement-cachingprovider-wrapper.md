---
id: ISS-000159
title: Implement CachingProvider wrapper
type: issue
status: open
priority: high
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T21:41:07.192Z'
updatedAt: '2026-02-16T21:41:07.192Z'
---
Create CachingProvider class that wraps MarkdownIssueProvider with in-memory cache (Map) for issue metadata. Implement TTL-based expiry (default 60s), write-through invalidation, lazy population, and concurrent access handling.

Requirements: FR-014, FR-015, FR-017
Spec: SPEC-000046
