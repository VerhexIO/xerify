import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z, type ZodType } from 'zod';

import {
  AskRequestSchema,
  AskResultSchema,
  CliErrorEnvelopeSchema,
  CliSuccessEnvelopeSchema,
  ErrorBodySchema,
  VerifyRequestSchema,
  VerifyResultSchema
} from '../../src/core/contracts.js';
import { FileConfigSchema } from '../../src/config/schema.js';

// The same map `scripts/export-schemas.mjs` exports from, restated against `src` rather than
// `dist`. Keeping it here lets the freshness test below run inside `npm test`.
const MANIFEST: Record<string, readonly [string, ZodType, 'input' | 'output']> = {
  'ask-request.schema.json': ['urn:xerify:schema:ask-request:v1', AskRequestSchema, 'input'],
  'ask-result.schema.json': ['urn:xerify:schema:ask-result:v1', AskResultSchema, 'output'],
  'cli-error.schema.json': ['urn:xerify:schema:cli-error:v1', CliErrorEnvelopeSchema, 'output'],
  'cli-success.schema.json': [
    'urn:xerify:schema:cli-success:v1',
    CliSuccessEnvelopeSchema,
    'output'
  ],
  'config.schema.json': ['urn:xerify:schema:config:v1', FileConfigSchema, 'input'],
  'error.schema.json': ['urn:xerify:schema:error:v1', ErrorBodySchema, 'output'],
  'verify-request.schema.json': [
    'urn:xerify:schema:verify-request:v1',
    VerifyRequestSchema,
    'input'
  ],
  'verify-result.schema.json': ['urn:xerify:schema:verify-result:v1', VerifyResultSchema, 'output']
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

interface JsonSchema {
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: JsonSchema;
  oneOf?: JsonSchema[];
  const?: unknown;
}

function published(name: string): JsonSchema {
  return JSON.parse(readFileSync(path.join(repositoryRoot, 'schemas', name), 'utf8')) as JsonSchema;
}

function commandAdapterBranch(config: JsonSchema): JsonSchema {
  const branches = config.properties?.providers?.additionalProperties?.oneOf ?? [];
  const branch = branches.find((entry) => entry.properties?.kind?.const === 'command');
  expect(branch, 'the config schema has no command-adapter branch').toBeDefined();
  return branch as JsonSchema;
}

describe('published JSON Schemas', () => {
  // Zod projects from the output side by default, where every `.default()` field is already
  // populated and therefore lands in `required`. A caller validating a request against that
  // projection is told to send fields Xerify fills in itself, so the published contract rejects
  // requests the tool accepts. Request-shaped schemas must be exported from the input side.
  it('requires of a request exactly what the runtime requires', () => {
    const cases = [
      ['ask-request.schema.json', AskRequestSchema],
      ['verify-request.schema.json', VerifyRequestSchema]
    ] as const;

    for (const [filename, schema] of cases) {
      const runtime = z.toJSONSchema(schema, {
        target: 'draft-2020-12',
        io: 'input'
      }) as JsonSchema;
      expect(published(filename).required, `${filename} required set`).toEqual(runtime.required);
    }
  });

  it('does not require request fields the runtime supplies itself', () => {
    // These carry `.default()` in the contract; a caller may omit every one of them.
    expect(published('ask-request.schema.json').required).not.toContain('context');
    expect(published('ask-request.schema.json').required).not.toContain('limits');
    expect(published('verify-request.schema.json').required).not.toContain('context');
    expect(published('verify-request.schema.json').required).not.toContain('limits');
  });

  it('keeps result and envelope schemas on the output projection', () => {
    // A consumer reading a result is looking at fully populated output; every field named here
    // is genuinely always present, so narrowing these would understate the guarantee.
    for (const filename of ['ask-result.schema.json', 'verify-result.schema.json']) {
      expect(published(filename).required, `${filename}`).toContain('usage');
      expect(published(filename).required, `${filename}`).toContain('truncation');
    }
  });

  // `generate:schemas` is a separate script and is not part of `npm run check`, so a bound changed
  // in `contracts.ts` reaches the runtime while the checked-in artifact still publishes the old
  // one. That happened: `providerMessage` was capped at 501 in code and published as 2000. The
  // published file is what a consumer validates against, so the drift is the consumer's problem,
  // not a cosmetic one. This test regenerates every schema and fails on any difference.
  it('is regenerated from the current contracts', () => {
    const onDisk = readdirSync(path.join(repositoryRoot, 'schemas'))
      .filter((entry) => entry.endsWith('.schema.json'))
      .sort();
    expect(onDisk, 'a schema file has no manifest entry, or the reverse').toEqual(
      Object.keys(MANIFEST).sort()
    );

    for (const [filename, [id, schema, io]] of Object.entries(MANIFEST)) {
      const expected = { $id: id, ...z.toJSONSchema(schema, { target: 'draft-2020-12', io }) };
      expect(
        published(filename),
        `${filename} is stale — run \`npm run generate:schemas\``
      ).toEqual(expected);
    }
  });

  it('accepts the command adapter exactly as the documentation writes it', () => {
    // README and docs/configuration.md both show a `command` adapter without `authEnvironment`
    // or `reportsUsage`. The runtime accepts that; the published schema has to agree, or an
    // editor wired to `$schema` reports errors on a config Xerify itself validates.
    const documented = {
      kind: 'command' as const,
      provider: 'independent-lab',
      executable: '/absolute/path/to/verifier',
      args: ['--model', '{model}', '--operation', '{operation}'],
      authKind: 'local' as const,
      structuredOutput: true
    };
    expect(() =>
      FileConfigSchema.parse({ providers: { localVerifier: documented } })
    ).not.toThrow();

    const required = commandAdapterBranch(published('config.schema.json')).required ?? [];
    for (const field of required) {
      expect(Object.keys(documented), `config schema requires ${field}`).toContain(field);
    }
  });
});
