import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_LIMITS } from '../../src/core/contracts.js';
import { AnthropicApiAdapter } from '../../src/providers/anthropic-api.js';
import { OpenAiApiAdapter } from '../../src/providers/openai-api.js';
import { OpenAiCompatibleAdapter } from '../../src/providers/openai-compatible.js';

const verifierPayload = {
  verdict: 'confirmed',
  summary: 'The claim is supported.',
  findings: [{ severity: 'info', message: 'No contradiction found.', evidence: '' }]
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function requestBody(mock: ReturnType<typeof vi.fn<typeof fetch>>): Record<string, unknown> {
  const init = mock.mock.calls[0]?.[1];
  if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(init.body) as Record<string, unknown>;
}

describe('direct API adapters', () => {
  it('uses the OpenAI Responses structured-output contract and parses usage', async () => {
    const request = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify(verifierPayload) }]
          }
        ],
        usage: { input_tokens: 11, output_tokens: 7, total_tokens: 18 }
      })
    );
    const adapter = new OpenAiApiAdapter({
      env: { TEST_OPENAI_KEY: 'secret' },
      apiKeyEnvironment: 'TEST_OPENAI_KEY',
      fetch: request
    });

    const result = await adapter.invoke(
      { operation: 'verify', model: 'gpt-test', prompt: 'verify', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );

    expect(JSON.parse(result.output)).toEqual(verifierPayload);
    expect(result.usage).toEqual({
      inputTokens: 11,
      outputTokens: 7,
      totalTokens: 18,
      costUsd: null
    });
    expect(requestBody(request)).toMatchObject({
      model: 'gpt-test',
      store: false,
      text: { format: { type: 'json_schema', name: 'xerify_verification', strict: true } }
    });
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: 'Bearer secret'
    });
  });

  it('uses the Anthropic Messages structured-output contract and parses usage', async () => {
    const request = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        content: [{ type: 'text', text: JSON.stringify(verifierPayload) }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 13, output_tokens: 9 }
      })
    );
    const adapter = new AnthropicApiAdapter({
      env: { TEST_ANTHROPIC_KEY: 'secret' },
      apiKeyEnvironment: 'TEST_ANTHROPIC_KEY',
      fetch: request
    });

    const result = await adapter.invoke(
      { operation: 'verify', model: 'claude-test', prompt: 'verify', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );

    expect(JSON.parse(result.output)).toEqual(verifierPayload);
    expect(result.usage).toEqual({
      inputTokens: 13,
      outputTokens: 9,
      totalTokens: 22,
      costUsd: null
    });
    expect(requestBody(request)).toMatchObject({
      model: 'claude-test',
      output_config: { format: { type: 'json_schema' } }
    });
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({
      'x-api-key': 'secret',
      'anthropic-version': '2023-06-01'
    });
  });

  it('supports a local OpenAI-compatible endpoint without requiring auth', async () => {
    const request = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        choices: [{ message: { content: 'local answer' } }],
        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 }
      })
    );
    const adapter = new OpenAiCompatibleAdapter({
      id: 'local',
      provider: 'local-lab',
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      env: {},
      fetch: request
    });

    const probe = await adapter.probe({ network: false, timeoutMs: 100 });
    const result = await adapter.invoke(
      { operation: 'ask', model: 'local-model', prompt: 'hello', limits: DEFAULT_LIMITS },
      new AbortController().signal
    );

    expect(probe).toMatchObject({ available: true, auth: { status: 'not-required' } });
    expect(result.output).toBe('local answer');
    expect(requestBody(request)).not.toHaveProperty('response_format');
  });

  it('rejects a missing API key before making a network request', async () => {
    const request = vi.fn<typeof fetch>();
    const adapter = new OpenAiApiAdapter({ env: {}, fetch: request });

    await expect(
      adapter.invoke(
        { operation: 'ask', model: 'gpt-test', prompt: 'hello', limits: DEFAULT_LIMITS },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE', exitCode: 3 });
    expect(request).not.toHaveBeenCalled();
  });

  it('maps an aborting HTTP request to timeout without leaking the key', async () => {
    const request = vi.fn<typeof fetch>(async (_input, init) => {
      await new Promise<void>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return jsonResponse({});
    });
    const adapter = new AnthropicApiAdapter({
      env: { ANTHROPIC_API_KEY: 'never-print-this' },
      fetch: request
    });

    await expect(
      adapter.invoke(
        {
          operation: 'ask',
          model: 'claude-test',
          prompt: 'hello',
          limits: { ...DEFAULT_LIMITS, timeoutMs: 5 }
        },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: 'TIMEOUT', exitCode: 4 });
  });

  it.each([
    ['max_tokens', 'INVALID_PROVIDER_RESPONSE', 6],
    ['refusal', 'PROVIDER_FAILURE', 5]
  ] as const)('maps Anthropic stop reason %s honestly', async (stopReason, code, exitCode) => {
    const request = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        content: [{ type: 'text', text: '{"partial":true}' }],
        stop_reason: stopReason,
        usage: { input_tokens: 2, output_tokens: 1 }
      })
    );
    const adapter = new AnthropicApiAdapter({
      env: { ANTHROPIC_API_KEY: 'secret' },
      fetch: request
    });

    await expect(
      adapter.invoke(
        { operation: 'verify', model: 'claude-test', prompt: 'verify', limits: DEFAULT_LIMITS },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code, exitCode });
  });

  it('maps a structurally invalid API response to exit 6', async () => {
    const request = vi.fn<typeof fetch>(async () => jsonResponse({ status: 'completed' }));
    const adapter = new OpenAiApiAdapter({
      env: { OPENAI_API_KEY: 'secret' },
      fetch: request
    });

    await expect(
      adapter.invoke(
        { operation: 'ask', model: 'gpt-test', prompt: 'hello', limits: DEFAULT_LIMITS },
        new AbortController().signal
      )
    ).rejects.toMatchObject({ code: 'INVALID_PROVIDER_RESPONSE', exitCode: 6 });
  });
});
