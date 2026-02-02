import { execSync } from 'child_process';

/**
 * Parameters for creating a pull request
 */
export interface CreatePRParams {
  title: string;
  body: string;
  head: string; // Branch name (feature branch)
  base: string; // Base branch (usually 'main' or 'master')
  draft?: boolean;
}

/**
 * Parameters for updating a pull request
 */
export interface UpdatePRParams {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
}

/**
 * Normalized pull request response
 */
export interface PR {
  number: number;
  url: string;
  title: string;
  body: string | null;
  head: string;
  base: string;
  state: string;
}

/**
 * GitHub client using gh CLI
 *
 * This client uses the gh CLI instead of Octokit, which:
 * - Simplifies authentication (uses existing gh auth)
 * - Reduces code complexity (no rate limiting logic needed)
 * - Leverages battle-tested GitHub tooling
 * - Requires less maintenance
 */
export class GitHubClient {
  /**
   * Create a pull request using gh CLI
   */
  async createPR(params: CreatePRParams): Promise<PR> {
    const args = [
      'gh', 'pr', 'create',
      '--title', this.escapeArg(params.title),
      '--body', this.escapeArg(params.body),
      '--base', params.base,
      '--head', params.head,
    ];

    if (params.draft) {
      args.push('--draft');
    }

    // gh pr create returns the PR URL
    const url = execSync(args.join(' '), { encoding: 'utf-8' }).trim();

    // Extract PR number from URL
    const prNumber = parseInt(url.split('/').pop() || '0', 10);

    // Get full PR details
    return this.getPR(prNumber);
  }

  /**
   * Update a pull request using gh CLI
   */
  async updatePR(prNumber: number, params: UpdatePRParams): Promise<PR> {
    const args = ['gh', 'pr', 'edit', prNumber.toString()];

    if (params.title) {
      args.push('--title', this.escapeArg(params.title));
    }
    if (params.body) {
      args.push('--body', this.escapeArg(params.body));
    }

    execSync(args.join(' '), { encoding: 'utf-8' });

    return this.getPR(prNumber);
  }

  /**
   * Get pull request details using gh CLI
   */
  async getPR(prNumber: number): Promise<PR> {
    const json = execSync(
      `gh pr view ${prNumber} --json number,url,title,body,headRefName,baseRefName,state`,
      { encoding: 'utf-8' }
    );

    const data = JSON.parse(json);

    return {
      number: data.number,
      url: data.url,
      title: data.title,
      body: data.body,
      head: data.headRefName,
      base: data.baseRefName,
      state: data.state,
    };
  }

  /**
   * Add a comment to a pull request using gh CLI
   */
  async addPRComment(prNumber: number, body: string): Promise<void> {
    execSync(`gh pr comment ${prNumber} --body ${this.escapeArg(body)}`, {
      encoding: 'utf-8',
    });
  }

  /**
   * Escape argument for shell command
   * Wraps in double quotes and escapes internal quotes
   */
  private escapeArg(arg: string): string {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
}
