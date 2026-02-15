/**
 * Built-in handlers and registry setup.
 */

export { HandlerRegistry, type HandlerFunction, type HandlerDeps } from './registry.js';
export { createIssuesHandler } from './create-issues.js';
export { saveCheckpointHandler } from './save-checkpoint.js';

import { HandlerRegistry } from './registry.js';
import { createIssuesHandler } from './create-issues.js';
import { saveCheckpointHandler } from './save-checkpoint.js';

/**
 * Create a handler registry with all built-in handlers registered.
 */
export function createDefaultRegistry(): HandlerRegistry {
  const registry = new HandlerRegistry();
  registry.register('create-issues', createIssuesHandler);
  registry.register('save-checkpoint', saveCheckpointHandler);
  return registry;
}
