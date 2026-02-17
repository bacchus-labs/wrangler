---
id: "SPEC-TOS"
title: "Template Override System - Enabling Project-Specific Customization"
type: "specification"
status: "open"
priority: "medium"
labels: ["specification", "templates", "configuration", "ux"]
assignee: ""
project: "Wrangler v1.3.0"
createdAt: "2026-01-18T00:00:00.000Z"
updatedAt: "2026-01-18T00:00:00.000Z"
wranglerContext:
  agentId: "spec-writer"
  parentTaskId: "SPEC-IDWF-V2"
  estimatedEffort: "1-2 weeks"
---

# Specification: Template Override System

## Executive Summary

**What:** A two-tier template resolution system that allows users to override built-in wrangler templates by placing customized versions in their project's \`.wrangler/templates/\` directory.

**Why:** Currently, users cannot customize PR summaries, issue templates, or other generated content without modifying the wrangler plugin itself. This creates friction for teams with specific formatting requirements (Jira integration, custom sections, team-specific checklists).

**Scope:**

- **Included:** Template resolution logic, built-in default templates, project override mechanism, template copying command, placeholder substitution
- **Excluded:** Template inheritance/extension (replace only), template versioning, template marketplace

## Goals and Non-Goals

### Goals

1. **Enable customization** - Users can override any template by placing it in .wrangler/templates/
2. **Zero-config defaults** - Built-in templates work immediately without setup
3. **Team sharing** - Overrides in .wrangler/templates/ are git-tracked for team consistency
4. **Discoverability** - Easy to see what templates exist and how to customize them
5. **Simple resolution** - Project first, plugin fallback

### Non-Goals

- **Template inheritance** - No "extend" functionality initially (full replacement only)
- **Template versioning** - No tracking of template versions across wrangler updates
- **Dynamic templates** - No Turing-complete template logic (simple placeholders only)
- **Template validation** - No validation that overrides have required placeholders

## Background & Context

### Problem Statement

Teams have specific requirements for PR formats:

- Jira ticket references
- Custom review checklists
- Team-specific sections
- Compliance requirements

Currently, the only way to customize is to fork wrangler or manually edit PR content each time.

### Current State

Templates are embedded in skill directories:

- \`skills/create-new-issue/templates/\` - Issue templates
- \`skills/writing-specifications/templates/\` - Spec templates
- \`skills/sitrep/templates/\` - Report templates

Skills reference templates by relative path. No override mechanism exists.

### Proposed State

Two-tier resolution:

1. Check \`.wrangler/templates/{name}\` (project override)
2. Fall back to \`skills/{skill}/templates/{name}\` (built-in)

User runs \`/wrangler:copy-template pr-summary\` to get a copy to customize.

## Requirements

### Functional Requirements

- **FR-001:** System MUST check .wrangler/templates/ before skill templates/
- **FR-002:** System MUST fall back to built-in if no override exists
- **FR-003:** System MUST provide command to list available templates
- **FR-004:** System MUST provide command to copy template for customization
- **FR-005:** Templates MUST support \`{PLACEHOLDER}\` substitution syntax
- **FR-006:** Override templates MUST be git-tracked (not in .gitignore)

### Non-Functional Requirements

- **Performance:** Template resolution MUST add <10ms overhead
- **Maintainability:** Each skill owns its built-in templates (no central registry)
- **Backward Compatibility:** Skills without overrides MUST work identically

## Architecture

### Template Resolution Flow

```
Template Request("pr-summary.md")
         │
         ▼
┌────────────────────────┐
│ Check project override │
│ .wrangler/templates/   │
│    pr-summary.md       │
└────────────────────────┘
         │
    ┌────┴────┐
    │  Found? │
    └────┬────┘
    Yes  │  No
    │    │
    ▼    ▼
┌──────┐ ┌────────────────────────┐
│ Use  │ │ Check built-in         │
│ it   │ │ skills/*/templates/    │
└──────┘ │    pr-summary.md       │
         └────────────────────────┘
                  │
                  ▼
             Use built-in
```

### File Structure

```
.wrangler/
├── templates/                    # Project overrides (git-tracked)
│   ├── pr-summary.md            # Custom PR format
│   ├── issue.md                 # Custom issue format
│   └── specification.md         # Custom spec format
│
wrangler/skills/
├── implement/templates/
│   └── pr-summary.md            # Built-in default
├── create-new-issue/templates/
│   ├── BUG_ISSUE_TEMPLATE.md    # Built-in
│   ├── TASK_ISSUE_TEMPLATE.md   # Built-in
│   └── FEATURE_REQUEST_TEMPLATE.md
└── writing-specifications/templates/
    └── SPECIFICATION_TEMPLATE.md # Built-in
```

### Standard Template Names

| Template Name    | Purpose             | Used By                                   |
| ---------------- | ------------------- | ----------------------------------------- |
| pr-summary.md    | Pull request body   | implement, finishing-a-development-branch |
| issue.md         | Task issue creation | create-new-issue                          |
| bug-issue.md     | Bug report          | create-new-issue                          |
| specification.md | Spec creation       | writing-specifications                    |
| idea.md          | Idea capture        | capture-new-idea                          |

## Implementation Details

### Slash Command: /wrangler:list-templates

Output:

```markdown
## Available Templates

| Template      | Built-in Location                                        | Override                          |
| ------------- | -------------------------------------------------------- | --------------------------------- |
| pr-summary.md | skills/implement/templates/                              | .wrangler/templates/pr-summary.md |
| issue.md      | skills/create-new-issue/templates/TASK_ISSUE_TEMPLATE.md | (none)                            |
| bug-issue.md  | skills/create-new-issue/templates/BUG_ISSUE_TEMPLATE.md  | (none)                            |

To customize, run: /wrangler:copy-template <name>
```

### Slash Command: /wrangler:copy-template

Usage: \`/wrangler:copy-template pr-summary\`

Behavior:

1. Find built-in template
2. Create .wrangler/templates/ if needed
3. Copy with standardized name
4. Output: "Template copied to .wrangler/templates/pr-summary.md - customize as needed"

### Placeholder Syntax

```markdown
## Summary

{SUMMARY}

## Jira Ticket

**Ticket:** {JIRA_TICKET}

## Changes

{CHANGES}
```

**Supported Placeholders:**

- \`{SUMMARY}\` - Generated summary
- \`{CHANGES}\` - List of changes
- \`{ISSUE_TABLE}\` - Progress table for spec PRs
- \`{TEST_STATUS}\` - Test results
- \`{TEST_COMMAND}\` - Command that was run
- \`{JIRA_TICKET}\` - Extracted from branch name (if configured)

### Template Reading Pattern (for skills)

```markdown
## Load Template

1. Check for project override:
   \`\`\`bash
   if [ -f .wrangler/templates/pr-summary.md ]; then
   TEMPLATE=$(cat .wrangler/templates/pr-summary.md)
   else
     TEMPLATE=$(cat \${CLAUDE_PLUGIN_ROOT}/skills/implement/templates/pr-summary.md)
   fi
   \`\`\`

2. Substitute placeholders based on context
```

## Success Criteria

### Launch Criteria

- [ ] Template resolution working (project → plugin fallback)
- [ ] /wrangler:list-templates command implemented
- [ ] /wrangler:copy-template command implemented
- [ ] Built-in templates added to key skills
- [ ] Documentation updated

### Success Metrics

- Users can customize PR format without modifying wrangler
- Team settings persist via git

## References

### Parent Specification

- SPEC-IDWF-V2: Integrated Development Workflow v2

### Prior Art

- ESLint config extends pattern
- Tailwind CSS config merging
- npm init templates
