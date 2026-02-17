# Coding Standards

## General

- NEVER remove or downgrade code to fix type errors from outdated dependencies; upgrade the dependency instead
- Always ask before removing functionality or code that appears to be intentional
- Remove comments that restate the code -- explain WHY, not WHAT -- Code should be self-documenting through naming and structure; comments add value by explaining rationale, non-obvious behavior, or design decisions that aren't evident from the implementation itself
- Simplify nested conditionals: use and/or for compound conditions, elif for mutual exclusion -- Reduces nesting and cognitive load, making control flow easier to understand and maintain
- Extract shared logic into helper methods instead of duplicating inline -- especially between method variants like streaming/non-streaming -- Reduces maintenance burden and prevents divergence bugs when one copy is updated but others aren't
- Remove unreachable code branches--let impossible cases fail explicitly rather than silently handle them -- Eliminates dead code that obscures logic and prevents detection of actual bugs when "impossible" conditions do occur
- Eliminate duplicate validation logic -- extract repeated checks into shared helpers or reuse existing parent/utility validations -- Prevents inconsistencies when validation logic changes and reduces maintenance burden by keeping validation logic in one place (DRY principle)

### Error Handling

- Raise explicit errors for unsupported inputs/parameters -- prevents silent failures and makes contract violations obvious -- Explicit failures expose bugs immediately instead of allowing invalid data to propagate through the system silently
- Catch specific exception types, not broad Exception -- identifies actual failure modes and prevents masking unexpected errors -- Broad exception handlers hide bugs by catching unexpected errors (like KeyboardInterrupt or SystemExit) and make debugging harder by obscuring the actual failure type

### MCP Error Handling

Always use the `MCPErrorCode` enum with `createErrorResponse`:

| Code | When to use |
|------|-------------|
| `VALIDATION_ERROR` | Zod validation failures |
| `RESOURCE_NOT_FOUND` | Missing issues or files |
| `PERMISSION_DENIED` | Access denied |
| `TOOL_EXECUTION_ERROR` | General tool execution errors |
| `PATH_TRAVERSAL_DENIED` | Security violation (path escape) |

Format:

```typescript
return createErrorResponse(
  MCPErrorCode.VALIDATION_ERROR,
  "Clear error message",
  { context: additionalInfo },
);
```

### Security

**Path traversal prevention is MANDATORY for all file operations.**

Use the `assertWithinWorkspace` pattern:

```typescript
private assertWithinWorkspace(targetPath: string, action: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(this.basePath, resolvedTarget);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Attempted to ${action} outside of workspace`);
  }
}
```

Always validate paths before any read/write/delete operation.

## TypeScript-Specific

### Compiler Configuration

- **Strict mode**: Enabled
- **Target**: ES2022
- **Module**: Node16 (ESM)
- **All types must be explicit** -- no implicit `any`
- **Use Zod for runtime validation** of external inputs (API params, file contents, user data)

### Type Rules

- **JSDoc on exports**: Public functions get JSDoc comments explaining what they do.
- No `any` types unless absolutely necessary
- **NEVER use `ReturnType<>`** -- it obscures types behind indirection. Use the actual type name instead. Look up return types in source or `node_modules` type definitions and reference them directly.

  ```typescript
  // BAD: Indirection through ReturnType
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stmt: ReturnType<Database["prepare"]>;
  let stat: Awaited<ReturnType<typeof fs.stat>>;

  // GOOD: Use the actual type
  let timer?: NodeJS.Timeout;
  let stmt: Statement;
  let stat: Stats;
  ```

  If a function's return type has no exported name, define a named type alias at the call site -- don't use `ReturnType<>`.

- Check node_modules for external API type definitions instead of guessing
- **NEVER use inline imports** - no `await import("./foo.js")`, no `import("pkg").Type` in type positions, no dynamic imports for types. Always use standard top-level imports.
- **Use `Promise.withResolvers()`** instead of `new Promise((resolve, reject) => ...)` -- cleaner, avoids callback nesting, and the resolver functions are properly typed:

  ```typescript
  // BAD: Verbose, callback nesting
  const promise = new Promise<string>((resolve, reject) => { ... });

  // GOOD: Clean destructuring, typed resolvers
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  ```

- **NEVER create multiple handles to the same path**:

```typescript
// BAD: Creates two file handles
if (await Bun.file(path).exists()) {
  const content = await Bun.file(path).text();
}

// BAD: Still wasteful even in separate functions
async function checkConfig() {
  return await Bun.file(configPath).exists();
}
async function loadConfig() {
  return await Bun.file(configPath).json(); // second handle
}
```

## Skill Authoring Standards

### Naming Conventions

All skills use **gerund form** (verb + -ing):

- `writing-skills`, `practicing-tdd`, `reviewing-code` -- GOOD
- `create-issue`, `tdd-practice`, `code-review` -- BAD

Requirements:
- Directory name MUST match the frontmatter `name` field
- Use lowercase-with-dashes format
- Present continuous tense (verb + -ing)

### Token Efficiency

The context window is a public good. Minimize token cost in skill files.

**Size limits:**
- SKILL.md body: <500 lines (target 300-400)
- Getting-started workflows: <150 words
- Frequently-used skills: <200 words total
- Complex skills: <500 words main content, remainder in `references/`

**Progressive disclosure:**
- Skills >500 lines MUST split heavy content into a `references/` subdirectory
- SKILL.md references supporting files explicitly

**Verbosity rules:**
- Only add context the agent does not already have
- Challenge each paragraph: "Does this justify its token cost?"
- Assume the agent knows common programming concepts
- Focus on unique, skill-specific guidance
