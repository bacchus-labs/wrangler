---
id: ISS-000106
title: Audit log memory management for large workflows
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - v2
  - performance
createdAt: '2026-02-12T17:31:07.697Z'
updatedAt: '2026-02-12T17:31:07.697Z'
project: Deterministic Pipeline
---
## Context

From code review of the workflow engine (PR #26).

The `auditLog` array in `engine.ts` grows without bound during workflow execution. For workflows with many tasks (100+ tasks with review loops), this could accumulate thousands of entries in memory.

## Proposed Fix

Options:
- Configurable max audit log size with ring-buffer behavior
- Periodic flush to session storage instead of keeping all entries in memory
- Stream-based approach that writes to JSONL as entries are created (via the existing `onAuditEntry` callback)

## Priority

Low -- practical spec-implementation workflows have 5-20 tasks. This only matters for very large workflows.
