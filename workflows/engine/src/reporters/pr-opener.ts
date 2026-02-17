import { execFileSync } from 'child_process';

/**
 * Information about an opened draft PR.
 */
export interface PRInfo {
  prNumber: number;
  prUrl: string;
}

/**
 * Options for opening a draft PR.
 */
export interface PROpenerOptions {
  cwd: string;
  branchName: string;
  baseBranch?: string;
  title: string;
  body?: string;
}

/**
 * Opens a draft GitHub PR using the `gh` CLI tool.
 * Returns PR number and URL, or null if creation fails or is unnecessary.
 *
 * Uses execFileSync with an args array to avoid shell injection.
 * All user-supplied values (title, body, branchName, baseBranch) are passed
 * as discrete array elements, never interpolated into a shell command string.
 */
export async function openDraftPR(opts: PROpenerOptions): Promise<PRInfo | null> {
  const baseBranch = opts.baseBranch ?? 'main';

  const args = [
    'pr', 'create', '--draft',
    '--base', baseBranch,
    '--head', opts.branchName,
    '--title', opts.title,
  ];
  if (opts.body) {
    args.push('--body', opts.body);
  }

  try {
    const rawOutput = execFileSync('gh', args, {
      cwd: opts.cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const url = rawOutput.trim();
    const match = url.match(/\/pull\/(\d+)$/);
    if (!match) {
      console.warn(`Failed to create draft PR: could not parse PR URL from output: ${url}`);
      return null;
    }

    return {
      prNumber: parseInt(match[1], 10),
      prUrl: url,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to create draft PR: ${message}`);
    return null;
  }
}
