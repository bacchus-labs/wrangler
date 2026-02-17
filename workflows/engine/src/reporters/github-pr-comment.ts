import type { WorkflowReporter, ReporterContext, StepVisibility } from './types.js';
import type { WorkflowAuditEntry } from '../types.js';
import type { ExecutionSummary } from '../state.js';

/**
 * Configuration for the GitHub PR Comment reporter.
 */
export interface GitHubPRCommentConfig {
  token: string;
  owner: string;
  repo: string;
  prNumber: number;
  spinner?: boolean;
  debounceMs?: number;
  apiBaseUrl?: string;
}

type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface StepState {
  name: string;
  visibility: StepVisibility;
  status: StepStatus;
  startedAt?: number;
  durationMs?: number;
  taskIndex?: number;
  taskCount?: number;
}

/**
 * Reporter that posts and updates a GitHub PR comment with workflow progress.
 *
 * Creates an initial comment on initialize(), updates it on each audit entry,
 * and posts a final summary on complete. Self-disables on auth/not-found errors
 * to prevent cascading failures.
 */
export class GitHubPRCommentReporter implements WorkflowReporter {
  readonly type = 'github-pr-comment';

  private config: GitHubPRCommentConfig;
  private disabled = false;
  private commentId: number | null = null;
  private sessionId = '';
  private steps: StepState[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpdate = false;
  private errorMessage: string | null = null;
  private completionSummary: string | null = null;
  private includeSummarySteps = false;

  constructor(config: GitHubPRCommentConfig) {
    this.config = {
      spinner: config.spinner ?? true,
      debounceMs: config.debounceMs ?? 2000,
      apiBaseUrl: config.apiBaseUrl ?? 'https://api.github.com',
      token: config.token,
      owner: config.owner,
      repo: config.repo,
      prNumber: config.prNumber,
    };

    // Validate required fields
    if (!config.token || !config.owner || !config.repo || !config.prNumber) {
      const missing: string[] = [];
      if (!config.token) missing.push('token');
      if (!config.owner) missing.push('owner');
      if (!config.repo) missing.push('repo');
      if (!config.prNumber) missing.push('prNumber');
      console.warn(
        `[github-pr-comment] Missing required config fields: ${missing.join(', ')}. Reporter disabled.`
      );
      this.disabled = true;
    }
  }

  async initialize(context: ReporterContext): Promise<void> {
    if (this.disabled) return;

    this.sessionId = context.sessionId;
    this.steps = context.steps.map(s => ({
      name: s.name,
      visibility: s.visibility,
      status: 'pending' as StepStatus,
    }));

    const body = this.renderMarkdown(false);
    const response = await this.postComment(body);
    if (!response) return;

    this.commentId = response.id;
  }

  async onAuditEntry(entry: WorkflowAuditEntry): Promise<void> {
    if (this.disabled || !this.commentId) return;

    this.applyEntry(entry);

    if (this.config.debounceMs! > 0) {
      this.pendingUpdate = true;
      this.scheduleUpdate();
    } else {
      const body = this.renderMarkdown(false);
      await this.updateComment(body);
    }
  }

  async onComplete(summary: ExecutionSummary): Promise<void> {
    if (this.disabled || !this.commentId) return;

    // Apply final statuses from summary
    for (const stepExec of summary.steps) {
      const step = this.steps.find(s => s.name === stepExec.name);
      if (step) {
        step.status = stepExec.status === 'completed' ? 'completed'
          : stepExec.status === 'failed' ? 'failed'
          : stepExec.status === 'skipped' ? 'skipped'
          : step.status;
        step.durationMs = stepExec.durationMs;
      }
    }

    this.completionSummary = this.formatDuration(summary.totalDurationMs, summary.counts.completed);
    this.includeSummarySteps = true;

    await this.cancelDebounce();
    const body = this.renderMarkdown(true);
    await this.updateComment(body);
  }

  async onError(error: Error): Promise<void> {
    if (this.disabled || !this.commentId) return;

    this.errorMessage = error.message;
    await this.cancelDebounce();
    const body = this.renderMarkdown(false);
    await this.updateComment(body);
  }

  async dispose(): Promise<void> {
    if (this.pendingUpdate && !this.disabled && this.commentId) {
      await this.cancelDebounce();
      await this.flushUpdate();
    }
    // Clear timer unconditionally as a safety net for cases where
    // pendingUpdate is false but a timer is somehow still scheduled.
    this.clearTimer();
  }

  // --- Private helpers ---

  private applyEntry(entry: WorkflowAuditEntry): void {
    const step = this.steps.find(s => s.name === entry.step);
    if (!step) return;

    switch (entry.status) {
      case 'started':
        step.status = 'running';
        step.startedAt = Date.now();
        if (entry.metadata) {
          if (typeof entry.metadata.taskIndex === 'number') {
            step.taskIndex = entry.metadata.taskIndex;
          }
          if (typeof entry.metadata.taskCount === 'number') {
            step.taskCount = entry.metadata.taskCount;
          }
        }
        break;
      case 'completed':
        step.status = 'completed';
        if (step.startedAt) {
          step.durationMs = Date.now() - step.startedAt;
        }
        break;
      case 'failed':
        step.status = 'failed';
        break;
      case 'skipped':
        step.status = 'skipped';
        break;
    }
  }

  private renderMarkdown(isFinal: boolean): string {
    const lines: string[] = [];
    lines.push(`<!-- wrangler-workflow: ${this.sessionId} -->`);
    lines.push('## Workflow Progress');
    lines.push('');
    lines.push('| Step | Status |');
    lines.push('|------|--------|');

    for (const step of this.steps) {
      // Skip silent steps always
      if (step.visibility === 'silent') continue;
      // Skip summary steps unless in final render
      if (step.visibility === 'summary' && !this.includeSummarySteps) continue;

      const statusText = this.renderStepStatus(step, isFinal);
      lines.push(`| ${step.name} | ${statusText} |`);
    }

    if (this.errorMessage) {
      lines.push('');
      lines.push(`> :x: **Error**: \`${this.errorMessage}\``);
    }

    if (this.completionSummary) {
      lines.push('');
      lines.push('---');
      lines.push(this.completionSummary);
    }

    return lines.join('\n');
  }

  private renderStepStatus(step: StepState, isFinal: boolean): string {
    switch (step.status) {
      case 'pending':
        return ':white_circle: Pending';
      case 'running': {
        let text = ':hourglass_flowing_sand: Running...';
        if (!isFinal && step.taskIndex !== undefined && step.taskCount !== undefined) {
          text += ` (${step.taskIndex}/${step.taskCount} tasks)`;
        }
        return text;
      }
      case 'completed': {
        let text = ':white_check_mark: Done';
        if (step.durationMs !== undefined) {
          text += ` (${this.formatMs(step.durationMs)})`;
        }
        return text;
      }
      case 'failed':
        return ':x: Failed';
      case 'skipped':
        return ':fast_forward: Skipped';
    }
  }

  private formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  private formatDuration(totalMs: number, stepsCompleted: number): string {
    const seconds = Math.round(totalMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    let duration: string;
    if (minutes > 0 && remainingSeconds > 0) {
      duration = `${minutes} minutes ${remainingSeconds} seconds`;
    } else if (minutes > 0) {
      duration = `${minutes} minutes`;
    } else {
      duration = `${remainingSeconds} seconds`;
    }

    return `**Completed** in ${duration} | ${stepsCompleted} steps executed`;
  }

  private scheduleUpdate(): void {
    this.clearTimer();
    this.debounceTimer = setTimeout(() => {
      void this.flushUpdate();
    }, this.config.debounceMs!);
  }

  private async flushUpdate(): Promise<void> {
    if (!this.pendingUpdate || this.disabled || !this.commentId) return;
    this.pendingUpdate = false;
    const body = this.renderMarkdown(false);
    await this.updateComment(body);
  }

  /**
   * Cancel any pending debounced update timer without flushing.
   * Callers (onComplete, onError) intentionally skip flush here because
   * they immediately re-render with final state after calling this.
   */
  private async cancelDebounce(): Promise<void> {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private async postComment(body: string): Promise<{ id: number } | null> {
    const url = `${this.config.apiBaseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${this.config.prNumber}/comments`;
    return this.apiRequest<{ id: number }>('POST', url, { body });
  }

  private async updateComment(body: string): Promise<void> {
    if (!this.commentId) return;
    const url = `${this.config.apiBaseUrl}/repos/${this.config.owner}/${this.config.repo}/issues/comments/${this.commentId}`;
    await this.apiRequest('PATCH', url, { body });
  }

  private async apiRequest<T>(method: string, url: string, payload: unknown): Promise<T | null> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 404) {
        this.disable(`GitHub API returned ${response.status}. Reporter disabled.`);
        return null;
      }

      if (!response.ok) {
        console.warn(`[github-pr-comment] GitHub API returned ${response.status}`);
        return null;
      }

      return await response.json() as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Sanitize token from error messages
      const sanitized = this.sanitize(message);
      console.warn(`[github-pr-comment] API request failed: ${sanitized}`);
      return null;
    }
  }

  private disable(reason: string): void {
    this.disabled = true;
    console.warn(`[github-pr-comment] ${this.sanitize(reason)}`);
  }

  private sanitize(text: string): string {
    if (!this.config.token) return text;
    return text.replaceAll(this.config.token, '***');
  }
}
