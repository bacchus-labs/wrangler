/**
 * Zod schemas for review gate output.
 * Each review gate produces a ReviewResult with issues found.
 */

import { z } from 'zod';

export const ReviewIssueSchema = z.object({
  severity: z.enum(['critical', 'important', 'minor']),
  description: z.string().min(1),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  fixInstructions: z.string().min(1),
  foundBy: z.string().optional(),
});

export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

export const TestCoverageAssessmentSchema = z.object({
  adequate: z.boolean(),
  notes: z.string().optional(),
});

export const ReviewResultSchema = z.object({
  assessment: z.enum(['approved', 'needs_revision']),
  issues: z.array(ReviewIssueSchema),
  strengths: z.array(z.string()),
  hasActionableIssues: z.boolean(),
  testCoverage: TestCoverageAssessmentSchema.optional(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;

/**
 * Aggregated result from multiple review gates.
 */
export const AggregatedReviewResultSchema = z.object({
  assessment: z.enum(['approved', 'needs_revision']),
  issues: z.array(ReviewIssueSchema),
  strengths: z.array(z.string()),
  hasActionableIssues: z.boolean(),
  gateResults: z.array(z.object({
    gate: z.string(),
    assessment: z.enum(['approved', 'needs_revision']),
    issueCount: z.number().int().min(0),
  })),
});

export type AggregatedReviewResult = z.infer<typeof AggregatedReviewResultSchema>;

/**
 * Severity levels ordered from most to least severe.
 * Used by minSeverity filtering to determine which issues are actionable.
 */
const SEVERITY_RANK: Record<string, number> = {
  critical: 3,
  important: 2,
  minor: 1,
};

/**
 * Options for aggregating gate results.
 */
export interface AggregateGateOptions {
  /**
   * Minimum severity level for an issue to be considered actionable.
   * Issues below this severity are still included in the result but
   * do not contribute to the hasActionableIssues flag.
   *
   * - "critical": only critical issues are actionable
   * - "important": critical and important issues are actionable (default behavior)
   * - "minor": all issues are actionable
   *
   * When omitted, defaults to "important" (backward-compatible behavior).
   */
  minSeverity?: 'critical' | 'important' | 'minor';
}

/**
 * Aggregate multiple gate results into a unified review result.
 */
export function aggregateGateResults(
  gateResults: Array<{ gate: string } & ReviewResult>,
  options?: AggregateGateOptions,
): AggregatedReviewResult {
  const allIssues: ReviewIssue[] = [];
  const allStrengths: string[] = [];

  const gateSummaries = gateResults.map(gr => {
    allIssues.push(...gr.issues);
    allStrengths.push(...gr.strengths);
    return {
      gate: gr.gate,
      assessment: gr.assessment,
      issueCount: gr.issues.length,
    };
  });

  const minSeverity = options?.minSeverity ?? 'important';
  const minRank = SEVERITY_RANK[minSeverity];

  const hasActionableIssues = allIssues.some(
    i => SEVERITY_RANK[i.severity] >= minRank
  );

  return {
    assessment: hasActionableIssues ? 'needs_revision' : 'approved',
    issues: allIssues,
    strengths: allStrengths,
    hasActionableIssues,
    gateResults: gateSummaries,
  };
}
