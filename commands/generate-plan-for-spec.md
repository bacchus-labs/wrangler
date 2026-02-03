---
description: Break down a specification into discrete MCP issues for implementation.
argument-hint: "<path/to/spec.md>"
---

# /wrangler:generate-plan-for-spec

Break a specification into discrete MCP issues in `.wrangler/issues/`.

## Arguments

- `$1` — **spec-path**: Path to spec file (e.g., `.wrangler/specifications/SPEC-000001-feature-name.md`)

## Instructions

1. Validate the spec path exists and is markdown
2. Read and parse the specification:
   - Extract Implementation Plan, Goals, Acceptance Criteria
   - Identify discrete work units
3. For each work unit, create an MCP issue using `issues_create`:
   - Title: Action-oriented (verb phrase)
   - Description: Full implementation details with TDD steps
   - Project: Set to the spec filename for linking
   - Labels: `["plan-step", "implementation"]`
4. Ensure issues are ordered with proper dependencies
5. Output summary of created issues

## Issue Generation Guidelines

| Guideline | Description |
|-----------|-------------|
| Atomic | Each issue = one logical unit of work |
| Focused | Completable in one session (<250 LOC) |
| Ordered | Dependencies flow from earlier to later |
| Testable | Has verifiable acceptance criteria |
| Action-oriented | Title starts with verb (Implement, Add, Create, Fix) |

## Parsing Priority

1. **Implementation Plan** — Primary source (phases become issue groupings)
2. **Goals** — Secondary if no Implementation Plan
3. **Acceptance Criteria** — Mapped to issue acceptance criteria

## Each Issue Must Include

Following the `writing-plans` skill requirements:
- Exact file paths (create/modify/test)
- Complete code examples for all 5 TDD steps
- Exact commands with expected output
- Clear acceptance criteria
- Dependencies on other tasks

## Output

```
Created N issues from SPEC-000001-feature-name.md:
  ISS-000042: Setup database schema
  ISS-000043: Implement user model
  ISS-000044: Add validation logic
  ...

Issues linked to project: SPEC-000001-feature-name.md

View status: /wrangler:issues
```

## Relationship to write-plan

This command is a focused version of `/wrangler:write-plan`:
- **write-plan**: General planning workflow, may prompt for input
- **generate-plan-for-spec**: Takes a spec file directly, no prompts

## Example

```bash
/wrangler:generate-plan-for-spec .wrangler/specifications/SPEC-000001-auth-system.md
```

## See Also

- `/wrangler:write-plan` — Interactive planning workflow
- `/wrangler:issues` — View issue status
- `/wrangler:implementing-issues` — Execute the generated plan
