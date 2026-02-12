---
id: ISS-000103
title: 'Add {{else}} support to workflow template engine'
type: issue
status: open
priority: low
labels:
  - workflow-engine
  - v2
  - enhancement
createdAt: '2026-02-12T17:30:43.411Z'
updatedAt: '2026-02-12T17:30:43.411Z'
project: Deterministic Pipeline
---
## Context

From code review of the workflow engine (PR #26).

The template engine in `loader.ts` supports `{{#if expr}}...{{/if}}` but not `{{#if expr}}...{{else}}...{{/if}}`. This is a common expectation for users familiar with Handlebars-like templating.

## Proposed Fix

Add `{{else}}` block support to the `{{#if}}` processing in `renderTemplate()`. Split the block content on `{{else}}` and render the appropriate half based on the condition.

## Priority

Nice to have. Current workaround is using two separate `{{#if}}` blocks with inverted conditions.
