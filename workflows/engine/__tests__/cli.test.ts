/**
 * Tests for CLI utility functions: printResult, getCurrentBranch,
 * extractSlug, and createWorktree.
 *
 * printResult formats and logs workflow results to the console.
 * getCurrentBranch shells out to git rev-parse to determine the current branch.
 * extractSlug derives a URL-safe slug from any artifact filename.
 * createWorktree creates a git worktree for isolated workflow execution.
 */

import { jest } from '@jest/globals';
import type { WorkflowResult } from '../src/state.js';

// Mock child_process before any module that uses it is imported.
// getCurrentBranch does `await import('child_process')` dynamically,
// so the mock must be registered first at module scope.
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync,
}));

// ================================================================
// printResult
// ================================================================

describe('printResult', () => {
  let logSpy: ReturnType<typeof jest.spyOn>;
  let printResult: (result: WorkflowResult) => void;

  beforeAll(async () => {
    const cli = await import('../src/cli.js');
    printResult = cli.printResult;
  });

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  /** Collect all logged text into a single string for assertion. */
  function loggedOutput(): string {
    return logSpy.mock.calls.map((args: unknown[]) => args.join(' ')).join('\n');
  }

  it('prints a successful result with all fields populated', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['analyze', 'plan', 'implement', 'verify'],
      outputs: {
        verification: {
          testSuite: {
            passed: 42,
            total: 42,
            coverage: 95.5,
            exitCode: 0,
          },
        },
        review: {
          issues: [
            { severity: 'high', message: 'Potential null dereference' },
            { severity: 'low', message: 'Missing JSDoc' },
            { severity: 'high', message: 'Unchecked error' },
          ],
        },
        implement: {
          filesChanged: [
            { path: 'src/auth.ts' },
            { path: 'src/utils.ts' },
          ],
        },
      },
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('--- Workflow Complete ---');
    expect(output).toContain('Status: completed');
    expect(output).toContain('analyze, plan, implement, verify');
    expect(output).toContain('42/42 passed');
    expect(output).toContain('95.5% coverage');
    expect(output).not.toContain('[FAILED]');
    expect(output).toContain('2 high');
    expect(output).toContain('1 low');
    expect(output).toContain('Files changed: 2');
    expect(output).toContain('src/auth.ts');
    expect(output).toContain('src/utils.ts');
  });

  it('prints a failed result with error message', () => {
    const result: WorkflowResult = {
      status: 'failed',
      completedPhases: ['analyze'],
      outputs: {},
      error: 'Spec file not found: missing.md',
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('Status: failed');
    expect(output).toContain('Error: Spec file not found: missing.md');
  });

  it('prints a paused result with blocker details', () => {
    const result: WorkflowResult = {
      status: 'paused',
      completedPhases: ['analyze', 'plan'],
      outputs: {},
      pausedAtPhase: 'implement',
      blockerDetails: 'Human review required for API design',
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('Status: paused');
    expect(output).toContain('Blocker: Human review required for API design');
  });

  it('handles missing nested fields gracefully (no verification, review, or filesChanged)', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['analyze'],
      outputs: {},
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('Status: completed');
    expect(output).not.toContain('Test Results');
    expect(output).not.toContain('Review');
    expect(output).not.toContain('Files changed');
  });

  it('handles empty completedPhases array', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: [],
      outputs: {},
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('Phases completed: ');
    expect(output).not.toContain('Test Results');
  });

  it('does not show coverage when testSuite.coverage is undefined', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['verify'],
      outputs: {
        verification: {
          testSuite: {
            passed: 10,
            total: 12,
            exitCode: 1,
          },
        },
      },
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('10/12 passed');
    expect(output).not.toContain('% coverage');
    expect(output).toContain('[FAILED]');
  });

  it('does not show review section when review.issues is empty array', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['review'],
      outputs: {
        review: {
          issues: [],
        },
      },
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).not.toContain('Review:');
  });

  it('shows [FAILED] when test exitCode is non-zero', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['verify'],
      outputs: {
        verification: {
          testSuite: {
            passed: 8,
            total: 10,
            coverage: 80,
            exitCode: 1,
          },
        },
      },
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('8/10 passed');
    expect(output).toContain('80% coverage');
    expect(output).toContain('[FAILED]');
  });

  it('aggregates filesChanged across multiple output keys', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['implement', 'fix'],
      outputs: {
        implement: {
          filesChanged: [
            { path: 'src/a.ts' },
            { path: 'src/b.ts' },
          ],
        },
        fix: {
          filesChanged: [
            { path: 'src/b.ts' },
            { path: 'src/c.ts' },
          ],
        },
      },
    };

    printResult(result);
    const output = loggedOutput();

    // src/b.ts appears in both, so total unique count is 3
    expect(output).toContain('Files changed: 3');
    expect(output).toContain('src/a.ts');
    expect(output).toContain('src/b.ts');
    expect(output).toContain('src/c.ts');
  });

  it('skips filesChanged entries without a string path', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['implement'],
      outputs: {
        implement: {
          filesChanged: [
            { path: 'src/valid.ts' },
            { notPath: 'something' },
            { path: 123 },
          ],
        },
      },
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('Files changed: 1');
    expect(output).toContain('src/valid.ts');
  });

  it('handles outputs with non-object values (no filesChanged property)', () => {
    const result: WorkflowResult = {
      status: 'completed',
      completedPhases: ['analyze'],
      outputs: {
        someString: 'hello',
        someNumber: 42,
        someNull: null,
      },
    };

    printResult(result);
    const output = loggedOutput();

    expect(output).toContain('Status: completed');
    expect(output).not.toContain('Files changed');
  });
});

// ================================================================
// getCurrentBranch
// ================================================================

describe('getCurrentBranch', () => {
  let getCurrentBranch: (cwd: string) => Promise<string>;

  beforeAll(async () => {
    const cli = await import('../src/cli.js');
    getCurrentBranch = cli.getCurrentBranch;
  });

  beforeEach(() => {
    mockExecSync.mockReset();
  });

  it('returns the trimmed branch name on success', async () => {
    mockExecSync.mockReturnValue('main\n');

    const branch = await getCurrentBranch('/some/dir');

    expect(branch).toBe('main');
    expect(mockExecSync).toHaveBeenCalledWith(
      'git rev-parse --abbrev-ref HEAD',
      { cwd: '/some/dir', encoding: 'utf-8' },
    );
  });

  it('returns "unknown" when execSync throws', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const branch = await getCurrentBranch('/not/a/repo');

    expect(branch).toBe('unknown');
  });

  it('handles branch names with slashes (feature branches)', async () => {
    mockExecSync.mockReturnValue('feature/auth-system\n');

    const branch = await getCurrentBranch('/some/dir');

    expect(branch).toBe('feature/auth-system');
  });
});

// ================================================================
// extractSlug
// ================================================================

describe('extractSlug', () => {
  let extractSlug: (filePath: string) => string;

  beforeAll(async () => {
    const cli = await import('../src/cli.js');
    extractSlug = cli.extractSlug;
  });

  it('preserves SPEC prefix in lowercase slug', () => {
    expect(extractSlug('SPEC-000047-workflow-template-layering.md')).toBe(
      'spec-000047-workflow-template-layering'
    );
  });

  it('preserves ISS prefix for issue files', () => {
    expect(extractSlug('ISS-000135-add-context-efficiency.md')).toBe(
      'iss-000135-add-context-efficiency'
    );
  });

  it('handles files with no artifact prefix', () => {
    expect(extractSlug('my-feature.md')).toBe('my-feature');
  });

  it('handles full path by using only basename', () => {
    expect(
      extractSlug('/Users/sam/project/.wrangler/specifications/SPEC-000048-codify-steps.md')
    ).toBe('spec-000048-codify-steps');
  });

  it('removes special characters and collapses separators', () => {
    expect(extractSlug('SPEC-001-some_mixed--chars!!!here.md')).toBe(
      'spec-001-some-mixed-charshere'
    );
  });

  it('truncates to 50 characters', () => {
    const longName = 'SPEC-001-' + 'a'.repeat(60) + '.md';
    const result = extractSlug(longName);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('returns "implementation" for degenerate input', () => {
    expect(extractSlug('.md')).toBe('implementation');
  });

  it('handles files without .md extension', () => {
    expect(extractSlug('SPEC-001-my-feature')).toBe('spec-001-my-feature');
  });
});

// ================================================================
// createWorktree
// ================================================================

describe('createWorktree', () => {
  let createWorktree: typeof import('../src/cli.js')['createWorktree'];
  let mockDepsEnsureDir: jest.Mock<() => Promise<void>>;
  let mockDepsExecSync: jest.Mock<() => string>;
  let warnSpy: ReturnType<typeof jest.spyOn>;

  beforeAll(async () => {
    const cli = await import('../src/cli.js');
    createWorktree = cli.createWorktree;
  });

  beforeEach(() => {
    mockDepsEnsureDir = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    mockDepsExecSync = jest.fn<() => string>().mockReturnValue('');
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function makeDeps() {
    return {
      ensureDir: mockDepsEnsureDir as unknown as (dir: string) => Promise<void>,
      execSync: mockDepsExecSync as unknown as (cmd: string, opts: Record<string, unknown>) => string,
    };
  }

  it('creates a worktree at .worktrees/{slug} with the correct branch', async () => {
    const result = await createWorktree({
      projectRoot: '/project',
      slug: 'my-feature',
      sessionId: 'wf-2026-02-16-abc123',
    }, makeDeps());

    expect(result.created).toBe(true);
    expect(result.worktreePath).toBe('/project/.worktrees/my-feature');
    expect(result.branchName).toBe('wrangler/my-feature/wf-2026-02-16-abc123');
    expect(mockDepsEnsureDir).toHaveBeenCalledWith('/project/.worktrees');
    expect(mockDepsExecSync).toHaveBeenCalledWith(
      'git worktree add -b "wrangler/my-feature/wf-2026-02-16-abc123" "/project/.worktrees/my-feature"',
      expect.objectContaining({ cwd: '/project' })
    );
  });

  it('falls back to projectRoot when git worktree add fails', async () => {
    mockDepsExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    const result = await createWorktree({
      projectRoot: '/project',
      slug: 'my-feature',
      sessionId: 'wf-2026-02-16-abc123',
    }, makeDeps());

    expect(result.created).toBe(false);
    expect(result.worktreePath).toBe('/project');
    expect(result.branchName).toBe('unknown');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('falls back when ensureDir fails', async () => {
    mockDepsEnsureDir.mockRejectedValue(new Error('permission denied'));

    const result = await createWorktree({
      projectRoot: '/project',
      slug: 'my-feature',
      sessionId: 'wf-2026-02-16-abc123',
    }, makeDeps());

    expect(result.created).toBe(false);
    expect(result.worktreePath).toBe('/project');
  });
});
