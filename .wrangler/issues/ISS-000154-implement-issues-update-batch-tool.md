---
id: ISS-000154
title: Implement issues_update_batch tool
type: issue
status: open
priority: medium
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T21:40:39.888Z'
updatedAt: '2026-02-16T21:40:39.888Z'
---
Create new issues_update_batch tool that accepts array of {id, ...fields} update objects (max 50). Apply all updates and return summary of successes and failures. Support partial failures.

Requirements: FR-007
Spec: SPEC-000046
