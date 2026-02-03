---
name: defining-defining-constitution
description: Develops project constitutional principles through Socratic questioning. Use when establishing design values, creating project governance, or resolving ambiguous design decisions.
---

# Project Constitution Development

## Purpose

The project defining-constitution serves as "supreme law" - a clear, unambiguous statement of:
- Core design values and non-negotiables
- Decision-making frameworks
- Concrete examples of good and bad alignment
- Amendment processes for principled evolution

**Goal**: Create constitutional principles so clear that both AI and human can independently evaluate feature alignment and reach the same conclusion.

## Core Responsibilities

### 1. Constitution Creation

When helping user create new defining-constitution from scratch, use the `initializing-governance` skill instead (it includes defining-constitution creation as part of full setup).

### 2. Constitution Refinement

When user has existing defining-constitution needing improvement:

**Read Current Constitution**:
```bash
# Read existing file
cat .wrangler/CONSTITUTION.md
```

**Analyze for Issues**:
- Ambiguous language ("clean", "simple", "good" without definition)
- Missing concrete examples
- No anti-patterns documented
- Vague principles without specific applications
- Conflicting principles
- Unmeasurable criteria

**Present Findings**:
```markdown
## Constitution Analysis

### Strengths
- [What's working well]

### Issues Found

#### Ambiguity Issues
- **Principle N**: "[Quote]" - Ambiguous because [reason]
- **Principle M**: Missing concrete examples

#### Missing Elements
- No anti-patterns documented
- No decision framework
- Unclear amendment process

#### Conflicts
- Principle X conflicts with Principle Y when [scenario]
```

### 3. Clarity Refinement (Socratic Process)

**THIS IS YOUR PRIMARY VALUE-ADD**: Systematically eliminate all ambiguity through structured questioning.

**Invocation**: User can invoke this directly with phrases like:
- "Refine the clarity of our defining-constitution"
- "Help me make Principle 3 clearer"
- "Remove ambiguity from our design principles"

**Process**: Use the integrated clarity refinement workflow below.

### 4. Constitutional Amendments

When user proposes changes to existing principles:

**Amendment Process** (from defining-constitution template):
1. **Proposal**: Create issue with `constitutional-amendment` label
2. **Justification**: Document why amendment needed
3. **Impact Analysis**: Identify all affected code/specs
4. **Approval**: User decides
5. **Implementation**: Update defining-constitution, increment version
6. **Communication**: Update roadmap changelog
7. **Migration**: Update code/docs to reflect new principle

**Your Role**:
- Help user articulate amendment clearly
- Identify impact on existing specifications and code
- Update defining-constitution file with proper versioning
- Create amendment proposal issue for tracking

## Clarity Refinement Workflow

This is the core value of the defining-constitution skill - systematic ambiguity removal.

### Phase 1: Identify Ambiguities

**Scan for Common Ambiguity Patterns**:

**Vague Quality Terms**:
- "clean" - Clean to who? What defines clean?
- "simple" - Simple interface or simple implementation?
- "maintainable" - Measured how?
- "scalable" - To what scale?
- "performant" - What performance targets?

**Unmeasurable Claims**:
- "Fast" - Compared to what? How fast?
- "Secure" - Which threats? What security model?
- "Reliable" - What uptime? What MTBF?

**Context-Dependent Terms**:
- "User-friendly" - Which users? What use cases?
- "Flexible" - Flexible in what ways?
- "Robust" - Against which failure modes?

**Conflicting Principles**:
- "Move fast" vs "High quality" - Which wins when they conflict?
- "Simple" vs "Feature-rich" - Where's the line?

### Phase 2: Socratic Questioning

For EACH ambiguity identified, ask structured questions to force specificity:

**Template for Questioning**:

**For Vague Quality**: "You say '[vague term]'. Let's make this concrete:"
1. "What would make something NOT [vague term]? Give me a specific example."
2. "If I showed you two implementations, how would you decide which is more [vague term]?"
3. "What's the worst violation of [vague term] you've seen? What made it bad?"
4. "Can you give me a checklist to verify [vague term]?"

**For Unmeasurable Claim**: "You want '[claim]'. How will we know we achieved it?"
1. "What's the minimum acceptable [metric]?"
2. "At what point would this be 'good enough'?"
3. "What measurement would make you confident we've succeeded?"
4. "What would failure look like? How would we detect it?"

**For Context-Dependent**: "You mention '[term]' - let's define the context:"
1. "Who specifically benefits from this?"
2. "In which scenarios does this matter most?"
3. "When would we explicitly NOT prioritize this?"
4. "What trade-offs are acceptable to achieve this?"

**For Conflicts**: "These principles could conflict. Let's resolve:"
1. "Give me a scenario where both can't be satisfied. Which wins?"
2. "What's the hierarchy - which is more important?"
3. "How do we decide when to compromise each one?"
4. "Can you reword to eliminate the conflict?"

### Phase 3: Extract Concrete Specifications

From user's answers, derive concrete, verifiable criteria:

**Transform Vague to Specific**:

**Before**: "Code should be clean"
**After** (from questioning):
```markdown
**Principle**: Code Clarity Over Cleverness

**In Practice**:
- Functions limited to 50 lines maximum
- No nested ternaries or complex one-liners
- Variable names describe business concepts, not implementations
- Every function has single, obvious purpose

**Anti-patterns**:
- ❌ Combining multiple operations in single expression for brevity
- ❌ Using abbreviations or domain jargon without comments
- ❌ Functions that do "and also" (multiple responsibilities)

**Examples**:
- ✅ **Good**: `getUserByEmail(email)` with clear early returns
- ❌ **Bad**: `getUsr(e)` with nested if-else chains
```

**Before**: "System should be scalable"
**After** (from questioning):
```markdown
**Principle**: Scale Incrementally, Not Prematurely

**In Practice**:
- Design for 10x current load, not 1000x
- Choose boring, proven technologies over cutting-edge
- Measure before optimizing (no guessing performance)
- Accept tech debt to ship, pay it down when load demands

**Anti-patterns**:
- ❌ Adding caching/sharding before measuring need
- ❌ Choosing distributed systems for <1M users
- ❌ Optimizing code paths with no evidence of bottleneck

**Examples**:
- ✅ **Good**: Started with single Postgres, added read replicas at 100K users
- ❌ **Bad**: Used microservices from day 1 for 100 user MVP
```

### Phase 4: Document Decision Framework

After refining principles, ensure decision framework exists:

**Five Questions** (from template):
1. **Constitutional Alignment**: Does this align with our core principles?
2. **User Value**: Does this solve a real user problem?
3. **Simplicity**: Is this the simplest solution that works?
4. **Maintainability**: Can we maintain this long-term?
5. **Scope**: Does this fit our mission, or is it scope creep?

**Customize for Project**:
- Add project-specific questions if needed
- Define what "yes" means for each question
- Give examples of features that failed each question

### Phase 5: Validate with Scenarios

**Test Refined Constitution** against real or hypothetical features:

**Process**:
1. Present 3-4 feature scenarios (mix of aligned and misaligned)
2. Ask user: "Based on our principles, should we build this?"
3. You independently apply principles and decide
4. Compare answers

**If answers differ**: Constitution still has ambiguity - return to Phase 2

**If answers align**: Constitution is concrete enough

**Example Scenarios**:

**Scenario A**: "Add a visual theme customizer allowing users to change all UI colors"
- Constitutional Question: Does this align with Principle 1 (Simplicity)?
- Your analysis: [Based on principle text]
- User's answer: [Yes/No with reasoning]

**Scenario B**: "Build admin dashboard to view all user data"
- Constitutional Question: Does this align with Principle 3 (Privacy)?
- Your analysis: [Based on principle text]
- User's answer: [Yes/No with reasoning]

**Goal**: Both you and user reach same conclusion using only the written principles.

## Working with Constitutional Ambiguity

### Red Flags (Trigger Refinement)

If you see ANY of these in a principle, invoke clarity refinement:

- **Abstract quality words**: "clean", "simple", "elegant", "robust"
- **No examples**: Principle has no Good/Bad examples
- **No anti-patterns**: Doesn't say what NOT to do
- **"Should" without criteria**: "Code should be fast" (how fast?)
- **Dependent on judgment**: Requires human to interpret
- **Conflicts with others**: Contradicts another principle
- **Can't be checked**: No way to verify compliance

### Clarity Heuristic

**Test**: Can a new LLM, given ONLY the defining-constitution (no conversation history), evaluate a feature request and reach the same conclusion as you and the user?

**If NO**: Constitution needs refinement.
**If YES**: Constitution is concrete enough.

## Constitutional Amendment Process

When user wants to change existing principles:

### 1. Create Amendment Proposal Issue

Use `issues_create`:

```typescript
issues_create({
  title: "[CONSTITUTIONAL AMENDMENT] [Short title]",
  description: `## Amendment Proposal: [Title]

### Summary
[1-2 sentence summary of proposed amendment]

### Rationale
[Why this amendment is necessary]
[What issues it addresses]
[What improvements it achieves]

### Current Text
\`\`\`
[Exact text of current principle if modifying existing]
\`\`\`

### Proposed Text
\`\`\`
[Exact text of new/modified principle]
\`\`\`

### Impact Analysis

**Affected Specifications**: [List spec IDs]
**Affected Code**: [List files/components]
**Breaking Changes**: [Yes/No - explain]

### Potential Risks
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]

### Migration Plan
[How existing code/specs will be updated to reflect new principle]
`,
  type: "issue",
  status: "open",
  priority: "high",
  labels: ["governance", "constitutional-amendment"],
  project: "Governance"
})
```

### 2. User Approval

Wait for user to explicitly approve amendment.

**Don't auto-approve** - constitutional changes are serious.

### 3. Update Constitution File

Once approved, update `.wrangler/CONSTITUTION.md`:

**Version increment**:
- Major version (1.0.0 → 2.0.0): New principle added or principle removed
- Minor version (1.0.0 → 1.1.0): Existing principle modified
- Patch version (1.0.0 → 1.0.1): Clarification or example added

**Update sections**:
- Increment version number in frontmatter
- Update "Last Amended" date
- Modify/add principle sections
- Add entry to Version History section
- Document in changelog

**Example edit**:
```markdown
**Version**: 1.1.0
**Last Amended**: 2024-11-18

[... principles sections ...]

### Version History

- **1.1.0** (2024-11-18): Modified Principle 2 (Simplicity) to add concrete example about microservices
- **1.0.0** (2024-10-01): Initial defining-constitution ratified
```

### 4. Update Roadmap Changelog

Add entry to `.wrangler/ROADMAP.md` changelog:

```markdown
## Changelog

- **2024-11-18**: Constitutional amendment 1.1.0 affects Phase 2 (modified simplicity principle)
- [...]
```

### 5. Identify Affected Specs

Search for specifications that might conflict:

```bash
# Search specs for mentions of modified principle
grep -r "Principle [N]" .wrangler/specifications/*.md
grep -r "[principle keyword]" .wrangler/specifications/*.md
grep -r "[principle keyword]" .wrangler/CONSTITUTION.md
```

Review each affected spec and propose updates if needed.

### 6. Close Amendment Issue

Mark amendment issue as closed with summary:

```markdown
## Amendment Complete

**Version**: [X.Y.Z]
**Date**: [YYYY-MM-DD]

**Changes Made**:
- Updated Principle [N] in .wrangler/CONSTITUTION.md
- Version incremented to [X.Y.Z]
- Roadmap changelog updated
- [List any spec updates made]

**Migration Status**:
- [ ] All affected specs reviewed
- [ ] Code updates [N/A or completed]
- [ ] Team notified

Amendment is now in effect.
```

## Best Practices

### Writing Principles

**DO**:
- Use concrete, measurable criteria
- Include specific examples (good AND bad)
- Document anti-patterns explicitly
- Keep under 150 lines total (context limits)
- Reference real scenarios from project
- Make principles actionable (can check compliance)

**DON'T**:
- Use vague quality words without definition
- Write abstract philosophy
- Create principles you can't verify
- Make >10 principles (too many to remember)
- Write what you "should" do without explaining how to check
- Leave room for interpretation

### Constitutional Conflicts

When principles conflict (e.g., "Move Fast" vs "High Quality"):

**Option 1 - Hierarchy**: Explicitly rank principles
```markdown
### Principle Hierarchy

When principles conflict, apply in this order:
1. Security (never compromised)
2. User Privacy
3. Reliability
4. Simplicity
5. Speed of iteration
```

**Option 2 - Rewrite**: Eliminate conflict by rewriting both
```markdown
**Before**:
- Move fast and ship features quickly
- Maintain high code quality always

**After**:
- Ship fast with tech debt, pay it down when velocity slows
- Quality in external APIs and data models, pragmatic in internals
```

### Testing Constitutional Clarity

**Validation Checklist**:
- [ ] Can AI independently apply principles to evaluate features?
- [ ] Do user and AI reach same conclusions?
- [ ] Are all principles concrete and measurable?
- [ ] Does every principle have Good + Bad examples?
- [ ] Are anti-patterns explicitly documented?
- [ ] Is decision framework clear and unambiguous?
- [ ] Can compliance be verified (not just judged)?
- [ ] Are conflicting principles resolved?

## Common Clarity Refinement Patterns

### Pattern 1: Defining "Simple"

**User says**: "Code should be simple"

**You ask**:
1. "What makes code NOT simple? Give me an example from this project."
2. "If I wrote a 50-line function vs. 5 functions of 10 lines each, which is simpler?"
3. "Would you rather have simple implementation or simple interface?"
4. "At what point does simplicity become oversimplification?"

**Result**:
```markdown
**Principle**: Simple Interfaces, Pragmatic Internals

**In Practice**:
- Public APIs have ≤3 required parameters
- Internal functions can be complex if well-tested
- Prefer obvious code over clever code
- Delete code before adding configuration options

**Anti-patterns**:
- ❌ Public API with 10+ parameters
- ❌ Generic abstractions used in only one place
- ❌ Configuration for every possible option

**Examples**:
- ✅ **Good**: `createUser(email, password)` - simple API, complex validation inside
- ❌ **Bad**: `createUser({email, password, options: {validateEmail, checkStrength, ...}})` - exposed complexity
```

### Pattern 2: Resolving "Fast" vs "Secure"

**User says**: "Must be fast" and "Must be secure"

**You ask**:
1. "Give me a scenario where security makes things slower. What do we do?"
2. "What's the minimum acceptable speed if it's maximally secure?"
3. "What security can we sacrifice for speed, if any?"
4. "How do we measure if we've balanced these correctly?"

**Result**:
```markdown
**Principle**: Security Over Speed, Except UX-Critical Paths

**In Practice**:
- Authentication can take 500ms+ (bcrypt, proper hashing)
- API responses must be <100ms (cache if needed)
- Admin operations can be slower for security
- User-facing actions optimized even if less secure (rate limiting instead)

**Decision Criteria**: If user waits for it, optimize. If system waits for it, secure it.

**Examples**:
- ✅ **Good**: Slow password hash (security), fast page load (UX)
- ❌ **Bad**: Fast password hash (insecure), slow page load (bad UX)
```

### Pattern 3: Making "Maintainable" Concrete

**User says**: "Code must be maintainable"

**You ask**:
1. "What makes code hard to maintain in your experience?"
2. "If someone new joined, what would make them productive quickly?"
3. "What's the longest acceptable time to understand a function?"
4. "Would you rather have more files or longer files?"

**Result**:
```markdown
**Principle**: Optimized for Reading, Not Writing

**In Practice**:
- New developer should grok file in <5 minutes
- Favor explicit code over DRY if it's clearer
- Tests serve as documentation (readable scenarios)
- No shared mutable state between modules

**Anti-patterns**:
- ❌ Magic: Action-at-a-distance, implicit behavior
- ❌ Abstraction for future use (YAGNI)
- ❌ Clever code golf or micro-optimizations

**Examples**:
- ✅ **Good**: `if (user.isAdmin) { ... }` vs `if (checkRole(user, ROLE_ADMIN)) { ... }` (explicit)
- ❌ **Bad**: Global registry pattern where files auto-register on import (magic)
```

## Usage Examples

### Example 1: Initial Refinement

**User**: "I want our code to be clean and maintainable"

**You**: "Let's make this concrete. What would make code NOT clean in your view? Give me a specific example."

**User**: "Like when there's a 500-line function that does everything"

**You**: "Good. So one criterion is function length. What's the maximum acceptable length?"

**User**: "Maybe 50 lines?"

**You**: "And what about maintainable - how would you know if code is maintainable?"

**User**: "If someone new can understand it quickly"

**You**: "How quickly? And how would they signal understanding?"

[Continue Socratic process...]

**Result**: Transform into concrete principle with measurable criteria

### Example 2: Amendment Request

**User**: "I think we should amend Principle 2 to be less strict about microservices"

**You**: [Creates amendment proposal issue with current vs proposed text, impact analysis]

**User**: "Approved"

**You**: [Updates defining-constitution, increments version, updates roadmap, closes issue]

### Example 3: Ambiguity Detection

**You** (reading defining-constitution): "I see Principle 3 says 'Be pragmatic about quality.' This is ambiguous - what does pragmatic mean here?"

**User**: "Well, we can cut corners for MVPs"

**You**: "Which corners can we cut? And when do we stop cutting corners?"

[Socratic refinement process...]

**Result**: Rewritten principle with specific criteria

## Edge Cases

### User Wants Too Many Principles

**Situation**: User proposes 15+ principles

**Response**: "Constitutional principles should be memorable and checkable. Research shows >7 principles become noise. Can we consolidate these into 5-7 core principles with sub-criteria?"

### Principles Are Perfect But Project Violates Them

**Situation**: Current codebase doesn't follow defining-constitution

**Response**: Don't change defining-constitution to match code. Instead:
1. Document violations in `.wrangler/ROADMAP__NEXT_STEPS.md` under Technical Debt
2. Create issues to fix violations
3. Mark with `constitutional-violation` label
4. Prioritize based on severity

### User Wants Abstract Philosophy

**Situation**: User writes beautiful but vague principles

**Response**: "This is inspiring, but we need concrete criteria. Let me ask questions to make this checkable..."

[Run Socratic process to force specificity]

## Success Criteria

Constitutional work is complete when:

- [ ] All principles have concrete, measurable criteria
- [ ] Every principle has Good + Bad examples
- [ ] Anti-patterns are explicitly documented
- [ ] No vague quality words without definition
- [ ] Decision framework is clear and unambiguous
- [ ] You and user can independently evaluate features and agree
- [ ] Validation scenarios pass (same conclusions)
- [ ] All conflicting principles resolved
- [ ] Amendment process is documented
- [ ] Version history is tracked

## Related Skills

- **initializing-governance** - For setting up full governance framework (includes defining-constitution creation)
- **checking-constitutional-alignment** - For verifying features against defining-constitution
- **verifying-governance** - For checking defining-constitution file integrity
- **brainstorming** - For helping user develop initial principle ideas

## Remember

**Your superpower is Socratic questioning to eliminate ambiguity.** Don't accept vague principles. Keep asking "How would we know?" and "Can you give me an example?" until the principle is concrete enough that any AI could apply it consistently.

The goal: You and the user should be "of one mind" because the defining-constitution is so clear that no interpretation is needed.
