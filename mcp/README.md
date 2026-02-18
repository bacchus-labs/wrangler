# Wrangler MCP Server - Technical Documentation

Technical implementation guide for the Wrangler MCP server.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Description](#component-description)
- [Development Guide](#development-guide)
- [Testing Guide](#testing-guide)
- [API Reference](#api-reference)
- [Performance](#performance)

## Architecture Overview

The Wrangler MCP server implements the Model Context Protocol to provide Claude with local issue and specification management capabilities.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude / MCP Client                     │
└────────────────────────────┬────────────────────────────────┘
                             │ MCP Protocol (stdio)
                             │
┌────────────────────────────┴────────────────────────────────┐
│                    WranglerMCPServer                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Server Request Handlers                    │ │
│  │  - CallToolRequestHandler (11 issue tools)             │ │
│  │  - ListToolsRequestHandler                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │            ProviderFactory                            │   │
│  │  - Creates and caches issue providers                │   │
│  │  - Manages configuration                             │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │         MarkdownIssueProvider                         │   │
│  │  - File-based persistence (.wrangler/)               │   │
│  │  - Markdown with YAML frontmatter                    │   │
│  │  - Multiple collections (issues, specifications)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
└──────────────────────────────┴───────────────────────────────┘
                               │
                               │ File I/O
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                     File System                              │
│  .wrangler/                                                  │
│    ├── issues/                                               │
│    │   ├── implement-auth-000001.md                          │
│    │   └── fix-memory-leak-000002.md                         │
│    └── specifications/                                       │
│        └── auth-architecture-000003.md                       │
└──────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Test-Driven Development**: All features developed with tests first
2. **Provider Pattern**: Abstraction allows multiple storage backends
3. **Security First**: Path traversal protection, workspace boundaries
4. **Observable**: Built-in metrics and performance tracking
5. **MCP Compliant**: Full adherence to Model Context Protocol spec

## Component Description

### Core Components

#### 1. WranglerMCPServer (`src/server.ts`)

Main server class that:
- Initializes MCP SDK server
- Sets up stdio transport
- Registers tool handlers
- Manages configuration
- Tracks metrics

```typescript
const server = new WranglerMCPServer({
  name: 'wrangler-tools',
  version: '1.0.0',
  workspaceRoot: process.cwd(),
  debug: false
});

await server.start();
```

**Key Methods:**
- `start()`: Start the MCP server
- `stop()`: Gracefully shutdown
- `getMetrics()`: Export metrics as JSON
- `getPrometheusMetrics()`: Export Prometheus-format metrics

#### 2. ProviderFactory (`src/providers/factory.ts`)

Factory for creating and managing issue providers:
- Singleton pattern for provider instances
- Configuration management
- Provider lifecycle

```typescript
const factory = new ProviderFactory({
  issues: {
    provider: 'markdown',
    settings: {
      basePath: '/workspace',
      issuesDirectory: '.wrangler/issues'
    }
  }
});

const provider = factory.getIssueProvider();
```

#### 3. IssueProvider (`src/providers/base.ts`)

Abstract base class defining the issue management interface:

```typescript
abstract class IssueProvider {
  abstract createIssue(request: IssueCreateRequest): Promise<Issue>;
  abstract getIssue(id: string): Promise<Issue | null>;
  abstract updateIssue(request: IssueUpdateRequest): Promise<Issue>;
  abstract deleteIssue(id: string): Promise<void>;
  abstract listIssues(filters?: IssueFilters): Promise<Issue[]>;
  abstract searchIssues(options: IssueSearchOptions): Promise<Issue[]>;
  abstract getLabels(): Promise<string[]>;
  abstract getAssignees(): Promise<string[]>;
  abstract getProjects(): Promise<string[]>;
  abstract isHealthy(): Promise<boolean>;
}
```

#### 4. MarkdownIssueProvider (`src/providers/markdown.ts`)

Concrete implementation using Markdown files:

**Features:**
- YAML frontmatter for metadata
- Multiple collections (issues, specifications)
- Path traversal protection
- Automatic ID generation
- File name slugification

**File Format:**
```markdown
---
id: "000001"
title: "Issue Title"
type: "issue"
status: "open"
priority: "high"
labels: ["feature"]
createdAt: "2025-10-29T12:00:00.000Z"
updatedAt: "2025-10-29T12:00:00.000Z"
---

Issue description content in Markdown...
```

**Directory Structure:**
```
.wrangler/
├── issues/          # type: "issue"
└── specifications/  # type: "specification"
```

#### 5. Tool Implementations (`src/tools/issues/*.ts`)

Each tool follows a consistent pattern:

```typescript
// 1. Define Zod schema
export const toolSchema = z.object({
  // parameters
});

// 2. Export type
export type ToolParams = z.infer<typeof toolSchema>;

// 3. Implement tool function
export async function toolFunction(
  params: ToolParams,
  providerFactory: ProviderFactory
) {
  try {
    const provider = providerFactory.getIssueProvider();
    const result = await provider.operation(params);

    return {
      content: [{ type: 'text', text: 'Success message' }],
      isError: false,
      metadata: { /* additional data */ }
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true
    };
  }
}
```

**Available Tools:**
- `create.ts`: Create issues/specifications
- `list.ts`: List with filtering
- `search.ts`: Full-text search
- `get.ts`: Retrieve single issue
- `update.ts`: Update issue
- `delete.ts`: Delete issue
- `labels.ts`: Label management
- `metadata.ts`: Metadata operations
- `projects.ts`: Project management
- `mark-complete.ts`: Complete issue
- `all-complete.ts`: Check completion status

#### 6. Type Definitions (`src/types/*.ts`)

**issues.ts:**
```typescript
interface Issue {
  id: string;
  title: string;
  description: string;
  type: IssueArtifactType;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  assignee?: string;
  project?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  wranglerContext?: WranglerIssueContext;
}
```

**config.ts:**
```typescript
interface WranglerMCPConfig {
  name?: string;
  version?: string;
  workspaceRoot?: string;
  debug?: boolean;
  issues?: IssueProviderConfig;
}
```

**errors.ts:**
```typescript
enum MCPErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PATH_TRAVERSAL_DENIED = 'PATH_TRAVERSAL_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR'
}
```

#### 7. Observability (`src/observability/metrics.ts`)

Built-in metrics collection:

```typescript
interface ToolMetrics {
  toolName: string;
  serverId: string;
  invocationCount: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  lastInvokedAt: Date;
  errorsByType: Record<string, number>;
}
```

**Usage:**
```typescript
// Start tracking
const invocationId = globalMetrics.startInvocation(
  'issues_create',
  'wrangler-tools'
);

// Complete tracking
globalMetrics.completeInvocation(
  invocationId,
  success,
  errorCode,
  errorMessage
);

// Export metrics
const json = globalMetrics.exportJSON();
const prometheus = globalMetrics.exportPrometheus();
```

## Development Guide

### Prerequisites

```bash
npm install
```

### Project Structure

```
mcp/
├── __tests__/              # Test files
│   ├── types/              # Type definition tests
│   ├── providers/          # Provider tests
│   ├── tools/              # Tool tests
│   │   └── issues/         # Issue tool tests
│   ├── integration.test.ts # End-to-end tests
│   ├── metrics.test.ts     # Metrics tests
│   └── server.test.ts      # Server tests
├── dist/                   # Compiled JavaScript
├── src/                    # Source files
│   ├── observability/      # Metrics and monitoring
│   ├── providers/          # Storage providers
│   ├── tools/              # MCP tool implementations
│   │   └── issues/         # Issue management tools
│   ├── types/              # TypeScript definitions
│   ├── index.ts            # Server entry point
│   ├── server.ts           # Main server class
│   ├── bundle-entry.ts     # Bundle entry point
│   └── workspace-schema.ts # Workspace configuration schema
├── jest.config.js           # Jest test configuration
├── tsconfig.json            # TypeScript config
└── README.md                # This file
```

### Building

```bash
# Build once
npm run build:mcp

# Watch mode (rebuilds on change)
npm run watch:mcp
```

### Running Development Server

```bash
# With debug logging
npm run mcp:dev
```

### Adding a New Tool

Follow the TDD approach:

#### 1. Write Test First (RED)

```typescript
// __tests__/tools/issues/new-tool.test.ts
import { describe, it, expect } from '@jest/globals';
import { newToolSchema, newToolFunction } from '../../../src/tools/issues/new-tool';

describe('new-tool', () => {
  it('should do something', async () => {
    // Arrange
    const params = { /* test params */ };
    const factory = createTestProviderFactory();

    // Act
    const result = await newToolFunction(params, factory);

    // Assert
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('expected output');
  });
});
```

Run test: `npm test mcp/__tests__/tools/issues/new-tool.test.ts`

Expected: Test fails (RED)

#### 2. Implement Tool (GREEN)

```typescript
// src/tools/issues/new-tool.ts
import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';  // relative within src/

export const newToolSchema = z.object({
  // Define parameters with descriptions
  param: z.string().describe('Parameter description')
});

export type NewToolParams = z.infer<typeof newToolSchema>;

export async function newToolFunction(
  params: NewToolParams,
  providerFactory: ProviderFactory
) {
  try {
    const provider = providerFactory.getIssueProvider();

    // Implementation
    const result = await provider.someOperation(params);

    return {
      content: [{
        type: 'text',
        text: `Success: ${result}`
      }],
      isError: false,
      metadata: { /* metadata */ }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{
        type: 'text',
        text: `Error: ${message}`
      }],
      isError: true
    };
  }
}
```

Run test: `npm test mcp/__tests__/tools/issues/new-tool.test.ts`

Expected: Test passes (GREEN)

#### 3. Register Tool in Server

```typescript
// src/server.ts
import { newToolSchema, newToolFunction } from './tools/issues/new-tool.js';

// In setupTools():
case 'new_tool':
  result = await newToolFunction(
    newToolSchema.parse(args),
    this.providerFactory
  );
  break;

// In getAvailableTools():
{
  name: 'new_tool',
  description: 'Tool description for Claude',
  inputSchema: zodToJsonSchema(newToolSchema)
}
```

#### 4. Add Integration Test

```typescript
// __tests__/integration.test.ts
it('should use new tool', async () => {
  const result = await callTool('new_tool', { /* params */ });
  expect(result.isError).toBe(false);
});
```

#### 5. Refactor and Document

- Add JSDoc comments
- Extract common logic
- Add edge case tests
- Update documentation

### Adding a New Provider

To add a new storage backend (e.g., SQLite, API):

#### 1. Implement IssueProvider

```typescript
// src/providers/sqlite.ts
import { IssueProvider } from './base.js';

export class SQLiteIssueProvider extends IssueProvider {
  async createIssue(request: IssueCreateRequest): Promise<Issue> {
    // SQLite implementation
  }

  // Implement all abstract methods
}
```

#### 2. Update ProviderFactory

```typescript
// src/providers/factory.ts
case 'sqlite':
  if (!issueConfig.settings) {
    throw new Error('SQLite provider settings are required');
  }
  return new SQLiteIssueProvider(issueConfig.settings, issueConfig);
```

#### 3. Update Config Types

```typescript
// src/types/config.ts
export interface IssueProviderConfig {
  provider: 'markdown' | 'mock' | 'sqlite';
  settings?: MarkdownProviderSettings | SQLiteProviderSettings;
}

export interface SQLiteProviderSettings {
  databasePath: string;
}
```

#### 4. Write Tests

```typescript
// __tests__/providers/sqlite.test.ts
describe('SQLiteIssueProvider', () => {
  // Test all provider methods
});
```

## Testing Guide

### Test Philosophy

The Wrangler MCP server follows strict TDD:

1. **Write test first** (RED)
2. **Make it pass** (GREEN)
3. **Refactor** (REFACTOR)
4. **Verify** - Run all tests

### Running Tests

```bash
# All MCP tests
npm test mcp/

# Specific test file
npm test mcp/__tests__/tools/issues/create.test.ts

# Watch mode
npm test -- --watch mcp/

# Coverage
npm test -- --coverage mcp/
```

### Test Structure

#### Unit Tests

Test individual components in isolation:

```typescript
// __tests__/types/issues.test.ts
describe('IssueCreateRequestSchema', () => {
  it('should validate valid request', () => {
    const request = {
      title: 'Test',
      description: 'Description'
    };

    expect(() => IssueCreateRequestSchema.parse(request)).not.toThrow();
  });

  it('should reject empty title', () => {
    const request = {
      title: '',
      description: 'Description'
    };

    expect(() => IssueCreateRequestSchema.parse(request)).toThrow();
  });
});
```

#### Integration Tests

Test full workflows:

```typescript
// __tests__/integration.test.ts
describe('Issue Lifecycle', () => {
  it('should create, update, and complete issue', async () => {
    // Create
    const created = await callTool('issues_create', {
      title: 'Test Issue',
      description: 'Test'
    });
    const issueId = created.metadata.issueId;

    // Update
    const updated = await callTool('issues_update', {
      id: issueId,
      status: 'in_progress'
    });

    // Complete
    const completed = await callTool('issues_mark_complete', {
      id: issueId,
      note: 'Done'
    });

    // Verify
    const issue = await callTool('issues_get', { id: issueId });
    expect(issue.status).toBe('closed');
  });
});
```

#### Provider Tests

Test storage implementations:

```typescript
// __tests__/providers/markdown.test.ts
describe('MarkdownIssueProvider', () => {
  let provider: MarkdownIssueProvider;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrangler-test-'));
    provider = new MarkdownIssueProvider({
      basePath: tempDir,
      issuesDirectory: '.wrangler/issues'
    });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should create issue file', async () => {
    const issue = await provider.createIssue({
      title: 'Test',
      description: 'Description'
    });

    const filePath = path.join(
      tempDir,
      '.wrangler/issues',
      `test-${issue.id}.md`
    );

    expect(await fs.pathExists(filePath)).toBe(true);
  });
});
```

#### Server Tests

Test MCP protocol compliance:

```typescript
// __tests__/server.test.ts
describe('WranglerMCPServer', () => {
  it('should list available tools', async () => {
    const server = new WranglerMCPServer();
    const tools = server.getAvailableTools();

    expect(tools).toHaveLength(11);
    expect(tools[0]).toHaveProperty('name');
    expect(tools[0]).toHaveProperty('description');
    expect(tools[0]).toHaveProperty('inputSchema');
  });
});
```

### Test Utilities

Shared test helpers:

```typescript
// __tests__/tools/issues/test-utils.ts
export function createTestProviderFactory(): ProviderFactory {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));

  return new ProviderFactory({
    workspaceRoot: tempDir,
    issues: {
      provider: 'markdown',
      settings: {
        basePath: tempDir,
        issuesDirectory: '.wrangler/issues'
      }
    }
  });
}

export async function cleanupTestProvider(
  factory: ProviderFactory
): Promise<void> {
  const config = factory.getConfig();
  if (config.workspaceRoot) {
    await fs.remove(config.workspaceRoot);
  }
}
```

## API Reference

### Server API

#### Constructor

```typescript
new WranglerMCPServer(config?: WranglerMCPConfig)
```

Creates a new MCP server instance.

**Parameters:**
- `config.name`: Server name (default: "wrangler-tools")
- `config.version`: Server version (default: "1.0.0")
- `config.workspaceRoot`: Workspace directory (default: `process.cwd()`)
- `config.debug`: Enable debug logging (default: false)
- `config.issues`: Issue provider configuration

**Example:**
```typescript
const server = new WranglerMCPServer({
  name: 'my-wrangler',
  workspaceRoot: '/path/to/workspace',
  debug: true,
  issues: {
    provider: 'markdown',
    settings: {
      basePath: '/path/to/workspace',
      issuesDirectory: '.wrangler/issues',
      fileNaming: 'slug'
    }
  }
});
```

#### start()

```typescript
async start(): Promise<void>
```

Start the MCP server and begin listening for requests.

**Example:**
```typescript
await server.start();
console.log('Server started');
```

#### stop()

```typescript
async stop(): Promise<void>
```

Gracefully shutdown the server.

**Example:**
```typescript
await server.stop();
console.log('Server stopped');
```

#### getMetrics()

```typescript
getMetrics(): Record<string, ToolMetrics>
```

Export all tool metrics as JSON.

**Returns:**
```typescript
{
  "wrangler-tools:issues_create": {
    toolName: "issues_create",
    serverId: "wrangler-tools",
    invocationCount: 42,
    successCount: 40,
    errorCount: 2,
    totalDurationMs: 1250,
    averageLatencyMs: 29.76,
    minLatencyMs: 15,
    maxLatencyMs: 150,
    lastInvokedAt: "2025-10-29T12:00:00.000Z",
    errorsByType: {
      "VALIDATION_ERROR": 2
    }
  }
}
```

#### getPrometheusMetrics()

```typescript
getPrometheusMetrics(): string
```

Export metrics in Prometheus format.

**Returns:**
```
# HELP mcp_tool_invocations_total Total number of tool invocations
# TYPE mcp_tool_invocations_total counter
mcp_tool_invocations_total{tool="issues_create",server="wrangler-tools"} 42

# HELP mcp_tool_successes_total Total number of successful invocations
# TYPE mcp_tool_successes_total counter
mcp_tool_successes_total{tool="issues_create",server="wrangler-tools"} 40
...
```

### Provider API

#### createIssue()

```typescript
async createIssue(request: IssueCreateRequest): Promise<Issue>
```

Create a new issue or specification.

#### getIssue()

```typescript
async getIssue(id: string): Promise<Issue | null>
```

Retrieve a single issue by ID.

#### updateIssue()

```typescript
async updateIssue(request: IssueUpdateRequest): Promise<Issue>
```

Update an existing issue.

#### deleteIssue()

```typescript
async deleteIssue(id: string): Promise<void>
```

Delete an issue.

#### listIssues()

```typescript
async listIssues(filters?: IssueFilters): Promise<Issue[]>
```

List issues with optional filtering.

#### searchIssues()

```typescript
async searchIssues(options: IssueSearchOptions): Promise<Issue[]>
```

Search issues by keyword.

#### getLabels()

```typescript
async getLabels(): Promise<string[]>
```

Get all labels in use.

#### getAssignees()

```typescript
async getAssignees(): Promise<string[]>
```

Get all assignees.

#### getProjects()

```typescript
async getProjects(): Promise<string[]>
```

Get all projects.

#### isHealthy()

```typescript
async isHealthy(): Promise<boolean>
```

Check provider health.

## Performance

### Metrics

The server tracks performance metrics for all tool invocations:

- **Invocation count**: Total calls per tool
- **Success rate**: Percentage of successful calls
- **Latency**: Min/max/average response time
- **Error distribution**: Breakdown by error type

### Optimization Guidelines

#### 1. File I/O

- Markdown provider uses async file operations
- Files are read/written in UTF-8
- Gray-matter parses YAML frontmatter efficiently

**Benchmark:**
- Create issue: ~5-10ms
- List 100 issues: ~50-100ms
- Search 100 issues: ~75-150ms

#### 2. Memory

- Provider factory caches provider instances
- Issues loaded on-demand (not all in memory)
- Metrics keep last 10,000 invocations

**Memory usage:**
- Server: ~10-20 MB baseline
- Per issue in memory: ~1-2 KB
- Metrics: ~500 KB for 10,000 invocations

#### 3. Scalability

For large issue counts (>1000 issues):

- Use pagination with `limit` and `offset`
- Filter early to reduce result sets
- Consider indexing for search (future enhancement)

**Example:**
```typescript
// Bad: Load all issues
const allIssues = await issues_list({});

// Good: Paginate
const page1 = await issues_list({ limit: 50, offset: 0 });
const page2 = await issues_list({ limit: 50, offset: 50 });
```

#### 4. Concurrency

- All provider methods are async
- File operations use fs-extra (safe concurrent access)
- No locking needed for read operations
- Write operations are atomic at file level

### Monitoring

Enable debug logging to monitor performance:

```bash
WRANGLER_MCP_DEBUG=true node mcp/dist/src/index.js
```

Output includes:
- Tool invocations
- Parameters
- Response times
- Errors

Export metrics for analysis:

```typescript
const metrics = server.getMetrics();
console.log(JSON.stringify(metrics, null, 2));
```

## Security

### Path Traversal Protection

The Markdown provider validates all file paths:

```typescript
private assertWithinWorkspace(targetPath: string, action: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(this.basePath, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Attempted to ${action} outside of workspace: ${resolvedTarget}`
    );
  }
}
```

This prevents:
- Reading files outside workspace
- Writing files outside workspace
- Path traversal attacks (`../../etc/passwd`)

### Input Validation

All tools use Zod schemas for validation:

```typescript
export const createIssueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  // ... more validation
});
```

This ensures:
- Type safety
- Length limits
- Required fields
- Enum constraints

### Error Handling

Errors include remediation guidance:

```typescript
{
  code: 'PATH_TRAVERSAL_DENIED',
  message: 'Attempted to access file outside workspace',
  remediation: 'Ensure all paths are relative to workspace root'
}
```

## Future Enhancements

Planned improvements:

1. **Search Indexing**: Full-text search index for faster queries
2. **SQLite Provider**: Alternative backend for better query performance
3. **Webhooks**: Event notifications for issue changes
4. **Templates**: Issue templates for consistency
5. **Attachments**: File attachments on issues
6. **Comments**: Discussion threads on issues
7. **Relationships**: Link issues (blocks, relates to)
8. **Time Tracking**: Estimated vs. actual effort
9. **Custom Fields**: User-defined metadata
10. **Import/Export**: Bulk operations, GitHub sync

## Contributing

Follow the TDD approach:

1. Write failing test (RED)
2. Make test pass (GREEN)
3. Refactor (REFACTOR)
4. Run all tests (`npm test mcp/`)
5. Update documentation

All code must:
- Have test coverage
- Pass TypeScript compilation
- Follow existing patterns
- Include JSDoc comments

## License

MIT License - see LICENSE file for details
