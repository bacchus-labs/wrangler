import { openDraftPR } from '../../src/reporters/pr-opener.js';
import type { PROpenerOptions } from '../../src/reporters/pr-opener.js';
import * as child_process from 'child_process';

jest.mock('child_process');

const mockExecSync = child_process.execSync as jest.MockedFunction<typeof child_process.execSync>;

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
    mockExecSync.mockReturnValue(
      Buffer.from('https://github.com/owner/repo/pull/42\n')
    );

    const result = await openDraftPR(defaultOpts);

    expect(result).toEqual({
      prNumber: 42,
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
  });

  it('passes correct arguments to gh cli', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('https://github.com/owner/repo/pull/1\n')
    );

    await openDraftPR(defaultOpts);

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('gh pr create --draft'),
      expect.objectContaining({ cwd: '/tmp/test-repo' })
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--base main'),
      expect.anything()
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--head feat/my-feature'),
      expect.anything()
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--title "feat: my feature"'),
      expect.anything()
    );
  });

  it('uses custom baseBranch when provided', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('https://github.com/owner/repo/pull/5\n')
    );

    await openDraftPR({ ...defaultOpts, baseBranch: 'develop' });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--base develop'),
      expect.anything()
    );
  });

  it('includes body when provided', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('https://github.com/owner/repo/pull/5\n')
    );

    await openDraftPR({ ...defaultOpts, body: 'PR description here' });

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--body "PR description here"'),
      expect.anything()
    );
  });

  it('returns null when gh is not found', async () => {
    const error = new Error('command not found: gh');
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    mockExecSync.mockImplementation(() => { throw error; });

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns null on auth failure', async () => {
    const error = new Error('gh auth login required');
    mockExecSync.mockImplementation(() => { throw error; });

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns null when branch is not pushed', async () => {
    const error = new Error('fatal: The current branch has no upstream');
    mockExecSync.mockImplementation(() => { throw error; });

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns valid PRInfo when PR already exists', async () => {
    // gh returns the existing PR URL when a PR already exists for the branch
    mockExecSync.mockReturnValue(
      Buffer.from('https://github.com/owner/repo/pull/99\n')
    );

    const result = await openDraftPR(defaultOpts);

    expect(result).toEqual({
      prNumber: 99,
      prUrl: 'https://github.com/owner/repo/pull/99',
    });
  });

  it('returns null on invalid gh output', async () => {
    mockExecSync.mockReturnValue(Buffer.from('some garbage output\n'));

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('returns null on empty gh output', async () => {
    mockExecSync.mockReturnValue(Buffer.from(''));

    const result = await openDraftPR(defaultOpts);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create draft PR')
    );
  });

  it('handles PR numbers in URLs with paths after the number', async () => {
    mockExecSync.mockReturnValue(
      Buffer.from('https://github.com/owner/repo/pull/123\n')
    );

    const result = await openDraftPR(defaultOpts);

    expect(result).toEqual({
      prNumber: 123,
      prUrl: 'https://github.com/owner/repo/pull/123',
    });
  });
});
