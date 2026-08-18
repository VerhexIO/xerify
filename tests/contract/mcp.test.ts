import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  InMemoryTransport,
  PROTOCOL_VERSION_META_KEY,
  type JSONRPCMessage,
  type JSONRPCResponse
} from '@modelcontextprotocol/server';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AskRequestSchema } from '../../src/core/contracts.js';
import { createXerifyHttpBoundary, serveXerifyHttp } from '../../src/mcp/http.js';
import {
  createXerifyMcpFactory,
  createXerifyMcpServer,
  XERIFY_MCP_TOOLS
} from '../../src/mcp/server.js';
import { serveXerifyStdio } from '../../src/mcp/stdio.js';
import { RunHistoryStore } from '../../src/history/store.js';
import { CommandAdapter } from '../../src/providers/command.js';
import { ProviderRegistry } from '../../src/providers/registry.js';

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fake-provider.mjs'
);
const temporaryDirectories: string[] = [];

function historyAt(root: string, enabled: boolean): RunHistoryStore {
  return new RunHistoryStore({
    enabled,
    directory: path.join(root, 'runs'),
    archiveDirectory: path.join(root, 'archive'),
    captureInput: 'full',
    captureOutput: 'normalized',
    sequencePadding: 6
  });
}

function disabledHistory(): RunHistoryStore {
  return historyAt(path.join(os.tmpdir(), 'xerify-disabled-mcp-history'), false);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
  );
});

const modernMeta = {
  [PROTOCOL_VERSION_META_KEY]: '2026-07-28',
  [CLIENT_INFO_META_KEY]: { name: 'xerify-test', version: '1.0.0' },
  [CLIENT_CAPABILITIES_META_KEY]: {}
};

interface InMemoryChannel {
  request(message: JSONRPCMessage & { id: string | number }): Promise<JSONRPCResponse>;
  notify(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;
}

async function openChannel(
  registry = new ProviderRegistry(),
  history = disabledHistory()
): Promise<InMemoryChannel> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const handle = serveXerifyStdio(createXerifyMcpFactory({ registry, history }), {
    transport: serverTransport
  });
  const pending = new Map<string | number, (message: JSONRPCResponse) => void>();
  clientTransport.onmessage = (message) => {
    if (
      'id' in message &&
      message.id !== undefined &&
      ('result' in message || 'error' in message)
    ) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
  };
  await clientTransport.start();
  return {
    request(message) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(message.id);
          reject(new Error(`Timed out waiting for MCP response ${String(message.id)}`));
        }, 2_000);
        pending.set(message.id, (response) => {
          clearTimeout(timeout);
          resolve(response);
        });
        void clientTransport.send(message).catch((error: unknown) => {
          clearTimeout(timeout);
          pending.delete(message.id);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    },
    async notify(message) {
      await clientTransport.send(message);
    },
    async close() {
      await handle.close();
    }
  };
}

function resultOf(response: JSONRPCResponse): Record<string, unknown> {
  if ('error' in response) throw new Error(response.error.message);
  return response.result;
}

describe('MCP v2 contract', () => {
  it('derives the advertised ask input schema from the canonical core schema', () => {
    const server = createXerifyMcpServer({
      registry: new ProviderRegistry(),
      history: disabledHistory()
    });
    const advertised = server.toolInputSchemaJson(XERIFY_MCP_TOOLS.ask);
    const canonical = z.toJSONSchema(AskRequestSchema);
    expect(advertised?.properties).toEqual(canonical.properties);
    expect(advertised).toMatchObject({
      additionalProperties: false,
      required: ['to', 'question']
    });
  });

  it('does not advertise observed provenance as caller-assertable verification input', () => {
    const server = createXerifyMcpServer({
      registry: new ProviderRegistry(),
      history: disabledHistory()
    });
    const advertised = server.toolInputSchemaJson(XERIFY_MCP_TOOLS.verify) as
      | {
          properties?: {
            from?: { properties?: { provenance?: { enum?: string[] } } };
          };
        }
      | undefined;
    expect(advertised?.properties?.from?.properties?.provenance?.enum).toEqual([
      'declared',
      'unknown'
    ]);
  });

  it('serves a legacy initialize and tool listing over the STDIO entry', async () => {
    const channel = await openChannel();
    try {
      const initialized = resultOf(
        await channel.request({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'legacy-test', version: '1.0.0' }
          }
        })
      );
      expect(initialized).toMatchObject({ protocolVersion: '2025-11-25' });
      await channel.notify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      });
      const listed = resultOf(
        await channel.request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
      );
      expect(listed.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: XERIFY_MCP_TOOLS.ask }),
          expect.objectContaining({ name: XERIFY_MCP_TOOLS.verify }),
          expect.objectContaining({ name: XERIFY_MCP_TOOLS.capabilities })
        ])
      );
    } finally {
      await channel.close();
    }
  });

  it('serves modern discovery and tools with the per-request envelope over STDIO', async () => {
    const channel = await openChannel();
    try {
      const discovery = resultOf(
        await channel.request({
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
          params: { _meta: modernMeta }
        })
      );
      expect(discovery).toMatchObject({ supportedVersions: ['2026-07-28'] });
      const listed = resultOf(
        await channel.request({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: { _meta: modernMeta }
        })
      );
      expect(listed).toMatchObject({ resultType: 'complete' });
      expect(listed.tools).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: XERIFY_MCP_TOOLS.verify })])
      );
    } finally {
      await channel.close();
    }
  });

  it('runs the verification tool through the same core and provider registry', async () => {
    const registry = new ProviderRegistry([
      new CommandAdapter({
        id: 'fixture',
        provider: 'fixture',
        executable: process.execPath,
        args: [fixture, 'confirmed'],
        authKind: 'local',
        structuredOutput: true,
        env: {}
      })
    ]);
    const historyRoot = await mkdtemp(path.join(os.tmpdir(), 'xerify-mcp-history-test-'));
    temporaryDirectories.push(historyRoot);
    const history = historyAt(historyRoot, true);
    const channel = await openChannel(registry, history);
    try {
      await channel.request({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'tool-test', version: '1.0.0' }
        }
      });
      await channel.notify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      });
      const called = resultOf(
        await channel.request({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: XERIFY_MCP_TOOLS.verify,
            arguments: {
              from: { provider: 'openai', model: 'author', provenance: 'declared' },
              to: { provider: 'fixture', model: 'verifier', provenance: 'declared' },
              claim: 'The fixture is deterministic.'
            }
          }
        })
      );
      expect(called).toMatchObject({
        structuredContent: { verdict: 'confirmed', failure: null }
      });
      expect(called.isError).not.toBe(true);
      await expect(history.list()).resolves.toMatchObject([
        {
          operation: 'verify',
          surface: 'mcp',
          status: 'completed',
          outcome: { exitCode: 0, verdict: 'confirmed' }
        }
      ]);
    } finally {
      await channel.close();
    }
  });

  it('enforces HTTP bearer and Origin checks at the server boundary', async () => {
    const boundary = createXerifyHttpBoundary({
      factory: createXerifyMcpFactory({
        registry: new ProviderRegistry(),
        history: disabledHistory()
      }),
      host: '127.0.0.1',
      bearerToken: 'test-token'
    });
    const response = () => {
      let status = 0;
      let body = '';
      const value = {
        headersSent: false,
        writableEnded: false,
        writeHead(code: number) {
          status = code;
          value.headersSent = true;
          return value;
        },
        end(chunk?: string | Uint8Array) {
          body = chunk?.toString() ?? '';
          value.writableEnded = true;
          return value;
        },
        get status() {
          return status;
        },
        get body() {
          return body;
        }
      };
      return value;
    };
    try {
      const unauthorized = response();
      await boundary.handle(
        { url: '/mcp', headers: { host: '127.0.0.1' } } as never,
        unauthorized as never
      );
      expect(unauthorized.status).toBe(401);
      expect(unauthorized.body).not.toContain('test-token');

      const rejectedOrigin = response();
      await boundary.handle(
        {
          url: '/mcp',
          headers: {
            host: '127.0.0.1',
            authorization: 'Bearer test-token',
            origin: 'https://attacker.example'
          }
        } as never,
        rejectedOrigin as never
      );
      expect(rejectedOrigin.status).toBe(403);
    } finally {
      await boundary.close();
    }
  });

  it('rejects public HTTP bind without explicit confirmation and authentication', async () => {
    const factory = createXerifyMcpFactory({
      registry: new ProviderRegistry(),
      history: disabledHistory()
    });
    await expect(
      serveXerifyHttp({ factory, host: '0.0.0.0', port: 0, bearerToken: 'token' })
    ).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
    await expect(
      serveXerifyHttp({ factory, host: '0.0.0.0', port: 0, allowPublic: true })
    ).rejects.toMatchObject({ code: 'AUTH_UNAVAILABLE' });
  });
});
