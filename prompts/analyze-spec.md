---
name: analyze-spec
description: Analyze a specification and break it into implementation tasks
---

Analyze the following specification and break it into discrete implementation tasks.

## Specification

{{ spec.content }}

## Instructions

1. Read the entire specification
2. Identify discrete, implementable tasks
3. For each task, define: id, title, description, and dependencies (other task ids that must complete first)
4. Order tasks by dependency (tasks with no dependencies first)
5. Ensure every requirement in the spec is covered by at least one task

## Output

Return a JSON object:

```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Short descriptive title",
      "description": "Detailed implementation description including what to build and how to test it",
      "dependencies": []
    }
  ],
  "summary": "Brief overview of the implementation approach"
}
```
