# Implementation Examples

## Example 1: Implementing a Specification

User: /wrangler:implementing-issues spec-auth-system.md

→ Parse scope: spec-auth-system.md
→ Load 5 tasks from linked issues
→ Execute each task with TDD
→ Auto-fix code review issues
→ Complete with full verification

## Example 2: Implementing an Issue Range

User: /wrangler:implementing-issues issues 10-12

→ Load 3 issues via MCP
→ Execute sequentially
→ Escalate on blocker (Issue 12)

## Example 3: Context Inference

User: Here's the plan file (attached plan-db-refactor.md)
User: /wrangler:implementing-issues

→ Scans last messages
→ Finds plan-db-refactor.md
→ Executes tasks from plan

See SKILL.md for more detailed examples.
