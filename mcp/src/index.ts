#!/usr/bin/env node

/**
 * Wrangler MCP Server Entry Point
 *
 * Starts the MCP server with stdio transport for communication with Claude Desktop
 * or other MCP clients.
 */

import { WranglerMCPServer, WranglerMCPConfig } from './server.js';
import { realpathSync } from 'fs';
import { fileURLToPath } from 'url';

/**
 * Parse configuration from environment variables
 */
function parseConfig(): WranglerMCPConfig {
  const config: WranglerMCPConfig = {
    name: process.env.WRANGLER_MCP_NAME || 'wrangler-tools',
    version: process.env.WRANGLER_MCP_VERSION || '1.0.0',
    workspaceRoot: process.env.WRANGLER_WORKSPACE_ROOT || process.cwd(),
  };

  // Parse issue provider configuration
  const issueProvider = process.env.WRANGLER_ISSUE_PROVIDER || 'markdown';
  const issueBasePath = process.env.WRANGLER_ISSUE_BASE_PATH || config.workspaceRoot || process.cwd();
  const issuesDirectory = process.env.WRANGLER_ISSUES_DIRECTORY || '.wrangler/issues';
  const specificationsDirectory = process.env.WRANGLER_SPECIFICATIONS_DIRECTORY || '.wrangler/specifications';

  config.issues = {
    provider: issueProvider as 'markdown' | 'mock',
    settings: {
      basePath: issueBasePath,
      issuesDirectory: issuesDirectory,
      specificationsDirectory: specificationsDirectory,
    },
  };

  return config;
}

/**
 * Main entry point
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

// Run the server
// Use realpathSync to handle symlinks (e.g., ~/.claude -> ~/.samos/dotfiles/claude)
const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1];

// Normalize both paths to handle symlinks
let isMain = false;
try {
  isMain = realpathSync(currentFile) === realpathSync(invokedFile);
} catch {
  // Fallback if realpath fails - try direct comparison
  isMain = currentFile === invokedFile || import.meta.url === `file://${invokedFile}`;
}

if (isMain) {
  main();
}

export { WranglerMCPServer } from './server.js';
export * from './types/config.js';
export * from './types/errors.js';
