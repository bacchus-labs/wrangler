/**
 * Tests for handler modules: HandlerRegistry, createIssuesHandler,
 * saveCheckpointHandler, and createDefaultRegistry.
 */

import { WorkflowContext } from '../src/state.js';
import { HandlerRegistry } from '../src/handlers/registry.js';
import { createIssuesHandler } from '../src/handlers/create-issues.js';
import { saveCheckpointHandler } from '../src/handlers/save-checkpoint.js';
import { createDefaultRegistry } from '../src/handlers/index.js';
import type { AnalysisResult, TaskDefinition } from '../src/schemas/index.js';
import type { QueryFunction, SDKResultMessage, EngineConfig } from '../src/types.js';
import type { HandlerDeps } from '../src/handlers/registry.js';

// --- Helper: build a minimal valid AnalysisResult ---

function makeAnalysis(
  taskOverrides: Array<Partial<TaskDefinition>> = [{}],
): AnalysisResult {
  return {
    tasks: taskOverrides.map((overrides, i) => ({
      id: `task-${String(i + 1).padStart(3, '0')}`,
      title: `Task ${i + 1}`,
      description: `Description for task ${i + 1}`,
      requirements: ['req-1'],
      dependencies: [],
      estimatedComplexity: 'medium' as const,
      filePaths: [],
      ...overrides,
    })),
    requirements: [
      { id: 'req-1', description: 'Must work', source: 'spec', testable: true },
    ],
    constraints: ['No external dependencies'],
    techStack: { language: 'TypeScript', testFramework: 'Jest' },
  };
}

// ================================================================
// HandlerRegistry
// ================================================================

describe('HandlerRegistry', () => {
  describe('register() and get()', () => {
    it('registers and retrieves a handler', () => {
      const registry = new HandlerRegistry();
      const handler = async () => {};
      registry.register('my-handler', handler);

      expect(registry.get('my-handler')).toBe(handler);
    });

    it('allows overwriting a registered handler', () => {
      const registry = new HandlerRegistry();
      const handler1 = async () => {};
      const handler2 = async () => {};
      registry.register('my-handler', handler1);
      registry.register('my-handler', handler2);

      expect(registry.get('my-handler')).toBe(handler2);
    });
  });

  describe('get() with unknown handler', () => {
    it('throws an error for unregistered handler', () => {
      const registry = new HandlerRegistry();
      expect(() => registry.get('unknown')).toThrow(
        'No handler registered with name: unknown',
      );
    });

    it('throws with the handler name in the message', () => {
      const registry = new HandlerRegistry();
      expect(() => registry.get('special-handler')).toThrow('special-handler');
    });
  });

  describe('has()', () => {
    it('returns true for registered handler', () => {
      const registry = new HandlerRegistry();
      registry.register('exists', async () => {});
      expect(registry.has('exists')).toBe(true);
    });

    it('returns false for unregistered handler', () => {
      const registry = new HandlerRegistry();
      expect(registry.has('missing')).toBe(false);
    });
  });

  describe('list()', () => {
    it('returns empty array for new registry', () => {
      const registry = new HandlerRegistry();
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered handler names', () => {
      const registry = new HandlerRegistry();
      registry.register('alpha', async () => {});
      registry.register('beta', async () => {});
      registry.register('gamma', async () => {});

      const names = registry.list();
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
      expect(names).toHaveLength(3);
    });

    it('reflects overwritten handlers (no duplicates)', () => {
      const registry = new HandlerRegistry();
      registry.register('dup', async () => {});
      registry.register('dup', async () => {});

      expect(registry.list()).toEqual(['dup']);
    });
  });
});

// ================================================================
// createIssuesHandler
// ================================================================

describe('createIssuesHandler', () => {
  it('throws when analysis is not in context', async () => {
    const ctx = new WorkflowContext();
    await expect(createIssuesHandler(ctx)).rejects.toThrow(
      'create-issues handler requires "analysis" in context',
    );
  });

  it('creates tasks from analysis and stores them back', async () => {
    const analysis = makeAnalysis([
      { title: 'Task A' },
      { title: 'Task B' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    const updatedAnalysis = ctx.get('analysis') as AnalysisResult;
    expect(updatedAnalysis.tasks).toHaveLength(2);
    expect(updatedAnalysis.tasks[0].title).toBe('Task A');
    expect(updatedAnalysis.tasks[1].title).toBe('Task B');
  });

  it('preserves existing task IDs', async () => {
    const analysis = makeAnalysis([
      { id: 'custom-id-1', title: 'Task A' },
      { id: 'custom-id-2', title: 'Task B' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    const updatedAnalysis = ctx.get('analysis') as AnalysisResult;
    expect(updatedAnalysis.tasks[0].id).toBe('custom-id-1');
    expect(updatedAnalysis.tasks[1].id).toBe('custom-id-2');
  });

  it('generates IDs for tasks without one', async () => {
    const analysis = makeAnalysis([
      { id: '', title: 'No ID task 1' },
      { id: '', title: 'No ID task 2' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    const updatedAnalysis = ctx.get('analysis') as AnalysisResult;
    // Empty string is falsy, so IDs get generated
    expect(updatedAnalysis.tasks[0].id).toBe('task-001');
    expect(updatedAnalysis.tasks[1].id).toBe('task-002');
  });

  it('sets taskIds in context', async () => {
    const analysis = makeAnalysis([
      { id: 'id-a' },
      { id: 'id-b' },
      { id: 'id-c' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    expect(ctx.get('taskIds')).toEqual(['id-a', 'id-b', 'id-c']);
  });

  it('sets tasksCompleted to empty array', async () => {
    const analysis = makeAnalysis([{ id: 'id-a' }]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    expect(ctx.get('tasksCompleted')).toEqual([]);
  });

  it('sets tasksPending to all task IDs', async () => {
    const analysis = makeAnalysis([
      { id: 'id-a' },
      { id: 'id-b' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    expect(ctx.get('tasksPending')).toEqual(['id-a', 'id-b']);
  });

  it('preserves other analysis fields', async () => {
    const analysis = makeAnalysis([{ id: 'id-a' }]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    const updatedAnalysis = ctx.get('analysis') as AnalysisResult;
    expect(updatedAnalysis.requirements).toEqual(analysis.requirements);
    expect(updatedAnalysis.constraints).toEqual(analysis.constraints);
    expect(updatedAnalysis.techStack).toEqual(analysis.techStack);
  });

  it('handles a single task', async () => {
    const analysis = makeAnalysis([{ id: 'solo', title: 'Only task' }]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    expect(ctx.get('taskIds')).toEqual(['solo']);
    expect(ctx.get('tasksCompleted')).toEqual([]);
    expect(ctx.get('tasksPending')).toEqual(['solo']);
  });

  it('handles many tasks', async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      id: `task-${String(i + 1).padStart(3, '0')}`,
      title: `Task ${i + 1}`,
    }));
    const analysis = makeAnalysis(tasks);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    await createIssuesHandler(ctx);

    const taskIds = ctx.get('taskIds') as string[];
    expect(taskIds).toHaveLength(20);
    expect(taskIds[0]).toBe('task-001');
    expect(taskIds[19]).toBe('task-020');
  });
});

// ================================================================
// createIssuesHandler - MCP issue creation
// ================================================================

/**
 * Helper: create a mock queryFn that returns a result with created issue IDs.
 */
function makeMockQueryFn(
  issueIds: Array<{ taskId: string; issueId: string }>,
): QueryFunction {
  return async function* mockQuery() {
    const result: SDKResultMessage = {
      type: 'result',
      subtype: 'success',
      is_error: false,
      num_turns: 1,
      total_cost_usd: 0.01,
      session_id: 'mock-session',
      structured_output: { createdIssues: issueIds },
    };
    yield result;
  };
}

/**
 * Helper: create a mock queryFn that yields an error result.
 */
function makeMockQueryFnError(): QueryFunction {
  return async function* mockQueryError() {
    const result: SDKResultMessage = {
      type: 'result',
      subtype: 'error_during_execution',
      is_error: true,
      num_turns: 1,
      total_cost_usd: 0.01,
      session_id: 'mock-session',
      errors: ['Agent crashed'],
    };
    yield result;
  };
}

/**
 * Helper: create a mock queryFn that throws an exception.
 */
function makeMockQueryFnThrows(): QueryFunction {
  return async function* mockQueryThrows() {
    throw new Error('Network error');
    // Unreachable but required for generator type
    yield undefined as never;
  };
}

function makeDeps(overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    queryFn: makeMockQueryFn([]),
    config: {
      workingDirectory: '/tmp/test',
      workflowBaseDir: '/tmp/test',
      defaults: {
        model: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
        settingSources: [],
      },
      dryRun: false,
      mcpServers: { wrangler: { command: 'node', args: ['mcp/dist/index.js'] } },
    },
    ...overrides,
  };
}

describe('createIssuesHandler - MCP issue creation', () => {
  it('falls back to stub behavior when no deps provided', async () => {
    const analysis = makeAnalysis([
      { id: 'task-a', title: 'Task A' },
      { id: 'task-b', title: 'Task B' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    // No deps passed -- original stub behavior
    await createIssuesHandler(ctx);

    const updatedAnalysis = ctx.get('analysis') as AnalysisResult;
    expect(updatedAnalysis.tasks).toHaveLength(2);
    expect(ctx.get('taskIds')).toEqual(['task-a', 'task-b']);
    // No mcpIssueIds set when no deps
    expect(ctx.get('mcpIssueIds')).toBeUndefined();
  });

  it('falls back to stub behavior when mcpServers not configured', async () => {
    const analysis = makeAnalysis([{ id: 'task-a', title: 'Task A' }]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    const deps = makeDeps({
      config: {
        workingDirectory: '/tmp/test',
        workflowBaseDir: '/tmp/test',
        defaults: {
          model: 'claude-sonnet-4-20250514',
          permissionMode: 'default',
          settingSources: [],
        },
        dryRun: false,
        // No mcpServers
      },
    });

    await createIssuesHandler(ctx, undefined, deps);

    expect(ctx.get('taskIds')).toEqual(['task-a']);
    expect(ctx.get('mcpIssueIds')).toBeUndefined();
  });

  it('creates MCP issues when mcpServers is configured', async () => {
    const analysis = makeAnalysis([
      { id: 'task-a', title: 'Task A' },
      { id: 'task-b', title: 'Task B' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    const queryFn = makeMockQueryFn([
      { taskId: 'task-a', issueId: 'ISS-000001' },
      { taskId: 'task-b', issueId: 'ISS-000002' },
    ]);
    const deps = makeDeps({ queryFn });

    await createIssuesHandler(ctx, undefined, deps);

    // Tasks should still be properly stored
    expect(ctx.get('taskIds')).toEqual(['task-a', 'task-b']);
    expect(ctx.get('tasksCompleted')).toEqual([]);
    expect(ctx.get('tasksPending')).toEqual(['task-a', 'task-b']);

    // MCP issue ID map should be stored
    const issueIds = ctx.get('mcpIssueIds') as Record<string, string>;
    expect(issueIds).toEqual({
      'task-a': 'ISS-000001',
      'task-b': 'ISS-000002',
    });
  });

  it('calls queryFn with correct prompt and MCP server config', async () => {
    const analysis = makeAnalysis([
      { id: 'task-x', title: 'Implement feature X', description: 'Build feature X with tests' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    const calls: Array<{ prompt: string; options: Record<string, unknown> }> = [];
    const queryFn: QueryFunction = async function* captureQuery(params) {
      calls.push({ prompt: params.prompt, options: params.options ?? {} });
      const result: SDKResultMessage = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        num_turns: 1,
        total_cost_usd: 0.01,
        session_id: 'mock-session',
        structured_output: {
          createdIssues: [{ taskId: 'task-x', issueId: 'ISS-000099' }],
        },
      };
      yield result;
    };

    const deps = makeDeps({ queryFn });

    await createIssuesHandler(ctx, undefined, deps);

    expect(calls).toHaveLength(1);
    // Prompt should mention the tasks
    expect(calls[0].prompt).toContain('task-x');
    expect(calls[0].prompt).toContain('Implement feature X');
    // MCP servers should be passed through
    expect(calls[0].options).toHaveProperty('mcpServers');
  });

  it('handles agent error gracefully -- stores tasks without MCP IDs', async () => {
    const analysis = makeAnalysis([
      { id: 'task-err', title: 'Task with error' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    const queryFn = makeMockQueryFnError();
    const deps = makeDeps({ queryFn });

    // Should NOT throw
    await createIssuesHandler(ctx, undefined, deps);

    // Tasks should still be properly stored (fallback behavior)
    expect(ctx.get('taskIds')).toEqual(['task-err']);
    expect(ctx.get('tasksCompleted')).toEqual([]);
    expect(ctx.get('tasksPending')).toEqual(['task-err']);
    // No MCP issue IDs since agent errored
    expect(ctx.get('mcpIssueIds')).toBeUndefined();
  });

  it('handles queryFn throwing an exception gracefully', async () => {
    const analysis = makeAnalysis([
      { id: 'task-throw', title: 'Task with throw' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    const queryFn = makeMockQueryFnThrows();
    const deps = makeDeps({ queryFn });

    // Should NOT throw
    await createIssuesHandler(ctx, undefined, deps);

    // Tasks should still be properly stored
    expect(ctx.get('taskIds')).toEqual(['task-throw']);
    expect(ctx.get('tasksCompleted')).toEqual([]);
    expect(ctx.get('tasksPending')).toEqual(['task-throw']);
    expect(ctx.get('mcpIssueIds')).toBeUndefined();
  });

  it('handles partial issue creation -- only stores successfully mapped IDs', async () => {
    const analysis = makeAnalysis([
      { id: 'task-1', title: 'Task 1' },
      { id: 'task-2', title: 'Task 2' },
      { id: 'task-3', title: 'Task 3' },
    ]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    // Agent only returns IDs for 2 of 3 tasks
    const queryFn = makeMockQueryFn([
      { taskId: 'task-1', issueId: 'ISS-000010' },
      { taskId: 'task-3', issueId: 'ISS-000012' },
    ]);
    const deps = makeDeps({ queryFn });

    await createIssuesHandler(ctx, undefined, deps);

    const issueIds = ctx.get('mcpIssueIds') as Record<string, string>;
    expect(issueIds).toEqual({
      'task-1': 'ISS-000010',
      'task-3': 'ISS-000012',
    });
    // All tasks still tracked
    expect(ctx.get('taskIds')).toEqual(['task-1', 'task-2', 'task-3']);
  });

  it('handles malformed agent response gracefully', async () => {
    const analysis = makeAnalysis([{ id: 'task-bad', title: 'Bad response' }]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);

    const queryFn: QueryFunction = async function* malformedQuery() {
      const result: SDKResultMessage = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        num_turns: 1,
        total_cost_usd: 0.01,
        session_id: 'mock-session',
        structured_output: { unexpected: 'format' },
      };
      yield result;
    };
    const deps = makeDeps({ queryFn });

    // Should NOT throw
    await createIssuesHandler(ctx, undefined, deps);

    // Tasks still stored
    expect(ctx.get('taskIds')).toEqual(['task-bad']);
    // No MCP IDs since response was malformed
    expect(ctx.get('mcpIssueIds')).toBeUndefined();
  });

  it('stores specPath in queryFn prompt when available in context', async () => {
    const analysis = makeAnalysis([{ id: 'task-s', title: 'Spec task' }]);
    const ctx = new WorkflowContext();
    ctx.set('analysis', analysis);
    ctx.set('specPath', '/path/to/SPEC-000045.md');

    const calls: string[] = [];
    const queryFn: QueryFunction = async function* capturePrompt(params) {
      calls.push(params.prompt);
      const result: SDKResultMessage = {
        type: 'result',
        subtype: 'success',
        is_error: false,
        num_turns: 1,
        total_cost_usd: 0.01,
        session_id: 'mock-session',
        structured_output: {
          createdIssues: [{ taskId: 'task-s', issueId: 'ISS-000050' }],
        },
      };
      yield result;
    };
    const deps = makeDeps({ queryFn });

    await createIssuesHandler(ctx, undefined, deps);

    expect(calls[0]).toContain('SPEC-000045');
  });
});

// ================================================================
// saveCheckpointHandler
// ================================================================

describe('saveCheckpointHandler', () => {
  it('returns early when not in a per-task context (no currentTaskId)', async () => {
    const ctx = new WorkflowContext();
    ctx.set('tasksCompleted', []);
    ctx.set('tasksPending', ['task-001']);

    // Should not throw, should not modify anything
    await saveCheckpointHandler(ctx);

    expect(ctx.get('tasksCompleted')).toEqual([]);
    expect(ctx.get('tasksPending')).toEqual(['task-001']);
  });

  it('moves current task from pending to completed', async () => {
    const parent = new WorkflowContext();
    parent.set('tasksCompleted', []);
    parent.set('tasksPending', ['task-001', 'task-002', 'task-003']);

    const task: TaskDefinition = {
      id: 'task-002',
      title: 'Task 2',
      description: 'Desc',
      requirements: ['req'],
      dependencies: [],
      estimatedComplexity: 'low',
      filePaths: [],
    };
    const child = parent.withTask(task);
    // Copy task tracking into child
    child.set('tasksCompleted', [...(parent.get('tasksCompleted') as string[])]);
    child.set('tasksPending', [...(parent.get('tasksPending') as string[])]);

    await saveCheckpointHandler(child);

    expect(child.get('tasksCompleted')).toEqual(['task-002']);
    expect(child.get('tasksPending')).toEqual(['task-001', 'task-003']);
  });

  it('does not duplicate task in completed list if already present', async () => {
    const parent = new WorkflowContext();
    parent.set('tasksCompleted', ['task-001']);
    parent.set('tasksPending', []);

    const task: TaskDefinition = {
      id: 'task-001',
      title: 'Task 1',
      description: 'Desc',
      requirements: [],
      dependencies: [],
      estimatedComplexity: 'low',
      filePaths: [],
    };
    const child = parent.withTask(task);
    child.set('tasksCompleted', [...(parent.get('tasksCompleted') as string[])]);
    child.set('tasksPending', [...(parent.get('tasksPending') as string[])]);

    await saveCheckpointHandler(child);

    expect(child.get('tasksCompleted')).toEqual(['task-001']);
  });

  it('handles missing tasksCompleted and tasksPending gracefully', async () => {
    const parent = new WorkflowContext();
    // Deliberately NOT setting tasksCompleted or tasksPending

    const task: TaskDefinition = {
      id: 'task-001',
      title: 'Task 1',
      description: 'Desc',
      requirements: [],
      dependencies: [],
      estimatedComplexity: 'low',
      filePaths: [],
    };
    const child = parent.withTask(task);

    // Should not throw; uses ?? [] fallback
    await saveCheckpointHandler(child);

    expect(child.get('tasksCompleted')).toEqual(['task-001']);
    expect(child.get('tasksPending')).toEqual([]);
  });

  it('processes tasks sequentially through multiple checkpoint saves', async () => {
    const parent = new WorkflowContext();
    parent.set('tasksCompleted', []);
    parent.set('tasksPending', ['t1', 't2', 't3']);

    // Simulate completing t1
    const makeChildTask = (id: string): TaskDefinition => ({
      id,
      title: id,
      description: 'desc',
      requirements: [],
      dependencies: [],
      estimatedComplexity: 'low',
      filePaths: [],
    });

    // Complete t1
    const child1 = parent.withTask(makeChildTask('t1'));
    child1.set('tasksCompleted', [...(parent.get('tasksCompleted') as string[])]);
    child1.set('tasksPending', [...(parent.get('tasksPending') as string[])]);
    await saveCheckpointHandler(child1);
    expect(child1.get('tasksCompleted')).toEqual(['t1']);
    expect(child1.get('tasksPending')).toEqual(['t2', 't3']);

    // Propagate state back to parent for next iteration
    parent.set('tasksCompleted', child1.get('tasksCompleted'));
    parent.set('tasksPending', child1.get('tasksPending'));

    // Complete t2
    const child2 = parent.withTask(makeChildTask('t2'));
    child2.set('tasksCompleted', [...(parent.get('tasksCompleted') as string[])]);
    child2.set('tasksPending', [...(parent.get('tasksPending') as string[])]);
    await saveCheckpointHandler(child2);
    expect(child2.get('tasksCompleted')).toEqual(['t1', 't2']);
    expect(child2.get('tasksPending')).toEqual(['t3']);

    // Propagate state back to parent
    parent.set('tasksCompleted', child2.get('tasksCompleted'));
    parent.set('tasksPending', child2.get('tasksPending'));

    // Complete t3
    const child3 = parent.withTask(makeChildTask('t3'));
    child3.set('tasksCompleted', [...(parent.get('tasksCompleted') as string[])]);
    child3.set('tasksPending', [...(parent.get('tasksPending') as string[])]);
    await saveCheckpointHandler(child3);
    expect(child3.get('tasksCompleted')).toEqual(['t1', 't2', 't3']);
    expect(child3.get('tasksPending')).toEqual([]);
  });
});

// ================================================================
// createDefaultRegistry
// ================================================================

describe('createDefaultRegistry', () => {
  it('returns a HandlerRegistry instance', () => {
    const registry = createDefaultRegistry();
    expect(registry).toBeInstanceOf(HandlerRegistry);
  });

  it('has "create-issues" handler registered', () => {
    const registry = createDefaultRegistry();
    expect(registry.has('create-issues')).toBe(true);
  });

  it('has "save-checkpoint" handler registered', () => {
    const registry = createDefaultRegistry();
    expect(registry.has('save-checkpoint')).toBe(true);
  });

  it('lists both built-in handlers', () => {
    const registry = createDefaultRegistry();
    const names = registry.list();
    expect(names).toContain('create-issues');
    expect(names).toContain('save-checkpoint');
    expect(names).toHaveLength(2);
  });

  it('the create-issues handler is the actual createIssuesHandler function', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('create-issues')).toBe(createIssuesHandler);
  });

  it('the save-checkpoint handler is the actual saveCheckpointHandler function', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('save-checkpoint')).toBe(saveCheckpointHandler);
  });

  it('returned registry is functional (can execute handlers)', async () => {
    const registry = createDefaultRegistry();
    const ctx = new WorkflowContext();
    ctx.set('analysis', makeAnalysis([{ id: 'fn-test' }]));

    const handler = registry.get('create-issues');
    await handler(ctx);

    expect(ctx.get('taskIds')).toEqual(['fn-test']);
  });

  it('each call returns a new independent registry', () => {
    const reg1 = createDefaultRegistry();
    const reg2 = createDefaultRegistry();

    reg1.register('custom', async () => {});

    expect(reg1.has('custom')).toBe(true);
    expect(reg2.has('custom')).toBe(false);
  });
});
