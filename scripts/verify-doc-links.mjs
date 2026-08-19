import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootMarkdown = [
  'README.md',
  'README.tr.md',
  'README.de.md',
  'README.zh-CN.md',
  'README.es.md',
  'README.fr.md',
  'SECURITY.md',
  'CHANGELOG.md'
];

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return await markdownFiles(target);
      return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
    })
  );
  return nested.flat();
}

function localTargets(markdown) {
  const targets = [];
  const markdownLink = /!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  const htmlLink = /\b(?:href|src)=["']([^"']+)["']/g;
  for (const match of markdown.matchAll(markdownLink)) {
    targets.push(match[1].replace(/^<|>$/g, ''));
  }
  for (const match of markdown.matchAll(htmlLink)) targets.push(match[1]);
  return targets;
}

function isExternal(target) {
  return (
    target.length === 0 ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/i.test(target)
  );
}

const files = [
  ...rootMarkdown.map((file) => path.join(repositoryRoot, file)),
  ...(await markdownFiles(path.join(repositoryRoot, 'docs')))
];
const failures = [];

for (const file of files) {
  let markdown;
  try {
    markdown = await readFile(file, 'utf8');
  } catch {
    failures.push(`${path.relative(repositoryRoot, file)}: missing document`);
    continue;
  }
  for (const target of localTargets(markdown)) {
    if (isExternal(target)) continue;
    const withoutFragment = target.split('#', 1)[0].split('?', 1)[0];
    let decoded;
    try {
      decoded = decodeURIComponent(withoutFragment);
    } catch {
      failures.push(`${path.relative(repositoryRoot, file)}: invalid link encoding ${target}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!resolved.startsWith(`${repositoryRoot}${path.sep}`) && resolved !== repositoryRoot) {
      failures.push(`${path.relative(repositoryRoot, file)}: link escapes repository ${target}`);
      continue;
    }
    try {
      await lstat(resolved);
    } catch {
      failures.push(`${path.relative(repositoryRoot, file)}: missing target ${target}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, markdownFiles: files.length })}\n`);
}
