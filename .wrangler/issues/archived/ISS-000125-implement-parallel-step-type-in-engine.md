---
id: ISS-000125
title: Implement parallel step type in engine
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:29:45.547Z'
updatedAt: '2026-02-16T03:12:32.067Z'
project: SPEC-000047
---
## Summary

Add `parallel` step type that dispatches multiple child steps concurrently.

## Behavior

```yaml
- name: reviews
  type: parallel
  steps:
    - name: review-code-quality
      agent: reviewer
      prompt: code-quality-review.md
      output: codeQualityReview
    - name: review-test-coverage
      agent: reviewer
      prompt: test-coverage-review.md
      output: testCoverageReview
```

- All child steps dispatched concurrently (Promise.all or equivalent)
- All must complete before workflow advances
- If any child fails (error, timeout), the parallel group fails
- Each child's output stored in its named variable
- Each child recorded individually in audit trail

## Implementation

- Add `parallel` case to the step type switch in engine.ts
- Dispatch all child steps using Promise.all
- Collect results, fail group if any child rejects
- Respect per-step timeouts (use Promise.race with timeout)
- Each child step uses the same composition logic (agent+prompt)

## Files

- Modify: `workflows/engine/src/engine.ts`
- Tests: `workflows/engine/src/__tests__/engine-parallel.test.ts`

## Dependencies

- ISS-000124 (agent+prompt composition, since parallel children use it)
