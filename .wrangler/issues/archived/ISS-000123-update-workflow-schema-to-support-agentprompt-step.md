---
id: ISS-000123
title: Update workflow schema to support agent+prompt step model
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:29:21.977Z'
updatedAt: '2026-02-16T03:12:31.277Z'
project: SPEC-000047
---
## Summary

Update the workflow YAML schema to support the new agent+prompt step model. Steps now reference an `agent:` and `prompt:` instead of `agent:` being a file path to an agent markdown file.

## Changes to Step Schema

Current step type `agent` dispatches a single agent markdown file. Replace with:

```yaml
- name: review-code-quality
  agent: reviewer          # agent name (resolved via WorkflowResolver)
  prompt: code-quality-review.md  # prompt name (resolved via WorkflowResolver)
  output: codeQualityReview
  model: haiku             # optional: overrides agent default
  enabled: true            # optional: default true
  condition: someVar.check # optional: skip if false
  input:                   # optional: context vars to pass
    key: value
```

## Workflow-Level Changes

Add `defaults.agent` to workflow config:

```yaml
defaults:
  agent: implementer   # default agent for steps that don't specify one
  model: opus
  permissionMode: bypassPermissions
```

## New Step Type: parallel

```yaml
- name: reviews
  type: parallel
  steps:
    - name: review-a
      agent: reviewer
      prompt: a.md
      output: resultA
```

## Requirements

- Update Zod schema in `workflows/engine/src/schemas/workflow.ts`
- `agent` field on steps is a string (agent name), not a file path
- `prompt` field on steps is a string (prompt filename)
- If step has no `agent`, engine uses `defaults.agent`
- `enabled` field (boolean, default true)
- `parallel` step type with nested `steps` array
- Keep backward compat with `type: code`, `type: loop`, `type: per-task`
- Remove `type: gate-group` (replaced by agent+prompt model)

## Files

- Modify: `workflows/engine/src/schemas/workflow.ts`
- Tests: update schema validation tests
