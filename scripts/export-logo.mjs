import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { Resvg } from '@resvg/resvg-js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logoRoot = resolve(repositoryRoot, 'assets', 'logos');
const pngDirectory = resolve(logoRoot, 'png');
const reviewDirectory = resolve(logoRoot, 'review');

mkdirSync(pngDirectory, { recursive: true });
mkdirSync(reviewDirectory, { recursive: true });

function readLogo(relativePath) {
  return readFileSync(resolve(logoRoot, relativePath), 'utf8');
}

function render(svg, width, outputPath) {
  const renderer = new Resvg(svg, {
    background: 'rgba(0, 0, 0, 0)',
    fitTo: { mode: 'width', value: width }
  });
  writeFileSync(outputPath, renderer.render().asPng());
}

const standardIcon = readLogo('icon-only/xerify-icon-light.svg');
const optimized16 = readLogo('icon-only/xerify-icon-16.svg');
const optimized32 = readLogo('icon-only/xerify-icon-32.svg');

for (const size of [16, 24, 32, 64, 128, 256, 512, 1024]) {
  const source = size <= 24 ? optimized16 : size === 32 ? optimized32 : standardIcon;
  render(source, size, resolve(pngDirectory, `xerify-icon-${size}.png`));
}

function dataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const horizontalLight = dataUri(readLogo('full-horizontal/xerify-horizontal-light.svg'));
const horizontalDark = dataUri(readLogo('full-horizontal/xerify-horizontal-dark.svg'));
const icon16 = dataUri(optimized16);
const icon32 = dataUri(optimized32);
const iconStandard = dataUri(standardIcon);

const contactSheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" fill="#fff"/>
  <text x="70" y="72" fill="#111827" font-family="sans-serif" font-size="36" font-weight="700">Xerify geometry and color review</text>
  <rect x="60" y="105" width="700" height="300" rx="16" fill="#f3f4f6"/>
  <image href="${horizontalLight}" x="95" y="150" width="630" height="252"/>
  <rect x="840" y="105" width="700" height="300" rx="16" fill="#111827"/>
  <image href="${horizontalDark}" x="875" y="150" width="630" height="252"/>
  <text x="70" y="485" fill="#111827" font-family="sans-serif" font-size="26" font-weight="700">Actual-size optical checks</text>
  <g fill="#4b5563" font-family="sans-serif" font-size="18">
    <text x="70" y="550">16 px</text><text x="70" y="620">24 px</text><text x="70" y="700">32 px</text>
    <text x="320" y="550">16 px × 8 preview</text><text x="560" y="550">24 px × 8 preview</text><text x="880" y="550">32 px × 8 preview</text>
    <text x="70" y="875">The dark upper V and green attached inverted V meet at one center to form the composite X.</text>
    <text x="70" y="910">No font, raster, gradient, filter, mask, shadow, or external asset is embedded in the master logos.</text>
  </g>
  <image href="${icon16}" x="170" y="526" width="16" height="16"/>
  <image href="${icon16}" x="170" y="594" width="24" height="24"/>
  <image href="${icon32}" x="170" y="668" width="32" height="32"/>
  <image href="${icon16}" x="320" y="580" width="128" height="128" style="image-rendering:pixelated"/>
  <image href="${icon16}" x="560" y="580" width="192" height="192" style="image-rendering:pixelated"/>
  <image href="${icon32}" x="880" y="580" width="256" height="256" style="image-rendering:pixelated"/>
  <image href="${iconStandard}" x="1250" y="560" width="220" height="220"/>
</svg>\n`;

const contactSheetSvgPath = resolve(reviewDirectory, 'xerify-contact-sheet.svg');
writeFileSync(contactSheetSvgPath, contactSheet);
render(contactSheet, 1600, resolve(reviewDirectory, 'xerify-contact-sheet.png'));

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    pngSizes: [16, 24, 32, 64, 128, 256, 512, 1024],
    contactSheet: 'assets/logos/review/xerify-contact-sheet.png'
  })}\n`
);
