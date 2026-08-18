import {
  serveStdio,
  type ServeStdioOptions,
  type StdioServerHandle
} from '@modelcontextprotocol/server/stdio';

import type { McpServerFactory } from '@modelcontextprotocol/server';

export function serveXerifyStdio(
  factory: McpServerFactory,
  options: Omit<ServeStdioOptions, 'legacy'> = {}
): StdioServerHandle {
  return serveStdio(factory, { ...options, legacy: 'serve' });
}
