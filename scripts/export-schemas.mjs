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

const schemas = {
  'ask-request.schema.json': ['urn:xerify:schema:ask-request:v1', AskRequestSchema],
  'ask-result.schema.json': ['urn:xerify:schema:ask-result:v1', AskResultSchema],
  'cli-error.schema.json': ['urn:xerify:schema:cli-error:v1', CliErrorEnvelopeSchema],
  'cli-success.schema.json': ['urn:xerify:schema:cli-success:v1', CliSuccessEnvelopeSchema],
  'config.schema.json': ['urn:xerify:schema:config:v1', FileConfigSchema],
  'error.schema.json': ['urn:xerify:schema:error:v1', ErrorBodySchema],
  'verify-request.schema.json': ['urn:xerify:schema:verify-request:v1', VerifyRequestSchema],
  'verify-result.schema.json': ['urn:xerify:schema:verify-result:v1', VerifyResultSchema]
};

mkdirSync(outputDirectory, { recursive: true });
for (const [filename, [id, schema]] of Object.entries(schemas)) {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12' });
  const output = { $id: id, ...jsonSchema };
  writeFileSync(
    resolve(outputDirectory, filename),
    await format(JSON.stringify(output), { ...prettierOptions, parser: 'json' })
  );
}

process.stdout.write(`${JSON.stringify({ ok: true, schemas: Object.keys(schemas).sort() })}\n`);
