/**
 * Search issues tool implementation
 */

import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';
import { IssueSearchOptions, IssueFiltersSchema } from '../../types/issues.js';

export const searchIssuesSchema = z.object({
  query: z.string().min(1).describe('Search query string'),
  fields: z
    .array(z.enum(['title', 'description', 'labels']))
    .optional()
    .describe('Fields to search in'),
  filters: IssueFiltersSchema.optional().describe('Additional filters'),
  sortBy: z
    .enum(['created', 'updated', 'priority', 'status'])
    .optional()
    .describe('Sort field'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
  limit: z.number().int().positive().max(1000).optional().describe('Maximum number of results'),
});

export type SearchIssuesParams = z.infer<typeof searchIssuesSchema>;

export async function searchIssuesTool(
  params: SearchIssuesParams,
  providerFactory: ProviderFactory
) {
  try {
    const issueProvider = providerFactory.getIssueProvider();

    const options: IssueSearchOptions = {
      query: params.query,
      fields: params.fields || ['title', 'description', 'labels'],
      filters: params.filters,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    };

    const issues = await issueProvider.searchIssues(options);

    const limited = params.limit ? issues.slice(0, params.limit) : issues;

    const markdown = formatSearchResults(limited, params.query);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
      isError: false,
      metadata: {
        totalResults: issues.length,
        displayedResults: limited.length,
        query: params.query,
        provider: providerFactory.getConfig().issues?.provider || 'markdown',
        issues: limited.map((issue: any) => ({
          id: issue.id,
          title: issue.title,
          type: issue.type,
          status: issue.status,
          priority: issue.priority,
        })),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Failed to search issues: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

function formatSearchResults(issues: any[], query: string): string {
  if (issues.length === 0) {
    return `No issues found matching "${query}".`;
  }

  const results: string[] = [
    `Found ${issues.length} issue(s) matching "${query}":`,
    '',
  ];

  issues.forEach((issue: any) => {
    results.push(`### ${issue.title}`);
    results.push(`**ID:** ${issue.id} | **Type:** ${issue.type} | **Status:** ${issue.status} | **Priority:** ${issue.priority}`);
    if (issue.labels && issue.labels.length > 0) {
      results.push(`**Labels:** ${issue.labels.join(', ')}`);
    }
    const preview = issue.description.length > 150
      ? issue.description.substring(0, 147) + '...'
      : issue.description;
    results.push(preview);
    results.push('');
  });

  return results.join('\n');
}
