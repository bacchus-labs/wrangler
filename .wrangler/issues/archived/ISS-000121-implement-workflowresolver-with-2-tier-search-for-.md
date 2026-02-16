---
id: ISS-000121
title: >-
  Implement WorkflowResolver with 2-tier search for workflows, agents, and
  prompts
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:28:55.919Z'
updatedAt: '2026-02-16T03:12:30.436Z'
project: SPEC-000047
---
## Summary

Create a `WorkflowResolver` class that implements 2-tier template resolution:

1. Project level (`.wrangler/workflows/`, `.wrangler/agents/`, `.wrangler/prompts/`) - highest priority
2. Builtin level (`workflows/`, `agents/`, `prompts/` in wrangler plugin dir) - lowest priority

First match wins. Resolution applies uniformly to workflows (.yaml), agents (.md), and prompts (.md).

## Requirements (FR-1)

- `resolveWorkflow(name)` -> searches project then builtin for `{name}.yaml`
- `resolveAgent(name)` -> searches project then builtin for `{name}.md`
- `resolvePrompt(name)` -> searches project then builtin for `{name}.md`
- Each returns the resolved file path AND the resolution source (project or builtin) for audit trail
- Constructor takes `projectRoot` (for .wrangler/ paths) and `pluginRoot` (for builtin paths)

## Files

- Create: `workflows/engine/src/resolver.ts`
- Create: `workflows/engine/src/__tests__/resolver.test.ts`

## Testing

- Resolution ordering: project overrides builtin
- Builtin fallback when project file doesn't exist
- New project-only files found alongside builtin files
- Missing file throws clear error
- Mock filesystem (use tmp dirs)
