# Research: Multi-Provider Architecture for Wrangler MCP Issue Management

**Date**: 2026-02-17
**Context**: Exploring how the wrangler MCP server could support GitHub Issues (and eventually Linear) as alternative backends alongside its current markdown-based storage, while keeping the MCP tool interface stable.

---

## 1. Existing Open-Source Projects That Bridge MCP and GitHub Issues

### GitHub's Official MCP Server

The most relevant project is [github/github-mcp-server](https://github.com/github/github-mcp-server) -- GitHub's own official MCP server. It provides:

- **`list_issues`** -- List issues with pagination
- **`create_issue` / `update_issue`** -- Full CRUD with assignees, labels, milestones, state management
- **`get_issue`** -- Retrieve individual issue details
- **`add_issue_comment`** -- Comment on issues/PRs
- Toolset filtering via `--toolsets` flag to control which capabilities are exposed

This server is written in Go and exposes GitHub's API directly. It is not a provider-abstraction layer -- it is GitHub-specific. It would not replace wrangler's provider architecture, but it demonstrates the MCP-to-GitHub-Issues mapping is well-understood.

**Key takeaway**: GitHub's official server proves the MCP-to-GitHub mapping is clean. Wrangler does not need to reinvent that mapping; we can study it and adapt the patterns.

### Other Relevant Projects

| Project | What It Does | Relevance |
|---------|-------------|-----------|
| [saidsef/mcp-github-pr-issue-analyser](https://lobehub.com/mcp/saidsef-mcp-github-pr-issue-analyser) | MCP server for GitHub Issues/PR analysis | Read-focused, not full CRUD |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Comprehensive MCP server directory | Lists dozens of issue-tracker MCP servers |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Official reference MCP server implementations | GitHub server reference implementation |

### Jira MCP Servers (Architecture Reference)

Several Jira MCP servers exist that demonstrate multi-backend issue management patterns:

- [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) -- Official Atlassian remote MCP server for Jira + Confluence
- [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) -- Community server for Atlassian tools
- [cosmix/jira-mcp](https://github.com/cosmix/jira-mcp) -- Jira MCP server with markdown-to-ADF conversion

**Crucially, none of these projects provide a unified abstraction layer over multiple backends.** They are each single-backend MCP servers. Wrangler's provider architecture -- a stable MCP tool interface with swappable backends -- would be novel in this space.

---

## 2. GitHub Issues API Capabilities

### API Surface

**REST API** (well-suited for CRUD operations):
- `POST /repos/{owner}/{repo}/issues` -- Create issue
- `PATCH /repos/{owner}/{repo}/issues/{issue_number}` -- Update issue
- `GET /repos/{owner}/{repo}/issues/{issue_number}` -- Get issue
- `GET /repos/{owner}/{repo}/issues` -- List issues (with filters)
- `GET /repos/{owner}/{repo}/issues/{issue_number}/comments` -- Comments
- Full label, milestone, and assignee management endpoints

**GraphQL API** (better for complex queries, Projects V2):
- Bulk operations and nested queries
- Projects V2 management (boards, custom fields)
- More efficient for listing + filtering

### Field Mapping: Wrangler Issue Model vs GitHub Issues

| Wrangler Field | GitHub Equivalent | Mapping Complexity |
|---------------|-------------------|-------------------|
| `id` (ISS-000001) | `number` (integer) | **Gap** -- see ID section below |
| `title` | `title` | Direct |
| `description` | `body` | Direct (both markdown) |
| `type` (issue/spec/idea) | None native | **Gap** -- use labels (e.g., `type:specification`) |
| `status` (open/in_progress/closed/cancelled) | `state` (open/closed) + `state_reason` (completed/not_planned/reopened) | **Partial gap** -- `in_progress` has no equivalent; use labels or Projects V2 status |
| `priority` (low/medium/high/critical) | None native | **Gap** -- use labels (e.g., `priority:high`) or Projects V2 custom fields |
| `labels` | `labels` | Direct |
| `assignee` | `assignees[]` | Wrangler is single-assignee, GitHub is multi |
| `project` | Projects V2 association | Requires GraphQL API |
| `createdAt` | `created_at` | Direct |
| `updatedAt` | `updated_at` | Direct |
| `closedAt` | `closed_at` | Direct |
| `wranglerContext` | None | Store as structured data in body (e.g., a YAML block) or use custom project fields |

### Key Gaps and Solutions

**1. No native `priority` field:**
- **Option A**: Label convention -- `priority:low`, `priority:medium`, `priority:high`, `priority:critical`
- **Option B**: Projects V2 Single Select custom field named "Priority"
- **Recommendation**: Labels for simplicity; Projects V2 if the user is already using GitHub Projects

**2. No native `type` field (issue/specification/idea):**
- **Option A**: Label convention -- `type:issue`, `type:specification`, `type:idea`
- **Option B**: Separate repos or separate label-based views
- **Recommendation**: Labels. Simple and queryable.

**3. `in_progress` status:**
- GitHub only has `open` and `closed`. `state_reason` helps distinguish `closed` vs `cancelled` (closed + not_planned).
- `in_progress` would need to be a label (`status:in-progress`) or a Projects V2 status field.
- **Recommendation**: Label convention. When an issue has label `status:in-progress`, wrangler maps it to `in_progress`. Absence of the label + state=open maps to `open`.

**4. `wranglerContext` (agentId, parentTaskId, estimatedEffort):**
- No GitHub equivalent.
- **Option A**: Embed as structured YAML block at the bottom of the issue body
- **Option B**: Store in a Projects V2 custom text field
- **Option C**: Maintain a local metadata sidecar file (`.wrangler/sync/github-metadata.json`)
- **Recommendation**: YAML block at the end of the body, fenced and clearly marked. This keeps everything in one place and is human-readable.

### Rate Limits

| Auth Method | Limit | Notes |
|-------------|-------|-------|
| Personal Access Token (PAT) | 5,000 req/hr | Standard for individual developer use |
| GitHub App (Enterprise Cloud) | 15,000 req/hr | Higher tier |
| GITHUB_TOKEN (Actions) | 1,000 req/hr per repo | For CI/CD sync scenarios |
| Unauthenticated | 60 req/hr | Not viable |
| Secondary limits | 100 concurrent, 900 points/min | Prevents abuse |

**For wrangler's use case** (individual developer, interactive MCP calls): 5,000 req/hr with a PAT is more than sufficient. A typical session might make 20-50 issue-related API calls. Rate limiting is a non-issue for the primary use case.

### Authentication

- **PAT (classic or fine-grained)**: Simplest for individual developers. Store in environment variable.
- **GitHub App**: Better for multi-user or organizational use. More complex setup.
- **Recommendation**: Support PAT first (`GITHUB_TOKEN` env var). This is what the official GitHub MCP server uses.

---

## 3. Architecture Considerations

### Current Provider Architecture

Wrangler already has a clean provider abstraction. The key files:

- `/Users/sam/medb/projects/wrangler/mcp/src/providers/base.ts` -- Abstract `IssueProvider` class with 10 methods
- `/Users/sam/medb/projects/wrangler/mcp/src/providers/markdown.ts` -- `MarkdownIssueProvider` (597 lines)
- `/Users/sam/medb/projects/wrangler/mcp/src/providers/factory.ts` -- `ProviderFactory` with config-driven instantiation
- `/Users/sam/medb/projects/wrangler/mcp/src/types/config.ts` -- `IssueProviderConfig` type
- `/Users/sam/medb/projects/wrangler/mcp/src/types/issues.ts` -- `Issue`, `IssueCreateRequest`, etc.

The factory already uses a `switch` on `issueConfig.provider` (currently supports `'markdown'` and `'mock'`). Adding `'github'` is structurally trivial.

### How a `GitHubIssueProvider` Would Implement the Interface

```
abstract class IssueProvider:
  createIssue(request)    -> POST /repos/{owner}/{repo}/issues
  getIssue(id)            -> GET /repos/{owner}/{repo}/issues/{number}
  updateIssue(request)    -> PATCH /repos/{owner}/{repo}/issues/{number}
  deleteIssue(id)         -> PATCH to close + label "deleted" (GitHub issues can't be deleted via API)
  listIssues(filters)     -> GET /repos/{owner}/{repo}/issues + filter params
  searchIssues(options)   -> GET /search/issues?q=...
  getLabels()             -> GET /repos/{owner}/{repo}/labels
  getAssignees()          -> GET /repos/{owner}/{repo}/assignees
  getProjects()           -> GraphQL query for Projects V2
  isHealthy()             -> GET /repos/{owner}/{repo} (auth check)
```

**Notable implementation detail**: `deleteIssue()` cannot truly delete a GitHub issue (the API does not support deletion). Options:
- Close the issue with a `wrangler:deleted` label
- Transfer to a "trash" repo
- Simply close with `state_reason: not_planned`

### The ID Problem

This is the most significant architectural challenge.

**Wrangler's current IDs**: Sequential, prefixed, zero-padded (`ISS-000001`, `SPEC-000044`). Generated locally by scanning existing files.

**GitHub's IDs**: Sequential integers per-repo (`#1`, `#2`, `#3`). Assigned by GitHub on creation. Cannot be controlled.

**Options**:

1. **Use GitHub issue numbers as IDs**: Change wrangler's ID format when using GitHub provider. IDs become `#42` instead of `ISS-000042`. Simplest but breaks the consistent naming convention.

2. **Dual-ID system**: Each issue has both a wrangler ID (`ISS-000001`) and a GitHub issue number (`#42`). Store the mapping in the issue's `metadata` field (which already exists in the `Issue` type). The wrangler ID would be stored as a label or in the issue body.

3. **Use wrangler ID as the canonical ID, derive from GitHub number**: When creating via GitHub provider, take the GitHub-assigned number and format it as `ISS-000042`. This works if the repo is dedicated to wrangler issues and numbering starts at 1. Breaks if the repo has pre-existing issues.

4. **Wrangler ID in body/metadata only, GitHub number for API calls**: Internally use GitHub numbers for all API operations but present wrangler-formatted IDs to the user. Maintain a local mapping file.

**Recommendation**: Option 2 (dual-ID). The `Issue` type already has a `metadata?: Record<string, any>` field. Store `metadata.githubNumber` for the GitHub issue number. When using the GitHub provider, `getIssue("ISS-000042")` would look up the mapping. This preserves wrangler's ID conventions while allowing GitHub's natural numbering.

### Offline/Local-First vs Online-First

The provider choice inherently determines the connectivity model:

| Aspect | Markdown Provider | GitHub Provider |
|--------|------------------|-----------------|
| Connectivity | Fully offline | Requires network |
| Latency | Instant (filesystem) | API latency (100-500ms per call) |
| Source of truth | Local files | GitHub |
| Collaboration | Via git push/pull | Native (GitHub UI) |
| Audit trail | Git history | GitHub activity log |

**For the GitHub provider, the stance should be: GitHub is the source of truth.** The provider is online-first. If the network is unavailable, operations fail gracefully with a clear error.

A hybrid approach (local cache + sync) adds enormous complexity for marginal benefit in the MCP context, where the AI agent is already expected to have network access.

### Sync Strategies

Given that the provider is configured per-project (not per-call), the question of sync only arises if someone wants to migrate between providers or keep both in sync.

| Strategy | Description | Complexity | Recommendation |
|----------|-------------|------------|----------------|
| **No sync** | Pick one provider, use it exclusively | None | Default and simplest |
| **One-time migration** | Script to push markdown issues to GitHub (or vice versa) | Low | Provide as a migration skill |
| **Push-only sync** | Markdown is source of truth, GitHub Action pushes to GitHub Issues | Medium | Good for visualization |
| **Pull-only sync** | GitHub is source of truth, periodic pull to markdown | Medium | Good for offline backup |
| **Bidirectional** | Both sides are authoritative, conflict resolution needed | Very high | Avoid unless explicitly required |

**Recommendation**: Start with "no sync" (provider is exclusive). Provide a one-time migration tool as a skill. If push-only sync is desired later, implement it as a GitHub Action (as sketched in the existing research memo at `/Users/sam/medb/projects/wrangler/.wrangler/memos/2025-12-17-github-issues-sync-research.md`).

### Configuration Model

The `IssueProviderConfig` type in `/Users/sam/medb/projects/wrangler/mcp/src/types/config.ts` would expand:

```typescript
export interface IssueProviderConfig {
  provider: 'markdown' | 'github' | 'linear' | 'mock';
  settings?: MarkdownProviderSettings | GitHubProviderSettings | LinearProviderSettings;
  defaultLabels?: string[];
  autoAssignment?: boolean;
}

export interface GitHubProviderSettings {
  /** GitHub repository in owner/repo format */
  repository: string;
  /** Authentication token (or read from GITHUB_TOKEN env var) */
  token?: string;
  /** Label prefix for wrangler metadata labels */
  labelPrefix?: string;  // default: "wrangler:"
  /** Whether to use Projects V2 for status/priority */
  useProjects?: boolean;
  /** Projects V2 board ID (if useProjects is true) */
  projectId?: string;
}
```

---

## 4. Linear API as a Future Option

### Linear API Overview

Linear provides a [GraphQL API](https://linear.app/developers/graphql) at `https://api.linear.app/graphql`. Key characteristics:

- **GraphQL-only** (no REST API)
- **Rich issue model**: Issues natively have priority (0-4: none/urgent/high/medium/low), status (custom per-team workflow states), labels, assignees, projects, cycles, estimates
- **SDK available**: `@linear/sdk` npm package wraps the GraphQL API
- **Webhooks**: Full event support for issues, comments, labels, projects

### Linear-to-Wrangler Field Mapping

| Wrangler Field | Linear Equivalent | Mapping Quality |
|---------------|-------------------|-----------------|
| `id` | `identifier` (e.g., "ENG-123") | Excellent -- Linear already uses team-prefix + number |
| `title` | `title` | Direct |
| `description` | `description` (markdown) | Direct |
| `type` | Labels | Same gap as GitHub |
| `status` | `state.name` (custom workflow states) | Better than GitHub -- Linear has configurable states like "In Progress" |
| `priority` | `priority` (0-4 integer) | Direct mapping possible (0=none, 1=urgent/critical, 2=high, 3=medium, 4=low) |
| `labels` | `labels` | Direct |
| `assignee` | `assignee` | Direct (single assignee like wrangler) |
| `project` | `project` | Direct |
| `createdAt` | `createdAt` | Direct |
| `updatedAt` | `updatedAt` | Direct |

Linear is arguably the best-fitting external backend because:
- Its `identifier` format (team prefix + number) maps cleanly to wrangler's ID format
- It has native priority as a first-class field
- It has configurable workflow states that can represent `in_progress`
- Single assignee model matches wrangler

### Existing Linear MCP Servers

| Project | Notes |
|---------|-------|
| [Linear's official MCP server](https://linear.app/docs/mcp) | Centrally hosted, managed by Linear |
| [tacticlaunch/mcp-linear](https://github.com/tacticlaunch/mcp-linear) | Open source, full CRUD |
| [jerhadf/linear-mcp-server](https://github.com/jerhadf/linear-mcp-server) | Community implementation |
| [cline/linear-mcp](https://github.com/cline/linear-mcp) | Built for Cline AI assistant |

Linear's official MCP server is the most polished option and could serve as a reference implementation.

### Linear Rate Limits

Linear's API allows 1,500 requests per hour per user/application. This is lower than GitHub but still adequate for interactive MCP use.

---

## 5. Prior Art in This Codebase

### Existing Research

The file at `/Users/sam/medb/projects/wrangler/.wrangler/memos/2025-12-17-github-issues-sync-research.md` contains prior research from December 2025 focused specifically on syncing markdown issues to GitHub for visualization purposes. It covers:

- Existing bidirectional sync tools (github-project-todo-md, SyncLinear)
- One-way tools (gh2md, bulk-issue-creator, etc.)
- GitHub APIs (REST + GraphQL + Webhooks)
- Three options: push-to-sync, full bidirectional, extend existing tools
- A concrete GitHub Action sketch for push-only sync
- Frontmatter extension with `githubIssue` field

That research was oriented toward "keep markdown as source of truth, push to GitHub for visualization." The current research is more ambitious: making GitHub Issues a first-class alternative provider where GitHub _is_ the source of truth.

### Provider Architecture Already in Place

The codebase is well-prepared for multi-provider support:

1. **Abstract base class** (`/Users/sam/medb/projects/wrangler/mcp/src/providers/base.ts`): Clean 10-method interface, no markdown-specific assumptions.

2. **Factory pattern** (`/Users/sam/medb/projects/wrangler/mcp/src/providers/factory.ts`): Config-driven provider selection. The `switch` statement in `createIssueProvider()` just needs a new `case 'github':` branch.

3. **Type system** (`/Users/sam/medb/projects/wrangler/mcp/src/types/issues.ts`): The `Issue` type already has a `metadata?: Record<string, any>` field that can hold provider-specific data (GitHub number, Linear identifier, etc.).

4. **Config type** (`/Users/sam/medb/projects/wrangler/mcp/src/types/config.ts`): The `IssueProviderConfig.provider` field is a string union that can be extended. The `settings` field already uses a type that could become a discriminated union.

The architecture is ready for this. The hard part is not the abstraction -- it is the impedance mismatch between wrangler's model and each external system.

---

## Trade-offs Summary

| Approach | Effort | Value | Risk |
|----------|--------|-------|------|
| GitHub provider (online-first, no sync) | Medium (2-4 days) | High -- teams get GitHub UI | GitHub-specific gaps (priority, status) need convention |
| Bidirectional sync (markdown + GitHub) | Very high (weeks) | Medium -- complexity often outweighs benefit | Conflict resolution, eventual consistency issues |
| Push-only sync (markdown -> GitHub Action) | Low (1 day) | Medium -- GitHub visualization only | One-way, can get out of sync if edited in GitHub |
| Linear provider | Medium (2-3 days) | High for Linear users | Smaller user base than GitHub |

---

## Recommendations

### Phase 1: GitHub Provider (MVP)

1. **Create `GitHubIssueProvider`** implementing `IssueProvider` abstract class
2. **Use Octokit** (`@octokit/rest`) as the GitHub API client -- it is the standard TypeScript SDK
3. **Convention-based mapping** for missing fields: labels for priority (`priority:high`), labels for type (`type:specification`), labels for in-progress status (`status:in-progress`)
4. **Dual-ID system**: Wrangler IDs stored in issue body metadata block; GitHub numbers stored in `metadata.githubNumber`
5. **Online-first**: No local caching, fail gracefully on network errors
6. **Config**: `GITHUB_TOKEN` env var for auth, `repository` in settings
7. **Deletion**: Close with `state_reason: not_planned` and `wrangler:archived` label (GitHub API cannot delete issues)

### Phase 2: Migration Tooling

1. **`wrangler:migrate-issues` skill**: One-time migration from markdown to GitHub or vice versa
2. **ID mapping file**: `.wrangler/sync/provider-mapping.json` for cross-referencing IDs during migration

### Phase 3: Linear Provider

1. **Easier mapping** than GitHub (native priority, flexible states, prefix-based IDs)
2. **Use `@linear/sdk`** npm package
3. **Same pattern** as GitHub provider

### What to Avoid

- **Bidirectional sync** unless there is a concrete user need. The complexity is disproportionate to the benefit.
- **Local caching** for the GitHub provider. It creates stale data problems. The MCP context assumes network availability.
- **Custom fields via Projects V2** in Phase 1. Labels are simpler and do not require GitHub Projects to be set up.

---

## Sources

- [github/github-mcp-server](https://github.com/github/github-mcp-server) -- GitHub's official MCP server
- [GitHub MCP Server Docs](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp/use-the-github-mcp-server) -- Usage documentation
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) -- MCP server directory
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) -- Official MCP reference servers
- [Linear MCP Server Docs](https://linear.app/docs/mcp) -- Linear's official MCP server
- [tacticlaunch/mcp-linear](https://github.com/tacticlaunch/mcp-linear) -- Open source Linear MCP server
- [Linear GraphQL API](https://linear.app/developers/graphql) -- Linear developer docs
- [atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server) -- Atlassian official MCP server
- [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) -- Community Atlassian MCP server
- [MCP GitHub PR/Issue Analyser](https://lobehub.com/mcp/saidsef-mcp-github-pr-issue-analyser)
- [GitHub Rate Limits Guide](https://www.lunar.dev/post/a-developers-guide-managing-rate-limits-for-the-github-api)
