# Wrangler MCP Improvement Assessment

**Date**: 2026-02-12
**Sources**: MCP spec analysis (2025-11-25), best practices research, codebase audit

---

## Key Finding

The wrangler MCP server has a solid foundation (good separation of concerns, Zod validation, comprehensive tests) but is behind current MCP best practices in three critical areas: **context efficiency**, **batch operations**, and **spec compliance with newer features**.

---

## Prioritized Improvements

### Tier 1: High Impact, Low-Medium Effort

**1. Summary/preview mode for issues_get and issues_list** (ISS-000119 already filed)
- `issues_list` returns full Issue objects including descriptions in metadata
- `issues_get` always returns the full markdown body (10-12k tokens for specs)
- Pattern: "list is a summary, get is the detail" -- industry standard
- Fix: Add `fields` or `format` parameter to control response verbosity

**2. Batch read operations**
- No way to fetch multiple issues by ID in one call
- Agents hit N+1 query patterns when reviewing task sets
- Fix: Add `issues_get_batch` tool accepting array of IDs with optional field selection

**3. Tool annotations (new MCP spec feature)**
- MCP 2025-06-18 added `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- Clients use these for UX decisions (auto-approve reads, confirm deletes)
- Easy to add -- just metadata on tool definitions
- Example: `issues_list` is read-only; `issues_delete` is destructive; `issues_mark_complete` is idempotent

**4. Error handling consistency**
- Issue tools use raw `{ content, isError: true }` objects
- Session tools use `createErrorResponse()` with MCPErrorCode
- MCP spec says error messages should be LLM-recoverable: include current state, valid alternatives, correction guidance
- Fix: Migrate all tools to `createErrorResponse()`, improve error message quality

### Tier 2: Medium Impact, Medium Effort

**5. Cursor-based pagination**
- MCP spec defines opaque cursor-based pagination as the standard
- Current: `limit`/`offset` parameters (functional but not spec-aligned)
- Fix: Add `nextCursor` to responses, accept `cursor` parameter
- Important: models ignore pagination without explicit text cues like "15 more issues match. Use cursor 'abc123' to see next page."

**6. Markdown provider performance**
- `listIssues()` reads ALL files, parses ALL frontmatter, then filters
- `searchIssues()` calls `listIssues()` internally (loads everything)
- `getLabels()`, `getProjects()`, `getAssignees()` recalculate every call
- Fix: Filter before parsing, add in-memory cache with TTL, invalidate on writes

**7. Structured output schemas (outputSchema)**
- MCP 2025-06-18 added `outputSchema` for tools returning structured data
- Enables clients to validate responses and gives LLMs type information
- Fix: Add `outputSchema` to tools that return structured data (list, search, get)

**8. Bulk update operations**
- Common pattern: mark all tasks in a phase as in_progress -> N calls
- Fix: Add `issues_update_batch` accepting array of {id, fields} updates

### Tier 3: Lower Priority, Strategic Value

**9. Concurrent creation race condition**
- Known issue: parallel issue creation can produce duplicate IDs
- Fix: Use `fs.writeFile(..., { flag: 'wx' })` (fail if exists) or file-based locking

**10. Session management gaps**
- No `session_list` tool (can't find active sessions)
- No session pause/resume lifecycle
- Fix: Add session listing and lifecycle tools

**11. Tool description optimization**
- Some descriptions verbose, some too terse
- Input schema parameters lack `.describe()` annotations
- Fix: Rewrite all descriptions to 1-2 sentences, add parameter descriptions

**12. Aggregation queries**
- No way to get counts by status/priority/project without fetching all issues
- Fix: Add `issues_aggregate` tool with `groupBy` parameter

---

## MCP Spec Features We Should Adopt

| Feature | Spec Version | Current Status | Priority |
|---------|-------------|---------------|----------|
| Tool annotations | 2025-06-18 | Not implemented | High |
| outputSchema | 2025-06-18 | Not implemented | Medium |
| Cursor pagination | 2025-03-26 | Partial (limit/offset) | Medium |
| resource_link returns | 2025-06-18 | Not implemented | Low |
| Content priority annotations | 2025-06-18 | Not implemented | Low |
| Async tasks | 2025-11-25 | Not applicable yet | Future |

---

## What NOT To Do

- **Don't implement dynamic toolsets** (search/describe/execute pattern) -- we only have 16 tools, total definition cost is manageable
- **Don't add OAuth/auth** -- local plugin, stdio transport, no network exposure
- **Don't add OpenTelemetry yet** -- adds complexity without immediate value for a local plugin
- **Don't restructure the provider architecture** -- markdown provider is fine for current scale

---

## Sources

- MCP Specification 2025-11-25: https://modelcontextprotocol.io/specification/2025-11-25
- MCP Tools Spec 2025-06-18: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- Anthropic Engineering on MCP: https://www.anthropic.com/engineering/code-execution-with-mcp
- Speakeasy dynamic toolsets: https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2
- Blockscout MCP optimizations: https://www.blog.blockscout.com/mcp-explained-part-2-optimizations/
- MCP context window analysis: https://deploystack.io/blog/how-mcp-servers-use-your-context-window
- MCP tool schema bloat: https://layered.dev/mcp-tool-schema-bloat-the-hidden-token-tax-and-how-to-fix-it/
