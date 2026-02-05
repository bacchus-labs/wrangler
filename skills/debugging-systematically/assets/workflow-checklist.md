# Systematic Debugging Checklist

Copy this checklist and track your progress:

## Problem Definition
- [ ] Reproduce the bug
- [ ] Document steps to reproduce
- [ ] Identify expected vs actual behavior
- [ ] Capture error messages/stack traces

## Hypothesis Formation
- [ ] List possible causes
- [ ] Prioritize hypotheses
- [ ] Identify verification methods

## Investigation
- [ ] Add logging/debugging output
- [ ] Test hypothesis 1
- [ ] Test hypothesis 2
- [ ] Narrow down root cause

## Root Cause Analysis
- [ ] Identify exact line/component
- [ ] Understand why it fails
- [ ] Document root cause

## Fix Implementation
- [ ] Write failing test (RED)
- [ ] Implement fix (GREEN)
- [ ] Refactor if needed
- [ ] Verify fix works

## Verification
- [ ] Original test case passes
- [ ] No regressions introduced
- [ ] Edge cases handled

## Documentation
- [ ] Document root cause
- [ ] Add preventive measures
- [ ] Update tests
