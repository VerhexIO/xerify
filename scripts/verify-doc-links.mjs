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
  return target.length === 0 || target.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(target);
}

// A heading anchor is derived from the heading text, so a translated heading needs a
// translated anchor. This mirrors the slug GitHub generates: strip inline formatting,
// lowercase, spaces to hyphens, drop punctuation, keep letters from any script.
function headingSlug(text) {
  const plain = text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/_([^_]*)_/g, '$1');
  let slug = '';
  for (const character of plain.toLowerCase()) {
    if (/[\p{L}\p{N}\-_]/u.test(character)) slug += character;
    else if (/\s/u.test(character)) slug += '-';
  }
  return slug;
}

function headingSlugs(markdown) {
  const slugs = new Set();
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (heading) slugs.add(headingSlug(heading[1]));
  }
  return slugs;
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
  const ownSlugs = headingSlugs(markdown);
  for (const target of localTargets(markdown)) {
    if (isExternal(target)) continue;
    if (target.startsWith('#')) {
      const fragment = decodeURIComponent(target.slice(1));
      if (!ownSlugs.has(fragment)) {
        failures.push(`${path.relative(repositoryRoot, file)}: no heading matches ${target}`);
      }
      continue;
    }
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
