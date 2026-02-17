import type { WorkflowReporter, ReporterFactory } from './types.js';
import { GitHubPRCommentReporter } from './github-pr-comment.js';
import type { GitHubPRCommentConfig } from './github-pr-comment.js';

/**
 * Registry that maps reporter type strings to factory functions.
 * Reporters register themselves at startup; the engine looks them up
 * when processing the workflow's `reporters` config.
 */
export class ReporterRegistry {
  private factories = new Map<string, ReporterFactory>();

  /** Register a reporter factory for a given type. */
  register(type: string, factory: ReporterFactory): void {
    this.factories.set(type, factory);
  }

  /** Check if a reporter type is registered. */
  has(type: string): boolean {
    return this.factories.has(type);
  }

  /** Create a reporter instance from its type and config. Throws if type is unknown. */
  create(type: string, config: Record<string, unknown> = {}): WorkflowReporter {
    const factory = this.factories.get(type);
    if (!factory) {
      const available = [...this.factories.keys()].join(', ') || 'none';
      throw new Error(`Unknown reporter type "${type}". Available types: ${available}`);
    }
    return factory(config);
  }

  /** Get all registered type names. */
  getRegisteredTypes(): string[] {
    return [...this.factories.keys()];
  }
}

/**
 * Create a registry with built-in reporter types pre-registered.
 * For now this is empty; built-in reporters will be registered
 * as they are implemented in later issues.
 */
export function createDefaultReporterRegistry(): ReporterRegistry {
  const registry = new ReporterRegistry();
  registry.register('github-pr-comment', (config) =>
    new GitHubPRCommentReporter(config as unknown as GitHubPRCommentConfig)
  );
  return registry;
}
