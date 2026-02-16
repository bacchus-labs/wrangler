---
id: ISS-000127
title: 'Add escape hatches: skipChecks and skipStepNames'
type: issue
status: closed
priority: medium
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:30:09.811Z'
updatedAt: '2026-02-16T03:12:32.888Z'
project: SPEC-000047
---
## Summary

Implement FR-6: Users can skip steps via flags, with audit logging.

## Requirements

- `--skip-checks` / `skipChecks: true`: Skips all non-implementation steps (reviews, verification). Implementation and code steps still run.
- `--skip-step=<name>` / `skipStepNames: ["name"]`: Skips specific named steps.
- All skips recorded in audit trail with step name and reason.
- The agent cannot decide to skip steps -- only explicit user flags.

## Implementation

- Add `skipChecks` and `skipStepNames` to EngineConfig
- Before executing each step, check if it should be skipped
- For `skipChecks`, define which step categories are "checks" (steps with agent: reviewer, or a configurable marker)
- Log skip in audit trail: `{ step: name, skipped: true, reason: "..." }`
- `enabled: false` on a step definition is a separate mechanism (workflow-level disable vs runtime skip)

## Files

- Modify: `workflows/engine/src/engine.ts`
- Modify: `workflows/engine/src/types.ts` (EngineConfig)
- Tests: skip scenarios

## Dependencies

- ISS-000124 (need agent+prompt model to know which steps are "checks")
