/**
 * Handler: create-issues
 * Creates MCP issues from the analysis result.
 * Used in the 'plan' phase after analysis.
 *
 * When MCP servers are configured and a queryFn is available (via deps),
 * dispatches an agent to create MCP issues for each task.
 * Falls back to stub behavior (just storing tasks) when MCP is not available.
 */

import type { WorkflowContext } from '../state.js';
import type { AnalysisResult, TaskDefinition } from '../schemas/index.js';
import type { HandlerDeps } from './registry.js';
import type { SDKResultMessage } from '../types.js';

/**
 * Schema for the structured output from the issue-creation agent.
 */
interface CreatedIssueMapping {
  taskId: string;
  issueId: string;
}

interface IssueCreationResult {
  createdIssues: CreatedIssueMapping[];
}

/**
 * Build the prompt for the issue-creation agent.
 */
function buildIssueCreationPrompt(
  tasks: TaskDefinition[],
  specPath?: string,
): string {
  const taskLines = tasks.map(t =>
    `- Task ID: "${t.id}", Title: "${t.title}", Description: "${t.description}", ` +
    `Complexity: ${t.estimatedComplexity}, Requirements: [${t.requirements.join(', ')}]`
  ).join('\n');

  const specRef = specPath ? `\nSpec path: ${specPath}\n` : '';

  return `Create MCP issues for the following workflow tasks using the issues_create tool.
${specRef}
For each task below, create one MCP issue with:
- title: the task title
- description: the task description
- type: "issue"
- status: "open"
- priority: map complexity (low -> "low", medium -> "medium", high -> "high")
- labels: ["workflow-engine", "auto-created"]

Tasks:
${taskLines}

After creating all issues, return a JSON object with the following structure:
{
  "createdIssues": [
    { "taskId": "<original task id>", "issueId": "<MCP issue ID returned>" }
  ]
}`;
}

/**
 * Attempt to create MCP issues via an agent query.
 * Returns the mapping of taskId -> issueId, or null on failure.
 */
async function createMcpIssues(
  tasks: TaskDefinition[],
  specPath: string | undefined,
  deps: HandlerDeps,
): Promise<Record<string, string> | null> {
  const prompt = buildIssueCreationPrompt(tasks, specPath);

  const generator = deps.queryFn({
    prompt,
    options: {
      mcpServers: deps.config.mcpServers,
      model: deps.config.defaults.model,
      cwd: deps.config.workingDirectory,
      permissionMode: deps.config.defaults.permissionMode,
      allowDangerouslySkipPermissions: deps.config.defaults.permissionMode === 'bypassPermissions',
      settingSources: deps.config.defaults.settingSources,
      outputFormat: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            createdIssues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  taskId: { type: 'string' },
                  issueId: { type: 'string' },
                },
                required: ['taskId', 'issueId'],
              },
            },
          },
          required: ['createdIssues'],
        },
      },
    },
  });

  let result: IssueCreationResult | null = null;

  for await (const message of generator) {
    if (isResultMessage(message)) {
      if (message.subtype === 'success' && message.structured_output != null) {
        const output = message.structured_output as IssueCreationResult;
        if (output.createdIssues && Array.isArray(output.createdIssues)) {
          result = output;
        }
      }
      // On error subtype, result stays null -- caller handles gracefully
    }
  }

  if (!result || !result.createdIssues || result.createdIssues.length === 0) {
    return null;
  }

  // Build taskId -> issueId map
  const idMap: Record<string, string> = {};
  for (const mapping of result.createdIssues) {
    if (mapping.taskId && mapping.issueId) {
      idMap[mapping.taskId] = mapping.issueId;
    }
  }

  return Object.keys(idMap).length > 0 ? idMap : null;
}

/**
 * Type guard for SDK result messages.
 */
function isResultMessage(msg: unknown): msg is SDKResultMessage {
  return typeof msg === 'object' && msg !== null && (msg as SDKResultMessage).type === 'result';
}

/**
 * Create MCP issues from analysis results.
 * Stores task IDs back into the analysis tasks and
 * sets up the context for per-task execution.
 *
 * When deps are provided and config.mcpServers is set,
 * dispatches an agent to create MCP issues for each task.
 * On failure or when MCP is unavailable, falls back to
 * storing tasks without MCP issue IDs.
 */
export async function createIssuesHandler(
  ctx: WorkflowContext,
  _input?: unknown,
  deps?: HandlerDeps,
): Promise<void> {
  const analysis = ctx.get('analysis') as AnalysisResult | undefined;
  if (!analysis) {
    throw new Error('create-issues handler requires "analysis" in context');
  }

  const tasks = analysis.tasks.map((task, index) => ({
    ...task,
    // Ensure each task has an ID
    id: task.id || `task-${String(index + 1).padStart(3, '0')}`,
  }));

  // Store prepared tasks back
  ctx.set('analysis', { ...analysis, tasks });

  // Track task IDs for checkpointing
  ctx.set('taskIds', tasks.map(t => t.id));
  ctx.set('tasksCompleted', []);
  ctx.set('tasksPending', tasks.map(t => t.id));

  // Attempt MCP issue creation if deps and mcpServers are available
  if (deps?.queryFn && deps?.config?.mcpServers) {
    const specPath = ctx.get('specPath') as string | undefined;

    try {
      const issueIdMap = await createMcpIssues(tasks, specPath, deps);
      if (issueIdMap) {
        ctx.set('mcpIssueIds', issueIdMap);
      }
    } catch {
      // MCP issue creation failed -- continue without MCP IDs.
      // Tasks are already stored above, so the workflow can proceed.
    }
  }
}
