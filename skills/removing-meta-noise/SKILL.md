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

# Remove Meta-Noise from Wrangler Asset

## Purpose

Strip assistant reasoning artifacts, decision-log chatter, and hedging language from a wrangler-managed document. Produce a clean, confident, implementation-ready version that reads as if written by a domain expert -- not transcribed from a conversation.

## Process

### 1. Parse Argument

Read the argument from `$ARGUMENTS`.

**If empty or missing**, STOP immediately and report:

```
Usage: /wrangler:removing-meta-noise <file-path-or-id>

Examples:
  /wrangler:removing-meta-noise .wrangler/specifications/SPEC-000042-auth-system.md
  /wrangler:removing-meta-noise SPEC-000042
  /wrangler:removing-meta-noise .wrangler/memos/2026-02-15-database-analysis.md
```

**Resolve the argument to an absolute file path:**

| Input Pattern | Resolution |
|---|---|
| `SPEC-NNNNNN` | Glob `.wrangler/specifications/*NNNNNN*` |
| `ISS-NNNNNN` | Glob `.wrangler/issues/*NNNNNN*` |
| `IDEA-NNNNNN` | Glob `.wrangler/ideas/*NNNNNN*` |
| Relative or absolute path | Resolve against working directory |

If the resolved file does not exist, STOP and report the error with the resolved path.

### 2. Read the File

Use the `Read` tool to load the full file content.

### 3. Identify Noise

Scan the entire document for the noise categories below. Build a mental inventory of passages to remove or rewrite.

**Structural noise:**
- Sections titled "Open Questions", "Decision Log", "Options Considered", "Alternatives", "Pros/Cons" where all items are resolved
- Numbered option lists (Option 1/2/3 or Alternative A/B/C) with a selection marker
- "Resolved:" or "Decision:" annotations on question items
- Entire "Change Log" or "Decision History" sections that are pure process artifacts
- "Summary of Changes" sections describing the editing process rather than the feature
- Appendix sections containing only conversation artifacts

**Phrasal noise:**
- Sentence openers: "We recommend", "I suggest", "After considering", "Having evaluated", "The recommendation is", "It's worth noting that", "As discussed"
- Hedges: "probably", "likely", "might", "could potentially", "we think", "it seems", "arguably", "in our opinion"
- Process markers: "TODO: remove", "mark as resolved", "decided in meeting", "per our discussion"
- Meta-references: "as mentioned earlier", "going back to", "to clarify", "to summarize our discussion"
- Assistant self-reference: "I suggest", "I recommend", "I think we should"
- Conversational artifacts: "As mentioned above", "Going back to your point", "To answer your question"

**IMPORTANT: DO NOT modify content inside code blocks (fenced with ``` or indented 4+ spaces). Words like "probably" or "recommend" inside code are literal code, not noise.**

### 4. Rewrite

Produce a cleaned version that:

- **Removes** all identified noise
- **Collapses** resolved questions into confident assertions placed in the appropriate document section
- **Converts** hedged language to direct, confident statements
- **Preserves** all substantive content, structure, and formatting
- **Keeps** YAML frontmatter intact (update only `updatedAt` to current ISO timestamp)
- **Maintains** the document's existing section structure and hierarchy
- **Preserves** genuinely unresolved open questions exactly as they are

**Voice rules:**

| Before (noisy) | After (clean) |
|---|---|
| "We decided to use PostgreSQL" | "The system uses PostgreSQL" |
| "The recommendation is to implement rate limiting at 100 req/s" | "Rate limiting is set to 100 req/s" |
| "Option B was selected because it provides better scalability" | "The system uses [Option B approach] for scalability" |
| "After careful evaluation, we'll probably go with Redis" | "The system uses Redis for caching" |
| "I suggest we add authentication middleware" | "Authentication middleware handles request validation" |

### 5. Write the File

Use the `Write` tool to overwrite the file with the cleaned content. This is an in-place update -- do not create a new file.

### 6. Report

After writing, tell the user:

1. Confirmation that the file was updated (include the file path)
2. Brief summary of what was cleaned (e.g., "Collapsed 4 resolved questions, removed 2 option enumerations, rewrote 8 hedged phrases")
3. Any genuinely open questions that were preserved, so the user knows they remain

**If no noise was found**, report "No meta-noise detected -- file left unchanged" and do NOT write the file.

## Edge Cases

- **No noise found**: Report "no changes needed" and leave file untouched (do not write).
- **Only genuinely open questions**: Preserve all. Report that they remain.
- **Code blocks**: NEVER modify content inside fenced code blocks or indented code blocks.
- **YAML frontmatter**: Only update `updatedAt`. Do not modify any other frontmatter fields.
- **Very short files**: Apply the same process regardless of file length.

## What This Skill Does NOT Do

- Restructure documents into a different template or format
- Add missing content or fill gaps
- Validate technical correctness of decisions
- Change the semantic meaning of any content
- Act as a general-purpose editor or rewriter
