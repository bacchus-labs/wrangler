/**
 * Tests for WorkflowContext - variable storage, expression evaluation,
 * template vars, checkpoint serialization, changed file tracking.
 */

import { WorkflowContext } from '../src/state.js';
import type { TaskDefinition } from '../src/schemas/index.js';

// --- Helper: build a minimal valid TaskDefinition ---

function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task-001',
    title: 'Implement auth module',
    description: 'Build the authentication system',
    requirements: ['Must support JWT', 'Must rate-limit'],
    dependencies: [],
    estimatedComplexity: 'medium',
    filePaths: ['src/auth.ts'],
    ...overrides,
  };
}

// ================================================================
// set() and get()
// ================================================================

describe('WorkflowContext - set() and get()', () => {
  it('stores and retrieves a string value', () => {
    const ctx = new WorkflowContext();
    ctx.set('name', 'workflow-1');
    expect(ctx.get('name')).toBe('workflow-1');
  });

  it('stores and retrieves a number value', () => {
    const ctx = new WorkflowContext();
    ctx.set('count', 42);
    expect(ctx.get('count')).toBe(42);
  });

  it('stores and retrieves an object value', () => {
    const ctx = new WorkflowContext();
    const obj = { tasks: [{ id: '1' }], total: 1 };
    ctx.set('analysis', obj);
    expect(ctx.get('analysis')).toEqual(obj);
  });

  it('stores and retrieves a boolean value', () => {
    const ctx = new WorkflowContext();
    ctx.set('done', true);
    expect(ctx.get('done')).toBe(true);
  });

  it('stores and retrieves null', () => {
    const ctx = new WorkflowContext();
    ctx.set('empty', null);
    expect(ctx.get('empty')).toBeNull();
  });

  it('stores and retrieves an array value', () => {
    const ctx = new WorkflowContext();
    ctx.set('items', [1, 2, 3]);
    expect(ctx.get('items')).toEqual([1, 2, 3]);
  });

  it('returns undefined for unset keys', () => {
    const ctx = new WorkflowContext();
    expect(ctx.get('nonexistent')).toBeUndefined();
  });

  it('overwrites existing values', () => {
    const ctx = new WorkflowContext();
    ctx.set('x', 1);
    ctx.set('x', 2);
    expect(ctx.get('x')).toBe(2);
  });

  it('initializes with provided variables', () => {
    const ctx = new WorkflowContext({ greeting: 'hello', count: 5 });
    expect(ctx.get('greeting')).toBe('hello');
    expect(ctx.get('count')).toBe(5);
  });

  it('does not share state with initial vars object (shallow copy)', () => {
    const initial = { a: 1 };
    const ctx = new WorkflowContext(initial);
    ctx.set('a', 99);
    expect(initial.a).toBe(1); // original unchanged
  });
});

// ================================================================
// resolve() - dot notation
// ================================================================

describe('WorkflowContext - resolve()', () => {
  it('resolves a top-level variable', () => {
    const ctx = new WorkflowContext({ name: 'test' });
    expect(ctx.resolve('name')).toBe('test');
  });

  it('resolves a nested property via dot notation', () => {
    const ctx = new WorkflowContext({
      analysis: { tasks: [{ id: '1' }, { id: '2' }] },
    });
    expect(ctx.resolve('analysis.tasks')).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('resolves deeply nested properties', () => {
    const ctx = new WorkflowContext({
      a: { b: { c: { d: 'deep' } } },
    });
    expect(ctx.resolve('a.b.c.d')).toBe('deep');
  });

  it('returns undefined for non-existent top-level path', () => {
    const ctx = new WorkflowContext();
    expect(ctx.resolve('missing')).toBeUndefined();
  });

  it('returns undefined for non-existent nested path', () => {
    const ctx = new WorkflowContext({ a: { b: 1 } });
    expect(ctx.resolve('a.b.c')).toBeUndefined();
  });

  it('returns undefined when an intermediate is null', () => {
    const ctx = new WorkflowContext({ a: null });
    expect(ctx.resolve('a.b')).toBeUndefined();
  });

  it('returns undefined when an intermediate is a primitive', () => {
    const ctx = new WorkflowContext({ a: 42 });
    expect(ctx.resolve('a.b')).toBeUndefined();
  });

  it('resolves task.title on a context with task set', () => {
    const ctx = new WorkflowContext();
    ctx.set('task', makeTask({ title: 'My Title' }));
    expect(ctx.resolve('task.title')).toBe('My Title');
  });

  it('resolves array element properties via full path', () => {
    const ctx = new WorkflowContext({
      analysis: { tasks: [{ id: 't1' }, { id: 't2' }] },
    });
    // resolveExpression walks parts, so "analysis.tasks.0.id" works
    // because arrays are objects with numeric keys
    expect(ctx.resolve('analysis.tasks.0.id')).toBe('t1');
    expect(ctx.resolve('analysis.tasks.1.id')).toBe('t2');
  });
});

// ================================================================
// evaluate() - condition expressions
// ================================================================

describe('WorkflowContext - evaluate()', () => {
  describe('truthy checks', () => {
    it('returns true for truthy string', () => {
      const ctx = new WorkflowContext({ flag: 'yes' });
      expect(ctx.evaluate('flag')).toBe(true);
    });

    it('returns false for empty string', () => {
      const ctx = new WorkflowContext({ flag: '' });
      expect(ctx.evaluate('flag')).toBe(false);
    });

    it('returns true for truthy number', () => {
      const ctx = new WorkflowContext({ count: 5 });
      expect(ctx.evaluate('count')).toBe(true);
    });

    it('returns false for zero', () => {
      const ctx = new WorkflowContext({ count: 0 });
      expect(ctx.evaluate('count')).toBe(false);
    });

    it('returns true for truthy object', () => {
      const ctx = new WorkflowContext({ obj: { key: 'val' } });
      expect(ctx.evaluate('obj')).toBe(true);
    });

    it('returns false for undefined variable', () => {
      const ctx = new WorkflowContext();
      expect(ctx.evaluate('nonexistent')).toBe(false);
    });

    it('returns false for null variable', () => {
      const ctx = new WorkflowContext({ val: null });
      expect(ctx.evaluate('val')).toBe(false);
    });

    it('returns true for true boolean', () => {
      const ctx = new WorkflowContext({ review: { hasActionableIssues: true } });
      expect(ctx.evaluate('review.hasActionableIssues')).toBe(true);
    });

    it('returns false for false boolean', () => {
      const ctx = new WorkflowContext({ review: { hasActionableIssues: false } });
      expect(ctx.evaluate('review.hasActionableIssues')).toBe(false);
    });

    it('returns true for non-empty array', () => {
      const ctx = new WorkflowContext({ items: [1, 2] });
      expect(ctx.evaluate('items')).toBe(true);
    });
  });

  describe('equality comparisons (== and !=)', () => {
    it('evaluates == with number literal', () => {
      const ctx = new WorkflowContext({ verification: { testSuite: { exitCode: 0 } } });
      expect(ctx.evaluate('verification.testSuite.exitCode == 0')).toBe(true);
    });

    it('evaluates != with number literal', () => {
      const ctx = new WorkflowContext({ verification: { testSuite: { exitCode: 1 } } });
      expect(ctx.evaluate('verification.testSuite.exitCode != 0')).toBe(true);
    });

    it('evaluates == false when values differ', () => {
      const ctx = new WorkflowContext({ status: 'failed' });
      expect(ctx.evaluate('status == "completed"')).toBe(false);
    });

    it('evaluates == true with string literal', () => {
      const ctx = new WorkflowContext({ status: 'completed' });
      expect(ctx.evaluate('status == "completed"')).toBe(true);
    });

    it('evaluates != true with string literal', () => {
      const ctx = new WorkflowContext({ status: 'failed' });
      expect(ctx.evaluate('status != "completed"')).toBe(true);
    });

    it('evaluates == with single-quoted string literal', () => {
      const ctx = new WorkflowContext({ mode: 'fast' });
      expect(ctx.evaluate("mode == 'fast'")).toBe(true);
    });
  });

  describe('strict equality (=== and !==)', () => {
    it('=== returns true for strict equality', () => {
      const ctx = new WorkflowContext({ val: 42 });
      expect(ctx.evaluate('val === 42')).toBe(true);
    });

    it('=== returns false for type mismatch', () => {
      const ctx = new WorkflowContext({ val: '42' });
      // "42" (string) !== 42 (number) with strict equality
      expect(ctx.evaluate('val === 42')).toBe(false);
    });

    it('!== returns true for type mismatch', () => {
      const ctx = new WorkflowContext({ val: '42' });
      expect(ctx.evaluate('val !== 42')).toBe(true);
    });

    it('!== returns false for strict equality', () => {
      const ctx = new WorkflowContext({ val: 42 });
      expect(ctx.evaluate('val !== 42')).toBe(false);
    });

    it('== coerces types (loose equality)', () => {
      const ctx = new WorkflowContext({ val: 0 });
      // 0 == false is true with loose equality
      expect(ctx.evaluate('val == false')).toBe(true);
    });

    it('!= with different types that are loosely equal', () => {
      const ctx = new WorkflowContext({ val: 1 });
      // 1 != true is false with loose equality (1 == true)
      expect(ctx.evaluate('val != true')).toBe(false);
    });
  });

  describe('numeric comparisons (>, <, >=, <=)', () => {
    it('evaluates > correctly', () => {
      const ctx = new WorkflowContext({ score: 85 });
      expect(ctx.evaluate('score > 80')).toBe(true);
      expect(ctx.evaluate('score > 85')).toBe(false);
      expect(ctx.evaluate('score > 90')).toBe(false);
    });

    it('evaluates < correctly', () => {
      const ctx = new WorkflowContext({ score: 30 });
      expect(ctx.evaluate('score < 50')).toBe(true);
      expect(ctx.evaluate('score < 30')).toBe(false);
    });

    it('evaluates >= correctly', () => {
      const ctx = new WorkflowContext({ score: 80 });
      expect(ctx.evaluate('score >= 80')).toBe(true);
      expect(ctx.evaluate('score >= 81')).toBe(false);
    });

    it('evaluates <= correctly', () => {
      const ctx = new WorkflowContext({ score: 80 });
      expect(ctx.evaluate('score <= 80')).toBe(true);
      expect(ctx.evaluate('score <= 79')).toBe(false);
    });

    it('compares two expressions', () => {
      const ctx = new WorkflowContext({ a: 10, b: 20 });
      expect(ctx.evaluate('a < b')).toBe(true);
      expect(ctx.evaluate('b > a')).toBe(true);
    });
  });

  describe('literal resolution in comparisons', () => {
    it('resolves boolean literal true', () => {
      const ctx = new WorkflowContext({ flag: true });
      expect(ctx.evaluate('flag == true')).toBe(true);
    });

    it('resolves boolean literal false', () => {
      const ctx = new WorkflowContext({ flag: false });
      expect(ctx.evaluate('flag == false')).toBe(true);
    });

    it('resolves null literal', () => {
      const ctx = new WorkflowContext({ val: null });
      expect(ctx.evaluate('val == null')).toBe(true);
    });

    it('resolves undefined literal', () => {
      const ctx = new WorkflowContext();
      expect(ctx.evaluate('missing == undefined')).toBe(true);
    });

    it('resolves negative number literal', () => {
      const ctx = new WorkflowContext({ temp: -5 });
      expect(ctx.evaluate('temp == -5')).toBe(true);
    });

    it('resolves float number literal', () => {
      const ctx = new WorkflowContext({ ratio: 3.14 });
      expect(ctx.evaluate('ratio == 3.14')).toBe(true);
    });
  });
});

// ================================================================
// withTask() - child context creation
// ================================================================

describe('WorkflowContext - withTask()', () => {
  it('creates child with task variable set', () => {
    const parent = new WorkflowContext({ specId: 'spec-1' });
    const task = makeTask();
    const child = parent.withTask(task);

    expect(child.get('task')).toEqual(task);
  });

  it('child inherits parent variables', () => {
    const parent = new WorkflowContext({ specId: 'spec-1', mode: 'auto' });
    const child = parent.withTask(makeTask());

    expect(child.get('specId')).toBe('spec-1');
    expect(child.get('mode')).toBe('auto');
  });

  it('child modifications do not affect parent variables', () => {
    const parent = new WorkflowContext({ specId: 'spec-1' });
    const child = parent.withTask(makeTask());
    child.set('newVar', 'childOnly');

    expect(parent.get('newVar')).toBeUndefined();
  });

  it('child inherits completed phases', () => {
    const parent = new WorkflowContext();
    parent.markPhaseCompleted('analyze');
    const child = parent.withTask(makeTask());

    expect(child.getCompletedPhases()).toContain('analyze');
  });

  it('child inherits changed files', () => {
    const parent = new WorkflowContext();
    parent.addChangedFile('src/foo.ts');
    const child = parent.withTask(makeTask());

    expect(child.getChangedFiles()).toContain('src/foo.ts');
  });

  it('sets currentTaskId on the child', () => {
    const parent = new WorkflowContext();
    const task = makeTask({ id: 'task-007' });
    const child = parent.withTask(task);

    expect(child.getCurrentTaskId()).toBe('task-007');
  });

  it('parent currentTaskId remains null', () => {
    const parent = new WorkflowContext();
    parent.withTask(makeTask());

    expect(parent.getCurrentTaskId()).toBeNull();
  });

  it('child changed files list is independent from parent', () => {
    const parent = new WorkflowContext();
    parent.addChangedFile('src/a.ts');
    const child = parent.withTask(makeTask());
    child.addChangedFile('src/b.ts');

    expect(parent.getChangedFiles()).toEqual(['src/a.ts']);
    expect(child.getChangedFiles()).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('child completed phases list is independent from parent', () => {
    const parent = new WorkflowContext();
    parent.markPhaseCompleted('plan');
    const child = parent.withTask(makeTask());
    child.markPhaseCompleted('implement');

    expect(parent.getCompletedPhases()).toEqual(['plan']);
    expect(child.getCompletedPhases()).toEqual(['plan', 'implement']);
  });
});

// ================================================================
// mergeTaskResults()
// ================================================================

describe('WorkflowContext - mergeTaskResults()', () => {
  it('merges new variables from child into parent', () => {
    const parent = new WorkflowContext({ specId: 'spec-1' });
    const child = parent.withTask(makeTask());
    child.set('implResult', { status: 'success' });

    parent.mergeTaskResults(child);
    expect(parent.get('implResult')).toEqual({ status: 'success' });
  });

  it('does not overwrite existing parent variables', () => {
    const parent = new WorkflowContext({ specId: 'spec-1' });
    const child = parent.withTask(makeTask());
    child.set('specId', 'overridden');

    parent.mergeTaskResults(child);
    expect(parent.get('specId')).toBe('spec-1');
  });

  it('does not merge the "task" variable from child', () => {
    const parent = new WorkflowContext();
    const child = parent.withTask(makeTask());

    parent.mergeTaskResults(child);
    expect(parent.get('task')).toBeUndefined();
  });

  it('merges changed files (deduplicated)', () => {
    const parent = new WorkflowContext();
    parent.addChangedFile('src/a.ts');
    const child = parent.withTask(makeTask());
    child.addChangedFile('src/a.ts'); // duplicate
    child.addChangedFile('src/b.ts'); // new

    parent.mergeTaskResults(child);
    const files = parent.getChangedFiles();
    expect(files).toContain('src/a.ts');
    expect(files).toContain('src/b.ts');
    // No duplicates
    expect(files.filter(f => f === 'src/a.ts')).toHaveLength(1);
  });

  it('merges completed phases (deduplicated)', () => {
    const parent = new WorkflowContext();
    parent.markPhaseCompleted('plan');
    const child = parent.withTask(makeTask());
    child.markPhaseCompleted('plan'); // duplicate
    child.markPhaseCompleted('implement'); // new

    parent.mergeTaskResults(child);
    const phases = parent.getCompletedPhases();
    expect(phases).toContain('plan');
    expect(phases).toContain('implement');
    expect(phases.filter(p => p === 'plan')).toHaveLength(1);
  });

  it('merges multiple children sequentially', () => {
    const parent = new WorkflowContext();

    const child1 = parent.withTask(makeTask({ id: 'task-001' }));
    child1.set('result1', 'done');
    child1.addChangedFile('src/a.ts');
    parent.mergeTaskResults(child1);

    const child2 = parent.withTask(makeTask({ id: 'task-002' }));
    child2.set('result2', 'done');
    child2.addChangedFile('src/b.ts');
    parent.mergeTaskResults(child2);

    expect(parent.get('result1')).toBe('done');
    expect(parent.get('result2')).toBe('done');
    expect(parent.getChangedFiles()).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

// ================================================================
// changedFilesMatch() - glob pattern matching
// ================================================================

describe('WorkflowContext - changedFilesMatch()', () => {
  it('returns false when no changed files', () => {
    const ctx = new WorkflowContext();
    expect(ctx.changedFilesMatch(['*.ts'])).toBe(false);
  });

  it('matches exact file name', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    expect(ctx.changedFilesMatch(['src/auth.ts'])).toBe(true);
  });

  it('matches single-star glob within a directory', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    expect(ctx.changedFilesMatch(['src/*.ts'])).toBe(true);
  });

  it('does not match single-star glob across directories', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/deep/auth.ts');
    // Single * should not cross directory boundaries
    expect(ctx.changedFilesMatch(['src/*.ts'])).toBe(false);
  });

  it('matches double-star glob across directories', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/deep/nested/auth.ts');
    expect(ctx.changedFilesMatch(['src/**/*.ts'])).toBe(true);
  });

  it('matches double-star at the beginning', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/components/Button.tsx');
    expect(ctx.changedFilesMatch(['**/*.tsx'])).toBe(true);
  });

  it('returns true if any file matches any pattern', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    ctx.addChangedFile('tests/auth.test.ts');
    expect(ctx.changedFilesMatch(['tests/*.test.ts'])).toBe(true);
  });

  it('returns false when no file matches any pattern', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    expect(ctx.changedFilesMatch(['*.md', '*.json'])).toBe(false);
  });

  it('handles dots in file names correctly', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('config.json');
    // The dot in the pattern is escaped to literal dot
    expect(ctx.changedFilesMatch(['config.json'])).toBe(true);
    // Should not match configXjson
    expect(ctx.changedFilesMatch(['configXjson'])).toBe(false);
  });

  it('matches multiple patterns', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('README.md');
    expect(ctx.changedFilesMatch(['*.ts', '*.md'])).toBe(true);
  });
});

// ================================================================
// addChangedFile() and addChangedFilesFromResult()
// ================================================================

describe('WorkflowContext - addChangedFile()', () => {
  it('adds a file to the changed files list', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    expect(ctx.getChangedFiles()).toEqual(['src/auth.ts']);
  });

  it('does not add duplicate files', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    ctx.addChangedFile('src/auth.ts');
    expect(ctx.getChangedFiles()).toEqual(['src/auth.ts']);
  });

  it('adds multiple unique files', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/a.ts');
    ctx.addChangedFile('src/b.ts');
    expect(ctx.getChangedFiles()).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

describe('WorkflowContext - addChangedFilesFromResult()', () => {
  it('adds files from a result with filesChanged', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFilesFromResult({
      filesChanged: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
    });
    expect(ctx.getChangedFiles()).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('handles result with no filesChanged property', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFilesFromResult({});
    expect(ctx.getChangedFiles()).toEqual([]);
  });

  it('handles result with empty filesChanged array', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFilesFromResult({ filesChanged: [] });
    expect(ctx.getChangedFiles()).toEqual([]);
  });

  it('deduplicates with existing changed files', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/a.ts');
    ctx.addChangedFilesFromResult({
      filesChanged: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
    });
    expect(ctx.getChangedFiles()).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

// ================================================================
// markPhaseCompleted() and getCompletedPhases()
// ================================================================

describe('WorkflowContext - markPhaseCompleted() and getCompletedPhases()', () => {
  it('starts with no completed phases', () => {
    const ctx = new WorkflowContext();
    expect(ctx.getCompletedPhases()).toEqual([]);
  });

  it('marks a phase as completed', () => {
    const ctx = new WorkflowContext();
    ctx.markPhaseCompleted('analyze');
    expect(ctx.getCompletedPhases()).toContain('analyze');
  });

  it('does not duplicate completed phases', () => {
    const ctx = new WorkflowContext();
    ctx.markPhaseCompleted('analyze');
    ctx.markPhaseCompleted('analyze');
    expect(ctx.getCompletedPhases()).toEqual(['analyze']);
  });

  it('tracks multiple phases in order', () => {
    const ctx = new WorkflowContext();
    ctx.markPhaseCompleted('analyze');
    ctx.markPhaseCompleted('implement');
    ctx.markPhaseCompleted('verify');
    expect(ctx.getCompletedPhases()).toEqual(['analyze', 'implement', 'verify']);
  });

  it('returns a copy of the phases array', () => {
    const ctx = new WorkflowContext();
    ctx.markPhaseCompleted('analyze');
    const phases = ctx.getCompletedPhases();
    phases.push('hacked');
    expect(ctx.getCompletedPhases()).toEqual(['analyze']);
  });
});

// ================================================================
// getTemplateVars()
// ================================================================

describe('WorkflowContext - getTemplateVars()', () => {
  it('returns all variables as a plain object', () => {
    const ctx = new WorkflowContext({ a: 1, b: 'two' });
    ctx.set('c', [3]);
    const vars = ctx.getTemplateVars();
    expect(vars).toEqual({ a: 1, b: 'two', c: [3], changedFiles: [] });
  });

  it('returns a copy, not the internal reference', () => {
    const ctx = new WorkflowContext({ a: 1 });
    const vars = ctx.getTemplateVars();
    vars.a = 999;
    expect(ctx.get('a')).toBe(1);
  });

  it('returns empty object for fresh context', () => {
    const ctx = new WorkflowContext();
    expect(ctx.getTemplateVars()).toEqual({ changedFiles: [] });
  });
});

// ================================================================
// toCheckpoint() and fromCheckpoint()
// ================================================================

describe('WorkflowContext - toCheckpoint() and fromCheckpoint()', () => {
  it('round-trips a simple context', () => {
    const ctx = new WorkflowContext({ specId: 'spec-1', count: 3 });
    const checkpoint = ctx.toCheckpoint();
    const restored = WorkflowContext.fromCheckpoint(checkpoint);

    expect(restored.get('specId')).toBe('spec-1');
    expect(restored.get('count')).toBe(3);
  });

  it('round-trips completed phases', () => {
    const ctx = new WorkflowContext();
    ctx.markPhaseCompleted('analyze');
    ctx.markPhaseCompleted('implement');

    const restored = WorkflowContext.fromCheckpoint(ctx.toCheckpoint());
    expect(restored.getCompletedPhases()).toEqual(['analyze', 'implement']);
  });

  it('round-trips currentTaskId', () => {
    const ctx = new WorkflowContext();
    const child = ctx.withTask(makeTask({ id: 'task-42' }));

    const restored = WorkflowContext.fromCheckpoint(child.toCheckpoint());
    expect(restored.getCurrentTaskId()).toBe('task-42');
  });

  it('round-trips changed files', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/a.ts');
    ctx.addChangedFile('src/b.ts');

    const restored = WorkflowContext.fromCheckpoint(ctx.toCheckpoint());
    expect(restored.getChangedFiles()).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('checkpoint contains all expected keys', () => {
    const ctx = new WorkflowContext({ x: 1 });
    ctx.markPhaseCompleted('plan');
    ctx.addChangedFile('foo.ts');
    ctx.setCurrentPhase('execute');
    const cp = ctx.toCheckpoint();

    expect(cp).toHaveProperty('variables');
    expect(cp).toHaveProperty('completedPhases');
    expect(cp).toHaveProperty('currentTaskId');
    expect(cp).toHaveProperty('changedFiles');
    expect(cp).toHaveProperty('currentPhase');
  });

  it('restores from empty checkpoint data gracefully', () => {
    const restored = WorkflowContext.fromCheckpoint({});
    expect(restored.getTemplateVars()).toEqual({ changedFiles: [] });
    expect(restored.getCompletedPhases()).toEqual([]);
    expect(restored.getCurrentTaskId()).toBeNull();
    expect(restored.getChangedFiles()).toEqual([]);
  });

  it('preserves complex nested objects through round-trip', () => {
    const ctx = new WorkflowContext({
      analysis: {
        tasks: [
          { id: 't1', title: 'Task 1', nested: { deep: true } },
        ],
        metadata: { version: 2 },
      },
    });

    const restored = WorkflowContext.fromCheckpoint(ctx.toCheckpoint());
    expect(restored.resolve('analysis.tasks.0.nested.deep')).toBe(true);
    expect(restored.resolve('analysis.metadata.version')).toBe(2);
  });
});

// ================================================================
// getResult()
// ================================================================

describe('WorkflowContext - getResult()', () => {
  it('returns completed status', () => {
    const ctx = new WorkflowContext();
    const result = ctx.getResult();
    expect(result.status).toBe('completed');
  });

  it('includes all variables as outputs', () => {
    const ctx = new WorkflowContext({ a: 1, b: 'two' });
    const result = ctx.getResult();
    expect(result.outputs).toEqual({ a: 1, b: 'two' });
  });

  it('includes completed phases', () => {
    const ctx = new WorkflowContext();
    ctx.markPhaseCompleted('analyze');
    ctx.markPhaseCompleted('verify');
    const result = ctx.getResult();
    expect(result.completedPhases).toEqual(['analyze', 'verify']);
  });

  it('returns copies of outputs and phases', () => {
    const ctx = new WorkflowContext({ x: 1 });
    ctx.markPhaseCompleted('plan');
    const result = ctx.getResult();
    result.outputs.x = 999;
    result.completedPhases.push('hacked');

    expect(ctx.get('x')).toBe(1);
    expect(ctx.getCompletedPhases()).toEqual(['plan']);
  });

  it('includes changed files', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/foo.ts');
    ctx.addChangedFile('src/bar.ts');
    const result = ctx.getResult();
    expect(result.changedFiles).toEqual(['src/foo.ts', 'src/bar.ts']);
  });

  it('returns empty changed files by default', () => {
    const ctx = new WorkflowContext();
    const result = ctx.getResult();
    expect(result.changedFiles).toEqual([]);
  });

  it('does not include error or blockerDetails by default', () => {
    const ctx = new WorkflowContext();
    const result = ctx.getResult();
    expect(result.error).toBeUndefined();
    expect(result.blockerDetails).toBeUndefined();
  });
});

// ================================================================
// getCurrentTaskId()
// ================================================================

describe('WorkflowContext - getCurrentTaskId()', () => {
  it('returns null for a fresh context', () => {
    const ctx = new WorkflowContext();
    expect(ctx.getCurrentTaskId()).toBeNull();
  });

  it('returns the task ID in a child context', () => {
    const parent = new WorkflowContext();
    const child = parent.withTask(makeTask({ id: 'task-abc' }));
    expect(child.getCurrentTaskId()).toBe('task-abc');
  });
});

// ================================================================
// setCurrentPhase() and getCurrentPhase()
// ================================================================

describe('WorkflowContext - setCurrentPhase() and getCurrentPhase()', () => {
  it('returns null for a fresh context', () => {
    const ctx = new WorkflowContext();
    expect(ctx.getCurrentPhase()).toBeNull();
  });

  it('sets and gets the current phase', () => {
    const ctx = new WorkflowContext();
    ctx.setCurrentPhase('execute');
    expect(ctx.getCurrentPhase()).toBe('execute');
  });

  it('overwrites previous phase', () => {
    const ctx = new WorkflowContext();
    ctx.setCurrentPhase('analyze');
    ctx.setCurrentPhase('execute');
    expect(ctx.getCurrentPhase()).toBe('execute');
  });

  it('is propagated to child task context', () => {
    const parent = new WorkflowContext();
    parent.setCurrentPhase('execute');
    const child = parent.withTask(makeTask());
    expect(child.getCurrentPhase()).toBe('execute');
  });

  it('round-trips through checkpoint', () => {
    const ctx = new WorkflowContext();
    ctx.setCurrentPhase('verify');
    const restored = WorkflowContext.fromCheckpoint(ctx.toCheckpoint());
    expect(restored.getCurrentPhase()).toBe('verify');
  });

  it('restores as null from empty checkpoint', () => {
    const restored = WorkflowContext.fromCheckpoint({});
    expect(restored.getCurrentPhase()).toBeNull();
  });
});

// ================================================================
// getChangedFiles() returns a copy
// ================================================================

describe('WorkflowContext - getChangedFiles() immutability', () => {
  it('returns a copy of the changed files array', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/a.ts');
    const files = ctx.getChangedFiles();
    files.push('hacked.ts');
    expect(ctx.getChangedFiles()).toEqual(['src/a.ts']);
  });
});

// ================================================================
// Per-task context isolation (unit-level)
// ================================================================

describe('WorkflowContext - per-task context isolation', () => {
  it('child context mutations do not affect sibling child contexts', () => {
    const parent = new WorkflowContext({ shared: 'value' });

    const taskA = makeTask({ id: 'task-a', title: 'A' });
    const taskB = makeTask({ id: 'task-b', title: 'B' });

    const childA = parent.withTask(taskA);
    childA.set('secretA', 'only-for-a');

    const childB = parent.withTask(taskB);

    // childB should NOT see secretA (it was created before mergeTaskResults)
    expect(childB.get('secretA')).toBeUndefined();
  });

  it('child sees parent variables but parent does not see child-only variables before merge', () => {
    const parent = new WorkflowContext({ parentVar: 'visible' });
    const child = parent.withTask(makeTask());
    child.set('childOnly', 'hidden-from-parent');

    expect(child.get('parentVar')).toBe('visible');
    expect(parent.get('childOnly')).toBeUndefined();
  });

  it('mergeTaskResults propagates new child variables to parent', () => {
    const parent = new WorkflowContext({ existing: 'keep' });
    const child = parent.withTask(makeTask());
    child.set('newOutput', 'from-child');

    parent.mergeTaskResults(child);

    expect(parent.get('newOutput')).toBe('from-child');
    expect(parent.get('existing')).toBe('keep');
  });

  it('mergeTaskResults does not overwrite existing parent variables', () => {
    const parent = new WorkflowContext({ shared: 'parent-version' });
    const child = parent.withTask(makeTask());
    child.set('shared', 'child-version');

    parent.mergeTaskResults(child);

    // Parent's value should be preserved
    expect(parent.get('shared')).toBe('parent-version');
  });

  it('after mergeTaskResults, next child context sees merged variables', () => {
    const parent = new WorkflowContext();

    const childA = parent.withTask(makeTask({ id: 'a' }));
    childA.set('resultA', 'done');
    parent.mergeTaskResults(childA);

    const childB = parent.withTask(makeTask({ id: 'b' }));
    // childB inherits from parent which now has resultA
    expect(childB.get('resultA')).toBe('done');
  });

  it('task variable is unique per child context', () => {
    const parent = new WorkflowContext();
    const taskA = makeTask({ id: 'a', title: 'Alpha' });
    const taskB = makeTask({ id: 'b', title: 'Beta' });

    const childA = parent.withTask(taskA);
    const childB = parent.withTask(taskB);

    expect((childA.get('task') as TaskDefinition).title).toBe('Alpha');
    expect((childB.get('task') as TaskDefinition).title).toBe('Beta');
  });
});

// ================================================================
// evaluate() - boolean operators and falsy-on-missing
// ================================================================

import { validateCondition } from '../src/state.js';

describe('WorkflowContext - evaluate() boolean operators', () => {
  // --- OR operator ---
  it('evaluates OR: true || false -> true', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: true });
    ctx.set('b', { y: false });
    expect(ctx.evaluate('a.x || b.y')).toBe(true);
  });

  it('evaluates OR: false || true -> true', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: false });
    ctx.set('b', { y: true });
    expect(ctx.evaluate('a.x || b.y')).toBe(true);
  });

  it('evaluates OR: false || false -> false', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: false });
    ctx.set('b', { y: false });
    expect(ctx.evaluate('a.x || b.y')).toBe(false);
  });

  it('evaluates OR: true || true -> true', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: true });
    ctx.set('b', { y: true });
    expect(ctx.evaluate('a.x || b.y')).toBe(true);
  });

  // --- AND operator ---
  it('evaluates AND: true && true -> true', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: true });
    ctx.set('b', { y: true });
    expect(ctx.evaluate('a.x && b.y')).toBe(true);
  });

  it('evaluates AND: true && false -> false', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: true });
    ctx.set('b', { y: false });
    expect(ctx.evaluate('a.x && b.y')).toBe(false);
  });

  it('evaluates AND: false && true -> false', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: false });
    ctx.set('b', { y: true });
    expect(ctx.evaluate('a.x && b.y')).toBe(false);
  });

  // --- NOT operator ---
  it('evaluates NOT: !review.allPassed when allPassed=true -> false', () => {
    const ctx = new WorkflowContext();
    ctx.set('review', { allPassed: true });
    expect(ctx.evaluate('!review.allPassed')).toBe(false);
  });

  it('evaluates NOT: !review.allPassed when allPassed=false -> true', () => {
    const ctx = new WorkflowContext();
    ctx.set('review', { allPassed: false });
    expect(ctx.evaluate('!review.allPassed')).toBe(true);
  });

  // --- Precedence: ! > && > || ---
  it('evaluates precedence: a || b && c  (AND binds tighter)', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', false);
    ctx.set('b', true);
    ctx.set('c', false);
    // false || (true && false) -> false
    expect(ctx.evaluate('a || b && c')).toBe(false);
  });

  it('evaluates precedence: a || b && c (second case)', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', true);
    ctx.set('b', false);
    ctx.set('c', false);
    // true || (false && false) -> true
    expect(ctx.evaluate('a || b && c')).toBe(true);
  });

  // --- Combined with parentheses ---
  it('evaluates parenthesized: (a || b) && c', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: true });
    ctx.set('b', { y: false });
    ctx.set('c', { z: true });
    expect(ctx.evaluate('(a.x || b.y) && c.z')).toBe(true);
  });

  it('evaluates parenthesized: a.x && (b.y || c.z)', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { x: true });
    ctx.set('b', { y: false });
    ctx.set('c', { z: true });
    expect(ctx.evaluate('a.x && (b.y || c.z)')).toBe(true);
  });

  it('evaluates nested parentheses: (a && (b || c))', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', true);
    ctx.set('b', false);
    ctx.set('c', true);
    expect(ctx.evaluate('(a && (b || c))')).toBe(true);
  });

  // --- Comparison with OR ---
  it('evaluates comparison with OR: count > 0 || hasIssues', () => {
    const ctx = new WorkflowContext();
    ctx.set('count', 5);
    ctx.set('hasIssues', false);
    expect(ctx.evaluate('count > 0 || hasIssues')).toBe(true);
  });

  it('evaluates comparison with OR: count > 0 || hasIssues (both false)', () => {
    const ctx = new WorkflowContext();
    ctx.set('count', 0);
    ctx.set('hasIssues', false);
    expect(ctx.evaluate('count > 0 || hasIssues')).toBe(false);
  });

  // --- NOT with comparison ---
  it('evaluates NOT with comparison: !status == "failed" treated as (!status) == "failed"', () => {
    const ctx = new WorkflowContext();
    ctx.set('review', { allPassed: true });
    ctx.set('count', 5);
    // !review.allPassed && count > 3 -> false && true -> false
    expect(ctx.evaluate('!review.allPassed && count > 3')).toBe(false);
  });

  // --- Multiple OR clauses ---
  it('evaluates triple OR: a || b || c', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', false);
    ctx.set('b', false);
    ctx.set('c', true);
    expect(ctx.evaluate('a || b || c')).toBe(true);
  });

  // --- Multiple AND clauses ---
  it('evaluates triple AND: a && b && c', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', true);
    ctx.set('b', true);
    ctx.set('c', true);
    expect(ctx.evaluate('a && b && c')).toBe(true);
  });

  it('evaluates triple AND with one false: a && b && c', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', true);
    ctx.set('b', false);
    ctx.set('c', true);
    expect(ctx.evaluate('a && b && c')).toBe(false);
  });
});

describe('WorkflowContext - evaluate() falsy-on-missing', () => {
  it('returns false for completely undefined variable', () => {
    const ctx = new WorkflowContext();
    expect(ctx.evaluate('undefinedVar.prop')).toBe(false);
  });

  it('returns false for deeply nested missing property', () => {
    const ctx = new WorkflowContext();
    ctx.set('a', { b: undefined });
    expect(ctx.evaluate('a.b.c.d.e')).toBe(false);
  });

  it('returns false for null.anything', () => {
    const ctx = new WorkflowContext();
    ctx.set('obj', null);
    expect(ctx.evaluate('obj.anything')).toBe(false);
  });

  it('returns false for missing in OR (both missing)', () => {
    const ctx = new WorkflowContext();
    expect(ctx.evaluate('missing1.prop || missing2.prop')).toBe(false);
  });

  it('returns true for missing OR true', () => {
    const ctx = new WorkflowContext();
    ctx.set('exists', { val: true });
    expect(ctx.evaluate('missing.prop || exists.val')).toBe(true);
  });

  it('returns false for missing in comparison (does not throw)', () => {
    const ctx = new WorkflowContext();
    expect(ctx.evaluate('missing.count > 0')).toBe(false);
  });

  it('returns false for missing AND existing', () => {
    const ctx = new WorkflowContext();
    ctx.set('exists', { val: true });
    expect(ctx.evaluate('missing.prop && exists.val')).toBe(false);
  });

  it('negation of missing returns true', () => {
    const ctx = new WorkflowContext();
    expect(ctx.evaluate('!missing.prop')).toBe(true);
  });
});

describe('validateCondition()', () => {
  it('returns no errors for a valid simple expression', () => {
    expect(validateCondition('review.hasIssues')).toEqual([]);
  });

  it('returns no errors for valid boolean expression', () => {
    expect(validateCondition('a.x || b.y && !c.z')).toEqual([]);
  });

  it('returns no errors for valid comparison', () => {
    expect(validateCondition('count > 0')).toEqual([]);
  });

  it('returns no errors for parenthesized expression', () => {
    expect(validateCondition('(a || b) && c')).toEqual([]);
  });

  it('returns error for unbalanced open paren', () => {
    const errors = validateCondition('(a || b');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/paren/i);
  });

  it('returns error for unbalanced close paren', () => {
    const errors = validateCondition('a || b)');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/paren/i);
  });

  it('returns error for empty expression', () => {
    const errors = validateCondition('');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for empty operand in OR', () => {
    const errors = validateCondition('a ||');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/empty/i);
  });

  it('returns error for empty operand in AND', () => {
    const errors = validateCondition('&& b');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/empty/i);
  });

  it('returns no errors for NOT operator', () => {
    expect(validateCondition('!review.allPassed')).toEqual([]);
  });

  it('returns error for double NOT without operand', () => {
    const errors = validateCondition('!!');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ================================================================
// setSessionContext()
// ================================================================

describe('WorkflowContext - setSessionContext()', () => {
  it('populates spec object with title, id, and content', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({
      spec: { id: 'SPEC-047', title: 'Template Layering', content: '## Overview\nLayering support' },
      worktreePath: '/tmp/worktree',
      sessionId: 'session-abc',
      branchName: 'feature/layering',
    });
    const spec = ctx.get('spec') as Record<string, string>;
    expect(spec.id).toBe('SPEC-047');
    expect(spec.title).toBe('Template Layering');
    expect(spec.content).toBe('## Overview\nLayering support');
  });

  it('populates worktreePath as a string', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({ worktreePath: '/home/user/worktrees/feat' });
    expect(ctx.get('worktreePath')).toBe('/home/user/worktrees/feat');
  });

  it('populates sessionId as a string', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({ sessionId: 'sess-123' });
    expect(ctx.get('sessionId')).toBe('sess-123');
  });

  it('populates branchName as a string', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({ branchName: 'main' });
    expect(ctx.get('branchName')).toBe('main');
  });

  it('all session context variables appear in getTemplateVars()', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({
      spec: { id: 'S1', title: 'My Spec', content: 'body' },
      worktreePath: '/tmp/wt',
      sessionId: 'sess-x',
      branchName: 'dev',
    });
    const vars = ctx.getTemplateVars();
    expect(vars.spec).toEqual({ id: 'S1', title: 'My Spec', content: 'body' });
    expect(vars.worktreePath).toBe('/tmp/wt');
    expect(vars.sessionId).toBe('sess-x');
    expect(vars.branchName).toBe('dev');
  });

  it('partial session context only sets provided fields', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({ sessionId: 'partial' });
    expect(ctx.get('sessionId')).toBe('partial');
    expect(ctx.get('worktreePath')).toBeUndefined();
    expect(ctx.get('spec')).toBeUndefined();
    expect(ctx.get('branchName')).toBeUndefined();
  });

  it('session context variables are accessible via resolve() dot notation', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({
      spec: { id: 'SPEC-001', title: 'Test', content: 'content here' },
    });
    expect(ctx.resolve('spec.title')).toBe('Test');
    expect(ctx.resolve('spec.id')).toBe('SPEC-001');
    expect(ctx.resolve('spec.content')).toBe('content here');
  });

  it('session context survives checkpoint round-trip', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({
      spec: { id: 'S2', title: 'Checkpoint Spec', content: 'body' },
      worktreePath: '/wt',
      sessionId: 'sess-cp',
      branchName: 'cp-branch',
    });
    const restored = WorkflowContext.fromCheckpoint(ctx.toCheckpoint());
    expect(restored.get('spec')).toEqual({ id: 'S2', title: 'Checkpoint Spec', content: 'body' });
    expect(restored.get('worktreePath')).toBe('/wt');
    expect(restored.get('sessionId')).toBe('sess-cp');
    expect(restored.get('branchName')).toBe('cp-branch');
  });
});

// ================================================================
// Per-task context: taskIndex and taskCount
// ================================================================

describe('WorkflowContext - withTask() taskIndex and taskCount', () => {
  it('withTask sets task, taskIndex, and taskCount on child context', () => {
    const ctx = new WorkflowContext();
    const tasks = [
      makeTask({ id: 't1', title: 'First' }),
      makeTask({ id: 't2', title: 'Second' }),
      makeTask({ id: 't3', title: 'Third' }),
    ];
    const child = ctx.withTask(tasks[1], 1, tasks.length);
    expect(child.get('task')).toEqual(tasks[1]);
    expect(child.get('taskIndex')).toBe(1);
    expect(child.get('taskCount')).toBe(3);
  });

  it('taskIndex and taskCount appear in getTemplateVars()', () => {
    const ctx = new WorkflowContext();
    const task = makeTask({ id: 't1', title: 'Only Task' });
    const child = ctx.withTask(task, 0, 1);
    const vars = child.getTemplateVars();
    expect(vars.taskIndex).toBe(0);
    expect(vars.taskCount).toBe(1);
    expect(vars.task).toEqual(task);
  });

  it('taskIndex and taskCount are accessible via resolve()', () => {
    const ctx = new WorkflowContext();
    const task = makeTask({ id: 't2', title: 'Task Two' });
    const child = ctx.withTask(task, 1, 5);
    expect(child.resolve('taskIndex')).toBe(1);
    expect(child.resolve('taskCount')).toBe(5);
    expect(child.resolve('task.title')).toBe('Task Two');
  });
});

// ================================================================
// changedFiles as template variable
// ================================================================

describe('WorkflowContext - changedFiles in template vars', () => {
  it('changedFiles appears in getTemplateVars()', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/auth.ts');
    ctx.addChangedFile('src/utils.ts');
    const vars = ctx.getTemplateVars();
    expect(vars.changedFiles).toEqual(['src/auth.ts', 'src/utils.ts']);
  });

  it('setChangedFiles replaces the current changed files list', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('old-file.ts');
    ctx.setChangedFiles(['new-a.ts', 'new-b.ts']);
    expect(ctx.getChangedFiles()).toEqual(['new-a.ts', 'new-b.ts']);
    expect(ctx.getTemplateVars().changedFiles).toEqual(['new-a.ts', 'new-b.ts']);
  });

  it('empty changedFiles is an empty array in template vars', () => {
    const ctx = new WorkflowContext();
    const vars = ctx.getTemplateVars();
    expect(vars.changedFiles).toEqual([]);
  });
});

// ================================================================
// Template rendering with built-in context variables
// ================================================================

describe('WorkflowContext - template rendering integration', () => {
  // These tests verify that the built-in context variables work
  // with the renderTemplate function from loader.ts
  let renderTemplate: (template: string, vars: Record<string, unknown>) => string;

  beforeAll(async () => {
    const loader = await import('../src/loader.js');
    renderTemplate = loader.renderTemplate;
  });

  it('renders {{spec.title}} from session context', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({
      spec: { id: 'SPEC-047', title: 'Template Layering', content: 'body' },
    });
    const result = renderTemplate('Working on: {{spec.title}}', ctx.getTemplateVars());
    expect(result).toBe('Working on: Template Layering');
  });

  it('renders {{worktreePath}} from session context', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({ worktreePath: '/tmp/my-worktree' });
    const result = renderTemplate('Path: {{worktreePath}}', ctx.getTemplateVars());
    expect(result).toBe('Path: /tmp/my-worktree');
  });

  it('renders {{sessionId}} and {{branchName}}', () => {
    const ctx = new WorkflowContext();
    ctx.setSessionContext({ sessionId: 'sess-42', branchName: 'feat/thing' });
    const result = renderTemplate(
      'Session {{sessionId}} on {{branchName}}',
      ctx.getTemplateVars()
    );
    expect(result).toBe('Session sess-42 on feat/thing');
  });

  it('renders {{task.title}} in per-task context', () => {
    const ctx = new WorkflowContext();
    const task = makeTask({ id: 't1', title: 'Build Auth' });
    const child = ctx.withTask(task, 0, 3);
    const result = renderTemplate(
      'Task {{taskIndex}} of {{taskCount}}: {{task.title}}',
      child.getTemplateVars()
    );
    expect(result).toBe('Task 0 of 3: Build Auth');
  });

  it('renders {{#each changedFiles}} block', () => {
    const ctx = new WorkflowContext();
    ctx.addChangedFile('src/a.ts');
    ctx.addChangedFile('src/b.ts');
    const template = 'Files:{{#each changedFiles}} {{this}}{{/each}}';
    const result = renderTemplate(template, ctx.getTemplateVars());
    expect(result).toBe('Files: src/a.ts src/b.ts');
  });
});
