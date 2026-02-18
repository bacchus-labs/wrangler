# MCP Development

## Key File Locations

| Purpose | Path |
|---------|------|
| Server entry point | `mcp/src/index.ts` |
| Server class | `mcp/src/server.ts` |
| Storage provider | `mcp/src/providers/markdown.ts` |
| Issue tools | `mcp/src/tools/issues/*.ts` |
| Session tools | `mcp/src/tools/session/*.ts` |
| Workspace tools | `mcp/src/tools/workspace/*.ts` |
| Type definitions | `mcp/src/types/` (`config.ts`, `issues.ts`, `errors.ts`) |
| Workspace schema | `mcp/src/workspace-schema.ts` |
| Provider base/factory | `mcp/src/providers/base.ts`, `mcp/src/providers/factory.ts` |
| Tests | `mcp/__tests__/**/*.test.ts` |
| Jest config | `mcp/jest.config.js` |
| Plugin config | `.claude-plugin/plugin.json` |
| TypeScript config | `mcp/tsconfig.json` |
| Compiled output | `mcp/dist/` (gitignored) |

## Adding a New Tool

Follow these steps in order:

1. Create tool file: `mcp/src/tools/issues/{name}.ts`
2. Write tests FIRST: `mcp/__tests__/tools/issues/{name}.test.ts`
3. Implement Zod schema for input validation
4. Implement tool function returning `CallToolResult`
5. Register in `mcp/src/server.ts` switch statement
6. Add to `getAvailableTools()` list in `mcp/src/server.ts`
7. Export from `mcp/src/tools/issues/index.ts`

## Tool Implementation Pattern

Every tool follows this structure:

```typescript
// 1. Zod schema
export const myToolSchema = z.object({
  param: z.string().min(1),
});

// 2. Type derived from schema
export type MyToolParams = z.infer<typeof myToolSchema>;

// 3. Tool function
export async function myTool(
  params: MyToolParams,
  providerFactory: ProviderFactory,
): Promise<CallToolResult> {
  try {
    const provider = providerFactory.getIssueProvider();
    // ... implementation
    return createSuccessResponse(message, metadata);
  } catch (error) {
    return createErrorResponse(
      MCPErrorCode.TOOL_EXECUTION_ERROR,
      error.message,
    );
  }
}
```

## Error Handling

Always use `MCPErrorCode` enum with `createErrorResponse`. Never throw raw errors from tool functions -- catch and wrap them.

Error codes: `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `PERMISSION_DENIED`, `TOOL_EXECUTION_ERROR`, `PATH_TRAVERSAL_DENIED`.

See `CODING_STANDARDS.md` for the full error handling table and format.

## Testing

- **Framework**: Jest with ts-jest
- **Coverage requirement**: 80%+ (statements, branches, functions, lines)
- **Test location**: `mcp/__tests__/`
- **Pattern**: `**/*.test.ts`

### Commands

```bash
npm run test:mcp                # Run all MCP tests
npm run test:mcp -- --watch     # Watch mode
npm run test:mcp -- --coverage  # Coverage report
npm run test:mcp -- mcp/__tests__/server.test.ts  # Single file
```

### Build Commands

```bash
npm run build:mcp      # Build MCP server
npm run watch:mcp      # Auto-rebuild on changes
npm run mcp:dev        # Debug mode (WRANGLER_MCP_DEBUG=true)
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `WRANGLER_MCP_DEBUG` | `false` | Enable verbose logging |
| `WRANGLER_MCP_NAME` | `"wrangler-mcp"` | Server name |
| `WRANGLER_MCP_VERSION` | `"1.0.0"` | Server version |
| `WRANGLER_WORKSPACE_ROOT` | `process.cwd()` | Workspace root |
| `WRANGLER_ISSUES_DIRECTORY` | `"issues"` | Issues directory name |
| `WRANGLER_SPECIFICATIONS_DIRECTORY` | `"specifications"` | Specs directory name |

## Dependencies

**Production**: `@modelcontextprotocol/sdk`, `gray-matter`, `fast-glob`, `fs-extra`, `zod`, `zod-to-json-schema`

**Development**: `typescript`, `jest`, `ts-jest`, `@types/node`, `@types/fs-extra`, `@types/jest`

## Known Limitations

1. **Concurrent ID generation**: Race conditions when creating issues in parallel. Use sequential creation.
2. **Large workspaces**: Performance degrades with >1,000 issues. Archive old issues periodically.
3. **Markdown-only provider**: No GitHub/Linear backends yet.
