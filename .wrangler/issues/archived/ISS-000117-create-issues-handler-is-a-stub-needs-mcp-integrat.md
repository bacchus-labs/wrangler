---
id: ISS-000117
title: create-issues handler is a stub - needs MCP integration
type: issue
status: closed
priority: medium
labels:
  - enhancement
  - engine
  - mcp-integration
  - dogfood
createdAt: '2026-02-12T21:48:41.535Z'
updatedAt: '2026-02-15T01:43:48.756Z'
project: Workflow Engine
---
## Issue

The `create-issues` handler in `workflows/engine/src/handlers/create-issues.ts` is a stub that doesn't actually create MCP issues. It just maps the analysis tasks in memory and stores them in the workflow context.

## Current Code

```typescript
// In a real workflow, this would call the MCP issues_create tool
// via the session's MCP server. For now, we just prepare the task
// list in the context so the per-task phase can iterate.
```

## Expected Behavior

The handler should:
1. Call the MCP `issues_create` tool for each task from the analysis
2. Map the returned issue IDs (ISS-XXXXXX) back to the tasks
3. Store both the MCP issue IDs and task data in context
4. This enables traceability between engine tasks and MCP issues

## Impact

Without MCP issue creation, the engine's tasks are ephemeral - they only exist in the workflow context/checkpoint. There's no persistent tracking of what was planned vs what was implemented.

## Implementation Notes

The handler has access to `WorkflowContext` which has `mcpServers` config. The handler would need to either:
- Call the MCP server directly via the SDK
- Or spawn a lightweight agent to create issues via MCP tools

---
**Completion Notes (2026-02-15T01:43:48.748Z):**
Completed: Implemented create-issues handler with MCP integration. The handler now calls the MCP issues_create tool for each task from the analysis, maps returned issue IDs back to tasks, and stores both MCP issue IDs and task data in the workflow context for traceability between engine tasks and persistent MCP issues.
