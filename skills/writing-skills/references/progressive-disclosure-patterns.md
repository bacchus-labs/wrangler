# Progressive Disclosure Patterns

## Overview

Progressive disclosure organizes complex skills into manageable pieces, respecting token budgets while preserving complete information.

## When to Use Progressive Disclosure

Use when skill meets ANY of these criteria:
- SKILL.md >500 lines
- Heavy reference material
- Multiple supporting files needed
- Complex multi-faceted workflows

## Pattern 1: High-Level Guide with References

**Structure**:
```
skill-name/
├── SKILL.md (overview + core workflow, <400 lines)
├── references/
│   ├── detailed-topic-1.md
│   ├── detailed-topic-2.md
│   └── edge-cases.md
```

**Use when**: Skill has extensive reference material

**Example**: `writing-skills` - core workflow in SKILL.md, detailed patterns in references/

## Pattern 2: Domain-Specific Organization

**Structure**:
```
skill-name/
├── SKILL.md (overview)
├── references/
│   ├── domain-a/
│   │   └── specifics.md
│   └── domain-b/
│       └── specifics.md
```

**Use when**: Skill covers multiple distinct domains

## Pattern 3: Conditional Details

**Structure**:
```
skill-name/
├── SKILL.md (common workflow)
├── references/
│   ├── edge-case-1.md
│   └── edge-case-2.md
```

**Use when**: Skill has common path + rare edge cases

## Best Practices

1. **SKILL.md is the entry point** - Always start there
2. **Explicit references** - Link to references/ files by name
3. **No duplication** - Information lives in one place
4. **Logical organization** - Group related content
5. **Respect token budget** - SKILL.md <500 lines target
