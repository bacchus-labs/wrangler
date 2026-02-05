# Housekeeping - Detailed Guide


- Issues reconciled
- Files organized
- Drift issues found
- Documentation updates needed

**Health Metrics:**

- Issue staleness (open issues > 30 days)
- Documentation drift severity
- Roadmap currency (last update date)

These metrics help identify:

- Bottlenecks in workflow
- Areas needing more frequent housekeeping
- Project health indicators

---

## Important Implementation Notes

### **Parallel Execution**

To run Phase 2 agents in **true parallel**, you MUST:

1. Use the Task tool **five times** in a **single response**
2. Do NOT wait for Agent A to finish before launching Agent B
3. All five tool calls should be in the same message

**Example (correct parallel execution):**

```
I'm launching five parallel agents for Phase 2 housekeeping:

[Task tool call for Agent A]
[Task tool call for Agent B]
[Task tool call for Agent C]
[Task tool call for Agent D]
[Task tool call for Agent E]

All five agents are now running in parallel...
```

**Example (incorrect - sequential execution):**

```
Launching Agent A...
[Wait for Agent A]
Now launching Agent B...
[Wait for Agent B]
Now launching Agent C...
```

### **State Isolation**

Each Phase 2 agent operates on independent data:

- Agent A: Open issues (won't touch closed)
- Agent B: Closed issues (won't touch open)
- Agent C: Documentation (won't touch issues)
- Agent D: Root markdown files (won't touch issues/docs/memos)
- Agent E: Git worktrees (won't touch issues/docs/files)

This ensures no conflicts or race conditions.

### **Idempotency**

Housekeeping is idempotent - running it multiple times is safe:

- Roadmap: Last update wins (always reflects current)
- Issues: Already-closed issues stay closed
- Organization: Already-moved files stay moved
- Drift: Re-detection is harmless

---

## Extensibility

Future enhancements could add more parallel agents:

**Agent F: Dependency Updates**

- Check for outdated dependencies
- Identify security vulnerabilities

**Agent G: Test Coverage Analysis**

- Identify untested code
- Generate test coverage report

**Agent H: Performance Regression Detection**

- Run benchmarks
- Compare to baseline

**Agent I: Code Quality Metrics**

- Run linters
- Check complexity metrics

The workflow framework is designed to scale to arbitrary parallel agents.

---

## Success Criteria

Housekeeping is successful when:

✅ Governance metrics refreshed across all documents
✅ Roadmap Next Steps accurately reflects current state and priorities
✅ Constitutional compliance verified and gaps identified
✅ All completed issues are marked as closed
✅ All closed issues are archived in `.wrangler/issues/archived/`
✅ Issue descriptions match implementation reality
✅ Documentation drift is identified and catalogued (including governance compliance)
✅ Dangling worktrees (merged PRs) are cleaned up safely
✅ Summary report provides actionable insights
✅ Workflow completes in reasonable time (< 5 minutes for typical project)

---

## Frequency Recommendations

**When to run housekeeping:**

- After completing major features
- Weekly for active projects
- Before starting new sprints/milestones
- Before creating release
- When project feels "messy" or out of sync

**Automation potential:**

- Could be triggered by git hooks (post-merge)
- Could run on schedule (weekly cron)
- Could be part of CI/CD pipeline
