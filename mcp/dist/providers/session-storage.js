/**
 * Session storage provider for orchestration workflows
 */
import * as path from 'path';
import * as crypto from 'crypto';
import fs from 'fs-extra';
/**
 * Provides file-based storage for orchestration sessions
 */
export class SessionStorageProvider {
    basePath;
    sessionsDir;
    constructor(config) {
        this.basePath = config.basePath;
        this.sessionsDir = path.join(this.basePath, '.wrangler', 'sessions');
    }
    /**
     * Get the directory path for a session
     */
    getSessionDir(sessionId) {
        return path.join(this.sessionsDir, sessionId);
    }
    /**
     * Create a new session
     */
    async createSession(session) {
        const sessionDir = this.getSessionDir(session.id);
        await fs.ensureDir(sessionDir);
        // Write session context
        const contextPath = path.join(sessionDir, 'context.json');
        await fs.writeJson(contextPath, session, { spaces: 2 });
        // Write initial audit entry
        await this.appendAuditEntry(session.id, {
            phase: 'init',
            timestamp: session.startedAt,
            status: 'complete',
            session_id: session.id,
            worktree: session.worktreePath,
            branch: session.branchName,
            spec_file: session.specFile,
        });
    }
    /**
     * Get a session by ID
     */
    async getSession(sessionId) {
        const contextPath = path.join(this.getSessionDir(sessionId), 'context.json');
        if (!await fs.pathExists(contextPath)) {
            return null;
        }
        return await fs.readJson(contextPath);
    }
    /**
     * Update a session
     */
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session) {
            return null;
        }
        const updated = {
            ...session,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        const contextPath = path.join(this.getSessionDir(sessionId), 'context.json');
        await fs.writeJson(contextPath, updated, { spaces: 2 });
        return updated;
    }
    /**
     * Save a checkpoint for session recovery
     */
    async saveCheckpoint(checkpoint) {
        const sessionDir = this.getSessionDir(checkpoint.sessionId);
        await fs.ensureDir(sessionDir);
        // Write checkpoint
        const checkpointPath = path.join(sessionDir, 'checkpoint.json');
        await fs.writeJson(checkpointPath, checkpoint, { spaces: 2 });
        // Update session with checkpoint info
        await this.updateSession(checkpoint.sessionId, {
            tasksCompleted: checkpoint.tasksCompleted,
            tasksPending: checkpoint.tasksPending,
            currentPhase: checkpoint.currentPhase,
        });
        // Write audit entry
        await this.appendAuditEntry(checkpoint.sessionId, {
            phase: 'checkpoint',
            timestamp: checkpoint.createdAt,
            status: 'complete',
            checkpoint_id: checkpoint.checkpointId,
            tasks_completed: checkpoint.tasksCompleted.length,
            tasks_pending: checkpoint.tasksPending.length,
        });
    }
    /**
     * Get the latest checkpoint for a session
     */
    async getCheckpoint(sessionId) {
        const checkpointPath = path.join(this.getSessionDir(sessionId), 'checkpoint.json');
        if (!await fs.pathExists(checkpointPath)) {
            return null;
        }
        return await fs.readJson(checkpointPath);
    }
    /**
     * Get the blocker for a session (if paused)
     */
    async getBlocker(sessionId) {
        const blockerPath = path.join(this.getSessionDir(sessionId), 'blocker.json');
        if (!await fs.pathExists(blockerPath)) {
            return null;
        }
        return await fs.readJson(blockerPath);
    }
    /**
     * Append an audit entry to the session's audit log
     */
    async appendAuditEntry(sessionId, entry) {
        const sessionDir = this.getSessionDir(sessionId);
        await fs.ensureDir(sessionDir);
        const auditPath = path.join(sessionDir, 'audit.jsonl');
        const line = JSON.stringify(entry) + '\n';
        await fs.appendFile(auditPath, line);
    }
    /**
     * Get all audit entries for a session
     */
    async getAuditEntries(sessionId) {
        const auditPath = path.join(this.getSessionDir(sessionId), 'audit.jsonl');
        if (!await fs.pathExists(auditPath)) {
            return [];
        }
        const content = await fs.readFile(auditPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        return lines.map((line) => JSON.parse(line));
    }
    /**
     * Find the most recent incomplete session
     */
    async findIncompleteSession() {
        if (!await fs.pathExists(this.sessionsDir)) {
            return null;
        }
        const entries = await fs.readdir(this.sessionsDir, { withFileTypes: true });
        const sessionDirs = entries
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort()
            .reverse(); // Most recent first (IDs start with date)
        for (const sessionId of sessionDirs) {
            const session = await this.getSession(sessionId);
            if (session && (session.status === 'running' || session.status === 'paused')) {
                return session;
            }
        }
        return null;
    }
    /**
     * List all sessions
     */
    async listSessions(filters) {
        if (!await fs.pathExists(this.sessionsDir)) {
            return [];
        }
        const entries = await fs.readdir(this.sessionsDir, { withFileTypes: true });
        const sessionDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        const sessions = [];
        for (const sessionId of sessionDirs) {
            const session = await this.getSession(sessionId);
            if (session) {
                if (filters?.status && !filters.status.includes(session.status)) {
                    continue;
                }
                sessions.push(session);
            }
        }
        return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    }
    /**
     * Generate a unique checkpoint ID
     */
    generateCheckpointId() {
        return `chk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }
}
//# sourceMappingURL=session-storage.js.map