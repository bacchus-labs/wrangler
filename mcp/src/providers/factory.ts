/**
 * Provider factory for creating issue providers
 */

import { IssueProvider } from './base.js';
import { MarkdownIssueProvider } from './markdown.js';
import { WranglerMCPConfig, IssueProviderConfig } from '../types/config.js';

export class ProviderFactory {
  private config: WranglerMCPConfig;
  private issueProvider?: IssueProvider;

  constructor(config: WranglerMCPConfig) {
    this.config = config;
  }

  /**
   * Get the issue provider instance
   */
  getIssueProvider(): IssueProvider {
    if (!this.issueProvider) {
      this.issueProvider = this.createIssueProvider();
    }
    return this.issueProvider;
  }

  /**
   * Get the current configuration
   */
  getConfig(): WranglerMCPConfig {
    return this.config;
  }

  /**
   * Create an issue provider based on configuration
   */
  private createIssueProvider(): IssueProvider {
    const issueConfig = this.config.issues;
    if (!issueConfig) {
      throw new Error('Issue provider configuration not found');
    }

    switch (issueConfig.provider) {
      case 'markdown':
        if (!issueConfig.settings) {
          throw new Error('Markdown provider settings are required');
        }
        return new MarkdownIssueProvider(issueConfig.settings, issueConfig);
      case 'mock':
        // Mock provider doesn't require settings (for testing)
        return new MarkdownIssueProvider({} as any, issueConfig);
      default:
        throw new Error(`Unsupported provider type: ${issueConfig.provider}`);
    }
  }

  /**
   * Static helper for creating provider directly (legacy)
   */
  static createProvider(config: IssueProviderConfig): IssueProvider {
    switch (config.provider) {
      case 'markdown':
        if (!config.settings) {
          throw new Error('Markdown provider settings are required');
        }
        return new MarkdownIssueProvider(config.settings, config);
      case 'mock':
        return new MarkdownIssueProvider({} as any, config);
      default:
        throw new Error(`Unsupported provider type: ${config.provider}`);
    }
  }
}
