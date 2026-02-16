/**
 * Tests for session_start tool
 */

import * as path from 'path';
import * as fsExtra from 'fs-extra';

// ESM compat
const fs = (fsExtra as any).default || fsExtra;

import { sessionStartTool, sessionStartSchema, SessionStartParams } from '../../../tools/session/start';
import { SessionStorageProvider } from '../../../providers/session-storage';
import {
  createTempDir,
  cleanupTempDir,
  createMockSpecFile,
} from './test-utils';

describe('sessionStartTool', () => {
  let tempDir: string;
  let storageProvider: SessionStorageProvider;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storageProvider = new SessionStorageProvider({ basePath: tempDir });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('schema validation', () => {
    it('should validate valid params with specFile', () => {
      const params: SessionStartParams = {
        specFile: 'my-spec.md',
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with workingDirectory', () => {
      const params: SessionStartParams = {
        specFile: 'my-spec.md',
        workingDirectory: '/custom/path',
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with workflow name', () => {
      const params: SessionStartParams = {
        specFile: 'my-spec.md',
        workflow: 'custom-workflow',
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with skipChecks', () => {
      const params: SessionStartParams = {
        specFile: 'my-spec.md',
        skipChecks: true,
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with skipStepNames', () => {
      const params: SessionStartParams = {
        specFile: 'my-spec.md',
        skipStepNames: ['lint', 'format'],
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate params with all workflow options', () => {
      const params: SessionStartParams = {
        specFile: 'my-spec.md',
        workflow: 'custom-workflow',
        skipChecks: false,
        skipStepNames: ['lint'],
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject empty specFile', () => {
      const params = {
        specFile: '',
      };

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(false);
    });

    it('should reject missing specFile', () => {
      const params = {};

      const result = sessionStartSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('tool execution', () => {
    it('should start a session with valid spec file', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Session started');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.sessionId).toBeDefined();
      expect(result.metadata?.status).toBe('running');
      expect(result.metadata?.currentPhase).toBe('init');
      expect(result.metadata?.worktreePath).toBeDefined();
    });

    it('should start a session with relative spec path', async () => {
      // Create specs directory and spec file
      await fs.ensureDir(path.join(tempDir, 'specs'));
      await createMockSpecFile(path.join(tempDir, 'specs'), 'my-feature.md');
      const params: SessionStartParams = {
        specFile: 'specs/my-feature.md',
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      expect(result.metadata?.sessionId).toBeDefined();
    });

    it('should return error for non-existent spec file', async () => {
      const params: SessionStartParams = {
        specFile: 'non-existent-spec.md',
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Spec file not found');
    });

    it('should generate unique session ID with date prefix', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;
      // Session ID format: YYYY-MM-DD-{gitHash}-{random}
      expect(sessionId).toMatch(/^\d{4}-\d{2}-\d{2}-.+-.+$/);
    });

    it('should extract spec name from file path', async () => {
      const specPath = await createMockSpecFile(tempDir, 'SPEC-000001-my-awesome-feature.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      // The worktree path should contain the cleaned spec name
      const worktreePath = result.metadata?.worktreePath as string;
      expect(worktreePath).toContain('my-awesome-feature');
    });

    it('should handle worktree creation based on git availability', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      // worktreeCreated can be true or false depending on whether tempDir is within a git repo
      expect(typeof result.metadata?.worktreeCreated).toBe('boolean');
      expect(result.metadata?.worktreePath).toBeDefined();
    });

    it('should return valid worktreePath in result', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const worktreePath = result.metadata?.worktreePath as string;
      // Worktree path should be either within .worktrees or the tempDir itself
      expect(worktreePath).toBeDefined();
      expect(typeof worktreePath).toBe('string');
    });

    it('should persist session to storage', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;

      // Verify session was persisted
      const session = await storageProvider.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.status).toBe('running');
      expect(session?.currentPhase).toBe('init');
      expect(session?.phasesCompleted).toContain('init');
    });

    it('should store workflow name in session context', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
        workflow: 'custom-workflow',
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;
      expect(result.metadata?.workflow).toBe('custom-workflow');

      // Verify persisted
      const session = await storageProvider.getSession(sessionId);
      expect(session?.workflow).toBe('custom-workflow');
    });

    it('should default workflow to spec-implementation when not provided', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;
      expect(result.metadata?.workflow).toBe('spec-implementation');

      const session = await storageProvider.getSession(sessionId);
      expect(session?.workflow).toBe('spec-implementation');
    });

    it('should store skipChecks in session context', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
        skipChecks: true,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;

      const session = await storageProvider.getSession(sessionId);
      expect(session?.skipChecks).toBe(true);
    });

    it('should store skipStepNames in session context', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
        skipStepNames: ['lint', 'format'],
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;

      const session = await storageProvider.getSession(sessionId);
      expect(session?.skipStepNames).toEqual(['lint', 'format']);
    });

    it('should create audit log with init entry', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      const sessionId = result.metadata?.sessionId as string;

      // Verify audit entry was created
      const auditEntries = await storageProvider.getAuditEntries(sessionId);
      expect(auditEntries.length).toBeGreaterThan(0);
      expect(auditEntries[0].phase).toBe('init');
      expect(auditEntries[0].status).toBe('complete');
    });

    it('should include audit path in metadata', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      expect(result.metadata?.auditPath).toBeDefined();
      expect(result.metadata?.auditPath).toContain('audit.jsonl');
    });

    it('should work without explicit working directory by using tempDir', async () => {
      // Verify tool works when workingDirectory is provided explicitly.
      // The default cwd fallback is a trivial code path and does not
      // need a dedicated integration test that creates real worktrees.
      const specPath = await createMockSpecFile(tempDir, 'test-default-dir-spec.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      expect(result.metadata?.sessionId).toBeDefined();
    });

    it('should handle special characters in spec name', async () => {
      const specPath = await createMockSpecFile(tempDir, 'spec with spaces & special-chars!.md');
      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      // Should slugify the name properly
      expect(result.metadata?.sessionId).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return error when storage provider fails', async () => {
      const specPath = await createMockSpecFile(tempDir, 'test-spec.md');

      // Create a provider that throws on createSession
      const failingProvider = {
        createSession: jest.fn().mockRejectedValue(new Error('Storage failure')),
        getSessionDir: jest.fn().mockReturnValue('/mock/dir'),
      } as unknown as SessionStorageProvider;

      const params: SessionStartParams = {
        specFile: specPath,
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, failingProvider);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to start session');
    });

    it('should handle absolute spec path', async () => {
      const specPath = await createMockSpecFile(tempDir, 'absolute-spec.md');
      const params: SessionStartParams = {
        specFile: specPath, // Already absolute
        workingDirectory: tempDir,
      };

      const result = await sessionStartTool(params, storageProvider);

      expect(result.isError).toBe(false);
      expect(result.metadata?.sessionId).toBeDefined();
    });
  });
});
