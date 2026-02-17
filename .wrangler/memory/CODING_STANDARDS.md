# Coding Standards

## General

- NEVER remove or downgrade code to fix type errors from outdated dependencies; upgrade the dependency instead
- Always ask before removing functionality or code that appears to be intentional
- Remove comments that restate the code — explain WHY, not WHAT — Code should be self-documenting through naming and structure; comments add value by explaining rationale, non-obvious behavior, or design decisions that aren't evident from the implementation itself
- Simplify nested conditionals: use and/or for compound conditions, elif for mutual exclusion — Reduces nesting and cognitive load, making control flow easier to understand and maintain
- Extract shared logic into helper methods instead of duplicating inline — especially between method variants like streaming/non-streaming — Reduces maintenance burden and prevents divergence bugs when one copy is updated but others aren't
- Remove unreachable code branches—let impossible cases fail explicitly rather than silently handle them — Eliminates dead code that obscures logic and prevents detection of actual bugs when "impossible" conditions do occur
- Eliminate duplicate validation logic — extract repeated checks into shared helpers or reuse existing parent/utility validations — Prevents inconsistencies when validation logic changes and reduces maintenance burden by keeping validation logic in one place (DRY principle)

### Error Handling

- Raise explicit errors for unsupported inputs/parameters — prevents silent failures and makes contract violations obvious — Explicit failures expose bugs immediately instead of allowing invalid data to propagate through the system silently
- Catch specific exception types, not broad Exception — identifies actual failure modes and prevents masking unexpected errors — Broad exception handlers hide bugs by catching unexpected errors (like KeyboardInterrupt or SystemExit) and make debugging harder by obscuring the actual failure type

## TypeScript-Specific

- **JSDoc on exports**: Public functions get JSDoc comments explaining what they do.
- No `any` types unless absolutely necessary
- **NEVER use `ReturnType<>`** — it obscures types behind indirection. Use the actual type name instead. Look up return types in source or `node_modules` type definitions and reference them directly.

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

  If a function's return type has no exported name, define a named type alias at the call site — don't use `ReturnType<>`.

- Check node_modules for external API type definitions instead of guessing
- **NEVER use inline imports** - no `await import("./foo.js")`, no `import("pkg").Type` in type positions, no dynamic imports for types. Always use standard top-level imports.
- **Use `Promise.withResolvers()`** instead of `new Promise((resolve, reject) => ...)` — cleaner, avoids callback nesting, and the resolver functions are properly typed:

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
