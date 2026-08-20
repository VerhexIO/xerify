import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { format, resolveConfig } from 'prettier';
import { z } from 'zod';

import {
  AskRequestSchema,
  AskResultSchema,
  CliErrorEnvelopeSchema,
  CliSuccessEnvelopeSchema,
  ErrorBodySchema,
  VerifyRequestSchema,
  VerifyResultSchema
} from '../dist/core/contracts.js';
import { FileConfigSchema } from '../dist/config/schema.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(repositoryRoot, 'schemas');
const prettierOptions = (await resolveConfig(resolve(repositoryRoot, 'package.json'))) ?? {};

// A schema someone validates *before* calling Xerify must be projected from the input side.
// Zod's default projection is the output side, where every `.default()` field is already
// populated and therefore required — which would reject requests and config files that Xerify
// itself accepts. Result and envelope schemas describe what Xerify produces, so they keep the
// output projection.
const schemas = {
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

mkdirSync(outputDirectory, { recursive: true });
for (const [filename, [id, schema, io]] of Object.entries(schemas)) {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12', io });
  const output = { $id: id, ...jsonSchema };
  writeFileSync(
    resolve(outputDirectory, filename),
    await format(JSON.stringify(output), { ...prettierOptions, parser: 'json' })
  );
}

process.stdout.write(`${JSON.stringify({ ok: true, schemas: Object.keys(schemas).sort() })}\n`);
