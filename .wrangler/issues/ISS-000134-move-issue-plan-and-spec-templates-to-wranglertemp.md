---
id: ISS-000134
title: 'Move issue, plan, and spec templates to .wrangler/templates/'
type: issue
status: open
priority: medium
labels:
  - refactor
  - templates
  - governance
createdAt: '2026-02-16T07:07:12.352Z'
updatedAt: '2026-02-16T07:07:12.352Z'
---
## Summary

Centralize the templates for issues, plans, and specifications into `.wrangler/templates/` so they are discoverable by both skills and the workflow engine from a single canonical location.

## Current State

Templates for these artifact types are scattered across individual skill directories:
- `skills/creating-issues/templates/`
- `skills/writing-plans/templates/`
- `skills/writing-specifications/templates/`

## Proposed Changes

1. Create `.wrangler/templates/` directory with subdirs or flat files for:
   - Issue templates
   - Plan templates
   - Specification templates

2. Move the relevant template files from skill directories into `.wrangler/templates/`

3. Update the skills (`creating-issues`, `writing-plans`, `writing-specifications`) to reference the new centralized location instead of their local `templates/` dirs

4. Verify no other skills or tools reference the old template paths

## Why

- Single canonical location for artifact templates
- Workflow engine and MCP tools can find templates without knowing about skill directory structure
- Reduces duplication if multiple skills need the same template
