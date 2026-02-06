---
id: "SPEC-000041"
title: "Implement Skill Enhancement - Spec Compliance Verification"
type: "specification"
status: "open"
priority: "high"
labels: ["skills", "implement", "verification", "tdd", "quality"]
createdAt: "2026-01-18T00:00:00.000Z"
updatedAt: "2026-01-18T00:00:00.000Z"
---

# Implement Skill Enhancement - Spec Compliance Verification

## Executive Summary

**What:** Enhance the `/wrangler:implement` skill with verification gates to prevent partial implementations from being marked as complete. Specifically addresses the failure pattern where type definitions are created but actual I/O operations are never implemented.

**Why:** The iMessage Plugin implementation (PR #42) achieved only 69% spec compliance despite passing all unit tests. The agent marked tasks as "completed" after defining TypeScript types, without implementing the actual storage pipeline (file writes, directory creation, attachment copying). This represents a systematic gap between "defining what to build" and "building it."

**Scope:**
- Included: Adding verification gates to implement skill, task granularity enforcement, integration test requirements, spec compliance matrix, E2E verification checkpoint
- Excluded: Changes to other skills (verification-before-completion, test-driven-development, finishing-a-development-branch), CI/CD enforcement, language-specific guidance

**Status:** Open

## Background & Context

### Problem Statement

The current `/wrangler:implement` skill is a comprehensive 1281-line document that provides excellent guidance for autonomous implementation workflows. However, critical analysis reveals **structural gaps** that allowed the following failure pattern:

1. Agent defined TypeScript interfaces for storage structures
2. Agent wrote helper methods (e.g., `organizeByThread()`) that operate on in-memory data
3. Agent marked "Implement data storage structure" as complete
4. **No actual file I/O code was written** (no `fs.writeFile()`, `fs.mkdir()`, `fs.copyFile()`)
5. All 31 unit tests passed (but they mocked filesystem operations)
6. IPC handlers that read the files were implemented, but the files were never created

### Root Causes Identified

From the postmortem analysis:

| Root Cause | Description |
|-----------|-------------|
| **Premature Task Completion** | Agent marked tasks complete after defining types, not implementing I/O operations |
| **Superficial TDD** | Unit tests validated helper methods but not end-to-end storage behavior |
| **No E2E Verification** | Agent never ran the feature manually to verify files appeared |
| **Task Granularity Too Coarse** | Todos tracked phases, not atomic spec tasks |

### Current Skill Gaps

The analysis identified five structural gaps in the implement skill:

1. **No "Types vs Implementation" Distinction** - The skill treats task completion as binary; defining types is conflated with implementing operations
2. **Task Granularity Not Enforced** - No requirement to decompose high-level tasks into atomic I/O operations
3. **Integration Test Requirement Missing** - TDD requirements don't distinguish unit vs integration tests
4. **Spec Compliance Verification Not Explicit** - No mandatory mapping of spec requirements to code locations and tests
5. **No E2E Verification Checkpoint** - Final verification runs tests but doesn't require manual feature exercise

## Goals and Non-Goals

### Goals

1. **Prevent premature completion claims** - Require verification that I/O code exists (not just types) for storage tasks
2. **Enforce task granularity** - Decompose spec tasks into atomic, verifiable operations
3. **Require integration tests for I/O features** - At least one non-mocked test per storage feature
4. **Mandate spec compliance matrix** - Explicit mapping of every spec requirement to code and test locations
5. **Add E2E verification checkpoint** - Manual verification before PR creation for user-facing features

### Non-Goals

- Modifying other skills (verification-before-completion, test-driven-development, etc.)
- Adding CI/CD enforcement or pre-commit hooks
- Language or framework-specific guidance
- Changing the core subagent dispatch mechanism
- Adding automated compliance checking tools

## Requirements

### Functional Requirements

#### FR-001: Implementation Verification Gate

The skill MUST include a verification step for I/O-heavy tasks that:
- Triggers when task description includes: "storage", "write", "save", "persist", "file", "database", "API call", "network"
- Requires identification of the specific function that performs the I/O operation
- Requires verification that the I/O function is called in the happy path (not just defined)
- Requires at least one test that does NOT mock the I/O layer

**Acceptance Criteria:**
- [ ] Gate triggers for tasks containing I/O keywords
- [ ] Gate blocks task completion until I/O code location is verified
- [ ] Gate blocks task completion until integration test is identified
- [ ] Gate provides clear error message when requirements not met

#### FR-002: Task Granularity Enforcement

The skill MUST enforce atomic task decomposition at scope parsing time:
- Each task must be completable in <30 minutes
- Each task must have clear binary done/not-done criteria
- Tasks involving storage must explicitly name the I/O operation (mkdir, writeFile, copyFile)

**Example decomposition:**

Original spec task: "Implement data storage structure"

Required decomposition:
- Task 3.1a: Create thread directory structure (`fs.mkdir`)
- Task 3.1b: Write `index.json` with thread list (`fs.writeFile`)
- Task 3.1c: Write per-thread `metadata.json` (`fs.writeFile`)
- Task 3.1d: Write per-thread `messages.json` (`fs.writeFile`)
- Task 3.1e: Copy attachments to local storage (`fs.copyFile`)

**Acceptance Criteria:**
- [ ] Decomposition rule is documented in skill
- [ ] Example decomposition pattern is provided
- [ ] Each decomposed task has named I/O operation
- [ ] Each decomposed task has expected file/path output

#### FR-003: Integration Test Requirement

The skill MUST require at least one integration test for I/O features:
- Test does NOT mock the I/O layer
- Test uses real filesystem (temp directory), real database (test instance), or test server
- Test verifies complete flow: input -> processing -> storage -> retrieval

**Acceptance Criteria:**
- [ ] Integration test requirement is documented
- [ ] Example integration test pattern is provided
- [ ] Clear distinction between unit and integration tests
- [ ] Missing integration test flagged as Important code review issue

#### FR-004: Spec Compliance Matrix

The skill MUST require a spec compliance matrix before claiming implementation complete:
- Extracts every checkbox, task, or numbered item from original spec
- Maps each requirement to specific code location (file:line)
- Maps each requirement to test location (test file:test name)
- Fails verification if any requirement lacks both code AND test evidence

**Matrix format:**

| Spec Requirement | Code Location | Test Location | Verified? |
|------------------|---------------|---------------|-----------|
| Task 3.1: Thread directory creation | `index.ts:234` (fs.mkdir) | `plugin.test.ts:45` | YES |
| Task 3.2: index.json generation | `index.ts:256` (fs.writeFile) | `plugin.test.ts:78` | YES |
| Task 3.3: metadata.json writing | ??? | ??? | **NO** |

**Acceptance Criteria:**
- [ ] Matrix template is documented in skill
- [ ] Matrix extraction algorithm is specified
- [ ] Missing mappings block completion
- [ ] Gap handling requires escalation to user

#### FR-005: E2E Verification Checkpoint

The skill MUST require E2E verification for user-facing features before PR creation:
- Run the application
- Exercise the feature (click button, run command, call API)
- Verify expected behavior (output, no console errors, files appear)
- Provide evidence (screenshot, output, directory listing)

**Acceptance Criteria:**
- [ ] E2E verification step is documented
- [ ] Verification checklist is provided
- [ ] Evidence requirements are specified
- [ ] Failed E2E blocks PR creation

#### FR-006: Types Are Not Implementation Warning

The skill MUST include an explicit warning in Red Flags section:
- Explains the "types defined but I/O not called" failure pattern
- Provides detection algorithm (search for I/O calls, verify call path)
- Provides fix guidance (verify actual I/O call exists before marking complete)

**Acceptance Criteria:**
- [ ] Warning is prominently placed in skill
- [ ] Detection steps are clearly documented
- [ ] Example search patterns provided
- [ ] Fix guidance is actionable

### Non-Functional Requirements

- **Skill Length:** Additions should not significantly increase skill length; use concise, clear language
- **Backward Compatibility:** Existing implement workflows should not break
- **Cross-References:** Link to related skills (verification-before-completion, test-driven-development) without duplicating content

## Implementation Tasks

### Phase 1: Core Verification Gate (Priority: Critical)

- [ ] **Task 1.1**: Add Implementation Verification Gate section after task parsing
  - Location: After "Scope Parsing" section
  - Content: I/O keyword detection, code location verification, integration test check
  - Dependencies: None

- [ ] **Task 1.2**: Add "Types Are Not Implementation" warning to Red Flags section
  - Location: Add to existing Red Flags section or create if absent
  - Content: Failure pattern description, detection algorithm, fix guidance
  - Dependencies: None

### Phase 2: Task Granularity (Priority: High)

- [ ] **Task 2.1**: Add Task Decomposition Rule section
  - Location: After scope parsing, before subagent dispatch
  - Content: Atomicity requirements, decomposition example, I/O operation naming
  - Dependencies: None

- [ ] **Task 2.2**: Update TodoWrite guidance for granular tasks
  - Location: Where TodoWrite usage is documented
  - Content: Require spec-aligned atomic tasks, not phase-level todos
  - Dependencies: Task 2.1

### Phase 3: Integration Testing (Priority: High)

- [ ] **Task 3.1**: Add Integration Test Requirement section
  - Location: Within or after TDD requirements
  - Content: Distinction from unit tests, example pattern, failure flagging
  - Dependencies: None

- [ ] **Task 3.2**: Update code review criteria
  - Location: Code review section
  - Content: Missing integration test = Important issue
  - Dependencies: Task 3.1

### Phase 4: Compliance Verification (Priority: High)

- [ ] **Task 4.1**: Add Spec Compliance Matrix section
  - Location: In Final Verification phase
  - Content: Matrix template, extraction algorithm, verification rules
  - Dependencies: None

- [ ] **Task 4.2**: Add E2E Verification Checkpoint section
  - Location: Before PR creation, after final verification
  - Content: Verification steps, evidence requirements, failure handling
  - Dependencies: None

### Phase 5: Skill Structure Improvements (Priority: Medium)

- [ ] **Task 5.1**: Add checkpoint summary at skill top
  - Location: After overview, before detailed sections
  - Content: Quick reference to critical verification gates
  - Dependencies: Tasks 1.1, 2.1, 3.1, 4.1, 4.2

- [ ] **Task 5.2**: Add mandatory skill invocation references
  - Location: In appropriate sections
  - Content: Cross-references to verification-before-completion, finishing-a-development-branch
  - Dependencies: None

## Architecture

### Skill Section Structure (Proposed)

```
# Implement Skill

## Overview (existing)

## Skill Usage Announcement (existing)

## When to Use (existing)

## Checkpoint Summary (NEW)
  - Quick reference to all verification gates
  - Linked to detailed sections

## Scope Parsing (existing)

## Task Decomposition (NEW)
  - Atomicity requirements
  - I/O operation naming
  - Example decomposition

## Implementation Verification Gate (NEW)
  - I/O keyword detection
  - Code location verification
  - Integration test verification

## Subagent Dispatch (existing, updated)
  - Include verification gate references

## TDD Requirements (existing, updated)
  - Add integration test requirement
  - Distinguish unit vs integration tests

## Code Review (existing, updated)
  - Missing integration test = Important issue

## Final Verification (existing, updated)
  - Add spec compliance matrix requirement
  - Add E2E verification checkpoint

## Red Flags (existing, updated)
  - Add "Types Are Not Implementation" warning

## Blockers (existing)

## Completion (existing, updated)
  - Reference all verification gates passed
```

## Testing Strategy

### Verification Methods

Since this is a skill document (not code), testing involves:

1. **Pattern Testing**: Apply the enhanced skill to scenarios similar to PR #42
2. **Regression Testing**: Verify existing implement workflows still work
3. **Effectiveness Testing**: Track spec compliance rates after enhancement

### Test Scenarios

1. **Scenario: Storage feature implementation**
   - Input: Spec with file storage requirements
   - Expected: Agent decomposes into atomic I/O tasks, provides compliance matrix, verifies files exist

2. **Scenario: API-only feature**
   - Input: Spec with no storage requirements
   - Expected: I/O verification gate does not trigger

3. **Scenario: Missing implementation**
   - Input: Agent defines types but no I/O calls
   - Expected: Verification gate blocks completion with clear error

## Success Criteria

### Launch Criteria

- [ ] All implementation tasks completed
- [ ] Skill document passes internal review
- [ ] Example walkthrough demonstrates all verification gates
- [ ] No regressions in existing implement workflows

### Success Metrics (Post-Launch)

- **Spec compliance rate**: Target >90% (up from 69% in PR #42)
- **Premature completion rate**: Target <5%
- **Integration test presence**: Target 100% for I/O features
- **E2E verification evidence**: Target 100% for user-facing features

## References

### Source Materials

- **Postmortem**: `.wrangler/memos/2026-01-18-imessage-plugin-postmortem.md`
- **Skill Analysis**: `.wrangler/memos/2026-01-18-wrangler-implement-skill-analysis.md`

### Related Specifications

- `000001-testing-verification-enhancement.md` - Related verification improvements

### Skills to Update

- `skills/implement/skill.md` - Primary target of this specification

### Related Skills (Do Not Modify)

- `skills/verification-before-completion/skill.md`
- `skills/test-driven-development/skill.md`
- `skills/finishing-a-development-branch/skill.md`
- `skills/code-review/skill.md`

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **I/O Operation** | File write, database operation, network call, or other side-effecting action |
| **Integration Test** | Test that exercises real I/O without mocking the storage/network layer |
| **Spec Compliance** | Percentage of specification requirements actually implemented |
| **Verification Gate** | Mandatory checkpoint that blocks progress until requirements are met |
| **Task Atomicity** | Property of a task being completable in one focused work session (<30 min) |

### Failure Pattern Reference

The PR #42 failure followed this exact sequence:

1. Read SPEC-000002 specification
2. Created todo list for implementation phases
3. Defined TypeScript interfaces: `IMessageIndex`, `ThreadMessagesFile`, `IMessageThread`
4. Wrote `organizeByThread()` helper method (returns in-memory data structure)
5. Marked "Implement data storage structure" as **COMPLETE**
6. **MISSING**: No `fs.writeFile()`, `fs.mkdir()`, `fs.copyFile()` calls
7. Wrote IPC handlers that read files (which were never created)
8. All 31 unit tests passed (mocked filesystem)
9. Created PR claiming feature complete

**Result**: 69% spec compliance, non-functional storage pipeline
