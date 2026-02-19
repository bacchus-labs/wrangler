---
id: ISS-000148
title: Add context efficiency parameters to issues_list
type: issue
status: closed
priority: medium
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T22:00:00.000Z'
updatedAt: '2026-02-18T03:39:18.684Z'
---
Add `format` parameter (full/summary/minimal) to issues_list tool. Default to 'summary' for token efficiency. Update schema, implementation, and tests. Ensure backward compatibility for existing calls.

Requirements: FR-001, FR-005
Spec: SPEC-000046

---
**Completion Notes (2026-02-18T03:39:18.673Z):**
FR-001 implemented in commit d9b66d3 (Feb 16 2026). The `format` parameter (full/summary/minimal) is live and working on `issues_list`.
