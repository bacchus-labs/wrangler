/**
 * Test utilities for issue tools
 */

import { Issue, IssueCreateRequest, IssueUpdateRequest, IssueFilters, IssueSearchOptions } from '../../../src/types/issues';
import { IssueProvider } from '../../../src/providers/base';
import { ProviderFactory } from '../../../src/providers/factory';

/**
 * Mock issue provider for testing
 */
export class MockIssueProvider extends IssueProvider {
  private issues: Map<string, Issue> = new Map();
  private idCounter = 1;

  // Control behavior for testing
  public shouldThrowOnCreate = false;
  public shouldThrowOnGet = false;
  public shouldThrowOnUpdate = false;
  public shouldThrowOnDelete = false;
  public shouldThrowOnList = false;
  public shouldThrowOnSearch = false;

  async createIssue(request: IssueCreateRequest): Promise<Issue> {
    if (this.shouldThrowOnCreate) {
      throw new Error('Failed to create issue');
    }

    const id = `issue-${this.idCounter++}`;
    const now = new Date();

    const issue: Issue = {
      id,
      title: request.title,
      description: request.description,
      type: request.type || 'issue',
      status: request.status || 'open',
      priority: request.priority || 'medium',
      labels: request.labels || [],
      assignee: request.assignee,
      project: request.project,
      createdAt: now,
      updatedAt: now,
      wranglerContext: request.wranglerContext,
    };

    this.issues.set(id, issue);
    return issue;
  }

  async getIssue(id: string): Promise<Issue | null> {
    if (this.shouldThrowOnGet) {
      throw new Error('Failed to get issue');
    }
    return this.issues.get(id) || null;
  }

  async updateIssue(request: IssueUpdateRequest): Promise<Issue> {
    if (this.shouldThrowOnUpdate) {
      throw new Error('Failed to update issue');
    }

    const existing = this.issues.get(request.id);
    if (!existing) {
      throw new Error(`Issue not found: ${request.id}`);
    }

    const updated: Issue = {
      ...existing,
      ...request,
      updatedAt: new Date(),
      closedAt: request.status === 'closed' || request.status === 'cancelled' ? new Date() : existing.closedAt,
    };

    this.issues.set(request.id, updated);
    return updated;
  }

  async deleteIssue(id: string): Promise<void> {
    if (this.shouldThrowOnDelete) {
      throw new Error('Failed to delete issue');
    }

    if (!this.issues.has(id)) {
      throw new Error(`Issue not found: ${id}`);
    }

    this.issues.delete(id);
  }

  async listIssues(filters?: IssueFilters): Promise<Issue[]> {
    if (this.shouldThrowOnList) {
      throw new Error('Failed to list issues');
    }

    let issues = Array.from(this.issues.values());

    // Apply filters
    if (filters) {
      if (filters.ids) {
        issues = issues.filter(i => filters.ids!.includes(i.id));
      }
      if (filters.status) {
        issues = issues.filter(i => filters.status!.includes(i.status));
      }
      if (filters.priority) {
        issues = issues.filter(i => filters.priority!.includes(i.priority));
      }
      if (filters.labels && filters.labels.length > 0) {
        issues = issues.filter(i =>
          filters.labels!.some(label => i.labels.includes(label))
        );
      }
      if (filters.assignee) {
        issues = issues.filter(i => i.assignee === filters.assignee);
      }
      if (filters.project) {
        issues = issues.filter(i => i.project === filters.project);
      }
      if (filters.parentTaskId) {
        issues = issues.filter(i => i.wranglerContext?.parentTaskId === filters.parentTaskId);
      }
      if (filters.types) {
        issues = issues.filter(i => filters.types!.includes(i.type));
      } else if (filters.type) {
        issues = issues.filter(i => i.type === filters.type);
      }

      // Pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 100;
      issues = issues.slice(offset, offset + limit);
    }

    return issues;
  }

  async searchIssues(options: IssueSearchOptions): Promise<Issue[]> {
    if (this.shouldThrowOnSearch) {
      throw new Error('Failed to search issues');
    }

    const query = options.query.toLowerCase();
    const fields = options.fields || ['title', 'description', 'labels'];

    let issues = Array.from(this.issues.values()).filter(issue => {
      if (fields.includes('title') && issue.title.toLowerCase().includes(query)) {
        return true;
      }
      if (fields.includes('description') && issue.description.toLowerCase().includes(query)) {
        return true;
      }
      if (fields.includes('labels') && issue.labels.some(l => l.toLowerCase().includes(query))) {
        return true;
      }
      return false;
    });

    // Apply additional filters
    if (options.filters) {
      issues = await this.listIssues({ ...options.filters, ids: issues.map(i => i.id) });
    }

    // Apply sorting
    if (options.sortBy) {
      issues.sort((a, b) => {
        let comparison = 0;
        switch (options.sortBy) {
          case 'created':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updated':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'priority':
            const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
        }
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return issues;
  }

  async getLabels(): Promise<string[]> {
    const labels = new Set<string>();
    for (const issue of this.issues.values()) {
      issue.labels.forEach(l => labels.add(l));
    }
    return Array.from(labels);
  }

  async getAssignees(): Promise<string[]> {
    const assignees = new Set<string>();
    for (const issue of this.issues.values()) {
      if (issue.assignee) {
        assignees.add(issue.assignee);
      }
    }
    return Array.from(assignees);
  }

  async getProjects(): Promise<string[]> {
    const projects = new Set<string>();
    for (const issue of this.issues.values()) {
      if (issue.project) {
        projects.add(issue.project);
      }
    }
    return Array.from(projects);
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  // Test helper methods
  reset(): void {
    this.issues.clear();
    this.idCounter = 1;
    this.shouldThrowOnCreate = false;
    this.shouldThrowOnGet = false;
    this.shouldThrowOnUpdate = false;
    this.shouldThrowOnDelete = false;
    this.shouldThrowOnList = false;
    this.shouldThrowOnSearch = false;
  }

  addIssue(issue: Issue): void {
    this.issues.set(issue.id, issue);
  }

  getIssueCount(): number {
    return this.issues.size;
  }
}

/**
 * Mock provider factory for testing
 */
export class MockProviderFactory extends ProviderFactory {
  private mockIssueProvider: MockIssueProvider;

  constructor(mockIssueProvider?: MockIssueProvider) {
    super({ issues: { provider: 'mock' } });
    this.mockIssueProvider = mockIssueProvider || new MockIssueProvider();
  }

  getIssueProvider(): IssueProvider {
    return this.mockIssueProvider;
  }

  getMockIssueProvider(): MockIssueProvider {
    return this.mockIssueProvider;
  }
}

/**
 * Create a test issue
 */
export function createTestIssue(overrides?: Partial<Issue>): Issue {
  const now = new Date();
  return {
    id: 'test-1',
    title: 'Test Issue',
    description: 'Test description',
    type: 'issue',
    status: 'open',
    priority: 'medium',
    labels: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
