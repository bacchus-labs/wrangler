# Defining Constitution - Detailed Guide

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
