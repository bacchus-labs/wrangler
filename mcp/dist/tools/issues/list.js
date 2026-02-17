/**
 * List issues tool implementation
 */
import { z } from 'zod';
export const listIssuesSchema = z.object({
    status: z.array(z.enum(['open', 'in_progress', 'closed', 'cancelled'])).optional().describe('Filter by status'),
    priority: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional().describe('Filter by priority'),
    labels: z.array(z.string()).optional().describe('Filter by labels'),
    assignee: z.string().optional().describe('Filter by assignee'),
    project: z.string().optional().describe('Filter by project'),
    parentTaskId: z.string().optional().describe('Filter issues whose wranglerContext.parentTaskId matches'),
    types: z.array(z.enum(['issue', 'specification', 'idea'])).optional().describe('Filter by artifact types'),
    type: z.enum(['issue', 'specification', 'idea']).optional().describe('Filter by a single artifact type'),
    limit: z.number().int().positive().max(1000).optional().describe('Maximum number of issues to return'),
    offset: z.number().int().min(0).optional().describe('Number of issues to skip for pagination'),
    format: z.enum(['full', 'summary', 'minimal']).optional().describe('Response format: full (all fields), summary (key fields, default), minimal (id/title/status only)')
});
export async function listIssuesTool(params, providerFactory) {
    try {
        const issueProvider = providerFactory.getIssueProvider();
        const format = params.format || 'summary';
        const filters = {
            status: params.status,
            priority: params.priority,
            labels: params.labels,
            assignee: params.assignee,
            project: params.project,
            parentTaskId: params.parentTaskId,
            types: params.types,
            type: params.type,
            limit: params.limit || 100,
            offset: params.offset || 0
        };
        const issues = await issueProvider.listIssues(filters);
        const structuredIssues = issues.map(issue => serializeIssue(issue, format));
        const textContent = formatIssuesText(issues, format);
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${issues.length} issue(s):\n\n${textContent}`
                }
            ],
            isError: false,
            metadata: {
                totalIssues: issues.length,
                provider: providerFactory.getConfig().issues?.provider || 'markdown',
                filters: filters,
                format: format,
                issues: structuredIssues
            }
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to list issues: ${message}`
                }
            ],
            isError: true
        };
    }
}
/**
 * Serialize an issue based on the requested format level.
 *
 * - full: all fields (original behavior)
 * - summary: id, title, type, status, priority, labels, assignee, project
 * - minimal: id, title, status only
 */
function serializeIssue(issue, format) {
    if (format === 'minimal') {
        return {
            id: issue.id,
            title: issue.title,
            status: issue.status,
        };
    }
    if (format === 'summary') {
        return {
            id: issue.id,
            title: issue.title,
            type: issue.type,
            status: issue.status,
            priority: issue.priority,
            labels: issue.labels,
            assignee: issue.assignee,
            project: issue.project,
        };
    }
    // full format - return everything
    return {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        status: issue.status,
        priority: issue.priority,
        labels: issue.labels,
        assignee: issue.assignee,
        project: issue.project,
        createdAt: issue.createdAt?.toISOString?.() ?? issue.createdAt,
        updatedAt: issue.updatedAt?.toISOString?.() ?? issue.updatedAt,
        closedAt: issue.closedAt?.toISOString?.() ?? issue.closedAt,
        wranglerContext: issue.wranglerContext || null
    };
}
/**
 * Format the text content for the response based on format level.
 */
function formatIssuesText(issues, format) {
    if (issues.length === 0) {
        return 'No issues found.';
    }
    if (format === 'minimal') {
        return formatIssuesAsCompactList(issues);
    }
    return formatIssuesAsTable(issues);
}
/**
 * Format issues as a compact list (for minimal format).
 */
function formatIssuesAsCompactList(issues) {
    return issues.map(issue => {
        const title = issue.title.length > 60
            ? issue.title.substring(0, 57) + '...'
            : issue.title;
        return `${issue.id} [${issue.status}] ${title}`;
    }).join('\n');
}
function formatIssuesAsTable(issues) {
    if (issues.length === 0) {
        return 'No issues found.';
    }
    const headers = ['ID', 'Title', 'Type', 'Status', 'Priority', 'Labels'];
    const rows = issues.map(issue => [
        issue.id,
        issue.title.length > 50 ? issue.title.substring(0, 47) + '...' : issue.title,
        issue.type,
        issue.status,
        issue.priority,
        issue.labels.join(', ')
    ]);
    const widths = headers.map((header, i) => Math.max(header.length, Math.max(...rows.map(row => (row[i] || '').toString().length))));
    const separator = '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |';
    const headerRow = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';
    const dataRows = rows.map(row => '| ' + row.map((cell, i) => (cell || '').toString().padEnd(widths[i])).join(' | ') + ' |');
    return [headerRow, separator, ...dataRows].join('\n');
}
//# sourceMappingURL=list.js.map