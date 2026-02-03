---
id: ISS-000040
title: Create pre-push hook template with protected branch detection
type: issue
status: closed
priority: high
labels:
  - git-hooks
  - template
  - pre-push
  - enforcement
createdAt: '2026-01-21T22:19:45.068Z'
updatedAt: '2026-02-02T21:55:10.667Z'
project: Wrangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~120 LOC
---
## Overview
Create the pre-push hook template that runs full test suite on protected branches before allowing pushes.

## Requirements
- Create template file at `skills/setup-git-hooks/templates/pre-push.template.sh`
- Implement bypass mechanism (WRANGLER_SKIP_HOOKS env var)
- Protected branch pattern matching
- Parameterized placeholders:
  - {{TEST_COMMAND}}
  - {{PROTECTED_BRANCHES}}
- POSIX-compliant bash script
- Parse git push input (stdin with refs)
- Clear logging output
- Error messages with remediation steps
- Performance target: up to 10 minutes acceptable

## Key Features
- Check bypass environment variable
- Read push refs from stdin
- Extract target branch name
- Match against protected branch patterns (regex)
- Run full test suite only on protected branches
- Skip for non-protected branches
- Provide clear feedback on what's happening

## Acceptance Criteria
- Template created with all placeholders
- POSIX-compliant syntax
- Bypass mechanism implemented
- Protected branch detection working (main, master, feature/*, fix/*)
- Handles multiple branches being pushed
- Clear user feedback
- Error handling with exit codes
- Tested manually on sample project

## File Location
`skills/setup-git-hooks/templates/pre-push.template.sh`

## Estimated Effort
~120 LOC bash script
