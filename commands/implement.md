---
name: wrangler:implement
description: Autonomously implement tasks from specs, plans, or issues using subagents with TDD and code review
---

## Parse User Input

Extract scope from user message:
- Specification reference (spec-*.md, SPEC-XXXXXX) -> use implementing-specs skill
- Single issue reference (#N, issue N, ISS-XXXXXX) -> use implementing-issue skill
- No clear scope -> ask user to specify

## Skill Selection

| User Request | Skill to Use |
|--------------|--------------|
| "implement this spec" | implementing-specs |
| "implement spec-foo.md" | implementing-specs |
| "implement this spec and create PR" | implementing-specs |
| "implement issue #42" | implementing-issue |
| "implement ISS-000042" | implementing-issue |

## For Specification Implementation

Use the Skill tool to load implementing-specs:
```
Skill: implementing-specs
```

The implementing-specs skill handles the full workflow: planning, execution, verification, and PR creation.

## For Single Issue Implementation

Use the Skill tool to load implementing-issue:
```
Skill: implementing-issue
```

The implementing-issue skill handles TDD implementation, code review, and fix loops for a single issue.
