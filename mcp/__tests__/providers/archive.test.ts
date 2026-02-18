/**
 * Tests for auto-archive functionality
 *
 * Requirements from ISS-000058:
 * 1. Auto-archive on close/cancel - Move files to archived/ subdirectory
 * 2. Include archived items in listings - Scan both root and archived/
 * 3. Reopening behavior - Move files back to root on reopen
 * 4. Backward compatibility - Handle existing closed items at root
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fsExtra from 'fs-extra';
import { MarkdownIssueProvider } from '../../src/providers/markdown.js';
import { IssueCreateRequest, IssueUpdateRequest, IssueStatus } from '../../src/types/issues.js';

// ESM compat
const fs = (fsExtra as any).default || fsExtra;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('MarkdownIssueProvider - Auto-archive', () => {
  let provider: MarkdownIssueProvider;
  let testDir: string;
  let issuesDir: string;
  let specsDir: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, '..', '__test-workspaces__', `archive-test-${Date.now()}`);
    issuesDir = path.join(testDir, 'issues');
    specsDir = path.join(testDir, 'specifications');

    await fs.ensureDir(issuesDir);
    await fs.ensureDir(specsDir);

    provider = new MarkdownIssueProvider({
      basePath: testDir,
      issuesDirectory: 'issues',
      specificationsDirectory: 'specifications',
      fileNaming: 'counter',
    });
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Auto-archive on status change to closed', () => {
    it('should move issue to archived/ when status changes to closed', async () => {
      // Create an open issue
      const createRequest: IssueCreateRequest = {
        title: 'Test Issue',
        description: 'This is a test issue',
        type: 'issue',
        status: 'open',
        priority: 'medium',
      };

      const issue = await provider.createIssue(createRequest);
      const originalPath = path.join(issuesDir, `${issue.id}-test-issue.md`);
      const archivedPath = path.join(issuesDir, 'archived', `${issue.id}-test-issue.md`);

      // Verify file exists at original location
      expect(await fs.pathExists(originalPath)).toBe(true);
      expect(await fs.pathExists(archivedPath)).toBe(false);

      // Update status to closed
      const updateRequest: IssueUpdateRequest = {
        id: issue.id,
        status: 'closed',
      };

      await provider.updateIssue(updateRequest);

      // Verify file moved to archived/
      expect(await fs.pathExists(originalPath)).toBe(false);
      expect(await fs.pathExists(archivedPath)).toBe(true);
    });

    it('should move specification to archived/ when status changes to closed', async () => {
      // Create an open specification
      const createRequest: IssueCreateRequest = {
        title: 'Test Spec',
        description: 'This is a test specification',
        type: 'specification',
        status: 'open',
        priority: 'high',
      };

      const spec = await provider.createIssue(createRequest);
      const originalPath = path.join(specsDir, `${spec.id}-test-spec.md`);
      const archivedPath = path.join(specsDir, 'archived', `${spec.id}-test-spec.md`);

      // Verify file exists at original location
      expect(await fs.pathExists(originalPath)).toBe(true);
      expect(await fs.pathExists(archivedPath)).toBe(false);

      // Update status to closed
      await provider.updateIssue({ id: spec.id, status: 'closed' });

      // Verify file moved to archived/
      expect(await fs.pathExists(originalPath)).toBe(false);
      expect(await fs.pathExists(archivedPath)).toBe(true);
    });

    it('should move issue to archived/ when status changes to cancelled', async () => {
      const createRequest: IssueCreateRequest = {
        title: 'Test Issue to Cancel',
        description: 'This issue will be cancelled',
        type: 'issue',
        status: 'in_progress',
      };

      const issue = await provider.createIssue(createRequest);
      const originalPath = path.join(issuesDir, `${issue.id}-test-issue-to-cancel.md`);
      const archivedPath = path.join(issuesDir, 'archived', `${issue.id}-test-issue-to-cancel.md`);

      // Update status to cancelled
      await provider.updateIssue({ id: issue.id, status: 'cancelled' });

      // Verify file moved to archived/
      expect(await fs.pathExists(originalPath)).toBe(false);
      expect(await fs.pathExists(archivedPath)).toBe(true);
    });

    it('should create archived/ directory if it does not exist', async () => {
      const archivedDir = path.join(issuesDir, 'archived');

      // Verify archived/ does not exist yet
      expect(await fs.pathExists(archivedDir)).toBe(false);

      const issue = await provider.createIssue({
        title: 'Test Issue',
        description: 'Test',
        type: 'issue',
        status: 'open',
      });

      // Close the issue
      await provider.updateIssue({ id: issue.id, status: 'closed' });

      // Verify archived/ directory was created
      expect(await fs.pathExists(archivedDir)).toBe(true);
    });

    it('should preserve all metadata when archiving', async () => {
      const createRequest: IssueCreateRequest = {
        title: 'Issue with Metadata',
        description: 'This issue has metadata',
        type: 'issue',
        status: 'open',
        priority: 'critical',
        labels: ['bug', 'urgent'],
        assignee: 'test-user',
        project: 'Test Project',
        wranglerContext: {
          agentId: 'agent-1',
          parentTaskId: 'parent-001',
          estimatedEffort: '2 days',
        },
      };

      const issue = await provider.createIssue(createRequest);

      // Close the issue
      await provider.updateIssue({ id: issue.id, status: 'closed' });

      // Retrieve the archived issue
      const archivedIssue = await provider.getIssue(issue.id);
      expect(archivedIssue).not.toBeNull();
      expect(archivedIssue?.id).toBe(issue.id);
      expect(archivedIssue?.title).toBe('Issue with Metadata');
      expect(archivedIssue?.priority).toBe('critical');
      expect(archivedIssue?.labels).toEqual(['bug', 'urgent']);
      expect(archivedIssue?.assignee).toBe('test-user');
      expect(archivedIssue?.project).toBe('Test Project');
      expect(archivedIssue?.wranglerContext).toEqual({
        agentId: 'agent-1',
        parentTaskId: 'parent-001',
        estimatedEffort: '2 days',
      });
    });
  });

  describe('Reopening archived issues', () => {
    it('should move issue back to root when status changes from closed to open', async () => {
      // Create and close an issue
      const issue = await provider.createIssue({
        title: 'Issue to Reopen',
        description: 'This issue will be reopened',
        type: 'issue',
        status: 'open',
      });

      await provider.updateIssue({ id: issue.id, status: 'closed' });

      const archivedPath = path.join(issuesDir, 'archived', `${issue.id}-issue-to-reopen.md`);
      const rootPath = path.join(issuesDir, `${issue.id}-issue-to-reopen.md`);

      // Verify it's in archived/
      expect(await fs.pathExists(archivedPath)).toBe(true);
      expect(await fs.pathExists(rootPath)).toBe(false);

      // Reopen the issue
      await provider.updateIssue({ id: issue.id, status: 'open' });

      // Verify it's back in root
      expect(await fs.pathExists(archivedPath)).toBe(false);
      expect(await fs.pathExists(rootPath)).toBe(true);
    });

    it('should move issue back to root when status changes from cancelled to in_progress', async () => {
      const issue = await provider.createIssue({
        title: 'Cancelled Issue',
        description: 'This issue was cancelled',
        type: 'issue',
        status: 'open',
      });

      await provider.updateIssue({ id: issue.id, status: 'cancelled' });

      const archivedPath = path.join(issuesDir, 'archived', `${issue.id}-cancelled-issue.md`);
      const rootPath = path.join(issuesDir, `${issue.id}-cancelled-issue.md`);

      // Restart work on the issue
      await provider.updateIssue({ id: issue.id, status: 'in_progress' });

      // Verify it's back in root
      expect(await fs.pathExists(archivedPath)).toBe(false);
      expect(await fs.pathExists(rootPath)).toBe(true);
    });

    it('should preserve metadata when reopening', async () => {
      const createRequest: IssueCreateRequest = {
        title: 'Issue to Reopen',
        description: 'Test reopening',
        type: 'issue',
        status: 'open',
        priority: 'high',
        labels: ['feature'],
        assignee: 'dev-1',
      };

      const issue = await provider.createIssue(createRequest);
      await provider.updateIssue({ id: issue.id, status: 'closed' });
      await provider.updateIssue({ id: issue.id, status: 'open' });

      const reopenedIssue = await provider.getIssue(issue.id);
      expect(reopenedIssue?.priority).toBe('high');
      expect(reopenedIssue?.labels).toEqual(['feature']);
      expect(reopenedIssue?.assignee).toBe('dev-1');
    });
  });

  describe('Listing includes archived issues', () => {
    it('should include archived issues in listIssues results', async () => {
      // Create multiple issues
      const issue1 = await provider.createIssue({
        title: 'Open Issue',
        description: 'Still open',
        type: 'issue',
        status: 'open',
      });

      const issue2 = await provider.createIssue({
        title: 'Closed Issue',
        description: 'Already closed',
        type: 'issue',
        status: 'open',
      });

      // Close one issue
      await provider.updateIssue({ id: issue2.id, status: 'closed' });

      // List all issues
      const allIssues = await provider.listIssues();

      expect(allIssues.length).toBe(2);
      const ids = allIssues.map(i => i.id).sort();
      expect(ids).toEqual([issue1.id, issue2.id].sort());
    });

    it('should filter archived issues by status', async () => {
      const issue1 = await provider.createIssue({
        title: 'Issue 1',
        description: 'Open',
        type: 'issue',
        status: 'open',
      });

      const issue2 = await provider.createIssue({
        title: 'Issue 2',
        description: 'Closed',
        type: 'issue',
        status: 'open',
      });

      await provider.updateIssue({ id: issue2.id, status: 'closed' });

      // List only closed issues
      const closedIssues = await provider.listIssues({ status: ['closed'] });
      expect(closedIssues.length).toBe(1);
      expect(closedIssues[0].id).toBe(issue2.id);

      // List only open issues
      const openIssues = await provider.listIssues({ status: ['open'] });
      expect(openIssues.length).toBe(1);
      expect(openIssues[0].id).toBe(issue1.id);
    });
  });

  describe('Search includes archived issues', () => {
    it('should search across both root and archived directories', async () => {
      const issue1 = await provider.createIssue({
        title: 'Frontend Bug',
        description: 'UI issue',
        type: 'issue',
        status: 'open',
      });

      const issue2 = await provider.createIssue({
        title: 'Frontend Feature',
        description: 'New UI',
        type: 'issue',
        status: 'open',
      });

      await provider.updateIssue({ id: issue2.id, status: 'closed' });

      // Search for "Frontend"
      const results = await provider.searchIssues({
        query: 'Frontend',
        fields: ['title'],
      });

      expect(results.length).toBe(2);
      const ids = results.map(i => i.id).sort();
      expect(ids).toEqual([issue1.id, issue2.id].sort());
    });
  });

  describe('Get retrieves from both locations', () => {
    it('should retrieve archived issues by ID', async () => {
      const issue = await provider.createIssue({
        title: 'Test Issue',
        description: 'To be archived',
        type: 'issue',
        status: 'open',
      });

      await provider.updateIssue({ id: issue.id, status: 'closed' });

      // Should still be able to retrieve by ID
      const retrieved = await provider.getIssue(issue.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(issue.id);
      expect(retrieved?.status).toBe('closed');
    });
  });

  describe('Edge cases', () => {
    it('should not move file if status does not change', async () => {
      const issue = await provider.createIssue({
        title: 'Test Issue',
        description: 'Test',
        type: 'issue',
        status: 'open',
      });

      const rootPath = path.join(issuesDir, `${issue.id}-test-issue.md`);

      // Update without changing status
      await provider.updateIssue({ id: issue.id, title: 'Updated Title' });

      // Should still be at root
      expect(await fs.pathExists(rootPath)).toBe(true);
    });

    it('should not move file when changing from open to in_progress', async () => {
      const issue = await provider.createIssue({
        title: 'Test Issue',
        description: 'Test',
        type: 'issue',
        status: 'open',
      });

      const rootPath = path.join(issuesDir, `${issue.id}-test-issue.md`);

      await provider.updateIssue({ id: issue.id, status: 'in_progress' });

      // Should still be at root (not archived)
      expect(await fs.pathExists(rootPath)).toBe(true);
    });

    it('should handle file collision gracefully', async () => {
      // Create and archive an issue
      const issue1 = await provider.createIssue({
        title: 'Test Issue',
        description: 'First',
        type: 'issue',
        status: 'open',
      });
      await provider.updateIssue({ id: issue1.id, status: 'closed' });

      // Manually create a file with same name at root (simulate collision scenario)
      const fileName = `${issue1.id}-test-issue.md`;
      const rootPath = path.join(issuesDir, fileName);
      await fs.writeFile(rootPath, '---\nid: fake\n---\nFake content', 'utf-8');

      // Reopen should overwrite
      await provider.updateIssue({ id: issue1.id, status: 'open' });

      // Verify the real issue is back
      const retrieved = await provider.getIssue(issue1.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.description).toBe('First');
    });
  });

  describe('Backward compatibility', () => {
    it('should handle existing closed issues at root level', async () => {
      // Manually create a closed issue at root (simulating old behavior)
      const issueId = 'ISS-000999';
      const fileName = `${issueId}-old-closed-issue.md`;
      const filePath = path.join(issuesDir, fileName);

      const content = `---
id: ${issueId}
title: Old Closed Issue
type: issue
status: closed
priority: medium
labels: []
createdAt: 2024-01-01T00:00:00.000Z
updatedAt: 2024-01-01T00:00:00.000Z
---

This is an old closed issue that exists at root.`;

      await fs.writeFile(filePath, content, 'utf-8');

      // Should be able to list it
      const issues = await provider.listIssues();
      const oldIssue = issues.find(i => i.id === issueId);
      expect(oldIssue).toBeDefined();
      expect(oldIssue?.status).toBe('closed');

      // Should be able to retrieve it
      const retrieved = await provider.getIssue(issueId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(issueId);
    });

    it('should move old closed issue to archived on next update', async () => {
      // Create old closed issue at root
      const issueId = 'ISS-000998';
      const fileName = `${issueId}-old-issue.md`;
      const rootPath = path.join(issuesDir, fileName);
      const archivedPath = path.join(issuesDir, 'archived', fileName);

      const content = `---
id: ${issueId}
title: Old Issue
type: issue
status: closed
priority: low
labels: []
createdAt: 2024-01-01T00:00:00.000Z
updatedAt: 2024-01-01T00:00:00.000Z
---

Old content.`;

      await fs.writeFile(rootPath, content, 'utf-8');

      // Update the issue
      await provider.updateIssue({ id: issueId, priority: 'medium' });

      // Should now be in archived/
      expect(await fs.pathExists(rootPath)).toBe(false);
      expect(await fs.pathExists(archivedPath)).toBe(true);
    });
  });
});
