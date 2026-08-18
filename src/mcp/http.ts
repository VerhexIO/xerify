import { timingSafeEqual } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse
} from 'node:http';

import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
  toNodeHandler,
  type NodeIncomingMessageLike,
  type NodeServerResponseLike
} from '@modelcontextprotocol/node';
import {
  createMcpHandler,
  type AuthInfo,
  type McpHttpHandler,
  type McpServerFactory
} from '@modelcontextprotocol/server';

import { XerifyError } from '../core/errors.js';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function isLoopback(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

function tokenMatches(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice('Bearer '.length), 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted);
}

function listen(server: HttpServer, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      resolve();
    });
  });
}

function closeServer(server: HttpServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export interface XerifyHttpServerOptions {
  factory: McpServerFactory;
  host?: string;
  port?: number;
  bearerToken?: string;
  allowPublic?: boolean;
  onerror?: (error: Error) => void;
}

export interface XerifyHttpBoundaryOptions {
  factory: McpServerFactory;
  host: string;
  bearerToken?: string;
  onerror?: (error: Error) => void;
}

export interface XerifyHttpBoundary {
  handle(request: IncomingMessage, response: ServerResponse): Promise<void>;
  close(): Promise<void>;
}

export interface XerifyHttpServerHandle {
  host: string;
  port: number;
  url: string;
  close(): Promise<void>;
}

export function createXerifyHttpBoundary(options: XerifyHttpBoundaryOptions): XerifyHttpBoundary {
  const loopback = isLoopback(options.host);
  const reportError = options.onerror ?? (() => undefined);
  const handler: McpHttpHandler = createMcpHandler(options.factory, {
    legacy: 'stateless',
    onerror: reportError
  });
  const nodeHandler = toNodeHandler(handler, { onerror: reportError });
  const allowedHosts = loopback ? [] : [options.host];
  const validateHost = loopback ? localhostHostValidation() : hostHeaderValidation(allowedHosts);
  const validateOrigin = loopback ? localhostOriginValidation() : originValidation(allowedHosts);

  return {
    async handle(request, response) {
      try {
        const authenticatedRequest = request as typeof request & { auth?: AuthInfo };
        const pathname = new URL(
          request.url ?? '/',
          `http://${request.headers.host ?? options.host}`
        ).pathname;
        if (pathname !== '/mcp') {
          response.writeHead(404, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        if (!validateHost(request, response) || !validateOrigin(request, response)) return;
        if (options.bearerToken) {
          const authorization = Array.isArray(request.headers.authorization)
            ? request.headers.authorization[0]
            : request.headers.authorization;
          if (!tokenMatches(authorization, options.bearerToken)) {
            response.writeHead(401, {
              'content-type': 'application/json',
              'www-authenticate': 'Bearer realm="xerify"'
            });
            response.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }
          const authInfo: AuthInfo = {
            token: options.bearerToken,
            clientId: 'static-bearer',
            scopes: ['mcp']
          };
          authenticatedRequest.auth = authInfo;
        }
        await nodeHandler(
          authenticatedRequest as unknown as NodeIncomingMessageLike,
          response as unknown as NodeServerResponseLike
        );
      } catch (error) {
        reportError(error instanceof Error ? error : new Error(String(error)));
        if (!response.headersSent) {
          response.writeHead(500, { 'content-type': 'application/json' });
        }
        if (!response.writableEnded) {
          response.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    },
    async close() {
      await handler.close();
    }
  };
}

export async function serveXerifyHttp(
  options: XerifyHttpServerOptions
): Promise<XerifyHttpServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 8787;
  const loopback = isLoopback(host);
  if (!loopback && !options.allowPublic) {
    throw new XerifyError(
      'CONFIG_INVALID',
      'Public MCP bind requires explicit --allow-public confirmation'
    );
  }
  if (!loopback && !options.bearerToken) {
    throw new XerifyError('AUTH_UNAVAILABLE', 'Public MCP bind requires bearer authentication');
  }

  const boundary = createXerifyHttpBoundary({
    factory: options.factory,
    host,
    ...(options.bearerToken === undefined ? {} : { bearerToken: options.bearerToken }),
    ...(options.onerror === undefined ? {} : { onerror: options.onerror })
  });
  const server = createServer((request, response) => void boundary.handle(request, response));

  try {
    await listen(server, port, host);
  } catch (error) {
    await boundary.close();
    throw error;
  }
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  return {
    host,
    port: actualPort,
    url: `http://${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${actualPort}/mcp`,
    async close() {
      await boundary.close();
      await closeServer(server);
    }
  };
}
