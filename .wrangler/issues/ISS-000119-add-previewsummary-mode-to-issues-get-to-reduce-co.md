---
id: ISS-000119
title: Add preview/summary mode to issues_get to reduce context waste
type: issue
status: open
priority: medium
labels:
  - mcp
  - dx
  - context-efficiency
createdAt: '2026-02-13T20:44:19.919Z'
updatedAt: '2026-02-13T20:44:19.919Z'
---
## Problem

When agents need to find a specific spec or issue among many, they currently must call `issues_get` which returns the full markdown body. For specs, this can be 10-12k tokens each. An agent reviewing 5-10 specs to find the right ones burns 50-100k tokens just on exploration.

Example from real session:
```
issues_get (id: "SPEC-000044")
  Warning: Large MCP response (~10.5k tokens), this can fill up context quickly

issues_get (id: "SPEC-000042")
  Warning: Large MCP response (~12.2k tokens), this can fill up context quickly
```

## Proposed Solution

Add a preview/summary mode that returns frontmatter + a truncated excerpt of the description, giving agents enough to determine relevance without consuming the full body.

Options to consider:

### Option A: Add `preview` flag to `issues_get`
```
issues_get(id: "SPEC-000044", preview: true)
```
Returns: frontmatter (title, status, labels, priority, dates) + first ~200 chars of description body.

### Option B: Add `include` parameter for field selection
```
issues_get(id: "SPEC-000044", include: ["frontmatter", "summary"])
```
More flexible but more complex.

### Option C: Enhance `issues_list` with optional summary field
```
issues_list(status: ["open"], type: "specification", includeSummary: true)
```
Returns list results with a short excerpt per item. This might be the most practical since the typical workflow is "list specs, find the right one, then get full content."

### Option D: New `issues_preview` tool
Dedicated tool that returns compact previews of one or more issues by ID.

## Context

- The context window is a shared resource -- exploration shouldn't consume a large fraction of it
- `issues_list` already returns compact metadata but no description content at all
- `issues_search` helps when you know keywords, but not when browsing by topic
- This is especially painful for specifications which tend to be long

## Acceptance Criteria

- Agent can explore specs/issues to assess relevance without fetching full content
- Preview response should be under ~500 tokens per item
- Full `issues_get` behavior unchanged for backward compatibility
