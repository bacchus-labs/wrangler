/**
 * Structured error handling for MCP tools
 */

export enum MCPErrorCode {
  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Permission errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PATH_TRAVERSAL_DENIED = 'PATH_TRAVERSAL_DENIED',

  // Issue errors
  ISSUE_NOT_FOUND = 'ISSUE_NOT_FOUND',
  ISSUE_INVALID_STATUS = 'ISSUE_INVALID_STATUS',
  ISSUE_OPERATION_FAILED = 'ISSUE_OPERATION_FAILED',

  // Configuration errors
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PROVIDER_ERROR = 'PROVIDER_ERROR',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNAVAILABLE = 'UNAVAILABLE',
}

export interface MCPErrorContext {
  tool?: string;
  arguments?: any;
  timestamp?: string;
  [key: string]: any;
}

export interface MCPErrorDetails {
  code: MCPErrorCode;
  message: string;
  details?: any;
  context?: MCPErrorContext;
  remediation?: string;
  stack?: string;
}

export interface MCPErrorResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
  metadata?: {
    error: MCPErrorDetails;
    [key: string]: any;
  };
}

export interface MCPSuccessResponse<T = any> {
  content: Array<{ type: 'text'; text: string }>;
  isError: false;
  metadata?: T;
}

export type MCPResponse<T = any> = MCPSuccessResponse<T> | MCPErrorResponse;


/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: MCPErrorCode,
  message: string,
  options: {
    details?: any;
    context?: MCPErrorContext;
    remediation?: string;
    includeStack?: boolean;
    error?: Error;
  } = {}
): MCPErrorResponse {
  const errorDetails: MCPErrorDetails = {
    code,
    message,
    details: options.details,
    context: {
      ...options.context,
      timestamp: new Date().toISOString(),
    },
    remediation: options.remediation,
  };

  // Include stack trace only if requested (debug mode)
  if (options.includeStack && options.error) {
    errorDetails.stack = options.error.stack;
  }

  // Create human-readable text message
  let text = `Error [` + code + `]: ` + message;

  if (options.remediation) {
    text += `\n\nSuggested fix: ` + options.remediation;
  }

  if (options.details) {
    text += `\n\nDetails: ` + JSON.stringify(options.details, null, 2);
  }

  return {
    content: [{ type: 'text', text }],
    isError: true,
    metadata: {
      error: errorDetails,
    },
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T = any>(
  text: string,
  metadata?: T
): MCPSuccessResponse<T> {
  return {
    content: [{ type: 'text', text }],
    isError: false,
    metadata,
  };
}


/**
 * Error remediation suggestions by error code
 */
export const ERROR_REMEDIATIONS: Partial<Record<MCPErrorCode, string>> = {
  [MCPErrorCode.TOOL_NOT_FOUND]: 'Check that the tool name is correct and the server is properly configured.',
  [MCPErrorCode.VALIDATION_ERROR]: 'Review the tool parameters and ensure they match the expected schema.',
  [MCPErrorCode.PERMISSION_DENIED]: 'Verify you have the necessary permissions to perform this operation.',
  [MCPErrorCode.RATE_LIMIT_EXCEEDED]: 'Wait a moment before retrying the operation.',
  [MCPErrorCode.RESOURCE_NOT_FOUND]: 'Verify the resource ID or path is correct.',
  [MCPErrorCode.FILE_TOO_LARGE]: 'Reduce the file size or increase the configured limit.',
  [MCPErrorCode.PATH_TRAVERSAL_DENIED]: 'Use relative paths within the workspace directory.',
  [MCPErrorCode.ISSUE_NOT_FOUND]: 'Verify the issue ID exists. Use issues_list to see available issues.',
  [MCPErrorCode.CONFIGURATION_ERROR]: 'Check your workspace configuration and ensure all required fields are set.',
};

/**
 * Get remediation suggestion for an error code
 */
export function getRemediation(code: MCPErrorCode): string | undefined {
  return ERROR_REMEDIATIONS[code];
}
