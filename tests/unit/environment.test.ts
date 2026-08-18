import { describe, expect, it } from 'vitest';

import { buildChildEnvironment } from '../../src/process/environment.js';

describe('child environment allowlist', () => {
  it('does not blindly forward unrelated secrets', () => {
    const result = buildChildEnvironment(
      { PATH: '/bin', OPENAI_API_KEY: 'allowed', UNRELATED_SECRET: 'blocked' },
      ['OPENAI_API_KEY']
    );
    expect(result).toEqual({ PATH: '/bin', OPENAI_API_KEY: 'allowed' });
  });
});
