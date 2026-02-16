---
name: fix-issues
description: Fixes issues identified in code review
---

Fix the issues identified during code review.

## Issues to Fix
{{#each actionableIssues}}
### {{this.severity}}: {{this.title}}
**Location**: {{this.location}}
**Description**: {{this.description}}
**Suggested Fix**: {{this.fix}}
{{/each}}

## Rules
1. Fix each issue systematically
2. Run tests after each fix
3. Do not introduce new issues
4. Return structured results with files changed
