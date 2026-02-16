/**
 * List issues tool implementation
 */
import { z } from 'zod';
import { ProviderFactory } from '../../providers/factory.js';
import { IssueFilters } from '../../types/issues.js';
/** Response format controlling verbosity of issue data */
export type IssueListFormat = 'full' | 'summary' | 'minimal';
export declare const listIssuesSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodArray<z.ZodEnum<["open", "in_progress", "closed", "cancelled"]>, "many">>;
    priority: z.ZodOptional<z.ZodArray<z.ZodEnum<["low", "medium", "high", "critical"]>, "many">>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    assignee: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodString>;
    parentTaskId: z.ZodOptional<z.ZodString>;
    types: z.ZodOptional<z.ZodArray<z.ZodEnum<["issue", "specification", "idea"]>, "many">>;
    type: z.ZodOptional<z.ZodEnum<["issue", "specification", "idea"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
    format: z.ZodOptional<z.ZodEnum<["full", "summary", "minimal"]>>;
}, "strip", z.ZodTypeAny, {
    labels?: string[] | undefined;
    priority?: ("low" | "medium" | "high" | "critical")[] | undefined;
    status?: ("open" | "in_progress" | "closed" | "cancelled")[] | undefined;
    parentTaskId?: string | undefined;
    type?: "issue" | "specification" | "idea" | undefined;
    assignee?: string | undefined;
    project?: string | undefined;
    types?: ("issue" | "specification" | "idea")[] | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    format?: "full" | "summary" | "minimal" | undefined;
}, {
    labels?: string[] | undefined;
    priority?: ("low" | "medium" | "high" | "critical")[] | undefined;
    status?: ("open" | "in_progress" | "closed" | "cancelled")[] | undefined;
    parentTaskId?: string | undefined;
    type?: "issue" | "specification" | "idea" | undefined;
    assignee?: string | undefined;
    project?: string | undefined;
    types?: ("issue" | "specification" | "idea")[] | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    format?: "full" | "summary" | "minimal" | undefined;
}>;
export type ListIssuesParams = z.infer<typeof listIssuesSchema>;
export declare function listIssuesTool(params: ListIssuesParams, providerFactory: ProviderFactory): Promise<{
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
    metadata: {
        totalIssues: number;
        provider: "markdown" | "mock";
        filters: IssueFilters;
        format: IssueListFormat;
        issues: ({
            id: string;
            title: string;
            status: import("../../types/issues.js").IssueStatus;
            type?: undefined;
            priority?: undefined;
            labels?: undefined;
            assignee?: undefined;
            project?: undefined;
            description?: undefined;
            createdAt?: undefined;
            updatedAt?: undefined;
            closedAt?: undefined;
            wranglerContext?: undefined;
        } | {
            id: string;
            title: string;
            type: import("../../types/issues.js").IssueArtifactType;
            status: import("../../types/issues.js").IssueStatus;
            priority: import("../../types/issues.js").IssuePriority;
            labels: string[];
            assignee: string | undefined;
            project: string | undefined;
            description?: undefined;
            createdAt?: undefined;
            updatedAt?: undefined;
            closedAt?: undefined;
            wranglerContext?: undefined;
        } | {
            id: string;
            title: string;
            description: string;
            type: import("../../types/issues.js").IssueArtifactType;
            status: import("../../types/issues.js").IssueStatus;
            priority: import("../../types/issues.js").IssuePriority;
            labels: string[];
            assignee: string | undefined;
            project: string | undefined;
            createdAt: string;
            updatedAt: string;
            closedAt: string | Date | undefined;
            wranglerContext: import("../../types/issues.js").WranglerIssueContext | null;
        })[];
    };
} | {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
    metadata?: undefined;
}>;
//# sourceMappingURL=list.d.ts.map