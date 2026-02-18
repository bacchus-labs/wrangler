/**
 * Get issue tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';

export const getIssueSchema = z.object({
  id: z.string().min(1).describe('Issue ID to retrieve'),
});

export type GetIssueParams = z.infer<typeof getIssueSchema>;

export async function getIssueTool(
  params: GetIssueParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();
    const issue = await issueProvider.getIssue(params.id);

    if (!issue) {
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

    const markdown = formatIssueAsMarkdown(issue);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      isError: false,
      metadata: {
        issueId: issue.id,
        type: issue.type,
        status: issue.status,
        priority: issue.priority,
        provider: providerFactory.getConfig().issues?.provider || 'markdown',
        issue: {
          ...issue,
          createdAt: issue.createdAt?.toISOString(),
          updatedAt: issue.updatedAt?.toISOString(),
          closedAt: issue.closedAt?.toISOString?.() ?? issue.closedAt,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Failed to get issue: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

function formatIssueAsMarkdown(issue: any): string {
  const parts: string[] = [];

  parts.push(`# ${issue.title}`);
  parts.push('');
  parts.push(`**ID:** ${issue.id}`);
  parts.push(`**Type:** ${issue.type}`);
  parts.push(`**Status:** ${issue.status}`);
  parts.push(`**Priority:** ${issue.priority}`);

  if (issue.labels && issue.labels.length > 0) {
    parts.push(`**Labels:** ${issue.labels.join(', ')}`);
  }

  if (issue.assignee) {
    parts.push(`**Assignee:** ${issue.assignee}`);
  }

  if (issue.project) {
    parts.push(`**Project:** ${issue.project}`);
  }

  parts.push('');
  parts.push('## Description');
  parts.push('');
  parts.push(issue.description);

  return parts.join('\n');
}
