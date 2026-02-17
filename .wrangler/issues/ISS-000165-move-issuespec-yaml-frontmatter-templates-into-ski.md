---
id: ISS-000165
title: Move issue/spec YAML frontmatter templates into skill templates/ directories
type: issue
status: open
priority: low
labels:
  - skills
  - templates
  - cleanup
createdAt: '2026-02-17T22:53:54.691Z'
updatedAt: '2026-02-17T22:53:54.691Z'
---
## Context

The YAML frontmatter schema for issues and specifications (showing all available fields: id, title, type, status, priority, labels, assignee, project, createdAt, updatedAt, wranglerContext with subfields) was previously embedded in CLAUDE.md. During the documentation overhaul (SPEC-000050), it was removed from CLAUDE.md and exists only in `docs/mcp-usage.md`.

Per the skill directory conventions documented in `.wrangler/memory/CODING_STANDARDS.md`, skills should use `templates/` subdirectories for template files referenced by the skill.

## What to do

Add frontmatter template files to the relevant skill `templates/` directories:

- `skills/creating-issues/templates/` -- issue frontmatter template with all fields and allowed values
- `skills/writing-specifications/templates/` -- specification frontmatter template

These templates should serve as the authoritative reference for the YAML schema, so agents creating issues/specs via skills have the schema available without needing to read docs/mcp-usage.md.

Check if these skills already have `templates/` dirs and whether any existing templates cover this. If templates already exist, augment rather than duplicate.
