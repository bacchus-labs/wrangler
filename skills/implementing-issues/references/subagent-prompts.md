# Subagent Prompt Templates

## Implementation Subagent Template

```markdown
Tool: Task
Description: "Implement Task [N]: [title]"
Prompt: |
  You are implementing Task [N] from [scope reference].

  ## CRITICAL: Working Directory Context

  **Working directory:** [ABSOLUTE_WORK_DIR from setup phase]
  **Branch:** [WORK_BRANCH from setup phase]
  **Git root:** [GIT_ROOT from setup phase]

  ### MANDATORY: Verify Location First

  [See working-directory-protocol.md for verification command]

  ## Task Requirements

  [Full task description from task.description]

  ## Acceptance Criteria

  [task.requirements]

  ## Related Files

  [task.relatedFiles]

  ## Your Job

  1. **Verify location** (FIRST)
  2. **Follow TDD** (practicing-tdd skill)
  3. **Create TDD Compliance Certification**
  4. **Verify implementation works**
  5. **Commit your work**
  6. **Report back** with all required information

  IMPORTANT: If you encounter unclear requirements, STOP and report the blocker.
```

## Code Reviewer Subagent Template

See requesting-code-review skill for full template.

## Fix Subagent Template

```markdown
Tool: Task
Description: "Fix [Critical/Important] issue: [issue.description]"
Prompt: |
  You are fixing a [Critical/Important] code review issue from Task [N].

  ## Issue

  [issue.description]

  ## Fix Instructions

  [issue.fixInstructions]

  ## Your Job

  1. Implement the fix
  2. Run tests to verify fix works
  3. Commit the fix
  4. Report: What you changed, test results
```
