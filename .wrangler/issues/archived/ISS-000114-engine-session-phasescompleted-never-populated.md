---
id: ISS-000114
title: Engine session phasesCompleted never populated
type: issue
status: closed
priority: high
labels:
  - bug
  - engine
  - session-manager
  - dogfood
createdAt: '2026-02-12T21:48:16.897Z'
updatedAt: '2026-02-15T01:43:36.246Z'
project: Workflow Engine
---
## Bug

During the first real engine dogfood test (session wf-2026-02-12-6d217642), `context.json` shows `phasesCompleted: []` even after the analyze and plan phases completed successfully. The audit trail confirms both phases ran.

## Evidence

`context.json`:
```json
{
  "status": "paused",
  "currentPhase": "plan",
  "phasesCompleted": []
}
```

`audit.jsonl`:
```
{"step":"analyze","status":"completed","timestamp":"2026-02-12T21:22:10.436Z"}
{"step":"plan","status":"completed","timestamp":"2026-02-12T21:22:10.437Z"}
```

## Root Cause

The `WorkflowSessionManager` is likely never called to update `phasesCompleted` after each phase. The engine's `run()` method returns `completedPhases` in its result, but the session manager's `context.json` is not updated incrementally as phases complete.

## Fix

Either:
1. Call `sessionManager.updateContext({ phasesCompleted: [...] })` after each phase in the engine's run loop
2. Or populate `phasesCompleted` when writing the checkpoint/completing the session

---
**Completion Notes (2026-02-15T01:43:36.238Z):**
Completed: Fixed phasesCompleted never being populated in context.json. The session manager now updates phasesCompleted incrementally as each phase completes, ensuring context.json accurately reflects which phases have finished. Integration tests verify the fix.
