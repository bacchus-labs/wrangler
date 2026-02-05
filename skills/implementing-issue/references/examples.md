# Implementation Examples

## Example 1: Standalone Issue Implementation

```
User: /wrangler:implementing-issue ISS-000042

> Read issue ISS-000042 via MCP
> Understand requirements: Add rate limiting to API
> TDD: Write failing test for rate limit behavior
> TDD: Implement rate limiter to pass test
> TDD: Refactor for clarity
> Code review: No critical issues
> Complete: All tests pass, TDD cert provided
```

## Example 2: Dispatched from implementing-specs

```
[Subagent receives issue context from parent]
> Verify working directory
> Read issue ISS-000043
> Follow TDD workflow
> Code review finds 1 critical issue
> Fix attempt 1: Success
> Complete: Report results to parent
```

## Example 3: Issue with Blocker

```
User: /wrangler:implementing-issue ISS-000044

> Read issue ISS-000044 via MCP
> Requirements unclear: "Improve performance" with no specific criteria
> ESCALATE: Ask user for specific acceptance criteria
> User provides: "Response time under 200ms for /api/users endpoint"
> TDD: Write failing test asserting <200ms response
> TDD: Implement caching layer to pass test
> Code review: 1 Important issue (missing cache invalidation)
> Fix attempt 1: Add cache invalidation logic -- success
> Complete: All tests pass, TDD cert provided
```
