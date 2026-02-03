---
id: ISS-000041
title: Create commit-msg hook template (optional)
type: issue
status: closed
priority: medium
labels:
  - git-hooks
  - template
  - commit-msg
  - optional
createdAt: '2026-01-21T22:19:45.212Z'
updatedAt: '2026-02-02T21:55:11.186Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~80 LOC
---
## Overview
Create an optional commit-msg hook template that validates commit message format and conventions.

## Requirements
- Create template file at `skills/setup-git-hooks/templates/commit-msg.template.sh`
- Implement bypass mechanism (WRANGLER_SKIP_HOOKS env var)
- Optional feature (only installed if user requests)
- Parameterized placeholders:
  - {{COMMIT_MSG_PATTERN}}
  - {{COMMIT_MSG_MIN_LENGTH}}
  - {{COMMIT_MSG_MAX_LENGTH}}
- POSIX-compliant bash script
- Read commit message from file ($1)
- Validate format (conventional commits, custom regex)
- Clear error messages with examples

## Key Features
- Check bypass environment variable
- Read commit message from file argument
- Validate message length
- Validate message format (regex pattern)
- Support conventional commits format (feat:, fix:, docs:, etc.)
- Provide helpful examples on failure
- Non-blocking for bypass users

## Acceptance Criteria
- Template created with all placeholders
- POSIX-compliant syntax
- Bypass mechanism implemented
- Message validation working
- Supports conventional commits by default
- Clear user feedback with examples
- Error handling with exit codes
- Tested manually on sample project

## File Location
`skills/setup-git-hooks/templates/commit-msg.template.sh`

## Estimated Effort
~80 LOC bash script
