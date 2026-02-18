/**
 * Metadata management tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';

export const issueMetadataSchema = z.object({
  operation: z.enum(['get', 'set', 'remove']).describe('Operation to perform'),
  issueId: z.string().min(1).describe('Issue ID'),
  key: z.string().optional().describe('Metadata key (required for set/remove operations)'),
  value: z.any().optional().describe('Metadata value (required for set operation)'),
});

export type IssueMetadataParams = z.infer<typeof issueMetadataSchema>;

export async function issueMetadataTool(
  params: IssueMetadataParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();

    const issue = await issueProvider.getIssue(params.issueId);
    if (!issue) {
      return {
        content: [{ type: 'text', text: `Issue not found: ${params.issueId}` }],
        isError: true,
      };
    }

    const context = issue.wranglerContext || {};

    if (params.operation === 'get') {
      const displayContext = JSON.stringify(context, null, 2);
      return {
        content: [
          {
            type: 'text',
            text: `Wrangler context for issue ${params.issueId}:\n\`\`\`json\n${displayContext}\n\`\`\``,
          },
        ],
        isError: false,
        metadata: {
          issueId: params.issueId,
          wranglerContext: context,
        },
      };
    }

    if (!params.key) {
      return {
        content: [
          { type: 'text', text: 'key is required for set/remove operations' },
        ],
        isError: true,
      };
    }

    if (params.operation === 'set') {
      if (params.value === undefined) {
        return {
          content: [{ type: 'text', text: 'value is required for set operation' }],
          isError: true,
        };
      }

      const newContext = { ...context, [params.key]: params.value };

      await issueProvider.updateIssue({
        id: params.issueId,
        wranglerContext: newContext,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Set wranglerContext.${params.key} = ${JSON.stringify(params.value)} for issue ${params.issueId}`,
          },
        ],
        isError: false,
        metadata: {
          issueId: params.issueId,
          key: params.key,
          value: params.value,
        },
      };
    } else {
      const newContext = { ...context };
      delete newContext[params.key as keyof typeof newContext];

      await issueProvider.updateIssue({
        id: params.issueId,
        wranglerContext: Object.keys(newContext).length > 0 ? newContext : undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Removed wranglerContext.${params.key} from issue ${params.issueId}`,
          },
        ],
        isError: false,
        metadata: {
          issueId: params.issueId,
          key: params.key,
        },
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Failed to manage metadata: ${message}` }],
      isError: true,
    };
  }
}
