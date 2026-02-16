---
id: ISS-000122
title: Create agent and prompt file loaders with schema validation
type: issue
status: closed
priority: high
labels:
  - spec-047
  - engine
createdAt: '2026-02-16T02:29:06.834Z'
updatedAt: '2026-02-16T03:12:30.863Z'
project: SPEC-000047
---
## Summary

Create loaders for agent and prompt markdown files. Both use YAML frontmatter + markdown body.

## Agent File Format

```markdown
---
name: reviewer
description: Code review specialist
tools: [Read, Glob, Grep]
model: sonnet
---
System prompt body here...
```

Frontmatter fields: name (required), description, tools (string[]), model (string)
Body: system prompt text

## Prompt File Format

```markdown
---
name: code-quality-review
description: Reviews code for quality
---
Task instructions with {{ mustache }} variables...
```

Frontmatter fields: name (required), description
Body: task instructions with optional Mustache template variables

## Requirements

- `loadAgent(filePath)` -> returns `{ name, description, tools, model, systemPrompt }`
- `loadPrompt(filePath)` -> returns `{ name, description, body }`
- Zod schemas for validation of both file types
- Extend existing `loader.ts` or create new file

## Files

- Modify: `workflows/engine/src/loader.ts` (add loadAgent, loadPrompt functions)
- Modify: `workflows/engine/src/schemas/` (add agent.ts, prompt.ts Zod schemas)
- Tests in existing test files or new ones

## Dependencies

- None (can be built independently of resolver)
