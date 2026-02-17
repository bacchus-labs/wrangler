---
id: IDEA-000009
title: "Rethink wrangler information architecture: notes, memory, and GitHub issues"
type: idea
status: open
priority: medium
labels:
  - architecture
  - information-design
  - github-integration
  - notes
  - memory
createdAt: "2026-02-17T20:10:36.504Z"
updatedAt: "2026-02-17T20:10:36.504Z"
---

## Raw Ideas (Sam, 2026-02-16)

### Rename "memos" to "notes"

- Think of it as the notebook of our scribe where a record is kept of our work and thinking
- Gets populated from organic conversation: "save a new note to record those findings" or "go analyze our codebase to check for X and write me a note with your findings"
- Doesn't matter if they're different types of notes -- let LLMs clean those up after the fact and organize our project management exhaust

### Knowledge base curation workflow

- Have a workflow or command-triggered prompt/skill that goes through notes and organizes content meeting certain criteria into `.wrangler/memory/`
- Saves in a cleaned-up form that captures:
  1. Association with a specific spec
  2. Whether it resulted in a concrete decision
  3. Any valuable insights that took significant LLM compute to discover (e.g., deep codebase analysis findings)
- Example: a note evaluating pros/cons of Lexical alternatives gets saved into the KB with decision context preserved

### MEMORY.md as key knowledge store

- Key things saved: decisions made, mistakes we don't want to repeat, etc.
- Acts as the persistent institutional knowledge layer

### Research phase simplification

- Research output lives mostly as notes
- Don't over-categorize -- let post-hoc organization handle it

### Spec discovery and in-progress visibility

- When spec implementation kicks off, it needs to be immediately discoverable in YAML frontmatter as "in progress"
- This becomes more straightforward with GitHub Issues since label flips happen without push/pull of text file changes

### GitHub Issues as primary backend

- Leaning harder into GitHub for issue tracking
- Explore supporting both local markdown and GitHub Issues in parallel
- Benefits: better visibility, label management, no git push/pull needed for status changes
- Need a spec on LOE for supporting GitHub Issues backend (with ability to run both in parallel)

### Coordination gap

- When multiple people are working and one person's work has implications for another's spec, it still comes down to communication
- Better in-progress visibility (above) helps but doesn't fully solve it

## The Wrangler Documentation Hierarchy

- `docs/` -> this should be all documentation that a user or agent can reference to understand the current state of how the project works, features it has, how to use it, etc. It should NOT contain random brainstorming content, references to the way things used to be (unless it's a specifically relevant version history and migration guide).
- `CLAUDE.md` -> this should be strictly for agent directives -- essential context about the project, how to work effectively, and links to the docs/ content for deeper reference. It should NOT contain any content that is duplicated in docs/ or that is not directly relevant to guiding agent behavior.
- `README.md` -> this should be a high-level overview of the project for human readers, including a summary of features, quick start guide, and links to documentation. It should NOT contain detailed implementation information or agent-specific directives.
- `.wrangler/memos/` -> this is our current location for miscelaneous notes and references accumulated throughout the planning process between developers and agents. In the medium-term, we will invest in converting this dir to be called "notes" and then add skills for having agents review the notes and extract and move content into the `.wrangler/memory/` dir in a way that optimizes it for future agent reference without causing risk of drift or confusion. However, for the scope of this spec, we can hold off on refactoring the memos content for now.
- `.wrangler/memory/` -> this should be for persistent reference as described in my previous message. Right now it contains key docs like CODING_STANDARDS and TESTING_STANDARDS that should get referenced in CLAUDE.md. In the future it will have a "MEMORY.md" file that serves as a top level index of recent updates and decisions made along with a memory/knowledge-base where stuff from `.wrangler/notes/` gets migrated to.
- `.wrangler/specifications/` -> this is for actually planned work. Specs that haven't been locked yet should be labeled as drafts in the frontmatter.
- `.wrangler/ROADMAP.md` -> this is our memory file for roadmap planning.
- `.wrangler/VISION.md` -> this is a new concept I want to introduce in the near-term. The idea is that docs/ will have the complete documentation of the current state of the project, while VISION.md will be a clear articulation of the state we are building towards. ROADMAP.md may not yet fully reflect all the steps to get to the final VISION.md, but should convey the state of the project - what was just implemented, what's being implemented now, what's been fully planned (in a locked spec), and what is in the process of getting specc'd out.
