/**
 * Bundle Standalone Test
 *
 * Verifies that the bundled MCP server works without node_modules installed.
 * This simulates what happens when a user installs the plugin via GitHub URL.
 */

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('MCP Bundle Standalone', () => {
  const bundlePath = path.resolve(__dirname, '../dist/bundle.cjs');
  let tempDir: string;
  let mcpProcess: ChildProcess | null = null;

  beforeAll(() => {
    // Verify the bundle exists
    if (!fs.existsSync(bundlePath)) {
      throw new Error(
        `Bundle not found at ${bundlePath}. Run 'npm run bundle:mcp' first.`
      );
    }
  });

  beforeEach(async () => {
    // Create a temp directory that simulates a fresh clone (no node_modules)
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wrangler-bundle-test-'));

    // Copy only the bundle file - simulating what a fresh git clone would have
    const tempBundlePath = path.join(tempDir, 'bundle.cjs');
    await fs.copy(bundlePath, tempBundlePath);

    // Create a minimal .wrangler directory for the MCP to use
    await fs.ensureDir(path.join(tempDir, '.wrangler', 'issues'));
    await fs.ensureDir(path.join(tempDir, '.wrangler', 'specifications'));
  });

  afterEach(async () => {
    // Kill MCP process if still running
    if (mcpProcess) {
      mcpProcess.kill('SIGTERM');
      mcpProcess = null;
    }

    // Clean up temp directory
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it('bundle file exists and has reasonable size', async () => {
    const stats = await fs.stat(bundlePath);

    // Bundle should be between 500KB and 2MB (sanity check)
    expect(stats.size).toBeGreaterThan(500 * 1024);
    expect(stats.size).toBeLessThan(2 * 1024 * 1024);
  });

  it('bundle starts without node_modules present', async () => {
    const tempBundlePath = path.join(tempDir, 'bundle.cjs');

    // Verify node_modules does NOT exist (simulating fresh clone)
    expect(fs.existsSync(path.join(tempDir, 'node_modules'))).toBe(false);

    // Start the MCP server
    mcpProcess = spawn('node', [tempBundlePath], {
      cwd: tempDir,
      env: {
        ...process.env,
        WRANGLER_WORKSPACE_ROOT: tempDir,
        WRANGLER_ISSUES_DIRECTORY: '.wrangler/issues',
        WRANGLER_SPECIFICATIONS_DIRECTORY: '.wrangler/specifications',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Collect stderr for error reporting
    let stderr = '';
    mcpProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait a bit for the server to start or fail
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if process is still running (exitCode is null if still running)
    expect(mcpProcess.exitCode).toBeNull();

    // If there's any stderr output that looks like an error, fail
    if (stderr.includes('Error:') || stderr.includes('Cannot find module')) {
      throw new Error(`MCP server failed to start: ${stderr}`);
    }
  });

  it('bundle responds to MCP initialize request', async () => {
    const tempBundlePath = path.join(tempDir, 'bundle.cjs');

    mcpProcess = spawn('node', [tempBundlePath], {
      cwd: tempDir,
      env: {
        ...process.env,
        WRANGLER_WORKSPACE_ROOT: tempDir,
        WRANGLER_ISSUES_DIRECTORY: '.wrangler/issues',
        WRANGLER_SPECIFICATIONS_DIRECTORY: '.wrangler/specifications',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    mcpProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Send MCP initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    // Collect response
    let response = '';
    mcpProcess.stdout?.on('data', (data) => {
      response += data.toString();
    });

    // Send the request (MCP uses newline-delimited JSON)
    mcpProcess.stdin?.write(JSON.stringify(initRequest) + '\n');

    // Wait for response
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify we got a response
    expect(response.length).toBeGreaterThan(0);

    // Parse and validate response
    // MCP responses may have a Content-Length header, handle both formats
    let jsonResponse: string;
    if (response.includes('Content-Length:')) {
      // Extract JSON from header format
      const jsonMatch = response.match(/\r\n\r\n([\s\S]+)/);
      jsonResponse = jsonMatch ? jsonMatch[1] : response;
    } else {
      jsonResponse = response.trim();
    }

    const parsed = JSON.parse(jsonResponse);
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(1);
    expect(parsed.result).toBeDefined();
    expect(parsed.result.serverInfo).toBeDefined();
    expect(parsed.result.serverInfo.name).toBe('wrangler-tools');
  });

  it('bundle lists available tools', async () => {
    const tempBundlePath = path.join(tempDir, 'bundle.cjs');

    mcpProcess = spawn('node', [tempBundlePath], {
      cwd: tempDir,
      env: {
        ...process.env,
        WRANGLER_WORKSPACE_ROOT: tempDir,
        WRANGLER_ISSUES_DIRECTORY: '.wrangler/issues',
        WRANGLER_SPECIFICATIONS_DIRECTORY: '.wrangler/specifications',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let response = '';
    mcpProcess.stdout?.on('data', (data) => {
      response += data.toString();
    });

    // Initialize first
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    };
    mcpProcess.stdin?.write(JSON.stringify(initRequest) + '\n');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Clear response buffer
    response = '';

    // Request tools list
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };
    mcpProcess.stdin?.write(JSON.stringify(listToolsRequest) + '\n');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Parse response (handle Content-Length header format)
    let jsonResponse: string;
    if (response.includes('Content-Length:')) {
      const jsonMatch = response.match(/\r\n\r\n([\s\S]+)/);
      jsonResponse = jsonMatch ? jsonMatch[1] : response;
    } else {
      jsonResponse = response.trim();
    }

    const parsed = JSON.parse(jsonResponse);
    expect(parsed.result).toBeDefined();
    expect(parsed.result.tools).toBeDefined();
    expect(Array.isArray(parsed.result.tools)).toBe(true);

    // Verify some expected tools are present
    const toolNames = parsed.result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('issues_create');
    expect(toolNames).toContain('issues_list');
    expect(toolNames).toContain('issues_search');
  });
});
