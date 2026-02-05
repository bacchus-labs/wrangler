# Code Review Automation - Detailed Guide

## Process Overview

1. Dispatch code reviewer
2. Parse feedback (Critical/Important/Minor)
3. Auto-fix Critical issues (2 attempts)
4. Auto-fix Important issues (2 attempts)
5. Document Minor issues
6. Verify all Critical/Important fixed

## Handling Critical Issues

**Attempt 1:**
- Dispatch fix subagent with issue details
- Verify fix works and tests pass

**Attempt 2 (if attempt 1 fails):**
- Dispatch fresh fix subagent
- Use "start from scratch" instruction
- Try different approach

**Escalation (if attempt 2 fails):**
- STOP execution
- Report blocker to user
- Include all fix attempts and current state

## Handling Important Issues

Same process as Critical issues.
Must be resolved before continuing to next task.

## Handling Minor Issues

Document only, don't fix:
```markdown
## Minor Issues Noted (not fixed automatically)

- [issue 1 description]
- [issue 2 description]

These can be addressed in a future refactoring pass if desired.
```

Continue to next task without fixing.
