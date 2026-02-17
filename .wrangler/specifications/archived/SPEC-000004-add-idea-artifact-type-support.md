---
id: SPEC-000004
title: Add 'idea' artifact type support to MCP server
type: specification
status: closed
priority: high
labels:
  - mcp
  - skills
  - feature
createdAt: '2025-11-24T02:09:31.691Z'
updatedAt: '2025-12-03T21:15:00.000Z'
---
## Overview

Add support for 'idea' artifact type to the wrangler MCP server, allowing users to capture ideas in `.wrangler/ideas/` directory.

## Requirements

### MCP Server Changes
1. Add 'idea' to `IssueArtifactType` union type in `mcp/types/issues.ts`
2. Add `DEFAULT_IDEA_DIR = '.wrangler/ideas'` constant in `mcp/providers/markdown.ts`
3. Register ideas collection in MarkdownIssueProvider constructor
4. Update Zod schemas in tool files to accept 'idea' type

### Tests (TDD - write these FIRST)
1. Test creating idea artifact goes to `.wrangler/ideas/` directory
2. Test idea frontmatter includes `type: idea`
3. Test listing/searching/filtering ideas works

### Skill Implementation
1. Create `skills/project-management-artifacts/capture-new-idea/` directory
2. Create `SKILL.md` with instructions for capturing user ideas verbatim
3. Create `templates/IDEA_TEMPLATE.md` with idea file structure

## Acceptance Criteria

- [x] All tests pass following TDD (RED-GREEN-REFACTOR)
- [x] Ideas are created in `.wrangler/ideas/` directory
- [x] `capture-new-idea` skill can be invoked to create ideas via MCP
- [x] User's exact wording is preserved in idea description
- [x] End-to-end test: invoke skill, verify idea file created correctly

## Completion Notes (2025-12-03)

All requirements implemented:

1. **MCP Server Changes**:
   - `IssueArtifactType` includes `'idea'` (`mcp/types/issues.ts:7`)
   - `DEFAULT_IDEA_DIR = '.wrangler/ideas'` via workspace-schema.ts
   - Ideas collection registered in MarkdownIssueProvider constructor (`mcp/providers/markdown.ts:62-64`)
   - Zod schemas updated to accept 'idea' type

2. **Tests**: 254 tests pass including idea-specific tests in:
   - `mcp/__tests__/providers/idea-artifact.test.ts`
   - `mcp/__tests__/tools/issues/idea-type-schema.test.ts`
   - `mcp/__tests__/providers/markdown.test.ts` (idea creation test)

3. **Skill**: `skills/project-management/capture-new-idea/SKILL.md` created with template

4. **Verified**: End-to-end test confirmed ideas created in `.wrangler/ideas/` with correct frontmatter
