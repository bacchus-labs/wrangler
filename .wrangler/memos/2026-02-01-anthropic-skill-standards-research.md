# Research Report: Anthropic Skill Standards vs Wrangler Implementation

**Date**: 2026-02-01
**Researcher**: Claude Sonnet 4.5
**Status**: Complete

## Executive Summary

Wrangler's skills were created when Anthropic's skill-creator skill was in early development. Since then, Anthropic has significantly evolved their standards and best practices for Agent Skills. This research identifies 12 major gaps and provides a prioritized action plan.

**Critical Finding**: Wrangler has ONE major advantage (TDD-based testing methodology) and TWELVE significant gaps in standards compliance.

**Priority Assessment**:

- **CRITICAL**: 3 gaps (frontmatter format, skill invocation announcement pattern, naming conventions)
- **HIGH**: 4 gaps (progressive disclosure, description format, token efficiency, directory structure)
- **MEDIUM**: 3 gaps (templates, documentation clarity, cross-references)
- **LOW**: 2 gaps (file organization, checklist pattern)

---

## 1. Current State Analysis

### Anthropic's Latest Skill Structure (2026)

**Official Sources**:

- [Anthropic Skills Repository](https://github.com/anthropics/skills) - 60.5k stars, created Sep 2025
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skill Creator Skill](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

**Key Standards (2026)**:

1. **Frontmatter**: YAML format with ONLY `name` and `description` fields

   ```yaml
   ---
   name: my-skill-name
   description: Clear description of what this skill does and when to use it
   ---
   ```

2. **Naming Conventions**: Gerund form (verb + -ing), lowercase with hyphens
   - Good: `processing-pdfs`, `analyzing-spreadsheets`, `managing-databases`
   - Wrangler uses: `test-driven-development`, `code-review`, `implement-spec` (mix of patterns)

3. **Description Format**: Third person, includes BOTH what it does AND when to use it
   - "Processes Excel files and generates reports. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files."
   - Must be 1024 characters max

4. **Progressive Disclosure**: Three-level loading system
   - Metadata (name + description) - Always in context (~100 words)
   - SKILL.md body - When skill triggers (<5k words, ideally <500 lines)
   - Bundled resources - As needed (scripts/, references/, assets/)

5. **Directory Structure**: Organized by resource type

   ```
   skill-name/
   ├── SKILL.md (required)
   ├── scripts/ (executable code)
   ├── references/ (documentation loaded as needed)
   └── assets/ (files used in output)
   ```

6. **Token Efficiency**: Target word counts
   - Getting-started workflows: <150 words
   - Frequently-loaded skills: <200 words total
   - Other skills: <500 words

7. **No Skill Invocation Announcement Pattern**: Anthropic does NOT recommend the "🔧 Using Skill: X" pattern that wrangler uses

### Wrangler's Current Implementation

**Structure** (47 skills in flat directory):

```
skills/
  skill-name/
    SKILL.md (required)
    supporting-file.* (optional)
```

**Common Patterns in Wrangler Skills**:

1. **Frontmatter**: YAML with `name` and `description` only ✅

   ```yaml
   ---
   name: test-driven-development
   description: Use when implementing any feature or bugfix...
   ---
   ```

2. **Skill Usage Announcement** (NOT in Anthropic standards): ❌

   ```markdown
   ## Skill Usage Announcement

   **MANDATORY**: When using this skill, announce it at the start with:
   ```

   🔧 Using Skill: test-driven-development | [brief purpose]

   ```

   ```

3. **Naming**: Mix of patterns
   - Gerund: `writing-skills`, `testing-skills`, `dispatching-parallel-agents`
   - Noun: `test-driven-development`, `code-review`, `implement-spec`
   - Action: `create-new-issue`, `capture-new-idea`

4. **Description Format**: Varies
   - Some follow "Use when..." pattern ✅
   - Some are pure functional descriptions ❌
   - Most are third person ✅

5. **Progressive Disclosure**: Limited use
   - Most skills are self-contained in SKILL.md
   - Few use separate reference files
   - `writing-skills` has supporting files (anthropic-best-practices.md, etc.)

6. **Token Efficiency**: Variable
   - `writing-skills`: 870 lines (TOO LONG ❌)
   - `test-driven-development`: manageable
   - `code-review`: structured but verbose

---

## 2. Side-by-Side Comparison

| Aspect                            | Anthropic 2026 Standard                                     | Wrangler Current                               | Gap?          |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | ------------- |
| **Frontmatter**                   | YAML with `name` and `description` only                     | Same ✅                                        | NO            |
| **Name field**                    | Lowercase, hyphens, gerund form preferred                   | Mix of patterns (gerund, noun, action)         | MINOR         |
| **Description format**            | Third person, includes what AND when                        | Mostly correct, some missing triggers          | MEDIUM        |
| **Skill invocation announcement** | NOT RECOMMENDED                                             | "🔧 Using Skill: X" pattern in ALL skills      | **CRITICAL**  |
| **Progressive disclosure**        | Explicit 3-level system with scripts/, references/, assets/ | Limited separation, most skills self-contained | HIGH          |
| **Token efficiency targets**      | <500 lines SKILL.md, <200 words for frequent                | `writing-skills` is 870 lines                  | HIGH          |
| **Directory structure**           | `scripts/`, `references/`, `assets/` subdirectories         | Flat, supporting files at skill root           | MEDIUM        |
| **Testing methodology**           | "Build evaluations first" with scenarios                    | TDD approach with pressure testing (SUPERIOR)  | **ADVANTAGE** |
| **Naming conventions**            | Strong recommendation for gerund form                       | Mixed patterns                                 | LOW           |
| **Description triggers**          | Explicit "Use when..." with symptoms                        | Variable, some lack specific triggers          | MEDIUM        |
| **Cross-references**              | Avoid @ links, use skill names only                         | Uses explicit requirement markers (good)       | NO            |
| **Documentation clarity**         | "Claude is already smart" principle                         | Verbose in places                              | MEDIUM        |

---

## 3. Gap Analysis

### CRITICAL Gaps

#### Gap 1: Skill Invocation Announcement Pattern ❌

**What Wrangler Does**:
Every single skill includes this section:

```markdown
## Skill Usage Announcement

**MANDATORY**: When using this skill, announce it at the start with:
```

🔧 Using Skill: writing-skills | [brief purpose based on context]

```

This creates an audit trail showing which skills were applied during the session.
```

**What Anthropic Recommends**: No such pattern exists in any Anthropic documentation or examples.

**Why This is a Gap**:

- Adds ~10 lines to EVERY skill
- Increases token count unnecessarily
- Not a recognized best practice
- May confuse Claude instances not familiar with wrangler

**Impact**: CRITICAL - Affects all 47 skills

**Recommendation**: REMOVE from all skills OR move to CLAUDE.md as a general instruction
SJH: Let's just remove it altogether since Claude Code tracks skill usage natively.

---

#### Gap 2: Frontmatter Table Format in Template ⚠️

**What Wrangler Might Have**: Unknown (need to check template)

**What Anthropic Uses**:

```yaml
---
name: template-skill
description: Replace with description of the skill and when Claude should use it.
---
```

**Why This Matters**: Template determines how new skills are created

**Recommendation**: Verify template format matches Anthropic standard
SJH: Approved.

---

#### Gap 3: Naming Consistency 📛

**What Wrangler Does**: Mix of patterns

- Gerund: `writing-skills`, `testing-skills`
- Noun phrase: `test-driven-development`, `code-review`
- Action: `create-new-issue`, `capture-new-idea`

**What Anthropic Recommends**: Gerund form (verb + -ing)

- `processing-pdfs`, `analyzing-spreadsheets`, `managing-databases`

**Why This Matters**: Consistency improves discoverability and professionalism

**Impact**: MEDIUM - Affects 30+ skills

**Recommendation**: Create naming convention decision in CLAUDE.md, don't rename existing skills unless major refactor
SJH: Let's adopt anthropic's best practices for this and modify all our existing skills accordingly. But we need to make sure we update any references in slash commands that invoke skills.

---

### HIGH Priority Gaps

#### Gap 4: Progressive Disclosure Implementation 📚

**What Wrangler Does**:

- Most skills are self-contained in single SKILL.md
- Few skills use supporting files
- No consistent `scripts/`, `references/`, `assets/` structure

**What Anthropic Recommends**:

```
skill-name/
├── SKILL.md (overview, <500 lines)
├── scripts/ (executable code)
├── references/ (documentation loaded as needed)
└── assets/ (files used in output)
```

**Example from Anthropic**:

```
pdf/
├── SKILL.md (main instructions)
├── FORMS.md (form-filling guide)
├── reference.md (API reference)
├── examples.md (usage examples)
└── scripts/
    ├── analyze_form.py
    ├── fill_form.py
    └── validate.py
```

**Why This Matters**:

- Token efficiency (don't load everything at once)
- Better organization for complex skills
- Clearer separation of concerns

**Skills That Need This**: `writing-skills` (870 lines), potentially others

**Recommendation**:

1. Split `writing-skills` into SKILL.md + references/
2. Create `references/` pattern for documentation-heavy skills
3. Use `scripts/` for reusable utilities

SJH: Approved for all three.

#### Gap 5: Description Format Inconsistency 📝

**What Wrangler Does**: Variable formats

- Some: "Use when implementing any feature or bugfix..." ✅
- Some: "Comprehensive code review framework..." ❌ (missing triggers)
- Some: "Orchestrate spec-to-PR workflow..." ❌ (missing when to use)

**What Anthropic Recommends**: ALWAYS include both what AND when

```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Why This Matters**: Description is PRIMARY triggering mechanism

**Recommendation**: Audit all 47 skills, ensure each description includes:

1. What the skill does (functional description)
2. When to use it ("Use when..." with specific triggers/symptoms)
3. Third person voice

SJH: Approved.

---

#### Gap 6: Token Efficiency Targets 💰

**What Wrangler Does**:

- `writing-skills`: 870 lines (WAY TOO LONG ❌)
- Most skills: reasonable length
- No explicit token budget awareness

**What Anthropic Recommends**:

- SKILL.md body: <500 lines (ideally much less)
- Getting-started workflows: <150 words
- Frequently-loaded skills: <200 words total
- Other skills: <500 words

**Why This Matters**: "The context window is a public good"

**Calculation for writing-skills**:

- 870 lines ≈ 6,000 words ≈ 8,000 tokens
- Anthropic target: ~500 lines ≈ 3,500 words ≈ 4,500 tokens
- OVER BUDGET BY 3,500 TOKENS

**Recommendation**:

1. URGENT: Split `writing-skills` immediately
2. Audit other skills for length
3. Move heavy content to `references/`

SJH: Approved.

#### Gap 7: Directory Structure for Resources 📁

**What Wrangler Does**:

```
skills/writing-skills/
  SKILL.md
  anthropic-best-practices.md
  graphviz-conventions.dot
  persuasion-principles.md
```

**What Anthropic Recommends**:

```
skills/writing-skills/
  SKILL.md
  references/
    anthropic-best-practices.md
    persuasion-principles.md
  scripts/
    (none currently)
  assets/
    graphviz-conventions.dot
```

**Why This Matters**:

- Clearer organization
- Signals intent (reference vs script vs asset)
- Follows community standard

**Recommendation**: Adopt Anthropic structure for skills with supporting files

SJH: Approved.

### MEDIUM Priority Gaps

#### Gap 8: Template Pattern Usage 📋

**What Wrangler Does**: Unknown level of template usage

**What Anthropic Recommends**: Provide templates with "Template pattern" approach

- Strict templates for API responses, data formats
- Flexible templates for adaptable workflows

**Why This Matters**: Improves consistency and clarity

**Recommendation**: Review skills for template opportunities

---

#### Gap 9: Documentation Verbosity 📖

**What Wrangler Does**: Some skills are verbose with explanations

**What Anthropic Recommends**: "Default assumption: Claude is already very smart"

- Only add context Claude doesn't have
- Challenge each paragraph: "Does this justify its token cost?"

**Example**:

````markdown
❌ BAD (verbose):

## Extract PDF text

PDF (Portable Document Format) files are a common file format that contains
text, images, and other content. To extract text from a PDF, you'll need to
use a library...

✅ GOOD (concise):

## Extract PDF text

Use pdfplumber for text extraction:

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

**Recommendation**: Audit skills for unnecessary explanations
SJH: approved

---

#### Gap 10: Cross-Reference Format 🔗

**What Wrangler Does**: Good patterns

- Uses skill names directly
- Uses "REQUIRED SUB-SKILL" markers
- Avoids @ links (good!)

**What Anthropic Recommends**: Same approach

**Why This Matters**: This is actually ALIGNED, not a gap

**Recommendation**: Keep current approach
sjh: approved.

---

### LOW Priority Gaps

#### Gap 11: File Organization Examples 📂

**What Wrangler Does**: Flat namespace, minimal examples of multi-file skills

**What Anthropic Recommends**: Rich examples of progressive disclosure

- Pattern 1: High-level guide with references
- Pattern 2: Domain-specific organization
- Pattern 3: Conditional details

**Why This Matters**: Provides clear patterns for complex skills

**Recommendation**: Document progressive disclosure patterns in wrangler
sjh: approved.

---

#### Gap 12: Workflow Checklist Pattern ✅

**What Wrangler Does**: Has checklists in some skills (e.g., writing-skills)

**What Anthropic Recommends**: Explicit "Copy this checklist" pattern

```markdown
Copy this checklist and track your progress:
```
````

Research Progress:

- [ ] Step 1: Read all source documents
- [ ] Step 2: Identify key themes
      ...

```

```

**Why This Matters**: Improves task tracking for multi-step workflows

**Recommendation**: Adopt this pattern for complex workflows
SJH: Approved.

---

## 4. What Wrangler Has That Anthropic Doesn't

### Advantage: TDD Testing Methodology

**What Wrangler Has**: Comprehensive skill testing framework

- Pressure scenario testing
- Rationalization tables
- RED-GREEN-REFACTOR for documentation
- Meta-testing techniques
- Bulletproofing against compliance bypass

**What Anthropic Has**: Basic "evaluation-driven development"

- Create evaluations before writing skill
- Test scenarios
- But NO systematic pressure testing
- No rationalization detection

**Why Wrangler's Approach is Superior**:

1. **Systematic**: TDD cycle adapted to documentation
2. **Rigorous**: Tests skills under pressure (time, sunk cost, authority)
3. **Comprehensive**: Captures rationalizations agents use to bypass rules
4. **Iterative**: Close loopholes systematically

**Recommendation**: KEEP this advantage, potentially contribute back to Anthropic community
SJH: approved but w/o contributing back for now.

---

## 5. Recommendations

### Priority 1: CRITICAL Changes (Do Now)

#### A. Remove or Relocate Skill Invocation Announcement Pattern

**Current State**: Every skill has ~10 lines of "🔧 Using Skill: X" instructions

**Options**:

**Option 1 (RECOMMENDED)**: Move to CLAUDE.md as general instruction
SJH: Let's just remove it altogether since Claude Code tracks skill usage natively.

```markdown
## Skill Usage Audit Trail

When using any wrangler skill, announce it at the start:
```

🔧 Using Skill: [skill-name] | [brief purpose]

```

This creates an audit trail for session analysis.
```

**Option 2**: Remove entirely, rely on Claude Code's built-in skill invocation tracking

**Effort**:

- Option 1: 2 hours (update CLAUDE.md, remove from all skills)
- Option 2: 1 hour (remove from all skills)

**Impact**: Frees ~470 lines across 47 skills (10 lines × 47 skills)

---

#### B. Verify and Fix Template Format

**Action**: Check template file matches Anthropic standard (YAML frontmatter only)

**Effort**: 15 minutes

---

#### C. Split writing-skills Immediately

**Current**: 870 lines, 8,000 tokens
**Target**: <500 lines, <4,500 tokens

**Proposed Structure**:

```
skills/writing-skills/
  SKILL.md (overview, core workflow, <400 lines)
  references/
    anthropic-best-practices.md (keep as reference)
    testing-methodology.md (TDD for skills details)
    persuasion-techniques.md (rationalization tables)
    cso-optimization.md (Claude Search Optimization)
  assets/
    graphviz-conventions.dot
```

**New SKILL.md Structure** (slim):

1. Overview (what is skill writing + TDD principle)
2. When to create a skill
3. Core RED-GREEN-REFACTOR cycle
4. Quick reference table
5. Links to detailed references

**Effort**: 4-6 hours

---

### Priority 2: HIGH Changes (Do Soon)

#### D. Audit and Fix All Skill Descriptions

**Action**: Ensure EVERY description includes:

1. What the skill does (functional)
2. When to use it ("Use when..." with triggers)
3. Third person voice

**Process**:

1. Export all descriptions
2. Review each one
3. Rewrite any missing triggers/symptoms
4. Test with sample queries

**Effort**: 6-8 hours (47 skills × 10 min each)

---

#### E. Adopt Progressive Disclosure for Complex Skills

**Identify candidates**: Skills >300 lines or with heavy reference material

**Apply pattern**:

1. Keep SKILL.md as overview (<500 lines)
2. Create `references/` for documentation
3. Create `scripts/` for utilities
4. Create `assets/` for templates/boilerplate

**Effort**: 2-4 hours per skill

**Priority skills**:

1. `writing-skills` (CRITICAL)
2. `code-review` (if verbose)
3. Any skills with API docs or heavy reference

---

#### F. Establish Token Efficiency Guidelines

**Action**: Create wrangler standard for skill length

**Add to CLAUDE.md**:

```markdown
## Skill Length Guidelines

Follow Anthropic's token efficiency standards:

- SKILL.md body: <500 lines (target: 300-400)
- Getting-started workflows: <150 words
- Frequently-used skills: <200 words total
- Complex skills: <500 words main content, rest in references/

If skill exceeds limits, use progressive disclosure:

- Move details to references/
- Keep only essential workflow in SKILL.md
```

**Effort**: 1 hour

---

### Priority 3: MEDIUM Changes (Do Eventually)

#### G. Standardize Directory Structure

**Action**: Migrate multi-file skills to Anthropic structure

**Pattern**:

```
skill-name/
  SKILL.md
  scripts/ (if applicable)
  references/ (if applicable)
  assets/ (if applicable)
```

**Affected skills**:

- `writing-skills` (has supporting files)
- Any others with multiple files

**Effort**: 1-2 hours per skill

---

#### H. Review and Reduce Documentation Verbosity

**Action**: Apply "Claude is already smart" principle

**Process**:

1. Read each skill
2. Ask: "Does Claude need this explanation?"
3. Cut unnecessary context
4. Compress examples

**Effort**: 4-6 hours

---

#### I. Add Workflow Checklist Pattern

**Action**: For complex multi-step skills, add "Copy this checklist" pattern

**Candidates**:

- `writing-specifications`
- `implementing-specifications`
- `code-review`
- `systematic-debugging`

**Effort**: 30 min per skill

---

### Priority 4: LOW Changes (Nice to Have)

#### J. Naming Convention Decision

**Action**: Decide on wrangler standard

**Options**:

**Option 1**: Adopt Anthropic gerund form for NEW skills only

- Keep existing names (too disruptive to rename)
- Use gerund form for future skills
- Document in CLAUDE.md

  **Option 2**: Keep current mixed approach

- Allow flexibility
- Optimize for readability over consistency

**Recommendation**: Option 1
SJH: Let's do option 1.

**Effort**: 30 minutes (decision + documentation)

---

#### K. Document Progressive Disclosure Patterns

**Action**: Create examples in wrangler docs

**Add to** `docs/skill-best-practices.md`:

- Pattern 1: High-level guide with references
- Pattern 2: Domain-specific organization
- Pattern 3: Conditional details

**Effort**: 2 hours

---

## 6. Action Items Summary

### Immediate (This Week)

- [ ] **Issue #1**: Remove "Skill Usage Announcement" pattern from all skills (2 hours)
- [ ] **Issue #2**: Move skill announcement to CLAUDE.md as general instruction (30 min)
- [ ] **Issue #3**: Split writing-skills into SKILL.md + references/ (6 hours)
- [ ] **Issue #4**: Verify template format matches Anthropic standard (15 min)

**Total Effort**: ~9 hours

---

### Short-Term (Next Sprint)

- [ ] **Issue #5**: Audit all 47 skill descriptions for "Use when..." format (8 hours)
- [ ] **Issue #6**: Create token efficiency guidelines in CLAUDE.md (1 hour)
- [ ] **Issue #7**: Identify and prioritize other skills for progressive disclosure (2 hours)

**Total Effort**: ~11 hours

---

### Medium-Term (Next Month)

- [ ] **Issue #8**: Apply progressive disclosure to code-review if needed (4 hours)
- [ ] **Issue #9**: Review skills for verbosity, apply "Claude is smart" principle (6 hours)
- [ ] **Issue #10**: Add workflow checklists to complex skills (2 hours)
- [ ] **Issue #11**: Standardize directory structure for multi-file skills (4 hours)

**Total Effort**: ~16 hours

---

### Long-Term (Eventually)

- [ ] **Issue #12**: Document wrangler naming convention decision (30 min)
- [ ] **Issue #13**: Create progressive disclosure pattern guide (2 hours)
- [ ] **Issue #14**: Consider contributing TDD testing methodology back to Anthropic (variable)

**Total Effort**: ~3 hours

---

## 7. Key Takeaways

### What Changed Since Wrangler Started

1. **Skill structure formalized**: Anthropic now has explicit standards (didn't exist initially)
2. **Progressive disclosure emphasized**: Three-level loading system now documented
3. **Token efficiency prioritized**: Specific word/line count targets
4. **Directory structure standardized**: scripts/, references/, assets/ pattern
5. **Description format refined**: Must include both what AND when

### What Wrangler Got Right

1. ✅ **Frontmatter format**: Already correct (YAML with name/description)
2. ✅ **Cross-referencing**: Avoid @ links, use skill names
3. ✅ **TDD testing methodology**: Superior to Anthropic's approach
4. ✅ **Third-person descriptions**: Mostly followed
5. ✅ **Flat namespace**: Searchable, simple

### What Wrangler Needs to Fix

1. ❌ **Skill invocation announcement**: Not a standard, adds bloat
2. ❌ **writing-skills length**: 870 lines = 75% over token budget
3. ⚠️ **Description triggers**: Some skills missing "Use when..."
4. ⚠️ **Progressive disclosure**: Limited use of references/
5. ⚠️ **Token efficiency awareness**: No explicit guidelines

---

## 8. Conclusion

Wrangler's skills were created based on an early version of Anthropic's skill-creator skill. Since then, Anthropic has significantly evolved their standards with:

- Formal documentation at platform.claude.com
- Official skills repository (60.5k stars)
- Comprehensive best practices guide
- Progressive disclosure patterns
- Token efficiency guidelines

**Wrangler needs to evolve to match 2026 standards while PRESERVING its superior TDD testing methodology.**

The most critical changes are:

1. Remove bloated "Skill Usage Announcement" pattern (affects all 47 skills)
2. Split writing-skills to meet token budget (currently 75% over)
3. Ensure all descriptions include "Use when..." triggers

The most valuable asset is wrangler's TDD-based skill testing approach, which is MORE rigorous than Anthropic's evaluation-driven development.

**Recommendation**: Implement Priority 1 changes immediately, then work through Priority 2-3 over next sprint. Consider contributing TDD methodology back to Anthropic community.
SJH: No, let's just do all of the changes regardless of priority.

---

## Sources

- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Skill Creator Skill](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- [Claude Skills Blog Post](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
