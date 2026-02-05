# Subagent Prompt Templates

## Code Reviewer Subagent Template

See `requesting-code-review` skill for the full template and process.

## Fix Subagent Template

```markdown
Tool: Task
Description: "Fix [Critical/Important] issue: [issue.description]"
Prompt: |
  You are fixing a [Critical/Important] code review issue.

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
