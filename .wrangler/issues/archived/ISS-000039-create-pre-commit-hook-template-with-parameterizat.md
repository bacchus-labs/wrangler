---
id: ISS-000039
title: Create pre-commit hook template with parameterization
type: issue
status: closed
priority: high
labels:
  - git-hooks
  - template
  - pre-commit
  - enforcement
createdAt: '2026-01-21T22:19:44.918Z'
updatedAt: '2026-02-02T21:55:10.155Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~150 LOC
---
## Overview
Create the pre-commit hook template that will be installed in project `.git/hooks/` directories. This hook handles formatting, linting, and unit tests before commits.

## Requirements
- Create template file at `skills/setup-git-hooks/templates/pre-commit.template.sh`
- Implement bypass mechanism (WRANGLER_SKIP_HOOKS env var)
- Support docs-only change detection
- Parameterized placeholders:
  - {{FORMAT_COMMAND}}
  - {{LINT_COMMAND}}
  - {{UNIT_TEST_COMMAND}}
  - {{DOCS_PATTERNS}}
- POSIX-compliant bash script
- Clear logging output with emoji indicators
- Error messages with remediation steps
- Performance target: complete in < 30 seconds

## Key Features
- Check bypass environment variable
- Detect docs-only changes (skip tests)
- Run formatter (auto-fix and re-stage)
- Run linter (blocking on failure)
- Run unit tests (blocking on failure)
- Provide clear success/failure messages

## Acceptance Criteria
- Template created with all placeholders
- POSIX-compliant syntax
- Bypass mechanism implemented
- Docs-only detection working
- Clear user feedback
- Error handling with exit codes
- Tested manually on sample project

## File Location
`skills/setup-git-hooks/templates/pre-commit.template.sh`

## Estimated Effort
~150 LOC bash script
