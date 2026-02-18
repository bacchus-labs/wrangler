/**
 * Tests for 'idea' artifact type support
 * Following TDD: These tests should FAIL initially (RED phase)
 */

import * as path from 'path';
import fs from 'fs-extra';
import * as os from 'os';
import { MarkdownIssueProvider } from '../../src/providers/markdown';
import { IssueCreateRequest, IssueFilters } from '../../src/types/issues';

describe('Idea Artifact Type', () => {
  let tempDir: string;
  let provider: MarkdownIssueProvider;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = path.join(os.tmpdir(), `wrangler-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    provider = new MarkdownIssueProvider({
      basePath: tempDir,
    });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('Creating ideas', () => {
    it('should create idea in .wrangler/ideas/ directory', async () => {
      const request: IssueCreateRequest = {
        title: 'Add dark mode',
        description: 'Users want a dark mode option for better night-time viewing',
        type: 'idea',
      };

      const idea = await provider.createIssue(request);

      expect(idea.type).toBe('idea');
      expect(idea.title).toBe('Add dark mode');
      expect(idea.description).toBe('Users want a dark mode option for better night-time viewing');

      // Verify file was created in correct directory
      const ideasDir = path.join(tempDir, '.wrangler', 'ideas');
      const dirExists = await fs.pathExists(ideasDir);
      expect(dirExists).toBe(true);

      // Find the created file
      const files = await fs.readdir(ideasDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/\.md$/);
    });

    it('should include type: idea in frontmatter', async () => {
      const request: IssueCreateRequest = {
        title: 'Mobile app version',
        description: 'Consider building a native mobile app',
        type: 'idea',
      };

      const idea = await provider.createIssue(request);

      // Read the file and verify frontmatter
      const ideasDir = path.join(tempDir, '.wrangler', 'ideas');
      const files = await fs.readdir(ideasDir);
      const filePath = path.join(ideasDir, files[0]);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('type: idea');
      expect(content).toContain('title: Mobile app version');
    });

    it('should use default status and priority for ideas', async () => {
      const request: IssueCreateRequest = {
        title: 'Add dark mode',
        description: 'Users want a dark mode option',
        type: 'idea',
      };

      const idea = await provider.createIssue(request);

      expect(idea.status).toBe('open');
      expect(idea.priority).toBe('medium');
    });

    it('should allow custom status and priority for ideas', async () => {
      const request: IssueCreateRequest = {
        title: 'Critical idea',
        description: 'Important feature suggestion',
        type: 'idea',
        status: 'in_progress',
        priority: 'high',
      };

      const idea = await provider.createIssue(request);

      expect(idea.status).toBe('in_progress');
      expect(idea.priority).toBe('high');
    });
  });

  describe('Listing ideas', () => {
    it('should list only ideas when filtered by type', async () => {
      // Create mixed artifacts
      await provider.createIssue({
        title: 'Bug fix',
        description: 'Fix login bug',
        type: 'issue',
      });

      await provider.createIssue({
        title: 'Auth spec',
        description: 'Authentication specification',
        type: 'specification',
      });

      await provider.createIssue({
        title: 'Dark mode idea',
        description: 'Add dark mode',
        type: 'idea',
      });

      await provider.createIssue({
        title: 'Mobile app idea',
        description: 'Build mobile app',
        type: 'idea',
      });

      // List only ideas
      const filters: IssueFilters = {
        type: 'idea',
      };

      const ideas = await provider.listIssues(filters);

      expect(ideas.length).toBe(2);
      expect(ideas.every(i => i.type === 'idea')).toBe(true);
      expect(ideas.map(i => i.title).sort()).toEqual(['Dark mode idea', 'Mobile app idea']);
    });

    it('should list ideas using types array filter', async () => {
      await provider.createIssue({
        title: 'Bug',
        description: 'Bug',
        type: 'issue',
      });

      await provider.createIssue({
        title: 'Idea 1',
        description: 'First idea',
        type: 'idea',
      });

      await provider.createIssue({
        title: 'Idea 2',
        description: 'Second idea',
        type: 'idea',
      });

      const filters: IssueFilters = {
        types: ['idea'],
      };

      const ideas = await provider.listIssues(filters);

      expect(ideas.length).toBe(2);
      expect(ideas.every(i => i.type === 'idea')).toBe(true);
    });

    it('should list ideas and other types when multiple types specified', async () => {
      await provider.createIssue({
        title: 'Bug',
        description: 'Bug',
        type: 'issue',
      });

      await provider.createIssue({
        title: 'Spec',
        description: 'Spec',
        type: 'specification',
      });

      await provider.createIssue({
        title: 'Idea',
        description: 'Idea',
        type: 'idea',
      });

      const filters: IssueFilters = {
        types: ['specification', 'idea'],
      };

      const results = await provider.listIssues(filters);

      expect(results.length).toBe(2);
      expect(results.map(r => r.type).sort()).toEqual(['idea', 'specification']);
    });
  });

  describe('Searching ideas', () => {
    it('should search ideas by title', async () => {
      await provider.createIssue({
        title: 'Dark mode idea',
        description: 'Add dark mode support',
        type: 'idea',
      });

      await provider.createIssue({
        title: 'Light theme',
        description: 'Improve light theme',
        type: 'idea',
      });

      const results = await provider.searchIssues({
        query: 'dark',
        filters: { type: 'idea' },
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Dark mode idea');
    });

    it('should search ideas by description', async () => {
      await provider.createIssue({
        title: 'Feature A',
        description: 'Add mobile app support',
        type: 'idea',
      });

      await provider.createIssue({
        title: 'Feature B',
        description: 'Improve desktop experience',
        type: 'idea',
      });

      const results = await provider.searchIssues({
        query: 'mobile',
        filters: { type: 'idea' },
      });

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Feature A');
    });
  });

  describe('Updating ideas', () => {
    it('should update idea and keep in ideas directory', async () => {
      const idea = await provider.createIssue({
        title: 'Original idea',
        description: 'Original description',
        type: 'idea',
      });

      const updated = await provider.updateIssue({
        id: idea.id,
        title: 'Updated idea',
        description: 'Updated description',
      });

      expect(updated.type).toBe('idea');
      expect(updated.title).toBe('Updated idea');
      expect(updated.description).toBe('Updated description');

      // Verify still in ideas directory
      const ideasDir = path.join(tempDir, '.wrangler', 'ideas');
      const files = await fs.readdir(ideasDir);
      expect(files.length).toBe(1);
    });

    it('should move idea to specifications when type changes', async () => {
      const idea = await provider.createIssue({
        title: 'Idea that becomes spec',
        description: 'This started as an idea',
        type: 'idea',
      });

      await provider.updateIssue({
        id: idea.id,
        type: 'specification',
      });

      // Verify no longer in ideas directory
      const ideasDir = path.join(tempDir, '.wrangler', 'ideas');
      const ideaFiles = await fs.readdir(ideasDir);
      expect(ideaFiles.length).toBe(0);

      // Verify now in specifications directory
      const specsDir = path.join(tempDir, '.wrangler', 'specifications');
      const specFiles = await fs.readdir(specsDir);
      expect(specFiles.length).toBe(1);
    });
  });

  describe('Deleting ideas', () => {
    it('should delete idea from ideas directory', async () => {
      const idea = await provider.createIssue({
        title: 'Idea to delete',
        description: 'This will be deleted',
        type: 'idea',
      });

      await provider.deleteIssue(idea.id);

      const retrieved = await provider.getIssue(idea.id);
      expect(retrieved).toBeNull();

      // Verify file removed from ideas directory
      const ideasDir = path.join(tempDir, '.wrangler', 'ideas');
      const files = await fs.readdir(ideasDir);
      expect(files.length).toBe(0);
    });
  });

  describe('Getting ideas', () => {
    it('should retrieve idea by ID', async () => {
      const created = await provider.createIssue({
        title: 'Retrievable idea',
        description: 'Can be retrieved by ID',
        type: 'idea',
      });

      const retrieved = await provider.getIssue(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.type).toBe('idea');
      expect(retrieved!.title).toBe('Retrievable idea');
      expect(retrieved!.description).toBe('Can be retrieved by ID');
    });
  });
});
