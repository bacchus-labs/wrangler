/**
 * Configurable SDK simulator for workflow engine tests.
 *
 * Provides a realistic QueryFunction mock that emits multi-message sequences
 * matching the real Agent SDK's async generator interface. Unlike the simple
 * createMockQuery in engine.test.ts (which only emits a single result message),
 * this simulator supports:
 *
 * - Multi-message sequences (assistant, tool_use, tool_result, result)
 * - Error subtypes
 * - Null structured output
 * - Multiple result messages (last-wins behavior)
 * - Prompt substring matching with configurable defaults
 * - Call logging for test assertions
 */

import type {
  QueryFunction,
  QueryOptions,
  SDKMessage,
  SDKResultMessage,
} from '../../src/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single recorded call to the simulator's queryFn. */
export interface CallLogEntry {
  prompt: string;
  options?: QueryOptions['options'];
  timestamp: number;
}

/** Configuration for the SDK simulator. */
export interface SDKSimulatorConfig {
  /** Map of prompt substrings to message sequences. */
  responses: Map<string, SDKMessage[]>;
  /** Fallback message sequence when no prompt substring matches. */
  defaultResponse?: SDKMessage[];
  /** If true, throw an error when no prompt matches (instead of using defaultResponse). */
  throwOnUnmatched?: boolean;
}

/** Return value from createSDKSimulator. */
export interface SDKSimulator {
  /** The mock QueryFunction to inject into the engine. */
  queryFn: QueryFunction;
  /** Log of all calls made to queryFn, in order. */
  calls: CallLogEntry[];
}

// ---------------------------------------------------------------------------
// Message factory helpers
// ---------------------------------------------------------------------------

/** Create a base result message with common defaults. */
function baseResultMessage(overrides: Partial<SDKResultMessage> = {}): SDKResultMessage {
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    num_turns: 1,
    total_cost_usd: 0.01,
    session_id: 'sim-session',
    ...overrides,
  };
}

/**
 * Create a realistic multi-message agent sequence:
 * 1. assistant message (the agent's initial response)
 * 2. tool_use message (the agent calls a tool)
 * 3. tool_result message (the tool returns a result)
 * 4. result message with structured_output
 */
export function createAgentSequence(structuredOutput: unknown): SDKMessage[] {
  return [
    { type: 'assistant', content: 'Let me work on this...' },
    { type: 'tool_use', name: 'mock_tool', input: { action: 'execute' } },
    { type: 'tool_result', content: 'Tool completed successfully' },
    baseResultMessage({ structured_output: structuredOutput }),
  ];
}

/**
 * Create an empty sequence: only an assistant message, no result.
 * The generator completes without yielding a result message.
 * This tests the engine's handling of agents that produce no structured output.
 */
export function createEmptySequence(): SDKMessage[] {
  return [
    { type: 'assistant', content: 'Done.' },
  ];
}

/**
 * Create a sequence that yields a result with structured_output: null.
 * This is distinct from no result at all -- the result message exists
 * but carries a null output.
 */
export function createNullOutputSequence(): SDKMessage[] {
  return [
    { type: 'assistant', content: 'Processing...' },
    baseResultMessage({ structured_output: null }),
  ];
}

/**
 * Create an error sequence: a result message with a non-success subtype.
 * The engine should detect this and throw.
 */
export function createErrorSequence(
  errorSubtype: SDKResultMessage['subtype'] = 'error_during_execution',
  errors: string[] = ['Something went wrong'],
): SDKMessage[] {
  return [
    { type: 'assistant', content: 'Attempting...' },
    baseResultMessage({
      subtype: errorSubtype,
      is_error: true,
      errors,
      total_cost_usd: 0,
    }),
  ];
}

/**
 * Create a sequence with two result messages (tests last-wins behavior).
 * The engine's for-await loop processes all messages; the last successful
 * result with structured_output should win.
 */
export function createMultiResultSequence(
  firstOutput: unknown,
  secondOutput: unknown,
): SDKMessage[] {
  return [
    { type: 'assistant', content: 'Working...' },
    baseResultMessage({ structured_output: firstOutput }),
    { type: 'assistant', content: 'Revising...' },
    baseResultMessage({ structured_output: secondOutput }),
  ];
}

// ---------------------------------------------------------------------------
// Simulator factory
// ---------------------------------------------------------------------------

/**
 * Create a configurable SDK simulator.
 *
 * @example
 * ```ts
 * const { queryFn, calls } = createSDKSimulator({
 *   responses: new Map([
 *     ['analyze', createAgentSequence({ issues: [] })],
 *     ['implement', createAgentSequence({ files: ['index.ts'] })],
 *   ]),
 *   defaultResponse: createAgentSequence({ fallback: true }),
 * });
 *
 * const engine = new WorkflowEngine(workflowDef, { ...config, query: queryFn });
 * await engine.run();
 *
 * expect(calls).toHaveLength(2);
 * expect(calls[0].prompt).toContain('analyze');
 * ```
 */
export function createSDKSimulator(config: SDKSimulatorConfig): SDKSimulator {
  const calls: CallLogEntry[] = [];

  const queryFn: QueryFunction = async function* simulatedQuery(
    params: QueryOptions,
  ): AsyncGenerator<SDKMessage, void> {
    // Log the call
    calls.push({
      prompt: params.prompt,
      options: params.options,
      timestamp: Date.now(),
    });

    // Find matching response by prompt substring
    let matched: SDKMessage[] | undefined;
    for (const [key, sequence] of config.responses) {
      if (params.prompt.includes(key)) {
        matched = sequence;
        break;
      }
    }

    // If no match, try default or throw
    if (!matched) {
      if (config.throwOnUnmatched) {
        throw new Error(
          `SDK Simulator: no response configured for prompt containing: "${params.prompt.slice(0, 100)}..."`,
        );
      }
      matched = config.defaultResponse ?? [
        baseResultMessage({ structured_output: undefined }),
      ];
    }

    // Yield all messages in sequence
    for (const message of matched) {
      yield message;
    }
  };

  return { queryFn, calls };
}
