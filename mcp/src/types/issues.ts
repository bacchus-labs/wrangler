/**
 * Issue management types
 */

import { z } from 'zod';

export type IssueArtifactType = 'issue' | 'specification' | 'idea';

export interface Issue {
  /** Unique issue identifier */
  id: string;
  /** Issue title */
  title: string;
  /** Issue description/content */
  description: string;
  /** Artifact type (issue, specification, etc.) */
  type: IssueArtifactType;
  /** Current status */
  status: IssueStatus;
  /** Priority level */
  priority: IssuePriority;
  /** Associated labels */
  labels: string[];
  /** Assigned user */
  assignee?: string;
  /** Project or epic association */
  project?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Completion timestamp */
  closedAt?: Date;
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
  /** Wrangler-specific context */
  wranglerContext?: WranglerIssueContext;
}

export type IssueStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export interface WranglerIssueContext {
  /** Responsible agent */
  agentId?: string;
  /** Parent task ID */
  parentTaskId?: string;
  /** Estimated effort */
  estimatedEffort?: string;
}

export interface IssueCreateRequest {
  /** Issue title */
  title: string;
  /** Issue description */
  description: string;
  /** Artifact type */
  type?: IssueArtifactType;
  /** Initial status */
  status?: IssueStatus;
  /** Priority level */
  priority?: IssuePriority;
  /** Labels to apply */
  labels?: string[];
  /** Assigned user */
  assignee?: string;
  /** Project association */
  project?: string;
  /** Wrangler context */
  wranglerContext?: WranglerIssueContext;
}

export interface IssueUpdateRequest {
  /** Issue ID to update */
  id: string;
  /** New title */
  title?: string;
  /** New description */
  description?: string;
  /** Updated artifact type */
  type?: IssueArtifactType;
  /** New status */
  status?: IssueStatus;
  /** New priority */
  priority?: IssuePriority;
  /** New labels */
  labels?: string[];
  /** New assignee */
  assignee?: string;
  /** New project */
  project?: string | null;
  /** Updated Wrangler context */
  wranglerContext?: WranglerIssueContext;
}

export interface IssueFilters {
  /** Filter by explicit issue IDs */
  ids?: string[];
  /** Filter by status */
  status?: IssueStatus[];
  /** Filter by priority */
  priority?: IssuePriority[];
  /** Filter by labels */
  labels?: string[];
  /** Filter by assignee */
  assignee?: string;
  /** Filter by project */
  project?: string;
  /** Filter by parent task identifier stored in wranglerContext.parentTaskId */
  parentTaskId?: string;
  /** Filter by artifact types */
  types?: IssueArtifactType[];
  /** Filter by artifact type (deprecated, use types) */
  type?: IssueArtifactType;
  /** Date range filter */
  createdAfter?: Date;
  /** Date range filter */
  createdBefore?: Date;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface IssueSearchOptions {
  /** Search query */
  query: string;
  /** Fields to search in */
  fields?: ('title' | 'description' | 'labels')[];
  /** Additional filters */
  filters?: IssueFilters;
  /** Sort field */
  sortBy?: 'created' | 'updated' | 'priority' | 'status';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

// Zod Schemas

export const IssueArtifactTypeSchema = z.enum(['issue', 'specification', 'idea']);

export const IssueStatusSchema = z.enum(['open', 'in_progress', 'closed', 'cancelled']);

export const IssuePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const WranglerIssueContextSchema = z.object({
  agentId: z.string().optional(),
  parentTaskId: z.string().optional(),
  estimatedEffort: z.string().optional(),
});

export const IssueCreateRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: IssueArtifactTypeSchema.optional(),
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  project: z.string().optional(),
  wranglerContext: WranglerIssueContextSchema.optional(),
});

export const IssueUpdateRequestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  type: IssueArtifactTypeSchema.optional(),
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  project: z.string().nullable().optional(),
  wranglerContext: WranglerIssueContextSchema.optional(),
});

export const IssueFiltersSchema = z.object({
  ids: z.array(z.string()).optional(),
  status: z.array(IssueStatusSchema).optional(),
  priority: z.array(IssuePrioritySchema).optional(),
  labels: z.array(z.string()).optional(),
  assignee: z.string().optional(),
  project: z.string().optional(),
  parentTaskId: z.string().optional(),
  types: z.array(IssueArtifactTypeSchema).optional(),
  type: IssueArtifactTypeSchema.optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

export const IssueSearchOptionsSchema = z.object({
  query: z.string().min(1),
  fields: z.array(z.enum(['title', 'description', 'labels'])).optional(),
  filters: IssueFiltersSchema.optional(),
  sortBy: z.enum(['created', 'updated', 'priority', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
