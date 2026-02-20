---
id: SPEC-000052
title: 'Skill: wrangler:removing-meta-noise'
type: specification
status: open
priority: medium
labels:
  - specification
  - skill
  - documentation-quality
createdAt: '2026-02-20T17:46:38.271Z'
updatedAt: '2026-02-20T17:46:38.271Z'
project: wrangler-skills
---
# Specification: `wrangler:removing-meta-noise` Skill

## Executive Summary

**What:** A new wrangler skill that strips assistant meta-noise and decision-log chatter from wrangler assets (specs, issues, ideas, memos), producing clean, implementation-ready documents.

**Why:** When iterating on specs and plans through conversational back-and-forth with an AI assistant, documents accumulate reasoning artifacts: resolved open questions still displayed as questions, "Recommendation: ..." blocks, enumerated option comparisons, hedging language, and conversational commentary. This noise obscures the actual decisions and requirements, making documents harder to implement from and harder to review.

**Scope:**
- Included: Cleaning any wrangler-managed Markdown asset (specifications, issues, ideas, memos, plans)
- Included: Preserving all substantive decisions, requirements, and technical content
- Included: Rewriting hedged/tentative language into confident assertions
- Excluded: Changing the meaning or substance of any decision
- Excluded: Adding new content, requirements, or interpretations
- Excluded: Reformatting or restructuring beyond noise removal

**Invocation:** Slash command only (`disable-model-invocation: true`). Takes a single required argument: path or ID of the target wrangler asset.

## Goals and Non-Goals

### Goals

- Remove assistant reasoning artifacts from wrangler documents
- Collapse resolved questions into confident statements of the chosen option
- Strip option enumerations where a decision has been made
- Convert hedged/tentative language into direct assertions
- Preserve every substantive decision, requirement, and technical detail
- Produce documents that read as if written by a confident human author

### Non-Goals

- Restructuring documents into a different template or format
- Adding missing content or filling gaps
- Validating technical correctness of decisions
- Changing the semantic meaning of any content
- Acting as a general-purpose editor or rewriter

## Background & Context

### The Problem

During iterative spec development, conversations between a human and an AI assistant produce documents containing two interleaved layers:

1. **Signal** — the actual decisions, requirements, architecture, and constraints
2. **Noise** — the reasoning process that led to those decisions

The noise layer includes patterns like:
- "Open Question Q6: Should we use Option A or Option B? **Resolved: Option A**"
- "Recommendation: We suggest using PostgreSQL because..."
- "Option 1: Redis — Pros: fast, simple. Cons: no persistence. Option 2: PostgreSQL — Pros: ACID, mature. Cons: slower."
- "After considering the tradeoffs, we decided to..."
- "This is probably the best approach because..."
- "We might want to consider..."

After decisions are made, these artifacts serve no purpose in an implementation-ready document. They clutter the spec and force implementers to mentally parse what was decided versus what was merely discussed.

### Desired State

A document where:
- Resolved questions appear as confident statements (e.g., "The system uses PostgreSQL for session storage.")
- No option enumerations remain for decided items
- No "Recommendation:" prefixes — just the chosen approach stated as fact
- No hedging ("probably", "might want to", "we think", "it seems like")
- No process commentary ("after discussing", "we considered", "mark Q6 resolved")
- Open questions that are genuinely unresolved remain clearly marked

## Requirements

### Functional Requirements

**FR-001: Argument parsing.** The skill MUST accept a single required argument: either a file path (relative or absolute) to a wrangler asset, or a wrangler asset ID (e.g., `SPEC-000042`, `ISS-000015`). If the argument is an ID, resolve it to the corresponding file in `.wrangler/`.

**FR-002: Asset type detection.** The skill MUST detect the asset type (specification, issue, idea, memo, plan) from the file's location or YAML frontmatter `type` field. The cleaning behavior is the same regardless of type.

**FR-003: Noise identification.** The skill MUST identify and remove these categories of meta-noise:

| Category | Examples | Action |
|---|---|---|
| **Resolved questions** | "Q6: resolved as Option A", "Decision: use PostgreSQL" | Collapse into confident assertion |
| **Option enumerations** | "Option 1: ... Option 2: ... Option 3: ..." where one is chosen | Remove enumeration, state chosen option as fact |
| **Recommendation prefixes** | "Recommendation:", "Suggested approach:", "We recommend" | Remove prefix, state content directly |
| **Process commentary** | "After discussing...", "We considered...", "Having evaluated..." | Remove entirely or rewrite as direct statement |
| **Hedging language** | "probably", "might", "we think", "it seems", "arguably" | Replace with confident assertion |
| **Assistant self-reference** | "I suggest", "I recommend", "I think we should" | Rewrite in impersonal/imperative voice |
| **Conversational artifacts** | "As mentioned above", "Going back to your point", "To answer your question" | Remove entirely |
| **Redundant decision logs** | "Decision log:", "Change history:", inline rationale trails | Remove decision-log sections; preserve the decisions themselves |
| **Empty resolved sections** | "Open Questions" sections where all questions are resolved | Remove the section header if no open questions remain |

**FR-004: Content preservation.** The skill MUST NOT alter:
- Substantive technical decisions
- Requirements (functional, non-functional, UX)
- Architecture descriptions
- Data models and API definitions
- Code examples and diagrams
- Security considerations
- YAML frontmatter (except optionally updating `updatedAt`)

**FR-005: Confident voice.** The skill MUST rewrite retained content in a confident, direct voice:
- "We decided to use PostgreSQL" → "The system uses PostgreSQL"
- "The recommendation is to implement rate limiting at 100 req/s" → "Rate limiting is set to 100 req/s"
- "Option B was selected because it provides better scalability" → "The system uses [Option B approach] for scalability"

**FR-006: Genuinely open questions.** The skill MUST preserve questions that are genuinely unresolved. If an "Open Questions" section contains a mix of resolved and unresolved items, remove only the resolved ones (collapsing them into assertions in the appropriate section of the document).

**FR-007: In-place update.** The skill MUST update the target file in place. It MUST NOT create a new file or copy.

**FR-008: Summary output.** After cleaning, the skill MUST report a brief summary to the user:
- Number of noise patterns removed/rewritten
- Confirmation that the file was updated
- Any genuinely open questions that were preserved (so the user knows they still exist)

### Non-Functional Requirements

**NFR-001:** The skill MUST be invocable only via explicit slash command (`/wrangler:removing-meta-noise <path-or-id>`). Set `disable-model-invocation: true` in SKILL.md frontmatter.

**NFR-002:** The skill SHOULD proceed without interactive confirmation when tool permissions allow. The operation is inherently reversible via git (the file is tracked in `.wrangler/`). If the user's permission model requires confirmation for file writes, the skill should comply normally — do not attempt to bypass or suppress tool permission prompts.

**NFR-003:** The skill MUST handle files up to 50KB (typical spec size) without issues.

## Implementation Details

### Skill File Structure

```
skills/removing-meta-noise/
└── SKILL.md
```

No templates needed. This is a single-file skill.

### SKILL.md Frontmatter

```yaml
---
name: removing-meta-noise
description: Strips assistant meta-noise and decision-log chatter from wrangler assets. Use only via explicit slash command to clean specs, issues, ideas, or memos after iterative drafting sessions.
disable-model-invocation: true
argument-hint: "<file-path-or-id>"
allowed-tools:
  - Glob
  - Read
  - Write
---
```

**Tool justification (least-privilege):**

| Tool | Purpose | Why needed |
|---|---|---|
| `Glob` | Resolve ID → file path | Match `NNNNNN-*.md` in `.wrangler/` subdirectories |
| `Read` | Load target file | Read full content for noise analysis |
| `Write` | Save cleaned file | Full rewrite of cleaned document (not surgical edits) |

**Excluded tools and rationale:**

| Tool | Why excluded |
|---|---|
| `Edit` | Skill produces a holistic rewrite, not line-level patches. `Write` is sufficient. |
| `Grep` | Operates on a single known file, not searching across the codebase. |
| `Bash` | No shell commands required. |
| `Task` | No subagent dispatch needed — single-file, single-pass operation. |
| `WebFetch`/`WebSearch` | Offline operation only. |

### Invocation

```
/wrangler:removing-meta-noise .wrangler/specifications/000042-auth-system.md
/wrangler:removing-meta-noise SPEC-000042
/wrangler:removing-meta-noise .wrangler/memos/2026-02-15-database-analysis.md
```

### Process (SKILL.md body should instruct the agent to)

1. **Parse argument.** Read the argument from `$ARGUMENTS`. If empty or missing, STOP and report: "Usage: `/wrangler:removing-meta-noise <file-path-or-id>`". Resolve the argument to an absolute file path:
   - If it's a file path (relative or absolute), resolve against the current working directory.
   - If it's an ID pattern, resolve to the corresponding file:
     - `SPEC-NNNNNN` → `.wrangler/specifications/`
     - `ISS-NNNNNN` → `.wrangler/issues/`
     - `IDEA-NNNNNN` → `.wrangler/ideas/`
   - If it's a bare path under `.wrangler/memos/` or `.wrangler/plans/`, use it directly (memos and plans don't have typed IDs).
   - If the resolved file doesn't exist, STOP and report error with the resolved path.

2. **Read the file.** Use the `Read` tool to load the full file content.

3. **Identify noise.** Mentally scan the document for each noise category in FR-003. Build an internal list of passages to remove or rewrite.

4. **Rewrite.** Produce a cleaned version of the document that:
   - Removes all identified noise
   - Collapses resolved questions into confident assertions placed in the appropriate document section
   - Converts hedged language to direct statements
   - Preserves all substantive content, structure, and formatting
   - Keeps YAML frontmatter intact (update `updatedAt` timestamp)
   - Maintains the document's existing section structure

5. **Write the file.** Use the `Write` tool to overwrite the file with the cleaned content.

6. **Report.** Tell the user what was cleaned, with a brief summary.

### Noise Detection Heuristics

The skill should instruct the agent to look for these textual patterns:

**Structural patterns:**
- Sections titled "Open Questions", "Decision Log", "Options Considered", "Alternatives", "Pros/Cons" where all items are resolved
- Numbered option lists (Option 1/2/3 or Alternative A/B/C) with a selection marker
- "Resolved:" or "Decision:" annotations on question items

**Phrasal patterns:**
- Sentence openers: "We recommend", "I suggest", "After considering", "Having evaluated", "The recommendation is", "It's worth noting that", "As discussed"
- Hedges: "probably", "likely", "might", "could potentially", "we think", "it seems", "arguably", "in our opinion"
- Process markers: "TODO: remove", "mark as resolved", "decided in meeting", "per our discussion"
- Meta-references: "as mentioned earlier", "going back to", "to clarify", "to summarize our discussion"

**Section-level patterns:**
- Entire "Change Log" or "Decision History" sections that are pure process artifacts
- "Summary of Changes" sections that describe the editing process rather than the feature
- Appendix sections containing only conversation artifacts

## Testing Strategy

### Manual Verification

Create a sample spec with known noise patterns and verify the skill removes them correctly:

1. A spec with 5+ resolved open questions still formatted as questions
2. A spec with 3+ option enumerations where decisions were made
3. A spec with pervasive hedging language
4. A spec with a mix of resolved and genuinely open questions (verify open ones preserved)
5. A memo with conversational artifacts from a brainstorming session

### Edge Cases

- File with no noise (should report "no changes needed" and leave file untouched)
- File with only genuinely open questions (should preserve all)
- File with code blocks containing words like "probably" or "recommend" (should NOT modify code blocks)
- File with YAML frontmatter containing decision metadata (should NOT modify frontmatter values)
- Very short file (1-2 paragraphs) — should still work correctly

## Success Criteria

- [ ] SKILL.md created at `skills/removing-meta-noise/SKILL.md`
- [ ] Frontmatter includes `disable-model-invocation: true`
- [ ] Skill registered in the skills listing (discoverable via slash command)
- [ ] Running `/wrangler:removing-meta-noise` on a noisy spec produces clean, confident output
- [ ] All substantive content preserved after cleaning
- [ ] Genuinely open questions preserved
- [ ] Code blocks and YAML frontmatter left untouched
- [ ] Summary output provided to user after cleaning

## References

### Related Skills
- `refining-specifications` — Improves spec quality through completeness checks (complementary — run after noise removal)
- `writing-specifications` — Creates initial specs (upstream — noise removal runs on output of iterative spec writing)
- `capturing-ideas` — Captures raw ideas (less likely to have noise, but possible)

### Noise Taxonomy Sources
- Observed patterns from iterative spec drafting with Claude and Codex
- Common anti-patterns in AI-assisted document editing
