/**
 * session_phase tool implementation
 *
 * Records phase transitions in the orchestration workflow.
 */

import { z } from 'zod';
import { SessionPhaseParamsSchema, AuditEntry } from '../../types/session.js';
import { SessionStorageProvider } from '../../providers/session-storage.js';
import { createSuccessResponse, createErrorResponse, MCPErrorCode } from '../../types/errors.js';

export const sessionPhaseSchema = SessionPhaseParamsSchema;

export type SessionPhaseParams = z.infer<typeof sessionPhaseSchema>;

export async function sessionPhaseTool(
  params: SessionPhaseParams,
  storageProvider: SessionStorageProvider
) {
  try {
    const session = await storageProvider.getSession(params.sessionId);

    if (!session) {
      return createErrorResponse(
        MCPErrorCode.RESOURCE_NOT_FOUND,
        `Session not found: ${params.sessionId}`
      );
    }

    const now = new Date().toISOString();

    // Create audit entry based on phase type
    const auditEntry: AuditEntry = {
      phase: params.phase as any,
      timestamp: now,
      status: params.status,
      ...params.metadata,
    } as AuditEntry;

    // Append audit entry
    await storageProvider.appendAuditEntry(params.sessionId, auditEntry);

    // Update session state
    const updates: any = {
      currentPhase: params.phase,
    };

    if (params.status === 'complete') {
      updates.phasesCompleted = [...session.phasesCompleted, params.phase];
    }

    await storageProvider.updateSession(params.sessionId, updates);

    return createSuccessResponse(
      `Phase ${params.phase} ${params.status}`,
      {
        sessionId: params.sessionId,
        phase: params.phase,
        status: params.status,
        timestamp: now,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(
      MCPErrorCode.TOOL_EXECUTION_ERROR,
      `Failed to record phase: ${message}`,
      { details: { sessionId: params.sessionId, phase: params.phase } }
    );
  }
}
