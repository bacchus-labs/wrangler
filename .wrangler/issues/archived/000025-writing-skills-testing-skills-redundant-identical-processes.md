---
id: "000025"
title: "Flaw: writing-skills and testing-skills-with-subagents describe identical TDD process but exist as separate skills"
type: "issue"
status: "closed"
priority: "low"
labels: ["skills", "workflow-flaw", "process", "duplication"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Flaw Description

**writing-skills** and **testing-skills-with-subagents** describe the same process (applying TDD to skill documentation) but exist as separate files with significant content duplication.

**writing-skills** (623 lines):
- Lines 10-46: "TDD Mapping for Skills" - Maps TDD concepts to skill creation
- Lines 337-528: "RED-GREEN-REFACTOR for Skills" - Describes baseline testing, writing minimal skill, closing loopholes
- Lines 563-600: "Skill Creation Checklist (TDD Adapted)" - RED/GREEN/REFACTOR phases

**testing-skills-with-subagents** (388 lines):
- Lines 10-12: "Testing skills is just TDD applied to process documentation"
- Lines 32-44: "TDD Mapping for Skill Testing" - Identical mapping to writing-skills
- Lines 46-165: "RED Phase", "GREEN Phase", "REFACTOR Phase" - Same process as writing-skills
- Lines 313-333: "Testing Checklist (TDD for Skills)" - Same phases as writing-skills

**Overlap:**
1. Both explain TDD concepts (RED-GREEN-REFACTOR)
2. Both map TDD to skill testing
3. Both describe baseline testing (run without skill, watch fail)
4. Both describe writing minimal skill
5. Both describe closing loopholes (refactor phase)
6. Both have identical checklists

**Differences:**
- **writing-skills** focuses on skill CREATION (structure, CSO, formatting)
- **testing-skills-with-subagents** focuses on TESTING methodology (pressure scenarios, meta-testing)

But the testing methodology IS part of creation (as writing-skills says: "NO SKILL WITHOUT A FAILING TEST FIRST"). So why separate files?

## Affected Skills

- `writing-skills/SKILL.md` (623 lines, lines 10-46, 337-528, 563-600 overlap with testing-skills)
- `testing-skills-with-subagents/SKILL.md` (388 lines, significant overlap)

## Specific Examples

### Example 1: TDD Mapping tables are identical

**writing-skills** lines 32-46:
```markdown
| TDD Concept | Skill Creation |
|-------------|----------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **Test fails (RED)** | Agent violates rule without skill (baseline) |
| **Test passes (GREEN)** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |
...
```

**testing-skills-with-subagents** lines 32-44:
```markdown
| TDD Phase | Skill Testing | What You Do |
|-----------|---------------|-------------|
| **RED** | Baseline test | Run scenario WITHOUT skill, watch agent fail |
| **Verify RED** | Capture rationalizations | Document exact failures verbatim |
| **GREEN** | Write skill | Address specific baseline failures |
...
```

**Same information**, different presentation. Why maintain both?

### Example 2: RED-GREEN-REFACTOR process duplicated

**writing-skills** lines 500-528:
```markdown
### RED: Write Failing Test (Baseline)

Run pressure scenario with subagent WITHOUT the skill. Document exact behavior:
- What choices did they make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

### GREEN: Write Minimal Skill

Write skill that addresses those specific rationalizations...

### REFACTOR: Close Loopholes

Agent found new rationalization? Add explicit counter. Re-test until bulletproof.
```

**testing-skills-with-subagents** lines 46-165:
```markdown
## RED Phase: Baseline Testing (Watch It Fail)

**Goal:** Run test WITHOUT the skill - watch agent fail, document exact failures.
[59 lines of detailed guidance]

## GREEN Phase: Write Minimal Skill (Make It Pass)

Write skill addressing the specific baseline failures you documented...

## REFACTOR Phase: Close Loopholes (Stay Green)

Agent violated rule despite having the skill? This is like a test regression...
```

**Same content**, more detail in testing-skills-with-subagents. But it's redundant.

### Example 3: Checklists are nearly identical

**writing-skills** lines 563-600:
```markdown
## Skill Creation Checklist (TDD Adapted)

**RED Phase - Write Failing Test:**
- [ ] Create pressure scenarios (3+ combined pressures for discipline skills)
- [ ] Run scenarios WITHOUT skill - document baseline behavior verbatim
- [ ] Identify patterns in rationalizations/failures

**GREEN Phase - Write Minimal Skill:**
[checklist items]

**REFACTOR Phase - Close Loopholes:**
[checklist items]
```

**testing-skills-with-subagents** lines 313-333:
```markdown
## Testing Checklist (TDD for Skills)

**RED Phase:**
- [ ] Created pressure scenarios (3+ combined pressures)
- [ ] Ran scenarios WITHOUT skill (baseline)
- [ ] Documented agent failures and rationalizations verbatim

**GREEN Phase:**
[same checklist items]

**REFACTOR Phase:**
[same checklist items]
```

**Same checklist**, minor wording differences.

## Impact

**Low** - This is maintenance and token efficiency issue:

1. **Token waste**: Loading both skills loads duplicate content
2. **Maintenance burden**: Update process in one place, must update in other
3. **Confusion**: Which skill should I use when creating/testing skills?
4. **Synchronization risk**: One skill updated, other becomes stale

**Why not higher:** Both skills are correct and teach the same (correct) process. The duplication doesn't cause incorrect behavior, just inefficiency.

## Suggested Fix

### Option A: Merge into single skill (recommended)

Merge into single **writing-skills** skill with clear sections:

```markdown
# Writing Skills

## Overview
[Combined overview]

## What is a Skill?
[From writing-skills]

## The TDD Process for Skills
[Merged content: TDD mapping, RED-GREEN-REFACTOR]

### RED Phase: Baseline Testing
[From testing-skills-with-subagents - more detailed]

### GREEN Phase: Write Minimal Skill
[From writing-skills - includes structure/CSO/formatting]

### REFACTOR Phase: Close Loopholes
[From testing-skills-with-subagents - includes pressure scenarios, meta-testing]

## Skill Structure and Formatting
[From writing-skills - SKILL.md structure, CSO, etc.]

## Testing Techniques
[From testing-skills-with-subagents - pressure types, scenarios, meta-testing]

## Skill Creation Checklist
[Merged checklist]
```

**Result:** Single comprehensive skill for creating AND testing skills.

**Pros:**
- Single source of truth
- No duplication
- Complete process in one place
- Reduced token usage

**Cons:**
- Longer skill (but content is redundant anyway)
- Need to reorganize content

### Option B: Keep separate but remove duplication

**writing-skills** focuses on:
- What is a skill
- Skill structure (frontmatter, sections)
- CSO (Claude Search Optimization)
- File organization
- References **testing-skills-with-subagents** for testing methodology

**testing-skills-with-subagents** focuses on:
- TDD process (RED-GREEN-REFACTOR)
- Pressure scenarios
- Meta-testing
- Rationalization tables
- Examples of bulletproofing

**Changes:**
1. Remove TDD mapping from **writing-skills** (reference **testing-skills-with-subagents**)
2. Remove RED-GREEN-REFACTOR from **writing-skills** (reference **testing-skills-with-subagents**)
3. Update **writing-skills** checklist to reference **testing-skills-with-subagents** for testing phases

**Pros:**
- Clear separation of concerns
- Each skill focused on one aspect
- Reduced duplication

**Cons:**
- Must jump between skills
- Less convenient for skill authors

### Option C: Keep as-is, add cross-references

Add to **writing-skills**:
```markdown
**Note:** This skill and testing-skills-with-subagents overlap significantly.
- writing-skills: Focuses on skill structure, formatting, organization
- testing-skills-with-subagents: Focuses on detailed testing methodology

Use both together when creating skills.
```

Add to **testing-skills-with-subagents**:
```markdown
**Note:** This skill focuses on TESTING methodology for skills. For skill structure, formatting, and organization, see writing-skills.

Both skills describe the same TDD process (RED-GREEN-REFACTOR). Use this skill when you need detailed guidance on pressure scenarios and meta-testing.
```

**Pros:**
- Minimal change
- Clarifies relationship

**Cons:**
- Duplication remains
- Synchronization risk continues

## Recommended Fix: Option A (Merge)

Merge into single **writing-skills** skill. The content is fundamentally describing one process (skill creation with TDD). Separating it creates artificial boundary.

**New structure:**
1. Overview (skill creation IS TDD for docs)
2. What is a skill (from writing-skills)
3. TDD Process (merged from both)
4. Skill Structure (from writing-skills)
5. Testing Techniques (from testing-skills-with-subagents)
6. Complete Checklist (merged)

Archive **testing-skills-with-subagents** or redirect it to **writing-skills**.

## Verification

After merge:
1. Agent needs to create new skill
2. Reads **writing-skills** (single skill)
3. Learns structure (frontmatter, sections, CSO)
4. Learns testing process (RED-GREEN-REFACTOR, pressure scenarios)
5. Creates skill following complete process
6. No confusion about which skill to use
7. No jumping between two skills
8. Single checklist covers everything

## Resolution

**Status:** CLOSED

**Fix implemented:** Consolidated `testing-skills-with-subagents` into `writing-skills` following Option A (Merge).

**Changes made:**

**1. Enhanced writing-skills skill:**
   - Updated description to include testing triggers: "testing skills with pressure scenarios"
   - Added comprehensive "Testing Skills: Detailed Methodology" section at end (before "The Bottom Line")
   - Merged all content from testing-skills-with-subagents:
     - When to test skills
     - Writing pressure scenarios (bad/good/great examples)
     - Pressure types table
     - Key elements of good scenarios
     - Testing setup
     - VERIFY GREEN: Pressure Testing Process
     - Plugging Each Hole (4-step process)
     - Re-verify After Refactoring
     - Meta-Testing (When GREEN Isn't Working)
     - When Skill is Bulletproof
     - Example: TDD Skill Bulletproofing
     - Reference to complete worked example
   - Updated REFACTOR section reference to point to Testing Skills section (removed sub-skill reference)

**2. Deprecated testing-skills-with-subagents:**
   - Replaced entire skill content with deprecation notice
   - Updated description: "DEPRECATED - Use writing-skills instead"
   - Added migration notice explaining where content went
   - Explained rationale for merge (duplication, token waste, confusion, maintenance)
   - Directed users to writing-skills for all needs
   - Maintained reference to examples directory for historical worked examples

**Result:**
- Single comprehensive skill for both creating AND testing skills
- No content duplication (eliminated ~300 lines of redundant TDD explanation)
- Clear organization with dedicated "Testing Skills" section
- Reduced token usage when loading skills
- Single source of truth for skill creation methodology
- testing-skills-with-subagents remains as redirect/deprecation notice
