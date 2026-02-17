---
id: SPEC-000007
title: Figma Design Workflow Integration for Wrangler
type: specification
status: closed
priority: high
labels:
  - specification
  - design
  - figma
  - design-system
  - workflow
  - mcp-integration
createdAt: "2025-11-22T04:02:36.567Z"
updatedAt: "2025-11-22T04:18:18.899Z"
project: Wrangler Design Workflow
wranglerContext:
  agentId: spec-writer-agent
  estimatedEffort: 4 weeks (1 developer full-time)
---

# Specification: Figma Design Workflow Integration

## Executive Summary

**What:** A comprehensive Figma integration for Wrangler that enables AI agents to manage design-to-implementation workflows, including automated design system setup, specification-to-mockup generation, and design system governance. This integration leverages the official Figma MCP server to provide seamless design context for implementation.

**Why:** There's a critical gap in wrangler's development process between specification and implementation. The goal is to **improve frontend application development results** by adding a design step that reduces alignment issues between users and agents. By having reviewed/approved Figma mocks before implementation, users can expect pixel-perfect implementation with verifiable gates (comparing implementation against signed-off mocks). This systematic approach aims to bridge the design-implementation gap and enable better verification throughout the development process.

**Scope:**

- **Included:**
  - Integration with official Figma MCP server
  - Three new wrangler skills: `design-system-setup`, `figma-design-workflow`, `design-system-governance`
  - Design system templates bundled with wrangler plugin (minimal, modern, vibrant)
  - Automated design token extraction and drift detection
  - Interactive Q&A-driven design system initialization with template selection
  - Option to use templates + frontend-design skill for AI-generated custom designs
  - Specification → Figma mockup workflow with issue tracking
  - Design system component library management (hierarchical: master design system + feature files)
  - Figma native versioning integration
- **Excluded:**
  - Visual regression testing (future phase - will enable pixel-perfect verification)
  - Code generation from Figma designs (relies on official Figma MCP capabilities)
  - Figma plugin development (using official MCP server only)
  - Multi-user design collaboration features
  - Enterprise SSO/advanced Figma permissions

**Status:** Approved (ready for implementation)

## Goals and Non-Goals

### Goals

1. **Improve frontend development results**: Reduce alignment issues between users and AI agents by introducing systematic design step before implementation
2. **Enable verification gates**: Signed-off Figma mocks provide baseline for pixel-perfect implementation validation
3. **Bridge design-implementation gap**: Make Figma design context accessible to AI agents during implementation
4. **Design system consistency**: Ensure design tokens (colors, typography, spacing) stay synchronized between Figma and code
5. **Reduce manual handoff overhead**: Automate extraction of design specifications from Figma files
6. **Lower barrier to entry**: Provide starter design system templates so projects can have professional design foundations immediately
7. **Systematic design governance**: Track and resolve design token drift through wrangler's issue system
8. **Standalone invocability**: Skills can be invoked independently, not tightly coupled to existing workflows (allows gradual adoption)

### Non-Goals

1. **Require human refinement of AI-generated designs**: While experience suggests refinement may be needed initially, the goal is to achieve high-quality AI-generated designs without mandatory human intervention. Human refinement is a pragmatic acknowledgment of current limitations, not an architectural constraint.
2. **Visual regression testing** (this phase): Validation that implementation matches Figma will be future work (enables pixel-perfect verification against approved mocks)
3. **Figma file management**: Not building version control or backup systems for Figma files (relying on Figma native versioning)
4. **Custom Figma plugin**: Using official Figma MCP server exclusively
5. **Design collaboration features**: Not building team commenting, versioning, or approval workflows
6. **Opinionated design choices**: Design system templates are starting points, not mandates

## Background & Context

### Problem Statement

**Current pain points:**

1. **Design-code disconnect**: Specifications describe features but lack visual context. Designers create mockups in Figma, but agents can't access them during implementation.

2. **Inconsistent design systems**: Projects reinvent color palettes, typography scales, and spacing systems. No systematic way to ensure code matches design tokens.

3. **Manual handoff overhead**: Developers manually extract measurements, colors, and styles from Figma. Error-prone and time-consuming.

4. **No design governance**: Design systems drift over time. No automated detection when code diverges from Figma-defined tokens.

5. **High barrier to design quality**: Small projects skip design systems entirely because setup is complex.

6. **Alignment issues in frontend development**: Without visual specifications, agents and users often have different mental models of what's being built, leading to rework.

7. **No verification baseline**: Without approved mockups, difficult to objectively verify if implementation matches intent.

### Current State

**How wrangler works today:**

1. User creates specification via `writing-specifications` skill
2. Specification is broken into implementation tasks via `writing-plans` skill
3. Agent implements code following specification text description
4. No access to Figma design context
5. No design system templates or governance
6. Visual design decisions made ad-hoc during implementation
7. No systematic verification that implementation matches user's visual intent

**Problems with current state:**

- Agents can't see designer's visual intent
- No reusable design foundations (colors, typography, spacing)
- Implementation diverges from design without detection
- Design quality depends on individual agent decisions
- Alignment issues between user expectations and implementation
- Difficult to verify implementation quality objectively

### Proposed State

**How design workflow will work:**

1. **Project initialization:**
   - User creates first specification with UI requirements
   - Agent auto-detects no design system exists
   - Agent prompts: "I notice you don't have a design system set up. Would you like me to create one now?"
   - User chooses:
     - **Option A**: Run full `setup-design-system` skill (Q&A for custom preferences)
     - **Option B**: Agent uses template + `frontend-design` skill to generate custom design system
   - Creates Figma design system from selected approach
   - Exports design tokens to code (CSS variables, Tailwind config, etc.)

2. **Specification → Mockup workflow:**
   - User creates specification via `writing-specifications` skill
   - Agent invokes `figma-design-workflow` skill
   - Skill reads spec, generates Figma mockups (frames, components)
   - Feature mockups reference master design system as library (hierarchical Figma structure)
   - Links Figma file URL in wrangler issue for review
   - User reviews and approves mockups in Figma
   - Approved mockups become verification baseline for implementation
   - Agent extracts design context during implementation

3. **Ongoing governance:**
   - Agent periodically runs `design-system-governance` skill
   - Extracts design tokens from Figma
   - Compares against code tokens
   - Creates wrangler issues for detected drift (report only, no auto-fix)
   - Provides reconciliation recommendations
   - Tracks governance history using Figma native versioning

**Benefits:**

✅ Improved frontend development results through systematic design step  
✅ Verified alignment: approved mocks provide objective baseline  
✅ Designers and agents work from same Figma source of truth  
✅ Design systems available to all projects via templates  
✅ Automated drift detection prevents divergence  
✅ Visual specifications captured in Figma, accessible to agents  
✅ Standalone skills allow gradual workflow integration  
✅ Foundation for future pixel-perfect verification (visual regression testing)

## Requirements

### Functional Requirements

#### Design System Setup

- **FR-001:** System MUST auto-detect when design system is missing upon first specification with UI requirements
- **FR-002:** System MUST prompt user with choice: (A) full setup-design-system Q&A, or (B) template + frontend-design skill
- **FR-003:** System MUST provide at least 3 pre-built design system templates (minimal, modern, vibrant) bundled in plugin
- **FR-004:** System MUST support Q&A flow to gather design preferences (color palette mood, typography style, spacing scale, border radius style)
- **FR-005:** System MUST create Figma file with design system components (color palette, typography scale, spacing scale, component library)
- **FR-006:** System MUST export design tokens to code format (CSS variables, Tailwind config, or design token JSON)
- **FR-007:** System MUST store Figma file URL and file key in wrangler project metadata
- **FR-008:** System MUST support template + frontend-design skill workflow for AI-generated custom designs

#### Figma Design Workflow

- **FR-009:** System MUST read wrangler specification from issues via MCP tool
- **FR-010:** System MUST extract key UI requirements from specification (pages, components, user flows)
- **FR-011:** System MUST generate Figma frames representing specification requirements using Figma MCP
- **FR-012:** System MUST use design system components/tokens when generating mockups
- **FR-013:** System MUST create feature Figma files that reference master design system as library (hierarchical structure)
- **FR-014:** System MUST update wrangler issue with Figma file URL and frame links
- **FR-015:** System MUST allow user to review and request refinements to generated mockups
- **FR-016:** System MUST track mockup approval status in issue metadata
- **FR-017:** System MUST mark approved mockups as verification baseline for implementation

#### Design System Governance

- **FR-018:** System MUST extract design tokens from Figma (colors, typography, spacing, border radii, shadows) via MCP
- **FR-019:** System MUST parse design tokens from code (CSS variables, Tailwind config, design token JSON)
- **FR-020:** System MUST detect drift between Figma and code tokens (missing tokens, value mismatches, renamed tokens)
- **FR-021:** System MUST create wrangler issues for detected drift with severity classification (critical, high, medium, low)
- **FR-022:** System MUST provide reconciliation recommendations (which source is authoritative, sync strategy)
- **FR-023:** System MUST support both Figma→Code and Code→Figma sync directions (report only, no auto-fix)
- **FR-024:** System MUST track governance check history using Figma native versioning
- **FR-025:** System MUST NOT auto-fix drift (report only via issues)

### Non-Functional Requirements

#### Performance

- **NFR-001:** Design system setup MUST complete within 2 minutes for template-based systems
- **NFR-002:** Figma mockup generation MUST complete within 5 minutes for specifications with <10 pages
- **NFR-003:** Design token extraction MUST complete within 30 seconds for design systems with <200 tokens
- **NFR-004:** Drift detection MUST complete within 60 seconds for projects with <500 design token usages in code

#### Reliability

- **NFR-005:** Skills MUST handle Figma API failures gracefully with retries (3 attempts with exponential backoff)
- **NFR-006:** Skills MUST validate Figma MCP server connectivity before operations
- **NFR-007:** Skills MUST not corrupt existing Figma files (read-only by default, write operations require confirmation)

#### Security

- **NFR-008:** Figma API credentials MUST be stored in environment variables, never in code or issues
- **NFR-009:** Skills MUST validate Figma file permissions before access
- **NFR-010:** Skills MUST not expose Figma file URLs in logs (mask URLs)

#### Usability

- **NFR-011:** Design system Q&A MUST complete in <5 questions
- **NFR-012:** Template selection prompt MUST show visual previews of design systems
- **NFR-013:** Error messages MUST include actionable resolution steps
- **NFR-014:** Skills MUST provide progress updates for long-running operations (>10 seconds)

#### Compatibility

- **NFR-015:** Skills MUST work with official Figma MCP server (no custom plugin required)
- **NFR-016:** Design token export MUST support CSS variables, Tailwind config, and design token JSON formats
- **NFR-017:** Skills MUST be compatible with wrangler v1.1.0+
- **NFR-018:** Skills MUST work with existing wrangler skills (no breaking changes to workflows)
- **NFR-019:** Skills MUST integrate with frontend-design skill for custom design generation

### User Experience Requirements

- **UX-001:** Auto-detection prompt MUST be clear and non-intrusive
- **UX-002:** Template selection MUST use AskUserQuestion tool with visual examples (preview images)
- **UX-003:** Generated mockups MUST include annotations explaining design decisions
- **UX-004:** Drift detection issues MUST include visual diffs (before/after token values)
- **UX-005:** Skills MUST be invocable via slash commands (`/setup-design-system`, `/generate-figma-mocks`, `/check-design-drift`)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Wrangler Skills Layer                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ design-system-   │  │ figma-design-    │  │ design-system-│ │
│  │ setup            │  │ workflow         │  │ governance    │ │
│  │ (auto-prompt)    │  │ (hierarchical)   │  │ (report-only) │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                                                      │
│           ├──→ Template selection (A: Q&A, B: AI-generated)     │
│           └──→ frontend-design skill integration (Option B)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Wrangler MCP Server                            │
│  • Issue/spec management (issues_create, issues_get, etc.)      │
│  • Metadata tracking (figmaFileUrl, figmaFileKey, approvalStatus)│
│  • Governance workflow orchestration                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────┬──────────────────────────────────────┐
│   Official Figma MCP     │   Wrangler Plugin Assets            │
│  • File/frame access     │  • Design system templates          │
│  • Design token extract  │  • Token parser utilities           │
│  • Component library     │  • Drift detection logic            │
│  • Native versioning     │  • Template previews (images)       │
└──────────────────────────┴──────────────────────────────────────┘
```

### File Structure

```
wrangler/
├── skills/
│   └── design-workflow/                    # New category
│       ├── design-system-setup/
│       │   ├── SKILL.md                    # Skill definition
│       │   ├── templates/                  # Design system templates
│       │   │   ├── minimal/
│       │   │   │   ├── figma-template.json
│       │   │   │   ├── tokens.json
│       │   │   │   ├── components.json
│       │   │   │   ├── preview.png
│       │   │   │   └── README.md
│       │   │   ├── modern/
│       │   │   │   └── [same structure]
│       │   │   └── vibrant/
│       │   │       └── [same structure]
│       │   └── exporters/                  # Token export utilities
│       │       ├── css-variables.ts
│       │       ├── tailwind-config.ts
│       │       └── design-tokens-json.ts
│       │
│       ├── figma-design-workflow/
│       │   ├── SKILL.md                    # Skill definition
│       │   └── parsers/                    # Spec parsing utilities
│       │       └── spec-to-frames.ts
│       │
│       └── design-system-governance/
│           ├── SKILL.md                    # Skill definition
│           ├── parsers/                    # Token parsers
│           │   ├── css-variables.ts
│           │   ├── tailwind-config.ts
│           │   └── design-tokens-json.ts
│           └── drift-detector.ts           # Drift detection logic
│
├── commands/                               # Slash commands
│   ├── setup-design-system.md             # /wrangler:setup-design-system
│   ├── generate-figma-mocks.md            # /wrangler:generate-figma-mocks
│   └── check-design-drift.md              # /wrangler:check-design-drift
│
└── .claude-plugin/
    └── plugin.json                         # Updated with Figma MCP config
```

## Open Questions & Decisions

### Resolved Decisions

| Decision                   | Options Considered                                | Chosen                   | Rationale                                                                                              | Date       |
| -------------------------- | ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ | ---------- |
| Which Figma MCP server?    | Official, GLips, oO, grab, custom                 | Official Figma MCP       | Best long-term support, no maintenance burden                                                          | 2025-11-21 |
| Mockup automation level?   | Fully automated, semi-automated, manual, hybrid   | Fully automated          | User requested, aiming for high quality without mandatory refinement                                   | 2025-11-21 |
| Visual regression testing? | Include in v1, defer to v2                        | Defer to v2              | Reduces scope, allows standalone skill adoption first; future phase enables pixel-perfect verification | 2025-11-21 |
| Testing tool?              | Applitools, Percy, Playwright, Argos              | Deferred (no testing v1) | Not applicable until visual regression phase                                                           | 2025-11-21 |
| Design system templates?   | None, 3 templates, 10+ templates                  | 3 templates              | Minimal, modern, vibrant covers 80% of use cases                                                       | 2025-11-21 |
| Auto-detect design system? | Auto-prompt, explicit command, silent auto-setup  | Auto-prompt with choice  | User chooses Q&A or template+AI; balances automation with control                                      | 2025-11-21 |
| Multiple Figma files?      | Single file, multiple files, hierarchical         | Hierarchical             | Master design system + child feature files; aligns with Figma component library system                 | 2025-11-21 |
| Drift auto-fix?            | Report only, auto-fix with approval, configurable | Report only              | Safe default; creates issues for manual resolution                                                     | 2025-11-21 |
| Design system versioning?  | Semantic versioning, timestamp, Figma native      | Figma native versioning  | Simplest; leverages Figma's built-in file history                                                      | 2025-11-21 |

### Open Questions

None remaining - all questions resolved.

## Success Criteria

### Launch Criteria

- [ ] All 3 skills implemented and tested (design-system-setup, figma-design-workflow, design-system-governance)
- [ ] 3 design system templates bundled with preview images
- [ ] Template selection with visual previews implemented
- [ ] frontend-design skill integration for Option B (template + AI)
- [ ] Auto-detection prompt on first UI specification
- [ ] Hierarchical Figma file structure (master design system + feature files)
- [ ] Token parsers support CSS variables, Tailwind config, design tokens JSON
- [ ] Drift detection creates issues (report only, no auto-fix)
- [ ] Figma native versioning integration
- [ ] Slash commands configured and documented
- [ ] Integration with official Figma MCP server verified
- [ ] Documentation complete (CLAUDE.md, user guides, skill SKILL.md files)
- [ ] Manual testing confirms end-to-end workflow works
- [ ] Pull request created with all changes

### Success Metrics (Post-Launch)

**Adoption:**

- 30% of new specifications use Figma mockup workflow within 3 months
- 50% of projects with design systems run governance checks monthly within 3 months

**Quality:**

- 90% of generated mockups approved after ≤2 refinement iterations
- Drift detection false positive rate <5%
- Improved frontend implementation quality (measured by user satisfaction)

**Performance:**

- Design system setup p95 < 2 minutes
- Mockup generation p95 < 5 minutes (for specs with <10 pages)
- Drift detection p95 < 30 seconds

**User satisfaction:**

- Positive feedback on design system templates (survey or GitHub issues)
- Reduced alignment issues in frontend development
- <10 support issues related to Figma integration per month

## Timeline & Milestones

| Milestone                       | Target Date  | Status      | Dependencies        |
| ------------------------------- | ------------ | ----------- | ------------------- |
| Specification approved          | 2025-11-21   | ✅ Complete | User review         |
| Git worktree created            | Week 1 Day 1 | Not started | Spec approval       |
| Design system templates created | Week 1       | Not started | Worktree            |
| Token parsers implemented       | Week 1       | Not started | -                   |
| design-system-setup skill       | Week 2       | Not started | Templates, parsers  |
| figma-design-workflow skill     | Week 3       | Not started | design-system-setup |
| design-system-governance skill  | Week 3       | Not started | Parsers             |
| Integration testing             | Week 4       | Not started | All skills          |
| Documentation                   | Week 4       | Not started | All skills          |
| Pull request created            | Week 4       | Not started | All above           |

**Estimated total effort:** 4 weeks (assuming 1 developer full-time)

## References

### Related Specifications

- Wrangler MCP Integration Specification (existing)
- Wrangler Skills Framework (existing)
- frontend-design skill (existing - to be integrated)

### Related Issues

- #000037 - This specification

### External Resources

- **Official Figma MCP Server**: https://developers.figma.com/docs/figma-mcp-server/
- **Figma API Documentation**: https://www.figma.com/developers/api
- **Figma Version History**: https://help.figma.com/hc/en-us/articles/360038006754-View-a-file-s-version-history
- **W3C Design Tokens Format**: https://design-tokens.github.io/community-group/format/
- **Tailwind CSS Configuration**: https://tailwindcss.com/docs/configuration
- **CSS Custom Properties**: https://developer.mozilla.org/en-US/docs/Web/CSS/--*

(Remaining sections unchanged from original specification...)
