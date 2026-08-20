import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const LANGUAGES = ['tr', 'de', 'zh-CN', 'es', 'fr'] as const;

// Every localized page and the English source it must mirror. Evidence files under
// docs/examples/evidence are deliberately absent: they are hash-anchored verification
// artifacts, and translating them would break the correspondence recorded in run history.
const PAGES: ReadonlyArray<readonly [string, string]> = [
  ['README.md', 'docs/README.md'],
  ['installation.md', 'docs/installation.md'],
  ['configuration.md', 'docs/configuration.md'],
  ['cli-reference.md', 'docs/cli-reference.md'],
  ['provider-adapters.md', 'docs/provider-adapters.md'],
  ['channels.md', 'docs/channels.md'],
  ['json-contract.md', 'docs/json-contract.md'],
  ['run-history.md', 'docs/run-history.md'],
  ['mcp.md', 'docs/mcp.md'],
  ['compatibility.md', 'docs/compatibility.md'],
  ['architecture.md', 'docs/architecture.md'],
  ['security.md', 'SECURITY.md'],
  ['examples/README.md', 'docs/examples/README.md'],
  ['examples/dogfooding.md', 'docs/examples/dogfooding.md'],
  ['examples/failure-modes.md', 'docs/examples/failure-modes.md'],
  ['examples/no-account-walkthrough.md', 'docs/examples/no-account-walkthrough.md'],
  ['examples/research-paper.md', 'docs/examples/research-paper.md'],
  ['examples/game-design.md', 'docs/examples/game-design.md'],
  ['examples/website-decision.md', 'docs/examples/website-decision.md'],
  ['examples/data-analysis.md', 'docs/examples/data-analysis.md'],
  ['examples/outbound-data-policy.md', 'docs/examples/outbound-data-policy.md'],
  ['examples/dogfood-cursor-adapter.md', 'docs/examples/dogfood-cursor-adapter.md'],
  ['examples/dogfood-package-boundary.md', 'docs/examples/dogfood-package-boundary.md']
];

// Identifiers a translation must never localize. Each is checked only in pages whose English
// source contains it, so the list can stay short and meaningful.
const PRESERVED = [
  '`--json`',
  '`--from`',
  '`--to`',
  '`verify`',
  '`ask`',
  '`confirmed`',
  '`refuted`',
  '`unclear`',
  '`xverify-cli`',
  '`INVALID_PROVIDER_RESPONSE`',
  '`PROVIDER_UNAVAILABLE`',
  '`SAME_PROVIDER`'
] as const;

function read(relative: string): string {
  return readFileSync(path.join(repositoryRoot, relative), 'utf8');
}

function headings(markdown: string): number {
  return markdown.split('\n').filter((line) => /^#{1,6} /.test(line)).length;
}

function fences(markdown: string): number {
  return markdown.split('\n').filter((line) => line.trimStart().startsWith('```')).length;
}

describe('localized documentation', () => {
  it('publishes every consumer page in every supported language', () => {
    for (const language of LANGUAGES) {
      for (const [page] of PAGES) {
        const target = path.join('docs', 'i18n', language, page);
        expect(() => read(target), `${target} is missing`).not.toThrow();
      }
    }
  });

  it('mirrors the structure of the canonical English source', () => {
    for (const language of LANGUAGES) {
      for (const [page, source] of PAGES) {
        const english = read(source);
        const localized = read(path.join('docs', 'i18n', language, page));
        expect(headings(localized), `${language}/${page} heading count`).toBe(headings(english));
        expect(fences(localized), `${language}/${page} code fence count`).toBe(fences(english));
      }
    }
  });

  it('is a full translation rather than a summary', () => {
    for (const language of LANGUAGES) {
      for (const [page, source] of PAGES) {
        const english = read(source);
        const localized = read(path.join('docs', 'i18n', language, page));
        // Compare UTF-8 byte length, not character count: Chinese needs far fewer characters
        // than English for the same content but a comparable number of bytes. This only catches
        // a page that was summarized rather than translated.
        const englishBytes = Buffer.byteLength(english, 'utf8');
        const localizedBytes = Buffer.byteLength(localized, 'utf8');
        expect(localizedBytes, `${language}/${page} looks condensed`).toBeGreaterThan(
          englishBytes * 0.6
        );
      }
    }
  });

  it('never localizes command names, flags, verdicts, or error codes', () => {
    for (const language of LANGUAGES) {
      for (const [page, source] of PAGES) {
        const english = read(source);
        const localized = read(path.join('docs', 'i18n', language, page));
        for (const token of PRESERVED) {
          if (!english.includes(token)) continue;
          expect(localized, `${language}/${page} dropped ${token}`).toContain(token);
        }
      }
    }
  });

  it('keeps hash-anchored evidence out of the localized tree', () => {
    for (const language of LANGUAGES) {
      const evidence = path.join('docs', 'i18n', language, 'examples', 'evidence');
      expect(() => read(path.join(evidence, 'research-paper.md'))).toThrow();
    }
  });
});
