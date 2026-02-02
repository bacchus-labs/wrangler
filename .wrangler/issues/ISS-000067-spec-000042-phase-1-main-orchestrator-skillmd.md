---
id: ISS-000067
title: 'SPEC-000042 Phase 1: Main Orchestrator SKILL.md'
type: issue
status: open
priority: high
labels:
  - implement-spec-v2
  - phase-1
  - skill
createdAt: '2026-02-02T04:13:24.963Z'
updatedAt: '2026-02-02T04:13:24.963Z'
project: Wrangler Core Workflows
wranglerContext:
  agentId: main-implementation-agent
  parentTaskId: SPEC-000042
  estimatedEffort: 4-6 hours
---
Implement the high-level orchestrator that coordinates the five-phase workflow.

## Tasks
1. Create `skills/implement-spec-v2/SKILL.md`
2. Document 5-phase workflow (ANALYZE, PLAN, EXECUTE, VERIFY, PUBLISH)
3. Include worktree context injection pattern
4. Document phase-by-phase execution steps
5. Include quality gates and error handling
6. Add examples and integration points
7. Reference all scripts and templates

## Acceptance Criteria
- Clear phase-by-phase workflow documentation
- Proper skill usage announcement format
- Worktree isolation protocol documented
- Error handling documented
- Integration with other skills explained
- Examples included
