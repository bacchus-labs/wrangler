---
id: "000147"
title: "Update computed aggregations to use cache"
type: "issue"
status: "open"
priority: "low"
labels:
  - "workflow-engine"
  - "auto-created"
assignee: ""
project: ""
createdAt: "2026-02-16T21:14:27.141Z"
updatedAt: "2026-02-16T21:14:27.141Z"
---

## Description

Modify getLabels(), getProjects(), getAssignees() methods to use cache instead of re-reading all files.

Requirements: FR-017
Spec: SPEC-000046
