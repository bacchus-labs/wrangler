/**
 * Integration tests: WorkflowEngine + WorkflowSessionManager.
 *
 * Wires the engine's onAuditEntry callback to the session manager,
 * exercises checkpoint roundtrip (pause -> save -> load -> resume),
 * and verifies that the composition works end-to-end through the
 * real filesystem.
 *
 * Uses REAL filesystem operations -- no mocks except for QueryFunction.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { stringify as yamlStringify } from 'yaml';
import { WorkflowEngine } from '../../src/engine.js';
import { WorkflowContext } from '../../src/state.js';
import { HandlerRegistry } from '../../src/handlers/index.js';
import { WorkflowSessionManager, type SessionConfig } from '../../src/integration/session.js';
import { type EngineConfig, WorkflowFailure } from '../../src/types.js';
import { createSDKSimulator, createAgentSequence } from '../fixtures/sdk-simulator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wf-engine-session-test-'));
}

function makeSessionConfig(basePath: string, overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    basePath,
    specFile: '/tmp/spec.md',
    worktreePath: '/tmp/worktree',
    branchName: 'wf-test-branch',
    ...overrides,
  };
}

function makeEngineConfig(tmpDir: string, overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    workingDirectory: tmpDir,
    workflowBaseDir: tmpDir,
    defaults: {
      model: 'test-model',
      permissionMode: 'bypassPermissions',
      settingSources: ['project'],
    },
    dryRun: false,
    ...overrides,
  };
}

/** Write a minimal workflow YAML file. */
async function writeWorkflowYaml(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/** Write a markdown agent file with frontmatter. */
async function writeAgentMarkdown(
  dir: string,
  filename: string,
  frontmatter: Record<string, unknown>,
  body: string
): Promise<string> {
  const filePath = path.join(dir, filename);
  const yamlFrontmatter = yamlStringify(frontmatter).trim();
  const content = `---\n${yamlFrontmatter}\n---\n\n${body}`;
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/** Read a JSON file and parse it. */
async function readJson(filePath: string): Promise<unknown> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/** Check if a file exists. */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('WorkflowEngine + WorkflowSessionManager integration', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTmpDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // 1. Audit entry flow
  // -----------------------------------------------------------------------
  describe('audit entry flow', () => {
    it('should persist engine audit entries to session audit log via onAuditEntry', async () => {
      // Create session manager
      const sessionManager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await sessionManager.createSession();

      // Create agent files for a 2-phase workflow
      await writeAgentMarkdown(tmpDir, 'phase1.md', {
        name: 'phase1',
        description: 'Phase 1 agent',
        tools: [],
      }, 'Execute phase 1.');

      await writeAgentMarkdown(tmpDir, 'phase2.md', {
        name: 'phase2',
        description: 'Phase 2 agent',
        tools: [],
      }, 'Execute phase 2.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: two-phase-workflow
version: 1
phases:
  - name: phase-one
    type: agent
    agent: phase1.md
    output: result1
  - name: phase-two
    type: agent
    agent: phase2.md
    output: result2
`);

      // Set up SDK simulator with deterministic responses
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['phase 1', createAgentSequence({ done: true })],
          ['phase 2', createAgentSequence({ done: true })],
        ]),
        defaultResponse: createAgentSequence({ fallback: true }),
      });

      // Create engine with onAuditEntry wired to session manager
      const engine = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn,
        onAuditEntry: (entry) => sessionManager.appendAuditEntry(entry),
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(result.status).toBe('completed');

      // Read the audit log from the filesystem
      const entries = await sessionManager.getAuditEntries(sessionId);

      // The session manager creates an 'init' entry on createSession,
      // and the engine emits started + completed for each phase (2 phases = 4 entries)
      // Total: init(1) + phase-one-started(1) + phase-one-completed(1) + phase-two-started(1) + phase-two-completed(1) = 5
      expect(entries.length).toBeGreaterThanOrEqual(5);

      // Verify the init entry from session manager
      expect(entries[0].step).toBe('init');
      expect(entries[0].status).toBe('completed');

      // Verify engine audit entries for step starts and completions
      const stepNames = entries.map(e => e.step);
      expect(stepNames).toContain('phase-one');
      expect(stepNames).toContain('phase-two');

      const startEntries = entries.filter(e => e.status === 'started');
      const completeEntries = entries.filter(e => e.status === 'completed');

      // At least 2 started entries (one per phase)
      expect(startEntries.length).toBeGreaterThanOrEqual(2);
      // At least 3 completed entries (init + 2 phases)
      expect(completeEntries.length).toBeGreaterThanOrEqual(3);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Full checkpoint roundtrip (pause -> save -> load -> resume)
  // -----------------------------------------------------------------------
  describe('checkpoint roundtrip', () => {
    it('should pause, save checkpoint, load with new instances, and resume to completion', async () => {
      // Phase A: setup (code) sets review.hasActionableIssues = true
      // Phase B: loop with onExhausted: escalate -> causes WorkflowPaused
      // After pause: save checkpoint, create new instances, load, resume
      // Phase C (resumed): completes workflow

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fixes issues',
        tools: [],
      }, 'Fix the issues.');

      await writeAgentMarkdown(tmpDir, 'finalizer.md', {
        name: 'finalizer',
        description: 'Final step',
        tools: [],
      }, 'Finalize.');

      const registry = new HandlerRegistry();
      registry.register('setup-review', async (ctx) => {
        ctx.set('review', { hasActionableIssues: true });
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: pausable-workflow
version: 1
phases:
  - name: setup
    type: code
    handler: setup-review
  - name: fix-loop
    type: loop
    condition: review.hasActionableIssues
    maxRetries: 1
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
  - name: finalize
    type: agent
    agent: finalizer.md
    output: finalResult
`);

      const { queryFn: queryFn1 } = createSDKSimulator({
        responses: new Map([
          ['Fix the issues', createAgentSequence({ fixed: false })],
        ]),
        defaultResponse: createAgentSequence({}),
      });

      // --- Run engine until pause ---
      const sessionManager1 = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await sessionManager1.createSession();

      const engine1 = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn: queryFn1,
        handlerRegistry: registry,
        onAuditEntry: (entry) => sessionManager1.appendAuditEntry(entry),
      });

      const pausedResult = await engine1.run('workflow.yaml', '/tmp/spec.md');
      expect(pausedResult.status).toBe('paused');
      expect(pausedResult.blockerDetails).toContain('Loop exhausted');

      // --- Save checkpoint ---
      await sessionManager1.saveCheckpoint({
        currentPhase: pausedResult.pausedAtPhase!,
        variables: pausedResult.outputs,
        completedPhases: pausedResult.completedPhases,
        changedFiles: pausedResult.changedFiles ?? [],
        tasksCompleted: [],
        tasksPending: [],
      });

      // Verify checkpoint exists on disk
      const checkpointPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'checkpoint.json'
      );
      expect(await fileExists(checkpointPath)).toBe(true);

      // --- Load checkpoint with NEW instances ---
      const sessionManager2 = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const loaded = await sessionManager2.loadCheckpoint(sessionId);
      expect(loaded).not.toBeNull();
      expect(loaded!.currentPhase).toBe(pausedResult.pausedAtPhase);

      // Build checkpoint data for engine.resume()
      const checkpointData: Record<string, unknown> = {
        variables: loaded!.variables,
        completedPhases: loaded!.completedPhases,
        changedFiles: loaded!.changedFiles,
        currentTaskId: null,
      };

      // For resume, clear the blocker so the loop's condition is false
      const resumeRegistry = new HandlerRegistry();
      resumeRegistry.register('setup-review', async (ctx) => {
        // The setup phase won't re-run since we resume from fix-loop
        ctx.set('review', { hasActionableIssues: false });
      });

      // Create a new simulator that clears the condition
      const { queryFn: queryFn2 } = createSDKSimulator({
        responses: new Map([
          ['Finalize', createAgentSequence({ finalized: true })],
        ]),
        defaultResponse: createAgentSequence({}),
      });

      // We need to resume from the fix-loop phase but with condition cleared.
      // Modify the checkpoint variables to clear the condition before resuming.
      (checkpointData.variables as Record<string, unknown>).review = { hasActionableIssues: false };

      const engine2 = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn: queryFn2,
        handlerRegistry: resumeRegistry,
        onAuditEntry: (entry) => sessionManager2.appendAuditEntry(entry),
      });

      const resumedResult = await engine2.resume(
        'workflow.yaml',
        checkpointData,
        loaded!.currentPhase,
      );

      expect(resumedResult.status).toBe('completed');
      // The resumed engine should have run fix-loop (condition now false, exits immediately)
      // and finalize phase
      expect(resumedResult.completedPhases).toContain('setup');
      expect(resumedResult.completedPhases).toContain('fix-loop');
      expect(resumedResult.completedPhases).toContain('finalize');
    });
  });

  // -----------------------------------------------------------------------
  // 3. Checkpoint data shape compatibility
  // -----------------------------------------------------------------------
  describe('checkpoint data shape compatibility', () => {
    it('should produce checkpoint with required fields from WorkflowContext.toCheckpoint()', () => {
      const ctx = new WorkflowContext({ specPath: '/tmp/spec.md' });
      ctx.set('analysis', { tasks: [{ id: 't1' }] });
      ctx.setCurrentPhase('execute');
      ctx.markPhaseCompleted('analyze');
      ctx.addChangedFile('src/foo.ts');

      const checkpoint = ctx.toCheckpoint();

      // Verify required fields exist
      expect(checkpoint).toHaveProperty('variables');
      expect(checkpoint).toHaveProperty('completedPhases');
      expect(checkpoint).toHaveProperty('changedFiles');
      expect(checkpoint).toHaveProperty('currentTaskId');
      expect(checkpoint).toHaveProperty('currentPhase');

      // Verify types
      expect(typeof checkpoint.variables).toBe('object');
      expect(Array.isArray(checkpoint.completedPhases)).toBe(true);
      expect(Array.isArray(checkpoint.changedFiles)).toBe(true);
      expect(checkpoint.currentPhase).toBe('execute');
    });

    it('should be compatible with engine.resume() checkpoint format', async () => {
      // Build a context, checkpoint it, then use it to resume
      const ctx = new WorkflowContext({ specPath: '/tmp/spec.md', someData: 'hello' });
      ctx.setCurrentPhase('phase-b');
      ctx.markPhaseCompleted('phase-a');

      const checkpoint = ctx.toCheckpoint();

      // Verify engine.resume() can consume this checkpoint shape
      await writeAgentMarkdown(tmpDir, 'agent-b.md', {
        name: 'agent-b',
        description: 'Phase B agent',
        tools: [],
      }, 'Run phase B.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: resume-test
version: 1
phases:
  - name: phase-a
    type: agent
    agent: agent-b.md
    output: resultA
  - name: phase-b
    type: agent
    agent: agent-b.md
    output: resultB
`);

      const { queryFn } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createAgentSequence({ result: 'ok' }),
      });

      const engine = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn,
      });

      // Resume using the checkpoint -- should not throw
      const result = await engine.resume('workflow.yaml', checkpoint, 'phase-b');

      expect(result.status).toBe('completed');
      // phase-a was already marked completed in the checkpoint
      expect(result.completedPhases).toContain('phase-a');
      expect(result.completedPhases).toContain('phase-b');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Completed phases preserved through roundtrip
  // -----------------------------------------------------------------------
  describe('completed phases preserved through roundtrip', () => {
    it('should preserve completedPhases through session checkpoint save/load', async () => {
      // Workflow: phase-a (code) -> phase-b (code) -> phase-c (loop that escalates)
      const registry = new HandlerRegistry();
      registry.register('do-a', async (ctx) => {
        ctx.set('resultA', { done: true });
      });
      registry.register('do-b', async (ctx) => {
        ctx.set('resultB', { done: true });
      });
      registry.register('set-blocker', async (ctx) => {
        ctx.set('blocker', { active: true });
      });

      await writeAgentMarkdown(tmpDir, 'fixer.md', {
        name: 'fixer',
        description: 'Fix',
        tools: [],
      }, 'Fix.');

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: phases-roundtrip
version: 1
phases:
  - name: phase-a
    type: code
    handler: do-a
  - name: phase-b
    type: code
    handler: do-b
  - name: phase-c-setup
    type: code
    handler: set-blocker
  - name: phase-c-loop
    type: loop
    condition: blocker.active
    maxRetries: 1
    onExhausted: escalate
    steps:
      - name: fix
        type: agent
        agent: fixer.md
  - name: phase-d
    type: code
    handler: do-a
`);

      const { queryFn } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createAgentSequence({}),
      });

      // --- Run until pause ---
      const sessionManager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await sessionManager.createSession();

      const engine = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
        onAuditEntry: (entry) => sessionManager.appendAuditEntry(entry),
      });

      const pausedResult = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(pausedResult.status).toBe('paused');
      expect(pausedResult.completedPhases).toContain('phase-a');
      expect(pausedResult.completedPhases).toContain('phase-b');
      expect(pausedResult.completedPhases).toContain('phase-c-setup');
      expect(pausedResult.completedPhases).not.toContain('phase-c-loop');

      // --- Save checkpoint ---
      await sessionManager.saveCheckpoint({
        currentPhase: pausedResult.pausedAtPhase!,
        variables: pausedResult.outputs,
        completedPhases: pausedResult.completedPhases,
        changedFiles: pausedResult.changedFiles ?? [],
        tasksCompleted: [],
        tasksPending: [],
      });

      // --- Load checkpoint ---
      const loaded = await sessionManager.loadCheckpoint(sessionId);
      expect(loaded).not.toBeNull();
      expect(loaded!.completedPhases).toEqual(
        expect.arrayContaining(['phase-a', 'phase-b', 'phase-c-setup'])
      );
      expect(loaded!.completedPhases).not.toContain('phase-c-loop');

      // --- Resume from phase-c-loop with blocker cleared ---
      const resumeRegistry = new HandlerRegistry();
      resumeRegistry.register('do-a', async (ctx) => {
        ctx.set('resultA', { done: true });
      });
      resumeRegistry.register('set-blocker', async (ctx) => {
        ctx.set('blocker', { active: false });
      });

      const checkpointData: Record<string, unknown> = {
        variables: { ...loaded!.variables, blocker: { active: false } },
        completedPhases: loaded!.completedPhases,
        changedFiles: loaded!.changedFiles,
        currentTaskId: null,
      };

      const { queryFn: queryFn2 } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createAgentSequence({}),
      });

      const engine2 = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn: queryFn2,
        handlerRegistry: resumeRegistry,
        onAuditEntry: (entry) => sessionManager.appendAuditEntry(entry),
      });

      const resumedResult = await engine2.resume(
        'workflow.yaml',
        checkpointData,
        loaded!.currentPhase,
      );

      expect(resumedResult.status).toBe('completed');
      // All phases should be in completedPhases, and phase-a/phase-b should NOT have re-run
      expect(resumedResult.completedPhases).toContain('phase-a');
      expect(resumedResult.completedPhases).toContain('phase-b');
      expect(resumedResult.completedPhases).toContain('phase-c-setup');
      expect(resumedResult.completedPhases).toContain('phase-c-loop');
      expect(resumedResult.completedPhases).toContain('phase-d');
    });
  });

  // -----------------------------------------------------------------------
  // 5. Session completion after successful run
  // -----------------------------------------------------------------------
  describe('session completion after successful run', () => {
    it('should mark session as completed with correct status in context.json', async () => {
      const sessionManager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await sessionManager.createSession();

      const registry = new HandlerRegistry();
      registry.register('noop', async () => {});

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: completion-workflow
version: 1
phases:
  - name: step-one
    type: code
    handler: noop
  - name: step-two
    type: code
    handler: noop
`);

      const { queryFn } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createAgentSequence({}),
      });

      const engine = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
        onAuditEntry: (entry) => sessionManager.appendAuditEntry(entry),
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(result.status).toBe('completed');

      // Complete the session
      await sessionManager.completeSession(result);

      // Verify session directory contents
      const sessionDir = path.join(tmpDir, '.wrangler', 'sessions', sessionId);

      // context.json should show completed status
      const contextPath = path.join(sessionDir, 'context.json');
      expect(await fileExists(contextPath)).toBe(true);

      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.status).toBe('completed');
      expect(context.completedAt).toBeDefined();
      expect(context.phasesCompleted).toEqual(['step-one', 'step-two']);

      // audit.jsonl should contain a completion entry
      const entries = await sessionManager.getAuditEntries(sessionId);
      const completeEntry = entries.find(e => e.step === 'complete');
      expect(completeEntry).toBeDefined();
      expect(completeEntry!.status).toBe('completed');
      expect(completeEntry!.metadata?.completedPhases).toEqual(['step-one', 'step-two']);
    });

    it('should mark session as failed when workflow fails', async () => {
      const sessionManager = new WorkflowSessionManager(makeSessionConfig(tmpDir));
      const sessionId = await sessionManager.createSession();

      const registry = new HandlerRegistry();
      registry.register('fail-handler', async () => {
        throw new WorkflowFailure('check', 'forced failure for test');
      });

      await writeWorkflowYaml(tmpDir, 'workflow.yaml', `
name: failing-workflow
version: 1
phases:
  - name: check
    type: code
    handler: fail-handler
`);

      const { queryFn } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createAgentSequence({}),
      });

      const engine = new WorkflowEngine({
        config: makeEngineConfig(tmpDir),
        queryFn,
        handlerRegistry: registry,
        onAuditEntry: (entry) => sessionManager.appendAuditEntry(entry),
      });

      const result = await engine.run('workflow.yaml', '/tmp/spec.md');
      expect(result.status).toBe('failed');

      // Complete the session with the failed result
      await sessionManager.completeSession(result);

      // Verify session directory shows failed status
      const contextPath = path.join(
        tmpDir, '.wrangler', 'sessions', sessionId, 'context.json'
      );
      const context = await readJson(contextPath) as Record<string, unknown>;
      expect(context.status).toBe('failed');

      // Audit trail should have a failure completion entry
      const entries = await sessionManager.getAuditEntries(sessionId);
      const completeEntry = entries.find(e => e.step === 'complete');
      expect(completeEntry).toBeDefined();
      expect(completeEntry!.status).toBe('failed');
    });
  });
});
