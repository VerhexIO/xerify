import {
  McpServer,
  type CallToolResult,
  type McpRequestContext,
  type McpServerFactory
} from '@modelcontextprotocol/server';
import { z } from 'zod';

import {
  AskRequestSchema,
  AskResultSchema,
  SCHEMA_VERSION,
  VerifyRequestSchema,
  VerifyResultSchema
} from '../core/contracts.js';
import { toXerifyError } from '../core/errors.js';
import { executeAsk, executeVerify } from '../core/execute.js';
import type { ProviderRegistry } from '../providers/registry.js';

export const MCP_PROTOCOL_REVISION = '2026-07-28' as const;
export const XERIFY_MCP_TOOLS = {
  ask: 'xerify_ask',
  verify: 'xerify_verify',
  capabilities: 'xerify_capabilities'
} as const;

const EmptyInputSchema = z.object({}).strict();
const CapabilitiesOutputSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    protocolRevision: z.literal(MCP_PROTOCOL_REVISION),
    eras: z.tuple([z.literal('modern'), z.literal('legacy')]),
    authenticated: z.boolean(),
    clientId: z.string().nullable(),
    providers: z.array(
      z
        .object({
          id: z.string(),
          provider: z.string(),
          transports: z.array(z.enum(['command', 'http'])),
          authKinds: z.array(z.enum(['subscription', 'api-key', 'local', 'unknown'])),
          structuredOutput: z.boolean(),
          reportsUsage: z.boolean(),
          supportsAbort: z.boolean()
        })
        .strict()
    )
  })
  .strict();

const externalCallAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
} as const;

const localDiscoveryAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
} as const;

function successResult(value: object): CallToolResult {
  const structuredContent = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
    structuredContent
  };
}

function errorResult(error: unknown): CallToolResult {
  const typed = toXerifyError(error);
  const body = typed.toBody();
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ ok: false, error: body }) }]
  };
}

export interface XerifyMcpServerOptions {
  registry: ProviderRegistry;
  version?: string;
  requestContext?: McpRequestContext;
}

export function createXerifyMcpServer(options: XerifyMcpServerOptions): McpServer {
  const server = new McpServer(
    { name: 'xerify', version: options.version ?? '0.1.0' },
    { capabilities: { tools: { listChanged: false } } }
  );

  server.registerTool(
    XERIFY_MCP_TOOLS.ask,
    {
      title: 'Ask another provider',
      description: 'Ask a configured AI provider for an independent second opinion.',
      inputSchema: AskRequestSchema,
      outputSchema: AskResultSchema,
      annotations: externalCallAnnotations
    },
    async (request, context) => {
      try {
        return successResult(
          await executeAsk(request, options.registry, { signal: context.mcpReq.signal })
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    XERIFY_MCP_TOOLS.verify,
    {
      title: 'Verify a claim',
      description: 'Verify a claim with a provider organization different from its author.',
      inputSchema: VerifyRequestSchema,
      outputSchema: VerifyResultSchema,
      annotations: externalCallAnnotations
    },
    async (request, context) => {
      try {
        return successResult(
          await executeVerify(request, options.registry, { signal: context.mcpReq.signal })
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    XERIFY_MCP_TOOLS.capabilities,
    {
      title: 'Show Xerify capabilities',
      description:
        'List local provider adapters and protocol capabilities without a provider call.',
      inputSchema: EmptyInputSchema,
      outputSchema: CapabilitiesOutputSchema,
      annotations: localDiscoveryAnnotations
    },
    async () => {
      const authInfo = options.requestContext?.authInfo;
      return successResult({
        schemaVersion: SCHEMA_VERSION,
        protocolRevision: MCP_PROTOCOL_REVISION,
        eras: ['modern', 'legacy'] as const,
        authenticated: authInfo !== undefined,
        clientId: authInfo?.clientId ?? null,
        providers: options.registry.list().map((adapter) => ({
          id: adapter.id,
          ...adapter.capabilities()
        }))
      });
    }
  );

  return server;
}

export function createXerifyMcpFactory(
  options: Omit<XerifyMcpServerOptions, 'requestContext'>
): McpServerFactory {
  return (requestContext) => createXerifyMcpServer({ ...options, requestContext });
}
