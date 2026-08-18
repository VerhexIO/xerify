import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, writeSync } from 'node:fs';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const scenario = process.argv[2] ?? 'echo';
const input = readFileSync(0, 'utf8');

const retryDelay = new Int32Array(new SharedArrayBuffer(4));

const write = (fileDescriptor, value) => {
  const buffer = Buffer.from(value);
  let offset = 0;
  while (offset < buffer.byteLength) {
    try {
      offset += writeSync(fileDescriptor, buffer, offset, buffer.byteLength - offset);
    } catch (error) {
      if (error?.code !== 'EAGAIN' && error?.code !== 'EWOULDBLOCK') throw error;
      Atomics.wait(retryDelay, 0, 0, 1);
    }
  }
};

switch (scenario) {
  case 'echo':
    await write(1, input);
    break;
  case 'confirmed':
    await write(
      1,
      JSON.stringify({
        verdict: 'confirmed',
        summary: 'The supplied evidence supports the claim.',
        findings: [],
        evidence: [
          {
            reference: 'supplied context',
            observation: 'No material contradiction was present in the bounded fixture.'
          }
        ],
        assumptions: ['The fixture represents all relevant evidence.'],
        limitations: ['No live system was exercised.'],
        unverifiedClaims: []
      })
    );
    break;
  case 'confirmed-crlf':
    await write(
      1,
      `\r\n${JSON.stringify({
        verdict: 'confirmed',
        summary: 'CRLF output is accepted.',
        findings: []
      })}\r\n`
    );
    break;
  case 'refuted':
    await write(
      1,
      JSON.stringify({
        verdict: 'refuted',
        summary: 'The supplied evidence contradicts the claim.',
        findings: [
          {
            severity: 'high',
            message: 'Contradicting evidence was found.',
            evidence: 'supplied context'
          }
        ],
        evidence: [
          {
            reference: 'supplied context',
            observation: 'The fixture contains a direct contradiction.'
          }
        ],
        assumptions: [],
        limitations: [],
        unverifiedClaims: []
      })
    );
    break;
  case 'malformed':
    await write(1, '{"verdict":');
    break;
  case 'prose':
    await write(1, 'Looks good to me.');
    break;
  case 'stderr':
    await write(2, 'fixture failed');
    process.exitCode = 7;
    break;
  case 'huge':
    await write(1, 'x'.repeat(256 * 1024));
    break;
  case 'delay':
    await delay(5_000);
    await write(1, '{}');
    break;
  case 'descendant': {
    const marker = process.argv[3];
    if (!marker) throw new Error('descendant scenario requires a marker path');
    const descendant = spawn(
      process.execPath,
      [
        '-e',
        "const fs=require('node:fs');const marker=process.argv[1];process.on('SIGTERM',()=>{fs.writeFileSync(marker,'terminated');process.exit(0)});setInterval(()=>{},1000)",
        marker
      ],
      { stdio: 'ignore' }
    );
    writeFileSync(`${marker}.pid`, String(descendant.pid));
    await delay(5_000);
    break;
  }
  case 'codex-jsonl':
    await write(
      1,
      [
        JSON.stringify({ type: 'thread.started', thread_id: 'fixture' }),
        JSON.stringify({
          type: 'item.completed',
          item: {
            type: 'agent_message',
            text: JSON.stringify({
              verdict: 'confirmed',
              summary: 'Codex confirms the claim.',
              findings: [],
              evidence: [],
              assumptions: [],
              limitations: ['Fixture output only.'],
              unverifiedClaims: []
            })
          }
        }),
        JSON.stringify({
          type: 'turn.completed',
          usage: { input_tokens: 12, output_tokens: 8, cached_input_tokens: 3 }
        })
      ].join('\n')
    );
    break;
  case 'claude-json':
    await write(
      1,
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'Claude answer',
        structured_output: {
          verdict: 'refuted',
          summary: 'Claude found contradicting evidence.',
          findings: [],
          evidence: [],
          assumptions: [],
          limitations: ['Fixture output only.'],
          unverifiedClaims: []
        },
        total_cost_usd: 0.01,
        usage: { input_tokens: 14, output_tokens: 9 }
      })
    );
    break;
  case 'cursor-json':
    await write(
      1,
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: JSON.stringify({
          verdict: 'refuted',
          summary: 'Cursor found contradicting evidence.',
          findings: [],
          evidence: [],
          assumptions: [],
          limitations: ['Fixture output only.'],
          unverifiedClaims: []
        }),
        usage: {
          inputTokens: 16,
          outputTokens: 11,
          cacheReadTokens: 4,
          cacheWriteTokens: 20
        }
      })
    );
    break;
  case 'cursor-inspect':
    await write(
      1,
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: JSON.stringify({ argv: process.argv.slice(3), input, cwd: process.cwd() })
      })
    );
    break;
  case 'inspect-raw':
    await write(1, JSON.stringify({ argv: process.argv.slice(3), input, cwd: process.cwd() }));
    break;
  default:
    await write(2, `unknown scenario: ${scenario}`);
    process.exitCode = 2;
}
