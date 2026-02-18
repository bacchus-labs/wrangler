/**
 * Labels management tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';

export const issueLabelsSchema = z.object({
  operation: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
  issueId: z.string().optional().describe('Issue ID (required for add/remove operations)'),
  labels: z.array(z.string()).optional().describe('Labels to add or remove'),
});

export type IssueLabelsParams = z.infer<typeof issueLabelsSchema>;

export async function issueLabelsTool(
  params: IssueLabelsParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();

    if (params.operation === 'list') {
      if (params.issueId) {
        const issue = await issueProvider.getIssue(params.issueId);
        if (!issue) {
          return {
            content: [{ type: 'text', text: `Issue not found: ${params.issueId}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Labels for issue ${params.issueId}:\n${issue.labels.join(', ') || 'No labels'}`,
            },
          ],
          isError: false,
          metadata: {
            issueId: params.issueId,
            labels: issue.labels,
          },
        };
      } else {
        const labels = await issueProvider.getLabels();
        return {
          content: [
            {
              type: 'text',
              text: `Available labels:\n${labels.join(', ') || 'No labels found'}`,
            },
          ],
          isError: false,
          metadata: {
            labels,
            totalLabels: labels.length,
          },
        };
      }
    }

    if (!params.issueId) {
      return {
        content: [
          { type: 'text', text: 'issueId is required for add/remove operations' },
        ],
        isError: true,
      };
    }

    if (!params.labels || params.labels.length === 0) {
      return {
        content: [
          { type: 'text', text: 'labels array is required for add/remove operations' },
        ],
        isError: true,
      };
    }

    const issue = await issueProvider.getIssue(params.issueId);
    if (!issue) {
      return {
        content: [{ type: 'text', text: `Issue not found: ${params.issueId}` }],
        isError: true,
      };
    }

    let newLabels: string[];
    if (params.operation === 'add') {
      newLabels = [...new Set([...issue.labels, ...params.labels])];
    } else {
      newLabels = issue.labels.filter((l: string) => !params.labels!.includes(l));
    }

    const updated = await issueProvider.updateIssue({
      id: params.issueId,
      labels: newLabels,
    });

    return {
      content: [
        {
          type: 'text',
          text: `${params.operation === 'add' ? 'Added' : 'Removed'} labels ${params.operation === 'add' ? 'to' : 'from'} issue ${params.issueId}\nCurrent labels: ${updated.labels.join(', ') || 'none'}`,
        },
      ],
      isError: false,
      metadata: {
        issueId: params.issueId,
        operation: params.operation,
        labels: updated.labels,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Failed to manage labels: ${message}` }],
      isError: true,
    };
  }
}
