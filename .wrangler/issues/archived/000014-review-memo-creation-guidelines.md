---
id: "000014"
title: "Review and Document Memo Creation Guidelines"
type: "issue"
status: "closed"
priority: "medium"
labels: ["documentation", "governance", "process"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

# Review and Document Memo Creation Guidelines

## Problem

Currently, there's ambiguity about when to create memos vs specs vs issues. This has led to:
- Proposals being saved as memos when they should be specs (clutters memos dir)
- No clear process for marking memos as "rejected" or "superseded"
- Inconsistent understanding of memo purpose

Memos should be reserved for specific, valuable use cases, not every proposal or idea.

## Correct Usage

Memos should be created for:

1. **Upon explicit user request** - User asks "create a memo about X"
2. **Root cause analyses (RCA)** - After resolving tricky, long-running debugging issues
3. **Important design decisions** - Documenting why approach X was chosen over Y
4. **Lessons learned** - Post-mortems, retrospectives, "what we learned from incident Z"
5. **Research findings** - Comprehensive research that informs future work
6. **Process documentation** - New workflows, patterns discovered during work

## Incorrect Usage

Memos should NOT be created for:

1. **Feature proposals** → Use specifications (`.wrangler/specifications/`)
2. **Bug fix proposals** → Use issues (`.wrangler/issues/`)
3. **Work tracking** → Use issues
4. **Temporary notes** → Don't persist, or use comments in issues
5. **Meeting notes** → Unless they contain important decisions/lessons

## Tasks

- [ ] Review current memos directory for misplaced content
- [ ] Document clear guidelines in `.wrangler/memos/README.md`
- [ ] Update relevant skills that reference memo creation:
  - [ ] Check `systematic-debugging` - does it suggest memos for RCA?
  - [ ] Check `brainstorming` - ensure proposals → specs, not memos
  - [ ] Check any other skills mentioning memos
- [ ] Add examples of good vs bad memo usage
- [ ] Consider: memo metadata (frontmatter) to track status (active/superseded/rejected)?

## Acceptance Criteria

- Clear documentation exists explaining when to create memos
- Skills that mention memos align with guidelines
- Future agents understand: proposal → spec, not memo

## Notes

This issue created after incorrectly creating memo for development-manager skill proposal (should have been spec from start).

## Related

- `.wrangler/specifications/000003-development-manager-skill.md` - Example of correct spec usage
- `.wrangler/memos/2025-11-20-development-manager-skill-proposal.md` - Incorrect memo (to be deleted)
