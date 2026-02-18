/**
 * Delete issue tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';

export const deleteIssueSchema = z.object({
  id: z.string().min(1).describe('Issue ID to delete'),
  confirm: z.boolean().describe('Confirmation flag to prevent accidental deletion'),
});

export type DeleteIssueParams = z.infer<typeof deleteIssueSchema>;

export async function deleteIssueTool(
  params: DeleteIssueParams,
  providerFactory: ProviderFactory
) {
  try {
    if (!params.confirm) {
      return {
        content: [
          {
            type: 'text',
            text: 'Deletion requires confirmation. Set confirm: true to proceed.',
          },
        ],
        isError: true,
      };
    }

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

    await issueProvider.deleteIssue(params.id);

    return {
      content: [
        {
          type: 'text',
          text: `Deleted issue "${existing.title}" (${params.id})`,
        },
      ],
      isError: false,
      metadata: {
        issueId: params.id,
        provider: providerFactory.getConfig().issues?.provider || 'markdown',
        deletedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Failed to delete issue: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
