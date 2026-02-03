---
id: SPEC-000043
title: Align Wrangler Skills with Anthropic 2026 Standards
type: specification
status: open
priority: critical
labels:
  - skills
  - standards
  - anthropic
  - refactoring
  - architecture
createdAt: '2026-02-02T22:09:41.056Z'
updatedAt: '2026-02-02T22:50:00.000Z'
project: Skills Modernization 2026
---
## Overview

Wrangler's skills were created when Anthropic's skill-creator skill was in early development. Since then, Anthropic has significantly evolved their standards and best practices for Agent Skills. This specification defines the requirements to align all wrangler skills with Anthropic's 2026 standards while preserving wrangler's superior TDD testing methodology.

**Scope**: All 47 existing wrangler skills + skill creation infrastructure

**Key Sources**:

- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skill Creator Skill](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

---

## Goals

1. **Align with 2026 Standards**: Match Anthropic's current best practices for skill structure, naming, and organization
2. **Reduce Token Bloat**: Eliminate unnecessary patterns and optimize for token efficiency
3. **Improve Discoverability**: Ensure all skills have proper triggering mechanisms via descriptions
4. **Enhance Organization**: Adopt progressive disclosure patterns for complex skills
5. **Preserve Advantages**: Maintain wrangler's superior TDD testing methodology

---

## Requirements

### R1: Remove Skill Invocation Announcement Pattern (CRITICAL)

**Current State**: Every skill includes a "Skill Usage Announcement" section (~10 lines) instructing agents to announce skill usage with "🔧 Using Skill: X"

**Gap**: This pattern does not exist in Anthropic standards and adds unnecessary token bloat.

**Decision**: Remove entirely (Claude Code tracks skill usage natively)

**Requirements**:

- Remove "Skill Usage Announcement" section from all 47 skills
- Do NOT move to CLAUDE.md (not needed)
- Update any documentation that references this pattern

**Affected Skills**: ALL 47 skills

**Token Savings**: ~470 lines (10 lines × 47 skills)

**Acceptance Criteria**:

- ✅ No skill contains "Skill Usage Announcement" section
- ✅ No skill contains "🔧 Using Skill:" pattern
- ✅ No documentation references skill announcement requirement
- ✅ All skills remain functional without announcement pattern

---

### R2: Adopt Gerund Naming Conventions (CRITICAL)

**Current State**: Mixed naming patterns across skills:

- Gerund: `writing-skills`, `testing-skills`, `dispatching-parallel-agents`
- Noun: `test-driven-development`, `code-review`, `implement-spec`
- Action: `create-new-issue`, `capture-new-idea`

**Gap**: Anthropic recommends gerund form (verb + -ing) for consistency and discoverability

**Decision**: Convert ALL existing skills to gerund form

**Requirements**:

- Rename all non-gerund skills to gerund form
- Update frontmatter `name` field in affected skills
- Update all slash command references to renamed skills
- Update all cross-references in other skills
- Update documentation referencing old names
- Maintain backward compatibility where possible (file redirects, aliases)

**Naming Conversion Examples**:

- `test-driven-development` → `practicing-tdd`
- `code-review` → `reviewing-code`
- `implement-spec` → `implementing-specs`
- `create-new-issue` → `creating-issues`
- `capture-new-idea` → `capturing-ideas`
- `check-constitutional-alignment` → `checking-constitutional-alignment`

**Affected Skills**: ~30 skills with non-gerund names

**Affected Slash Commands**: ALL commands in `commands/` directory that invoke skills

**Acceptance Criteria**:

- ✅ All skill names use gerund form (verb + -ing)
- ✅ All skill `name` fields in frontmatter match directory names
- ✅ All slash commands reference correct skill names
- ✅ All cross-references between skills updated
- ✅ Documentation updated with new names
- ✅ No broken skill invocations

**Dependencies**: Must update slash commands after renaming skills

---

### R3: Verify and Fix Template Frontmatter Format (CRITICAL)

**Current State**: Unknown if template matches Anthropic standard

**Gap**: Template determines format for new skills

**Requirements**:

- Verify template uses YAML frontmatter with ONLY `name` and `description` fields
- No table-based frontmatter
- No additional custom fields in base template
- Format matches Anthropic standard exactly:

```yaml
---
name: skill-name
description: What the skill does and when to use it. Use when [triggers].
---
```

**Affected Files**:

- Skill creation template (location TBD - check `writing-skills` or template directory)
- `writing-skills` skill (may contain template guidance)

**Acceptance Criteria**:

- ✅ Template uses YAML frontmatter format
- ✅ Template contains only `name` and `description` fields
- ✅ Template includes example description with "Use when..." pattern
- ✅ No table-based frontmatter in template

---

### R4: Implement Progressive Disclosure for Complex Skills (HIGH)

**Current State**: Most skills are self-contained in single SKILL.md, no consistent subdirectory structure

**Gap**: Anthropic recommends three-level loading system with organized subdirectories

**Requirements**:

**Directory Structure Pattern**:

```
skill-name/
├── SKILL.md (overview, <500 lines)
├── scripts/ (executable code, loaded as needed)
├── references/ (documentation loaded as needed)
└── assets/ (files used in output)
```

**Apply to Priority Skills**:

1. **writing-skills** (CRITICAL - currently 870 lines)
   - SKILL.md: Overview + core workflow (<400 lines)
   - `references/anthropic-best-practices.md`
   - `references/testing-methodology.md` (TDD for skills)
   - `references/persuasion-techniques.md` (rationalization tables)
   - `references/cso-optimization.md` (Claude Search Optimization)
   - `references/progressive-disclosure-patterns.md` (patterns for organizing complex skills)
   - `assets/graphviz-conventions.dot`

2. **Other verbose skills** (identify during audit):
   - Any skill >300 lines
   - Any skill with heavy reference material
   - Skills with multiple supporting files

**New SKILL.md Structure** (for complex skills):

1. Overview (what + when to use)
2. Core workflow (essential steps)
3. Quick reference (key patterns/commands)
4. Links to detailed references (explicitly reference `references/` files)

**Acceptance Criteria**:

- ✅ `writing-skills` SKILL.md reduced to <400 lines
- ✅ `writing-skills` uses `references/` and `assets/` subdirectories
- ✅ All skills >500 lines evaluated for progressive disclosure
- ✅ Supporting files organized by type (scripts/references/assets)
- ✅ SKILL.md files explicitly reference supporting files when needed
- ✅ No loss of content, just reorganized

---

### R5: Standardize Description Format for All Skills (HIGH)

**Current State**: Variable description formats:

- Some include "Use when..." triggers ✅
- Some are purely functional descriptions ❌
- Some missing specific triggering symptoms ❌

**Gap**: Description is PRIMARY triggering mechanism for skill discovery

**Requirements**:

**Standard Format**:

```yaml
description: [Functional description of what skill does]. Use when [specific triggers, symptoms, keywords, or file patterns].
```

**Requirements for Each Description**:

1. Third-person voice
2. Functional description (what it does)
3. Triggering clause ("Use when..." with specific symptoms)
4. Maximum 1024 characters
5. Includes relevant keywords for discoverability

**Example Good Descriptions**:

```yaml
# Good - includes both what and when
description: Orchestrates systematic code review with multi-level verification. Use when reviewing code changes, pull requests, or when quality assurance is needed.

# Good - specific triggers
description: Creates implementation plans from specifications. Use when implementing specs, planning features, or when user mentions SPEC- files.

# Bad - missing triggers
description: Comprehensive code review framework for quality assurance.
```

**Process**:

1. Audit all 47 skill descriptions
2. Identify descriptions missing "Use when..." clause
3. Rewrite to include specific triggers/symptoms
4. Test discoverability with sample queries
5. Ensure descriptions optimize for Claude Search Optimization

**Affected Skills**: ALL 47 skills (audit required)

**Acceptance Criteria**:

- ✅ All 47 skills have descriptions with "Use when..." clause
- ✅ All descriptions are third-person voice
- ✅ All descriptions ≤1024 characters
- ✅ Descriptions include relevant triggering keywords
- ✅ Skills are discoverable via typical user queries

---

### R6: Establish and Enforce Token Efficiency Guidelines (HIGH)

**Current State**: No explicit token budget awareness, `writing-skills` is 870 lines (75% over budget)

**Gap**: Anthropic has specific token efficiency targets

**Requirements**:

**Token Efficiency Standards** (add to CLAUDE.md):

- SKILL.md body: <500 lines (target: 300-400 lines)
- Getting-started workflows: <150 words
- Frequently-used skills: <200 words total
- Complex skills: <500 words main content, rest in `references/`
- Principle: "The context window is a public good"

**Action Items**:

1. Split `writing-skills` immediately (see R4)
2. Audit all skills for length
3. Identify skills >500 lines
4. Apply progressive disclosure to oversized skills
5. Document token efficiency guidelines in CLAUDE.md

**Target Metrics**:

- `writing-skills`: 870 lines → <400 lines (move 470+ lines to references/)
- All skills: Target <500 lines in SKILL.md
- Frequently-used skills (TDD, code review): Target <300 lines

**Acceptance Criteria**:

- ✅ Token efficiency guidelines documented in CLAUDE.md
- ✅ `writing-skills` reduced to <400 lines
- ✅ No skill exceeds 500 lines in SKILL.md without justification
- ✅ Heavy content moved to `references/` subdirectories
- ✅ All skills respect token budget

---

### R7: Standardize Directory Structure for Multi-File Skills (HIGH)

**Current State**: Flat structure with supporting files at skill root

**Gap**: Anthropic recommends organized subdirectories by resource type

**Requirements**:

**Standard Structure**:

```
skill-name/
  SKILL.md (required)
  scripts/ (executable code - if applicable)
  references/ (documentation - if applicable)
  assets/ (templates, boilerplate - if applicable)
```

**Migration Pattern**:

- Supporting markdown files → `references/`
- Executable scripts (.sh, .py, .js) → `scripts/`
- Templates, diagrams, config files → `assets/`

**Affected Skills**:

- `writing-skills` (has 4 supporting files)
- Any other skills with multiple files (audit required)

**Acceptance Criteria**:

- ✅ All multi-file skills use subdirectory structure
- ✅ Files organized by type (scripts/references/assets)
- ✅ SKILL.md references subdirectory files explicitly
- ✅ No supporting files at skill root level (except SKILL.md)

---

### R8: Enhance Template Usage Patterns (MEDIUM)

**Current State**: Unknown level of template usage across skills

**Gap**: Anthropic recommends providing templates with "Template pattern" approach

**Requirements**:

**Template Pattern Types**:

1. **Strict templates** for API responses, data formats
2. **Flexible templates** for adaptable workflows
3. **Copy-this-checklist pattern** for multi-step workflows

**Action Items**:

1. Audit skills for template opportunities
2. Identify skills that would benefit from templates
3. Add template sections where appropriate
4. Store templates in `assets/` subdirectory

**Candidate Skills**:

- `writing-specifications` (specification template)
- `implementing-specifications` (implementation checklist)
- `reviewing-code` (review checklist)
- `systematic-debugging` (debugging checklist)

**Acceptance Criteria**:

- ✅ Complex workflow skills include checklist templates
- ✅ Templates use "Copy this checklist:" pattern
- ✅ Templates stored in `assets/` subdirectory
- ✅ Templates are actionable and self-contained

---

### R9: Reduce Documentation Verbosity (MEDIUM)

**Current State**: Some skills are verbose with unnecessary explanations

**Gap**: Anthropic principle: "Default assumption: Claude is already very smart"

**Requirements**:

**Verbosity Reduction Principles**:

1. Only add context Claude doesn't have
2. Challenge each paragraph: "Does this justify its token cost?"
3. Assume Claude knows common concepts (PDF, Git, TDD, etc.)
4. Focus on what's unique/specific to the skill
5. Cut examples that don't add new information

**Process**:

1. Audit each skill for verbosity
2. Identify unnecessary explanations
3. Remove/compress redundant content
4. Preserve unique insights and techniques

**Example**:

```markdown
❌ BAD (verbose):
TDD (Test-Driven Development) is a software development methodology where
you write tests before implementing code. This ensures code correctness...

✅ GOOD (concise):
Write tests first, then implement to pass them.
```

**Affected Skills**: ALL 47 skills (audit required)

**Acceptance Criteria**:

- ✅ No unnecessary explanations of common concepts
- ✅ Content focuses on unique skill-specific guidance
- ✅ Examples are concise and demonstrate novel patterns
- ✅ Token count reduced without losing essential information

---

### R10: Maintain Cross-Reference Best Practices (MEDIUM)

**Current State**: Good patterns already in place

**Gap**: This is NOT actually a gap - wrangler already follows Anthropic standards

**Requirements**:

**Current Good Practices** (maintain these):

- Use skill names directly (no @ links)
- Use "REQUIRED SUB-SKILL" markers
- Explicit invocation patterns
- Clear dependency chains

**Action Items**:

1. Verify current approach matches Anthropic standards ✅
2. Document cross-reference patterns in CLAUDE.md
3. Ensure consistency across all skills

**Acceptance Criteria**:

- ✅ Cross-reference patterns documented
- ✅ All skills follow consistent reference format
- ✅ No use of @ links (continue avoiding)
- ✅ Skill dependencies are explicit

---

### R11: Document Progressive Disclosure Patterns (LOW)

**Current State**: Minimal examples of multi-file skills

**Gap**: Lack of documented patterns for progressive disclosure

**Requirements**:

**Store documentation in `writing-skills/references/progressive-disclosure-patterns.md`**:

**Pattern 1: High-Level Guide with References**

- SKILL.md contains overview + core workflow
- `references/` contains detailed documentation
- Used for skills with extensive reference material

**Pattern 2: Domain-Specific Organization**

- Subdirectories by domain/topic
- Each reference covers specific aspect
- Used for complex, multi-faceted skills

**Pattern 3: Conditional Details**

- Core workflow in SKILL.md
- Edge cases in `references/`
- Used for skills with common + rare use cases

**Acceptance Criteria**:

- ✅ Progressive disclosure patterns documented
- ✅ Examples provided for each pattern
- ✅ Guidance on when to use each pattern
- ✅ Documentation references Anthropic standards

---

### R12: Add Workflow Checklist Pattern (LOW)

**Current State**: Some skills have checklists, but not using Anthropic's explicit pattern

**Gap**: Anthropic recommends "Copy this checklist" pattern for multi-step workflows

**Requirements**:

**Standard Checklist Pattern**:

```markdown
Copy this checklist and track your progress:

Task Progress:

- [ ] Step 1: Description
- [ ] Step 2: Description
- [ ] Step 3: Description
```

**Apply to Skills**:

- `writing-specifications`
- `implementing-specifications`
- `reviewing-code`
- `systematic-debugging`
- Any multi-step workflow skill

**Acceptance Criteria**:

- ✅ Complex workflow skills include checklist sections
- ✅ Checklists use "Copy this checklist:" pattern
- ✅ Checklists are actionable and comprehensive
- ✅ Checklists stored in appropriate location (SKILL.md or assets/)

---

## Implementation Prerequisites

### Critical Bootstrap Issue: Chicken-and-Egg Problem

**Problem Statement**:

When agents implement this specification, they may discover and invoke the legacy `writing-skills` skill. However, the legacy skill contains OLD patterns that directly contradict this spec:

- **Announcement pattern** (🔧 Using Skill: X) - being removed in R1
- **870 lines** - violates token efficiency guidelines (R6)
- **Flat structure** - contradicts progressive disclosure requirements (R4, R7)
- **Potentially verbose content** - contradicts verbosity reduction (R9)

Following the legacy skill would fight against the spec changes, creating implementation conflicts.

**Recommended Solution**:

**Add Phase 0 (BEFORE all other phases): Bootstrap `writing-skills` Alignment**

This ensures agents implementing the rest of the spec won't follow legacy patterns.

**Phase 0 Tasks**:

1. **Remove announcement pattern from `writing-skills`** (R1 subset)
   - Remove "Skill Usage Announcement" section
   - Remove 🔧 emoji pattern

2. **Adopt progressive disclosure basics in `writing-skills`** (R4/R7 subset)
   - Create `references/` subdirectory
   - Move heavy reference material to `references/`
   - Reduce SKILL.md to <500 lines (doesn't need to hit <400 target yet)

3. **Fix `writing-skills` description** (R5 subset)
   - Ensure description follows "Use when..." pattern
   - Optimize for discoverability

4. **Basic verbosity reduction** (R9 subset)
   - Remove most egregious verbosity
   - Keep content focused on unique patterns

**Why Phase 0 is Critical**:

- Prevents self-defeating behavior (agents following old patterns while implementing new ones)
- Creates stable foundation for remaining implementation
- Allows full `writing-skills` split (R4 complete) to happen in Phase 3
- Minimal alignment now, comprehensive refinement later

**Phase 0 Outcome**: `writing-skills` meets baseline standards and won't contradict spec implementation

---

## Technical Approach

### Phase 0: Bootstrap Foundation (CRITICAL PREREQUISITE)

**Tasks**:

1. Update `writing-skills` to remove announcement pattern (R1 subset)
2. Apply basic progressive disclosure to `writing-skills` (R4/R7 subset - get to <500 lines)
3. Fix `writing-skills` description (R5 subset)
4. Basic verbosity reduction in `writing-skills` (R9 subset)

**Outcome**: `writing-skills` aligned with new standards, safe for agents to follow

**Duration**: 2-3 hours

---

### Phase 1: Infrastructure Updates (Foundation)

**Tasks**:

1. Verify and fix skill template frontmatter format (R3)
2. Document token efficiency guidelines in CLAUDE.md (R6)
3. Document naming conventions in CLAUDE.md (R2)
4. Store progressive disclosure patterns in `writing-skills/references/` (R11)

**Outcome**: Infrastructure ready for skill updates

**Duration**: 4-6 hours

---

### Phase 2: Bulk Skill Updates (High-Impact Changes)

**Tasks**:

1. Remove skill invocation announcement pattern from all 47 skills (R1)
2. Rename skills to gerund form + update all references (R2)
3. Audit and fix all 47 skill descriptions (R5)
4. Audit all skills for verbosity and reduce (R9)

**Outcome**: All skills meet baseline standards

**Duration**: 12-16 hours

---

### Phase 3: Progressive Disclosure Migration (Complex Skills)

**Tasks**:

1. Complete `writing-skills` split into SKILL.md + references/ + assets/ (R4, R7 - achieve <400 line target)
2. Identify other skills >300 lines (R6)
3. Apply progressive disclosure to identified skills (R4, R7)
4. Migrate multi-file skills to subdirectory structure (R7)

**Outcome**: Complex skills optimized for token efficiency

**Duration**: 10-14 hours

---

### Phase 4: Enhancement and Polish (Refinements)

**Tasks**:

1. Add template patterns to workflow skills (R8)
2. Add workflow checklists to multi-step skills (R12)
3. Verify cross-reference consistency (R10)
4. Final audit and validation

**Outcome**: All enhancements complete, skills polished

**Duration**: 6-8 hours

---

## Affected Files and Skills

### All 47 Skills

- **R1**: Remove announcement pattern (ALL)
- **R2**: Rename to gerund form (~30 skills)
- **R5**: Fix descriptions (ALL)
- **R9**: Reduce verbosity (ALL)

### Specific Skills Requiring Intensive Work

- `writing-skills` (R4, R6, R7) - Split into SKILL.md + subdirectories
- `code-review` (R4, R8, R12) - Possibly split, add checklists
- `implementing-specifications` (R8, R12) - Add templates, checklists
- `writing-specifications` (R8, R12) - Add templates, checklists
- `systematic-debugging` (R12) - Add checklists

### Slash Commands (commands/ directory)

- Update ALL slash commands that invoke renamed skills (R2)
- Examples:
  - `write-plan.md`
  - `execute-plan.md`

**Note**: User removed `brainstorm.md` command. Do not create `analyze-session-gaps.md` or `validate-session-adherence.md` commands (they don't exist).

### Documentation Files

- `CLAUDE.md` - Add token efficiency guidelines, naming conventions
- `writing-skills/references/progressive-disclosure-patterns.md` - Store progressive disclosure patterns here (not in separate docs/ file)
- Any docs referencing old skill names

### Templates

- Skill creation template (verify frontmatter format)

---

## Dependencies

### Sequential Dependencies

1. **Phase 0 BEFORE all other phases** - Bootstrap `writing-skills` to prevent legacy pattern conflicts
2. **R3 (Template fix) BEFORE creating new skills** - Ensures new skills use correct format
3. **R2 (Rename skills) BEFORE updating slash commands** - Commands reference skill names
4. **R4 (Progressive disclosure) REQUIRES R7 (Directory structure)** - Structure must be in place before migration

### Parallel Opportunities

- R1 (Remove announcements) and R9 (Reduce verbosity) can happen in same pass
- R5 (Fix descriptions) independent of other changes
- R11 (Documentation) and R12 (Checklists) can happen anytime

---

## Acceptance Criteria (Overall)

### Compliance Metrics

- ✅ 100% of skills have YAML frontmatter with only `name` and `description`
- ✅ 100% of skills use gerund naming form
- ✅ 100% of skills have descriptions with "Use when..." clause
- ✅ 0% of skills contain "Skill Usage Announcement" section
- ✅ 0% of skills exceed 500 lines in SKILL.md without progressive disclosure
- ✅ 100% of multi-file skills use subdirectory structure (scripts/references/assets)

### Quality Metrics

- ✅ All skills discoverable via typical user queries
- ✅ Token usage reduced by >30% (target: ~5,000 token reduction)
- ✅ All slash commands functional after skill renames
- ✅ No broken cross-references between skills
- ✅ All documentation updated to reference new skill names

### Functional Validation

- ✅ All skills remain functional after changes
- ✅ Skill triggering works correctly
- ✅ Progressive disclosure loads correctly
- ✅ Templates and checklists are usable
- ✅ No regression in skill effectiveness

---

## Non-Goals

### Explicitly Out of Scope

1. **Contributing back to Anthropic** - Keep TDD methodology advantage internal for now
2. **Changing TDD testing approach** - This is wrangler's superior advantage, preserve it
3. **Removing existing functionality** - We don't want to lose important functionality, but we CAN reduce bloat/verbosity/complexity while preserving core capability. Token reduction through simplification is acceptable and encouraged.
4. **Breaking backward compatibility unnecessarily** - Use aliases/redirects if needed
5. **Changing skill content/methodology** - Only structure, naming, and organization
6. **Adding new skills** - This spec is about alignment, not expansion

---

## Success Metrics

### Primary Metrics

- **Token Efficiency**: 30%+ reduction in total skill token count
- **Compliance Rate**: 100% alignment with Anthropic 2026 standards
- **Discoverability**: All skills triggerable via natural user queries
- **Organization**: All complex skills use progressive disclosure

### Secondary Metrics

- **Maintainability**: Easier to update and extend skills
- **Consistency**: Uniform structure across all skills
- **Documentation Quality**: Clear patterns documented for future skills

---

## Implementation Notes

### Skill Renaming Strategy

**Create mapping file** (for tracking):

```
OLD_NAME → NEW_NAME
test-driven-development → practicing-tdd
code-review → reviewing-code
implement-spec → implementing-specs
create-new-issue → creating-issues
...
```

**Update process**:

1. Rename directory
2. Update frontmatter `name` field
3. Update all slash commands
4. Update all cross-references
5. Update documentation
6. Test skill invocation

### Progressive Disclosure Migration

**For each complex skill**:

1. Create subdirectories (scripts/, references/, assets/)
2. Categorize supporting files by type
3. Move files to appropriate subdirectories
4. Update SKILL.md to reference new locations
5. Test skill loading
6. Verify token count reduction

### Validation Testing

**After each phase**:

1. Test skill invocation by name
2. Test skill triggering via description
3. Test cross-references between skills
4. Test slash command invocation
5. Measure token count
6. Verify no functionality loss

---

## Timeline Estimate

- **Phase 0** (Bootstrap): 2-3 hours
- **Phase 1** (Infrastructure): 4-6 hours
- **Phase 2** (Bulk Updates): 12-16 hours
- **Phase 3** (Progressive Disclosure): 10-14 hours
- **Phase 4** (Enhancement): 6-8 hours

**Total Effort**: 34-47 hours

**Recommended Approach**: Implement all phases in sequence without prioritization (per user directive)
