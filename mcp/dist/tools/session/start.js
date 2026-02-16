/**
 * session_start tool implementation
 *
 * Initializes a new orchestration session for spec implementation.
 */
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import * as fsExtra from 'fs-extra';
// ESM compat
const fs = fsExtra.default || fsExtra;
import { SessionStartParamsSchema } from '../../types/session.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';
export const sessionStartSchema = SessionStartParamsSchema;
/**
 * Generate a session ID in the format: YYYY-MM-DD-{git-short-hash}-{random-hex}
 */
function generateSessionId(workingDir) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let gitHash = 'nogit';
    try {
        gitHash = execSync('git rev-parse --short HEAD', {
            cwd: workingDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    }
    catch {
        // Not a git repo or git not available
    }
    const randomHex = crypto.randomBytes(2).toString('hex'); // 4 hex chars
    return `${date}-${gitHash}-${randomHex}`;
}
/**
 * Extract spec name from spec file path
 */
function extractSpecName(specFile) {
    const basename = path.basename(specFile, '.md');
    // Remove common prefixes like SPEC-000001-
    const cleanName = basename.replace(/^SPEC-\d+-/, '').replace(/^spec-/, '');
    // Slugify
    return cleanName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) || 'implementation';
}
export async function sessionStartTool(params, storageProvider) {
    try {
        const workingDir = params.workingDirectory || process.cwd();
        const resolvedWorkingDir = path.resolve(workingDir);
        // Validate spec file exists
        const specPath = path.isAbsolute(params.specFile)
            ? params.specFile
            : path.join(resolvedWorkingDir, params.specFile);
        if (!await fs.pathExists(specPath)) {
            return createErrorResponse(MCPErrorCode.FILE_NOT_FOUND, `Spec file not found: ${params.specFile}`, { details: { specFile: params.specFile, resolvedPath: specPath } });
        }
        // Generate session ID
        const sessionId = generateSessionId(resolvedWorkingDir);
        const specName = extractSpecName(params.specFile);
        // Create worktree path and branch name
        const worktreePath = path.join(resolvedWorkingDir, '.worktrees', specName);
        const branchName = `wrangler/${specName}/${sessionId}`;
        // Check if worktree directory already exists
        let actualWorktreePath = worktreePath;
        let worktreeCreated = false;
        if (await fs.pathExists(worktreePath)) {
            // Worktree exists - use existing or create with suffix
            actualWorktreePath = `${worktreePath}-${sessionId.split('-').pop()}`;
        }
        // Try to create worktree (if in a git repo)
        try {
            // Ensure .worktrees directory exists
            await fs.ensureDir(path.dirname(actualWorktreePath));
            // Create branch and worktree
            execSync(`git worktree add -b "${branchName}" "${actualWorktreePath}"`, {
                cwd: resolvedWorkingDir,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            worktreeCreated = true;
        }
        catch (error) {
            // If worktree creation fails, fall back to using the working directory
            // This allows the tool to work in non-git contexts or when worktrees aren't supported
            actualWorktreePath = resolvedWorkingDir;
        }
        const now = new Date().toISOString();
        // Resolve workflow name (default to "spec-implementation")
        const workflowName = params.workflow || 'spec-implementation';
        // Create session object
        const session = {
            id: sessionId,
            specFile: params.specFile,
            status: 'running',
            currentPhase: 'init',
            worktreePath: actualWorktreePath,
            branchName: worktreeCreated ? branchName : 'current',
            workflow: workflowName,
            skipChecks: params.skipChecks,
            skipStepNames: params.skipStepNames,
            phasesCompleted: ['init'],
            tasksCompleted: [],
            tasksPending: [],
            startedAt: now,
            updatedAt: now,
        };
        // Create session in storage
        await storageProvider.createSession(session);
        const auditPath = path.join(storageProvider.getSessionDir(sessionId), 'audit.jsonl');
        return createSuccessResponse(`Session started: ${sessionId}\nWorkflow: ${workflowName}\nWorktree: ${actualWorktreePath}\nBranch: ${session.branchName}`, {
            sessionId,
            status: 'running',
            currentPhase: 'init',
            auditPath,
            worktreePath: actualWorktreePath,
            branchName: session.branchName,
            worktreeCreated,
            workflow: workflowName,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return createErrorResponse(MCPErrorCode.TOOL_EXECUTION_ERROR, `Failed to start session: ${message}`, { details: { specFile: params.specFile } });
    }
}
//# sourceMappingURL=start.js.map