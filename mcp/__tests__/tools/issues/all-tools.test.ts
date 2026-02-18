/**
 * Comprehensive tests for all issue tools
 */

import {
  createIssueTool,
  listIssuesTool,
  getIssueTool,
  updateIssueTool,
  deleteIssueTool,
  searchIssuesTool,
  issueLabelsTool,
  issueMetadataTool,
  issueProjectsTool,
  markCompleteIssueTool,
  issuesAllCompleteTool,
} from '../../../src/tools/issues';
import { MockProviderFactory, createTestIssue } from './test-utils';

describe('All Issue Tools Integration Tests', () => {
  let mockFactory: MockProviderFactory;

  beforeEach(() => {
    mockFactory = new MockProviderFactory();
    mockFactory.getMockIssueProvider().reset();
  });

  describe('list tool', () => {
    it('should list issues with filters', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Test 1', description: 'Desc 1', status: 'open', priority: 'high' });
      await provider.createIssue({ title: 'Test 2', description: 'Desc 2', status: 'closed', priority: 'low' });

      const result = await listIssuesTool({ status: ['open'] }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalIssues).toBe(1);
    });

    it('should handle empty results', async () => {
      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalIssues).toBe(0);
      expect(result.content[0].text).toContain('No issues found');
    });

    it('should handle provider errors', async () => {
      mockFactory.getMockIssueProvider().shouldThrowOnList = true;

      const result = await listIssuesTool({}, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to list issues');
    });
  });

  describe('get tool', () => {
    it('should get issue by ID', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Description' });

      const result = await getIssueTool({ id: created.id }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.issueId).toBe(created.id);
      expect(result.content[0].text).toContain('Test');
    });

    it('should handle non-existent issue', async () => {
      const result = await getIssueTool({ id: 'non-existent' }, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Issue not found');
    });

    it('should handle provider errors', async () => {
      mockFactory.getMockIssueProvider().shouldThrowOnGet = true;

      const result = await getIssueTool({ id: 'test-1' }, mockFactory);

      expect(result.isError).toBe(true);
    });
  });

  describe('update tool', () => {
    it('should update issue fields', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Original', description: 'Desc', status: 'open' });

      const result = await updateIssueTool(
        { id: created.id, title: 'Updated', status: 'closed' },
        mockFactory
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Updated');

      const updated = await provider.getIssue(created.id);
      expect(updated?.title).toBe('Updated');
      expect(updated?.status).toBe('closed');
    });

    it('should handle non-existent issue', async () => {
      const result = await updateIssueTool({ id: 'non-existent', title: 'New' }, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Issue not found');
    });

    it('should clear assignee with empty string', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({
        title: 'Test',
        description: 'Desc',
        assignee: 'alice',
      });

      const result = await updateIssueTool({ id: created.id, assignee: '' }, mockFactory);

      expect(result.isError).toBe(false);
      const updated = await provider.getIssue(created.id);
      expect(updated?.assignee).toBeUndefined();
    });
  });

  describe('delete tool', () => {
    it('should delete issue with confirmation', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Desc' });

      const result = await deleteIssueTool({ id: created.id, confirm: true }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Deleted issue');

      const deleted = await provider.getIssue(created.id);
      expect(deleted).toBeNull();
    });

    it('should reject without confirmation', async () => {
      const result = await deleteIssueTool({ id: 'test-1', confirm: false }, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('requires confirmation');
    });

    it('should handle non-existent issue', async () => {
      const result = await deleteIssueTool({ id: 'non-existent', confirm: true }, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Issue not found');
    });
  });

  describe('search tool', () => {
    it('should search issues by query', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Frontend Bug', description: 'UI issue' });
      await provider.createIssue({ title: 'Backend Feature', description: 'API enhancement' });

      const result = await searchIssuesTool({ query: 'frontend' }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalResults).toBe(1);
    });

    it('should search in specific fields', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Test', description: 'Important bug', labels: ['critical'] });

      const result = await searchIssuesTool({ query: 'critical', fields: ['labels'] }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.totalResults).toBe(1);
    });

    it('should limit results', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Test 1', description: 'test' });
      await provider.createIssue({ title: 'Test 2', description: 'test' });
      await provider.createIssue({ title: 'Test 3', description: 'test' });

      const result = await searchIssuesTool({ query: 'test', limit: 2 }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.displayedResults).toBe(2);
    });
  });

  describe('labels tool', () => {
    it('should list all labels', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Test 1', description: 'Desc', labels: ['bug', 'frontend'] });
      await provider.createIssue({ title: 'Test 2', description: 'Desc', labels: ['feature', 'backend'] });

      const result = await issueLabelsTool({ operation: 'list' }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.labels).toContain('bug');
      expect(result.metadata?.labels).toContain('feature');
    });

    it('should add labels to issue', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Desc', labels: ['bug'] });

      const result = await issueLabelsTool(
        { operation: 'add', issueId: created.id, labels: ['critical', 'frontend'] },
        mockFactory
      );

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.labels).toContain('bug');
      expect(updated?.labels).toContain('critical');
      expect(updated?.labels).toContain('frontend');
    });

    it('should remove labels from issue', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({
        title: 'Test',
        description: 'Desc',
        labels: ['bug', 'critical', 'frontend'],
      });

      const result = await issueLabelsTool(
        { operation: 'remove', issueId: created.id, labels: ['critical'] },
        mockFactory
      );

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.labels).toContain('bug');
      expect(updated?.labels).not.toContain('critical');
    });
  });

  describe('metadata tool', () => {
    it('should get wrangler context', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({
        title: 'Test',
        description: 'Desc',
        wranglerContext: { agentId: 'agent-1', parentTaskId: 'task-1' },
      });

      const result = await issueMetadataTool({ operation: 'get', issueId: created.id }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.wranglerContext).toEqual({ agentId: 'agent-1', parentTaskId: 'task-1' });
    });

    it('should set metadata value', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Desc' });

      const result = await issueMetadataTool(
        { operation: 'set', issueId: created.id, key: 'agentId', value: 'agent-1' },
        mockFactory
      );

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.wranglerContext?.agentId).toBe('agent-1');
    });

    it('should remove metadata value', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({
        title: 'Test',
        description: 'Desc',
        wranglerContext: { agentId: 'agent-1', parentTaskId: 'task-1' },
      });

      const result = await issueMetadataTool(
        { operation: 'remove', issueId: created.id, key: 'agentId' },
        mockFactory
      );

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.wranglerContext?.agentId).toBeUndefined();
      expect(updated?.wranglerContext?.parentTaskId).toBe('task-1');
    });
  });

  describe('projects tool', () => {
    it('should list all projects', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Test 1', description: 'Desc', project: 'project-a' });
      await provider.createIssue({ title: 'Test 2', description: 'Desc', project: 'project-b' });

      const result = await issueProjectsTool({ operation: 'list' }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.projects).toContain('project-a');
      expect(result.metadata?.projects).toContain('project-b');
    });

    it('should add issue to project', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Desc' });

      const result = await issueProjectsTool(
        { operation: 'add', issueId: created.id, project: 'my-project' },
        mockFactory
      );

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.project).toBe('my-project');
    });

    it('should remove issue from project', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Desc', project: 'my-project' });

      const result = await issueProjectsTool({ operation: 'remove', issueId: created.id }, mockFactory);

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.project).toBeNull();
    });
  });

  describe('mark-complete tool', () => {
    it('should mark issue as closed', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Desc', status: 'open' });

      const result = await markCompleteIssueTool({ id: created.id }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.status).toBe('closed');

      const updated = await provider.getIssue(created.id);
      expect(updated?.status).toBe('closed');
    });

    it('should append completion note', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const created = await provider.createIssue({ title: 'Test', description: 'Original', status: 'open' });

      const result = await markCompleteIssueTool({ id: created.id, note: 'Completed successfully' }, mockFactory);

      expect(result.isError).toBe(false);

      const updated = await provider.getIssue(created.id);
      expect(updated?.description).toContain('Original');
      expect(updated?.description).toContain('Completion Notes');
      expect(updated?.description).toContain('Completed successfully');
    });

    it('should handle non-existent issue', async () => {
      const result = await markCompleteIssueTool({ id: 'non-existent' }, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Issue not found');
    });
  });

  describe('all-complete tool', () => {
    it('should report all complete when all closed', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({ title: 'Test 1', description: 'Desc', status: 'closed' });
      await provider.createIssue({ title: 'Test 2', description: 'Desc', status: 'closed' });

      const result = await issuesAllCompleteTool({}, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.allComplete).toBe(true);
      expect(result.content[0].text).toContain('All 2 issues complete');
    });

    it('should report pending issues', async () => {
      const provider = mockFactory.getMockIssueProvider();
      const open1 = await provider.createIssue({ title: 'Test 1', description: 'Desc', status: 'open' });
      await provider.createIssue({ title: 'Test 2', description: 'Desc', status: 'closed' });
      const open2 = await provider.createIssue({ title: 'Test 3', description: 'Desc', status: 'in_progress' });

      const result = await issuesAllCompleteTool({}, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.allComplete).toBe(false);
      expect(result.metadata?.completedIssues).toBe(1);
      expect(result.metadata?.pendingIssues).toBe(2);
      expect(result.metadata?.pendingIssueIds).toContain(open1.id);
      expect(result.metadata?.pendingIssueIds).toContain(open2.id);
    });

    it('should handle no issues', async () => {
      const result = await issuesAllCompleteTool({}, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.noIssues).toBe(true);
      expect(result.content[0].text).toBe('No issues found.');
    });

    it('should filter by parent task ID', async () => {
      const provider = mockFactory.getMockIssueProvider();
      await provider.createIssue({
        title: 'Test 1',
        description: 'Desc',
        status: 'closed',
        wranglerContext: { parentTaskId: 'task-1' },
      });
      await provider.createIssue({
        title: 'Test 2',
        description: 'Desc',
        status: 'open',
        wranglerContext: { parentTaskId: 'task-2' },
      });

      const result = await issuesAllCompleteTool({ parentTaskId: 'task-1' }, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.allComplete).toBe(true);
      expect(result.metadata?.totalIssues).toBe(1);
    });
  });
});
