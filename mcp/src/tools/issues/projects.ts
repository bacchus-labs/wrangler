/**
 * Projects management tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';

export const issueProjectsSchema = z.object({
  operation: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
  issueId: z.string().optional().describe('Issue ID (required for add/remove operations)'),
  project: z.string().optional().describe('Project name for add operations'),
});

export type IssueProjectsParams = z.infer<typeof issueProjectsSchema>;

export async function issueProjectsTool(
  params: IssueProjectsParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();

    if (params.operation === 'list') {
      const projects = await issueProvider.getProjects();
      return {
        content: [
          {
            type: 'text',
            text: `Available projects:\n${projects.join(', ') || 'No projects found'}`,
          },
        ],
        isError: false,
        metadata: {
          projects,
          totalProjects: projects.length,
        },
      };
    }

    if (!params.issueId) {
      return {
        content: [
          { type: 'text', text: 'issueId is required for add/remove operations' },
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

    if (params.operation === 'add') {
      if (!params.project) {
        return {
          content: [
            { type: 'text', text: 'project is required for add operation' },
          ],
          isError: true,
        };
      }

      await issueProvider.updateIssue({
        id: params.issueId,
        project: params.project,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Added issue ${params.issueId} to project "${params.project}"`,
          },
        ],
        isError: false,
        metadata: {
          issueId: params.issueId,
          project: params.project,
        },
      };
    } else {
      await issueProvider.updateIssue({
        id: params.issueId,
        project: null,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Removed issue ${params.issueId} from project`,
          },
        ],
        isError: false,
        metadata: {
          issueId: params.issueId,
        },
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Failed to manage projects: ${message}` }],
      isError: true,
    };
  }
}
