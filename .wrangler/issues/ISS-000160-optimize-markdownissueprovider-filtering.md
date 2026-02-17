---
id: ISS-000160
title: Optimize MarkdownIssueProvider filtering
type: issue
status: open
priority: medium
labels:
  - workflow-engine
  - auto-created
createdAt: '2026-02-16T21:42:54.960Z'
updatedAt: '2026-02-16T21:42:54.960Z'
---
Update listIssues() to filter by filename/frontmatter before reading full file content when query doesn't require description search. Only read full files for issues passing filters AND when format requires description.

Requirements: FR-016
Spec: SPEC-000046
