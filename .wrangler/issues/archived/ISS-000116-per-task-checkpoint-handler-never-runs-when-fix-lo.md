---
id: ISS-000116
title: Per-task checkpoint handler never runs when fix loop exhausts
type: issue
status: closed
priority: high
labels:
  - bug
  - engine
  - checkpoint
  - per-task
  - dogfood
createdAt: '2026-02-12T21:48:33.100Z'
updatedAt: '2026-02-15T01:43:44.250Z'
project: Workflow Engine
---
## Bug

In the per-task execution flow, the `checkpoint` step (type: code, handler: save-checkpoint) is the 4th step after `implement`, `review`, and `fix`. When the fix loop exhausts its retries and the workflow pauses, the checkpoint handler never executes for that task.

## Evidence

The per-task steps in spec-implementation.yaml:
```yaml
steps:
  - name: implement      # 1. Runs
  - name: review         # 2. Runs  
  - name: fix            # 3. Runs (loop) -- PAUSES HERE
  - name: checkpoint     # 4. NEVER RUNS
```

The audit shows: implement -> review -> fix (loop x2) -> PAUSE. No `checkpoint` step ever appears in the audit.

## Impact

If the per-task execution pauses during the fix loop, no checkpoint is saved for that specific task. The main checkpoint only records `currentPhase: "plan"` (see ISS-000115), so all per-task progress is lost.

## Fix Options

1. Move the checkpoint step BEFORE the review/fix loop
2. Add automatic checkpointing when the loop exhausts (in the `onExhausted: escalate` handler)
3. Both: checkpoint after implement, and again after successful review

---
**Completion Notes (2026-02-15T01:43:44.241Z):**
Completed: Fixed per-task checkpoint never running when fix loop exhausts. Added automatic checkpointing in the onExhausted escalate handler so task progress is saved even when the fix loop hits max retries and pauses the workflow. This prevents loss of per-task progress on pause.
