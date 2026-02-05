# Working Directory Protocol

## Critical: Location Verification

Before ANY work, subagents must verify they're in the correct directory.

### Verification Command

```bash
cd [ABSOLUTE_WORK_DIR] && \
  echo "=== LOCATION VERIFICATION ===" && \
  echo "Directory: $(pwd)" && \
  echo "Git root: $(git rev-parse --show-toplevel)" && \
  echo "Branch: $(git branch --show-current)" && \
  echo "Expected: [ABSOLUTE_WORK_DIR] on [WORK_BRANCH]" && \
  test "$(pwd)" = "[ABSOLUTE_WORK_DIR]" && echo "VERIFIED" || echo "FAILED - STOP"
```

### Command Pattern (REQUIRED)

ALL bash commands MUST use this pattern:
```bash
cd [ABSOLUTE_WORK_DIR] && [your command]
```

Examples:
- Tests: `cd [ABSOLUTE_WORK_DIR] && npm test`
- Git: `cd [ABSOLUTE_WORK_DIR] && git status`
- Build: `cd [ABSOLUTE_WORK_DIR] && npm run build`

**Never run git commands without the `cd [ABSOLUTE_WORK_DIR] &&` prefix.**

## Worktree Isolation

If working in a worktree, all subagent prompts MUST include:
- Absolute working directory path
- Current branch name
- Git root path
- Worktree status flag

This prevents subagents from working in the wrong directory.
