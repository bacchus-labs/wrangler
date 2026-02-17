/**
 * Wrangler MCP Server
 *
 * Main MCP server providing Wrangler-specific tools for issue management,
 * file operations, and workflow coordination.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createIssueSchema, createIssueTool } from './tools/issues/create.js';
import { listIssuesSchema, listIssuesTool } from './tools/issues/list.js';
import { searchIssuesSchema, searchIssuesTool } from './tools/issues/search.js';
import { updateIssueSchema, updateIssueTool } from './tools/issues/update.js';
import { getIssueSchema, getIssueTool } from './tools/issues/get.js';
import { deleteIssueSchema, deleteIssueTool } from './tools/issues/delete.js';
import { issueLabelsSchema, issueLabelsTool } from './tools/issues/labels.js';
import { issueMetadataSchema, issueMetadataTool } from './tools/issues/metadata.js';
import { issueProjectsSchema, issueProjectsTool } from './tools/issues/projects.js';
import { ProviderFactory } from './providers/factory.js';
import { createErrorResponse, MCPErrorCode, getRemediation } from './types/errors.js';
import { issuesAllCompleteSchema, issuesAllCompleteTool } from './tools/issues/all-complete.js';
import { markCompleteSchema, markCompleteIssueTool } from './tools/issues/mark-complete.js';
import { sessionStartSchema, sessionStartTool, sessionPhaseSchema, sessionPhaseTool, sessionCheckpointSchema, sessionCheckpointTool, sessionCompleteSchema, sessionCompleteTool, sessionGetSchema, sessionGetTool, sessionStatusSchema, sessionStatusTool, } from './tools/session/index.js';
import { SessionStorageProvider } from './providers/session-storage.js';
import { initWorkspaceSchema, initWorkspaceTool, } from './tools/workspace/index.js';
export class WranglerMCPServer {
    server;
    config;
    providerFactory;
    sessionStorage;
    transport;
    constructor(config = {}) {
        this.config = {
            name: 'wrangler-tools',
            version: '1.0.0',
            workspaceRoot: process.cwd(),
            ...config
        };
        this.server = new Server({
            name: this.config.name || 'wrangler-tools',
            version: this.config.version || '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        // Initialize stdio transport
        this.transport = new StdioServerTransport();
        // Initialize provider factory with proper configuration
        const providerConfig = {
            ...this.config,
            issues: this.config.issues || {
                provider: 'markdown',
                settings: {
                    basePath: this.config.workspaceRoot || process.cwd(),
                    issuesDirectory: '.wrangler/issues',
                },
            },
        };
        this.providerFactory = new ProviderFactory(providerConfig);
        // Initialize session storage provider
        this.sessionStorage = new SessionStorageProvider({
            basePath: this.config.workspaceRoot || process.cwd(),
        });
        this.setupTools();
    }
    setupTools() {
        // Issue Management Tools
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                let result;
                switch (name) {
                    case 'issues_create':
                        result = await createIssueTool(createIssueSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_list':
                        result = await listIssuesTool(listIssuesSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_search':
                        result = await searchIssuesTool(searchIssuesSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_update':
                        result = await updateIssueTool(updateIssueSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_get':
                        result = await getIssueTool(getIssueSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_delete':
                        result = await deleteIssueTool(deleteIssueSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_labels':
                        result = await issueLabelsTool(issueLabelsSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_metadata':
                        result = await issueMetadataTool(issueMetadataSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_projects':
                        result = await issueProjectsTool(issueProjectsSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_all_complete':
                        result = await issuesAllCompleteTool(issuesAllCompleteSchema.parse(args), this.providerFactory);
                        break;
                    case 'issues_mark_complete':
                        result = await markCompleteIssueTool(markCompleteSchema.parse(args), this.providerFactory);
                        break;
                    // Session management tools
                    case 'session_start':
                        result = await sessionStartTool(sessionStartSchema.parse(args), this.sessionStorage);
                        break;
                    case 'session_phase':
                        result = await sessionPhaseTool(sessionPhaseSchema.parse(args), this.sessionStorage);
                        break;
                    case 'session_checkpoint':
                        result = await sessionCheckpointTool(sessionCheckpointSchema.parse(args), this.sessionStorage);
                        break;
                    case 'session_complete':
                        result = await sessionCompleteTool(sessionCompleteSchema.parse(args), this.sessionStorage);
                        break;
                    case 'session_get':
                        result = await sessionGetTool(sessionGetSchema.parse(args), this.sessionStorage);
                        break;
                    case 'session_status':
                        result = await sessionStatusTool(sessionStatusSchema.parse(args), this.sessionStorage);
                        break;
                    // Workspace management tools
                    case 'init_workspace':
                        result = await initWorkspaceTool(initWorkspaceSchema.parse(args));
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
                return result;
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                // Determine error code based on error type
                let errorCode = MCPErrorCode.TOOL_EXECUTION_ERROR;
                if (error instanceof z.ZodError) {
                    errorCode = MCPErrorCode.VALIDATION_ERROR;
                }
                else if (message.includes('not found')) {
                    errorCode = MCPErrorCode.RESOURCE_NOT_FOUND;
                }
                else if (message.includes('permission') || message.includes('denied')) {
                    errorCode = MCPErrorCode.PERMISSION_DENIED;
                }
                else if (message.includes('Rate limit')) {
                    errorCode = MCPErrorCode.RATE_LIMIT_EXCEEDED;
                }
                else if (message.includes('traversal')) {
                    errorCode = MCPErrorCode.PATH_TRAVERSAL_DENIED;
                }
                const errorResponse = createErrorResponse(errorCode, `Error executing tool ${name}: ${message}`, {
                    context: { tool: name },
                    remediation: getRemediation(errorCode),
                    error: error instanceof Error ? error : undefined,
                    details: error instanceof z.ZodError ? error.errors : undefined,
                });
                // Return as CallToolResult (MCP SDK compatible)
                return {
                    content: errorResponse.content,
                    isError: errorResponse.isError,
                    ...(errorResponse.metadata && { _meta: errorResponse.metadata }),
                };
            }
        });
        // Add tools/list handler
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = this.getAvailableTools().map(tool => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
            }));
            return { tools };
        });
    }
    /**
     * Get the list of available tools
     */
    getAvailableTools() {
        return [
            {
                name: 'issues_create',
                description: 'Create a new Wrangler issue (Markdown under .wrangler/issues) with optional status, priority, assignee, and labels for local project tracking.',
                inputSchema: zodToJsonSchema(createIssueSchema),
            },
            {
                name: 'issues_list',
                description: 'List Wrangler issues in the workspace with filters for status, priority, labels, assignee, or project to review current local work items.',
                inputSchema: zodToJsonSchema(listIssuesSchema),
            },
            {
                name: 'issues_search',
                description: 'Search across Wrangler issue titles, descriptions, and labels to locate tasks by keyword while honoring the same filtering options as issues_list.',
                inputSchema: zodToJsonSchema(searchIssuesSchema),
            },
            {
                name: 'issues_update',
                description: 'Modify an existing Wrangler issue\'s frontmatter (status, priority, labels, assignee, etc.) after work progresses or context changes.',
                inputSchema: zodToJsonSchema(updateIssueSchema),
            },
            {
                name: 'issues_get',
                description: 'Retrieve the full Markdown content and metadata for a single Wrangler issue when you need complete local context before taking action.',
                inputSchema: zodToJsonSchema(getIssueSchema),
            },
            {
                name: 'issues_delete',
                description: 'Remove a Wrangler issue file; requires `confirm: true` and should be used only when local issue history can be safely discarded.',
                inputSchema: zodToJsonSchema(deleteIssueSchema),
            },
            {
                name: 'issues_labels',
                description: 'List, add, or remove labels across Wrangler issues to keep local tagging consistent with project conventions.',
                inputSchema: zodToJsonSchema(issueLabelsSchema),
            },
            {
                name: 'issues_metadata',
                description: 'Read or update the Wrangler-specific metadata block (`wranglerContext`) on an issue for workflow IDs, parent tasks, or other structured context.',
                inputSchema: zodToJsonSchema(issueMetadataSchema),
            },
            {
                name: 'issues_projects',
                description: 'List Wrangler issue projects or assign/clear a project on a local issue to keep work grouped by initiative.',
                inputSchema: zodToJsonSchema(issueProjectsSchema),
            },
            {
                name: 'issues_all_complete',
                description: 'Check whether all Wrangler issues are complete and receive a summary of pending vs. finished work.',
                inputSchema: zodToJsonSchema(issuesAllCompleteSchema),
            },
            {
                name: 'issues_mark_complete',
                description: 'Mark a Wrangler issue as closed and (optionally) append a completion note once the work is finished.',
                inputSchema: zodToJsonSchema(markCompleteSchema),
            },
            // Session management tools
            {
                name: 'session_start',
                description: 'Initialize a new orchestration session for spec implementation. Creates session directory, worktree, and branch.',
                inputSchema: zodToJsonSchema(sessionStartSchema),
            },
            {
                name: 'session_phase',
                description: 'Record a phase transition in the orchestration workflow (plan, execute, verify, publish).',
                inputSchema: zodToJsonSchema(sessionPhaseSchema),
            },
            {
                name: 'session_checkpoint',
                description: 'Save resumable state for session recovery. Call after each task completes to enable resume on interruption.',
                inputSchema: zodToJsonSchema(sessionCheckpointSchema),
            },
            {
                name: 'session_complete',
                description: 'Finalize a session after workflow completion. Records final status, PR info, and duration.',
                inputSchema: zodToJsonSchema(sessionCompleteSchema),
            },
            {
                name: 'session_get',
                description: 'Retrieve session state for recovery or status check. Omit sessionId to find most recent incomplete session.',
                inputSchema: zodToJsonSchema(sessionGetSchema),
            },
            {
                name: 'session_status',
                description: 'Get detailed status of a workflow session including active step, progress, and duration.',
                inputSchema: zodToJsonSchema(sessionStatusSchema),
            },
            // Workspace management tools
            {
                name: 'init_workspace',
                description: 'Initialize or verify the .wrangler/ workspace directory structure. In report-only mode (default), shows what would be created. With fix=true, creates directories, provisions assets, and manages configuration idempotently.',
                inputSchema: zodToJsonSchema(initWorkspaceSchema),
            },
        ];
    }
    /**
     * Start the MCP server
     */
    async start() {
        // Connect server to stdio transport (this automatically starts the transport)
        await this.server.connect(this.transport);
    }
    /**
     * Stop the MCP server
     */
    async stop() {
        await this.transport.close();
        await this.server.close();
    }
    /**
     * Get server instance for testing
     */
    getServer() {
        return this.server;
    }
}
// Export for use in other modules
export * from './types/config.js';
export * from './providers/factory.js';
//# sourceMappingURL=server.js.map