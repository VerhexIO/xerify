import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const requiredSvgAssets = [
  'assets/logos/source/xerify-master.svg',
  'assets/logos/full-horizontal/xerify-horizontal-dark.svg',
  'assets/logos/full-horizontal/xerify-horizontal-light.svg',
  'assets/logos/icon-only/xerify-icon-dark.svg',
  'assets/logos/icon-only/xerify-icon-light.svg',
  'assets/logos/icon-only/xerify-icon-16.svg',
  'assets/logos/icon-only/xerify-icon-32.svg',
  'assets/logos/monochrome/xerify-black.svg',
  'assets/logos/monochrome/xerify-white.svg'
] as const;

const iconSvgAssets = [
  'assets/logos/icon-only/xerify-icon-dark.svg',
  'assets/logos/icon-only/xerify-icon-light.svg',
  'assets/logos/icon-only/xerify-icon-16.svg',
  'assets/logos/icon-only/xerify-icon-32.svg'
] as const;

describe('logo asset contract', () => {
  it.each(requiredSvgAssets)(
    '%s is self-contained deterministic vector geometry',
    async (asset) => {
      const svg = await readFile(path.resolve(asset), 'utf8');
      expect(svg).toMatch(/^<svg /);
      expect(svg).toContain('viewBox=');
      expect(svg).not.toMatch(
        /<(?:image|text|filter|mask|metadata|linearGradient|radialGradient)\b/i
      );
      expect(svg).not.toMatch(/\bfont(?:-family)?=/i);
      expect(svg).not.toMatch(/\b(?:href|src)=["'](?:data:image|https?:\/\/)/i);
    }
  );

  it('uses the approved upper V and asymmetric emerald mirrored-check geometry', async () => {
    const master = await readFile(path.resolve('assets/logos/source/xerify-master.svg'), 'utf8');
    expect(master).toContain('M333 250 500 480 667 250');
    expect(master).toContain('M426 733 500 631 630 810');
    expect(master).toContain('stroke="#0a0a0a"');
    expect(master).toContain('stroke="#065f46"');
    expect(master).toContain('viewBox="240 130 1830 800"');
  });

  it.each(iconSvgAssets)('%s uses a padded square export canvas', async (asset) => {
    const svg = await readFile(path.resolve(asset), 'utf8');
    expect(svg).toContain('viewBox="100 130 800 800"');
  });

  it.each([16, 24, 32, 64, 128, 256, 512, 1024])('exports a real %ipx square PNG', async (size) => {
    const png = await readFile(path.resolve(`assets/logos/png/xerify-icon-${size}.png`));
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });
});
