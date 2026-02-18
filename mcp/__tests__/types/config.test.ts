import { describe, it, expect } from '@jest/globals';
import type {
  WranglerMCPConfig,
  IssueProviderConfig,
  MarkdownProviderSettings,
  MarkdownCollectionSettings,
} from '../../src/types/config.js';

describe('Config Types', () => {
  describe('WranglerMCPConfig', () => {
    it('should accept valid configuration', () => {
      const config: WranglerMCPConfig = {
        name: 'wrangler-mcp',
        version: '1.0.0',
        workspaceRoot: '/Users/sam/code/project',
        issues: {
          provider: 'markdown',
          settings: {
            basePath: '.wrangler/cockpit',
            issuesDirectory: 'issues',
            specificationsDirectory: 'specifications',
          },
        },
      };

      expect(config.name).toBe('wrangler-mcp');
      expect(config.version).toBe('1.0.0');
      expect(config.workspaceRoot).toBe('/Users/sam/code/project');
    });

    it('should accept minimal configuration', () => {
      const config: WranglerMCPConfig = {};

      expect(config.name).toBeUndefined();
      expect(config.version).toBeUndefined();
      expect(config.workspaceRoot).toBeUndefined();
      expect(config.issues).toBeUndefined();
    });
  });

  describe('IssueProviderConfig', () => {
    it('should accept markdown provider', () => {
      const config: IssueProviderConfig = {
        provider: 'markdown',
        settings: {
          basePath: '.wrangler/cockpit',
        },
      };

      expect(config.provider).toBe('markdown');
      expect((config.settings as MarkdownProviderSettings).basePath).toBe('.wrangler/cockpit');
    });

    it('should accept optional fields', () => {
      const config: IssueProviderConfig = {
        provider: 'markdown',
        settings: {
          basePath: '.wrangler/cockpit',
        },
        defaultLabels: ['bug', 'feature'],
        autoAssignment: true,
      };

      expect(config.defaultLabels).toEqual(['bug', 'feature']);
      expect(config.autoAssignment).toBe(true);
    });
  });

  describe('MarkdownProviderSettings', () => {
    it('should accept required basePath', () => {
      const settings: MarkdownProviderSettings = {
        basePath: '.wrangler/cockpit',
      };

      expect(settings.basePath).toBe('.wrangler/cockpit');
    });

    it('should accept all optional fields', () => {
      const settings: MarkdownProviderSettings = {
        basePath: '.wrangler/cockpit',
        issuesDirectory: 'issues',
        specificationsDirectory: 'specifications',
        fileNaming: 'timestamp',
      };

      expect(settings.issuesDirectory).toBe('issues');
      expect(settings.specificationsDirectory).toBe('specifications');
      expect(settings.fileNaming).toBe('timestamp');
    });

    it('should accept collections with custom directories', () => {
      const settings: MarkdownProviderSettings = {
        basePath: '.wrangler/cockpit',
        collections: {
          decisions: {
            directory: 'decisions',
          },
          proposals: {
            directory: 'proposals',
          },
        },
      };

      expect(settings.collections?.decisions.directory).toBe('decisions');
      expect(settings.collections?.proposals.directory).toBe('proposals');
    });

    it('should accept different file naming strategies', () => {
      const strategies: Array<'timestamp' | 'slug' | 'counter'> = ['timestamp', 'slug', 'counter'];

      strategies.forEach((strategy) => {
        const settings: MarkdownProviderSettings = {
          basePath: '.wrangler/cockpit',
          fileNaming: strategy,
        };

        expect(settings.fileNaming).toBe(strategy);
      });
    });
  });

  describe('MarkdownCollectionSettings', () => {
    it('should require directory field', () => {
      const collection: MarkdownCollectionSettings = {
        directory: 'custom-collection',
      };

      expect(collection.directory).toBe('custom-collection');
    });
  });
});
