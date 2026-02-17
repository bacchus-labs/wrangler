---
id: IDEA-000009
title: 'Rethink wrangler information architecture: notes, memory, and GitHub issues'
type: idea
status: open
priority: medium
labels:
  - architecture
  - information-design
  - github-integration
  - notes
  - memory
createdAt: '2026-02-17T20:10:36.504Z'
updatedAt: '2026-02-17T20:10:36.504Z'
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
