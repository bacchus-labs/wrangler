/**
 * Public API for the deterministic workflow engine.
 *
 * This module re-exports all types, classes, and utilities
 * needed for programmatic use of the engine. The CLI entry
 * point lives in cli.ts.
 */

export { WorkflowEngine } from './engine.js';
export { WorkflowContext, type WorkflowResult, type WorkflowStatus } from './state.js';
export { WorkflowSessionManager } from './integration/session.js';
export { buildMcpConfig } from './integration/mcp.js';
export { createDefaultRegistry, HandlerRegistry } from './handlers/index.js';
export * from './schemas/index.js';
export * from './types.js';
export { loadWorkflowYaml, loadAgentMarkdown, renderTemplate } from './loader.js';
