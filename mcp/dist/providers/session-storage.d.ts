/**
 * Session storage provider for orchestration workflows
 */
import { Session, SessionCheckpoint, AuditEntry } from '../types/session.js';
export interface SessionStorageConfig {
    basePath: string;
}
/**
 * Provides file-based storage for orchestration sessions
 */
export declare class SessionStorageProvider {
    private basePath;
    private sessionsDir;
    constructor(config: SessionStorageConfig);
    /**
     * Get the directory path for a session
     */
    getSessionDir(sessionId: string): string;
    /**
     * Create a new session
     */
    createSession(session: Session): Promise<void>;
    /**
     * Get a session by ID
     */
    getSession(sessionId: string): Promise<Session | null>;
    /**
     * Update a session
     */
    updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null>;
    /**
     * Save a checkpoint for session recovery
     */
    saveCheckpoint(checkpoint: SessionCheckpoint): Promise<void>;
    /**
     * Get the latest checkpoint for a session
     */
    getCheckpoint(sessionId: string): Promise<SessionCheckpoint | null>;
    /**
     * Get the blocker for a session (if paused)
     */
    getBlocker(sessionId: string): Promise<Record<string, unknown> | null>;
    /**
     * Append an audit entry to the session's audit log
     */
    appendAuditEntry(sessionId: string, entry: AuditEntry): Promise<void>;
    /**
     * Get all audit entries for a session
     */
    getAuditEntries(sessionId: string): Promise<AuditEntry[]>;
    /**
     * Find the most recent incomplete session
     */
    findIncompleteSession(): Promise<Session | null>;
    /**
     * List all sessions
     */
    listSessions(filters?: {
        status?: string[];
    }): Promise<Session[]>;
    /**
     * Generate a unique checkpoint ID
     */
    generateCheckpointId(): string;
}
//# sourceMappingURL=session-storage.d.ts.map