---
id: ISS-000063
title: 'SPEC-000042 Phase 1: Generate PR Description Script'
type: issue
status: open
priority: high
labels:
  - implement-spec-v2
  - phase-1
  - scripts
createdAt: '2026-02-02T04:12:29.965Z'
updatedAt: '2026-02-02T04:12:29.965Z'
project: Wrangler Core Workflows
wranglerContext:
  agentId: main-implementation-agent
  parentTaskId: SPEC-000042
  estimatedEffort: 3-4 hours
---
Implement the script to build evolving PR descriptions from templates and phase outputs.

## Tasks
1. Create `skills/implement-spec-v2/scripts/generate-pr-description.ts`
2. Load appropriate template based on phase
3. Inject dynamic content (tasks, acceptance criteria, verification checks)
4. Format as markdown with checkboxes
5. Calculate completion metrics
6. Write unit tests with all phase variants

## Acceptance Criteria
- Generates correct PR description for each phase
- Properly formats checkboxes and task lists
- Calculates metrics accurately
- 80%+ test coverage
- Matches example PR descriptions from spec
