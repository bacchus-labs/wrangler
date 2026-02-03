---
id: ISS-000042
title: Create hooks configuration JSON schema and template
type: issue
status: closed
priority: high
labels:
  - configuration
  - schema
  - template
createdAt: '2026-01-21T22:19:45.323Z'
updatedAt: '2026-02-02T21:55:11.704Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~50 LOC
---
## Overview
Define the JSON schema for `.wrangler/hooks-config.json` and create a default template with sensible defaults.

## Requirements
- Define JSON schema in skill documentation
- Create default template file
- Support all hook configuration options:
  - version (string)
  - createdAt (ISO 8601 timestamp)
  - testCommand (string, required)
  - unitTestCommand (string, optional)
  - formatCommand (string, optional)
  - lintCommand (string, optional)
  - protectedBranches (array of strings)
  - skipDocsOnlyChanges (boolean)
  - docsPatterns (array of globs)
  - enableSecretScanning (boolean)
  - enableCommitMsgValidation (boolean)
  - bypassEnvVar (string)
- Provide language-specific default templates (JS/TS, Python, Go)

## Acceptance Criteria
- JSON schema documented
- Default template created
- Language-specific templates for:
  - JavaScript/TypeScript (npm)
  - Python (pytest)
  - Go (go test)
- Schema validation logic (can be done in setup skill)
- Clear documentation of each field
- Examples included

## File Location
`skills/setup-git-hooks/templates/hooks-config.json.template`

## Estimated Effort
~50 LOC JSON + documentation
