import { ReporterRegistry, createDefaultReporterRegistry } from '../../src/reporters/registry.js';
import type { WorkflowReporter, ReporterFactory } from '../../src/reporters/types.js';

const noop = async () => {};

function createMockReporter(type: string): WorkflowReporter {
  return {
    type,
    initialize: noop,
    onAuditEntry: noop,
    onComplete: noop,
    onError: noop,
    dispose: noop,
  };
}

function createMockFactory(type: string): ReporterFactory {
  return (_config: Record<string, unknown>) => createMockReporter(type);
}

describe('ReporterRegistry', () => {
  let registry: ReporterRegistry;

  beforeEach(() => {
    registry = new ReporterRegistry();
  });

  it('can register a factory and create a reporter', () => {
    registry.register('test', createMockFactory('test'));
    const reporter = registry.create('test');
    expect(reporter.type).toBe('test');
  });

  it('has() returns true for registered types', () => {
    registry.register('github-pr-comment', createMockFactory('github-pr-comment'));
    expect(registry.has('github-pr-comment')).toBe(true);
  });

  it('has() returns false for unregistered types', () => {
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('create() throws descriptive error for unknown type including available types', () => {
    registry.register('alpha', createMockFactory('alpha'));
    registry.register('beta', createMockFactory('beta'));

    expect(() => registry.create('gamma')).toThrow(
      'Unknown reporter type "gamma". Available types: alpha, beta',
    );
  });

  it('create() throws with "none" when no types are registered', () => {
    expect(() => registry.create('anything')).toThrow(
      'Unknown reporter type "anything". Available types: none',
    );
  });

  it('create() passes config through to factory function', () => {
    const receivedConfigs: Record<string, unknown>[] = [];
    const factory: ReporterFactory = (config) => {
      receivedConfigs.push(config);
      return createMockReporter('configurable');
    };

    registry.register('configurable', factory);
    const config = { token: 'abc123', verbose: true };
    registry.create('configurable', config);

    expect(receivedConfigs).toHaveLength(1);
    expect(receivedConfigs[0]).toEqual({ token: 'abc123', verbose: true });
  });

  it('registering same type twice overwrites the first factory', () => {
    registry.register('dual', createMockFactory('first'));
    registry.register('dual', createMockFactory('second'));

    const reporter = registry.create('dual');
    expect(reporter.type).toBe('second');
  });

  it('getRegisteredTypes() returns all registered type names', () => {
    registry.register('a', createMockFactory('a'));
    registry.register('b', createMockFactory('b'));
    registry.register('c', createMockFactory('c'));

    const types = registry.getRegisteredTypes();
    expect(types).toEqual(['a', 'b', 'c']);
  });

  it('getRegisteredTypes() returns empty array when nothing is registered', () => {
    expect(registry.getRegisteredTypes()).toEqual([]);
  });

  it('create() with no config argument uses default empty object', () => {
    const receivedConfigs: Record<string, unknown>[] = [];
    const factory: ReporterFactory = (config) => {
      receivedConfigs.push(config);
      return createMockReporter('defaults');
    };

    registry.register('defaults', factory);
    registry.create('defaults');

    expect(receivedConfigs).toHaveLength(1);
    expect(receivedConfigs[0]).toEqual({});
  });
});

describe('createDefaultReporterRegistry', () => {
  it('returns a valid ReporterRegistry instance', () => {
    const registry = createDefaultReporterRegistry();
    expect(registry).toBeInstanceOf(ReporterRegistry);
  });

  it('returns a registry that can have types registered on it', () => {
    const registry = createDefaultReporterRegistry();
    registry.register('custom', createMockFactory('custom'));
    expect(registry.has('custom')).toBe(true);
    expect(registry.create('custom').type).toBe('custom');
  });
});
