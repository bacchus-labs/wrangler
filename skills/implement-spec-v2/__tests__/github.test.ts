import { GitHubClient, CreatePRParams, UpdatePRParams } from '../scripts/utils/github';
import { execSync } from 'child_process';

// Mock child_process.execSync
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new GitHubClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPR', () => {
    it('should create a pull request successfully', async () => {
      // Mock gh pr create response (returns URL)
      mockExecSync.mockReturnValueOnce('https://github.com/test-owner/test-repo/pull/123\n' as any);

      // Mock gh pr view response (returns PR details)
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Test PR',
          body: 'Test description',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const params: CreatePRParams = {
        title: 'Test PR',
        body: 'Test description',
        head: 'feature-branch',
        base: 'main',
      };

      const result = await client.createPR(params);

      expect(mockExecSync).toHaveBeenNthCalledWith(
        1,
        'gh pr create --title "Test PR" --body "Test description" --base main --head feature-branch',
        { encoding: 'utf-8' }
      );

      expect(mockExecSync).toHaveBeenNthCalledWith(
        2,
        'gh pr view 123 --json number,url,title,body,headRefName,baseRefName,state',
        { encoding: 'utf-8' }
      );

      expect(result).toEqual({
        number: 123,
        url: 'https://github.com/test-owner/test-repo/pull/123',
        title: 'Test PR',
        body: 'Test description',
        head: 'feature-branch',
        base: 'main',
        state: 'OPEN',
      });
    });

    it('should create a draft pull request', async () => {
      mockExecSync.mockReturnValueOnce('https://github.com/test-owner/test-repo/pull/123\n' as any);
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Draft PR',
          body: 'Draft description',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const params: CreatePRParams = {
        title: 'Draft PR',
        body: 'Draft description',
        head: 'feature-branch',
        base: 'main',
        draft: true,
      };

      await client.createPR(params);

      expect(mockExecSync).toHaveBeenNthCalledWith(
        1,
        'gh pr create --title "Draft PR" --body "Draft description" --base main --head feature-branch --draft',
        { encoding: 'utf-8' }
      );
    });

    it('should handle quotes in title and body', async () => {
      mockExecSync.mockReturnValueOnce('https://github.com/test-owner/test-repo/pull/123\n' as any);
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Test "PR"',
          body: 'Test "description"',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const params: CreatePRParams = {
        title: 'Test "PR"',
        body: 'Test "description"',
        head: 'feature-branch',
        base: 'main',
      };

      await client.createPR(params);

      expect(mockExecSync).toHaveBeenNthCalledWith(
        1,
        'gh pr create --title "Test \\"PR\\"" --body "Test \\"description\\"" --base main --head feature-branch',
        { encoding: 'utf-8' }
      );
    });

    it('should throw error if gh pr create fails', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('gh: command not found');
      });

      const params: CreatePRParams = {
        title: 'Test PR',
        body: 'Test description',
        head: 'feature-branch',
        base: 'main',
      };

      await expect(client.createPR(params)).rejects.toThrow('gh: command not found');
    });
  });

  describe('updatePR', () => {
    it('should update a pull request successfully', async () => {
      mockExecSync.mockReturnValueOnce('' as any); // gh pr edit returns nothing on success
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Updated PR',
          body: 'Updated description',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const params: UpdatePRParams = {
        title: 'Updated PR',
        body: 'Updated description',
      };

      const result = await client.updatePR(123, params);

      expect(mockExecSync).toHaveBeenNthCalledWith(
        1,
        'gh pr edit 123 --title "Updated PR" --body "Updated description"',
        { encoding: 'utf-8' }
      );

      expect(result.title).toBe('Updated PR');
      expect(result.body).toBe('Updated description');
    });

    it('should update only title', async () => {
      mockExecSync.mockReturnValueOnce('' as any);
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'New Title',
          body: 'Original description',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const params: UpdatePRParams = {
        title: 'New Title',
      };

      await client.updatePR(123, params);

      expect(mockExecSync).toHaveBeenNthCalledWith(
        1,
        'gh pr edit 123 --title "New Title"',
        { encoding: 'utf-8' }
      );
    });

    it('should update only body', async () => {
      mockExecSync.mockReturnValueOnce('' as any);
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Original Title',
          body: 'New description',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const params: UpdatePRParams = {
        body: 'New description',
      };

      await client.updatePR(123, params);

      expect(mockExecSync).toHaveBeenNthCalledWith(
        1,
        'gh pr edit 123 --body "New description"',
        { encoding: 'utf-8' }
      );
    });
  });

  describe('getPR', () => {
    it('should get a pull request successfully', async () => {
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Test PR',
          body: 'Test description',
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const result = await client.getPR(123);

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr view 123 --json number,url,title,body,headRefName,baseRefName,state',
        { encoding: 'utf-8' }
      );

      expect(result).toEqual({
        number: 123,
        url: 'https://github.com/test-owner/test-repo/pull/123',
        title: 'Test PR',
        body: 'Test description',
        head: 'feature-branch',
        base: 'main',
        state: 'OPEN',
      });
    });

    it('should handle PR with null body', async () => {
      mockExecSync.mockReturnValueOnce(
        JSON.stringify({
          number: 123,
          url: 'https://github.com/test-owner/test-repo/pull/123',
          title: 'Test PR',
          body: null,
          headRefName: 'feature-branch',
          baseRefName: 'main',
          state: 'OPEN',
        }) as any
      );

      const result = await client.getPR(123);

      expect(result.body).toBeNull();
    });

    it('should throw error if gh pr view fails', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('pull request not found');
      });

      await expect(client.getPR(999)).rejects.toThrow('pull request not found');
    });
  });

  describe('addPRComment', () => {
    it('should add a comment to a pull request successfully', async () => {
      mockExecSync.mockReturnValueOnce('' as any); // gh pr comment returns nothing on success

      await client.addPRComment(123, 'Test comment');

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Test comment"',
        { encoding: 'utf-8' }
      );
    });

    it('should escape quotes in comment body', async () => {
      mockExecSync.mockReturnValueOnce('' as any);

      await client.addPRComment(123, 'Test "quoted" comment');

      expect(mockExecSync).toHaveBeenCalledWith(
        'gh pr comment 123 --body "Test \\"quoted\\" comment"',
        { encoding: 'utf-8' }
      );
    });

    it('should throw error if gh pr comment fails', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('pull request not found');
      });

      await expect(client.addPRComment(999, 'Test comment')).rejects.toThrow(
        'pull request not found'
      );
    });
  });
});
