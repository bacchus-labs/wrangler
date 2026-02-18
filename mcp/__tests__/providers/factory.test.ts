/**
 * Tests for ProviderFactory
 */

import { ProviderFactory } from '../../src/providers/factory.js';
import { MarkdownIssueProvider } from '../../src/providers/markdown.js';
import { IssueProviderConfig, MarkdownProviderSettings } from '../../src/types/config.js';
import * as path from 'path';

describe('ProviderFactory', () => {
  const testDir = path.join(process.cwd(), 'test-temp', 'factory-test');

  describe('createProvider()', () => {
    it('should create a markdown provider', () => {
      const settings: MarkdownProviderSettings = {
        basePath: testDir,
        fileNaming: 'counter',
      };

      const config: IssueProviderConfig = {
        provider: 'markdown',
        settings,
      };

      const provider = ProviderFactory.createProvider(config);

      expect(provider).toBeInstanceOf(MarkdownIssueProvider);
    });

    it('should throw error for unsupported provider type', () => {
      const config: any = {
        provider: 'unsupported',
        settings: {},
      };

      expect(() => ProviderFactory.createProvider(config)).toThrow(
        'Unsupported provider type: unsupported'
      );
    });
  });
});
