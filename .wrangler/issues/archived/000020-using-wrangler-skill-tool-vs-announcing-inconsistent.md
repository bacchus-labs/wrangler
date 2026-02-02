---
id: "000020"
title: "Flaw: using-wrangler says use Skill tool AND announce usage, but announcement format differs from Skill tool loading message"
type: "issue"
status: "closed"
priority: "low"
labels: ["skills", "workflow-flaw", "process", "ux"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Flaw Description

**using-wrangler** (lines 61-96) mandates announcing skill usage with this EXACT format:

```
═══════════════════════════════════════════════════════════
🎯 SKILL: [skill-name]
═══════════════════════════════════════════════════════════
[Brief description of what you're doing with this skill]
```

However:

1. The skill also says "Execute skills with the Skill tool" (line 32)
2. When Skill tool is used, Claude sees: `<command-message>The "{name}" skill is loading</command-message>`
3. After Skill tool loads, should agent ALSO announce with the formatted box?
4. If yes, that's redundant (agent announced twice)
5. If no, then "MUST announce using EXACT format" is violated

Additionally:
- Some skills in their own content say "Announce at start:" with format like "I'm using the X skill..."
- This doesn't match the using-wrangler format
- Unclear if skill-specific announcement replaces or supplements using-wrangler announcement

## Affected Skills

- `using-wrangler/SKILL.md` (lines 61-96)
- Multiple skills that have "Announce at start:" directives:
  - `brainstorming/SKILL.md` line 14
  - `using-git-worktrees/SKILL.md` line 14
  - `finishing-a-development-branch/SKILL.md` line 14
  - `writing-plans/SKILL.md` line 16
  - `executing-plans/SKILL.md` line 14
  - `subagent-driven-development/SKILL.md` (implicitly)

## Specific Examples

### Example 1: brainstorming says announce with different format

**using-wrangler** says:
```
═══════════════════════════════════════════════════════════
🎯 SKILL: [skill-name]
═══════════════════════════════════════════════════════════
[Brief description of what you're doing with this skill]
```

**brainstorming** line 14 says:
```
**Announce at start:** "I'm using the brainstorming skill to refine your idea into a design."
```

**Problem:** These formats don't match. Should agent use:
- using-wrangler format (box with emoji)?
- brainstorming format (simple sentence)?
- Both (redundant)?

### Example 2: Skill tool already announces loading

When agent uses Skill tool:
```
You: [Skill tool invocation]
<command-message>The "brainstorming" skill is loading</command-message>
```

Then brainstorming skill loads and agent sees: "Announce at start: I'm using the brainstorming skill..."

Should agent now announce AGAIN? That's:
1. Skill tool: "The brainstorming skill is loading"
2. Agent: "I'm using the brainstorming skill to refine your idea..."

Redundant announcements.

### Example 3: using-wrangler examples show box format

**using-wrangler** lines 73-96 show:
```
═══════════════════════════════════════════════════════════
🎯 SKILL: brainstorming
═══════════════════════════════════════════════════════════
Refining your idea into a fully-formed design through
structured Socratic questioning before any code is written.
```

But in practice, I've never seen an agent use this format. They typically say:
"I'm using the brainstorming skill to refine your idea."

Which suggests either:
- Agents aren't following using-wrangler (violation)
- The box format is too verbose and agents skip it
- The Skill tool announcement is sufficient

## Impact

**Low** - This is primarily a UX/clarity issue:

1. **Minor confusion**: Agents unsure which announcement format to use
2. **Potential redundancy**: Multiple announcements for same skill
3. **Format inconsistency**: Different agents might announce differently
4. **Not blocking**: Work still gets done correctly

**Why not higher:** The announcement is informational, not functional. Whether agent announces or not doesn't affect correctness of work.

## Suggested Fix

### Option A: Skill tool announcement is sufficient (remove explicit announcement requirement)

**Rationale:** Skill tool already announces "<command-message>The X skill is loading</command-message>". That's sufficient notification.

Changes:
1. Remove "Announcing Skill Usage" section from using-wrangler
2. Remove "Announce at start:" from individual skills
3. Rely on Skill tool's built-in announcement

**Pros:**
- Eliminates redundancy
- Simpler for agents
- Consistent announcement format (from tool)

**Cons:**
- Loses verbose description of what skill does
- Skill tool message is terse

### Option B: Require announcement ONLY when skill is used WITHOUT Skill tool

**Rationale:** If skill content is already loaded (from prior session, or agent memorized it), agent should announce usage.

Changes to using-wrangler:
```markdown
## Announcing Skill Usage

IF you are using a skill (following its process):

  Did you use Skill tool to load it?
    YES → Skill tool announced it, no additional announcement needed
    NO → You MUST announce with this format:

═══════════════════════════════════════════════════════════
🎯 SKILL: [skill-name]
═══════════════════════════════════════════════════════════
[Brief description of what you're doing with this skill]

**Why announce if not loaded via tool:**
- Confirms you're following the skill
- Helps your human partner understand your process
- Makes conversation history clearer
```

**Pros:**
- Clear rule: Announce if not using tool
- No redundancy
- Explicit announcement when needed

**Cons:**
- Agents might forget to announce
- Two code paths (with tool, without tool)

### Option C: Simplify announcement format (remove box)

**Rationale:** The box format is too verbose. Most agents naturally say "I'm using X skill..." which is clearer.

Changes:
1. Remove box format from using-wrangler
2. Standardize on simple format: "I'm using [skill-name] to [brief description]."
3. Update all skills to use consistent format
4. Agent announces even after Skill tool (brief confirmation)

**Pros:**
- Simple, natural language
- Consistent across skills
- Brief enough that redundancy with Skill tool isn't annoying

**Cons:**
- Two announcements (tool + agent)
- Less visually distinctive than box

### Option D: Keep box but clarify it's AFTER Skill tool loads

**Rationale:** Box format is visually distinctive. Make it complement Skill tool announcement.

Changes to using-wrangler:
```markdown
## Announcing Skill Usage

After using Skill tool to load a skill, you MUST announce usage with this format:

═══════════════════════════════════════════════════════════
🎯 SKILL: [skill-name]
═══════════════════════════════════════════════════════════
[What you're doing with this skill - 1-2 sentences]

This confirms you've read the skill and are following its process.
```

Update individual skills to match this format.

**Pros:**
- Visually distinctive
- Confirms agent read and understood skill
- Clear that announcement comes AFTER tool use

**Cons:**
- Redundant with tool announcement
- Verbose

## Recommended Fix: Option B

Most practical solution:
- Skill tool announces loading (automatic)
- If skill used without tool → agent must announce with simple format
- No redundant announcements
- Clear rule

Update using-wrangler:
```markdown
## Announcing Skill Usage

IF you are following a skill's process:

**If loaded via Skill tool:**
  No additional announcement needed. Tool announces loading.

**If not loaded via Skill tool:**
  Announce with: "I'm using [skill-name] to [brief description]."

**Why:** Ensures your human partner knows which process you're following.
```

Remove "Announce at start:" from individual skills (redundant with using-wrangler guidance).

## Verification

After fix:
1. Agent uses Skill tool → Sees "<command-message>The X skill is loading</command-message>" → Proceeds with skill
2. Agent recalls skill content → Says "I'm using X to Y" → Proceeds with skill
3. No confusion about announcement format
4. No redundant announcements
5. Skill tool announcement is sufficient in most cases
