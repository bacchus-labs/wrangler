# Checking Constitutional Alignment - Detailed Guide

**After completing check, create permanent record:**

### If Approved

**Add to specification** when created:

```markdown
## Constitutional Alignment

**Evaluated**: [YYYY-MM-DD]
**Skill**: checking-constitutional-alignment
**Result**: ✅ APPROVED

[Include full analysis from Phase 3-5]
```

### If Rejected

**Create issue for record-keeping:**

```typescript
issues_create({
  title: "[REJECTED] [Feature Name] - Constitutional Misalignment",
  description: `[Include full rejection analysis]`,
  type: "issue",
  status: "cancelled",
  priority: "low",
  labels: ["governance", "rejected-feature", "constitutional-violation"],
  project: "Governance"
})
```

**Purpose**: Prevent revisiting rejected ideas without addressing root concerns.

## Edge Cases

### Proposal Is Partially Outside Scope

**Situation**: Core feature aligns, but requested "extras" don't

**Response**:
- Recommend ⚠️ REVISE
- Approve core, suggest phasing or removing extras
- Document which parts align and which don't

### No Clear User Evidence

**Situation**: Feature seems aligned but no hard evidence of user need

**Response**:
- Flag Question 2 (User Value) as ⚠️
- Suggest: "Validate user need before specification"
- Recommend user research or hypothesis testing

### Constitution Is Ambiguous

**Situation**: Can't determine alignment because principle is vague

**Response**:
1. Note ambiguity explicitly
2. Make best judgment call
3. **Recommend**: "Run `defining-constitution` skill to refine Principle [N]"
4. Document assumption made for this check

### Proposal Would Require Constitutional Amendment

**Situation**: Good idea but violates current principles intentionally

**Response**:
```markdown
# Constitutional Alignment: ⚠️ REQUIRES AMENDMENT

This proposal conflicts with current principles but may justify updating the defining-constitution itself.

## Conflict
[Which principle it violates]

## Case for Amendment
[Why this feature is important enough to change principles]

## Recommendation
1. Create constitutional amendment proposal (use `defining-constitution` skill)
2. If amendment approved, re-evaluate this feature
3. Do NOT proceed without formal amendment
```

## Collaboration with User

**This is a conversation, not a dictation.**

**If you assess ❌ REJECT but user disagrees:**
1. Review your analysis - did you miss something?
2. Check if defining-constitution is ambiguous (might need refinement)
3. Present reasoning clearly, but defer to user's judgment
4. If user overrides, document: "Approved despite [concern] per user decision"

**If you assess ✅ APPROVE but user has concerns:**
1. Ask what concerns them
2. Re-analyze with their perspective
3. Update recommendation if their concerns are valid
4. Constitutional governance is collaborative, not dogmatic

## Success Criteria

Alignment check is complete when:

- [ ] Constitution fully read and understood
- [ ] Proposal clearly documented
- [ ] All 5 decision framework questions analyzed
- [ ] All principles checked for alignment/conflict
- [ ] All anti-patterns checked for violations
- [ ] Examples compared
- [ ] Clear recommendation provided (✅/⚠️/❌)
- [ ] Detailed reasoning documented
- [ ] Next steps specified
- [ ] Record created (in spec or as rejected issue)

## Output Format

Always provide:

1. **Top-line recommendation**: ✅ APPROVE / ⚠️ REVISE / ❌ REJECT
2. **Summary** (2-3 sentences)
3. **Detailed analysis** for each framework question
4. **Principle alignment breakdown**
5. **Anti-pattern check results**
6. **Next steps** (what to do with this information)

## Related Skills

- **defining-constitution** - For refining ambiguous principles encountered during check
- **writing-plans** - For creating specification after approval
- **brainstorming** - For revising proposals that need modification

## Remember

You are the constitutional guardian. Be rigorous but not dogmatic. The goal is alignment with principles, not rejection of ideas. When something doesn't align, help the user understand why and suggest aligned alternatives.

The defining-constitution exists to serve the project, not to block progress. But it must be respected - bypassing it for "just this once" destroys its value.
