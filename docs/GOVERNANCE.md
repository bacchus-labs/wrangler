# Governance Framework User Guide

**Version**: 1.2.0
**Last Updated**: 2025-12-07

This guide explains the wrangler governance framework and how to use it to maintain perfect alignment between AI assistant and human partner on project direction, design principles, and tactical execution.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Three-Tier Governance Hierarchy](#three-tier-governance-hierarchy)
- [Initialization](#initialization)
- [Daily Workflows](#daily-workflows)
- [Skills Reference](#skills-reference)
- [Templates Reference](#templates-reference)
- [Ideas and Proposals](#ideas-and-proposals)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### The "Of One Mind" Goal

Wrangler's governance framework ensures you and Claude Code are **of one mind** about:

- **Design Principles** - What matters in this project
- **Strategic Direction** - Where the project is headed
- **Tactical Execution** - What to work on next
- **Decision Criteria** - How to evaluate new features

### Core Value Propositions

**For AI Assistants**:
- Clear, unambiguous principles to apply
- Systematic framework for feature evaluation
- Documented decisions prevent revisiting rejected ideas

**For Human Partners**:
- Confidence AI understands project vision
- Consistent application of design values
- Automatic scope creep prevention

**For Projects**:
- Coherent architecture emerges naturally
- Faster decisions (apply principles vs. debate)
- Institutional memory via documented governance

---

## Quick Start

### 5-Minute Setup

```bash
# 1. Initialize governance framework
# (Claude Code will prompt with questions)
```

Tell Claude Code: **"Initialize governance framework"**

Claude Code will:
1. Ask about your project's mission and stage
2. Help you define 3-7 core design principles
3. Create constitution, roadmap, and supporting documents
4. Set up issue/spec templates and READMEs

**Result**: Complete governance structure in `.wrangler/` directory.

### First Steps After Setup

1. **Read Your Constitution**: `.wrangler/CONSTITUTION.md`
   - Verify principles match your vision
   - Refine any ambiguities using `defining-constitution` skill

2. **Review Your Roadmap**: `.wrangler/ROADMAP.md`
   - Confirm phases and timelines
   - Adjust priorities if needed

3. **Start Building**:
   - Create specifications for Phase 1 features
   - Use constitutional alignment in every spec
   - Let governance guide decisions

---

## Three-Tier Governance Hierarchy

### Tier 1: Constitution (Supreme Law)

**File**: `.wrangler/CONSTITUTION.md`

**Purpose**: Immutable design principles that govern ALL decisions

**Contains**:
- North Star mission statement
- 3-7 core design principles
- Decision framework (5 evaluation questions)
- Concrete examples (good AND bad)
- Explicit anti-patterns
- Amendment process

**When to Update**: Rarely - only via formal amendment process

**Example Principle**:

```markdown
### Principle 1: Simplicity Over Features

**Principle**: Default to convention over configuration

**In Practice**:
- Public APIs have ≤3 required parameters
- Delete code before adding configuration options
- Choose boring, proven solutions over cutting-edge

**Anti-patterns**:
- ❌ Configuration for every possible option
- ❌ Generic abstractions used in only one place

**Examples**:
- ✅ **Good**: `createUser(email, password)` - simple API
- ❌ **Bad**: `createUser({email, password, options: {...}})` - exposed complexity
```

### Tier 2: Strategic Roadmap

**File**: `.wrangler/ROADMAP.md`

**Purpose**: Multi-phase strategic plan showing project direction

**Contains**:
- Current state (completed features)
- Multiple phases with timelines, goals, features
- Success metrics for each phase
- Technical debt tracking
- Links to constitution (ensures alignment)

**When to Update**:
- Quarterly reviews
- Phase completions
- Major feature additions
- After constitutional amendments

**Example Phase**:

```markdown
## Phase 1: Core Authentication (Q1 2025)

**Goal**: Secure user authentication with social login

**Core Features**:
- Email/password authentication
- OAuth (Google, GitHub)
- JWT token management
- Password reset flow

**Success Metrics**:
- 99.9% auth uptime
- <500ms login latency
- Zero password leaks
```

### Tier 3: Tactical Execution

**File**: `.wrangler/ROADMAP_NEXT_STEPS.md`

**Purpose**: Granular tracking of implementation status with % completion

**Contains**:
- Executive summary (~X% complete)
- ✅ Fully Implemented Features
- ⚠️ Partially Implemented Features (with gaps)
- ❌ Not Implemented Features (with impact levels)
- Prioritized roadmap (🔴🟡🟢 indicators)
- Quick wins checklist (<4 hour items)

**When to Update**:
- After completing features
- When starting features
- Monthly reviews
- After housekeeping runs

**Example Status**:

```markdown
### Current State

- ✅ 12/20 features fully implemented (60%)
- ⚠️ 5/20 features partially implemented (25%)
- ❌ 3/20 features not implemented (15%)
- 📊 Overall: ~73% complete
```

---

## Initialization

### Using initialize-governance Skill

**Command**: "Initialize governance framework"

**Process**:

1. **Discovery Phase**
   - Claude detects project structure
   - Asks about mission, stage, existing principles

2. **Constitution Creation**
   - If you have principles: Helps formalize them
   - If you need help: Guides brainstorming process
   - Ensures principles are concrete and measurable

3. **Roadmap Creation**
   - Asks about phases and goals
   - Creates strategic roadmap
   - Initializes Next Steps tracker

4. **Template Setup**
   - Creates issue/spec templates with governance integration
   - Sets up README files with metrics
   - Establishes directory structure

5. **Verification**
   - Confirms all files created
   - Creates welcome issue
   - Provides next steps

### Manual Setup (Advanced)

If you prefer manual control:

```bash
# 1. Create directory structure
mkdir -p .wrangler/specifications
mkdir -p .wrangler/issues

# 2. Copy templates from wrangler (skill-local pattern)
cp /path/to/wrangler/skills/defining-constitution/templates/_CONSTITUTION.md .wrangler/CONSTITUTION.md
cp /path/to/wrangler/skills/validating-roadmaps/templates/_ROADMAP.md .wrangler/ROADMAP.md
cp /path/to/wrangler/skills/validating-roadmaps/templates/_ROADMAP__NEXT_STEPS.md .wrangler/ROADMAP_NEXT_STEPS.md

# 3. Fill in placeholders
# Edit files to replace [PROJECT_NAME], add principles, etc.
```

**Note**: Templates remain in skill directories and are referenced directly. No need to copy issue/spec templates to a central location.

---

## Daily Workflows

### Workflow 1: Proposing New Feature

**Scenario**: You want to add a new feature

**Steps**:

1. **Check Constitutional Alignment**

   Tell Claude: "Check if [feature] aligns with our constitution"

   Claude will use `checking-constitutional-alignment` skill to:
   - Apply all 5 decision framework questions
   - Check against each principle
   - Verify no anti-pattern violations
   - Provide ✅ APPROVE / ⚠️ REVISE / ❌ REJECT recommendation

2. **If Approved: Create Specification**

   Tell Claude: "Create specification for [feature]"

   Claude will:
   - Use specification template
   - Include Constitutional Alignment section from check
   - Define requirements, user scenarios, acceptance criteria

3. **Create Implementation Plan**

   Tell Claude: "Create implementation plan for spec [ID]"

   Claude will use `writing-plans` skill to:
   - Break spec into tasks
   - Create MCP issues for tracking
   - Link issues to specification

4. **Implement with TDD**

   Follow test-driven development:
   - Write tests first (RED)
   - Implement minimum code (GREEN)
   - Refactor for quality (REFACTOR)

5. **Update Next Steps**

   As features complete, mark in `ROADMAP_NEXT_STEPS.md`:
   - ❌ → ⚠️ when starting
   - ⚠️ → ✅ when complete

### Workflow 2: Refining Constitution

**Scenario**: A principle feels ambiguous or needs clarification

**Steps**:

1. **Invoke Constitution Skill**

   Tell Claude: "Refine Principle [N] in our constitution"

   Claude will:
   - Use Socratic questioning to eliminate ambiguity
   - Ask: "What makes something NOT [principle]?"
   - Extract concrete, measurable criteria
   - Add specific examples and anti-patterns

2. **Update Constitution File**

   Claude will:
   - Update principle with refined language
   - Add concrete examples
   - Document anti-patterns
   - Increment version if significant change

3. **Review Affected Specs**

   Claude will:
   - Search for specs referencing this principle
   - Check if any need updates
   - Propose changes if alignment affected

### Workflow 3: Regular Housekeeping

**Scenario**: Keep governance docs in sync with reality

**Frequency**: Weekly for active projects, after major milestones

**Steps**:

1. **Run Housekeeping**

   Tell Claude: "Run housekeeping"

   Claude will:
   - **Phase 1**: Refresh all governance metrics
     - Update issue counts, spec counts
     - Update Next Steps completion %
     - Check constitutional compliance
   - **Phase 2**: Parallel reconciliation (4 agents)
     - Reconcile open issues with reality
     - Archive completed issues
     - Detect documentation drift
     - Organize root directory files
   - **Phase 3**: Generate summary report

2. **Review Report**

   Claude provides comprehensive report:
   - What was updated
   - Issues closed/updated
   - Documentation gaps identified
   - Recommendations for follow-up

3. **Address Findings**

   Based on report, take action:
   - Update specs missing constitutional alignment
   - Fix documentation drift
   - Address high-priority gaps

### Workflow 4: Verifying Governance Integrity

**Scenario**: Check that governance framework is healthy

**Frequency**: Monthly, or when something feels "off"

**Steps**:

1. **Run Verification**

   Tell Claude: "Verify governance framework"

   Claude will use `verifying-governance` skill to:
   - Check all required files exist
   - Validate constitution structure
   - Validate roadmap structure
   - Validate Next Steps structure
   - Check cross-document consistency
   - Verify link integrity
   - Check metrics staleness

2. **Review Findings**

   Claude provides structured report:
   - ✅ HEALTHY / ⚠️ NEEDS ATTENTION / ❌ CRITICAL ISSUES
   - Specific issues found
   - Priority actions (🔴 🟡 🟢)

3. **Take Recommended Actions**

   Follow priority actions from report:
   - Run `refreshing-metrics` if stale
   - Run `defining-constitution` if ambiguity detected
   - Fix broken links or missing sections

---

## Skills Reference

### initialize-governance

**Purpose**: Set up complete governance framework in new project

**When to Use**: First-time setup, or adding governance to existing project

**Invocation**: "Initialize governance framework"

**What It Does**:
- Creates all governance files
- Guides constitution creation
- Sets up roadmap
- Creates templates

**Output**: Complete `.wrangler/` structure with all governance docs

---

### constitution

**Purpose**: Develop, refine, and maintain constitutional principles

**When to Use**:
- Creating new constitution
- Refining ambiguous principles
- Removing vague language
- Resolving conflicting principles
- Proposing amendments

**Invocation**:
- "Refine our constitution"
- "Make Principle [N] clearer"
- "Amend Principle [N]"

**What It Does**:
- Socratic questioning to eliminate ambiguity
- Transforms vague → concrete
- Adds examples and anti-patterns
- Manages amendment process

**Key Feature**: Clarity refinement workflow that forces specificity

---

### check-constitutional-alignment

**Purpose**: Verify feature requests align with constitutional principles

**When to Use**:
- Before creating specifications
- During feature discussions
- When reviewing PRs
- When unsure if feature fits

**Invocation**: "Check if [feature] aligns with our constitution"

**What It Does**:
- Applies 5 decision framework questions
- Checks alignment with each principle
- Verifies no anti-pattern violations
- Compares to good/bad examples

**Output**:
- ✅ APPROVE - Feature aligns, proceed
- ⚠️ REVISE - Needs modification, suggests changes
- ❌ REJECT - Does not align, explains why

---

### verify-governance

**Purpose**: Check governance framework integrity and completeness

**When to Use**:
- Monthly health checks
- After major changes
- When governance feels "off"
- Before important planning sessions

**Invocation**: "Verify governance framework"

**What It Does**:
- Checks all required files exist
- Validates document structure
- Checks cross-document consistency
- Detects stale metrics
- Verifies link integrity

**Output**: Structured report with priority actions

---

### refresh-metrics

**Purpose**: Auto-update status metrics across governance documents

**When to Use**:
- Metrics >30 days old
- After completing features
- Before reviews/planning
- As part of housekeeping

**Invocation**: "Refresh governance metrics"

**What It Does**:
- Scans MCP issues/specs
- Calculates current counts and percentages
- Updates README files
- Updates Next Steps completion %
- Calculates constitutional compliance

**Output**: Updated metrics + change summary

---

### housekeeping

**Purpose**: Comprehensive project housekeeping with governance integration

**When to Use**:
- Weekly for active projects
- After major milestones
- Before releases
- When project feels "messy"

**Invocation**: "Run housekeeping"

**What It Does**:
- **Phase 1**: Refresh governance metrics + update Next Steps
- **Phase 2**: Parallel reconciliation (4 agents)
  - Reconcile open issues
  - Archive completed issues
  - Detect documentation drift (including governance)
  - Organize root directory
- **Phase 3**: Generate comprehensive report

**Output**: Housekeeping report with all actions taken

---

## Templates Reference

### _CONSTITUTION.md Template

**Location**: `skills/defining-constitution/templates/_CONSTITUTION.md`

**Key Sections**:
- Version tracking
- North Star mission
- 5+ core principles (with In Practice, Anti-patterns, Examples)
- Decision framework (5 questions)
- Examples of compliance (good/bad)
- Amendment process
- Version history

**Usage**: Copy and customize for your project's principles

---

### _ROADMAP.md Template

**Location**: `skills/validating-roadmaps/templates/_ROADMAP.md`

**Key Sections**:
- Overview and current state
- Multiple phases (timeline, goal, features, success metrics)
- Technical debt tracking
- Design principles (links to constitution)
- How to use (for contributors/users/product decisions)
- Changelog

**Usage**: Define strategic direction with phased approach

---

### _ROADMAP__NEXT_STEPS.md Template

**Location**: `skills/validating-roadmaps/templates/_ROADMAP__NEXT_STEPS.md`

**Key Sections**:
- Executive summary (% complete)
- Three categories: ✅ Fully / ⚠️ Partially / ❌ Not Implemented
- Prioritized roadmap (🔴🟡🟢)
- Quick wins checklist

**Usage**: Track granular implementation status

---

### specification.md Template

**Location**: `skills/writing-specifications/templates/SPECIFICATION_TEMPLATE.md`

**Key Sections**:
- **Constitutional Alignment** (mandatory)
- Decision framework verification
- User scenarios and testing
- Requirements (functional + non-functional)
- Design decisions (with rationale)
- Testing strategy
- Acceptance criteria

**Usage**: Every feature spec MUST use this template

---

### issue.md Template

**Location**: `skills/creating-issues/templates/TASK_ISSUE_TEMPLATE.md`

**Key Sections**:
- YAML frontmatter with all fields
- Description with context
- Acceptance criteria
- Technical notes
- Testing strategy
- Labels guide
- References (to specs)

**Usage**: Create issues via MCP tools or manually

---

## Best Practices

### Constitutional Design

**DO**:
- Write concrete, measurable principles
- Include specific examples (good AND bad)
- Document anti-patterns explicitly
- Keep under 150 lines total (context limits)
- Use decision framework for ALL features

**DON'T**:
- Use vague quality words without definition ("clean", "simple")
- Write abstract philosophy
- Create principles you can't verify
- Make >10 principles (too many to remember)
- Leave room for interpretation

**Test**: Can a new AI, given ONLY the constitution, evaluate a feature and reach the same conclusion as you?

### Roadmap Maintenance

**DO**:
- Update Next Steps after every feature completion
- Review roadmap quarterly
- Link all specs to roadmap phases
- Track % completion metrics
- Document why features were rejected

**DON'T**:
- Let Next Steps get >30 days stale
- Add phases without constitutional alignment
- Skip phase success metrics
- Ignore roadmap when planning

### Specification Quality

**DO**:
- Start every spec with Constitutional Alignment section
- Answer all 5 decision framework questions
- Include concrete acceptance criteria
- Link to roadmap phase
- Mark ambiguities with [NEEDS CLARIFICATION]

**DON'T**:
- Skip constitutional alignment
- Write implementation details (leave to planning)
- Create specs for misaligned features
- Assume - make ambiguities explicit

### Issue Management

**DO**:
- Link issues to specifications via `project` field
- Use labels consistently
- Update status actively
- Archive completed issues
- Estimate effort in `wranglerContext`

**DON'T**:
- Create issues without parent spec (for features)
- Leave completed issues in open state
- Create mega-issues (break down)
- Skip acceptance criteria

---

## Ideas and Proposals

### Overview

The `ideas/` directory captures early-stage concepts and proposals before they become formal specifications or issues. Ideas are exploratory, experimental, and may never be implemented - they serve as a "thinking space" for brainstorming without commitment.

### When to Create an Idea

**Create an Idea When**:
- Exploring a major architectural change
- Proposing a new system or capability
- Brainstorming solutions to complex problems
- Researching feasibility of ambitious features
- Documenting "future possibilities" for consideration

**Don't Create an Idea When**:
- Feature is well-defined and ready to implement → Create a Specification
- Work is straightforward and tactical → Create an Issue
- Proposal is small and non-controversial → Just do it

### Idea File Structure

**Location**: `.wrangler/ideas/{descriptive-name}.md`

**Template**:
```markdown
# Idea: {Descriptive Title}

**Status**: Brainstorming | Under Review | Approved | Rejected | Implemented
**Created**: YYYY-MM-DD
**Category**: Architecture | Features | Performance | Quality | Infrastructure

---

## Core Concept

[One-paragraph elevator pitch of the idea]

## Problem Statement

**Current Pain Points**:
1. [What problems does this solve?]
2. [Why do we need this?]

**What if**: [Provocative question exploring possibilities]

## Proposed Solution

[Detailed explanation of the approach]

### Key Components

[Break down the major pieces]

### Example Workflows

[Show how it would work in practice]

## Benefits

[Why this is valuable]

## Challenges & Mitigations

[What could go wrong and how to address it]

## Implementation Phases

[High-level roadmap if we pursue this]

## Open Questions

[Unresolved questions that need answers]

## Success Metrics

[How we'd measure if this is working]

## Related Ideas

[Links to other ideas or proposals]

## Next Steps

[What needs to happen to move this forward]
```

### Idea Lifecycle

```
Brainstorming → Under Review → Decision
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
                Approved                        Rejected
                    ↓                               ↓
            Specification Created            Mark Status: Rejected
                    ↓                         Document Reasons
            Issues Created                    Keep for Reference
                    ↓
            Implementation
                    ↓
            Mark Status: Implemented
            Archive or Keep Active
```

### Idea Status Values

- **Brainstorming**: Initial exploration, gathering thoughts
- **Under Review**: Being evaluated for feasibility and alignment
- **Approved**: Greenlit for specification creation
- **Rejected**: Decided against, documented for reference
- **Implemented**: Completed and shipped
- **Shelved**: Good idea, but not now (revisit later)

### Review Process

**Constitutional Alignment Check**:

Before approving an idea, validate it against the constitution:

1. **Read the Idea**: Understand the core concept and goals
2. **Check Alignment**: Run `/wrangler:checking-constitutional-alignment` with idea summary
3. **Evaluate Result**:
   - ✅ APPROVE → Proceed with approval
   - ⚠️ REVISE → Request modifications to align with principles
   - ❌ REJECT → Reject idea as misaligned with project values
4. **Document Decision**: Update idea status and add rationale

**Example**:
```markdown
## Constitutional Alignment Review

**Date**: 2025-11-18
**Reviewer**: Human Partner + Claude Code

**Decision Framework**:
1. Does this align with project mission? ✅ YES
2. Does it simplify or add complexity? ⚠️ ADDS (but justified)
3. Does it support core principles? ✅ YES
4. Are there anti-pattern violations? ✅ NONE
5. Is scope appropriate? ✅ YES

**Principles Alignment**:
- ✅ Test-Driven Development: Proposal includes TDD workflow
- ✅ Systematic over Ad-Hoc: Replaces ad-hoc debugging with systematic approach
- ⚠️ Complexity Reduction: Adds complexity but enables simplification elsewhere

**Result**: ✅ APPROVED with modifications
- Reduce scope to MCP-only (not all plugin code)
- Require TDD for all auto-fixes
- Add rollback procedures

**Next Step**: Create Specification #000XXX
```

### Graduating Ideas to Specifications

**When to Graduate**:
- Constitutional alignment verified
- Feasibility validated
- Scope well-defined
- Benefits outweigh costs
- Stakeholder agreement

**Graduation Process**:
1. Update idea status to "Approved"
2. Create formal specification in `.wrangler/specifications/`
3. Link spec back to original idea
4. Break specification into issues
5. Begin implementation

**Template Link**:
```markdown
## Related Artifacts

**Original Idea**: `.wrangler/ideas/self-healing-mcp-plugin.md`
**Specification**: `.wrangler/specifications/000042-self-healing-mcp.md` (Created 2025-12-01)
**Implementation Issues**: #000123, #000124, #000125
```

### Example Ideas

**Current Ideas** (as of 2025-12-07):

1. **`.wrangler/ideas/self-healing-mcp-plugin.md`**
   - **Concept**: Bundle MCP source code in plugin, enable AI-driven bug fixing with PR submission
   - **Status**: Brainstorming
   - **Key Innovation**: Plugin can fix itself and contribute improvements back upstream

2. **`.wrangler/ideas/adaptive-workflow-modes.md`**
   - **Concept**: Use `.wrangler/settings.json` to configure workflow modes (DOUBLE_CHECK, FAST, BALANCED, EXPLORATION) with automatic quality gates
   - **Status**: Brainstorming
   - **Key Innovation**: Trade latency for quality via configuration, intelligent parallelization

3. **`.wrangler/ideas/verification-workflow-layer.md`**
   - **Concept**: Wrap every user request in transparent verification layer with parallel subagents (test runner, constitutional compliance, requirements fulfillment, code review)
   - **Status**: Brainstorming
   - **Key Innovation**: Quality firewall prevents premature completion claims, ensures "demanding user with high standards" would be satisfied

### Best Practices

**Do**:
- Explore ambitious ideas freely
- Include concrete examples and workflows
- Document challenges honestly
- Consider constitutional alignment early
- Link related ideas together

**Don't**:
- Commit to implementation in idea stage
- Skip problem statement (always answer "why")
- Ignore feasibility concerns
- Create ideas for trivial features
- Delete rejected ideas (archive for reference)

### Archiving Ideas

**When to Archive**:
- Idea fully implemented → Status: Implemented
- Context changed, no longer relevant
- Superseded by better approach

**How to Archive**:
1. Update status field
2. Add "Archived" note with reason
3. Move to `.wrangler/ideas/archive/` subdirectory (optional)
4. Preserve for historical reference

**Example**:
```markdown
# Idea: Old Approach to Problem X

**Status**: Implemented (See Spec #000012)
**Archived**: 2025-12-01
**Archive Reason**: Fully implemented in v1.3.0

[Original content preserved]

---

## Implementation Summary

This idea was approved and implemented as Specification #000012.
See `.wrangler/specifications/000012-problem-x-solution.md` for details.
Released in wrangler v1.3.0 (2025-12-01).
```

### Metrics

Track idea pipeline health:
- **Ideas Created**: Volume of new proposals
- **Approval Rate**: % of ideas that become specs
- **Time to Decision**: Days from creation to approval/rejection
- **Implementation Rate**: % of approved ideas that ship

---

## Troubleshooting

### Problem: Constitution Feels Vague

**Symptoms**: Different people interpret principles differently

**Solution**:
1. Run `defining-constitution` skill on vague principle
2. Answer Socratic questions to force specificity
3. Add concrete examples
4. Test with scenarios - do you and AI agree?

**Prevention**: Always include concrete examples and anti-patterns

---

### Problem: Metrics Are Stale

**Symptoms**: README shows "Last Updated: [>30 days ago]"

**Solution**:
1. Run `refreshing-metrics` skill
2. Review updated counts
3. Update Next Steps manually if needed

**Prevention**: Run housekeeping weekly, or add to CI/CD

---

### Problem: Specification Missing Constitutional Alignment

**Symptoms**: `verifying-governance` reports compliance <100%

**Solution**:
1. For each spec, run `checking-constitutional-alignment`
2. Add Constitutional Alignment section with results
3. Update spec with alignment details

**Prevention**: Use specification template for ALL new specs

---

### Problem: Roadmap and Next Steps Out of Sync

**Symptoms**: Roadmap shows Phase 2, but Next Steps shows Phase 1 incomplete

**Solution**:
1. Determine which is correct (ask user)
2. Update incorrect document
3. Add changelog entry explaining change

**Prevention**: Update both when phases shift

---

### Problem: Feature Rejected by Constitutional Check

**Symptoms**: `checking-constitutional-alignment` returns ❌ REJECT

**Solution**:
1. Read rejection reasoning carefully
2. Consider if feature is really needed
3. Options:
   - **Accept rejection** - Feature doesn't fit
   - **Revise feature** - Modify to align
   - **Amend constitution** - If feature justifies changing principles

**Remember**: Constitution exists to prevent scope creep - rejections are working as designed

---

### Problem: Too Many Governance Files to Maintain

**Symptoms**: Feels overwhelming to keep everything updated

**Solution**:
1. Use automation:
   - `refreshing-metrics` for metrics
   - `housekeeping` for regular maintenance
   - `verifying-governance` for health checks
2. Focus on:
   - Constitution (rarely changes)
   - Next Steps (frequently updates)
   - READMEs (auto-updated by refresh-metrics)

**Prevention**: Don't try to update everything manually - use skills

---

## Summary

Wrangler's governance framework creates perfect alignment through:

1. **Constitution** - Concrete, measurable principles
2. **Roadmap** - Strategic phased direction
3. **Next Steps** - Tactical execution tracking
4. **Skills** - Automated workflows for maintenance
5. **Templates** - Consistent structure across all docs

**Goal**: You and Claude Code "of one mind" on project direction.

**How**: Clear principles → Systematic evaluation → Documented decisions

**Result**: Coherent architecture, faster decisions, prevented scope creep.

---

**Ready to Start?**

Tell Claude Code: **"Initialize governance framework"**

---

**Questions or Issues?**

- Check `verifying-governance` for health status
- Review this guide's troubleshooting section
- Refine principles with `defining-constitution` skill
- Run `housekeeping` for comprehensive cleanup

**For More Details**:
- Read your project's `.wrangler/CONSTITUTION.md`
- Review governance-related skills: `defining-constitution`, `checking-constitutional-alignment`, `initializing-governance`, `verifying-governance`
- Check templates in skill-specific directories (e.g., `skills/defining-constitution/templates/`)

---

**Last Updated**: 2025-12-07
**Version**: 1.2.0
**License**: MIT
