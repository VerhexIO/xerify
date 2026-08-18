import type { Readable } from 'node:stream';

import { XerifyError } from '../core/errors.js';
import { BoundedCollector } from '../process/bounds.js';

export async function readStdin(stream: Readable, maxBytes: number): Promise<string> {
  const collector = new BoundedCollector(maxBytes + 1);
  for await (const chunk of stream) collector.append(chunk as Buffer | string);
  const result = collector.result();
  if (result.bytes > maxBytes || result.truncated) {
    throw new XerifyError('INVALID_INPUT', 'Standard input exceeds the configured input limit', {
      details: { maxInputBytes: maxBytes }
    });
  }
  return result.text;
}
