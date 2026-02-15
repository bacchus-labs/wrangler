---
id: SPEC-000006
title: Design MCP workflow orchestration tools to reduce brittleness
type: specification
status: closed
priority: high
labels:
  - mcp
  - workflow-orchestration
  - brittleness-reduction
  - architecture
createdAt: '2025-11-24T02:37:51.582Z'
updatedAt: '2026-02-13T20:49:56.706Z'
project: Wrangler v1.1.0
---
## Problem Statement

Current wrangler skills rely on **text-prompt-based orchestration** for multi-step workflows. This creates brittleness through:

1. **Loss of structured state** - Workflow state exists only in natural language
2. **Implicit dependencies** - Task sequencing encoded in text instructions  
3. **No deterministic verification** - Success criteria are text-based ("check if X")
4. **Parsing fragility** - Code review feedback, TDD certification, etc. must be parsed from English

Research shows that:
- **MCP Sampling** enables MCP tools to request LLM assistance for decisions
- **Agent SDK integration** allows MCP tools to programmatically spawn subagents
- **Structured directives** let tools return machine-verifiable results

## Opportunity

Replace text-based orchestration with 7 MCP tools that provide:
- Deterministic execution with proof (exit codes, commit SHAs)
- Structured state tracking (not text parsing)
- Machine-verifiable gates (not trust-based claims)
- Audit trails for debugging

## Proposed MCP Tools

### Tier 1: Critical Path (Highest Impact)

**1. verification_gate** (Complexity: LOW, Impact: HIGH)
- Machine-verifiable completion gates
- Runs tests at verification time (not claimed earlier)
- Returns structured evidence (exit codes, timestamps, test output)
- Eliminates false completion claims

**2. task_execute** (Complexity: MEDIUM, Impact: HIGH)
- Replaces text-based task invocation
- Returns structured completion proof (commit SHA, test exit codes)
- Explicit dependency verification before execution
- Links TDD certification to actual test runs

**3. code_review_structured** (Complexity: MEDIUM, Impact: HIGH)
- Returns review issues with UUIDs (not free text)
- Structured location (file, line numbers)
- Categorization via enums (critical/important/minor)
- Enables reliable auto-fix (no text parsing)

### Tier 2: Planning & Safety

**4. dependency_graph** (Complexity: LOW, Impact: HIGH)
- Validates task dependencies at plan time
- Detects circular dependencies before execution
- Returns topological ordering for execution
- Identifies ready/blocked tasks structurally

**5. tdd_compliance_certifier** (Complexity: MEDIUM, Impact: HIGH)
- Evidence-based TDD verification (actual exit codes)
- RED phase verified by non-zero exit code
- GREEN phase verified by zero exit code
- Links certification to test file paths

### Tier 3: Advanced Orchestration

**6. issue_state_tracker** (Complexity: LOW, Impact: MEDIUM)
- Structured workflow state machine
- Replaces TodoWrite text entries
- Detects deadlocks via state analysis
- Audit trail of state transitions

**7. parallel_execution_coordinator** (Complexity: HIGH, Impact: MEDIUM)
- Pre-flight race condition detection
- File conflict detection before merge
- Structured consolidation of parallel results
- Timeline of parallel execution

## Success Metrics

**Qualitative improvements:**
- Test pass claims backed by exit codes (not text)
- Dependencies validated at plan time (not runtime)
- Code review issues tracked by UUID (not parsed text)
- TDD certification linked to evidence (not claimed)

**Proposed measurements** (to be tracked):
- Workflow completion rate with/without tools
- Time to detect/resolve issues
- Number of false completion claims
- Dependency ordering failures

## Architecture

MCP tools can leverage:
- **MCP Sampling**: Request LLM assistance for decisions within tool execution
- **Agent SDK**: Spawn programmatic subagents with independent context
- **Structured responses**: Return machine-verifiable metadata

Skills become thin orchestration layers:
```typescript
// Before: 200 lines of text instructions
// After: Tool invocation with structured parameters
const result = await task_execute({
  taskId: "task-1",
  dependencies: [{ taskId: "task-0", completionVerified: true }],
  expectedOutputFormat: { hasTestResults: true }
});
```

## Implementation Priority

1. **verification_gate** (Week 1-2) - Foundation for all verification
2. **task_execute** (Week 1-2) - Core execution with proof
3. **code_review_structured** (Week 3) - Structured feedback loop
4. **dependency_graph** (Week 4) - Plan-time validation
5. **tdd_compliance_certifier** (Week 4) - Evidence-based TDD
6. **issue_state_tracker** (Week 5) - Workflow monitoring
7. **parallel_execution_coordinator** (Week 5-6) - Safe parallelization

## Research Sources

- [MCP Sampling Specification](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)
- [Agent SDK MCP Integration](https://platform.claude.com/docs/en/agent-sdk/mcp)
- Brittleness analysis document: `/tmp/brittleness-analysis.md` (1,330 lines with full TypeScript interfaces)

## Open Questions

1. Should tools use MCP Sampling for intelligent decisions or spawn Agent SDK agents?
2. How to handle tool versioning as skills evolve?
3. What's the migration path for existing skills?
4. How to measure actual brittleness improvement (not estimates)?

## Related Work

- Current MCP server: `mcp/` directory (11 issue management tools)
- Skills affected: `implement`, `code-review`, `verification-before-completion`, `writing-plans`, `dispatching-parallel-agents`, `test-driven-development`

---
**Completion Notes (2026-02-13T20:49:56.675Z):**
Superseded by the deterministic workflow engine (SPEC-000044, PR #26). 6 of 7 proposed tools are covered by engine step types: verification_gate (failWhen + VerifyResultSchema), task_execute (per-task + topologicalSort), code_review_structured (gate-group + ReviewIssueSchema), dependency_graph (topologicalSort with cycle detection), tdd_compliance_certifier (TddCertificationSchema), issue_state_tracker (WorkflowContext + audit log + checkpoint). Only parallel_execution_coordinator remains a gap -- tracked separately as a future engine enhancement.
