---
title: build-plan-for-spec
description: Generate a development plan by creating issues through MCP tools.
---

## Goal

You are an expert software engineer and software development project manager. Generate a multi-step development plan for this specification file: {{ spec_filename }}. The plan should be broken down into small, incremental steps that can be implemented safely and build on each other. You will be using the Wrangler MCP server's issue management tools to create and/or modify the plan steps.

## Guidelines

- DO NOT start coding; only produce a high-quality plan.
- DO study the existing codebase/architecture before drafting steps.
- DO keep each step small (aim for <250 LOC when implemented) and incremental.
- DO ensure every issue explicitly references `{{ spec_filename }}` so downstream work can trace back to the spec.
- DO capture rationale, acceptance criteria, technical notes, and dependencies in each issue description.
- DO use `issues_create` to generate new steps and `issues_update` if you later refine the same step.
- DO use `issues_list` / `issues_search` to confirm what you have already created.
- DO iterate on the plan until the steps are right sized and cover the full specification.
- DO NOT add security/performance/backward-compat requirements unless asked.
- DO NOT leave gaps—every step should build on earlier work.
- DO NOT stop to ask for feedback during execution. You are being run in a headless mode and will not be able to converse with a user.

## Process

1. Read and analyze the specified specification file: `{{ spec_filename }}`.
2. Review the existing code to determine what parts of the specification might already be implemented. Unless explicitly instructed otherwise in the specification, do not add new systems/services when existing patterns and systems can be extended to achieve the goals.
3. THINK DEEPLY about the best way to implement the specification, considering architecture, design patterns, and maintainability.
4. Draft a detailed, step-by-step plan to meet the specification, write this out to a temp file `.wrangler/tmp/{{ spec_filename }}_DRAFT_PLAN.md`, refer to this draft plan to refresh your memory.
5. Once you have the draft plan in place, review it again and think deeply about whether the implementation steps are broken down into small, logically ordered chunks that build on each other incrementally. Make improvements as necessary and update the draft plan file if you need to break steps down further into smaller chunks.
6. Use your todo list MCP tool to give yourself todo items for creating each issue file that needs to be created and keep your todo list up to date as you go.
7. For each finalized implementation plan step, call `issues_create` with a payload that includes:
   - `title`: short, action-oriented statement.
   - `description`: markdown with sections for context, acceptance criteria, technical notes, and references (include `Refer to {{ spec_filename }}`).
   - `priority`, `labels`, `assignee` (leave blank if unknown), `project` = `{{ spec_filename }}`.
8. When a step requires adjustments after creation, call `issues_update` on its `issueId` instead of creating a new issue.

Once you have finished creating ALL of the task issues for the plan, use `issues_list` (optionally filtered by `project: {{ spec_filename }}`) to verify the full set of steps is present and ordered correctly. Review the issue files and make sure that the steps are small enough to be implemented safely, but big enough to move the project forward. Make adjustments or improvements as necessary.

## Issue Creation Example

```json
{
  "name": "issues_create",
  "arguments": {
    "title": "Plan Step: Implement authentication service",
    "description": "## Description
Implement the service layer for auth. Refer to {{ spec_filename }}.

## Context

Reference: {{ spec_filename }}

[Any relevant context from the specification]

## Acceptance Criteria
- [ ] Token generation endpoint
- [ ] Unit tests for success/failure cases

## Technical Notes
- Reuse existing DB module.

## Testing Requirements
- Unit tests for all new functions.

## Dependencies
- Previous step: schema migrations
",
    "priority": "medium",
    "labels": ["plan-step", "implementation"],
    "project": "{{ spec_filename }}"
  }
}
```

If you later need to adjust that step, run `issues_update` with the returned `issueId` and only the fields you want to modify (e.g., tweak acceptance criteria or change priority).

### Update Example

```json
{
  "name": "issues_update",
  "arguments": {
    "id": "<issueId>",
    "priority": "high",
    "description": "## Description\nRefine the auth service to cover refresh tokens. Refer to {{ spec_filename }}.\n\n## Acceptance Criteria\n- [ ] Refresh tokens rotated every 30 minutes\n- [ ] Tests updated for token refresh flow\n",
    "labels": ["plan-step", "implementation", "follow-up"]
  }
}
```

## Checklist before finishing

- Every single issue file has been created. DO NOT stop until all of the issues are created.
- Every step references `{{ spec_filename }}`.
- Issues are numbered automatically by the Wrangler MCP server; do not attempt to handcraft filenames. If this doesn't work, you can fall back to creating them manually.
- `issues_list` output matches the desired execution order.
- The plan covers the entire specification without overscoping.
