/**
 * Update issue tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';
import { IssueUpdateRequest } from '../../types/issues.js';

export const updateIssueSchema = z.object({
  id: z.string().min(1).describe('Issue ID to update'),
  title: z.string().min(1).max(200).optional().describe('New issue title'),
  description: z.string().min(1).optional().describe('New issue description'),
  type: z.enum(['issue', 'specification', 'idea']).optional().describe('Updated artifact type'),
  status: z.enum(['open', 'in_progress', 'closed', 'cancelled']).optional().describe('New issue status'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('New issue priority'),
  labels: z.array(z.string()).optional().describe('New labels for the issue'),
  assignee: z.string().optional().describe('New assignee (use empty string to unassign)'),
  project: z.string().optional().describe('New project association (use empty string to clear)'),
  wranglerContext: z
    .object({
      agentId: z.string().optional(),
      parentTaskId: z.string().optional(),
      estimatedEffort: z.string().optional(),
    })
    .optional()
    .describe('Updated Wrangler context information'),
});

export type UpdateIssueParams = z.infer<typeof updateIssueSchema>;

export async function updateIssueTool(
  params: UpdateIssueParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();

    const existing = await issueProvider.getIssue(params.id);
    if (!existing) {
      return {
        content: [
          {
            type: 'text',
            text: `Issue not found: ${params.id}`,
          },
        ],
        isError: true,
      };
    }

    const request: IssueUpdateRequest = {
      id: params.id,
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
      ...(params.type && { type: params.type }),
      ...(params.status && { status: params.status }),
      ...(params.priority && { priority: params.priority }),
      ...(params.labels && { labels: params.labels }),
      ...(params.assignee !== undefined && { assignee: params.assignee || undefined }),
      ...(params.project !== undefined && { project: params.project || null }),
      ...(params.wranglerContext && { wranglerContext: params.wranglerContext }),
    };

    const updated = await issueProvider.updateIssue(request);

    const changes = getChangeSummary(existing, updated);

    return {
      content: [
        {
          type: 'text',
          text: `Updated issue "${updated.title}" (${updated.id})\n\nChanges:\n${changes}`,
        },
      ],
      isError: false,
      metadata: {
        issueId: updated.id,
        provider: providerFactory.getConfig().issues?.provider || 'markdown',
        updatedAt: updated.updatedAt.toISOString(),
        changes: getChangedFields(existing, updated),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Failed to update issue: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

function getChangeSummary(before: any, after: any): string {
  const changes: string[] = [];

  if (before.title !== after.title) {
    changes.push(`- Title: "${before.title}" → "${after.title}"`);
  }
  if (before.status !== after.status) {
    changes.push(`- Status: ${before.status} → ${after.status}`);
  }
  if (before.priority !== after.priority) {
    changes.push(`- Priority: ${before.priority} → ${after.priority}`);
  }
  if (before.type !== after.type) {
    changes.push(`- Type: ${before.type} → ${after.type}`);
  }
  if (before.assignee !== after.assignee) {
    changes.push(`- Assignee: ${before.assignee || 'none'} → ${after.assignee || 'none'}`);
  }
  if (before.project !== after.project) {
    changes.push(`- Project: ${before.project || 'none'} → ${after.project || 'none'}`);
  }

  return changes.length > 0 ? changes.join('\n') : '- No changes';
}

function getChangedFields(before: any, after: any): string[] {
  const fields: string[] = [];

  if (before.title !== after.title) fields.push('title');
  if (before.description !== after.description) fields.push('description');
  if (before.status !== after.status) fields.push('status');
  if (before.priority !== after.priority) fields.push('priority');
  if (before.type !== after.type) fields.push('type');
  if (before.assignee !== after.assignee) fields.push('assignee');
  if (before.project !== after.project) fields.push('project');
  if (JSON.stringify(before.labels) !== JSON.stringify(after.labels)) fields.push('labels');

  return fields;
}
