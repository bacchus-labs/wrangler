/**
 * Tests for create issue tool
 */

import { createIssueTool, createIssueSchema, CreateIssueParams } from '../../../src/tools/issues/create';
import { MockProviderFactory } from './test-utils';

describe('createIssueTool', () => {
  let mockFactory: MockProviderFactory;

  beforeEach(() => {
    mockFactory = new MockProviderFactory();
    mockFactory.getMockIssueProvider().reset();
  });

  describe('schema validation', () => {
    it('should validate valid params', () => {
      const params: CreateIssueParams = {
        title: 'Test Issue',
        description: 'Test description',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const params = {
        title: '',
        description: 'Test description',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject title longer than 200 chars', () => {
      const params = {
        title: 'a'.repeat(201),
        description: 'Test description',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const params = {
        title: 'Test Issue',
        description: '',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should accept valid optional fields', () => {
      const params: CreateIssueParams = {
        title: 'Test Issue',
        description: 'Test description',
        type: 'specification',
        status: 'in_progress',
        priority: 'high',
        labels: ['bug', 'frontend'],
        assignee: 'john',
        project: 'project-1',
        wranglerContext: {
          agentId: 'agent-1',
          parentTaskId: 'task-1',
          estimatedEffort: '2h',
        },
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const params = {
        title: 'Test Issue',
        description: 'Test description',
        type: 'invalid',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const params = {
        title: 'Test Issue',
        description: 'Test description',
        status: 'invalid',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const params = {
        title: 'Test Issue',
        description: 'Test description',
        priority: 'invalid',
      };

      const result = createIssueSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('tool execution', () => {
    it('should create issue with minimal params', async () => {
      const params: CreateIssueParams = {
        title: 'Test Issue',
        description: 'Test description',
      };

      const result = await createIssueTool(params, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Created issue "Test Issue"');
      expect(result.content[0].text).toContain('issue-1');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.issueId).toBe('issue-1');
      expect(result.metadata?.type).toBe('issue');
      expect(result.metadata?.provider).toBe('mock');
      expect(result.metadata?.createdAt).toBeDefined();

      // Verify issue was created in provider
      const provider = mockFactory.getMockIssueProvider();
      expect(provider.getIssueCount()).toBe(1);
    });

    it('should create issue with all optional fields', async () => {
      const params: CreateIssueParams = {
        title: 'Feature Request',
        description: 'Add dark mode support',
        type: 'specification',
        status: 'in_progress',
        priority: 'high',
        labels: ['enhancement', 'ui'],
        assignee: 'alice',
        project: 'ui-improvements',
        wranglerContext: {
          agentId: 'agent-1',
          parentTaskId: 'epic-1',
          estimatedEffort: '5d',
        },
      };

      const result = await createIssueTool(params, mockFactory);

      expect(result.isError).toBe(false);
      expect(result.metadata?.issueId).toBe('issue-1');

      // Verify all fields were set
      const provider = mockFactory.getMockIssueProvider();
      const issue = await provider.getIssue('issue-1');
      expect(issue).toBeDefined();
      expect(issue!.title).toBe('Feature Request');
      expect(issue!.type).toBe('specification');
      expect(issue!.status).toBe('in_progress');
      expect(issue!.priority).toBe('high');
      expect(issue!.labels).toEqual(['enhancement', 'ui']);
      expect(issue!.assignee).toBe('alice');
      expect(issue!.project).toBe('ui-improvements');
      expect(issue!.wranglerContext).toEqual({
        agentId: 'agent-1',
        parentTaskId: 'epic-1',
        estimatedEffort: '5d',
      });
    });

    it('should use default values for optional fields', async () => {
      const params: CreateIssueParams = {
        title: 'Test Issue',
        description: 'Test description',
      };

      const result = await createIssueTool(params, mockFactory);

      expect(result.isError).toBe(false);

      const provider = mockFactory.getMockIssueProvider();
      const issue = await provider.getIssue('issue-1');
      expect(issue!.type).toBe('issue');
      expect(issue!.status).toBe('open');
      expect(issue!.priority).toBe('medium');
      expect(issue!.labels).toEqual([]);
    });

    it('should handle provider errors', async () => {
      const provider = mockFactory.getMockIssueProvider();
      provider.shouldThrowOnCreate = true;

      const params: CreateIssueParams = {
        title: 'Test Issue',
        description: 'Test description',
      };

      const result = await createIssueTool(params, mockFactory);

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Failed to create issue');
      expect(result.content[0].text).toContain('Failed to create issue');
    });

    it('should return correct metadata structure', async () => {
      const params: CreateIssueParams = {
        title: 'Test Issue',
        description: 'Test description',
      };

      const result = await createIssueTool(params, mockFactory);

      expect(result.metadata).toMatchObject({
        issueId: expect.any(String),
        type: 'issue',
        provider: 'mock',
        createdAt: expect.any(String),
      });

      // Verify ISO date format
      const createdAt = result.metadata?.createdAt as string;
      expect(new Date(createdAt).toISOString()).toBe(createdAt);
    });

    it('should handle special characters in title and description', async () => {
      const params: CreateIssueParams = {
        title: 'Issue with "quotes" and \'apostrophes\'',
        description: 'Description with\nnewlines and\ttabs',
      };

      const result = await createIssueTool(params, mockFactory);

      expect(result.isError).toBe(false);

      const provider = mockFactory.getMockIssueProvider();
      const issue = await provider.getIssue('issue-1');
      expect(issue!.title).toBe('Issue with "quotes" and \'apostrophes\'');
      expect(issue!.description).toBe('Description with\nnewlines and\ttabs');
    });
  });
});
