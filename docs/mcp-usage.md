# Wrangler MCP Server - Usage Guide

> Last Updated: 2026-02-17 | Version: 1.2.0

Complete guide to using the Wrangler MCP server for local issue and specification management.

## Table of Contents

- [What is the MCP Server?](#what-is-the-mcp-server)
- [Automatic Workspace Initialization](#automatic-workspace-initialization)
- [Directory Structure](#directory-structure)
- [Available Tools](#available-tools)
- [Auto-Archive Behavior](#auto-archive-behavior)
- [Issue Lifecycle](#issue-lifecycle)
- [Search and Filtering](#search-and-filtering)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## What is the MCP Server?

The Wrangler MCP (Model Context Protocol) server provides local, file-based issue and specification management. It stores issues as Markdown files with YAML frontmatter, making them:

- Human-readable
- Git-friendly
- Easy to search and edit manually
- Fully local (no external services required)

The MCP server exposes 16 tools that Claude can use to manage your project's issues, specifications, and orchestrated sessions programmatically.

## Automatic Workspace Initialization

When you first use any issue management tool, Wrangler automatically creates the `.wrangler/` workspace directory:

```
.wrangler/
├── issues/           # Project issues
├── specifications/   # Technical specifications
├── ideas/            # Ideas and proposals
├── memos/            # Reference material, RCA archives
├── plans/            # Implementation plans
├── docs/             # Auto-generated governance docs
├── templates/        # Issue and spec templates
├── cache/            # Runtime cache (gitignored)
├── config/           # Runtime config (gitignored)
└── logs/             # Runtime logs (gitignored)
```

These directories are created inside `.wrangler/` at your project root. No configuration needed - just start creating issues.

## Directory Structure

### Issues Directory (`.wrangler/issues/`)

Stores project issues as Markdown files with frontmatter:

```markdown
---
id: "000001"
title: "Add user authentication"
type: "issue"
status: "open"
priority: "high"
labels: ["feature", "auth"]
assignee: "alice"
project: "v1.0"
createdAt: "2025-10-29T12:00:00.000Z"
updatedAt: "2025-10-29T12:00:00.000Z"
wranglerContext:
  agentId: "coder-1"
  parentTaskId: "epic-auth"
  estimatedEffort: "2 days"
---

Implement JWT-based authentication system with:
- Login endpoint
- Token validation middleware
- Refresh token support
```

### Specifications Directory (`.wrangler/specifications/`)

Stores technical specifications with the same structure but `type: "specification"`:

```markdown
---
id: "000002"
title: "Authentication System Architecture"
type: "specification"
status: "open"
priority: "high"
labels: ["architecture", "auth"]
createdAt: "2025-10-29T12:00:00.000Z"
updatedAt: "2025-10-29T12:00:00.000Z"
---

## Overview
JWT-based authentication with refresh tokens...

## Components
1. Auth Service
2. Token Store
3. Middleware
```

## Available Tools

The Wrangler MCP server provides 16 tools organized into two categories:

### Issue Management Tools (11 tools)

### 1. issues_create

Create a new issue or specification.

```javascript
issues_create({
  title: "Add user authentication",
  description: "Implement JWT-based authentication with refresh tokens",
  type: "issue",  // or "specification"
  status: "open",
  priority: "high",
  labels: ["feature", "auth"],
  assignee: "alice",
  project: "v1.0",
  wranglerContext: {
    agentId: "coder-1",
    parentTaskId: "epic-auth",
    estimatedEffort: "2 days"
  }
})
```

**Parameters:**
- `title` (required): Issue title
- `description` (required): Detailed description
- `type`: "issue" or "specification" (default: "issue")
- `status`: "open", "in_progress", "closed", "cancelled" (default: "open")
- `priority`: "low", "medium", "high", "critical" (default: "medium")
- `labels`: Array of label strings
- `assignee`: Username
- `project`: Project or epic name
- `wranglerContext`: Metadata for workflow coordination

### 2. issues_list

List issues with optional filtering.

```javascript
// List all open issues
issues_list({
  status: ["open", "in_progress"]
})

// List high-priority features
issues_list({
  priority: ["high", "critical"],
  labels: ["feature"]
})

// List specifications for a project
issues_list({
  types: ["specification"],
  project: "v1.0"
})

// Pagination
issues_list({
  limit: 20,
  offset: 0
})
```

**Filters:**
- `status`: Array of statuses to include
- `priority`: Array of priorities
- `labels`: Array of labels (matches if ANY label matches)
- `assignee`: Filter by assignee
- `project`: Filter by project
- `types`: Array of types ("issue", "specification")
- `type`: Single type (deprecated, use `types`)
- `limit`: Maximum results (default: 100)
- `offset`: Skip results for pagination

### 3. issues_search

Search issues by keyword across title, description, and labels.

```javascript
// Basic search
issues_search({
  query: "authentication",
  fields: ["title", "description"]
})

// Search with filters
issues_search({
  query: "auth",
  fields: ["title", "description", "labels"],
  filters: {
    status: ["open"],
    priority: ["high"]
  },
  sortBy: "updated",
  sortOrder: "desc"
})
```

**Parameters:**
- `query` (required): Search term
- `fields`: Array of fields to search (default: ["title", "description", "labels"])
- `filters`: Same filters as `issues_list`
- `sortBy`: "created", "updated", "priority", "status"
- `sortOrder`: "asc" or "desc"

### 4. issues_get

Retrieve a single issue by ID.

```javascript
issues_get({
  id: "000001"
})
```

Returns complete issue with all metadata and full description.

### 5. issues_update

Update an existing issue.

```javascript
// Update status
issues_update({
  id: "000001",
  status: "in_progress",
  assignee: "bob"
})

// Update description
issues_update({
  id: "000001",
  description: "Updated requirements:\n- Add OAuth support\n- Add 2FA"
})

// Move to specifications
issues_update({
  id: "000001",
  type: "specification"
})

// Clear project
issues_update({
  id: "000001",
  project: null
})
```

**Note:** Only provide fields you want to update. Omitted fields remain unchanged.

### 6. issues_delete

Delete an issue (requires confirmation).

```javascript
issues_delete({
  id: "000001",
  confirm: true  // Required to prevent accidental deletion
})
```

**Warning:** This permanently deletes the Markdown file. Use with caution.

### 7. issues_labels

Manage labels across issues.

```javascript
// List all labels in use
issues_labels({
  operation: "list"
})

// Add labels to an issue
issues_labels({
  operation: "add",
  issueId: "000001",
  labels: ["urgent", "security"]
})

// Remove labels from an issue
issues_labels({
  operation: "remove",
  issueId: "000001",
  labels: ["wontfix"]
})
```

### 8. issues_metadata

Manage wranglerContext metadata.

```javascript
// Get metadata
issues_metadata({
  operation: "get",
  issueId: "000001"
})

// Set metadata field
issues_metadata({
  operation: "set",
  issueId: "000001",
  key: "agentId",
  value: "coder-2"
})

// Remove metadata field
issues_metadata({
  operation: "remove",
  issueId: "000001",
  key: "estimatedEffort"
})
```

### 9. issues_projects

Manage project associations.

```javascript
// List all projects
issues_projects({
  operation: "list"
})

// Assign issue to project
issues_projects({
  operation: "add",
  issueId: "000001",
  project: "v2.0"
})

// Remove project association
issues_projects({
  operation: "remove",
  issueId: "000001"
})
```

### 10. issues_mark_complete

Mark an issue as closed with optional completion note.

```javascript
issues_mark_complete({
  id: "000001",
  note: "Implemented and tested. All requirements met."
})
```

This is a convenience tool that:
1. Updates status to "closed"
2. Sets closedAt timestamp
3. Optionally appends completion note to description

### 11. issues_all_complete

Check if all issues in a scope are complete.

```javascript
// Check all issues
issues_all_complete({})

// Check specific issues
issues_all_complete({
  issueIds: ["000001", "000002", "000003"]
})

// Check by project
issues_all_complete({
  project: "v1.0"
})

// Check by parent task
issues_all_complete({
  parentTaskId: "epic-auth"
})

// Check specifications only
issues_all_complete({
  types: ["specification"],
  labels: ["architecture"]
})
```

Returns:
```javascript
{
  allComplete: true,
  summary: {
    total: 5,
    completed: 5,
    pending: 0,
    pendingIssues: []
  }
}
```

### Session Management Tools (5 tools)

These tools support orchestrated specification implementation workflows using the `implementing-specs` skill.

### 12. session_start

Initialize a new orchestration session for spec implementation.

```javascript
session_start({
  specFile: ".wrangler/specifications/spec-auth-system.md"
})
```

**Parameters:**
- `specFile` (required): Path to the specification file to implement
- `workingDirectory`: Override working directory (default: current directory)

**Returns:** Session ID, worktree path, branch name, and audit path

### 13. session_phase

Record a phase transition in the orchestration workflow.

```javascript
session_phase({
  sessionId: "2025-01-13-abc123-f8d2",
  phase: "execute",
  status: "started",
  metadata: { tasks_count: 5 }
})
```

**Parameters:**
- `sessionId` (required): Session ID from session_start
- `phase` (required): Phase name (plan, execute, verify, publish)
- `status` (required): "started", "complete", or "failed"
- `metadata`: Optional phase-specific data

### 14. session_checkpoint

Save resumable state for session recovery.

```javascript
session_checkpoint({
  sessionId: "2025-01-13-abc123-f8d2",
  tasksCompleted: ["ISS-000001", "ISS-000002"],
  tasksPending: ["ISS-000003"],
  lastAction: "Completed task ISS-000002",
  resumeInstructions: "Continue with ISS-000003"
})
```

**Parameters:**
- `sessionId` (required): Session ID
- `tasksCompleted` (required): Array of completed task IDs
- `tasksPending` (required): Array of pending task IDs
- `lastAction` (required): Description of what was just done
- `resumeInstructions` (required): How to continue if interrupted
- `variables`: Optional state to preserve

### 15. session_complete

Finalize a session after workflow completion.

```javascript
session_complete({
  sessionId: "2025-01-13-abc123-f8d2",
  status: "completed",
  prUrl: "https://github.com/org/repo/pull/123",
  prNumber: 123
})
```

**Parameters:**
- `sessionId` (required): Session ID
- `status` (required): "completed" or "failed"
- `prUrl`: PR URL if created
- `prNumber`: PR number if created
- `summary`: Optional completion summary

### 16. session_get

Retrieve session state for recovery or status check.

```javascript
// Get specific session
session_get({
  sessionId: "2025-01-13-abc123-f8d2"
})

// Find most recent incomplete session
session_get({})
```

**Parameters:**
- `sessionId`: Session ID (omit to find most recent incomplete)

**Returns:** Session state including tasks completed/pending, checkpoint info if available

**Note:** Session tools are primarily used by the `implementing-specs` skill for end-to-end spec-to-PR workflows.

## Auto-Archive Behavior

Issues and specifications are automatically archived when marked as closed or cancelled.

### How It Works

When you update an issue or specification's status to `closed` or `cancelled`, it automatically moves to an `archived/` subdirectory within its collection directory. When you reopen an archived item by changing its status to `open` or `in_progress`, it automatically moves back to the root directory.

This keeps your active work visible while preserving completed/cancelled items for historical reference without cluttering the main directories.

### Directory Structure

```
.wrangler/
├── issues/
│   ├── ISS-000001-active-issue.md
│   ├── ISS-000003-another-active-issue.md
│   └── archived/
│       ├── ISS-000002-completed-issue.md
│       └── ISS-000004-cancelled-issue.md
└── specifications/
    ├── SPEC-000001-active-spec.md
    └── archived/
        ├── SPEC-000002-completed-spec.md
        └── SPEC-000003-obsolete-spec.md
```

### Archived Items Are Still Accessible

All MCP tools (list, search, get) include archived items by default. You don't need to do anything special to access archived issues:

```javascript
// List all issues (includes archived)
issues_list({})

// Search all issues (includes archived)
issues_search({ query: "authentication" })

// Get archived issue directly
issues_get({ id: "ISS-000002" })
```

### Reopening Archived Items

To reopen an archived issue or specification, simply update its status:

```javascript
// This automatically moves the file from archived/ back to root
issues_update({
  id: "ISS-000002",
  status: "open"
})
```

The file will be automatically moved from `.wrangler/issues/archived/` back to `.wrangler/issues/`.

### When Archiving Happens

Archiving occurs automatically when you:

1. **Mark an issue as complete:**
   ```javascript
   issues_mark_complete({ id: "ISS-000001" })
   // Status becomes 'closed', file moves to archived/
   ```

2. **Update status to closed:**
   ```javascript
   issues_update({ id: "ISS-000001", status: "closed" })
   // File moves to archived/
   ```

3. **Update status to cancelled:**
   ```javascript
   issues_update({ id: "ISS-000001", status: "cancelled" })
   // File moves to archived/
   ```

### Benefits

- **Cleaner directories**: Active work is easy to find
- **Historical record**: Completed work is preserved, not deleted
- **Git-friendly**: All items remain version-controlled
- **Seamless access**: Archived items don't require special queries
- **Automatic**: No manual file management needed

## Issue Lifecycle

Typical workflow for managing issues:

### 1. Create Issue

```javascript
const issue = issues_create({
  title: "Implement user registration",
  description: "Create signup endpoint with validation",
  priority: "high",
  labels: ["feature", "api"]
})
// Creates: .wrangler/issues/000001-implement-user-registration.md
```

### 2. Start Work

```javascript
issues_update({
  id: "000001",
  status: "in_progress",
  assignee: "alice"
})
```

### 3. Track Progress

```javascript
// Add context during development
issues_metadata({
  operation: "set",
  issueId: "000001",
  key: "branchName",
  value: "feature/user-registration"
})
```

### 4. Complete Issue

```javascript
issues_mark_complete({
  id: "000001",
  note: "Implemented with tests. PR #42 merged."
})
```

### 5. Verify Completion

```javascript
issues_all_complete({
  project: "v1.0"
})
```

## Search and Filtering

### Finding Issues

**By keyword:**
```javascript
issues_search({
  query: "authentication",
  fields: ["title", "description"]
})
```

**By label:**
```javascript
issues_list({
  labels: ["bug", "critical"]
})
```

**By status and priority:**
```javascript
issues_list({
  status: ["open"],
  priority: ["high", "critical"]
})
```

**By project:**
```javascript
issues_list({
  project: "v1.0",
  types: ["issue"]
})
```

**By assignee:**
```javascript
issues_list({
  assignee: "alice",
  status: ["in_progress"]
})
```

### Advanced Filtering

**Combine multiple filters:**
```javascript
issues_search({
  query: "auth",
  filters: {
    status: ["open", "in_progress"],
    priority: ["high", "critical"],
    labels: ["feature"],
    project: "v1.0"
  },
  sortBy: "priority",
  sortOrder: "desc"
})
```

**Find issues by parent task:**
```javascript
issues_list({
  parentTaskId: "epic-auth"
})
```

**Pagination for large result sets:**
```javascript
// First page
issues_list({
  limit: 20,
  offset: 0
})

// Second page
issues_list({
  limit: 20,
  offset: 20
})
```

## Best Practices

### 1. Use Descriptive Titles

Good:
- "Add JWT authentication middleware"
- "Fix memory leak in WebSocket handler"
- "Document API authentication flow"

Bad:
- "Fix bug"
- "Update code"
- "TODO"

### 2. Organize with Labels

Create a consistent labeling system:
- **Type**: `feature`, `bug`, `chore`, `docs`
- **Area**: `api`, `frontend`, `database`, `auth`
- **State**: `blocked`, `ready`, `urgent`

```javascript
issues_create({
  title: "Add OAuth2 support",
  labels: ["feature", "auth", "api"]
})
```

### 3. Use Projects for Milestones

Group related issues:
```javascript
issues_create({
  title: "User authentication",
  project: "v1.0"
})
```

### 4. Track Work with wranglerContext

Store workflow metadata:
```javascript
issues_create({
  title: "Implement auth",
  wranglerContext: {
    agentId: "coder-1",
    parentTaskId: "epic-auth",
    estimatedEffort: "3 days"
  }
})
```

### 5. Use Specifications for Design

Create specifications before implementation:
```javascript
// 1. Create specification
issues_create({
  title: "Authentication System Design",
  type: "specification",
  description: "## Architecture\n...",
  labels: ["architecture"]
})

// 2. Create implementation issues
issues_create({
  title: "Implement auth middleware",
  type: "issue",
  wranglerContext: {
    parentTaskId: "spec-000001"
  }
})
```

### 6. Mark Complete with Notes

Always document completion:
```javascript
issues_mark_complete({
  id: "000001",
  note: "Implemented in PR #42. Tests added. Deployed to staging."
})
```

### 7. Regular Status Checks

Check project completion:
```javascript
issues_all_complete({
  project: "v1.0"
})
```

### 8. Git Integration

Issues are stored as Markdown files, so:
- Commit them with your code
- Track changes in git history
- Review issue changes in PRs
- Sync across team via git

```bash
git add .wrangler/issues/ .wrangler/specifications/
git commit -m "Add authentication issues"
```

## Troubleshooting

### Issue Not Found

**Problem:** `issues_get({ id: "000001" })` returns null

**Solutions:**
1. Check ID formatting (6-digit zero-padded: "000001")
2. List all issues to verify ID: `issues_list({})`
3. Search by title: `issues_search({ query: "title text" })`

### Search Not Finding Issues

**Problem:** `issues_search({ query: "auth" })` returns no results

**Solutions:**
1. Check which fields you're searching:
   ```javascript
   issues_search({
     query: "auth",
     fields: ["title", "description", "labels"]  // Include all fields
   })
   ```
2. Try case-insensitive match (search is case-insensitive)
3. Verify issues exist: `issues_list({})`

### Cannot Delete Issue

**Problem:** `issues_delete({ id: "000001" })` fails

**Solution:** Must include `confirm: true`:
```javascript
issues_delete({
  id: "000001",
  confirm: true
})
```

### Path Traversal Error

**Problem:** Error about accessing files outside workspace

**Solution:** Don't use absolute paths or `..` in IDs. The MCP server restricts access to `.wrangler/issues/` and `.wrangler/specifications/` directories for security.

### Labels Not Working

**Problem:** Labels not filtering correctly

**Solution:** `labels` filter uses OR logic:
```javascript
// Matches issues with "bug" OR "critical"
issues_list({
  labels: ["bug", "critical"]
})

// Use search to find issues with multiple labels
issues_list({
  labels: ["bug"]
}).filter(issue => issue.labels.includes("critical"))
```

### Cannot Update Type

**Problem:** Moving issue to specification doesn't work

**Solution:** Use `issues_update`:
```javascript
issues_update({
  id: "000001",
  type: "specification"
})
```

This physically moves the file from `.wrangler/issues/` to `.wrangler/specifications/`.

### Pagination Issues

**Problem:** Getting duplicate or missing results with pagination

**Solution:** Results are sorted by `updatedAt` descending. If issues are updated between page requests, use consistent sorting:
```javascript
issues_search({
  query: "",  // Empty query returns all
  sortBy: "created",
  sortOrder: "desc",
  filters: {
    limit: 20,
    offset: 0
  }
})
```

## Examples

### Complete Feature Development Workflow

```javascript
// 1. Create specification
const spec = issues_create({
  title: "User Authentication Specification",
  type: "specification",
  description: `
## Requirements
- JWT tokens
- Refresh tokens
- Password hashing

## API Endpoints
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
  `,
  priority: "high",
  labels: ["architecture", "auth"],
  project: "v1.0"
})

// 2. Create implementation issues
issues_create({
  title: "Implement login endpoint",
  description: "POST /auth/login with email/password validation",
  labels: ["feature", "auth", "api"],
  priority: "high",
  project: "v1.0",
  wranglerContext: {
    parentTaskId: spec.id,
    estimatedEffort: "1 day"
  }
})

issues_create({
  title: "Add JWT middleware",
  description: "Token validation middleware for protected routes",
  labels: ["feature", "auth", "middleware"],
  priority: "high",
  project: "v1.0",
  wranglerContext: {
    parentTaskId: spec.id,
    estimatedEffort: "0.5 days"
  }
})

// 3. Track progress
issues_list({
  project: "v1.0",
  status: ["open", "in_progress"]
})

// 4. Start work on first issue
issues_update({
  id: "000002",
  status: "in_progress",
  assignee: "alice"
})

// 5. Complete issues
issues_mark_complete({
  id: "000002",
  note: "Implemented with tests. PR #42 merged."
})

issues_mark_complete({
  id: "000003",
  note: "Middleware added. Tested with integration tests."
})

// 6. Verify all complete
issues_all_complete({
  project: "v1.0"
})
```

### Bug Tracking Workflow

```javascript
// 1. Create bug report
const bug = issues_create({
  title: "Memory leak in WebSocket handler",
  description: `
## Steps to Reproduce
1. Connect WebSocket
2. Send 1000 messages
3. Disconnect
4. Observe memory not released

## Expected
Memory should be released after disconnect

## Actual
Memory grows indefinitely
  `,
  priority: "critical",
  labels: ["bug", "websocket", "memory"],
  project: "v1.0"
})

// 2. Investigate
issues_update({
  id: bug.id,
  status: "in_progress",
  assignee: "bob"
})

issues_metadata({
  operation: "set",
  issueId: bug.id,
  key: "rootCause",
  value: "Event listeners not removed on disconnect"
})

// 3. Fix and test
issues_update({
  id: bug.id,
  description: bug.description + `

## Root Cause
Event listeners not removed in disconnect handler

## Fix
Add cleanup logic in WebSocket close event
  `
})

// 4. Complete with verification
issues_mark_complete({
  id: bug.id,
  note: "Fixed in PR #45. Verified with memory profiler - no leaks detected."
})
```

### Planning with Dependencies

```javascript
// 1. Create epic
const epic = issues_create({
  title: "Complete Authentication System",
  type: "specification",
  description: "Full auth system with OAuth, 2FA, and session management",
  labels: ["epic", "auth"],
  project: "v2.0"
})

// 2. Create dependent tasks
const tasks = [
  "Implement OAuth2 provider",
  "Add 2FA support",
  "Session management with Redis",
  "Admin user management UI"
].map(title => issues_create({
  title,
  labels: ["feature", "auth"],
  priority: "high",
  project: "v2.0",
  wranglerContext: {
    parentTaskId: epic.id
  }
}))

// 3. Check progress
issues_all_complete({
  parentTaskId: epic.id
})

// 4. List remaining work
issues_list({
  parentTaskId: epic.id,
  status: ["open", "in_progress"]
})
```

## Integration with Wrangler Skills

The MCP server integrates seamlessly with Wrangler skills:

### With Planning Skills

```javascript
// writing-plans skill creates issues
// executing-plans skill updates them

// After /wrangler:write-plan
issues_list({
  labels: ["plan-step"]
})

// After /wrangler:execute-plan
issues_all_complete({
  labels: ["plan-step"]
})
```

### With TDD Skill

```javascript
// Create test issue
issues_create({
  title: "Write tests for auth middleware",
  labels: ["test", "tdd"],
  priority: "high"
})

// Mark red phase complete
issues_update({
  id: "000001",
  description: original + "\n\n## Status\n- [x] RED: Tests failing\n- [ ] GREEN\n- [ ] REFACTOR"
})
```

### With Debugging Skill

```javascript
// Create debugging issue
issues_create({
  title: "Debug intermittent test failure",
  labels: ["bug", "test"],
  wranglerContext: {
    agentId: "debugger"
  }
})

// Track debugging steps
issues_metadata({
  operation: "set",
  issueId: "000001",
  key: "debugPhase",
  value: "root-cause-analysis"
})
```

## Conclusion

The Wrangler MCP server provides powerful, local issue management that integrates seamlessly with git workflows and Wrangler skills. Use it to:

- Track work items without external dependencies
- Organize projects with labels and milestones
- Maintain human-readable Markdown documentation
- Enable Claude to manage issues programmatically
- Keep everything in version control

For technical implementation details, see [mcp/README.md](../mcp/README.md).
