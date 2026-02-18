/**
 * Base issue provider interface
 */

import {
  Issue,
  IssueCreateRequest,
  IssueUpdateRequest,
  IssueFilters,
  IssueSearchOptions
} from '../types/issues.js';

export abstract class IssueProvider {
  /**
   * Create a new issue
   */
  abstract createIssue(request: IssueCreateRequest): Promise<Issue>;

  /**
   * Get issue by ID
   */
  abstract getIssue(id: string): Promise<Issue | null>;

  /**
   * Update an existing issue
   */
  abstract updateIssue(request: IssueUpdateRequest): Promise<Issue>;

  /**
   * Delete an issue
   */
  abstract deleteIssue(id: string): Promise<void>;

  /**
   * List issues with optional filtering
   */
  abstract listIssues(filters?: IssueFilters): Promise<Issue[]>;

  /**
   * Search issues
   */
  abstract searchIssues(options: IssueSearchOptions): Promise<Issue[]>;

  /**
   * Get available labels
   */
  abstract getLabels(): Promise<string[]>;

  /**
   * Get available assignees
   */
  abstract getAssignees(): Promise<string[]>;

  /**
   * Get available projects
   */
  abstract getProjects(): Promise<string[]>;

  /**
   * Check if provider is healthy
   */
  abstract isHealthy(): Promise<boolean>;
}
