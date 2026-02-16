---
name: review-testing
description: Reviews test coverage and quality
---

Review the test coverage and quality for the recent changes.

## Changed Files
{{#each analysis.changedFiles}}
- {{this.path}} ({{this.changeType}}): {{this.summary}}
{{/each}}

## Testing Checklist
1. **Coverage**: All new code paths have tests
2. **Quality**: Tests verify behavior, not mocks
3. **Edge Cases**: Error paths, boundary conditions, empty inputs tested
4. **Isolation**: Tests are independent, no shared state
5. **TDD Evidence**: Tests appear to have been written before implementation

## Output
Return structured JSON with:
- issues: Array of {severity: "critical"|"important"|"minor", location: string, title: string, description: string, fix: string}
- strengths: Array of strings
- coverageAssessment: string describing test coverage quality
- hasActionableIssues: boolean
