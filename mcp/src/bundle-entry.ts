#!/usr/bin/env node
/**
 * Wrangler MCP Server - Bundle Entry Point
 *
 * This is the entry point for the bundled version of the MCP server.
 * It's designed to work in both ESM and CJS contexts without import.meta issues.
 */

import { WranglerMCPServer } from './server.js';

/**
 * Parse configuration from environment variables
 */
function parseConfig() {
  const config: Record<string, unknown> = {
    name: process.env.WRANGLER_MCP_NAME || 'wrangler-tools',
    version: process.env.WRANGLER_MCP_VERSION || '1.0.0',
    workspaceRoot: process.env.WRANGLER_WORKSPACE_ROOT || process.cwd(),
  };

  // Parse issue provider configuration
  const issueProvider = process.env.WRANGLER_ISSUE_PROVIDER || 'markdown';
  const issueBasePath = process.env.WRANGLER_ISSUE_BASE_PATH || (config.workspaceRoot as string) || process.cwd();
  const issuesDirectory = process.env.WRANGLER_ISSUES_DIRECTORY || '.wrangler/issues';
  const specificationsDirectory = process.env.WRANGLER_SPECIFICATIONS_DIRECTORY || '.wrangler/specifications';

  config.issues = {
    provider: issueProvider,
    settings: {
      basePath: issueBasePath,
      issuesDirectory: issuesDirectory,
      specificationsDirectory: specificationsDirectory,
    },
  };

  return config;
}

/**
 * Main entry point - always runs when this file is loaded
 */
async function main() {
  try {
    const config = parseConfig();
    const server = new WranglerMCPServer(config);

    // Setup graceful shutdown handlers
    const shutdown = async () => {
      try {
        await server.stop();
        process.exit(0);
      } catch (error) {
        console.error('[Wrangler MCP] Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGINT', () => shutdown());
    process.on('SIGTERM', () => shutdown());

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[Wrangler MCP] Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Wrangler MCP] Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Start the server
    await server.start();
  } catch (error) {
    console.error('[Wrangler MCP] Failed to start server:', error);
    process.exit(1);
  }
}

// Always run main - this file is only used as bundle entry point
main();
