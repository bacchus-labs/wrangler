---
id: "spec-modular-skills-composition"
title: "Modular Skills Composition System"
type: "specification"
status: "closed"
priority: "high"
labels: ["architecture", "skills", "dx", "modularity"]
createdAt: "2025-11-22T15:45:00.000Z"
updatedAt: "2025-11-22T15:45:00.000Z"
---

# Modular Skills Composition System for Wrangler

**Research & Design Specification**

**Date:** 2025-11-22
**Status:** Proposal
**Target Version:** Wrangler 2.0

---

## Executive Summary

This specification proposes a modular composition system for Wrangler's 49 skills to eliminate duplication, improve maintainability, and enhance developer experience. The system will use markdown preprocessing with custom directives to enable:

- **Reusable fragments**: TDD workflows, skill announcement templates, common checklists
- **Skill composition**: Skills referencing sub-workflows from other skills
- **Build-time compilation**: Fragments compile to plain markdown that Claude Code can consume
- **Zero runtime overhead**: No changes to how Claude loads or executes skills

**Key Metrics:**

- **Current state:** ~13,327 total lines across 49 skills, significant duplication
- **Estimated reduction:** 20-30% fewer lines through fragment reuse
- **Build time:** <2 seconds for full compilation
- **No impact:** Claude Code skill loading mechanism unchanged

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Research Findings](#2-research-findings)
3. [Recommended Architecture](#3-recommended-architecture)
4. [Implementation Plan](#4-implementation-plan)
5. [Examples](#5-examples)
6. [Migration Strategy](#6-migration-strategy)
7. [Risk Analysis](#7-risk-analysis)
8. [Future Enhancements](#8-future-enhancements)

---

## 1. Current State Analysis

### 1.1 How Skills Work Today

**Skill Discovery & Loading:**

Claude Code discovers skills through:

1. **Directory scanning:** Reads `skills/` directory recursively
2. **YAML frontmatter:** Parses `name` and `description` from each `SKILL.md`
3. **Semantic matching:** Loads skills when `description` matches task context
4. **Manual invocation:** Skills can be explicitly invoked via `Skill` tool

**File Format Constraints:**

```yaml
---
name: skill-name-with-hyphens
description: Use when [triggers] - [what it does]
---
# Markdown Content

[Pure markdown with no preprocessing]
```

**Critical constraints:**

- Must be valid markdown (no custom syntax that breaks parsers)
- Frontmatter limited to 1024 chars total
- Files must be standalone (no external dependencies at runtime)
- No references to other files that Claude must resolve

**Current directory structure:**

```
skills/
  skill-name/
    SKILL.md              # Entire skill in one file
    example.ts            # Optional supporting file
    test-*.md             # Optional test scenarios
```

### 1.2 Duplication Analysis

**Pattern 1: Skill Usage Announcement (49 instances)**

Every skill contains identical boilerplate:

```markdown
## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:

\`\`\`
🔧 Using Skill: {skill-name} | [brief purpose based on context]
\`\`\`

**Example:**
\`\`\`
🔧 Using Skill: {skill-name} | [Provide context-specific example of what you're doing]
\`\`\`

This creates an audit trail showing which skills were applied during the session.
```

**Cost:** ~15 lines × 49 skills = **735 lines** of pure duplication

---

**Pattern 2: RED-GREEN-REFACTOR Workflow (8 instances)**

Skills that reference TDD have varying levels of detail:

- `test-driven-development/SKILL.md`: Full 550-line explanation
- `writing-skills/SKILL.md`: 50-line adaptation for documentation
- `systematic-debugging/SKILL.md`: Reference with "REQUIRED SUB-SKILL"
- `implement/SKILL.md`: Inline instructions for subagents (40 lines)
- Others: Partial references, inconsistent depth

**Problem:** Same concept explained differently across skills, maintenance burden when TDD workflow evolves.

---

**Pattern 3: Verification Checklists**

Multiple skills include "before completion" checklists:

- `verification-before-completion/SKILL.md`: 626 lines (master checklist)
- `test-driven-development/SKILL.md`: 15-line verification section
- `systematic-debugging/SKILL.md`: Custom verification steps
- `implement/SKILL.md`: 50-line final verification phase

**Issue:** Partial overlap, inconsistent requirements

---

**Pattern 4: Subagent Dispatch Templates**

Skills that coordinate subagents repeat similar patterns:

- `implement/SKILL.md`: Task dispatch templates (3 variations)
- `code-review/SKILL.md`: Reviewer dispatch template
- `housekeeping/SKILL.md`: Parallel agent dispatch (3 agents)
- `dispatching-parallel-agents/SKILL.md`: Generic dispatch pattern

**Cost:** ~100 lines per skill × 6 skills = **600 lines** of template duplication

---

**Total Estimated Duplication:** 2,000-3,000 lines (15-22% of total)

### 1.3 Maintainability Challenges

**Problem 1: Cross-skill updates**

When TDD workflow changes (e.g., adding "TDD Compliance Certification"):

- Updated `test-driven-development/SKILL.md` ✅
- Must update `implement/SKILL.md` manually ❌
- Must update `systematic-debugging/SKILL.md` manually ❌
- Risk: Skills become inconsistent

**Problem 2: Long files**

Longest skills:

- `implement/SKILL.md`: 1,222 lines
- `writing-skills/SKILL.md`: 869 lines
- `testing-anti-patterns/SKILL.md`: 846 lines

**Issues:**

- Hard to scan/maintain
- Mixing concerns (workflow + templates + examples)
- IDE performance degrades

**Problem 3: No abstraction mechanism**

Current workaround: "REQUIRED SUB-SKILL" references

```markdown
**REQUIRED SUB-SKILL:** Use wrangler:test-driven-development
```

**Limitations:**

- Delegates to Claude to "figure it out"
- No guarantee subagent has same understanding
- Can't extract specific sections (e.g., "just the RED phase")
- No compile-time validation of references

---

## 2. Research Findings

### 2.1 Markdown Preprocessing Tools

**Option A: markedpp** ([GitHub](https://github.com/commenthol/markedpp))

**Features:**

- `!include(path/to/file.md)` directive
- Line range support: `!include(file.md)[10:20]`
- Language specification for code blocks
- Recursive includes

**Pros:**

- Mature (active since 2013)
- Simple directive syntax
- npm package, integrates with Node.js builds

**Cons:**

- Limited to includes (no variables, conditionals)
- No validation of references

---

**Option B: markdown-it + markdown-it-directive**

**Features:**

- Generic directive syntax following CommonMark spec
- Inline and block directives
- Plugin architecture for custom processing

**Example:**

```markdown
::include[fragments/tdd-workflow.md]

:::include{file="fragments/checklist.md" section="verification"}
Content here
:::
```

**Pros:**

- Extensible (can add custom directives)
- Standard CommonMark extension
- Large ecosystem

**Cons:**

- Requires custom plugin for includes
- More complex setup

---

**Option C: MDX → Markdown** ([MDX](https://mdxjs.com/))

**Concept:** Author in MDX, compile to plain markdown

**Features:**

- Import/export statements
- Component composition
- Full JavaScript at build time

**Example:**

```mdx
import TDDWorkflow from "./fragments/tdd-workflow.mdx";
import SkillAnnouncement from "./fragments/announcement.mdx";

<SkillAnnouncement name="test-driven-development" />

## Overview

...

<TDDWorkflow />
```

**Pros:**

- Powerful composition
- TypeScript support
- Popular ecosystem ([Next.js MDX](https://nextjs.org/docs/pages/building-your-application/configuring/mdx), [Remix MDX](https://remix.run/docs/en/main/guides/mdx))

**Cons:**

- Overkill for simple includes
- Must compile MDX → Markdown (extra step)
- Harder to author (requires JSX knowledge)

---

**Option D: Custom Preprocessor**

**Features:**

- Wrangler-specific directives
- Built exactly for our use case
- Integration with skill validation

**Example:**

```markdown
{{include: fragments/skill-announcement.md}}

{{include: fragments/tdd-workflow.md | section: red-phase}}

{{subagent-template: implementation | vars: task_title}}
```

**Pros:**

- Total control
- Optimized for Wrangler workflow
- Can add skill-specific validation

**Cons:**

- Must build and maintain
- No ecosystem support
- Reinventing wheel

---

### 2.2 Existing Patterns in Documentation Systems

**mdBook preprocessors** ([mdBook](https://rust-lang.github.io/mdBook/for_developers/preprocessors.html))

- Rust documentation tool
- Preprocessors run before rendering
- Common pattern: `{{#include path/to/file.md}}`
- Can include specific lines: `{{#include file.md:10:20}}`

**Eleventy markdown templates** ([11ty](https://www.11ty.dev/docs/languages/markdown/))

- Pre-processes markdown as Liquid templates
- Variables, includes, loops
- Build-time execution, static output

**Lessons:**

- Simple `{{directive}}` syntax is intuitive
- Line range includes are valuable
- Build-time validation prevents broken references

---

### 2.3 Comparison Matrix

| Tool                      | Syntax         | Validation   | Ecosystem  | Complexity | Best For            |
| ------------------------- | -------------- | ------------ | ---------- | ---------- | ------------------- |
| **markedpp**              | `!include()`   | None         | Mature npm | Low        | Simple includes     |
| **markdown-it-directive** | `::include[]`  | Plugin-based | Large      | Medium     | Extensible system   |
| **MDX → MD**              | `import X`     | TypeScript   | Huge       | High       | Complex composition |
| **Custom**                | `{{include:}}` | Full control | None       | Medium     | Wrangler-specific   |

---

## 3. Recommended Architecture

### 3.1 Solution: Hybrid Approach

**Use markedpp with custom validation wrapper**

**Rationale:**

1. **Simple includes:** 90% of use case is "insert fragment here"
2. **Proven tool:** markedpp is battle-tested, maintained
3. **Low complexity:** Easy to understand, easy to debug
4. **Extensible:** Can add custom directives via wrapper if needed
5. **Fast:** Processes all 49 skills in <2 seconds

**Custom wrapper adds:**

- Validation: Ensure all `!include()` references exist
- Fragment registry: Warn if fragments aren't used
- Metrics: Track duplication reduction
- Integration: Hook into `npm run build:skills`

---

### 3.2 Directory Structure

```
wrangler/
├── skills/                          # Compiled output (git-tracked)
│   ├── test-driven-development/
│   │   └── SKILL.md                 # Pure markdown (Claude reads this)
│   ├── implement/
│   │   └── SKILL.md
│   └── ...
│
├── skills-src/                      # Source files (git-tracked)
│   ├── test-driven-development/
│   │   └── SKILL.mdpp               # Source with !include directives
│   ├── implement/
│   │   └── SKILL.mdpp
│   └── ...
│
├── skills-fragments/                # Reusable fragments (git-tracked)
│   ├── skill-announcement.md
│   ├── tdd/
│   │   ├── red-phase.md
│   │   ├── green-phase.md
│   │   ├── refactor-phase.md
│   │   └── full-workflow.md
│   ├── verification/
│   │   ├── before-completion.md
│   │   └── tdd-certification.md
│   ├── subagent-templates/
│   │   ├── implementation.md
│   │   ├── code-review.md
│   │   └── fix-attempt.md
│   └── README.md                    # Fragment documentation
│
├── scripts/
│   └── build-skills.js              # Build script with validation
│
└── package.json                     # npm scripts
```

**Key design decisions:**

1. **`skills/` remains git-tracked:** Claude Code expects skills here, no breaking changes
2. **`skills-src/` is source of truth:** Authors edit `.mdpp` files with directives
3. **`skills-fragments/` is shared library:** Organized by category
4. **Build generates `skills/`:** `npm run build:skills` compiles `.mdpp` → `.md`

---

### 3.3 Build Pipeline

```
┌──────────────────┐
│  skills-src/     │
│  *.mdpp files    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Validation          │
│  - Check !include()  │
│  - Verify fragments  │
│  - Lint frontmatter  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  markedpp            │
│  Process !include()  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Post-processing     │
│  - Strip .mdpp refs  │
│  - Generate metrics  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  skills/             │
│  Pure markdown       │
│  (Claude Code reads) │
└──────────────────────┘
```

**npm scripts:**

```json
{
  "scripts": {
    "build:skills": "node scripts/build-skills.js",
    "watch:skills": "node scripts/build-skills.js --watch",
    "validate:skills": "node scripts/build-skills.js --validate-only",
    "metrics:skills": "node scripts/build-skills.js --metrics"
  }
}
```

---

### 3.4 Fragment Design Principles

**1. Fragments are pure markdown**

No directives inside fragments (keeps nesting simple).

**2. Fragments are context-free**

Can be included in any skill without modification.

**3. Fragments use placeholders sparingly**

Simple variable substitution: `{skill-name}`, `{section-title}`

**4. Fragments have clear boundaries**

Each fragment is a complete section (e.g., full announcement, full workflow).

**5. Fragments are versioned**

Major changes create new fragments (e.g., `tdd-workflow-v2.md`), old skills migrate gradually.

---

### 3.5 Directive Syntax

**Basic include:**

```markdown
!include(skills-fragments/skill-announcement.md)
```

**Include specific lines:**

```markdown
!include(skills-fragments/tdd/full-workflow.md)[50:150]
```

**Multiple includes:**

```markdown
## Overview

!include(skills-fragments/overview-template.md)

## TDD Process

!include(skills-fragments/tdd/red-phase.md)
!include(skills-fragments/tdd/green-phase.md)
!include(skills-fragments/tdd/refactor-phase.md)
```

**Variables (via wrapper):**

```markdown
!include(skills-fragments/skill-announcement.md, skill-name="test-driven-development")
```

Compiles to:

```markdown
## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:

\`\`\`
🔧 Using Skill: test-driven-development | [brief purpose based on context]
\`\`\`
...
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Infrastructure Setup (Week 1)

**Tasks:**

1. **Create directory structure**
   - `mkdir skills-src skills-fragments scripts`
   - Copy existing skills to `skills-src/` with `.mdpp` extension
   - Create empty `skills-fragments/` with README

2. **Install dependencies**
   - `npm install --save-dev markedpp`
   - `npm install --save-dev chokidar` (for watch mode)
   - `npm install --save-dev glob`

3. **Build script v1 (basic)**

   ```javascript
   // scripts/build-skills.js
   const markedpp = require("markedpp");
   const glob = require("glob");
   const fs = require("fs-extra");

   async function buildSkills() {
     const sources = glob.sync("skills-src/**/*.mdpp");

     for (const src of sources) {
       const output = src
         .replace("skills-src/", "skills/")
         .replace(".mdpp", ".md");
       const content = await fs.readFile(src, "utf8");
       const compiled = markedpp.render(content);
       await fs.outputFile(output, compiled);
       console.log(`✓ ${src} → ${output}`);
     }
   }

   buildSkills();
   ```

4. **Test pipeline**
   - Create dummy skill in `skills-src/test-skill/SKILL.mdpp`
   - Create dummy fragment in `skills-fragments/test-fragment.md`
   - Run `npm run build:skills`
   - Verify output in `skills/test-skill/SKILL.md`

**Success criteria:**

- Build completes without errors
- Output matches input (no directives yet)
- Git ignores nothing (all directories tracked)

---

### 4.2 Phase 2: Extract First Fragment (Week 1)

**Goal:** Prove the concept with skill announcement template

**Tasks:**

1. **Create fragment**

   `skills-fragments/skill-announcement.md`:

   ```markdown
   ## Skill Usage Announcement

   **MANDATORY**: When using this skill, announce it at the start with:

   \`\`\`
   🔧 Using Skill: {skill-name} | [brief purpose based on context]
   \`\`\`

   **Example:**
   \`\`\`
   🔧 Using Skill: {skill-name} | [Provide context-specific example of what you're doing]
   \`\`\`

   This creates an audit trail showing which skills were applied during the session.
   ```

2. **Update 3 pilot skills**

   Edit `skills-src/test-driven-development/SKILL.mdpp`:

   ```markdown
   ---
   name: test-driven-development
   description: ...
   ---

   # Test-Driven Development (TDD)

   !include(skills-fragments/skill-announcement.md, skill-name="test-driven-development")

   ## Overview

   ...
   ```

   Repeat for:
   - `implement/SKILL.mdpp`
   - `systematic-debugging/SKILL.mdpp`

3. **Add variable substitution to build script**

   ```javascript
   function processIncludes(content, vars = {}) {
     let result = markedpp.render(content);

     // Simple variable replacement
     Object.entries(vars).forEach(([key, value]) => {
       result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
     });

     return result;
   }
   ```

4. **Build and validate**
   - Run `npm run build:skills`
   - Compare output to original (should be identical)
   - Commit both source and output

**Success criteria:**

- 3 skills compile with fragment
- Output is byte-identical to original
- Fragment reduces 45 lines to 1 directive

---

### 4.3 Phase 3: Extract TDD Workflow (Week 2)

**Goal:** Modularize complex workflow that appears in multiple skills

**Tasks:**

1. **Create TDD fragments**

   `skills-fragments/tdd/`:

   ```
   tdd/
   ├── red-phase.md           # RED phase explanation + examples
   ├── green-phase.md         # GREEN phase explanation
   ├── refactor-phase.md      # REFACTOR phase explanation
   ├── full-workflow.md       # Complete workflow (includes others)
   ├── compliance-cert.md     # TDD Compliance Certification template
   └── verification-steps.md  # Before completion checklist
   ```

2. **Update test-driven-development skill**

   Make `test-driven-development/SKILL.mdpp` the canonical source:

   ```markdown
   ---
   name: test-driven-development
   description: ...
   ---

   # Test-Driven Development (TDD)

   !include(skills-fragments/skill-announcement.md, skill-name="test-driven-development")

   ## Overview

   ...

   ## Red-Green-Refactor

   !include(skills-fragments/tdd/full-workflow.md)

   ## TDD Compliance Certification

   !include(skills-fragments/tdd/compliance-cert.md)
   ```

3. **Update dependent skills**

   `systematic-debugging/SKILL.mdpp`:

   ```markdown
   ### Phase 4: Implementation

   **Fix the root cause, not the symptom:**

   1. **Create Failing Test Case**
      !include(skills-fragments/tdd/red-phase.md)[1:50]

   2. **Implement Single Fix**
      !include(skills-fragments/tdd/green-phase.md)[1:30]
   ```

   `implement/SKILL.mdpp`:

   ```markdown
   ## Task Executor Workflow

   Instructions for implementation subagent:

   \`\`\`markdown

   ## Your Job

   1. **Follow TDD**:
      !include(skills-fragments/tdd/full-workflow.md)[10:100]

   2. **Create TDD Compliance Certification**:
      !include(skills-fragments/tdd/compliance-cert.md)
      \`\`\`
   ```

4. **Build and test**
   - Compile all skills
   - Manually review 3 affected skills
   - Run Claude Code with test task to verify skills still work

**Success criteria:**

- TDD workflow maintained in one place
- 8 skills reference fragments (not duplicate)
- Total line reduction: ~400 lines

---

### 4.4 Phase 4: Validation & Metrics (Week 2)

**Goal:** Add compile-time checks and usage metrics

**Tasks:**

1. **Add validation to build script**

   ```javascript
   function validateIncludes(content, sourcePath) {
     const includeRegex = /!include\(([^)]+)\)/g;
     const errors = [];

     let match;
     while ((match = includeRegex.exec(content)) !== null) {
       const fragmentPath = match[1].split(",")[0].trim();
       const fullPath = path.join(__dirname, "..", fragmentPath);

       if (!fs.existsSync(fullPath)) {
         errors.push({
           file: sourcePath,
           fragment: fragmentPath,
           message: `Fragment not found: ${fragmentPath}`,
         });
       }
     }

     return errors;
   }

   // In buildSkills():
   for (const src of sources) {
     const content = await fs.readFile(src, "utf8");
     const errors = validateIncludes(content, src);

     if (errors.length > 0) {
       console.error(`❌ Validation failed for ${src}:`);
       errors.forEach((e) => console.error(`   - ${e.message}`));
       process.exit(1);
     }

     // ... compile ...
   }
   ```

2. **Track fragment usage**

   ```javascript
   const fragmentUsage = new Map();

   function trackFragmentUsage(content) {
     const includeRegex = /!include\(([^)]+)\)/g;
     let match;

     while ((match = includeRegex.exec(content)) !== null) {
       const fragment = match[1].split(",")[0].trim();
       fragmentUsage.set(fragment, (fragmentUsage.get(fragment) || 0) + 1);
     }
   }

   // After processing all files:
   console.log("\n📊 Fragment Usage:");
   Array.from(fragmentUsage.entries())
     .sort((a, b) => b[1] - a[1])
     .forEach(([fragment, count]) => {
       console.log(`   ${fragment}: ${count} usages`);
     });
   ```

3. **Generate metrics report**

   ```javascript
   function generateMetrics() {
     const srcLines = countLines("skills-src/**/*.mdpp");
     const fragmentLines = countLines("skills-fragments/**/*.md");
     const outputLines = countLines("skills/**/*.md");

     const report = {
       source_lines: srcLines,
       fragment_lines: fragmentLines,
       output_lines: outputLines,
       duplication_eliminated: srcLines + fragmentLines - outputLines,
       reduction_percent: (
         (1 - outputLines / (srcLines + fragmentLines)) *
         100
       ).toFixed(1),
     };

     console.log("\n📈 Build Metrics:");
     console.log(`   Source: ${report.source_lines} lines`);
     console.log(`   Fragments: ${report.fragment_lines} lines`);
     console.log(`   Output: ${report.output_lines} lines`);
     console.log(`   Reduction: ${report.reduction_percent}%`);

     fs.writeJsonSync("skills-metrics.json", report);
   }
   ```

4. **CI integration**

   `.github/workflows/validate-skills.yml`:

   ```yaml
   name: Validate Skills

   on: [pull_request]

   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: "20"
         - run: npm install
         - run: npm run validate:skills
         - run: npm run build:skills
         - name: Check for uncommitted changes
           run: |
             if [[ -n $(git status --porcelain skills/) ]]; then
               echo "Error: Compiled skills are out of sync"
               echo "Run 'npm run build:skills' and commit"
               exit 1
             fi
   ```

**Success criteria:**

- Build fails on missing fragments
- Metrics report shows reduction
- CI catches uncommitted compiled output

---

### 4.5 Phase 5: Migrate Remaining Skills (Week 3-4)

**Goal:** Convert all 49 skills to use fragments

**Fragment extraction priority:**

1. **High-value fragments** (used by 5+ skills):
   - `skill-announcement.md` (49 skills)
   - `tdd/full-workflow.md` (8 skills)
   - `verification/before-completion.md` (6 skills)

2. **Medium-value fragments** (used by 3-4 skills):
   - `subagent-templates/implementation.md`
   - `subagent-templates/code-review.md`
   - `common-mistakes-template.md`

3. **Specialized fragments** (used by 2 skills, but complex):
   - `frontend-testing/e2e-patterns.md`
   - `governance/roadmap-template.md`

**Migration strategy:**

- **Week 3:** Migrate 25 skills (priority: largest skills first)
- **Week 4:** Migrate remaining 24 skills
- **Daily:** Run build, validate output, commit

**Tasks per skill:**

1. Create `.mdpp` version in `skills-src/`
2. Replace duplicated sections with `!include()` directives
3. Build and diff against original
4. Fix any discrepancies
5. Commit source and output together
6. Delete old source (keep compiled in `skills/`)

---

### 4.6 Phase 6: Documentation & Training (Week 4)

**Goal:** Ensure team can author and maintain modular skills

**Deliverables:**

1. **Fragment catalog**

   `skills-fragments/README.md`:

   ```markdown
   # Wrangler Skill Fragments

   Reusable markdown fragments for skill authoring.

   ## Available Fragments

   ### Core Templates

   - `skill-announcement.md` - Standard skill announcement (used by all skills)
   - `overview-template.md` - Overview section structure

   ### TDD Workflow

   - `tdd/full-workflow.md` - Complete RED-GREEN-REFACTOR cycle
   - `tdd/red-phase.md` - RED phase only (lines 1-150)
   - `tdd/green-phase.md` - GREEN phase only (lines 151-250)
   - `tdd/refactor-phase.md` - REFACTOR phase only (lines 251-300)
   - `tdd/compliance-cert.md` - TDD Compliance Certification template

   ### Verification

   - `verification/before-completion.md` - Pre-completion checklist
   - `verification/evidence-template.md` - Evidence requirement pattern

   ### Subagent Templates

   - `subagent-templates/implementation.md` - Implementation subagent prompt
   - `subagent-templates/code-review.md` - Code review subagent prompt
   - `subagent-templates/fix-attempt.md` - Fix subagent prompt

   ## Usage

   ### Basic Include

   \`\`\`markdown
   !include(skills-fragments/skill-announcement.md)
   \`\`\`

   ### With Variables

   \`\`\`markdown
   !include(skills-fragments/skill-announcement.md, skill-name="my-skill")
   \`\`\`

   ### Specific Lines

   \`\`\`markdown
   !include(skills-fragments/tdd/full-workflow.md)[1:100]
   \`\`\`

   ## Creating New Fragments

   1. Fragment should be used by 2+ skills (otherwise inline it)
   2. Fragment must be context-free (no skill-specific references)
   3. Fragment should be a complete section (clear start/end)
   4. Add to this README
   5. Update build metrics
   ```

2. **Authoring guide**

   Update `skills/writing-skills/SKILL.md` with fragment authoring section:

   ```markdown
   ## Using Fragments in Skills

   ### When to Extract a Fragment

   Extract content as a fragment when:

   - Used by 2+ skills
   - Likely to be reused in future skills
   - Complex enough to justify maintenance overhead (>20 lines)
   - Has clear boundaries (complete section)

   ### Fragment Design

   Good fragments:

   - Are context-free (work in any skill)
   - Use minimal variables (prefer specific to generic)
   - Have clear purpose (one concern per fragment)
   - Are well-documented in skills-fragments/README.md

   ### Building Skills

   After editing skills-src/\*.mdpp:

   \`\`\`bash
   npm run build:skills # Compile all
   npm run watch:skills # Watch mode
   npm run validate:skills # Check references
   \`\`\`

   Always commit both source (.mdpp) and compiled (.md) files together.
   ```

3. **Migration guide** for future skills

   `docs/SKILL-AUTHORING.md`:

   ```markdown
   # Skill Authoring Guide

   ## File Organization

   - **Source:** `skills-src/{skill-name}/SKILL.mdpp`
   - **Fragments:** `skills-fragments/{category}/{fragment}.md`
   - **Output:** `skills/{skill-name}/SKILL.md` (git-tracked, Claude reads this)

   ## Workflow

   1. Create `skills-src/new-skill/SKILL.mdpp`
   2. Use fragments via `!include()` directives
   3. Run `npm run build:skills`
   4. Test compiled skill with Claude Code
   5. Commit source + output together

   ## Best Practices

   - Start with skill-announcement fragment (standard)
   - Reference TDD fragments for testing workflows
   - Use subagent-templates for multi-agent skills
   - Extract new fragments when you notice duplication
   ```

**Success criteria:**

- Fragment catalog is complete
- Authoring guide is clear
- Team can create new skills using fragments

---

## 5. Examples

### 5.1 Before: Monolithic Skill

**File:** `skills/test-driven-development/SKILL.md` (550 lines)

```markdown
---
name: test-driven-development
description: Use when implementing...
---

# Test-Driven Development (TDD)

## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:

\`\`\`
🔧 Using Skill: test-driven-development | [brief purpose based on context]
\`\`\`

**Example:**
\`\`\`
🔧 Using Skill: test-driven-development | [Provide context-specific example]
\`\`\`

This creates an audit trail...

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail...

## The Iron Law

\`\`\`
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
\`\`\`

Write code before the test? Delete it. Start over.

**No exceptions:**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
  ...

## Red-Green-Refactor

[150 lines of workflow explanation]

### RED - Write Failing Test

[50 lines]

### Verify RED - Watch It Fail (MANDATORY EVIDENCE)

[80 lines]

### GREEN - Minimal Code

[40 lines]

### Verify GREEN - Watch It Pass (MANDATORY EVIDENCE)

[60 lines]

### REFACTOR - Clean Up

[30 lines]

## TDD Compliance Certification

[100 lines of certification requirements]

## Common Rationalizations

[80 lines of rationalization table]

...
```

**Problems:**

- Everything in one file
- Workflow duplicated in other skills
- Hard to reuse specific sections

---

### 5.2 After: Modular Skill

**File:** `skills-src/test-driven-development/SKILL.mdpp` (200 lines, compiles to 550)

```markdown
---
name: test-driven-development
description: Use when implementing...
---

# Test-Driven Development (TDD)

!include(skills-fragments/skill-announcement.md, skill-name="test-driven-development")

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail...

## The Iron Law

\`\`\`
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
\`\`\`

!include(skills-fragments/tdd/iron-law-exceptions.md)

## Red-Green-Refactor

!include(skills-fragments/tdd/full-workflow.md)

## TDD Compliance Certification

!include(skills-fragments/tdd/compliance-cert.md)

## Common Rationalizations

!include(skills-fragments/tdd/rationalizations-table.md)

...
```

**Supporting fragments:**

`skills-fragments/tdd/full-workflow.md`:

```markdown
### RED - Write Failing Test

Write one minimal test showing what should happen.

<Good>
\`\`\`typescript
test('retries failed operations 3 times', async () => {
  // ...
});
\`\`\`
Clear name, tests real behavior, one thing
</Good>

...

### Verify RED - Watch It Fail (MANDATORY EVIDENCE)

BEFORE proceeding to GREEN phase:

1. **Execute test command**:
   \`\`\`bash
   npm test -- path/to/test.test.ts
   \`\`\`

2. **Copy full output showing failure**

...

### GREEN - Minimal Code

Write simplest code to pass the test.

...

### Verify GREEN - Watch It Pass (MANDATORY EVIDENCE)

...

### REFACTOR - Clean Up

...
```

**Benefits:**

- Source is 200 lines (vs 550)
- Workflow fragment used by 8 skills
- Easy to update workflow in one place
- Clear structure, fragments are modular

---

### 5.3 Skill Referencing Fragments

**File:** `skills-src/systematic-debugging/SKILL.mdpp`

```markdown
---
name: systematic-debugging
description: Use when encountering any bug...
---

# Systematic Debugging

!include(skills-fragments/skill-announcement.md, skill-name="systematic-debugging")

## Overview

...

## The Four Phases

### Phase 1: Root Cause Investigation

...

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**

   !include(skills-fragments/tdd/red-phase.md)[1:80]

2. **Implement Single Fix**

   !include(skills-fragments/tdd/green-phase.md)[1:50]

3. **Verify Fix Works**

   !include(skills-fragments/verification/evidence-template.md)

## TDD Compliance for Bug Fixes

!include(skills-fragments/tdd/compliance-cert.md)
```

**Compiles to full markdown with all sections expanded.**

**Benefits:**

- Reuses TDD phases (don't duplicate)
- Extracts specific line ranges (fine-grained control)
- If TDD workflow changes, both skills update automatically

---

### 5.4 Subagent Template Fragment

**Fragment:** `skills-fragments/subagent-templates/implementation.md`

```markdown
You are implementing Task {task_number}: {task_title}

## Task Requirements

{task_description}

## Acceptance Criteria

{acceptance_criteria}

## Your Job

1. **Follow TDD** (test-driven-development skill):
   - RED: Write failing test first
   - GREEN: Implement minimal code to pass
   - REFACTOR: Improve code quality

2. **Create TDD Compliance Certification**

   For each function you implement, document:

   | Function | Test File | Watched Fail? | Watched Pass? | Notes |
   | -------- | --------- | ------------- | ------------- | ----- |
   | funcName | test.ts:L | YES/NO        | YES/NO        | ...   |

3. **Verify implementation works**
   - Run tests
   - Check for errors/warnings
   - Ensure requirements met

4. **Commit your work**
   \`\`\`bash
   git add {files}
   git commit -m "{commit_type}: {commit_description}"
   \`\`\`

5. **Report back**

   Provide:
   - Summary of what you implemented
   - Test results (pass/fail counts, output)
   - TDD Compliance Certification table
   - Files changed
   - Any issues or blockers encountered
```

**Usage in `implement/SKILL.mdpp`:**

```markdown
#### 2. Dispatch Implementation Subagent

Use the Task tool:

\`\`\`markdown
Tool: Task
Description: "Implement Task [N]: [title]"
Prompt: |
!include(skills-fragments/subagent-templates/implementation.md,
task_number="5",
task_title="Add authentication middleware",
task_description="...",
acceptance_criteria="..."
)

Work from: [current directory]
\`\`\`
```

**Benefits:**

- Consistent subagent instructions across all workflow skills
- Single source of truth for implementation expectations
- Easy to evolve (add new requirements once, all skills update)

---

### 5.5 Complete Build Example

**Input:** `skills-src/test-skill/SKILL.mdpp`

```markdown
---
name: test-skill
description: A test skill for demonstration
---

# Test Skill

!include(skills-fragments/skill-announcement.md, skill-name="test-skill")

## Overview

This skill demonstrates fragment usage.

## TDD Process

!include(skills-fragments/tdd/full-workflow.md)
```

**Referenced fragments:**

`skills-fragments/skill-announcement.md`:

```markdown
## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:

\`\`\`
🔧 Using Skill: {skill-name} | [brief purpose based on context]
\`\`\`
...
```

`skills-fragments/tdd/full-workflow.md`:

```markdown
### RED - Write Failing Test

...

### GREEN - Minimal Code

...

### REFACTOR - Clean Up

...
```

**Build command:**

```bash
$ npm run build:skills

Building skills...
  ✓ test-skill/SKILL.mdpp → test-skill/SKILL.md

📊 Fragment Usage:
  skills-fragments/skill-announcement.md: 1 usage
  skills-fragments/tdd/full-workflow.md: 1 usage

📈 Build Metrics:
  Source: 15 lines
  Fragments: 200 lines
  Output: 215 lines
  Build time: 0.3s

✅ Build complete
```

**Output:** `skills/test-skill/SKILL.md`

```markdown
---
name: test-skill
description: A test skill for demonstration
---

# Test Skill

## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:

\`\`\`
🔧 Using Skill: test-skill | [brief purpose based on context]
\`\`\`

**Example:**
\`\`\`
🔧 Using Skill: test-skill | [Provide context-specific example of what you're doing]
\`\`\`

This creates an audit trail showing which skills were applied during the session.

## Overview

This skill demonstrates fragment usage.

## TDD Process

### RED - Write Failing Test

Write one minimal test showing what should happen.
...

### GREEN - Minimal Code

Write simplest code to pass the test.
...

### REFACTOR - Clean Up

After green only:

- Remove duplication
- Improve names
- Extract helpers
  ...
```

**Claude Code loads the compiled output** (`skills/test-skill/SKILL.md`) exactly as before. No changes to runtime behavior.

---

## 6. Migration Strategy

### 6.1 Backward Compatibility

**Zero breaking changes:**

1. **Skills directory unchanged:** `skills/` remains the source that Claude Code reads
2. **Compiled output is identical:** Build produces byte-for-byte identical markdown
3. **Git history preserved:** All skills remain tracked, no file moves
4. **Gradual migration:** Can convert skills one at a time

**Compatibility verification:**

```bash
# After each migration:
diff skills/skill-name/SKILL.md skills/skill-name/SKILL.md.backup

# Should output: no differences
```

---

### 6.2 Migration Process (Per Skill)

**Step 1: Backup**

```bash
cp skills/test-driven-development/SKILL.md skills/test-driven-development/SKILL.md.backup
```

**Step 2: Create source**

```bash
mkdir -p skills-src/test-driven-development
cp skills/test-driven-development/SKILL.md skills-src/test-driven-development/SKILL.mdpp
```

**Step 3: Replace duplications**

Edit `skills-src/test-driven-development/SKILL.mdpp`:

- Find "Skill Usage Announcement" section
- Replace with `!include(skills-fragments/skill-announcement.md, skill-name="test-driven-development")`
- Find other duplicated sections
- Replace with appropriate `!include()` directives

**Step 4: Build**

```bash
npm run build:skills
```

**Step 5: Validate**

```bash
diff skills/test-driven-development/SKILL.md skills/test-driven-development/SKILL.md.backup
```

If differences:

- Review changes
- If unintended, adjust source
- Rebuild
- Repeat until identical

**Step 6: Test**

```bash
# Test skill with Claude Code
# Verify it loads correctly
# Verify behavior unchanged
```

**Step 7: Commit**

```bash
git add skills-src/test-driven-development/SKILL.mdpp
git add skills/test-driven-development/SKILL.md
git commit -m "refactor(skills): migrate test-driven-development to modular format"
```

**Step 8: Cleanup**

```bash
rm skills/test-driven-development/SKILL.md.backup
```

---

### 6.3 Migration Order

**Priority 1 (Week 3):** Large, complex skills with most duplication

1. `implement` (1,222 lines, uses TDD + subagent templates)
2. `writing-skills` (869 lines, references TDD)
3. `testing-anti-patterns` (846 lines, many examples)
4. `code-review` (710 lines, templates)
5. `run-the-tests` (700 lines, framework setup)
6. `verification-before-completion` (626 lines, checklists)
7. `dependency-opportunity-scanner` (615 lines, workflow)
8. `housekeeping` (559 lines, parallel agents)
9. `test-driven-development` (550 lines, canonical TDD)
10. `organize-root-files` (548 lines, file operations)

**Priority 2 (Week 4):** Medium skills with some duplication

11-30. Skills 400-500 lines

**Priority 3 (Week 4):** Small skills

31-49. Skills <400 lines (mostly simple, less duplication)

---

### 6.4 Rollback Plan

**If issues arise:**

1. **Revert build artifacts:**

   ```bash
   git checkout HEAD -- skills/
   ```

2. **Keep source changes:**
   Source files in `skills-src/` are separate, no impact on runtime

3. **Fix and rebuild:**
   Fix issues in `skills-src/`, rebuild, test, commit again

**Nuclear option (full rollback):**

```bash
git revert <migration-commit>
# Reverts both source and compiled output
# Skills remain functional
```

---

### 6.5 Communication Plan

**Before migration:**

Email to team:

```
Subject: Skills Architecture Upgrade - No Impact to Usage

Hi team,

We're upgrading the skills system to use a modular architecture with
reusable fragments. This will:

- Reduce duplication by ~25%
- Make skills easier to maintain
- Enable better composition patterns

IMPORTANT: No changes to how you use skills. Claude Code behavior is identical.

What's changing:
- Source files move to skills-src/ (new)
- Fragments stored in skills-fragments/ (new)
- Compiled output in skills/ (unchanged, Claude reads this)

When editing skills:
- Edit skills-src/*.mdpp files (not skills/*.md)
- Run npm run build:skills
- Commit both source and output

Migration timeline:
- Week 1: Infrastructure
- Week 2: Core fragments
- Week 3-4: All skills migrated

Questions? Reply or see docs/SKILL-AUTHORING.md
```

**During migration:**

Daily status updates in Slack:

```
Skills Migration Update - Day 5
✅ 12/49 skills migrated
📊 Duplication reduction: 18%
🐛 0 issues found
📅 On track for Week 4 completion
```

**After migration:**

Summary email:

```
Subject: Skills Migration Complete ✅

The skills modular architecture is now live. All 49 skills have been
migrated to use fragments.

Results:
- Source lines: 9,500 (vs 13,327 before)
- Fragment lines: 2,100
- Output lines: 13,327 (unchanged for Claude)
- Duplication eliminated: 1,728 lines (23%)
- Build time: 1.8 seconds
- Zero runtime changes

Documentation:
- Fragment catalog: skills-fragments/README.md
- Authoring guide: docs/SKILL-AUTHORING.md
- Build commands: package.json scripts

Next steps:
- Continue using skills as before (no changes)
- When authoring new skills, use fragments from catalog
- Extract new fragments when you see duplication

Thanks!
```

---

## 7. Risk Analysis

### 7.1 Technical Risks

| Risk                                   | Likelihood | Impact   | Mitigation                                              |
| -------------------------------------- | ---------- | -------- | ------------------------------------------------------- |
| **Build breaks on edge case**          | Medium     | Medium   | Comprehensive test suite, validation before commit      |
| **Fragment not found at build time**   | Low        | High     | Pre-build validation, fail fast with clear error        |
| **Output differs from input**          | Low        | High     | Byte-for-byte diff validation, rollback if issues       |
| **Claude can't load compiled skills**  | Very Low   | Critical | Test with Claude after each migration, revert if issues |
| **Build performance degrades**         | Low        | Low      | Benchmark, optimize if >5 seconds                       |
| **Circular dependencies in fragments** | Very Low   | Medium   | Fragment design guidelines prevent nesting              |

---

### 7.2 Process Risks

| Risk                                       | Likelihood | Impact | Mitigation                                        |
| ------------------------------------------ | ---------- | ------ | ------------------------------------------------- |
| **Team forgets to build after editing**    | Medium     | Low    | Pre-commit hook, CI validation, clear docs        |
| **Source and output diverge**              | Medium     | Medium | CI checks for uncommitted changes, fail PR        |
| **Fragment changes break multiple skills** | Medium     | High   | Fragment versioning (v1, v2), gradual migration   |
| **Confusing which file to edit**           | Medium     | Low    | Clear naming (.mdpp vs .md), docs, training       |
| **Over-fragmentation**                     | Low        | Medium | Guidelines: fragment only if 2+ usages, >20 lines |

---

### 7.3 Adoption Risks

| Risk                          | Likelihood | Impact | Mitigation                                                 |
| ----------------------------- | ---------- | ------ | ---------------------------------------------------------- |
| **Team resists new workflow** | Low        | Medium | Emphasize benefits, provide training, simple docs          |
| **New contributors confused** | Medium     | Low    | SKILL-AUTHORING.md guide, examples, onboarding             |
| **Migration fatigue**         | Low        | Low    | Automate what we can, clear milestones, celebrate progress |

---

### 7.4 Mitigation Summary

**Key mitigations:**

1. **Validation everywhere:**
   - Pre-build: Check fragment references
   - Post-build: Diff against backup
   - CI: Fail on uncommitted changes

2. **Clear boundaries:**
   - `.mdpp` = source (edit this)
   - `.md` = compiled (don't touch)
   - CI enforces this

3. **Gradual migration:**
   - Start with 3 pilot skills
   - Prove concept before full rollout
   - Can pause/rollback anytime

4. **Documentation:**
   - Fragment catalog (README)
   - Authoring guide (SKILL-AUTHORING.md)
   - Build script help output

5. **Testing:**
   - Manual test each migrated skill with Claude
   - Automated diff validation
   - CI integration

---

## 8. Future Enhancements

### 8.1 Short-term (Next 6 Months)

**Smart fragments:**

Instead of simple includes, add conditional logic:

```markdown
!include(skills-fragments/tdd/workflow.md, depth="detailed")
!include(skills-fragments/tdd/workflow.md, depth="summary")
```

Fragment has two versions:

- `depth="detailed"` → full 150 lines
- `depth="summary"` → abbreviated 30 lines

**Use case:** Skills that reference TDD can choose how much detail to include.

---

**Fragment composition:**

Fragments can reference other fragments:

`skills-fragments/verification/complete-checklist.md`:

```markdown
## Verification Checklist

### TDD Compliance

!include(tdd/compliance-cert.md)

### Code Quality

!include(code-quality-checks.md)

### Documentation

!include(docs-checklist.md)
```

**Benefit:** Build hierarchical verification flows.

---

**Live preview:**

VS Code extension for `.mdpp` files:

- Shows compiled output in side panel
- Highlights fragment boundaries
- Click to navigate to fragment source

**Implementation:** ~100 lines of VS Code extension API

---

### 8.2 Medium-term (6-12 Months)

**Fragment analytics:**

Track which fragments are used most:

```bash
$ npm run metrics:fragments

📊 Fragment Usage (Last 30 Days):
  skill-announcement.md: 49 skills, 100% adoption
  tdd/full-workflow.md: 8 skills, high-value
  verification/before-completion.md: 6 skills
  subagent-templates/implementation.md: 4 skills

  ⚠️  Unused fragments (consider removing):
  - old-template-v1.md (deprecated)
  - experimental-pattern.md (0 usages)
```

**Use case:** Identify fragments to deprecate, guide extraction priorities.

---

**Skill dependency graph:**

Visualize which skills reference which fragments:

```bash
$ npm run visualize:skills

Generating dependency graph...
Output: skills-dependencies.svg

[Opens browser with interactive graph]
```

Shows:

- Skills as nodes
- Fragments as nodes (different color)
- Edges show `!include()` relationships
- Click to view source

**Benefit:** Understand impact of fragment changes.

---

**Automated fragment extraction:**

AI-powered duplication detector:

```bash
$ npm run suggest:fragments

🔍 Analyzing skills for duplication...

Found potential fragments:
  1. "Common Mistakes" pattern (6 skills, 120 lines each)
     Suggest: skills-fragments/common-mistakes-template.md

  2. "Before/After Example" pattern (4 skills, 80 lines each)
     Suggest: skills-fragments/before-after-template.md

Extract these fragments? [y/N]
```

**Implementation:** Use AST-based markdown parsing + similarity detection.

---

### 8.3 Long-term (12+ Months)

**Skill composition DSL:**

Move beyond markdown includes to declarative composition:

`skills-src/new-skill/skill.yaml`:

```yaml
name: advanced-debugging
description: Multi-phase debugging workflow

sections:
  - type: announcement
  - type: overview
    content: |
      This skill combines systematic debugging with root-cause tracing.

  - type: workflow
    phases:
      - name: Investigation
        include: fragments/debugging/investigation-phase.md
      - name: Root Cause Tracing
        include: fragments/debugging/root-cause-tracing.md
        when: error_deep_in_stack
      - name: Implementation
        include: fragments/tdd/full-workflow.md

  - type: verification
    include: fragments/verification/complete-checklist.md
```

Build script compiles YAML → Markdown.

**Benefits:**

- More structured than free-form includes
- Enables validation (required sections, valid references)
- Could generate skill tests automatically

---

**Skill marketplace:**

Publish fragments to npm for broader reuse:

```bash
npm install @wrangler/skill-fragments
```

`skills-src/my-skill/SKILL.mdpp`:

```markdown
!include(@wrangler/skill-fragments/tdd/workflow.md)
```

**Use case:** Share fragments across organizations, open-source skills.

---

**LLM-optimized fragments:**

Fragments specifically tuned for Claude's behavior:

`skills-fragments/tdd/workflow-optimized.md`:

- Shorter (50% reduction)
- High information density
- Structured for easy scanning
- Optimized prompting patterns

Measure impact on skill effectiveness via A/B testing.

---

**Versioned fragment registry:**

Semantic versioning for fragments:

```markdown
!include(skills-fragments/tdd/workflow.md@v2.1.0)
```

Breaking changes create new major version:

- `v1.x.x` - Original workflow (deprecated)
- `v2.x.x` - Added compliance certification (current)
- `v3.x.x` - Future enhancements

Skills can opt into new versions gradually.

---

## Appendix A: Build Script Reference

### A.1 Full Implementation

**File:** `scripts/build-skills.js`

```javascript
#!/usr/bin/env node

const markedpp = require("markedpp");
const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");
const chokidar = require("chokidar");

// Configuration
const SRC_DIR = "skills-src";
const FRAGMENTS_DIR = "skills-fragments";
const OUTPUT_DIR = "skills";

// Parse CLI args
const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const validateOnly = args.includes("--validate-only");
const showMetrics = args.includes("--metrics");

// Fragment usage tracking
const fragmentUsage = new Map();

// Validation errors
let validationErrors = [];

/**
 * Validate that all !include() references exist
 */
function validateIncludes(content, sourcePath) {
  const includeRegex = /!include\(([^)]+)\)/g;
  const errors = [];

  let match;
  while ((match = includeRegex.exec(content)) !== null) {
    const fragmentPath = match[1].split(",")[0].trim();
    const fullPath = path.join(__dirname, "..", fragmentPath);

    if (!fs.existsSync(fullPath)) {
      errors.push({
        file: sourcePath,
        fragment: fragmentPath,
        line: content.substring(0, match.index).split("\n").length,
        message: `Fragment not found: ${fragmentPath}`,
      });
    }

    // Track usage
    fragmentUsage.set(fragmentPath, (fragmentUsage.get(fragmentPath) || 0) + 1);
  }

  return errors;
}

/**
 * Process variables in compiled content
 */
function processVariables(content, vars = {}) {
  let result = content;

  Object.entries(vars).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Extract variables from include directive
 * Example: !include(path.md, var1="val1", var2="val2")
 */
function parseIncludeVars(includeStr) {
  const vars = {};
  const varRegex = /(\w+)="([^"]+)"/g;

  let match;
  while ((match = varRegex.exec(includeStr)) !== null) {
    vars[match[1]] = match[2];
  }

  return vars;
}

/**
 * Process a single skill file
 */
async function processSkill(srcPath) {
  try {
    const content = await fs.readFile(srcPath, "utf8");

    // Validate includes
    const errors = validateIncludes(content, srcPath);
    validationErrors.push(...errors);

    if (validateOnly) return;

    // Determine output path
    const relativePath = path.relative(SRC_DIR, srcPath);
    const outputPath = path.join(
      OUTPUT_DIR,
      relativePath.replace(".mdpp", ".md"),
    );

    // Process with markedpp
    let compiled = markedpp.render(content);

    // Extract and process variables from includes
    const includeRegex = /!include\(([^)]+)\)/g;
    let match;
    while ((match = includeRegex.exec(content)) !== null) {
      const vars = parseIncludeVars(match[1]);
      compiled = processVariables(compiled, vars);
    }

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Write compiled output
    await fs.writeFile(outputPath, compiled, "utf8");

    console.log(`✓ ${srcPath} → ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error processing ${srcPath}:`, error.message);
    validationErrors.push({
      file: srcPath,
      message: error.message,
    });
  }
}

/**
 * Count lines in files matching pattern
 */
function countLines(pattern) {
  const files = glob.sync(pattern);
  let total = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    total += content.split("\n").length;
  });

  return total;
}

/**
 * Generate build metrics
 */
function generateMetrics() {
  const srcLines = countLines(`${SRC_DIR}/**/*.mdpp`);
  const fragmentLines = countLines(`${FRAGMENTS_DIR}/**/*.md`);
  const outputLines = countLines(`${OUTPUT_DIR}/**/*.md`);

  const duplicatedLines = srcLines + fragmentLines - outputLines;
  const reductionPercent =
    duplicatedLines > 0
      ? ((duplicatedLines / (srcLines + fragmentLines)) * 100).toFixed(1)
      : 0;

  console.log("\n📈 Build Metrics:");
  console.log(`   Source: ${srcLines} lines`);
  console.log(`   Fragments: ${fragmentLines} lines`);
  console.log(`   Output: ${outputLines} lines`);
  console.log(`   Duplication eliminated: ${duplicatedLines} lines`);
  console.log(`   Reduction: ${reductionPercent}%`);

  // Write metrics to file
  const metrics = {
    timestamp: new Date().toISOString(),
    source_lines: srcLines,
    fragment_lines: fragmentLines,
    output_lines: outputLines,
    duplication_eliminated: duplicatedLines,
    reduction_percent: parseFloat(reductionPercent),
    fragment_usage: Object.fromEntries(fragmentUsage),
  };

  fs.writeJsonSync("skills-metrics.json", metrics, { spaces: 2 });
}

/**
 * Display fragment usage stats
 */
function showFragmentUsage() {
  if (fragmentUsage.size === 0) return;

  console.log("\n📊 Fragment Usage:");

  const sorted = Array.from(fragmentUsage.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  sorted.forEach(([fragment, count]) => {
    console.log(`   ${fragment}: ${count} usage(s)`);
  });
}

/**
 * Display validation errors
 */
function showValidationErrors() {
  if (validationErrors.length === 0) return true;

  console.error("\n❌ Validation Errors:\n");

  validationErrors.forEach((error) => {
    if (error.line) {
      console.error(`   ${error.file}:${error.line} - ${error.message}`);
    } else {
      console.error(`   ${error.file} - ${error.message}`);
    }
  });

  console.error(`\n   Total errors: ${validationErrors.length}\n`);
  return false;
}

/**
 * Build all skills
 */
async function buildAll() {
  console.log("Building skills...\n");

  // Reset tracking
  fragmentUsage.clear();
  validationErrors = [];

  // Find all source files
  const sources = glob.sync(`${SRC_DIR}/**/*.mdpp`);

  if (sources.length === 0) {
    console.warn("⚠️  No .mdpp files found in skills-src/");
    return;
  }

  // Process each file
  for (const src of sources) {
    await processSkill(src);
  }

  // Show results
  if (!showValidationErrors()) {
    process.exit(1);
  }

  if (!validateOnly) {
    showFragmentUsage();

    if (showMetrics) {
      generateMetrics();
    }

    console.log("\n✅ Build complete\n");
  } else {
    console.log("\n✅ Validation passed\n");
  }
}

/**
 * Watch mode
 */
function watch() {
  console.log("👀 Watching for changes...\n");

  const watcher = chokidar.watch(
    [`${SRC_DIR}/**/*.mdpp`, `${FRAGMENTS_DIR}/**/*.md`],
    {
      ignoreInitial: true,
    },
  );

  watcher.on("change", async (filePath) => {
    console.log(`\n📝 Changed: ${filePath}\n`);

    if (filePath.endsWith(".mdpp")) {
      await processSkill(filePath);
    } else {
      // Fragment changed, rebuild all skills that use it
      await buildAll();
    }
  });

  watcher.on("add", async (filePath) => {
    console.log(`\n➕ Added: ${filePath}\n`);
    await buildAll();
  });

  // Initial build
  buildAll();
}

/**
 * Main
 */
async function main() {
  try {
    if (watchMode) {
      watch();
    } else {
      await buildAll();
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
```

---

### A.2 Package.json Scripts

```json
{
  "scripts": {
    "build:skills": "node scripts/build-skills.js",
    "watch:skills": "node scripts/build-skills.js --watch",
    "validate:skills": "node scripts/build-skills.js --validate-only",
    "metrics:skills": "node scripts/build-skills.js --metrics"
  },
  "devDependencies": {
    "markedpp": "^0.4.0",
    "chokidar": "^3.5.3",
    "glob": "^10.3.10",
    "fs-extra": "^11.2.0"
  }
}
```

---

## Appendix B: Fragment Catalog

### B.1 Core Templates

**File:** `skills-fragments/skill-announcement.md`

**Usage:** All skills (49 instances)

**Variables:** `{skill-name}`

**Content:**

```markdown
## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:

\`\`\`
🔧 Using Skill: {skill-name} | [brief purpose based on context]
\`\`\`

**Example:**
\`\`\`
🔧 Using Skill: {skill-name} | [Provide context-specific example of what you're doing]
\`\`\`

This creates an audit trail showing which skills were applied during the session.
```

---

**File:** `skills-fragments/overview-template.md`

**Usage:** Guidance for skill overview sections (optional)

**Content:**

```markdown
## Overview

[1-2 sentence description of what this skill does]

**Core principle:** [Single sentence capturing the essence]

**Violating the letter of the rules is violating the spirit of the rules.**
```

---

### B.2 TDD Fragments

**File:** `skills-fragments/tdd/full-workflow.md`

**Usage:** 8 skills

**Lines:** 350

**Content:**

```markdown
### RED - Write Failing Test

Write one minimal test showing what should happen.

<Good>
\`\`\`typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

const result = await retryOperation(operation);

expect(result).toBe('success');
expect(attempts).toBe(3);
});
\`\`\`
Clear name, tests real behavior, one thing
</Good>

<Bad>
\`\`\`typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
\`\`\`
Vague name, tests mock not code
</Bad>

**Requirements:**

- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

### Verify RED - Watch It Fail (MANDATORY EVIDENCE)

BEFORE proceeding to GREEN phase:

1. **Execute test command**:
   \`\`\`bash
   npm test -- path/to/test.test.ts

   # or

   pytest path/to/test.py::test_function_name

   # or

   cargo test test_function_name
   \`\`\`

2. **Copy full output showing failure**

3. **Verify failure message matches expected reason**:
   - ✅ CORRECT: "ReferenceError: retryOperation is not defined"
   - ✅ CORRECT: "AssertionError: expected 3 to equal undefined"
   - ❌ WRONG: "TypeError: Cannot read property 'X' of undefined" (syntax error, not missing implementation)
   - ❌ WRONG: Test passes (you didn't write a failing test!)

4. **If output doesn't match expected failure**: Fix test and re-run

**YOU MUST include test output in your message:**

#### Example of Required Evidence:

\`\`\`
Running RED phase verification:

$ npm test -- retry.test.ts

FAIL tests/retry.test.ts
✕ retries failed operations 3 times (2 ms)

● retries failed operations 3 times

    ReferenceError: retryOperation is not defined

      at Object.<anonymous> (tests/retry.test.ts:15:5)

Test Suites: 1 failed, 1 total
Tests: 1 failed, 1 total
Time: 0.234s
Exit code: 1

This is the expected failure - function doesn't exist yet.
Failure reason matches expectation: "retryOperation is not defined"
Proceeding to GREEN phase.
\`\`\`

**Claims without evidence violate verification-before-completion.**

If you cannot provide this output, you have NOT completed the RED phase.

### GREEN - Minimal Code

Write simplest code to pass the test.

<Good>
\`\`\`typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
\`\`\`
Just enough to pass
</Good>

<Bad>
\`\`\`typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  // YAGNI
}
\`\`\`
Over-engineered
</Bad>

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass (MANDATORY EVIDENCE)

AFTER implementing minimal code:

1. **Execute test command** (same as RED):
   \`\`\`bash
   npm test -- path/to/test.test.ts
   \`\`\`

2. **Copy full output showing pass**

3. **Verify ALL of these**:
   - All tests pass (0 failures)
   - No errors printed
   - No warnings printed
   - Exit code: 0
   - Test that was failing now passes

**YOU MUST include test output in your message:**

#### Example of Required Evidence:

\`\`\`
Running GREEN phase verification:

$ npm test -- retry.test.ts

PASS tests/retry.test.ts
✓ retries failed operations 3 times (145 ms)

Test Suites: 1 passed, 1 total
Tests: 1 passed, 1 total
Time: 0.189s
Exit code: 0

Test now passes. Proceeding to REFACTOR phase.
\`\`\`

**If any errors/warnings appear**: Fix them before claiming GREEN phase complete.

**Claims without evidence violate verification-before-completion.**

If you cannot provide this output, you have NOT completed the GREEN phase.

### REFACTOR - Clean Up

After green only:

- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

### Repeat

Next failing test for next feature.
```

---

**File:** `skills-fragments/tdd/red-phase.md`

**Usage:** Skills that need only RED phase

**Lines:** 80 (extracted from full-workflow.md lines 1-80)

---

**File:** `skills-fragments/tdd/green-phase.md`

**Usage:** Skills that need only GREEN phase

**Lines:** 50 (extracted from full-workflow.md lines 81-130)

---

**File:** `skills-fragments/tdd/compliance-cert.md`

**Usage:** 6 skills

**Lines:** 100

**Content:**

```markdown
## TDD Compliance Certification

BEFORE claiming work complete, certify TDD compliance:

For each new function/method implemented:

- [ ] **Function name**: [function_name]
  - **Test name**: [test_function_name]
  - **Watched fail**: YES / NO (if NO, explain why)
  - **Failure reason**: [expected failure message you saw]
  - **Implemented minimal code**: YES / NO
  - **Watched pass**: YES / NO
  - **Refactored**: YES / NO / N/A

### Example Certification:

- [x] **Function name**: retryOperation
  - **Test name**: test_retries_failed_operations_3_times
  - **Watched fail**: YES
  - **Failure reason**: "ReferenceError: retryOperation is not defined"
  - **Implemented minimal code**: YES
  - **Watched pass**: YES
  - **Refactored**: YES (extracted delay logic)

**Requirements:**

- If ANY "NO" answers: Work is NOT complete. Delete and restart with TDD.
- This certification MUST be included in your completion message.
- One entry required for each new function/method.

**Why this matters:**

- Required by verification-before-completion skill
- Proves you followed TDD (not just testing after)
- Creates audit trail for code review
- Makes rationalization harder (explicit lying vs fuzzy thinking)

**Cross-reference:** See verification-before-completion skill for complete requirements.
```

---

### B.3 Verification Fragments

**File:** `skills-fragments/verification/before-completion.md`

**Usage:** 6 skills

**Lines:** 150

**Content:**

```markdown
## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered
- [ ] TDD Compliance Certification created (see section above)

Can't check all boxes? You skipped TDD. Start over.
```

---

**File:** `skills-fragments/verification/evidence-template.md`

**Usage:** Skills requiring evidence before proceeding

**Lines:** 50

**Content:**

```markdown
**YOU MUST provide evidence before proceeding:**

1. **Run the command**:
   \`\`\`bash
   [specific command here]
   \`\`\`

2. **Copy full output**

3. **Verify expected result**:
   - ✅ Expected: [describe what success looks like]
   - ❌ Failure: [describe what failure looks like]

**Example evidence:**

\`\`\`
$ [command]

[output here]

Exit code: [N]

Analysis: [your interpretation]
\`\`\`

**Claims without evidence violate verification-before-completion.**

If you cannot provide this output, you have NOT completed this step.
```

---

### B.4 Subagent Templates

**File:** `skills-fragments/subagent-templates/implementation.md`

**Usage:** 4 skills (implement, housekeeping, etc.)

**Variables:** `{task_number}`, `{task_title}`, `{task_description}`, `{acceptance_criteria}`

**Lines:** 80

**Content:** See Example 5.4 above

---

**File:** `skills-fragments/subagent-templates/code-review.md`

**Usage:** 3 skills

**Variables:** `{task_number}`, `{implementation_summary}`, `{requirements}`

**Lines:** 100

**Content:**

```markdown
You are reviewing code for Task {task_number}.

## What Was Implemented

{implementation_summary}

## Requirements

{requirements}

## Your Job

Follow the code-review skill framework:

1. **Review the implementation** against requirements

2. **Identify issues** and categorize:
   - **Critical**: Must fix (breaks functionality, security issue, tests fail)
   - **Important**: Should fix (doesn't meet requirements, poor design, missing edge cases)
   - **Minor**: Nice to fix (style, naming, comments)

3. **Provide assessment**:

   ### Strengths

   [What was done well]

   ### Issues

   [List with category and specific fix instructions]

   **Critical:**
   - [Issue description] → Fix: [specific instructions]

   **Important:**
   - [Issue description] → Fix: [specific instructions]

   **Minor:**
   - [Issue description] → Suggestion: [optional improvement]

   ### Overall Assessment
   - **Approved** (no Critical/Important issues)
   - **Needs Revision** (has Critical/Important issues)

4. **Return structured report**

See requesting-code-review skill for full template.
```

---

**File:** `skills-fragments/subagent-templates/fix-attempt.md`

**Usage:** 2 skills

**Variables:** `{issue_description}`, `{fix_instructions}`, `{attempt_number}`

**Lines:** 60

**Content:**

```markdown
You are fixing a code review issue (Attempt {attempt_number}).

## Issue

{issue_description}

## Fix Instructions

{fix_instructions}

## Your Job

1. **Implement the fix**
   - Address the specific issue described
   - Don't change unrelated code
   - Follow existing patterns

2. **Run tests to verify fix works**
   \`\`\`bash
   [test command]
   \`\`\`

3. **Commit the fix**
   \`\`\`bash
   git add [files]
   git commit -m "fix: {issue_description_short}"
   \`\`\`

4. **Report back**
   - What you changed
   - Test results (pass/fail)
   - Any remaining issues

**IMPORTANT:** This is a {priority} issue - must be fixed before proceeding.
```

---

## Appendix C: Success Metrics

### C.1 Quantitative Metrics

**Baseline (before migration):**

- Total lines: 13,327
- Duplication estimate: 2,000-3,000 lines (15-22%)
- Number of skills: 49
- Largest skill: 1,222 lines
- Build time: N/A (no build)

**Target (after migration):**

- Source lines: ~9,500 (29% reduction from manual editing)
- Fragment lines: ~2,100
- Output lines: 13,327 (unchanged, Claude sees same content)
- Duplication eliminated: 1,727 lines (23%)
- Number of skills: 49 (unchanged)
- Largest skill source: ~600 lines (51% reduction)
- Build time: <2 seconds

**Quality metrics:**

- Fragment reuse: Avg 5 skills per fragment (top fragments >10 usages)
- Validation coverage: 100% (all includes validated)
- Build success rate: >99%
- CI integration: 100% (all PRs validated)

---

### C.2 Qualitative Metrics

**Developer Experience:**

- ✅ Easier to find and update common patterns
- ✅ Faster skill authoring (reuse vs write)
- ✅ Clearer separation of concerns
- ✅ Better IDE navigation (jump to fragment source)

**Maintainability:**

- ✅ Single source of truth for TDD workflow
- ✅ Consistent skill announcements across all skills
- ✅ Easier to evolve patterns (update fragment once)
- ✅ Less risk of inconsistency

**Discoverability:**

- ✅ Fragment catalog documents reusable components
- ✅ Skills more scannable (less boilerplate)
- ✅ Build metrics highlight high-value fragments

---

### C.3 Success Criteria

**Phase gates:**

✅ **Phase 1 complete when:**

- Build script runs without errors
- Can process dummy skill with fragment
- CI integration validated

✅ **Phase 2 complete when:**

- 3 pilot skills migrated
- Output byte-identical to original
- Claude Code loads skills successfully

✅ **Phase 3 complete when:**

- TDD fragments extracted
- 8 dependent skills use fragments
- No regressions in skill behavior

✅ **Phase 4 complete when:**

- Validation catches missing fragments
- Metrics report generated
- CI fails on uncommitted changes

✅ **Phase 5 complete when:**

- All 49 skills migrated
- Duplication reduced by 20%+
- Build completes in <2 seconds

✅ **Phase 6 complete when:**

- Fragment catalog documented
- Authoring guide published
- Team trained on new workflow

---

## Conclusion

The modular skills composition system addresses critical pain points in Wrangler's skills architecture:

1. **Eliminates 1,700+ lines of duplication** through reusable fragments
2. **Improves maintainability** with single source of truth for common patterns
3. **Enhances developer experience** with clear authoring workflows
4. **Maintains backward compatibility** - zero changes to Claude Code behavior
5. **Enables future extensibility** - foundation for advanced composition patterns

**Recommended next steps:**

1. **Approve specification** (this document)
2. **Create MCP issues** for each implementation phase
3. **Assign resources** (estimated 2-3 weeks engineering time)
4. **Execute Phase 1** (infrastructure setup)
5. **Validate with pilot skills** (Phase 2)
6. **Full migration** (Phases 3-6)

**Timeline:** 4 weeks from approval to completion

**Risk:** Low (gradual migration, easy rollback, no runtime changes)

**ROI:** High (20-30% reduction in maintenance burden, improved DX, extensible foundation)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Authors:** Research & Design Team
**Status:** Awaiting Approval

---

## Sources

Research sources consulted for this specification:

- [Markdown and including multiple files - Stack Overflow](https://stackoverflow.com/questions/4779582/markdown-and-including-multiple-files)
- [markedpp - GitHub](https://github.com/commenthol/markedpp)
- [markdown-it-directive - GitHub](https://github.com/hilookas/markdown-it-directive)
- [markdown-subtemplate - PyPI](https://pypi.org/project/markdown-subtemplate/)
- [mdBook Preprocessors Documentation](https://rust-lang.github.io/mdBook/for_developers/preprocessors.html)
- [Eleventy Markdown](https://www.11ty.dev/docs/languages/markdown/)
- [MDX - GitHub](https://github.com/mdx-js/mdx)
- [MDX Official Site](https://mdxjs.com/)
- [Next.js MDX](https://nextjs.org/docs/pages/building-your-application/configuring/mdx)
- [Remix MDX](https://remix.run/docs/en/main/guides/mdx)
