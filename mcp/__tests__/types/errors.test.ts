import { describe, it, expect } from '@jest/globals';
import {
  MCPErrorCode,
  createErrorResponse,
  createSuccessResponse,
  getRemediation,
  type MCPErrorResponse,
  type MCPSuccessResponse,
  type MCPErrorDetails,
  type MCPErrorContext,
} from '../../src/types/errors.js';

describe('Error Types', () => {
  describe('MCPErrorCode', () => {
    it('should have all required error codes', () => {
      expect(MCPErrorCode.TOOL_NOT_FOUND).toBe('TOOL_NOT_FOUND');
      expect(MCPErrorCode.TOOL_EXECUTION_ERROR).toBe('TOOL_EXECUTION_ERROR');
      expect(MCPErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(MCPErrorCode.INVALID_ARGUMENTS).toBe('INVALID_ARGUMENTS');
      expect(MCPErrorCode.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
      expect(MCPErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(MCPErrorCode.ACCESS_DENIED).toBe('ACCESS_DENIED');
      expect(MCPErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(MCPErrorCode.RESOURCE_NOT_FOUND).toBe('RESOURCE_NOT_FOUND');
      expect(MCPErrorCode.RESOURCE_ALREADY_EXISTS).toBe('RESOURCE_ALREADY_EXISTS');
      expect(MCPErrorCode.RESOURCE_LOCKED).toBe('RESOURCE_LOCKED');
      expect(MCPErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
      expect(MCPErrorCode.FILE_TOO_LARGE).toBe('FILE_TOO_LARGE');
      expect(MCPErrorCode.PATH_TRAVERSAL_DENIED).toBe('PATH_TRAVERSAL_DENIED');
      expect(MCPErrorCode.ISSUE_NOT_FOUND).toBe('ISSUE_NOT_FOUND');
      expect(MCPErrorCode.ISSUE_INVALID_STATUS).toBe('ISSUE_INVALID_STATUS');
      expect(MCPErrorCode.ISSUE_OPERATION_FAILED).toBe('ISSUE_OPERATION_FAILED');
      expect(MCPErrorCode.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');
      expect(MCPErrorCode.PROVIDER_ERROR).toBe('PROVIDER_ERROR');
      expect(MCPErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(MCPErrorCode.TIMEOUT).toBe('TIMEOUT');
      expect(MCPErrorCode.UNAVAILABLE).toBe('UNAVAILABLE');
    });
  });

  describe('createErrorResponse', () => {
    it('should create basic error response', () => {
      const response = createErrorResponse(
        MCPErrorCode.VALIDATION_ERROR,
        'Invalid input provided'
      );

      expect(response.isError).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Error [VALIDATION_ERROR]');
      expect(response.content[0].text).toContain('Invalid input provided');
      expect(response.metadata?.error.code).toBe(MCPErrorCode.VALIDATION_ERROR);
      expect(response.metadata?.error.message).toBe('Invalid input provided');
    });

    it('should include details in error response', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const response = createErrorResponse(
        MCPErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { details }
      );

      expect(response.content[0].text).toContain('Details:');
      expect(response.content[0].text).toContain('"field": "email"');
      expect(response.metadata?.error.details).toEqual(details);
    });

    it('should include remediation in error response', () => {
      const remediation = 'Check your input format';
      const response = createErrorResponse(
        MCPErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { remediation }
      );

      expect(response.content[0].text).toContain('Suggested fix:');
      expect(response.content[0].text).toContain(remediation);
      expect(response.metadata?.error.remediation).toBe(remediation);
    });

    it('should include context in error response', () => {
      const context: MCPErrorContext = {
        tool: 'issues_create',
        arguments: { title: 'Test' },
      };

      const response = createErrorResponse(
        MCPErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { context }
      );

      expect(response.metadata?.error.context?.tool).toBe('issues_create');
      expect(response.metadata?.error.context?.timestamp).toBeDefined();
    });

    it('should include stack trace when requested', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(
        MCPErrorCode.INTERNAL_ERROR,
        'Internal error occurred',
        { includeStack: true, error }
      );

      expect(response.metadata?.error.stack).toBeDefined();
      expect(response.metadata?.error.stack).toContain('Error: Test error');
    });

    it('should not include stack trace by default', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(
        MCPErrorCode.INTERNAL_ERROR,
        'Internal error occurred',
        { error }
      );

      expect(response.metadata?.error.stack).toBeUndefined();
    });

    it('should format timestamp in ISO format', () => {
      const response = createErrorResponse(
        MCPErrorCode.VALIDATION_ERROR,
        'Test error'
      );

      const timestamp = response.metadata?.error.context?.timestamp;
      expect(timestamp).toBeDefined();
      expect(() => new Date(timestamp!)).not.toThrow();
    });
  });

  describe('createSuccessResponse', () => {
    it('should create basic success response', () => {
      const response = createSuccessResponse('Operation completed successfully');

      expect(response.isError).toBe(false);
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toBe('Operation completed successfully');
    });

    it('should include metadata in success response', () => {
      const metadata = { issueId: 'issue-001', status: 'created' };
      const response = createSuccessResponse('Issue created', metadata);

      expect(response.isError).toBe(false);
      expect(response.metadata).toEqual(metadata);
    });

    it('should allow undefined metadata', () => {
      const response = createSuccessResponse('Success');

      expect(response.isError).toBe(false);
      expect(response.metadata).toBeUndefined();
    });
  });

  describe('getRemediation', () => {
    it('should return remediation for known error codes', () => {
      const remediation = getRemediation(MCPErrorCode.TOOL_NOT_FOUND);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('tool name');
    });

    it('should return remediation for validation errors', () => {
      const remediation = getRemediation(MCPErrorCode.VALIDATION_ERROR);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('parameters');
    });

    it('should return remediation for permission errors', () => {
      const remediation = getRemediation(MCPErrorCode.PERMISSION_DENIED);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('permissions');
    });

    it('should return remediation for rate limit errors', () => {
      const remediation = getRemediation(MCPErrorCode.RATE_LIMIT_EXCEEDED);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('Wait');
    });

    it('should return remediation for resource errors', () => {
      const remediation = getRemediation(MCPErrorCode.RESOURCE_NOT_FOUND);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('resource');
    });

    it('should return remediation for file errors', () => {
      const remediation = getRemediation(MCPErrorCode.FILE_TOO_LARGE);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('file size');
    });

    it('should return remediation for path traversal', () => {
      const remediation = getRemediation(MCPErrorCode.PATH_TRAVERSAL_DENIED);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('workspace');
    });

    it('should return remediation for issue errors', () => {
      const remediation = getRemediation(MCPErrorCode.ISSUE_NOT_FOUND);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('issue ID');
    });

    it('should return remediation for configuration errors', () => {
      const remediation = getRemediation(MCPErrorCode.CONFIGURATION_ERROR);
      expect(remediation).toBeDefined();
      expect(remediation).toContain('configuration');
    });

    it('should return undefined for unknown error codes', () => {
      const remediation = getRemediation('UNKNOWN_ERROR' as MCPErrorCode);
      expect(remediation).toBeUndefined();
    });
  });

  describe('MCPErrorDetails', () => {
    it('should accept all required fields', () => {
      const details: MCPErrorDetails = {
        code: MCPErrorCode.VALIDATION_ERROR,
        message: 'Test error',
      };

      expect(details.code).toBe(MCPErrorCode.VALIDATION_ERROR);
      expect(details.message).toBe('Test error');
    });

    it('should accept optional fields', () => {
      const details: MCPErrorDetails = {
        code: MCPErrorCode.VALIDATION_ERROR,
        message: 'Test error',
        details: { field: 'email' },
        context: { tool: 'test_tool' },
        remediation: 'Fix the issue',
        stack: 'Error stack trace',
      };

      expect(details.details).toEqual({ field: 'email' });
      expect(details.context?.tool).toBe('test_tool');
      expect(details.remediation).toBe('Fix the issue');
      expect(details.stack).toBe('Error stack trace');
    });
  });

  describe('MCPErrorContext', () => {
    it('should accept tool and arguments', () => {
      const context: MCPErrorContext = {
        tool: 'issues_create',
        arguments: { title: 'Test' },
      };

      expect(context.tool).toBe('issues_create');
      expect(context.arguments).toEqual({ title: 'Test' });
    });

    it('should accept custom fields', () => {
      const context: MCPErrorContext = {
        tool: 'test_tool',
        userId: 'user-123',
        requestId: 'req-456',
      };

      expect(context.userId).toBe('user-123');
      expect(context.requestId).toBe('req-456');
    });
  });

  describe('Type Guards', () => {
    it('should distinguish error and success responses', () => {
      const errorResponse = createErrorResponse(
        MCPErrorCode.VALIDATION_ERROR,
        'Error'
      );
      const successResponse = createSuccessResponse('Success');

      expect(errorResponse.isError).toBe(true);
      expect(successResponse.isError).toBe(false);
    });
  });
});
