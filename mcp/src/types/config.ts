/**
 * Configuration types for Wrangler MCP Server
 */

export interface WranglerMCPConfig {
  /** Server name */
  name?: string;
  /** Server version */
  version?: string;
  /** Workspace root directory */
  workspaceRoot?: string;
  /** Issue provider configuration */
  issues?: IssueProviderConfig;
}

export interface IssueProviderConfig {
  /** Provider type */
  provider: 'markdown' | 'mock';
  /** Provider-specific settings */
  settings?: MarkdownProviderSettings;
  /** Default labels for new issues */
  defaultLabels?: string[];
  /** Enable automatic assignment */
  autoAssignment?: boolean;
}

export interface MarkdownCollectionSettings {
  /** Directory relative to basePath for this artifact type */
  directory: string;
}

export interface MarkdownProviderSettings {
  /** Base path for issues */
  basePath: string;
  /** Issues directory relative to basePath */
  issuesDirectory?: string;
  /** Specifications directory relative to basePath */
  specificationsDirectory?: string;
  /** Additional collection directories keyed by artifact type */
  collections?: Record<string, MarkdownCollectionSettings>;
  /** File naming strategy */
  fileNaming?: 'timestamp' | 'slug' | 'counter';
}
