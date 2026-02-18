/**
 * Tests for list issues tool - format parameter
 *
 * Tests the format parameter (full/summary/minimal) that controls
 * response verbosity for context efficiency.
 */

import { listIssuesTool, listIssuesSchema, ListIssuesParams } from '../../../src/tools/issues/list';
import { MockProviderFactory } from './test-utils';
import { Issue } from '../../../src/types/issues';

describe('listIssuesTool - format parameter', () => {
  let mockFactory: MockProviderFactory;

  beforeEach(() => {
    mockFactory = new MockProviderFactory();
    mockFactory.getMockIssueProvider().reset();
  });

  /**
   * Helper to seed issues into the mock provider
   */
  async function seedIssues(count: number = 3): Promise<Issue[]> {
    const provider = mockFactory.getMockIssueProvider();
    const issues: Issue[] = [];
    for (let i = 1; i <= count; i++) {
      const issue = await provider.createIssue({
        title: `Test Issue ${i}`,
        description: `Detailed description for issue ${i} that contains multiple sentences. This is important context about the issue. It explains what needs to be done and why.`,
        status: i === 1 ? 'open' : i === 2 ? 'in_progress' : 'closed',
        priority: i === 1 ? 'high' : i === 2 ? 'medium' : 'low',
        labels: [`label-${i}`, 'common'],
        assignee: `user-${i}`,
        project: 'test-project',
        wranglerContext: {
          agentId: `agent-${i}`,
          parentTaskId: 'parent-1',
          estimatedEffort: `${i}h`,
        },
      });
      issues.push(issue);
    }
    return issues;
  }

  describe('schema validation', () => {
    it('should accept format parameter with valid values', () => {
      expect(listIssuesSchema.safeParse({ format: 'full' }).success).toBe(true);
      expect(listIssuesSchema.safeParse({ format: 'summary' }).success).toBe(true);
      expect(listIssuesSchema.safeParse({ format: 'minimal' }).success).toBe(true);
    });

    it('should reject invalid format values', () => {
      const result = listIssuesSchema.safeParse({ format: 'verbose' });
      expect(result.success).toBe(false);
    });

    it('should accept params without format (optional)', () => {
      const result = listIssuesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept format combined with other filters', () => {
      const result = listIssuesSchema.safeParse({
        format: 'minimal',
        status: ['open'],
        priority: ['high'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('default behavior (summary format)', () => {
    it('should default to summary format when no format specified', async () => {
      await seedIssues(2);

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.format).toBe('summary');
    });

    it('should include id, title, status, priority, type in summary', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      const issues = result.metadata?.issues;
      expect(issues).toHaveLength(1);
      expect(issues[0]).toHaveProperty('id');
      expect(issues[0]).toHaveProperty('title');
      expect(issues[0]).toHaveProperty('status');
      expect(issues[0]).toHaveProperty('priority');
      expect(issues[0]).toHaveProperty('type');
    });

    it('should include labels in summary format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      const issues = result.metadata?.issues;
      expect(issues[0]).toHaveProperty('labels');
    });

    it('should NOT include description in summary format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('description');
    });

    it('should NOT include wranglerContext in summary format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('wranglerContext');
    });

    it('should NOT include timestamps in summary format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('createdAt');
      expect(issues[0]).not.toHaveProperty('updatedAt');
      expect(issues[0]).not.toHaveProperty('closedAt');
    });
  });

  describe('full format', () => {
    it('should return all fields when format is full', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'full' }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.format).toBe('full');
      const issues = result.metadata?.issues;
      expect(issues).toHaveLength(1);
      expect(issues[0]).toHaveProperty('id');
      expect(issues[0]).toHaveProperty('title');
      expect(issues[0]).toHaveProperty('description');
      expect(issues[0]).toHaveProperty('type');
      expect(issues[0]).toHaveProperty('status');
      expect(issues[0]).toHaveProperty('priority');
      expect(issues[0]).toHaveProperty('labels');
      expect(issues[0]).toHaveProperty('assignee');
      expect(issues[0]).toHaveProperty('project');
      expect(issues[0]).toHaveProperty('createdAt');
      expect(issues[0]).toHaveProperty('updatedAt');
      expect(issues[0]).toHaveProperty('wranglerContext');
    });

    it('should include full description text', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'full' }, mockFactory);

      const issues = result.metadata?.issues;
      expect(issues[0].description).toContain('Detailed description for issue 1');
    });

    it('should include complete wranglerContext', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'full' }, mockFactory);

      const issues = result.metadata?.issues;
      expect(issues[0].wranglerContext).toEqual({
        agentId: 'agent-1',
        parentTaskId: 'parent-1',
        estimatedEffort: '1h',
      });
    });
  });

  describe('minimal format', () => {
    it('should return only id, title, status when format is minimal', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.format).toBe('minimal');
      const issues = result.metadata?.issues;
      expect(issues).toHaveLength(1);
      expect(issues[0]).toHaveProperty('id');
      expect(issues[0]).toHaveProperty('title');
      expect(issues[0]).toHaveProperty('status');
    });

    it('should NOT include priority in minimal format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('priority');
    });

    it('should NOT include labels in minimal format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('labels');
    });

    it('should NOT include description, assignee, project in minimal format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('description');
      expect(issues[0]).not.toHaveProperty('assignee');
      expect(issues[0]).not.toHaveProperty('project');
    });

    it('should NOT include type in minimal format', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      const issues = result.metadata?.issues;
      expect(issues[0]).not.toHaveProperty('type');
    });
  });

  describe('text content formatting by format', () => {
    it('should display table in full and summary formats', async () => {
      await seedIssues(2);

      const fullResult = await listIssuesTool({ format: 'full' }, mockFactory);
      const summaryResult = await listIssuesTool({ format: 'summary' }, mockFactory);

      // Both full and summary should show a table
      expect(fullResult.content[0].text).toContain('|');
      expect(summaryResult.content[0].text).toContain('|');
    });

    it('should display compact list in minimal format', async () => {
      await seedIssues(2);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      // Minimal should show a compact format (not a wide table)
      expect(result.content[0].text).toContain('Found 2 issue(s)');
    });
  });

  describe('token efficiency', () => {
    it('should produce smaller metadata in summary vs full format', async () => {
      await seedIssues(5);

      const fullResult = await listIssuesTool({ format: 'full' }, mockFactory);
      const summaryResult = await listIssuesTool({ format: 'summary' }, mockFactory);

      const fullSize = JSON.stringify(fullResult.metadata?.issues).length;
      const summarySize = JSON.stringify(summaryResult.metadata?.issues).length;

      // Summary should be meaningfully smaller than full
      expect(summarySize).toBeLessThan(fullSize);
    });

    it('should produce smaller metadata in minimal vs summary format', async () => {
      await seedIssues(5);

      const summaryResult = await listIssuesTool({ format: 'summary' }, mockFactory);
      const minimalResult = await listIssuesTool({ format: 'minimal' }, mockFactory);

      const summarySize = JSON.stringify(summaryResult.metadata?.issues).length;
      const minimalSize = JSON.stringify(minimalResult.metadata?.issues).length;

      // Minimal should be meaningfully smaller than summary
      expect(minimalSize).toBeLessThan(summarySize);
    });
  });

  describe('format with filters', () => {
    it('should apply format along with status filter', async () => {
      await seedIssues(3);

      const result = await listIssuesTool(
        { format: 'minimal', status: ['open'] },
        mockFactory
      );

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalIssues).toBe(1);
      expect(result.metadata?.format).toBe('minimal');
      const issues = result.metadata?.issues;
      expect(issues).toHaveLength(1);
      expect(issues[0]).toHaveProperty('id');
      expect(issues[0]).not.toHaveProperty('description');
    });

    it('should apply format along with pagination', async () => {
      await seedIssues(5);

      const result = await listIssuesTool(
        { format: 'summary', limit: 2, offset: 0 },
        mockFactory
      );

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalIssues).toBe(2);
      expect(result.metadata?.format).toBe('summary');
    });
  });

  describe('backward compatibility', () => {
    it('should not break existing callers that do not pass format', async () => {
      await seedIssues(2);

      // Call without format - should work same as before but with summary default
      const result = await listIssuesTool({ status: ['open'] }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalIssues).toBe(1);
      expect(result.metadata?.provider).toBeDefined();
      expect(result.metadata?.filters).toBeDefined();
    });

    it('should still include totalIssues, provider, and filters in metadata', async () => {
      await seedIssues(1);

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      expect(result.metadata?.totalIssues).toBe(1);
      expect(result.metadata?.provider).toBe('mock');
      expect(result.metadata?.filters).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle provider errors regardless of format', async () => {
      mockFactory.getMockIssueProvider().shouldThrowOnList = true;

      const result = await listIssuesTool({ format: 'minimal' }, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to list issues');
    });

    it('should handle empty results in all formats', async () => {
      for (const format of ['full', 'summary', 'minimal'] as const) {
        const result = await listIssuesTool({ format }, mockFactory);

        expect(result.isError).toBe(false);
        expect(result.metadata?.totalIssues).toBe(0);
        expect(result.metadata?.format).toBe(format);
      }
    });
  });
});
