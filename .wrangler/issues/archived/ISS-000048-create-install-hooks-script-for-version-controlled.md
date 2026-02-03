---
id: ISS-000048
title: Create install-hooks script for version-controlled hooks pattern (Pattern B)
type: issue
status: closed
priority: medium
labels:
  - script
  - pattern-b
  - version-control
  - installation
createdAt: '2026-01-21T22:19:46.187Z'
updatedAt: '2026-02-02T21:55:13.290Z'
project: Rangler Core Framework
wranglerContext:
  parentTaskId: SPEC-000041
  estimatedEffort: ~100 LOC
---
## Overview
Create a shell script that supports the version-controlled hooks pattern (like MEDB project), where hooks are committed to the repository and developers run an install script to symlink them.

## Requirements
- Create script at `skills/setup-git-hooks/templates/install-hooks.sh`
- Supports Pattern B: Version-controlled hooks + install script
- Script functionality:
  1. Find all hooks in `.wrangler/git-hooks/` directory
  2. Create symlinks in `.git/hooks/` pointing to versioned hooks
  3. Make hooks executable
  4. Verify symlinks created successfully
  5. Provide clear output
- Include README template for Pattern B workflow
- Document both patterns in skill

## Pattern B Workflow
```
project/
├── .wrangler/
│   └── git-hooks/           # Version-controlled hooks
│       ├── pre-commit
│       ├── pre-push
│       └── commit-msg
├── scripts/
│   └── install-hooks.sh     # Developer runs this once
└── .git/
    └── hooks/               # Symlinks to .wrangler/git-hooks/
        ├── pre-commit -> ../../.wrangler/git-hooks/pre-commit
        └── pre-push -> ../../.wrangler/git-hooks/pre-push
```

## Script Features
- Detect git repository
- Check if .wrangler/git-hooks/ exists
- Remove existing hooks (with confirmation)
- Create symlinks
- Set executable permissions
- Validate installation
- Idempotent (safe to re-run)

## Acceptance Criteria
- install-hooks.sh script created
- POSIX-compliant bash
- Clear user feedback
- Error handling
- Tested on macOS and Linux
- Documentation for Pattern B added to skill
- README template for Pattern B

## File Locations
- `skills/setup-git-hooks/templates/install-hooks.sh`
- `skills/setup-git-hooks/templates/PATTERN_B_README.md`

## Estimated Effort
~100 LOC (script + docs)
