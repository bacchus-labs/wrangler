---
name: analyze-spec
description: Analyzes a specification file and extracts structured tasks
---

Read and analyze the specification file to extract implementation tasks.

## Spec File
{{specPath}}

## Instructions
1. Read the specification thoroughly
2. Extract implementation tasks with clear boundaries
3. Identify dependencies between tasks
4. List all testable requirements
5. Note technical constraints

## Output
Return structured JSON matching AnalysisResult:
- tasks: Array of {id, title, description, requirements, dependencies, estimatedComplexity, filePaths}
- requirements: Array of {id, description, source, testable}
- constraints: Array of strings
- techStack: {language, testFramework, buildTool?}

Do NOT implement anything. Analysis only.
