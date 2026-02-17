---
id: ISS-000174
title: Add backward compatibility regression gate for reporter changes
type: issue
status: open
priority: critical
labels:
  - testing
  - regression
  - gate
  - SPEC-000050
createdAt: '2026-02-17T21:03:14.187Z'
updatedAt: '2026-02-17T21:03:14.187Z'
project: configurable-workflow-reporters
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context

The reporter system adds new fields to the workflow schema and new wiring in the CLI. The existing 532 engine tests and all MCP tests must continue to pass without modification. This issue makes that an explicit verification gate rather than an assumption.

## Requirements

### Verification steps (run after all reporter implementation is complete)

1. **Engine test suite (532 tests):**
   ```bash
   cd workflows/engine && npm test
   ```
   All 532 existing tests must pass with zero modifications. If any existing test needs changing, that indicates a breaking change that must be justified and documented.

2. **MCP test suite:**
   ```bash
   npm run test:mcp
   ```
   All existing MCP tests must pass unchanged.

3. **Schema backward compatibility:**
   - Parse `workflows/spec-implementation.yaml` (no `reporters` field) -- succeeds, `reporters` defaults to `[]`
   - Parse any other existing workflow YAML files -- all succeed
   - `reportAs` field absent on steps -- defaults to `'visible'`
   - `runOn` field absent on steps -- defaults to `'local'`

4. **CLI backward compatibility:**
   - `node workflows/engine/dist/cli.js run <spec> --dry-run` with a workflow that has no `reporters` field -- completes without error
   - No new required CLI flags introduced
   - No new required environment variables introduced

5. **Engine API backward compatibility:**
   - `WorkflowEngine` constructor with existing `EngineConfig` (no reporter fields) -- works unchanged
   - `onAuditEntry` callback signature unchanged
   - `onPhaseComplete` callback signature unchanged
   - `ExecutionSummary` type is backward compatible (new fields are optional)

### When to run

This is the FINAL verification step, after all other SPEC-000050 issues are complete. It gates the PR merge.

## Verification

- [ ] `npm test` in `workflows/engine/` -- 532+ tests pass (reporter tests add to the count)
- [ ] `npm run test:mcp` -- all pass
- [ ] Schema backward compat confirmed
- [ ] CLI backward compat confirmed
- [ ] No existing test file modified (check via `git diff --name-only` against main)
