import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'));
const expectedTag = `v${packageJson.version}`;
const actualTag = process.env.GITHUB_REF_NAME;

if (actualTag !== expectedTag) {
  throw new Error(`Release tag ${actualTag ?? '<missing>'} does not match ${expectedTag}`);
}

process.stdout.write(`version=${packageJson.version}\n`);
process.stdout.write(`tarball=artifacts/xerify-${packageJson.version}.tgz\n`);
