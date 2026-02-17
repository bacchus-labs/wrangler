---
id: ISS-000161
title: Wire CachingProvider into factory
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T21:43:04.221Z'
updatedAt: '2026-02-16T21:43:04.221Z'
---
Update ProviderFactory to instantiate CachingProvider wrapping MarkdownIssueProvider. Add WRANGLER_MCP_CACHE environment variable to allow disabling cache (default: enabled).

Requirements: FR-014
Spec: SPEC-000046
