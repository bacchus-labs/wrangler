/**
 * Shared constants for issue tools
 */

/**
 * Valid artifact types for issues
 */
export const ARTIFACT_TYPES = ['issue', 'specification'] as const;

/**
 * Valid issue statuses
 */
export const ISSUE_STATUSES = ['open', 'in_progress', 'closed', 'cancelled'] as const;

/**
 * Valid issue priorities
 */
export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * Statuses considered as "completed"
 */
export const COMPLETED_STATUSES = new Set<string>(['closed', 'cancelled']);

/**
 * Maximum title length for issues
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Maximum issues to return in list queries by default
 */
export const DEFAULT_LIST_LIMIT = 100;

/**
 * Maximum issues that can be requested in a single query
 */
export const MAX_LIST_LIMIT = 1000;

/**
 * Default fields to search in when searching issues
 */
export const DEFAULT_SEARCH_FIELDS = ['title', 'description', 'labels'] as const;

/**
 * Valid sort fields for issue queries
 */
export const SORT_FIELDS = ['created', 'updated', 'priority', 'status'] as const;

/**
 * Valid sort orders
 */
export const SORT_ORDERS = ['asc', 'desc'] as const;

/**
 * Tool operation types
 */
export const OPERATIONS = {
  LABELS: ['list', 'add', 'remove'] as const,
  METADATA: ['get', 'set', 'remove'] as const,
  PROJECTS: ['list', 'add', 'remove'] as const,
};

/**
 * MCP response content type
 */
export const MCP_CONTENT_TYPE = 'text';

/**
 * Provider types
 */
export const PROVIDER_TYPES = ['markdown', 'mock'] as const;
