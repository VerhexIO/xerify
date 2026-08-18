import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const provider = process.env.XERIFY_LIVE_PROVIDER;
const model = process.env.XERIFY_LIVE_MODEL;
const confirmed = process.env.XERIFY_LIVE_CONFIRM_BILLABLE;

if (confirmed !== 'YES') {
  throw new Error(
    'Set XERIFY_LIVE_CONFIRM_BILLABLE=YES to acknowledge a potentially billable call'
  );
}
if (provider !== 'claude' && provider !== 'codex') {
  throw new Error('XERIFY_LIVE_PROVIDER must be claude or codex');
}
if (!model) throw new Error('XERIFY_LIVE_MODEL is required');

const organization = provider === 'claude' ? 'anthropic' : 'openai';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'dist', 'cli', 'entry.js');
const args = [
  entry,
  '--json',
  '--timeout',
  '120000',
  'ask',
  '--to',
  `${organization}:${model}`,
  '--adapter',
  provider,
  '--question',
  'Reply with LIVE_SMOKE_OK. This is a minimal Xerify adapter smoke test.'
];

const result = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk;
  });
  child.once('error', reject);
  child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
});

if (result.code !== 0) {
  throw new Error(
    `Live smoke failed (exit=${String(result.code)}, signal=${String(result.signal)}): ${result.stderr.trim()}`
  );
}
const envelope = JSON.parse(result.stdout);
if (envelope?.ok !== true || typeof envelope?.data?.answer !== 'string') {
  throw new Error('Live smoke did not return the stable Xerify ask envelope');
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    provider,
    model,
    xerifySchemaVersion: envelope.schemaVersion,
    usage: envelope.data.usage,
    durationMs: envelope.data.durationMs
  })}\n`
);
