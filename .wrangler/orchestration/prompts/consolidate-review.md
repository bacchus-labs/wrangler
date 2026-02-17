---
name: consolidate-review
description: Consolidates findings from multiple review passes into a single report
---

Consolidate the review findings from multiple parallel reviews into a single actionable report.

## Review Results
{{#if codeQuality}}
### Code Quality Review
{{codeQuality}}
{{/if}}

{{#if security}}
### Security Review
{{security}}
{{/if}}

{{#if testing}}
### Testing Review
{{testing}}
{{/if}}

## Instructions
1. Deduplicate issues found by multiple reviewers
2. Prioritize: Critical issues first, then Important, then Minor
3. Group related issues together
4. Provide a clear overall assessment
5. List specific action items

## Output
Return structured JSON with:
- overallAssessment: "approve" | "needs-fixes" | "major-revision"
- criticalCount: number
- importantCount: number
- minorCount: number
- consolidatedIssues: Array of {severity, location, title, description, fix, foundBy: string[]}
- actionItems: Array of strings (ordered by priority)
- strengths: Array of strings
