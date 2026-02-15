/**
 * Tests for the SDK simulator fixture.
 *
 * Validates that the simulator correctly models the Agent SDK's async generator
 * interface and that all helper functions produce the expected message sequences.
 */

import type { SDKMessage, SDKResultMessage, QueryOptions } from '../../src/types.js';
import {
  createSDKSimulator,
  createAgentSequence,
  createEmptySequence,
  createNullOutputSequence,
  createErrorSequence,
  createMultiResultSequence,
} from './sdk-simulator.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Collect all messages from an async generator into an array. */
async function collectMessages(gen: AsyncGenerator<SDKMessage, void>): Promise<SDKMessage[]> {
  const messages: SDKMessage[] = [];
  for await (const msg of gen) {
    messages.push(msg);
  }
  return messages;
}

/** Check if a message is a result message (mirrors engine's isResultMessage). */
function isResultMessage(msg: SDKMessage): msg is SDKResultMessage {
  return msg.type === 'result';
}

/** Create a minimal QueryOptions object for testing. */
function makeParams(prompt: string, options?: QueryOptions['options']): QueryOptions {
  return { prompt, options };
}

// ---------------------------------------------------------------------------
// Tests: Message factory helpers
// ---------------------------------------------------------------------------

describe('SDK Simulator - Message Helpers', () => {
  describe('createAgentSequence', () => {
    it('should emit assistant, tool_use, tool_result, and result messages', () => {
      const messages = createAgentSequence({ tasks: ['a', 'b'] });

      expect(messages).toHaveLength(4);
      expect(messages[0].type).toBe('assistant');
      expect(messages[1].type).toBe('tool_use');
      expect(messages[2].type).toBe('tool_result');
      expect(messages[3].type).toBe('result');
    });

    it('should set structured_output on the result message', () => {
      const output = { score: 42, items: [1, 2, 3] };
      const messages = createAgentSequence(output);
      const result = messages[3] as SDKResultMessage;

      expect(result.structured_output).toEqual(output);
      expect(result.subtype).toBe('success');
      expect(result.is_error).toBe(false);
    });

    it('should handle primitive structured output', () => {
      const messages = createAgentSequence('just a string');
      const result = messages[3] as SDKResultMessage;
      expect(result.structured_output).toBe('just a string');
    });

    it('should handle null structured output', () => {
      const messages = createAgentSequence(null);
      const result = messages[3] as SDKResultMessage;
      expect(result.structured_output).toBeNull();
    });
  });

  describe('createEmptySequence', () => {
    it('should emit only an assistant message with no result', () => {
      const messages = createEmptySequence();

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('assistant');
      expect(messages.some(m => m.type === 'result')).toBe(false);
    });
  });

  describe('createNullOutputSequence', () => {
    it('should emit assistant + result with null structured_output', () => {
      const messages = createNullOutputSequence();

      expect(messages).toHaveLength(2);
      expect(messages[0].type).toBe('assistant');

      const result = messages[1] as SDKResultMessage;
      expect(result.type).toBe('result');
      expect(result.subtype).toBe('success');
      expect(result.structured_output).toBeNull();
    });
  });

  describe('createErrorSequence', () => {
    it('should emit assistant + error result with default subtype', () => {
      const messages = createErrorSequence();

      expect(messages).toHaveLength(2);
      const result = messages[1] as SDKResultMessage;
      expect(result.type).toBe('result');
      expect(result.subtype).toBe('error_during_execution');
      expect(result.is_error).toBe(true);
      expect(result.errors).toEqual(['Something went wrong']);
    });

    it('should accept custom error subtype and messages', () => {
      const messages = createErrorSequence('error_max_turns', ['Turn limit exceeded', 'Budget exhausted']);
      const result = messages[1] as SDKResultMessage;

      expect(result.subtype).toBe('error_max_turns');
      expect(result.errors).toEqual(['Turn limit exceeded', 'Budget exhausted']);
    });

    it('should support all SDK error subtypes', () => {
      const subtypes: SDKResultMessage['subtype'][] = [
        'error_during_execution',
        'error_max_turns',
        'error_max_budget_usd',
        'error_max_structured_output_retries',
      ];

      for (const subtype of subtypes) {
        const messages = createErrorSequence(subtype);
        const result = messages[1] as SDKResultMessage;
        expect(result.subtype).toBe(subtype);
        expect(result.is_error).toBe(true);
      }
    });
  });

  describe('createMultiResultSequence', () => {
    it('should emit two result messages interleaved with assistant messages', () => {
      const messages = createMultiResultSequence({ v: 1 }, { v: 2 });

      expect(messages).toHaveLength(4);
      expect(messages[0].type).toBe('assistant');
      expect(messages[1].type).toBe('result');
      expect(messages[2].type).toBe('assistant');
      expect(messages[3].type).toBe('result');
    });

    it('should have the second output last (for last-wins testing)', () => {
      const messages = createMultiResultSequence('first', 'second');
      const results = messages.filter(isResultMessage);

      expect(results).toHaveLength(2);
      expect(results[0].structured_output).toBe('first');
      expect(results[1].structured_output).toBe('second');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: SDK Simulator
// ---------------------------------------------------------------------------

describe('SDK Simulator - createSDKSimulator', () => {
  describe('prompt matching', () => {
    it('should match prompts by substring and return the configured sequence', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['analyze the code', createAgentSequence({ analysis: 'done' })],
        ]),
      });

      const gen = queryFn(makeParams('Please analyze the code in src/'));
      const messages = await collectMessages(gen);

      expect(messages).toHaveLength(4);
      const result = messages[3] as SDKResultMessage;
      expect(result.structured_output).toEqual({ analysis: 'done' });
    });

    it('should match the first matching key when multiple could match', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['analyze', createAgentSequence({ matched: 'first' })],
          ['analyze the code', createAgentSequence({ matched: 'second' })],
        ]),
      });

      const gen = queryFn(makeParams('analyze the code'));
      const messages = await collectMessages(gen);

      const result = messages.find(isResultMessage) as SDKResultMessage;
      expect(result.structured_output).toEqual({ matched: 'first' });
    });

    it('should use defaultResponse when no prompt matches', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['specific-key', createAgentSequence({ specific: true })],
        ]),
        defaultResponse: createAgentSequence({ fallback: true }),
      });

      const gen = queryFn(makeParams('something totally different'));
      const messages = await collectMessages(gen);

      const result = messages.find(isResultMessage) as SDKResultMessage;
      expect(result.structured_output).toEqual({ fallback: true });
    });

    it('should emit a bare result with undefined output when no match and no default', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map(),
      });

      const gen = queryFn(makeParams('anything'));
      const messages = await collectMessages(gen);

      expect(messages).toHaveLength(1);
      const result = messages[0] as SDKResultMessage;
      expect(result.type).toBe('result');
      expect(result.structured_output).toBeUndefined();
    });
  });

  describe('throwOnUnmatched', () => {
    it('should throw when no prompt matches and throwOnUnmatched is true', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['specific', createAgentSequence({ found: true })],
        ]),
        throwOnUnmatched: true,
      });

      const gen = queryFn(makeParams('no match here'));

      await expect(collectMessages(gen)).rejects.toThrow('SDK Simulator: no response configured');
    });

    it('should not throw when a match exists even if throwOnUnmatched is true', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['match-me', createAgentSequence({ ok: true })],
        ]),
        throwOnUnmatched: true,
      });

      const gen = queryFn(makeParams('please match-me now'));
      const messages = await collectMessages(gen);

      expect(messages).toHaveLength(4);
    });
  });

  describe('call logging', () => {
    it('should log every call with prompt and options', async () => {
      const { queryFn, calls } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createAgentSequence({ ok: true }),
      });

      const opts1: QueryOptions['options'] = { model: 'claude-opus-4-6' };
      const opts2: QueryOptions['options'] = { maxTurns: 5, model: 'claude-sonnet-4-20250514' };

      await collectMessages(queryFn(makeParams('first call', opts1)));
      await collectMessages(queryFn(makeParams('second call', opts2)));

      expect(calls).toHaveLength(2);
      expect(calls[0].prompt).toBe('first call');
      expect(calls[0].options).toEqual(opts1);
      expect(calls[1].prompt).toBe('second call');
      expect(calls[1].options).toEqual(opts2);
    });

    it('should record timestamps in order', async () => {
      const { queryFn, calls } = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createEmptySequence(),
      });

      await collectMessages(queryFn(makeParams('call-1')));
      await collectMessages(queryFn(makeParams('call-2')));
      await collectMessages(queryFn(makeParams('call-3')));

      expect(calls).toHaveLength(3);
      expect(calls[0].timestamp).toBeLessThanOrEqual(calls[1].timestamp);
      expect(calls[1].timestamp).toBeLessThanOrEqual(calls[2].timestamp);
    });

    it('should still log calls even when throwOnUnmatched causes an error', async () => {
      const { queryFn, calls } = createSDKSimulator({
        responses: new Map(),
        throwOnUnmatched: true,
      });

      try {
        await collectMessages(queryFn(makeParams('unmatched')));
      } catch {
        // expected
      }

      expect(calls).toHaveLength(1);
      expect(calls[0].prompt).toBe('unmatched');
    });
  });

  describe('async generator contract', () => {
    it('should be consumable with for-await-of (matching engine usage)', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['test', createAgentSequence({ result: 'ok' })],
        ]),
      });

      // Mimic engine's consumption pattern
      let lastOutput: unknown = null;
      const gen = queryFn(makeParams('test'));
      for await (const message of gen) {
        if (isResultMessage(message) && message.subtype === 'success' && message.structured_output != null) {
          lastOutput = message.structured_output;
        }
      }

      expect(lastOutput).toEqual({ result: 'ok' });
    });

    it('should handle empty sequences gracefully (generator completes immediately)', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['empty', []],
        ]),
      });

      const messages = await collectMessages(queryFn(makeParams('empty')));
      expect(messages).toHaveLength(0);
    });

    it('should handle last-wins correctly when consumed like the engine', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['multi', createMultiResultSequence({ v: 1 }, { v: 2 })],
        ]),
      });

      let lastOutput: unknown = null;
      const gen = queryFn(makeParams('multi'));
      for await (const message of gen) {
        if (isResultMessage(message) && message.subtype === 'success' && message.structured_output != null) {
          lastOutput = message.structured_output;
        }
      }

      // Last result wins, matching engine behavior
      expect(lastOutput).toEqual({ v: 2 });
    });

    it('should handle error sequences by detecting non-success subtypes', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['fail', createErrorSequence('error_max_turns', ['exceeded limit'])],
        ]),
      });

      // Mimic engine's error detection pattern
      let thrownError: Error | null = null;
      const gen = queryFn(makeParams('fail'));
      for await (const message of gen) {
        if (isResultMessage(message) && message.subtype !== 'success') {
          const errors = message.errors?.join(', ') ?? 'unknown error';
          thrownError = new Error(`Agent failed: ${message.subtype} - ${errors}`);
        }
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toContain('error_max_turns');
      expect(thrownError!.message).toContain('exceeded limit');
    });

    it('should yield null output sequence where structured_output is null', async () => {
      const { queryFn } = createSDKSimulator({
        responses: new Map([
          ['null-out', createNullOutputSequence()],
        ]),
      });

      let lastOutput: unknown = 'sentinel';
      const gen = queryFn(makeParams('null-out'));
      for await (const message of gen) {
        if (isResultMessage(message) && message.subtype === 'success' && message.structured_output != null) {
          lastOutput = message.structured_output;
        }
      }

      // structured_output is null, so the condition (structured_output != null) is false
      // and lastOutput should remain as the sentinel
      expect(lastOutput).toBe('sentinel');
    });
  });

  describe('multiple simulators', () => {
    it('should maintain independent call logs', async () => {
      const sim1 = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createEmptySequence(),
      });
      const sim2 = createSDKSimulator({
        responses: new Map(),
        defaultResponse: createEmptySequence(),
      });

      await collectMessages(sim1.queryFn(makeParams('to sim1')));
      await collectMessages(sim2.queryFn(makeParams('to sim2')));
      await collectMessages(sim1.queryFn(makeParams('to sim1 again')));

      expect(sim1.calls).toHaveLength(2);
      expect(sim2.calls).toHaveLength(1);
      expect(sim1.calls[0].prompt).toBe('to sim1');
      expect(sim2.calls[0].prompt).toBe('to sim2');
    });
  });
});
