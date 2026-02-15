---
id: SPEC-000045
title: Workflow Engine Testing Hardening - Integration Tests and Composition Coverage
type: specification
status: open
priority: high
labels:
  - specification
  - testing
  - workflow-engine
  - integration
createdAt: '2026-02-12T21:10:51.829Z'
updatedAt: '2026-02-12T21:10:51.829Z'
project: Workflow Engine v1
---
# Specification: Workflow Engine Testing Hardening

## Executive Summary

**What:** Add integration tests, realistic SDK simulation, CLI testing, and filesystem error handling to the workflow engine test suite. Close the gap between unit-level coverage (99%+) and actual production readiness.

**Why:** The engine has 532 unit tests with 99% statement coverage, but every component is tested in isolation. The composition layer -- where the engine, session manager, SDK, and CLI wire together -- has zero tests. The three most likely production bugs (SDK import breakage, silent gate approval on failure, checkpoint data loss on resume) are all in untested composition boundaries.

**Scope:**
- Included: Realistic QueryFunction mock, CLI testing, engine+session integration tests, filesystem error handling, checkpoint roundtrip verification
- Excluded: True end-to-end tests against live Claude Agent SDK (requires API keys and real LLM calls), performance/load testing

## Goals and Non-Goals

### Goals

- Test the composition boundaries where engine meets session manager meets SDK
- Replace the single-message mock with a realistic multi-message SDK simulator
- Achieve testable coverage of cli.ts (currently 213 lines, 0 tests, excluded from coverage)
- Verify checkpoint roundtrip through filesystem (run -> pause -> save -> load -> resume)
- Test error handling for filesystem failures and malformed data
- Document intentional silent behaviors (gate fallback to "approved", agent no-result handling) through explicit tests

### Non-Goals

- Testing against the real Claude Agent SDK (requires API keys, non-deterministic)
- Achieving 100% branch coverage (some dead code branches are acceptable)
- Refactoring the engine or CLI code (test-only changes unless a bug is discovered)
- Performance or stress testing

## Background and Context

### Current State

| Metric | Value |
|--------|-------|
| Tests | 532 |
| Statement coverage | 99.19% |
| Branch coverage | 95.43% |
| Function coverage | 100% |
| cli.ts coverage | 0% (excluded) |
| Integration tests | 0 (composition-level) |

### Problem Statement

The mock `QueryFunction` (`createMockQuery` in engine.test.ts lines 33-61) always yields exactly one `result` message with `subtype: 'success'` and non-null `structured_output`. Real SDK behavior:
- Emits multiple message types (assistant, tool_use, tool_result, then result)
- Can return `structured_output: null` on success (agent performed actions without structured output)
- Can yield no result message at all (generator completes without result)
- Can timeout or throw mid-stream

The CLI (`src/cli.ts`, 213 lines) is the ONLY place where engine + session manager + SDK are wired together. It contains:
- Dynamic SDK import with `@ts-expect-error`
- Commander argument parsing
- Session lifecycle orchestration (new run vs resume)
- Pause handling (write blocker, save checkpoint, exit code 2)
- `printResult` with deeply nested optional property access
- `getCurrentBranch` shelling out to git

The checkpoint resume path in cli.ts:101-103 constructs `{ variables: checkpoint.variables, completedPhases: [], changedFiles: [] }` -- hardcoding `completedPhases` to `[]` -- which means completed phase metadata from the original run is lost on resume.

### Proposed State

- Realistic SDK simulator that emits multi-message sequences
- CLI tested via extracted testable functions (not process spawning)
- Engine+SessionManager integration tests verifying audit entry flow and checkpoint roundtrip
- Filesystem error tests for corrupted JSON, missing directories
- All silent-default behaviors documented through explicit tests

## Requirements

### Functional Requirements

**FR-001: Realistic SDK Mock**
- MUST emit a configurable sequence of SDK messages (assistant, tool_use, tool_result, result) per query call
- MUST support returning `structured_output: null` on success messages
- MUST support returning no result message at all (generator completes empty)
- MUST support throwing mid-stream (simulating timeout/error)
- MUST support returning multiple result messages (verifying last-wins behavior)
- MUST be backward-compatible with existing tests (existing `createMockQuery` can remain for simple cases)

**FR-002: CLI Testability**
- MUST test `printResult` function with all output shapes: complete results, paused results, failed results, results with missing nested fields
- MUST test `getCurrentBranch` success and failure paths
- MUST test the SDK import error handling path (module not found)
- MUST test resume path construction (verify checkpoint data is correctly passed to engine.resume)
- MUST test pause handling (verify blocker is written, checkpoint is saved)
- SHOULD extract testable functions from cli.ts if needed for testing (refactoring allowed for testability)

**FR-003: Engine + Session Manager Integration**
- MUST test that audit entries emitted by the engine flow through `onAuditEntry` callback to session manager's `appendAuditEntry`
- MUST test full checkpoint roundtrip: engine.run() -> WorkflowPaused -> sessionManager.saveCheckpoint() -> new sessionManager.loadCheckpoint() -> engine.resume() -> verify correct phase resumes
- MUST test that the checkpoint data shape from `WorkflowContext.toCheckpoint()` is compatible with what `engine.resume()` expects
- MUST verify completed phases are preserved through the checkpoint roundtrip

**FR-004: Silent Default Behavior Tests**
- MUST test that an agent step with no result message (empty generator) does NOT store output and does NOT throw
- MUST test that a gate query returning no result (no success message) falls back to `{ assessment: 'approved' }` and document this as intentional
- MUST test that a gate query where `ReviewResultSchema.parse()` throws is handled (currently it propagates -- test should document whether this is intended or a bug to fix)
- MUST test that multiple result messages from a single query causes last-wins behavior

**FR-005: Filesystem Error Handling**
- MUST test session manager behavior when checkpoint JSON is corrupted/malformed
- MUST test session manager behavior when session directory doesn't exist
- MUST test session manager behavior when audit log file has been deleted mid-session
- SHOULD test behavior when filesystem is read-only (permission denied)

**FR-006: onPhaseComplete Error Handling**
- MUST test that if `onPhaseComplete` callback throws, the error is handled appropriately (either propagates cleanly or is caught with the workflow in a recoverable state)

### Non-Functional Requirements

- **NFR-001:** All new tests MUST pass deterministically (no timing-dependent tests)
- **NFR-002:** Test suite total runtime MUST stay under 10 seconds
- **NFR-003:** cli.ts MUST be included in coverage measurement after this work
- **NFR-004:** Overall branch coverage MUST reach 97%+ (currently 95.43%)
- **NFR-005:** New test file naming MUST follow existing convention: `__tests__/**/*.test.ts`

## Architecture

### New Test Files

```
workflows/engine/
  __tests__/
    engine.test.ts              # Existing - add silent behavior tests here
    cli.test.ts                 # NEW - CLI function tests
    integration/
      session.test.ts           # Existing - add filesystem error tests here
      engine-session.test.ts    # NEW - engine+session roundtrip tests
    fixtures/
      sdk-simulator.ts          # NEW - realistic multi-message QueryFunction mock
```

### SDK Simulator Design

```typescript
interface SDKSimulatorConfig {
  // Map of prompt substring -> message sequence
  responses: Map<string, SDKMessage[]>;
  // Default response when no match
  defaultResponse?: SDKMessage[];
  // Whether to throw on unmatched prompts
  throwOnUnmatched?: boolean;
}

function createSDKSimulator(config: SDKSimulatorConfig): QueryFunction {
  return async function* query(options) {
    const messages = findMatchingResponse(config, options.prompt);
    for (const msg of messages) {
      yield msg;
    }
  };
}

// Helper to create realistic message sequences
function createAgentSequence(structuredOutput: unknown): SDKMessage[] {
  return [
    { type: 'assistant', content: 'I will analyze this...', ... },
    { type: 'tool_use', name: 'Read', ... },
    { type: 'tool_result', content: 'file contents...', ... },
    { type: 'result', subtype: 'success', structured_output: structuredOutput },
  ];
}

function createEmptySequence(): SDKMessage[] {
  return [
    { type: 'assistant', content: 'I completed the work.', ... },
    // No result message -- generator completes
  ];
}

function createErrorSequence(error: string): SDKMessage[] {
  return [
    { type: 'assistant', content: 'Starting...', ... },
    { type: 'result', subtype: 'error', error },
  ];
}
```

### CLI Testability Approach

Extract testable functions from cli.ts into a separate module or test them directly by importing:

```typescript
// cli.ts already exports printResult and getCurrentBranch as module-level functions
// Tests can import them directly:
import { printResult, getCurrentBranch } from '../src/cli.js';

// For the SDK import path, test via the actual dynamic import behavior:
// Mock the module resolution to simulate @anthropic-ai/claude-agent-sdk not being installed

// For pause/resume logic, test by running the engine with a workflow
// that triggers WorkflowPaused, then verifying the session manager state
```

## Testing Strategy

### Test Categories

| Category | Files | Est. Tests | Priority |
|----------|-------|-----------|----------|
| SDK simulator tests | `fixtures/sdk-simulator.ts` + engine.test.ts | 12-15 | P0 |
| Silent behavior tests | engine.test.ts | 6-8 | P0 |
| Engine+session roundtrip | `integration/engine-session.test.ts` | 8-10 | P0 |
| CLI function tests | `cli.test.ts` | 10-12 | P1 |
| Filesystem error tests | `integration/session.test.ts` | 6-8 | P1 |
| onPhaseComplete error | engine.test.ts | 2-3 | P2 |
| Checkpoint data shape | `integration/engine-session.test.ts` | 3-4 | P0 |

### Acceptance Criteria

- [ ] SDK simulator supports multi-message sequences, null output, empty generator, mid-stream throw
- [ ] All 6 silent default behaviors are explicitly tested and documented
- [ ] Full checkpoint roundtrip tested through filesystem (not in-memory)
- [ ] Audit entry flow tested from engine through callback to session file
- [ ] cli.ts included in coverage measurement
- [ ] printResult tested with all result shapes
- [ ] Filesystem error handling tested for corrupted JSON and missing files
- [ ] Branch coverage >= 97%
- [ ] Total test count increases by 45-60 tests
- [ ] Total test runtime stays under 10 seconds

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| cli.ts needs refactoring for testability | Medium | Low | Extract pure functions, keep CLI wiring minimal |
| Checkpoint shape mismatch is actually a bug | High | Medium | If confirmed, fix in this PR with a test proving the fix |
| SDK simulator becomes too complex | Low | Medium | Keep it simple -- configurable message arrays, not a full SDK emulator |
| Tests slow down suite | Low | Low | Use real filesystem only where needed, mock elsewhere |

## Open Questions

- **Q1:** Should the gate fallback-to-approved behavior be changed to fail-safe (reject on error) instead of fail-open (approve on error)? The test should document current behavior; changing it is a separate decision.
- **Q2:** Should the checkpoint `completedPhases: []` hardcode in cli.ts be fixed as part of this spec, or filed as a separate bug? (Recommend: fix it here since the roundtrip test will catch it.)

## References

- PR #26: Deterministic Workflow Engine implementation
- ISS-000102 through ISS-000107: v2 follow-up issues
- SPEC-000044: Original workflow engine specification
