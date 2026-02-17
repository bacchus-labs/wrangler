---
id: ISS-000170
title: Wire ReporterManager into engine CLI
type: issue
status: open
priority: high
labels:
  - SPEC-000050
  - workflow-engine
  - integration
createdAt: '2026-02-17T20:08:30.341Z'
updatedAt: '2026-02-17T20:08:30.341Z'
project: workflow-engine
wranglerContext:
  parentTaskId: SPEC-000050
---
## Context
SPEC-000050: Configurable Workflow Reporters

## What
Integrate the ReporterManager into the workflow engine CLI so reporters are initialized before workflow execution and receive audit entries during the run.

## Requirements
- Reporter initialization happens after SessionManager setup, before engine.run()
- ReporterManager receives audit entries alongside SessionManager (fan-out in onAuditEntry)
- ReporterManager.onComplete() called after engine.run() finishes successfully
- ReporterManager.onError() called if engine.run() throws
- ReporterManager.dispose() called in finally block
- Template variable resolution for reporter configs (`{{env.GITHUB_TOKEN}}`, `{{context.prNumber}}`)

## Implementation
File: `workflows/engine/src/cli.ts`

```typescript
// After session manager setup:
const reporterManager = new ReporterManager(
  workflow.reporters ?? [],
  workflow,
  createDefaultReporterRegistry()
);
await reporterManager.initialize({
  sessionId, specFile, branchName, worktreePath,
});

// Wire into onAuditEntry:
onAuditEntry: async (entry) => {
  await sessionManager.appendAuditEntry(entry);
  await reporterManager.onAuditEntry(entry);
},

// After engine.run():
try {
  const result = await engine.run(workflowPath, specPath);
  await reporterManager.onComplete(result.executionSummary);
} catch (err) {
  await reporterManager.onError(err);
  throw err;
} finally {
  await reporterManager.dispose();
}
```

## Depends On
- All prior reporter issues (types, registry, manager, github-pr-comment)

## Verification
- Workflows without `reporters` config continue to work unchanged
- Workflows with `reporters` config initialize the reporter manager
- Audit entries are received by both session manager and reporter manager
- Reporter errors don't break workflow execution
- Template variables resolved from env and context
