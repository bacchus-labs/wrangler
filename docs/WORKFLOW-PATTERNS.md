# Wrangler Workflow Patterns

Guide to building multi-agent workflow skills in Wrangler.

---

## Overview

**Workflows** are composite skills that coordinate multiple agents/tasks to achieve complex goals. They differ from atomic skills by orchestrating multiple operations, often in parallel, with defined phases and dependencies.

### **Skills vs. Workflows**

| Aspect | Atomic Skill | Workflow Skill |
|--------|-------------|----------------|
| **Scope** | Single, focused task | Multi-step process |
| **Agents** | Single agent execution | Multiple coordinated agents |
| **Execution** | Sequential only | Sequential + Parallel |
| **Duration** | < 2 minutes typical | 2-10 minutes typical |
| **Metrics** | Simple (success/failure) | Complex (per-phase timing, throughput) |
| **Examples** | `creating-issues`, `practicing-tdd` | `housekeeping`, `feature-development` |

---

## Workflow Architecture

### **Three-Phase Pattern**

Most workflows follow a three-phase structure:

```
Phase 1: Preparation (Sequential)
    ↓
Phase 2: Parallel Execution (Parallel)
    ↓
Phase 3: Aggregation (Sequential)
```

**Phase 1 - Preparation:**
- Gather context
- Establish baseline state
- Set up prerequisites
- Determine what work is needed

**Phase 2 - Parallel Execution:**
- Launch multiple independent agents
- Each agent handles a distinct, non-overlapping concern
- Agents run simultaneously for speed
- No inter-agent dependencies

**Phase 3 - Aggregation:**
- Collect results from all agents
- Synthesize findings
- Generate summary report
- Provide actionable recommendations

---

## Parallel Agent Execution

### **How to Run Agents in Parallel**

**Critical requirement:** All Task tool calls must be in a **single response** to Claude Code.

**Correct (Parallel):**
```
I'm launching three parallel agents:

[Task tool call #1]
[Task tool call #2]
[Task tool call #3]

All three agents are now running simultaneously...
```

**Incorrect (Sequential):**
```
Launching Agent 1...
[Task tool call #1]
[Wait for response]
Now launching Agent 2...
[Task tool call #2]
```

### **Designing for Parallelism**

**Requirements for parallel agents:**
1. **Independence:** No shared state or dependencies between agents
2. **Isolation:** Each agent operates on distinct data/files
3. **Idempotent:** Safe to run multiple times
4. **Clear scope:** Well-defined boundaries

**Example: Housekeeping Workflow**

Agent A: Reviews open issues (reads/updates issues with status "open")
Agent B: Organizes closed issues (reads/moves issues with status "closed")
Agent C: Checks documentation (reads .md files, no issue interaction)

✅ No overlap → Safe to run in parallel

---

## Workflow Design Patterns

### **Pattern 1: Fan-Out / Fan-In**

Launch multiple agents in parallel, then aggregate results.

```
        ┌─────────┐
        │ Prepare │
        └────┬────┘
             │
       ┌─────┴─────┐
       │           │
   ┌───▼──┐    ┌──▼───┐
   │Agent │    │Agent │
   │  A   │    │  B   │
   └───┬──┘    └──┬───┘
       │           │
       └─────┬─────┘
             │
        ┌────▼────┐
        │Aggregate│
        └─────────┘
```

**Use when:**
- Multiple independent data sources
- Parallel analysis of different aspects
- Speed is important

**Examples:**
- Code review (style, security, performance agents)
- Testing (unit, integration, e2e agents)
- Housekeeping (issues, docs, organization agents)

---

### **Pattern 2: Pipeline**

Sequential stages where each stage's output feeds the next.

```
┌────────┐    ┌────────┐    ┌────────┐
│Stage 1 │───→│Stage 2 │───→│Stage 3 │
└────────┘    └────────┘    └────────┘
```

**Use when:**
- Later stages depend on earlier stages
- Must maintain strict ordering
- Checkpoints needed between stages

**Examples:**
- Feature development (spec → implementation → testing → review)
- Release process (build → test → deploy → verify)
- Data transformation (extract → transform → load)

---

### **Pattern 3: Map-Reduce**

Apply same operation across multiple items, then reduce results.

```
Items: [A, B, C, D]
         ↓
    ┌────┴────┐
    │   Map   │ (parallel processing)
    └────┬────┘
  [R1, R2, R3, R4]
         ↓
    ┌────┴────┐
    │ Reduce  │ (aggregate)
    └────┬────┘
      Result
```

**Use when:**
- Same operation needed on multiple items
- Items are independent
- Results can be aggregated

**Examples:**
- Test suite execution (run all tests, aggregate results)
- Multi-file refactoring (update all files, report success)
- Batch issue processing (update all matching issues, summarize)

---

### **Pattern 4: Conditional Branching**

Different paths based on runtime conditions.

```
   ┌─────────┐
   │Evaluate │
   └────┬────┘
        │
   ┌────┴────┐
   │         │
┌──▼──┐   ┌─▼───┐
│Path │   │Path │
│  A  │   │  B  │
└─────┘   └─────┘
```

**Use when:**
- Workflow varies based on project state
- Different strategies for different scenarios
- Optimization opportunities

**Examples:**
- Smart testing (run all tests if major change, else only affected)
- Incremental builds (build changed components only)
- Adaptive debugging (different strategies for different error types)

---

## Metrics & Observability

### **What to Track**

**Workflow-Level Metrics:**
- Total execution time
- Phase breakdown (Phase 1: X min, Phase 2: Y min, Phase 3: Z min)
- Parallel speedup factor (sequential time / parallel time)
- Success rate (completed / attempted)

**Agent-Level Metrics:**
- Individual agent execution time
- Work completed (items processed, actions taken)
- Error rate per agent
- Resource usage (API calls, file operations)

**Business Metrics:**
- Issues processed
- Files organized
- Drift detected
- Coverage gaps found

### **Metrics Collection Strategy**

**Timestamp collection:**
```
Start time: [record]
Phase 1 start: [record]
Phase 1 end: [record]
Phase 2 start: [record]
  Agent A start: [record]
  Agent A end: [record]
  Agent B start: [record]
  Agent B end: [record]
Phase 2 end: [max(Agent end times)]
Phase 3 start: [record]
Phase 3 end: [record]
End time: [record]
```

**Derived metrics:**
```
Total time = End - Start
Phase 1 time = Phase 1 end - Phase 1 start
Phase 2 time = Phase 2 end - Phase 2 start
Parallel speedup = (Agent A time + Agent B time) / Phase 2 time
```

### **Reporting**

Include metrics in workflow summary report:

```markdown
## Workflow Metrics

**Duration:** 4.2 minutes total
- Phase 1 (Preparation): 0.8 min
- Phase 2 (Parallel execution): 2.9 min
- Phase 3 (Aggregation): 0.5 min

**Parallel Efficiency:**
- Sequential equivalent: 7.3 min (Agent A: 3.1min + Agent B: 2.8min + Agent C: 1.4min)
- Actual parallel time: 2.9 min (max of all agents)
- Speedup: 2.5x

**Work Completed:**
- Issues processed: 47
- Files organized: 23
- Documentation files reviewed: 8
- Actions taken: 15
```

---

## Workflow Specification Template

When creating a new workflow skill, define:

### **1. Workflow Metadata**

```yaml
name: workflow-name
type: workflow
category: [maintenance | development | testing | deployment]
estimated_duration: X-Y minutes
parallel_agents: N
```

### **2. Phases**

For each phase, specify:
- **Name:** What this phase does
- **Type:** Sequential | Parallel
- **Inputs:** What data/state is needed
- **Outputs:** What is produced
- **Duration estimate:** Expected time
- **Success criteria:** How to know it worked

### **3. Agents (for Parallel phases)**

For each agent, specify:
- **Name:** Agent identifier
- **Task:** What this agent does
- **Inputs:** What data it needs
- **Outputs:** What it produces
- **Independence:** Why it can run in parallel
- **Metrics:** What to track

### **4. Error Handling**

- What happens if an agent fails?
- Can workflow continue with partial results?
- Retry strategy?
- Rollback needed?

---

## Example Workflow Specifications

### **Housekeeping Workflow**

```yaml
name: housekeeping
type: workflow
category: maintenance
estimated_duration: 3-5 minutes
parallel_agents: 3

phases:
  - phase: 1
    name: Roadmap Update
    type: sequential
    inputs: [git history, issues, current roadmap]
    outputs: [updated roadmap]
    duration: 0.5-1 min

  - phase: 2
    name: Parallel Reconciliation
    type: parallel
    agents:
      - agent_a:
          name: Open Issues Reconciliation
          task: Review and update open issues
          inputs: [issues with status open/in_progress]
          outputs: [updated issues, actions taken]
          independence: Operates on open issues only

      - agent_b:
          name: Completed Issues Organization
          task: Archive closed issues
          inputs: [issues with status closed/cancelled]
          outputs: [moved files, organization summary]
          independence: Operates on closed issues only

      - agent_c:
          name: Documentation Drift
          task: Detect doc/code drift
          inputs: [documentation files, git commits]
          outputs: [drift report]
          independence: Operates on docs only

  - phase: 3
    name: Summary Report
    type: sequential
    inputs: [all agent outputs]
    outputs: [housekeeping report]
    duration: 0.5 min
```

---

## Best Practices

### **Designing Workflows**

✅ **Do:**
- Start simple (3-4 agents max)
- Ensure true independence between parallel agents
- Provide clear phase boundaries
- Track metrics for optimization
- Make workflows idempotent
- Document expected duration

❌ **Don't:**
- Create artificial dependencies
- Parallelize dependent operations
- Skip error handling
- Ignore metrics
- Make workflows stateful
- Assume unlimited parallelism

### **Implementing Workflows**

✅ **Do:**
- Use single message for parallel Task calls
- Wait for all agents before aggregation
- Report progress at each phase
- Include metrics in summary
- Provide actionable recommendations

❌ **Don't:**
- Launch parallel agents sequentially
- Start Phase 3 before Phase 2 completes
- Skip summary report
- Ignore agent failures
- Assume success without verification

---

## Future Evolution

### **Workflow Engine (v2.0 Vision)**

Eventually, workflows could be **declarative** rather than **procedural**:

```yaml
# housekeeping-workflow.yaml
workflow:
  name: housekeeping
  phases:
    - id: prep
      type: sequential
      agent: roadmap-updater

    - id: reconcile
      type: parallel
      depends_on: [prep]
      agents:
        - issues-reconciler
        - file-organizer
        - drift-detector

    - id: report
      type: sequential
      depends_on: [reconcile]
      agent: report-generator
```

**Workflow engine would:**
- Parse workflow definition
- Resolve dependencies
- Schedule agents
- Collect metrics automatically
- Provide real-time progress
- Enable workflow composition

### **Advanced Features**

**Conditional execution:**
```yaml
- id: expensive_check
  type: parallel
  condition: issues.open.count > 50
  agents: [...]
```

**Retries and fault tolerance:**
```yaml
- id: flaky_operation
  retry: 3
  timeout: 5min
  fallback: skip
```

**Workflow composition:**
```yaml
- id: pre_release
  type: workflow
  workflow: housekeeping
  then:
    - type: workflow
      workflow: test_suite
    - type: workflow
      workflow: release_prep
```

---

## Metrics Dashboard (Future)

Imagine a workflow dashboard showing:

```
Housekeeping Workflow - Last 30 Days

Total runs: 24
Success rate: 100%
Avg duration: 3.8 min
Fastest: 2.1 min
Slowest: 5.9 min

Phase Breakdown:
├─ Phase 1 (Prep):        avg 0.7min  [████████░░] 18%
├─ Phase 2 (Parallel):    avg 2.6min  [████████████████████░░] 68%
│  ├─ Agent A (Issues):   avg 2.4min
│  ├─ Agent B (Files):    avg 1.8min
│  └─ Agent C (Docs):     avg 1.2min
└─ Phase 3 (Report):      avg 0.5min  [████░░] 13%

Parallel Efficiency: 2.1x avg speedup

Actions Taken:
- Issues closed: 142 total (5.9 per run)
- Issues updated: 67 total (2.8 per run)
- Files organized: 315 total (13.1 per run)
- Drift issues found: 23 total (0.96 per run)

Recommendations:
⚠️ Agent A taking 68% of Phase 2 time - consider optimization
✅ High parallel efficiency maintained
💡 Consider running housekeeping more frequently (current: every 5.3 days)
```

---

## Contributing New Workflows

When adding a new workflow to Wrangler:

1. **Design:** Use workflow specification template
2. **Document:** Include in workflow skill SKILL.md
3. **Implement:** Follow parallel execution patterns
4. **Test:** Verify phase timing and metrics
5. **Metrics:** Track execution time and outcomes
6. **Iterate:** Optimize based on metrics

**Submit to:** `skills/[workflow-name]/SKILL.md`

---

*Workflow Patterns Guide v1.0 - Part of Wrangler Skills Library*
