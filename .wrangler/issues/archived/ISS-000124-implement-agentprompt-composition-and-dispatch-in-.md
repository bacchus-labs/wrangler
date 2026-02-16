---
id: ISS-000124
title: Implement agent+prompt composition and dispatch in engine
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:29:35.878Z'
updatedAt: '2026-02-16T03:12:31.722Z'
project: SPEC-000047
---
## Summary

This is the core engine change. When the engine encounters a step with `agent:` and `prompt:`, it must:

1. Resolve agent file via WorkflowResolver
2. Resolve prompt file via WorkflowResolver
3. Load agent (system prompt, tools, model)
4. Load prompt (task instructions, template vars)
5. Render prompt body with Mustache template variables from context
6. Dispatch subagent with composed prompt, tools, model, and worktree as working dir
7. Capture structured output into named variable
8. Record result in audit trail

## Composition Logic

```
System prompt = agent body
User prompt = rendered prompt body
Tools = agent's tool list
Model = step override > agent default > workflow default
Working directory = worktree path from session context
```

## Changes to engine.ts

- Replace or modify the existing `agent` step type handling
- When a step has both `agent:` and `prompt:` fields, use new composition path
- When a step has only the old `agent:` field pointing to a .md file, maintain backward compat during migration (can be removed after migration)
- Pass worktree path as working directory to query function
- Record agent source (project/builtin) and prompt source in audit trail

## Output Handling (FR-2c)

- Store subagent output as-is into the named output variable
- No schema validation at engine level
- Audit trail records raw output

## Dependencies

- ISS-000121 (WorkflowResolver)
- ISS-000122 (agent/prompt loaders)
- ISS-000123 (updated schema)

## Files

- Modify: `workflows/engine/src/engine.ts`
- Tests: `workflows/engine/src/__tests__/engine-composition.test.ts`
