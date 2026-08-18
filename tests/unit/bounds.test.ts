import { describe, expect, it } from 'vitest';

import { BoundedCollector, truncateUtf8 } from '../../src/process/bounds.js';

describe('UTF-8 bounds', () => {
  it('never returns a partial multi-byte character', () => {
    const result = truncateUtf8('abc😀def', 5);
    expect(result.text).toBe('abc');
    expect(Buffer.byteLength(result.text)).toBeLessThanOrEqual(5);
    expect(result.truncated).toBe(true);
  });

  it('drains but does not retain bytes beyond the cap', () => {
    const collector = new BoundedCollector(4);
    collector.append('abc');
    collector.append('def');
    expect(collector.result()).toEqual({ text: 'abcd', bytes: 4, truncated: true });
  });
});
