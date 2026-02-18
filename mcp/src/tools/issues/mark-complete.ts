/**
 * Mark complete tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';

export const markCompleteSchema = z.object({
  id: z.string().min(1).describe('Issue ID to mark as closed'),
  note: z.string().optional().describe('Optional completion note to append to the description'),
});

export type MarkCompleteParams = z.infer<typeof markCompleteSchema>;

export async function markCompleteIssueTool(
  params: MarkCompleteParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();

    const issue = await issueProvider.getIssue(params.id);
    if (!issue) {
      return {
        content: [{ type: 'text', text: `Issue not found: ${params.id}` }],
        isError: true,
      };
    }

    const now = new Date();
    const noteSection = params.note
      ? `\n\n---\n**Completion Notes (${now.toISOString()}):**\n${params.note}`
      : '';

    const updated = await issueProvider.updateIssue({
      id: issue.id,
      status: 'closed',
      description: noteSection ? `${issue.description}${noteSection}` : issue.description,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Marked issue "${updated.title}" (${updated.id}) as closed.`,
        },
      ],
      isError: false,
      metadata: {
        issueId: updated.id,
        status: updated.status,
        closedAt: updated.closedAt?.toISOString?.() ?? updated.closedAt ?? now.toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Failed to mark issue complete: ${message}` }],
      isError: true,
    };
  }
}
