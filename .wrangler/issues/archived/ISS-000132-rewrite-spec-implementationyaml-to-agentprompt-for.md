---
id: ISS-000132
title: Rewrite spec-implementation.yaml to agent+prompt format and remove gate-group
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
  - migration
createdAt: '2026-02-16T02:31:03.613Z'
updatedAt: '2026-02-16T03:12:34.948Z'
project: SPEC-000047
---
## Summary

Migrate the existing spec-implementation.yaml to the new format with agent+prompt steps, parallel groups, and inline configuration. Remove the gate-group step type entirely.

## Current State

The existing workflow uses:
- `type: agent` steps pointing to agent .md files
- `type: gate-group` for review gates (discovers .md files in directory)
- No parallel execution
- No agent/prompt separation

## Target State

Use the workflow definition from the spec:
- `agent:` + `prompt:` fields on steps
- `type: parallel` for review groups
- `defaults.agent` and `defaults.model` at workflow level
- `safety:` block with limits
- Remove gate-group references

## Key Changes

1. Replace `type: agent, agent: agents/analyzer.md` with `agent: planner, prompt: analyze-spec.md`
2. Replace `type: gate-group, gates: review-gates/` with `type: parallel` containing individual review steps
3. Add `safety:` and `defaults:` blocks
4. Update fix-loop to reference new prompt names
5. Remove all gate-group related code from engine.ts

## Files

- Modify: `workflows/spec-implementation.yaml`
- Modify: `workflows/engine/src/engine.ts` (remove gate-group handling)
- Delete: `workflows/agents/` directory (content migrated to top-level `agents/`)
- Delete: `workflows/review-gates/` directory (content migrated to top-level `prompts/`)
- Tests: update all tests referencing old format

## Dependencies

- ISS-000123 (new schema)
- ISS-000124 (agent+prompt composition)
- ISS-000125 (parallel step type)
- ISS-000130 (builtin agents)
- ISS-000131 (builtin prompts)
