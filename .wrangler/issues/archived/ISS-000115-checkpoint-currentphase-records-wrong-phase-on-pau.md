---
id: ISS-000115
title: Checkpoint currentPhase records wrong phase on pause
type: issue
status: closed
priority: high
labels:
  - bug
  - engine
  - checkpoint
  - resume
  - dogfood
createdAt: '2026-02-12T21:48:25.003Z'
updatedAt: '2026-02-15T01:43:39.976Z'
project: Workflow Engine
---
## Bug

When the engine pauses (e.g., fix loop exhausted), the checkpoint records `currentPhase: "plan"` instead of the actual phase where execution stopped (which was in the `execute` phase, specifically the `fix` step of task-001's per-task loop).

## Evidence

`checkpoint.json`:
```json
{
  "currentPhase": "plan",
  "lastAction": "plan",
  "resumeInstructions": "Resume from phase \"plan\" using --resume wf-2026-02-12-6d217642"
}
```

But the audit shows execution paused in the `execute` phase:
```
{"step":"fix","status":"failed","timestamp":"2026-02-12T21:46:50.171Z"}
{"step":"execute","status":"failed","timestamp":"2026-02-12T21:46:50.171Z"}
```

## Root Cause

The `currentPhase` in the checkpoint is being set from the last completed phase stored by the session manager, which was `plan` (the last handler to run before the per-task loop). The per-task execution within `execute` doesn't update `currentPhase` incrementally.

## Impact

Resuming from this checkpoint would restart from the `plan` phase instead of the specific task within `execute` where it paused, potentially losing work or re-executing already-completed tasks.

## Fix

The checkpoint should record both:
1. The phase where execution stopped (`execute`)
2. The specific task/step within that phase (`task-001`, step `fix`, iteration 2)

---
**Completion Notes (2026-02-15T01:43:39.967Z):**
Completed: Fixed checkpoint currentPhase recording the wrong phase on pause. The checkpoint now correctly records the phase where execution actually stopped (e.g., "execute" instead of "plan"), along with the specific task/step within that phase for granular resume capability.
