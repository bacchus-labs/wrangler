# Testing Methodology for Skills

## When to Test Skills

Test: Discipline-enforcing skills with compliance costs that could be rationalized away.
Don't test: Pure reference skills, skills without rules to violate.

## Writing Pressure Scenarios

**Bad:** "You need to implement a feature. What does the skill say?"

**Good:** "Production down. $10k/min lost. Manager says 2-line fix now. 5 min deploy window."

**Great:** "3 hours, 200 lines, manually tested, works. 6pm, dinner 6:30pm. Code review 9am. Forgot TDD. A) Delete, start tomorrow B) Commit, test later C) Test now (30 min)" - Forces explicit choice.

## Pressure Types

Time (emergency, deadline), Sunk cost (hours invested), Authority (manager override), Economic (job/promotion), Exhaustion (end of day), Social (looking dogmatic), Pragmatic ("being pragmatic"). Best tests combine 3+ pressures.

## Key Elements of Good Scenarios

1. **Concrete options** - Force A/B/C choice
2. **Real constraints** - Specific times, actual consequences
3. **Make agent act** - "What do you do?" not "What should you do?"
4. **No easy outs** - Can't defer without choosing

## VERIFY GREEN: Pressure Testing Process

Create pressure scenarios (3+ pressures) → Run WITHOUT skill → Document rationalizations verbatim → Identify patterns → Note which pressures trigger violations.

## Plugging Each Hole

For each new rationalization discovered during testing:

1. **Add explicit negation** - "Write code before test? Delete it. Start over. No exceptions: Don't keep as 'reference', don't adapt, delete means delete."
2. **Add to rationalization table** - Document the excuse and counter-argument
3. **Add red flag** - Include in "Red Flags - STOP" list
4. **Update description** - Add symptoms of ABOUT to violate

## Re-verify After Refactoring

Re-test with updated skill. Agent should choose correctly, cite new sections. If NEW rationalization found, continue REFACTOR.

## Meta-Testing (When GREEN Isn't Working)

After agent chooses wrong option, ask: "How could the skill have made it crystal clear that Option A was the only answer?"

Three responses:
1. "Skill was clear, I ignored it" → Need stronger foundational principle
2. "Skill should have said X" → Documentation problem, add their suggestion
3. "Didn't see section Y" → Organization problem, make key points prominent

## When Skill is Bulletproof

Bulletproof: Agent chooses correctly under max pressure, cites sections, meta-test shows "skill was clear".

Not bulletproof: New rationalizations, argues skill wrong, creates hybrids.

## Example: TDD Skill Bulletproofing

Test 1: Agent chose C (tests after). Added "Why Order Matters". Still chose C. New excuse: "Spirit not letter"
Iteration 2: Added "Violating letter is violating spirit". Agent chose A (delete). Bulletproof.
