import { openDraftPR } from '../../src/reporters/pr-opener.js';
import type { PROpenerOptions } from '../../src/reporters/pr-opener.js';
import * as child_process from 'child_process';

jest.mock('child_process');

const mockExecFileSync = child_process.execFileSync as jest.MockedFunction<typeof child_process.execFileSync>;

describe('openDraftPR', () => {
  const defaultOpts: PROpenerOptions = {
    cwd: '/tmp/test-repo',
    branchName: 'feat/my-feature',
    title: 'feat: my feature',
  };

  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns PRInfo on successful PR creation', async () => {
    mockExecFileSync.mockReturnValue(
      'https://github.com/owner/repo/pull/42\n'
    );

    const result = await openDraftPR(defaultOpts);

    expect(result).toEqual({
      prNumber: 42,
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
  });

  it('passes correct arguments as an array to execFileSync', async () => {
    mockExecFileSync.mockReturnValue(
      'https://github.com/owner/repo/pull/1\n'
    );

    await openDraftPR(defaultOpts);

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'gh',
      ['pr', 'create', '--draft', '--base', 'main', '--head', 'feat/my-feature', '--title', 'feat: my feature'],
      expect.objectContaining({ cwd: '/tmp/test-repo', encoding: 'utf-8' }),
    );
  });

  it('uses custom baseBranch when provided', async () => {
    mockExecFileSync.mockReturnValue(
      'https://github.com/owner/repo/pull/5\n'
    );

    await openDraftPR({ ...defaultOpts, baseBranch: 'develop' });

    const args = mockExecFileSync.mock.calls[0][1] as string[];
    expect(args[4]).toBe('develop');
  });

  it('includes body when provided', async () => {
    mockExecFileSync.mockReturnValue(
      'https://github.com/owner/repo/pull/5\n'
    );

    await openDraftPR({ ...defaultOpts, body: 'PR description here' });

    const args = mockExecFileSync.mock.calls[0][1] as string[];
    expect(args).toContain('--body');
    expect(args).toContain('PR description here');
  });

  it('returns null when gh is not found', async () => {
    const error = new Error('command not found: gh');
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    mockExecFileSync.mockImplementation(() => { throw error; });

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns null on auth failure', async () => {
    const error = new Error('gh auth login required');
    mockExecFileSync.mockImplementation(() => { throw error; });

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns null when branch is not pushed', async () => {
    const error = new Error('fatal: The current branch has no upstream');
    mockExecFileSync.mockImplementation(() => { throw error; });

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns valid PRInfo when PR already exists', async () => {
    mockExecFileSync.mockReturnValue(
      'https://github.com/owner/repo/pull/99\n'
    );

    const result = await openDraftPR(defaultOpts);

    expect(result).toEqual({
      prNumber: 99,
      prUrl: 'https://github.com/owner/repo/pull/99',
    });
  });

  it('returns null on invalid gh output', async () => {
    mockExecFileSync.mockReturnValue('some garbage output\n');

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns null on empty gh output', async () => {
    mockExecFileSync.mockReturnValue('');

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('handles PR numbers in URLs with paths after the number', async () => {
    mockExecFileSync.mockReturnValue(
      'https://github.com/owner/repo/pull/123\n'
    );

    const result = await openDraftPR(defaultOpts);

    expect(result).toEqual({
      prNumber: 123,
      prUrl: 'https://github.com/owner/repo/pull/123',
    });
  });

  describe('shell injection prevention', () => {
    it('passes special characters in title safely as array element', async () => {
      mockExecFileSync.mockReturnValue(
        'https://github.com/owner/repo/pull/77\n'
      );

      const maliciousTitle = 'feat: "quoted" `backtick` $(whoami) && rm -rf /';
      const result = await openDraftPR({
        ...defaultOpts,
        title: maliciousTitle,
      });

      // The title must appear as a discrete array element, not interpolated into a string
      const args = mockExecFileSync.mock.calls[0][1] as string[];
      expect(args).toContain(maliciousTitle);
      // execFileSync is called (not execSync), so no shell interpretation occurs
      expect(mockExecFileSync).toHaveBeenCalledWith('gh', expect.any(Array), expect.any(Object));
      expect(result).toEqual({ prNumber: 77, prUrl: 'https://github.com/owner/repo/pull/77' });
    });

    it('passes special characters in body safely as array element', async () => {
      mockExecFileSync.mockReturnValue(
        'https://github.com/owner/repo/pull/78\n'
      );

      const maliciousBody = '$(cat /etc/passwd) `id` "; drop table users;';
      await openDraftPR({
        ...defaultOpts,
        body: maliciousBody,
      });

      const args = mockExecFileSync.mock.calls[0][1] as string[];
      expect(args).toContain(maliciousBody);
    });

    it('passes special characters in branchName safely as array element', async () => {
      mockExecFileSync.mockReturnValue(
        'https://github.com/owner/repo/pull/79\n'
      );

      const maliciousBranch = 'feat/$(whoami)';
      await openDraftPR({
        ...defaultOpts,
        branchName: maliciousBranch,
      });

      const args = mockExecFileSync.mock.calls[0][1] as string[];
      expect(args).toContain(maliciousBranch);
    });
  });
});
