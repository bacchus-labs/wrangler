/**
 * Handler registry for 'code' step types.
 * Maps handler names to TypeScript functions.
 */

import type { WorkflowContext } from '../state.js';
import type { QueryFunction, EngineConfig } from '../types.js';

/**
 * Optional dependencies injected by the engine into handlers.
 * Allows handlers to dispatch agent queries and read engine config.
 */
export interface HandlerDeps {
  queryFn: QueryFunction;
  config: EngineConfig;
}

export type HandlerFunction = (
  ctx: WorkflowContext,
  input?: unknown,
  deps?: HandlerDeps
) => Promise<void>;

export class HandlerRegistry {
  private handlers: Map<string, HandlerFunction> = new Map();

  /**
   * Register a handler function by name.
   */
  register(name: string, handler: HandlerFunction): void {
    this.handlers.set(name, handler);
  }

  /**
   * Get a registered handler by name.
   * Throws if not found.
   */
  get(name: string): HandlerFunction {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`No handler registered with name: ${name}`);
    }
    return handler;
  }

  /**
   * Check if a handler is registered.
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * List all registered handler names.
   */
  list(): string[] {
    return Array.from(this.handlers.keys());
  }
}
