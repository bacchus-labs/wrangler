---
id: SPEC-000046
title: >-
  Wrangler MCP Server Modernization: Context Efficiency, Batch Operations, and
  Spec Compliance
type: specification
status: open
priority: high
labels:
  - specification
  - mcp
  - context-efficiency
  - performance
createdAt: '2026-02-15T01:04:38.540Z'
updatedAt: '2026-02-15T01:04:38.540Z'
---
# Specification: Wrangler MCP Server Modernization

## Executive Summary

**What:** Comprehensive upgrade of the wrangler MCP server to address context efficiency, batch operations, provider performance, error handling consistency, and compliance with MCP spec features introduced in 2025.

**Why:** The MCP server returns too much data by default, lacks batch operations causing N+1 query patterns, has inconsistent error handling, and doesn't leverage newer MCP spec features (tool annotations, structured outputs, cursor pagination). Real-world usage shows agents burning 10-12k tokens per spec retrieval and making unnecessary round-trips for common compound operations.

**Scope:**
- Included: Context-efficient response modes, batch read/write tools, tool annotations, cursor pagination, provider caching, error handling standardization, structured output schemas
- Excluded: Provider architecture changes (GitHub/Linear backends), OAuth/auth (local plugin), OpenTelemetry integration, dynamic toolset patterns (unnecessary at 16 tools)

## Goals and Non-Goals

### Goals

- Reduce token consumption for common agent workflows (browsing issues, reviewing specs) by 60-80%
- Eliminate N+1 query patterns with batch operations
- Align with MCP spec 2025-06-18+ features (tool annotations, outputSchema)
- Standardize error handling for reliable LLM recovery
- Improve provider performance for workspaces with 100+ issues

### Non-Goals

- Replacing the markdown storage provider
- Adding network-facing auth (OAuth, mTLS)
- Implementing dynamic toolset discovery (search/describe/execute) -- our 16 tools don't warrant this
- Adding OpenTelemetry/distributed tracing
- Changing the stdio transport model

## Background & Context

### Problem Statement

Agents using the wrangler MCP encounter three categories of friction:

1. **Context waste**: `issues_get` returns full markdown bodies (10-12k tokens for specs). `issues_list` returns full Issue objects including descriptions in metadata. An agent reviewing 5 specs to find the right one burns 50-100k tokens on exploration alone.

2. **Round-trip overhead**: No batch read operation means fetching 10 related tasks requires 10 separate `issues_get` calls. No batch update means marking 10 tasks as in_progress requires 10 `issues_update` calls.

3. **Inconsistent behavior**: Issue tools return raw `{ content, isError: true }` error objects while session tools use the structured `createErrorResponse()` helper with MCPErrorCode. Error messages don't guide LLM recovery.

### Current State

- 16 tools: 11 issue management + 5 session management
- Markdown-based storage with YAML frontmatter
- `issues_list` has `limit`/`offset` but no cursor pagination
- `issues_get` always returns full content, no field selection
- No tool annotations, no outputSchema, no structured outputs
- Provider reads all files for every list/search operation, no caching
- Error handling split between two patterns

### Proposed State

- Same 16 + 3 new tools (batch get, batch update, aggregation)
- All tools annotated with behavioral hints
- Response verbosity controllable via parameters
- Cursor-based pagination following MCP spec
- In-memory provider cache with TTL and write-through invalidation
- Consistent error handling with LLM-recovery guidance

## Requirements

### Functional Requirements

#### Context Efficiency

- **FR-001:** `issues_list` MUST accept a `format` parameter with values `full` (default, backward-compatible), `summary` (id, title, status, priority, labels, dates), and `minimal` (id, title, status only)
- **FR-002:** `issues_get` MUST accept an optional `fields` parameter to request specific fields (e.g., `["title", "status", "labels"]`). When `fields` is provided, only requested fields are returned. When omitted, full content is returned (backward-compatible).
- **FR-003:** `issues_search` MUST accept an `includeDescription` boolean parameter (default: false). When false, search results include only metadata, not description excerpts.
- **FR-004:** `issues_list` and `issues_search` MUST support cursor-based pagination per MCP spec 2025-03-26. Response MUST include `nextCursor` when more results exist. Request MUST accept `cursor` parameter. Cursor MUST be an opaque string.
- **FR-005:** When paginated results have more pages, the text response MUST include an explicit prompt: "N more items match. Pass cursor 'X' to see next page." (Models ignore structured-only pagination cues.)

#### Batch Operations

- **FR-006:** System MUST provide an `issues_get_batch` tool that accepts an array of issue IDs (max 50) and returns all matching issues in a single response. MUST support the same `fields` parameter as `issues_get`.
- **FR-007:** System MUST provide an `issues_update_batch` tool that accepts an array of `{id, ...fields}` update objects (max 50) and applies all updates, returning a summary of successes and failures.
- **FR-008:** System MUST provide an `issues_stats` tool that returns aggregate counts grouped by a specified field (`status`, `priority`, `project`, `assignee`, `type`). MUST accept optional filters.

#### Tool Annotations

- **FR-009:** All tools MUST include MCP tool annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`.
- **FR-010:** Annotation values:
  - Read-only tools (`readOnlyHint: true`): `issues_list`, `issues_search`, `issues_get`, `issues_get_batch`, `issues_stats`, `issues_all_complete`, `issues_labels` (list op), `issues_metadata` (get op), `issues_projects` (list op), `session_get`
  - Destructive tools (`destructiveHint: true`): `issues_delete`
  - Idempotent tools (`idempotentHint: true`): `issues_mark_complete`, `issues_update`, `session_phase`, `session_checkpoint`

#### Error Handling

- **FR-011:** All tools MUST use `createErrorResponse()` from `mcp/types/errors.ts` with appropriate `MCPErrorCode`.
- **FR-012:** Error messages MUST be written for LLM recovery: include current state, what went wrong, and a specific suggestion for correction. Example: "Issue ISS-000099 not found. Use issues_list to find available issues, or check that the ID includes the prefix (e.g., ISS-000099, not 000099)."
- **FR-013:** Validation errors MUST include the specific field that failed and what was expected. Example: "Invalid priority 'urgent'. Valid values: low, medium, high, critical."

#### Provider Performance

- **FR-014:** The markdown provider MUST implement an in-memory cache for issue metadata (frontmatter) with a configurable TTL (default: 60 seconds).
- **FR-015:** Write operations (create, update, delete) MUST invalidate the cache for affected entries.
- **FR-016:** `listIssues()` MUST filter by filename/frontmatter before reading full file content when the query doesn't require description search.
- **FR-017:** Computed aggregations (`getLabels()`, `getProjects()`, `getAssignees()`) MUST use the cache rather than re-reading all files.

### Non-Functional Requirements

- **Backward Compatibility:** All existing tool signatures MUST continue to work unchanged. New parameters MUST have defaults that preserve current behavior.
- **Performance:** `issues_list` with `format: summary` for 100 issues MUST complete in under 200ms (currently ~500ms for full reads).
- **Token Efficiency:** `issues_list` with `format: minimal` for 20 issues MUST produce under 1,000 tokens of response (currently ~5,000+).
- **Test Coverage:** All new tools and parameters MUST have test coverage >= 80%. Existing tests MUST continue to pass.

## Architecture

### Tool Changes

```
EXISTING TOOLS (modified):
  issues_list      + format, cursor params; + annotations
  issues_get       + fields param; + annotations
  issues_search    + includeDescription, cursor params; + annotations
  issues_update    + annotations
  issues_create    + annotations
  issues_delete    + annotations
  issues_labels    + annotations
  issues_metadata  + annotations
  issues_projects  + annotations
  issues_all_complete  + annotations
  issues_mark_complete + annotations
  session_*        + annotations; standardize error handling

NEW TOOLS:
  issues_get_batch    Batch read by ID array
  issues_update_batch Batch update multiple issues
  issues_stats        Aggregate counts by field
```

### Provider Cache Layer

```
┌─────────────────────────────────────────────┐
│              MCP Tool Layer                  │
│  (issues_list, issues_get, issues_search)   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           CachingProvider (new)              │
│  - In-memory Map<id, {frontmatter, ttl}>    │
│  - Write-through invalidation               │
│  - Lazy population on first list/search     │
│  - TTL-based expiry (default 60s)           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         MarkdownIssueProvider (existing)     │
│  - File reads, writes, deletes              │
│  - Frontmatter parsing                      │
└─────────────────────────────────────────────┘
```

### Cursor Pagination Design

Cursors encode `{offset, sortField, sortDirection}` as Base64. Server determines page size (default 25 for `summary`/`minimal`, 10 for `full`). The response includes:

```typescript
// In metadata
{
  issues: [...],
  nextCursor: "eyJvZmZzZXQiOjI1fQ==",  // or absent if last page
  totalCount: 142
}

// In text content (critical -- models ignore structured pagination)
"Showing 25 of 142 issues. 117 more match. Use cursor 'eyJvZmZzZXQiOjI1fQ==' to see next page."
```

## Implementation Details

### File Structure

```
mcp/
├── tools/
│   ├── issues/
│   │   ├── get-batch.ts        # NEW: issues_get_batch
│   │   ├── update-batch.ts     # NEW: issues_update_batch
│   │   ├── stats.ts            # NEW: issues_stats
│   │   ├── list.ts             # MODIFIED: format, cursor params
│   │   ├── get.ts              # MODIFIED: fields param
│   │   ├── search.ts           # MODIFIED: includeDescription, cursor
│   │   ├── create.ts           # MODIFIED: error handling
│   │   ├── update.ts           # MODIFIED: error handling
│   │   ├── delete.ts           # MODIFIED: error handling
│   │   ├── labels.ts           # MODIFIED: error handling
│   │   ├── metadata.ts         # MODIFIED: error handling
│   │   ├── projects.ts         # MODIFIED: error handling
│   │   ├── all-complete.ts     # MODIFIED: error handling
│   │   ├── mark-complete.ts    # MODIFIED: error handling
│   │   └── index.ts            # MODIFIED: export new tools
│   └── session/                # MODIFIED: error handling consistency
├── providers/
│   ├── markdown.ts             # MODIFIED: cache support, early filtering
│   ├── cache.ts                # NEW: CachingProvider wrapper
│   └── factory.ts              # MODIFIED: wire cache layer
├── server.ts                   # MODIFIED: register new tools, add annotations
├── types/
│   ├── issues.ts               # MODIFIED: add format/fields types
│   ├── annotations.ts          # NEW: tool annotation definitions
│   └── errors.ts               # UNCHANGED (already correct)
└── __tests__/
    ├── tools/issues/
    │   ├── get-batch.test.ts   # NEW
    │   ├── update-batch.test.ts # NEW
    │   ├── stats.test.ts       # NEW
    │   ├── list.test.ts        # MODIFIED: format, cursor tests
    │   ├── get.test.ts         # MODIFIED: fields tests
    │   └── search.test.ts      # MODIFIED: includeDescription tests
    └── providers/
        └── cache.test.ts       # NEW
```

### Tool Annotation Implementation

In `server.ts`, tool definitions gain an `annotations` field:

```typescript
{
  name: 'issues_list',
  description: 'List issues with filters. Returns summary by default; use format=full for descriptions.',
  inputSchema: zodToJsonSchema(listIssuesSchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  }
}
```

### New Tool Schemas

#### issues_get_batch

```typescript
export const issuesGetBatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50)
    .describe('Array of issue IDs to retrieve'),
  fields: z.array(z.enum([
    'title', 'description', 'status', 'priority',
    'labels', 'assignee', 'project', 'dates', 'wranglerContext'
  ])).optional()
    .describe('Specific fields to return. Omit for full content.'),
});
```

#### issues_update_batch

```typescript
export const issuesUpdateBatchSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    status: IssueStatusSchema.optional(),
    priority: IssuePrioritySchema.optional(),
    labels: z.array(z.string()).optional(),
    assignee: z.string().optional(),
    project: z.string().optional(),
  })).min(1).max(50)
    .describe('Array of issue updates. Each must include id + fields to change.'),
});
```

#### issues_stats

```typescript
export const issuesStatsSchema = z.object({
  groupBy: z.enum(['status', 'priority', 'project', 'assignee', 'type'])
    .describe('Field to group counts by'),
  status: z.array(IssueStatusSchema).optional(),
  priority: z.array(IssuePrioritySchema).optional(),
  labels: z.array(z.string()).optional(),
  project: z.string().optional(),
  type: z.enum(['issue', 'specification', 'idea']).optional(),
});
```

### Modified List Schema

```typescript
export const listIssuesSchema = z.object({
  // Existing filters (unchanged)
  status: z.array(IssueStatusSchema).optional(),
  priority: z.array(IssuePrioritySchema).optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  project: z.string().optional(),
  type: z.enum(['issue', 'specification', 'idea']).optional(),
  types: z.array(z.enum(['issue', 'specification', 'idea'])).optional(),
  parentTaskId: z.string().optional(),

  // New parameters
  format: z.enum(['full', 'summary', 'minimal']).default('summary')
    .describe('Response verbosity. summary=metadata only (default), full=include descriptions, minimal=id+title+status'),
  cursor: z.string().optional()
    .describe('Opaque pagination cursor from previous response'),
  limit: z.number().int().positive().max(100).optional().default(25)
    .describe('Results per page (max 100, default 25)'),

  // Deprecated but kept for backward compat
  offset: z.number().int().min(0).optional()
    .describe('DEPRECATED: Use cursor-based pagination instead'),
});
```

**Note on backward compatibility for `format` default:** The current default behavior returns full content. Changing the default to `summary` is a breaking change. The spec recommends `summary` as the new default because:
- It matches how agents actually use `issues_list` (browse, then get specific ones)
- The 60-80% token reduction is the primary goal
- Any agent that needs full content can pass `format: "full"` explicitly

### CachingProvider Design

```typescript
interface CacheEntry {
  frontmatter: IssueFrontmatter;
  filePath: string;
  cachedAt: number;
}

class CachingProvider {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private inner: MarkdownIssueProvider;

  // Populated lazily on first list/search
  private populated = false;

  async listIssues(filters, options): Promise<Issue[]> {
    if (!this.populated || this.isStale()) {
      await this.populateCache();
    }

    // Filter using cached frontmatter (no file reads)
    const matching = this.filterFromCache(filters);

    // Only read full files for issues that pass filters
    // AND only if format requires description
    if (options.format === 'full') {
      return this.hydrateFromDisk(matching);
    }
    return matching.map(entry => this.toSummaryIssue(entry));
  }

  // Write-through: invalidate on mutations
  async createIssue(...): Promise<Issue> {
    const result = await this.inner.createIssue(...);
    this.cache.set(result.id, this.toCacheEntry(result));
    return result;
  }

  async updateIssue(id, ...): Promise<Issue> {
    const result = await this.inner.updateIssue(id, ...);
    this.cache.set(id, this.toCacheEntry(result));
    return result;
  }

  async deleteIssue(id): Promise<void> {
    await this.inner.deleteIssue(id);
    this.cache.delete(id);
  }
}
```

## Error Handling

### Standardization

All issue tools MUST migrate from:

```typescript
// BEFORE (inconsistent)
catch (error) {
  return {
    content: [{ type: 'text', text: `Failed: ${message}` }],
    isError: true,
  };
}
```

To:

```typescript
// AFTER (standardized)
catch (error) {
  return createErrorResponse(
    MCPErrorCode.TOOL_EXECUTION_ERROR,
    `Failed to create issue: ${message}. Check that required fields (title, description) are provided.`,
    { tool: 'issues_create', params: sanitizedParams }
  );
}
```

### LLM-Recovery Error Messages

| Error Type | Current Message | Improved Message |
|---|---|---|
| Not found | "Issue not found" | "Issue ISS-000099 not found. Use issues_list or issues_search to find available issues." |
| Validation | "Invalid input" | "Invalid priority 'urgent'. Valid values: low, medium, high, critical." |
| Permission | "Permission denied" | "Cannot delete issue without confirm: true. Pass {id: 'X', confirm: true} to confirm deletion." |
| Duplicate | "Issue already exists" | "An issue with this title already exists (ISS-000042). Use issues_update to modify it, or change the title." |

## Testing Strategy

### New Tests Required

- `issues_get_batch`: happy path (multiple IDs), partial failures (some IDs not found), fields parameter, empty array, max limit exceeded
- `issues_update_batch`: happy path, partial failures, empty updates, max limit exceeded, invalid fields
- `issues_stats`: each groupBy value, with filters, empty workspace
- `issues_list` format parameter: `full` returns descriptions, `summary` omits them, `minimal` returns bare minimum
- `issues_list` cursor pagination: first page, next page, last page, invalid cursor, cursor with filters
- `issues_get` fields parameter: specific fields returned, omitted fields absent, description-only, all fields
- `issues_search` includeDescription: with and without
- CachingProvider: cache hit, cache miss, TTL expiry, write-through invalidation, concurrent access
- Error handling: all tools return `createErrorResponse`, messages include recovery guidance
- Tool annotations: verify all tools have correct annotation values

### Existing Tests

All 434 passing MCP tests MUST continue to pass. The 3 pre-existing failures in workspace-schema tests are unrelated and not in scope.

## Migration Path

### Backward Compatibility

- `issues_list` with no `format` parameter: changes from returning full content to returning summary. This is intentionally a behavior change for token efficiency. Agents needing full content pass `format: "full"`.
- `issues_list` with `offset`: continues to work but is deprecated. Agents should migrate to cursor-based pagination.
- All other existing parameters: unchanged behavior.

### Phased Rollout

**Phase 1: Context Efficiency (highest impact)**
- Add `format` parameter to `issues_list`
- Add `fields` parameter to `issues_get`
- Add `includeDescription` to `issues_search`
- Standardize error handling across all tools

**Phase 2: Batch Operations**
- Implement `issues_get_batch`
- Implement `issues_update_batch`
- Implement `issues_stats`

**Phase 3: Spec Compliance**
- Add tool annotations to all tools
- Implement cursor-based pagination
- Add structured output schemas (outputSchema)

**Phase 4: Performance**
- Implement CachingProvider
- Optimize markdown provider filtering (filter before parse)

## Open Questions & Decisions

### Resolved Decisions

| Decision | Options Considered | Chosen | Rationale |
|---|---|---|---|
| Default format for issues_list | full (backward-compat) vs summary (token-efficient) | summary | Token efficiency is the primary goal; agents that need full content can opt in |
| Cursor encoding | Offset-based vs keyset-based | Offset-based (Base64 encoded) | Simpler to implement; keyset would only matter at 10k+ issues |
| Cache location | In-memory vs file-based | In-memory with TTL | Simplest, sufficient for single-process stdio model |
| Batch size limit | 20 vs 50 vs 100 | 50 | Balances utility against response size; 50 summaries ~2500 tokens |

### Open Questions

- **Q1:** Should `issues_get_batch` return partial results when some IDs are not found, or fail entirely?
  - Leaning toward: Partial results with a `notFound` array in metadata
  
- **Q2:** Should the CachingProvider be opt-in (env var) or always-on?
  - Leaning toward: Always-on with ability to disable via `WRANGLER_MCP_CACHE=false`

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Default format change breaks agent workflows | Medium | Medium | Agents can pass format=full; monitor for issues post-deploy |
| Cache staleness causes stale reads | Low | Low | 60s TTL + write-through invalidation; cache is advisory |
| Batch operations produce oversized responses | Low | Medium | Enforce max 50 items; use summary format for batch results |
| Tool annotation support varies by client | Low | Low | Annotations are advisory hints; no functional dependency |

## Success Criteria

### Launch Criteria

- [ ] All functional requirements implemented and tested
- [ ] Existing 434 MCP tests continue to pass
- [ ] New tools have >= 80% test coverage
- [ ] `issues_list` with `format: summary` produces < 1,000 tokens for 20 issues
- [ ] Batch get of 10 issues completes in single round-trip
- [ ] All tools use consistent error handling pattern

### Success Metrics

- Token consumption for common "browse and find" workflows reduced by 60-80%
- Agent round-trips for batch operations (mark tasks in_progress, fetch task set) reduced by 80%+
- Zero backward-compatibility regressions reported

## References

### Related Issues

- ISS-000119: Add preview/summary mode to issues_get to reduce context waste

### External Resources

- MCP Specification 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
- MCP Tools Specification 2025-06-18: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- MCP Pagination Specification 2025-03-26: https://modelcontextprotocol.io/specification/2025-03-26/server/utilities/pagination
- Anthropic Engineering -- Code execution with MCP: https://www.anthropic.com/engineering/code-execution-with-mcp
- Speakeasy -- Reducing MCP token usage by 100x: https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2
- Blockscout -- MCP Optimizations: https://www.blog.blockscout.com/mcp-explained-part-2-optimizations/
- DeployStack -- MCP Context Window Explained: https://deploystack.io/blog/how-mcp-servers-use-your-context-window

### Research Memo

- Full assessment: `.wrangler/memos/2026-02-12-mcp-improvement-assessment.md`
