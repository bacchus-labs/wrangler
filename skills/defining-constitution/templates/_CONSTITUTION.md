---
wranglerVersion: "1.1.0"
lastUpdated: "YYYY-MM-DD"
---

# [PROJECT_NAME] Constitution

**Version**: 1.0.0
**Ratified**: [YYYY-MM-DD]
**Last Amended**: [YYYY-MM-DD]

---

<!--
WRANGLER VERSION TRACKING

The frontmatter above tracks which version of wrangler this project uses:
- wranglerVersion: Latest wrangler version this project has been updated to
- lastUpdated: Date when constitution or wrangler version was last updated

This enables automatic version detection and migration guidance via:
- Startup skill: Detects version gaps on session start
- /update-yourself command: Provides migration instructions

DO NOT remove this frontmatter. Update wranglerVersion when migrating to new wrangler releases.
-->

---

## Our North Star

[One-sentence mission statement describing the project's core purpose and value]

**Example**: "Build a lightweight, maintainable task management system that prioritizes user privacy and offline-first operation."

---

## Core Design Principles

### 1. [First Principle Name]

**Principle**: [One-sentence statement of the principle]

**In Practice**:
- [Specific application 1]
- [Specific application 2]
- [Specific application 3]

**Anti-patterns** (What NOT to do):
- ❌ [Anti-pattern 1 with explanation]
- ❌ [Anti-pattern 2 with explanation]

**Examples**:
- ✅ **Good**: [Concrete example showing principle in action]
- ❌ **Bad**: [Concrete example violating principle]

---

### 2. [Second Principle Name]

**Principle**: [One-sentence statement]

**In Practice**:
- [Application 1]
- [Application 2]

**Anti-patterns**:
- ❌ [Anti-pattern]

**Examples**:
- ✅ **Good**: [Example]
- ❌ **Bad**: [Example]

---

### 3. [Third Principle Name]

**Principle**: [One-sentence statement]

**In Practice**:
- [Application 1]
- [Application 2]

**Anti-patterns**:
- ❌ [Anti-pattern]

**Examples**:
- ✅ **Good**: [Example]
- ❌ **Bad**: [Example]

---

### 4. [Fourth Principle Name]

**Principle**: [One-sentence statement]

**In Practice**:
- [Application 1]
- [Application 2]

**Anti-patterns**:
- ❌ [Anti-pattern]

**Examples**:
- ✅ **Good**: [Example]
- ❌ **Bad**: [Example]

---

### 5. [Fifth Principle Name]

**Principle**: [One-sentence statement]

**In Practice**:
- [Application 1]
- [Application 2]

**Anti-patterns**:
- ❌ [Anti-pattern]

**Examples**:
- ✅ **Good**: [Example]
- ❌ **Bad**: [Example]

---

## Decision Framework

When evaluating new features or design decisions, ask:

1. **Constitutional Alignment**: Does this align with our core principles above?
2. **User Value**: Does this solve a real user problem?
3. **Simplicity**: Is this the simplest solution that works?
4. **Maintainability**: Can we maintain this long-term?
5. **Scope**: Does this fit our mission, or is it scope creep?

**If the answer to any question is "no" or "unclear," reconsider the decision.**

---

## Examples of Constitutional Compliance

### ✅ Good: Feature X

**Decision**: [Description of feature or decision]

**Alignment**:
- **Principle 1**: [How it aligns]
- **Principle 2**: [How it aligns]

**Outcome**: [Why this was approved]

---

### ❌ Bad: Feature Y

**Proposed**: [Description of feature or decision]

**Conflicts**:
- **Principle 3**: [How it violates]
- **Principle 4**: [How it violates]

**Decision**: [Rejected/Modified because...]

---

## Evolution of Principles

### Amendment Process

1. **Proposal**: Create issue with label `constitutional-amendment`
2. **Justification**: Explain why amendment is needed
3. **Impact Analysis**: List all affected code/specs
4. **Approval**: [Define approval process - e.g., team consensus, owner decision]
5. **Implementation**: Update this document, increment version
6. **Communication**: Update ROADMAP.md changelog, notify stakeholders
7. **Migration**: Update code/docs to reflect new principle

### Version History

- **1.0.0** ([YYYY-MM-DD]): Initial constitution ratified

---

## References

**Inspired by**:
- [External source 1]
- [External source 2]

**Related Documents**:
- `_ROADMAP.md` - Strategic roadmap (must align with constitution)
- `CLAUDE.md` - Development guide (references this constitution)
- `issues/` - All issues must reference constitutional alignment

---

## Governance Rules

1. **Constitution is Supreme Law**: This document overrides all other practices and decisions
2. **All Features Must Align**: Every PR, issue, and spec must demonstrate constitutional alignment
3. **No Exceptions**: Principles are non-negotiable unless formally amended
4. **Mandatory Reading**: All contributors must read this before any work
5. **Regular Review**: Revisit quarterly to ensure principles still serve the mission
6. **Justified Complexity**: Any complexity must be explicitly justified against these principles

---

**💡 Tip for AI Assistants**: Before proposing any feature or change, verify alignment with ALL principles above. Use the Decision Framework questions. If uncertain, ask the user.
