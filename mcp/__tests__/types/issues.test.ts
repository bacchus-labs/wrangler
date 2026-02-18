import { describe, it, expect } from '@jest/globals';
import type {
  Issue,
  IssueArtifactType,
  IssueStatus,
  IssuePriority,
  IssueCreateRequest,
  IssueUpdateRequest,
  IssueFilters,
  IssueSearchOptions,
  WranglerIssueContext,
} from '../../src/types/issues.js';
import {
  IssueArtifactTypeSchema,
  IssueStatusSchema,
  IssuePrioritySchema,
  IssueCreateRequestSchema,
  IssueUpdateRequestSchema,
  IssueFiltersSchema,
  IssueSearchOptionsSchema,
  WranglerIssueContextSchema,
} from '../../src/types/issues.js';

describe('Issue Types', () => {
  describe('IssueArtifactType', () => {
    it('should accept valid artifact types', () => {
      const types: IssueArtifactType[] = ['issue', 'specification'];

      types.forEach((type) => {
        expect(IssueArtifactTypeSchema.parse(type)).toBe(type);
      });
    });

    it('should reject invalid artifact types', () => {
      expect(() => IssueArtifactTypeSchema.parse('invalid')).toThrow();
    });
  });

  describe('IssueStatus', () => {
    it('should accept valid statuses', () => {
      const statuses: IssueStatus[] = ['open', 'in_progress', 'closed', 'cancelled'];

      statuses.forEach((status) => {
        expect(IssueStatusSchema.parse(status)).toBe(status);
      });
    });

    it('should reject invalid statuses', () => {
      expect(() => IssueStatusSchema.parse('pending')).toThrow();
    });
  });

  describe('IssuePriority', () => {
    it('should accept valid priorities', () => {
      const priorities: IssuePriority[] = ['low', 'medium', 'high', 'critical'];

      priorities.forEach((priority) => {
        expect(IssuePrioritySchema.parse(priority)).toBe(priority);
      });
    });

    it('should reject invalid priorities', () => {
      expect(() => IssuePrioritySchema.parse('urgent')).toThrow();
    });
  });

  describe('WranglerIssueContext', () => {
    it('should accept valid context', () => {
      const context: WranglerIssueContext = {
        agentId: 'agent-123',
        parentTaskId: 'task-456',
        estimatedEffort: '2h',
      };

      const validated = WranglerIssueContextSchema.parse(context);
      expect(validated.agentId).toBe('agent-123');
      expect(validated.parentTaskId).toBe('task-456');
      expect(validated.estimatedEffort).toBe('2h');
    });

    it('should accept empty context', () => {
      const context: WranglerIssueContext = {};
      const validated = WranglerIssueContextSchema.parse(context);
      expect(validated).toEqual({});
    });

    it('should accept partial context', () => {
      const context: WranglerIssueContext = {
        agentId: 'agent-123',
      };

      const validated = WranglerIssueContextSchema.parse(context);
      expect(validated.agentId).toBe('agent-123');
      expect(validated.parentTaskId).toBeUndefined();
    });
  });

  describe('Issue', () => {
    it('should have all required fields', () => {
      const issue: Issue = {
        id: 'issue-001',
        title: 'Test Issue',
        description: 'Test description',
        type: 'issue',
        status: 'open',
        priority: 'medium',
        labels: ['bug'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(issue.id).toBe('issue-001');
      expect(issue.title).toBe('Test Issue');
      expect(issue.status).toBe('open');
    });

    it('should accept optional fields', () => {
      const issue: Issue = {
        id: 'issue-001',
        title: 'Test Issue',
        description: 'Test description',
        type: 'specification',
        status: 'in_progress',
        priority: 'high',
        labels: ['feature', 'enhancement'],
        assignee: 'user-123',
        project: 'project-alpha',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: new Date(),
        metadata: { source: 'api' },
        wranglerContext: {
          agentId: 'coder-agent',
          parentTaskId: 'epic-123',
        },
      };

      expect(issue.assignee).toBe('user-123');
      expect(issue.project).toBe('project-alpha');
      expect(issue.wranglerContext?.agentId).toBe('coder-agent');
    });
  });

  describe('IssueCreateRequest', () => {
    it('should validate minimal create request', () => {
      const request: IssueCreateRequest = {
        title: 'New Issue',
        description: 'Issue description',
      };

      const validated = IssueCreateRequestSchema.parse(request);
      expect(validated.title).toBe('New Issue');
      expect(validated.description).toBe('Issue description');
    });

    it('should validate full create request', () => {
      const request: IssueCreateRequest = {
        title: 'New Issue',
        description: 'Issue description',
        type: 'specification',
        status: 'open',
        priority: 'high',
        labels: ['feature'],
        assignee: 'user-123',
        project: 'project-alpha',
        wranglerContext: {
          agentId: 'planner',
          estimatedEffort: '4h',
        },
      };

      const validated = IssueCreateRequestSchema.parse(request);
      expect(validated.type).toBe('specification');
      expect(validated.priority).toBe('high');
      expect(validated.wranglerContext?.agentId).toBe('planner');
    });

    it('should reject missing required fields', () => {
      const request = {
        description: 'Missing title',
      };

      expect(() => IssueCreateRequestSchema.parse(request)).toThrow();
    });

    it('should reject invalid types', () => {
      const request = {
        title: 'Test',
        description: 'Test',
        type: 'invalid-type',
      };

      expect(() => IssueCreateRequestSchema.parse(request)).toThrow();
    });
  });

  describe('IssueUpdateRequest', () => {
    it('should validate minimal update request', () => {
      const request: IssueUpdateRequest = {
        id: 'issue-001',
      };

      const validated = IssueUpdateRequestSchema.parse(request);
      expect(validated.id).toBe('issue-001');
    });

    it('should validate full update request', () => {
      const request: IssueUpdateRequest = {
        id: 'issue-001',
        title: 'Updated Title',
        description: 'Updated description',
        type: 'specification',
        status: 'in_progress',
        priority: 'critical',
        labels: ['urgent'],
        assignee: 'user-456',
        project: 'project-beta',
        wranglerContext: {
          agentId: 'optimizer',
        },
      };

      const validated = IssueUpdateRequestSchema.parse(request);
      expect(validated.title).toBe('Updated Title');
      expect(validated.status).toBe('in_progress');
    });

    it('should accept null for project to clear it', () => {
      const request: IssueUpdateRequest = {
        id: 'issue-001',
        project: null,
      };

      const validated = IssueUpdateRequestSchema.parse(request);
      expect(validated.project).toBeNull();
    });

    it('should reject missing id', () => {
      const request = {
        title: 'Updated Title',
      };

      expect(() => IssueUpdateRequestSchema.parse(request)).toThrow();
    });
  });

  describe('IssueFilters', () => {
    it('should validate empty filters', () => {
      const filters: IssueFilters = {};
      const validated = IssueFiltersSchema.parse(filters);
      expect(validated).toEqual({});
    });

    it('should validate all filter fields', () => {
      const filters: IssueFilters = {
        ids: ['issue-001', 'issue-002'],
        status: ['open', 'in_progress'],
        priority: ['high', 'critical'],
        labels: ['bug', 'urgent'],
        assignee: 'user-123',
        project: 'project-alpha',
        parentTaskId: 'epic-001',
        types: ['issue', 'specification'],
        type: 'issue',
        createdAfter: new Date('2024-01-01'),
        createdBefore: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      };

      const validated = IssueFiltersSchema.parse(filters);
      expect(validated.status).toEqual(['open', 'in_progress']);
      expect(validated.priority).toEqual(['high', 'critical']);
      expect(validated.limit).toBe(10);
    });

    it('should reject invalid status values', () => {
      const filters = {
        status: ['invalid-status'],
      };

      expect(() => IssueFiltersSchema.parse(filters)).toThrow();
    });

    it('should reject negative limit', () => {
      const filters = {
        limit: -1,
      };

      expect(() => IssueFiltersSchema.parse(filters)).toThrow();
    });

    it('should reject negative offset', () => {
      const filters = {
        offset: -1,
      };

      expect(() => IssueFiltersSchema.parse(filters)).toThrow();
    });
  });

  describe('IssueSearchOptions', () => {
    it('should validate minimal search options', () => {
      const options: IssueSearchOptions = {
        query: 'test search',
      };

      const validated = IssueSearchOptionsSchema.parse(options);
      expect(validated.query).toBe('test search');
    });

    it('should validate full search options', () => {
      const options: IssueSearchOptions = {
        query: 'bug fix',
        fields: ['title', 'description'],
        filters: {
          status: ['open'],
          priority: ['high'],
        },
        sortBy: 'priority',
        sortOrder: 'desc',
      };

      const validated = IssueSearchOptionsSchema.parse(options);
      expect(validated.query).toBe('bug fix');
      expect(validated.fields).toEqual(['title', 'description']);
      expect(validated.sortBy).toBe('priority');
      expect(validated.sortOrder).toBe('desc');
    });

    it('should reject missing query', () => {
      const options = {
        fields: ['title'],
      };

      expect(() => IssueSearchOptionsSchema.parse(options)).toThrow();
    });

    it('should reject invalid search fields', () => {
      const options = {
        query: 'test',
        fields: ['invalid-field'],
      };

      expect(() => IssueSearchOptionsSchema.parse(options)).toThrow();
    });

    it('should reject invalid sort field', () => {
      const options = {
        query: 'test',
        sortBy: 'invalid',
      };

      expect(() => IssueSearchOptionsSchema.parse(options)).toThrow();
    });
  });
});
