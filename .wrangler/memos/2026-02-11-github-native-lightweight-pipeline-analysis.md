# Memo: GitHub-Native Lightweight Pipeline as Alternative to Spec 44

**Date:** 2026-02-11
**Author:** Claude (research synthesis)
**Context:** Evaluating whether a GitHub-native approach (labels, branch conventions, required checks, GitHub Issues) could achieve spec-to-PR quality gates more simply than Spec 44's Agent SDK pipeline.

---

## The Question

Spec 44 designs a deterministic pipeline using the Claude Agent SDK where TypeScript code orchestrates separate `query()` calls for each phase (analyze, implement, review, fix, verify, publish). The code controls sequencing; LLMs cannot skip phases.

The alternative being evaluated: could we get 80% of the value by leaning on GitHub's existing infrastructure? Specifically:

1. **PR labels/tags** to route different review types (issues-only, code review, spec compliance)
2. **Required status checks** as merge gates (all must pass before merge)
3. **GitHub Actions** to trigger LLM review automatically after implementation
4. **GitHub Issues** instead of local `.wrangler/issues/` for less brittleness

---

## Finding 1: GitHub Can Absolutely Do Label-Routed Review Gates

This part is well-supported by existing infrastructure. The building blocks:

**Automatic labeling** via `actions/labeler` based on changed file paths. A PR touching `pipeline/` gets labeled `pipeline`, one touching `skills/` gets `skills`, etc. You can also label based on branch naming convention (`feat/*` -> `feature`, `fix/*` -> `bugfix`).

**Conditional workflows** using `contains(github.event.pull_request.labels.*.name, 'label-name')`:

```yaml
jobs:
  spec-compliance:
    if: contains(github.event.pull_request.labels.*.name, 'spec-compliance')
    # Full spec compliance review with Claude

  code-review:
    if: contains(github.event.pull_request.labels.*.name, 'needs-code-review')
    # Standard code quality review

  issues-only:
    if: "!contains(github.event.pull_request.labels.*.name, 'needs-code-review')"
    # Lightweight check - just verify issues are linked and updated
```

**Required status checks** via branch protection or rulesets. Each job name becomes a check that can be required before merge. Rulesets are the newer, more flexible option -- they can apply at the org level and stack multiple rules.

**The gotcha:** Skipped jobs report as "Success." If `spec-compliance` is a required check but the PR doesn't have the `spec-compliance` label, the job skips and GitHub considers it passed. You need a gate job that always runs:

```yaml
gate:
  runs-on: ubuntu-latest
  needs: [spec-compliance, code-review]
  if: always()
  steps:
    - name: Validate required reviews ran
      run: |
        # Check that the right reviews ran based on labels
        if [[ "${{ needs.spec-compliance.result }}" == "skipped" ]] && \
           label_should_require_spec_review; then
          echo "Spec compliance review was required but skipped"
          exit 1
        fi
```

**Bottom line:** This is entirely doable and not complex. You could have a working label-routed review system in a single afternoon.

---

## Finding 2: The Automatic Review-After-Implementation Problem is Harder Than It Looks

This is where you correctly identified the complexity. There are two sub-problems:

### Sub-Problem A: Triggering the Review

After an implementation agent finishes a task and pushes a commit, you need a review to fire automatically. GitHub provides `pull_request: synchronize` which fires on every push to a PR branch. This is the natural trigger.

The danger is infinite loops: push -> review -> remediation push -> review -> remediation push -> ... You must implement a circuit breaker. Options:

- **Label-based counter:** Add `ai-review-round-1`, `ai-review-round-2` labels. Stop at round 3.
- **Commit message convention:** Skip review if last commit message contains `[skip-review]` or was authored by the bot.
- **PR comment state:** Check if a "review complete" comment already exists for the current HEAD SHA.

### Sub-Problem B: Getting the Right Context to the Remediation Agent

This is the real pain point. When a review finds issues, the fix agent needs to know:
- What was the implementation intent?
- What specific issues were found?
- Where in the code are they?
- What's the spec requirement that's being violated?

**In-session (Spec 44's approach):** The fix agent inherits full context. The review output is a Zod-validated JSON blob passed directly to the next `query()` call. Zero context loss. This is the approach's greatest strength.

**Cross-workflow (GitHub Actions approach):** Context must be serialized and reconstructed. The mechanisms available:

| Method | Fidelity | Complexity | Limitation |
|--------|----------|------------|------------|
| Job outputs (`needs.review.outputs.findings`) | High for structured data | Low | Same workflow only; string size limits |
| Artifacts (upload/download JSON) | High | Medium | 90-day retention; I/O latency |
| `repository_dispatch` payload | High | Medium | 65KB limit; **default branch only** |
| PR comments | Low (markdown parsing) | Low | Fragile parsing; size limits |
| Claude Code Action structured output | High | Low | Requires `--json-schema` flag |

The best option for GitHub-native is **job outputs within a single workflow** where review and remediation are separate jobs in the same workflow file. The `claude-code-action@v1` supports structured JSON output, so the review job can output a validated findings list that the remediation job reads directly.

The `workflow_run` trigger (chaining separate workflows) is limited to **3 levels deep** -- which is exactly implement -> review -> remediate, so you hit the ceiling immediately with no room for re-review. This is a hard GitHub constraint.

### The Verdict on This Sub-Problem

**A hybrid approach is optimal:** Do the tight review/fix loop in-session (Spec 44 style) where context is rich and latency is low. Then use an external GitHub Action as a **verification gate** -- a second opinion from a different prompt/persona that catches what same-model bias misses. This external check creates the audit trail and serves as the required status check.

Nick Tune (O'Reilly, "Auto-Reviewing Claude's Code") captures this well: "multiplying feedback cycles proves more effective than attempting to enforce compliance through initial instructions alone." The in-session subagent is the first cycle (fast, context-rich). The GitHub Action is the second cycle (independent, auditable).

---

## Finding 3: GitHub Issues vs Local Issues -- A Real Tradeoff

You identified the brittleness concern: if conventions change (an issue isn't filed, a label is missing, a branch doesn't follow naming convention), the whole system breaks silently.

### What GitHub Issues Give You

- **Native linking:** PRs auto-close issues via `Fixes #123` in commit messages. No custom convention needed.
- **Native labels, milestones, projects:** Built-in metadata without frontmatter schemas to maintain.
- **GitHub MCP Server:** Anthropic's official GitHub MCP tools provide 20+ tools for issues/PRs including `create_issue`, `update_issue`, `create_pull_request`, `create_and_submit_pull_request_review`, etc. Claude Code can use these natively.
- **No schema drift:** GitHub's API is versioned and stable. Your frontmatter schema can't silently break.
- **Team visibility:** Everyone sees issues in the GitHub UI without needing to understand `.wrangler/` conventions.
- **GitHub Issue Forms:** YAML-defined forms with structured fields (dropdowns, checkboxes) that output machine-parseable issue bodies.

### What You Lose

- **Speed:** GitHub API calls are 100-300ms each vs instant local file reads. For a pipeline creating/updating 10 issues, that's seconds of overhead.
- **Offline capability:** Can't work without network. Not a real concern for CI/CD, but matters for local dev.
- **Custom query semantics:** Wrangler's MCP tools support `wranglerContext` fields (parentTaskId, estimatedEffort, agentId) that map perfectly to agent workflows. GitHub Issues has no equivalent structured metadata -- you'd use labels or issue body sections as workarounds.
- **Concurrent ID generation:** Wrangler has a race condition with parallel issue creation. GitHub does not (auto-incrementing IDs are server-side).
- **Provider abstraction:** Wrangler already has an `IssueProvider` abstract base class with `createIssue`, `getIssue`, `updateIssue`, `listIssues`, `searchIssues`. A `GitHubIssueProvider` could slot in without changing any tool code. The factory pattern is already there.

### The Brittleness Question

Both approaches have brittleness, just different kinds:

| Failure Mode | Local (.wrangler/) | GitHub Issues |
|-------------|-------------------|---------------|
| Schema drift | YAML frontmatter breaks silently | API is versioned, errors are explicit |
| Convention violation | Agent doesn't create issue, nothing tracks it | Same -- agent must call API |
| Missing link (issue <-> PR) | Manual convention (wranglerContext.parentTaskId) | Native (`Fixes #123`) but still requires convention |
| Label inconsistency | Agent applies wrong labels | Same |
| Permissions | File system always accessible | API tokens can expire, rate limits hit |

The honest answer: **GitHub Issues doesn't eliminate brittleness. It changes the failure mode from "silent schema drift" to "API errors and rate limits."** The bigger win is that GitHub's conventions are more widely understood and tooled -- every CI/CD system knows how to interact with GitHub Issues, while `.wrangler/issues/` is a custom format.

---

## Finding 4: What a "Lightweight GitHub-Native Model" Actually Looks Like

Putting it all together, here's the most viable lightweight alternative:

### Architecture

```
Developer/Agent creates PR
    |
    v
[Auto-Labeler] (based on branch name + changed files)
    |-- feat/* branch     -> label: "feature", "needs-spec-review"
    |-- fix/* branch      -> label: "bugfix", "needs-code-review"
    |-- chore/* branch    -> label: "chore", "needs-quick-review"
    |-- issues/* modified -> label: "issues-only"
    |
    v
[GitHub Actions Workflow] (single workflow, multiple conditional jobs)
    |
    |-- Job: tests (always runs)
    |     Tests + lint + build
    |
    |-- Job: code-review (if: needs-code-review OR feature)
    |     claude-code-action with /review prompt
    |     Outputs structured findings JSON
    |     Posts inline PR comments
    |
    |-- Job: spec-compliance (if: needs-spec-review)
    |     claude-code-action with custom prompt
    |     Reads linked GitHub Issue/spec
    |     Verifies requirements coverage
    |
    |-- Job: remediate (if: code-review found issues)
    |     needs: code-review
    |     Reads findings from job output
    |     claude-code-action fixes issues
    |     Pushes fix commit
    |
    |-- Job: gate (always runs, validates all required jobs passed)
    |
    v
[Branch Protection / Ruleset]
    Requires: tests, gate
    All must pass before merge
    |
    v
[Auto-merge] (optional, if enabled)
    Merges when all checks green
```

### What This Gets You

- Review gates enforced by GitHub (not LLM compliance)
- Different review depth based on PR type (automatic routing)
- Audit trail visible in PR (comments, check annotations)
- Auto-remediation with context passing via job outputs
- Circuit breaker via label-based iteration tracking
- Works with existing GitHub tooling (branch protection, auto-merge, merge queue)

### What This Doesn't Get You (vs Spec 44)

| Capability | Spec 44 Pipeline | GitHub-Native |
|-----------|-----------------|---------------|
| Deterministic phase ordering | Code-controlled, guaranteed | Workflow-level, mostly guaranteed |
| Agent isolation per phase | Separate `query()` calls, clean contexts | Separate jobs, but shared runner cache |
| Structured inter-phase output | Zod-validated schemas | JSON via job outputs (no Zod) |
| In-session review with full context | Yes (subagent model) | No (review is a separate job) |
| Resumability from checkpoint | Built-in | Not built-in (would need custom state) |
| Retry logic in code | `for` loop with counter | Label-based or commit-based tracking |
| Works without GitHub | Yes (local execution) | No |
| Per-task implement/review/fix | Yes (loop per task) | No (whole-PR review only) |

---

## Finding 5: The Two Approaches Are Complementary, Not Competing

The key insight from this research is that Spec 44 and the GitHub-native approach solve different problems:

**Spec 44** solves: "How do I ensure every phase of implementation actually runs, with the right context, and the LLM can't skip quality gates?"

**GitHub-native** solves: "How do I create visible, enforceable merge gates that create an audit trail and integrate with standard team workflows?"

The optimal architecture uses both:

1. **Spec 44 pipeline runs locally/in CI.** It orchestrates the implementation with in-session review/fix loops (fast, context-rich, deterministic).

2. **The pipeline's publish phase creates a PR.** The PR gets auto-labeled based on branch convention and content.

3. **GitHub Actions fire on the PR.** An external review (different persona, different prompt) runs as a required check. This catches what same-model bias misses and creates the audit trail.

4. **Branch protection enforces the gate.** The PR cannot merge until external review passes.

5. **Issues live where they make sense.** Implementation tasks stay in `.wrangler/issues/` (fast, agent-optimized, structured metadata). The spec and its associated GitHub Issue serve as the human-facing tracking point. The wrangler `GitHubIssueProvider` is a future enhancement that could unify these.

---

## Recommendation

**Don't choose between Spec 44 and GitHub-native. Layer them.**

- **Phase 1 (now):** Implement Spec 44 as planned. It solves the hardest problem (deterministic execution, context preservation, in-session review).

- **Phase 2 (after Spec 44 works):** Add a GitHub Actions workflow that fires on PRs created by the pipeline. This is a single YAML file -- lightweight to create and maintain. It provides the external verification gate and audit trail.

- **Phase 3 (if/when needed):** Implement a `GitHubIssueProvider` for wrangler's MCP tools. The provider abstraction already exists (`IssueProvider` abstract class, `ProviderFactory` with switch statement). This would let you use GitHub Issues as the backing store while keeping the same MCP tool interface.

The GitHub-native approach on its own is viable for simpler projects but doesn't solve the core problem Spec 44 addresses: LLMs skip phases when phases are defined as instructions. You need code-controlled sequencing for that. GitHub Actions can enforce the *output* gate (PR can't merge) but can't enforce the *process* gate (review actually ran with proper context during implementation).

---

## Sources

Research conducted via parallel subagent investigations covering:

- Anthropic's `claude-code-action` and `claude-code-security-review` GitHub Actions
- GitHub branch protection, rulesets, required status checks, auto-merge, merge queues
- PR label routing with `contains()` expressions and `actions/labeler`
- Workflow chaining: `workflow_run` (3-level limit), `repository_dispatch` (default-branch only), reusable workflows (10-level)
- Cross-workflow context passing: artifacts, job outputs, client payloads, PR comments, structured outputs
- GitHub Check Runs API and Commit Statuses API
- AI code review tools landscape: CodeRabbit, Copilot, Greptile, Qodo/PR-Agent, Ellipsis, Sourcery
- Nick Tune's "Auto-Reviewing Claude's Code" (O'Reilly) on in-session review patterns
- GitHub Issues API, Issue Forms, MCP tools, vs local issue tracking tradeoffs
- Wrangler's existing `IssueProvider` abstraction and `ProviderFactory`
