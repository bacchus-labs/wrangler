/**
 * Comprehensive test suite for MarkdownIssueProvider
 * Following TDD principles - these tests are written BEFORE implementation
 */

import * as path from 'path';
import fs from 'fs-extra';
import { MarkdownIssueProvider } from '../../src/providers/markdown.js';
import { IssueProvider } from '../../src/providers/base.js';
import {
  Issue,
  IssueCreateRequest,
  IssueUpdateRequest,
  IssueFilters,
  IssueSearchOptions,
} from '../../src/types/issues.js';
import { MarkdownProviderSettings, IssueProviderConfig } from '../../src/types/config.js';

describe('IssueProvider (abstract class)', () => {
  let provider: IssueProvider;
  const testDir = path.join(process.cwd(), 'test-temp', 'abstract-provider-test');
  const settings: MarkdownProviderSettings = {
    basePath: testDir,
    fileNaming: 'counter',
  };
  const config: IssueProviderConfig = {
    provider: 'markdown',
    settings,
  };

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    provider = new MarkdownIssueProvider(settings, config);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('interface contract', () => {
    it('should implement all required abstract methods', () => {
      expect(typeof provider.createIssue).toBe('function');
      expect(typeof provider.getIssue).toBe('function');
      expect(typeof provider.updateIssue).toBe('function');
      expect(typeof provider.deleteIssue).toBe('function');
      expect(typeof provider.listIssues).toBe('function');
      expect(typeof provider.searchIssues).toBe('function');
      expect(typeof provider.getLabels).toBe('function');
      expect(typeof provider.getAssignees).toBe('function');
      expect(typeof provider.getProjects).toBe('function');
      expect(typeof provider.isHealthy).toBe('function');
    });
  });
});

describe('MarkdownIssueProvider', () => {
  let provider: MarkdownIssueProvider;
  const testDir = path.join(process.cwd(), 'test-temp', 'markdown-provider-test');
  const settings: MarkdownProviderSettings = {
    basePath: testDir,
    fileNaming: 'counter',
  };
  const config: IssueProviderConfig = {
    provider: 'markdown',
    settings,
  };

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    provider = new MarkdownIssueProvider(settings, config);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('createIssue()', () => {
    it('should create an issue file with correct naming format', async () => {
      const request: IssueCreateRequest = {
        title: 'Test Issue',
        description: 'This is a test issue description',
      };

      const issue = await provider.createIssue(request);

      expect(issue.id).toBe('ISS-000001');
      expect(issue.title).toBe('Test Issue');
      expect(issue.description).toBe('This is a test issue description');
      expect(issue.type).toBe('issue');
      expect(issue.status).toBe('open');
      expect(issue.priority).toBe('medium');
      expect(issue.labels).toEqual([]);
      expect(issue.createdAt).toBeInstanceOf(Date);
      expect(issue.updatedAt).toBeInstanceOf(Date);

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^ISS-000001-test-issue\.md$/);
    });

    it('should create file with correct frontmatter and content', async () => {
      const request: IssueCreateRequest = {
        title: 'Test Issue',
        description: 'Test description',
        status: 'in_progress',
        priority: 'high',
        labels: ['bug', 'urgent'],
        assignee: 'john@example.com',
        project: 'Project Alpha',
      };

      const issue = await provider.createIssue(request);

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      const filePath = path.join(issuesDir, files[0]);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('id: ISS-000001');
      expect(content).toContain('title: Test Issue');
      expect(content).toContain('status: in_progress');
      expect(content).toContain('priority: high');
      expect(content).toContain('- bug');
      expect(content).toContain('- urgent');
      expect(content).toContain('assignee: john@example.com');
      expect(content).toContain('project: Project Alpha');
      expect(content).toContain('Test description');
    });

    it('should create specification in correct directory', async () => {
      const request: IssueCreateRequest = {
        title: 'API Specification',
        description: 'REST API specification',
        type: 'specification',
      };

      const issue = await provider.createIssue(request);

      expect(issue.type).toBe('specification');
      const specDir = path.join(testDir, '.wrangler/specifications');
      const files = await fs.readdir(specDir);
      expect(files).toHaveLength(1);
    });

    it('should create idea in correct directory', async () => {
      const request: IssueCreateRequest = {
        title: 'New Feature Idea',
        description: 'We should add dark mode support',
        type: 'idea',
      };

      const issue = await provider.createIssue(request);

      expect(issue.type).toBe('idea');
      const ideaDir = path.join(testDir, '.wrangler/ideas');
      const files = await fs.readdir(ideaDir);
      expect(files).toHaveLength(1);
    });

    it('should increment counter correctly for multiple issues', async () => {
      const issue1 = await provider.createIssue({ title: 'First', description: 'First issue' });
      const issue2 = await provider.createIssue({ title: 'Second', description: 'Second issue' });
      const issue3 = await provider.createIssue({ title: 'Third', description: 'Third issue' });

      expect(issue1.id).toBe('ISS-000001');
      expect(issue2.id).toBe('ISS-000002');
      expect(issue3.id).toBe('ISS-000003');
    });

    it('should use per-type counters (issues and specs have independent IDs)', async () => {
      const issue1 = await provider.createIssue({ title: 'Issue 1', description: 'First issue', type: 'issue' });
      const spec1 = await provider.createIssue({ title: 'Spec 1', description: 'First spec', type: 'specification' });
      const idea1 = await provider.createIssue({ title: 'Idea 1', description: 'First idea', type: 'idea' });
      const issue2 = await provider.createIssue({ title: 'Issue 2', description: 'Second issue', type: 'issue' });
      const spec2 = await provider.createIssue({ title: 'Spec 2', description: 'Second spec', type: 'specification' });

      // Each type has its own counter
      expect(issue1.id).toBe('ISS-000001');
      expect(spec1.id).toBe('SPEC-000001');
      expect(idea1.id).toBe('IDEA-000001');
      expect(issue2.id).toBe('ISS-000002');
      expect(spec2.id).toBe('SPEC-000002');
    });

    it('should handle special characters in title', async () => {
      const request: IssueCreateRequest = {
        title: 'Fix: Bug with @user/package [URGENT]!!!',
        description: 'Description',
      };

      const issue = await provider.createIssue(request);

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      expect(files[0]).toMatch(/^ISS-000001-fix-bug-with-userpackage-urgent\.md$/);
    });

    it('should handle wranglerContext correctly', async () => {
      const request: IssueCreateRequest = {
        title: 'Task',
        description: 'Description',
        wranglerContext: {
          agentId: 'agent-456',
          parentTaskId: 'task-789',
          estimatedEffort: '2h',
        },
      };

      const issue = await provider.createIssue(request);

      expect(issue.wranglerContext).toEqual({
        agentId: 'agent-456',
        parentTaskId: 'task-789',
        estimatedEffort: '2h',
      });

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      const filePath = path.join(issuesDir, files[0]);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('wranglerContext:');
      expect(content).toContain('agentId: agent-456');
    });
  });

  describe('getIssue()', () => {
    it('should retrieve issue by ID', async () => {
      const created = await provider.createIssue({
        title: 'Test Issue',
        description: 'Description',
      });

      const retrieved = await provider.getIssue(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test Issue');
      expect(retrieved!.description).toBe('Description');
    });

    it('should return null for non-existent issue', async () => {
      const result = await provider.getIssue('999999');
      expect(result).toBeNull();
    });

    it('should retrieve specification from correct directory', async () => {
      const created = await provider.createIssue({
        title: 'Spec',
        description: 'Spec description',
        type: 'specification',
      });

      const retrieved = await provider.getIssue(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.type).toBe('specification');
    });
  });

  describe('updateIssue()', () => {
    it('should update issue frontmatter', async () => {
      const created = await provider.createIssue({
        title: 'Original Title',
        description: 'Original description',
        priority: 'low',
      });

      const updateRequest: IssueUpdateRequest = {
        id: created.id,
        title: 'Updated Title',
        priority: 'high',
        status: 'in_progress',
      };

      const updated = await provider.updateIssue(updateRequest);

      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('in_progress');
      expect(updated.description).toBe('Original description');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it('should update issue content/description', async () => {
      const created = await provider.createIssue({
        title: 'Title',
        description: 'Original description',
      });

      const updated = await provider.updateIssue({
        id: created.id,
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');

      const retrieved = await provider.getIssue(created.id);
      expect(retrieved!.description).toBe('Updated description');
    });

    it('should handle clearing assignee', async () => {
      const created = await provider.createIssue({
        title: 'Title',
        description: 'Description',
        assignee: 'john@example.com',
      });

      const updated = await provider.updateIssue({
        id: created.id,
        assignee: '',
      });

      expect(updated.assignee).toBe('');
    });

    it('should handle clearing project', async () => {
      const created = await provider.createIssue({
        title: 'Title',
        description: 'Description',
        project: 'Project A',
      });

      const updated = await provider.updateIssue({
        id: created.id,
        project: null,
      });

      expect(updated.project).toBeUndefined();
    });

    it('should move file when changing type', async () => {
      const created = await provider.createIssue({
        title: 'Title',
        description: 'Description',
        type: 'issue',
      });

      const updated = await provider.updateIssue({
        id: created.id,
        type: 'specification',
      });

      expect(updated.type).toBe('specification');

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const specsDir = path.join(testDir, '.wrangler/specifications');

      const issueFiles = await fs.readdir(issuesDir);
      const specFiles = await fs.readdir(specsDir);

      expect(issueFiles).toHaveLength(0);
      expect(specFiles).toHaveLength(1);
    });

    it('should throw error for non-existent issue', async () => {
      await expect(
        provider.updateIssue({
          id: '999999',
          title: 'Updated',
        })
      ).rejects.toThrow('Issue not found: 999999');
    });
  });

  describe('deleteIssue()', () => {
    it('should delete issue file', async () => {
      const created = await provider.createIssue({
        title: 'To Delete',
        description: 'Description',
      });

      await provider.deleteIssue(created.id);

      const result = await provider.getIssue(created.id);
      expect(result).toBeNull();

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      expect(files).toHaveLength(0);
    });

    it('should throw error for non-existent issue', async () => {
      await expect(provider.deleteIssue('999999')).rejects.toThrow('Issue not found: 999999');
    });
  });

  describe('listIssues()', () => {
    beforeEach(async () => {
      await provider.createIssue({
        title: 'Issue 1',
        description: 'Description 1',
        status: 'open',
        priority: 'high',
        labels: ['bug', 'frontend'],
        assignee: 'alice@example.com',
        project: 'Project A',
      });

      await provider.createIssue({
        title: 'Issue 2',
        description: 'Description 2',
        status: 'in_progress',
        priority: 'medium',
        labels: ['feature', 'backend'],
        assignee: 'bob@example.com',
        project: 'Project B',
      });

      await provider.createIssue({
        title: 'Issue 3',
        description: 'Description 3',
        status: 'closed',
        priority: 'low',
        labels: ['bug', 'backend'],
        assignee: 'alice@example.com',
        project: 'Project A',
      });

      await provider.createIssue({
        title: 'Spec 1',
        description: 'Spec description',
        type: 'specification',
        status: 'open',
      });
    });

    it('should list all issues without filters', async () => {
      const issues = await provider.listIssues();
      expect(issues.length).toBe(4);
    });

    it('should filter by status', async () => {
      const issues = await provider.listIssues({
        status: ['open'],
      });

      expect(issues.length).toBe(2);
      expect(issues.every(i => i.status === 'open')).toBe(true);
    });

    it('should filter by priority', async () => {
      const issues = await provider.listIssues({
        priority: ['high', 'medium'],
      });

      // Issue 1 (high), Issue 2 (medium), Spec 1 (medium default)
      expect(issues.length).toBe(3);
      expect(issues.every(i => ['high', 'medium'].includes(i.priority))).toBe(true);
    });

    it('should filter by labels', async () => {
      const issues = await provider.listIssues({
        labels: ['bug'],
      });

      expect(issues.length).toBe(2);
      expect(issues.every(i => i.labels.includes('bug'))).toBe(true);
    });

    it('should filter by assignee', async () => {
      const issues = await provider.listIssues({
        assignee: 'alice@example.com',
      });

      expect(issues.length).toBe(2);
      expect(issues.every(i => i.assignee === 'alice@example.com')).toBe(true);
    });

    it('should filter by project', async () => {
      const issues = await provider.listIssues({
        project: 'Project A',
      });

      expect(issues.length).toBe(2);
      expect(issues.every(i => i.project === 'Project A')).toBe(true);
    });

    it('should filter by type', async () => {
      const issues = await provider.listIssues({
        type: 'specification',
      });

      expect(issues.length).toBe(1);
      expect(issues[0].type).toBe('specification');
    });

    it('should filter by types array', async () => {
      const issues = await provider.listIssues({
        types: ['issue'],
      });

      expect(issues.length).toBe(3);
      expect(issues.every(i => i.type === 'issue')).toBe(true);
    });

    it('should filter by parentTaskId in wranglerContext', async () => {
      await provider.createIssue({
        title: 'Child Task',
        description: 'Description',
        wranglerContext: {
          parentTaskId: 'parent-123',
        },
      });

      const issues = await provider.listIssues({
        parentTaskId: 'parent-123',
      });

      expect(issues.length).toBe(1);
      expect(issues[0].wranglerContext?.parentTaskId).toBe('parent-123');
    });

    it('should respect limit and offset for pagination', async () => {
      const page1 = await provider.listIssues({ limit: 2, offset: 0 });
      const page2 = await provider.listIssues({ limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should sort by updatedAt descending by default', async () => {
      const issues = await provider.listIssues();
      for (let i = 0; i < issues.length - 1; i++) {
        expect(issues[i].updatedAt.getTime()).toBeGreaterThanOrEqual(
          issues[i + 1].updatedAt.getTime()
        );
      }
    });

    it('should combine multiple filters', async () => {
      const issues = await provider.listIssues({
        status: ['open', 'in_progress'],
        labels: ['bug'],
        assignee: 'alice@example.com',
      });

      expect(issues.length).toBe(1);
      expect(issues[0].title).toBe('Issue 1');
    });
  });

  describe('searchIssues()', () => {
    beforeEach(async () => {
      await provider.createIssue({
        title: 'Bug in authentication',
        description: 'Users cannot login with OAuth',
        labels: ['bug', 'auth'],
      });

      await provider.createIssue({
        title: 'Add dark mode',
        description: 'Implement dark theme for better UX',
        labels: ['feature', 'ui'],
      });

      await provider.createIssue({
        title: 'Performance issue',
        description: 'Login endpoint is slow',
        labels: ['performance', 'backend'],
      });
    });

    it('should search in title by default', async () => {
      const results = await provider.searchIssues({
        query: 'authentication',
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toContain('authentication');
    });

    it('should search in description', async () => {
      const results = await provider.searchIssues({
        query: 'login',
        fields: ['description'],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(i => i.description.toLowerCase().includes('login'))).toBe(true);
    });

    it('should search in labels', async () => {
      const results = await provider.searchIssues({
        query: 'auth',
        fields: ['labels'],
      });

      expect(results.length).toBe(1);
      expect(results[0].labels).toContain('auth');
    });

    it('should search in multiple fields', async () => {
      const results = await provider.searchIssues({
        query: 'login',
        fields: ['title', 'description'],
      });

      expect(results.length).toBe(2);
    });

    it('should be case-insensitive', async () => {
      const results = await provider.searchIssues({
        query: 'AUTHENTICATION',
      });

      expect(results.length).toBe(1);
    });

    it('should sort by priority', async () => {
      await provider.updateIssue({ id: 'ISS-000001', priority: 'high' });
      await provider.updateIssue({ id: 'ISS-000002', priority: 'low' });

      const results = await provider.searchIssues({
        query: '',
        sortBy: 'priority',
        sortOrder: 'asc',
      });

      expect(results[0].priority).toBe('low');
      expect(results[results.length - 1].priority).toBe('high');
    });

    it('should sort by created date', async () => {
      const results = await provider.searchIssues({
        query: '',
        sortBy: 'created',
        sortOrder: 'asc',
      });

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].createdAt.getTime()).toBeLessThanOrEqual(
          results[i + 1].createdAt.getTime()
        );
      }
    });

    it('should combine search with filters', async () => {
      const results = await provider.searchIssues({
        query: 'login',
        filters: {
          labels: ['bug'],
        },
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toContain('authentication');
    });
  });

  describe('getLabels()', () => {
    it('should return unique labels', async () => {
      await provider.createIssue({
        title: 'Issue 1',
        description: 'Desc',
        labels: ['bug', 'frontend'],
      });
      await provider.createIssue({
        title: 'Issue 2',
        description: 'Desc',
        labels: ['bug', 'backend'],
      });
      await provider.createIssue({
        title: 'Issue 3',
        description: 'Desc',
        labels: ['feature'],
      });

      const labels = await provider.getLabels();

      expect(labels).toEqual(['backend', 'bug', 'feature', 'frontend']);
    });

    it('should return empty array when no issues', async () => {
      const labels = await provider.getLabels();
      expect(labels).toEqual([]);
    });
  });

  describe('getAssignees()', () => {
    it('should return unique assignees', async () => {
      await provider.createIssue({
        title: 'Issue 1',
        description: 'Desc',
        assignee: 'alice@example.com',
      });
      await provider.createIssue({
        title: 'Issue 2',
        description: 'Desc',
        assignee: 'bob@example.com',
      });
      await provider.createIssue({
        title: 'Issue 3',
        description: 'Desc',
        assignee: 'alice@example.com',
      });
      await provider.createIssue({
        title: 'Issue 4',
        description: 'Desc',
      });

      const assignees = await provider.getAssignees();

      expect(assignees).toEqual(['alice@example.com', 'bob@example.com']);
    });

    it('should return empty array when no assignees', async () => {
      await provider.createIssue({ title: 'Issue', description: 'Desc' });
      const assignees = await provider.getAssignees();
      expect(assignees).toEqual([]);
    });
  });

  describe('getProjects()', () => {
    it('should return unique projects', async () => {
      await provider.createIssue({
        title: 'Issue 1',
        description: 'Desc',
        project: 'Project A',
      });
      await provider.createIssue({
        title: 'Issue 2',
        description: 'Desc',
        project: 'Project B',
      });
      await provider.createIssue({
        title: 'Issue 3',
        description: 'Desc',
        project: 'Project A',
      });

      const projects = await provider.getProjects();

      expect(projects).toEqual(['Project A', 'Project B']);
    });

    it('should return empty array when no projects', async () => {
      await provider.createIssue({ title: 'Issue', description: 'Desc' });
      const projects = await provider.getProjects();
      expect(projects).toEqual([]);
    });
  });

  describe('isHealthy()', () => {
    it('should return true when collections exist', async () => {
      await provider.createIssue({ title: 'Issue', description: 'Desc' });
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });

    it('should return false when no collections exist', async () => {
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(false);
    });
  });

  describe('path traversal prevention', () => {
    it('should prevent path traversal in collection registration', () => {
      const maliciousSettings: MarkdownProviderSettings = {
        basePath: testDir,
        issuesDirectory: '../../../etc/passwd',
      };

      expect(() => {
        new MarkdownIssueProvider(maliciousSettings, config);
      }).toThrow(/outside of workspace/);
    });

    it('should prevent absolute paths outside workspace', () => {
      const maliciousSettings: MarkdownProviderSettings = {
        basePath: testDir,
        issuesDirectory: '/etc/passwd',
      };

      expect(() => {
        new MarkdownIssueProvider(maliciousSettings, config);
      }).toThrow(/outside of workspace/);
    });
  });

  describe('counter generation', () => {
    it('should start counter at 1', async () => {
      const issue = await provider.createIssue({ title: 'First', description: 'Desc' });
      expect(issue.id).toBe('ISS-000001');
    });

    it('should detect highest existing counter for same type', async () => {
      const issuesDir = path.join(testDir, '.wrangler/issues');
      await fs.ensureDir(issuesDir);
      // Create legacy format file (without prefix)
      await fs.writeFile(
        path.join(issuesDir, '000005-existing.md'),
        '---\nid: \'000005\'\ntitle: Existing\n---\nContent'
      );

      const newProvider = new MarkdownIssueProvider(settings, config);
      const issue = await newProvider.createIssue({ title: 'New', description: 'Desc' });

      // Should continue from highest counter in issues dir (legacy support)
      expect(issue.id).toBe('ISS-000006');
    });

    it('should detect highest existing counter with new prefix format', async () => {
      const issuesDir = path.join(testDir, '.wrangler/issues');
      await fs.ensureDir(issuesDir);
      // Create new format file (with prefix)
      await fs.writeFile(
        path.join(issuesDir, 'ISS-000007-existing.md'),
        '---\nid: ISS-000007\ntitle: Existing\n---\nContent'
      );

      const newProvider = new MarkdownIssueProvider(settings, config);
      const issue = await newProvider.createIssue({ title: 'New', description: 'Desc' });

      expect(issue.id).toBe('ISS-000008');
    });

    it('should use independent counters per type (not scan across types)', async () => {
      const specsDir = path.join(testDir, '.wrangler/specifications');
      await fs.ensureDir(specsDir);
      await fs.writeFile(
        path.join(specsDir, 'SPEC-000010-spec.md'),
        '---\nid: SPEC-000010\ntitle: Spec\n---\nContent'
      );

      const newProvider = new MarkdownIssueProvider(settings, config);
      // Creating an issue should NOT be affected by spec counter
      const issue = await newProvider.createIssue({ title: 'New', description: 'Desc', type: 'issue' });

      // Issue counter starts at 1 (independent of specs)
      expect(issue.id).toBe('ISS-000001');

      // Spec counter continues from 10
      const spec = await newProvider.createIssue({ title: 'New Spec', description: 'Desc', type: 'specification' });
      expect(spec.id).toBe('SPEC-000011');
    });
  });

  describe('file naming strategies', () => {
    it('should use counter naming strategy', async () => {
      const counterSettings: MarkdownProviderSettings = {
        basePath: testDir,
        fileNaming: 'counter',
      };
      const counterProvider = new MarkdownIssueProvider(counterSettings, config);

      const issue = await counterProvider.createIssue({ title: 'Test Issue', description: 'Desc' });

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      expect(files[0]).toMatch(/^ISS-000001-test-issue\.md$/);
    });

    it('should use slug naming strategy', async () => {
      const slugSettings: MarkdownProviderSettings = {
        basePath: testDir,
        fileNaming: 'slug',
      };
      const slugProvider = new MarkdownIssueProvider(slugSettings, config);

      const issue = await slugProvider.createIssue({ title: 'Test Issue', description: 'Desc' });

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      expect(files[0]).toMatch(/^test-issue-ISS-000001\.md$/);
    });

    it('should use timestamp naming strategy', async () => {
      const timestampSettings: MarkdownProviderSettings = {
        basePath: testDir,
        fileNaming: 'timestamp',
      };
      const timestampProvider = new MarkdownIssueProvider(timestampSettings, config);

      const issue = await timestampProvider.createIssue({ title: 'Test Issue', description: 'Desc' });

      const issuesDir = path.join(testDir, '.wrangler/issues');
      const files = await fs.readdir(issuesDir);
      expect(files[0]).toMatch(/^\d+-test-issue\.md$/);
    });
  });

  describe('custom collections', () => {
    it('should support custom collection directories', async () => {
      const customSettings: MarkdownProviderSettings = {
        basePath: testDir,
        collections: {
          specification: { directory: '.wrangler/custom-specs' },
        },
      };

      const customConfig: IssueProviderConfig = {
        provider: 'markdown',
        settings: customSettings,
      };

      const customProvider = new MarkdownIssueProvider(customSettings, customConfig);

      await customProvider.createIssue({
        title: 'Spec',
        description: 'Description',
        type: 'specification',
      });

      const customDir = path.join(testDir, '.wrangler/custom-specs');
      const files = await fs.readdir(customDir);
      expect(files.length).toBe(1);
    });
  });
});
