---
id: IDEA-000010
title: 'Skill: Review open specs for alignment drift'
type: idea
status: open
priority: medium
labels:
  - skill
  - governance
  - alignment
createdAt: '2026-02-18T06:18:53.679Z'
updatedAt: '2026-02-18T06:18:53.679Z'
---
Create a skill that reviews all open specifications for alignment with the project constitution, roadmap, and current implementation reality. Goal is to detect any drift between what specs say and what actually exists/is planned, and flag discrepancies.

Output: A new memo of type "alert" (e.g., `.wrangler/memos/YYYY-MM-DD-spec-alignment-alert.md`) listing any drift found, with specific references to the specs and areas of concern.

Key behaviors:
- Compare open specs against constitutional principles
- Check specs against current roadmap priorities
- Identify specs that may have become stale or contradictory
- Flag specs whose assumptions no longer hold
- Generate actionable alert memo with findings
