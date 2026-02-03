---
id: "000015"
title: "Flaw: Circular dependency chain between brainstorming, using-git-worktrees, and finishing-a-development-branch"
type: "issue"
status: "closed"
priority: "high"
labels: ["skills", "workflow-flaw", "process", "circular-dependency"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-20T00:00:00.000Z"
---

## Flaw Description

There is a circular dependency chain between three skills that makes it impossible to determine entry point and creates confusion about workflow ownership:

1. **brainstorming** (Phase 5) says: "REQUIRED SUB-SKILL: Use wrangler:using-git-worktrees"
2. **using-git-worktrees** says at end: "Pairs with: finishing-a-development-branch - REQUIRED for cleanup after work complete"
3. **finishing-a-development-branch** (Step 5) references: "Cleanup Worktree" (implying it knows about worktrees)

BUT:
4. **finishing-a-development-branch** is called by **subagent-driven-development** (Step 7) AND **executing-plans** (Step 5)
5. Neither subagent-driven-development nor executing-plans mention worktrees at all
6. **brainstorming** doesn't mention finishing-a-development-branch

## Affected Skills

- `brainstorming/SKILL.md`
- `using-git-worktrees/SKILL.md`
- `finishing-a-development-branch/SKILL.md`
- `subagent-driven-development/SKILL.md`
- `executing-plans/SKILL.md`

## Specific Examples

### Example 1: brainstorming Phase 6 says:
```markdown
**If implementing:** "Ready to create the implementation plan?"
When your human partner confirms:
- **REQUIRED SUB-SKILL:** Use wrangler:writing-plans
- Create detailed plan in the worktree
```

**Problem:** Assumes worktree exists (from Phase 5), but what if user is NOT implementing? Phase 5 worktree setup is conditional on "Ready to create implementation plan?" yet Phase 6 says "Create detailed plan in the worktree" unconditionally.

### Example 2: finishing-a-development-branch Step 5:
```markdown
### Step 5: Cleanup Worktree
**For Options 1, 2, 4:**
Check if in worktree:
git worktree list | grep $(git branch --show-current)
```

**Problem:** finishing-a-development-branch assumes it might be in a worktree, but has no documented path to GET into a worktree. The skills that call it (subagent-driven-development, executing-plans) don't mention worktrees.

### Example 3: subagent-driven-development doesn't mention worktrees:
The skill calls writing-plans, which creates plan in worktree, but subagent-driven-development never establishes that a worktree should be created or that it's operating in one.

## Impact

**High** - This creates multiple workflow logic issues:

1. **Unclear entry point**: If I want to implement a feature, which skill do I start with? brainstorming? using-git-worktrees? subagent-driven-development?
2. **Broken assumptions**: finishing-a-development-branch checks for worktrees but might not be in one
3. **Missing steps**: executing-plans might execute in main branch when it should be in worktree
4. **Documentation confusion**: Skills reference each other in ways that create circular chains

## Suggested Fix

### Option A: Establish Clear Entry Point
1. **brainstorming** should be the entry point for new features
2. Phase 5 of brainstorming should ALWAYS create worktree (not conditional)
3. Phase 6 should explicitly state: "You are now in worktree X"
4. **writing-plans** should verify it's in a worktree before creating plan
5. **subagent-driven-development** should have pre-condition: "Assumes you're in a worktree"
6. **executing-plans** should have pre-condition: "Assumes you're in a worktree"
7. **finishing-a-development-branch** should have pre-condition: "Assumes you're in a worktree" OR handle both cases explicitly

### Option B: Decouple Worktrees from Workflows
1. Make worktree usage optional (not required)
2. Remove "REQUIRED SUB-SKILL" language from brainstorming
3. Make finishing-a-development-branch handle both worktree and non-worktree cases
4. Update all skills to work in either environment

### Option C: Create Meta-Workflow Skill
Create a new skill "implementing-issues" that orchestrates:
1. brainstorming (design)
2. using-git-worktrees (isolation)
3. writing-plans (planning)
4. subagent-driven-development OR executing-plans (execution)
5. finishing-a-development-branch (completion)

This makes the workflow explicit and breaks the circular dependencies.

## Verification

After fix, agent should be able to answer:
- "I want to implement a new feature. Which skill do I start with?"
- "How do I know if I should be in a worktree?"
- "What happens if I skip the worktree step?"
- "finishing-a-development-branch checks for worktrees - why?"

All answers should be clear and consistent across skills.
