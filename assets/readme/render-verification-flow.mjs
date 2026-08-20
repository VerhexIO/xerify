import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const assetDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(assetDirectory, '..', '..');
const paper = readFileSync(resolve(assetDirectory, 'xerify-verification-flow-paper.png')).toString(
  'base64'
);
const wordmark = readFileSync(
  resolve(repositoryRoot, 'assets/logos/full-horizontal/xerify-horizontal-light.svg')
).toString('base64');
const icon = readFileSync(
  resolve(repositoryRoot, 'assets/logos/icon-only/xerify-icon-dark.svg')
).toString('base64');

const width = 960;
const height = 540;
const durationSeconds = 8;
const framesPerSecond = 10;
const frameCount = durationSeconds * framesPerSecond;
const ink = '#0a0a0a';
const paperWhite = '#f2f0e9';
const emerald = '#065f46';
const signalRed = '#b42318';

const fontFiles = [
  '/usr/share/fonts/truetype/ubuntu/UbuntuSans[wdth,wght].ttf',
  '/usr/share/fonts/truetype/ubuntu/UbuntuSansMono[wght].ttf'
].filter(existsSync);

const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

function smoothstep(start, end, value) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

function fadeWindow(time, enterStart, enterEnd, exitStart, exitEnd) {
  return smoothstep(enterStart, enterEnd, time) * (1 - smoothstep(exitStart, exitEnd, time));
}

function createSvg(time) {
  const globalOpacity = fadeWindow(time, 0.05, 0.55, 7.5, 7.95);
  const documentOpacity = globalOpacity * smoothstep(0.65, 1.05, time);
  const documentProgress = smoothstep(1.15, 4.35, time);
  const documentX = 370 + 307 * documentProgress;
  const gateProgress = smoothstep(2.05, 3.0, time);
  const reviewProgress = smoothstep(4.2, 5.15, time);
  const resultProgress = smoothstep(5.15, 5.72, time);
  const returnProgress = smoothstep(5.0, 5.75, time);
  const proofLength = 77 * reviewProgress;
  const stampScale = 0.82 + resultProgress * 0.18;
  const bandOffset = 7 * Math.sin(clamp(gateProgress - 0.2) * Math.PI) * (1 - resultProgress);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <clipPath id="canvas">
        <rect x="22" y="22" width="916" height="496"/>
      </clipPath>
      <filter id="paper-shadow" x="-30%" y="-40%" width="160%" height="180%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0a0a0a" flood-opacity="0.14"/>
      </filter>
    </defs>

    <rect width="960" height="540" fill="${paperWhite}"/>
    <image href="data:image/png;base64,${paper}" width="960" height="540"
      preserveAspectRatio="xMidYMid slice" opacity="0.58"/>
    <rect x="22" y="22" width="916" height="496" fill="none" stroke="${ink}" stroke-width="1"/>

    <g opacity="${globalOpacity.toFixed(3)}" clip-path="url(#canvas)">
      <image href="data:image/svg+xml;base64,${wordmark}" x="42" y="38" width="142" height="62"/>
      <text x="704" y="54" fill="${ink}" font-family="Ubuntu Sans Mono, monospace" font-size="8.5"
        font-weight="600" letter-spacing="1.35">FIELD NOTE / 001</text>
      <text x="704" y="73" fill="#6d6c65" font-family="Ubuntu Sans Mono, monospace" font-size="8.5"
        font-weight="500" letter-spacing="0.9">CROSS-PROVIDER VERIFICATION</text>
      <line x1="42" y1="104" x2="918" y2="104" stroke="${ink}" stroke-width="1"/>

      <text x="42" y="137" fill="${emerald}" font-family="Ubuntu Sans Mono, monospace" font-size="9"
        font-weight="700" letter-spacing="1.65">A DIFFERENT PROVIDER</text>
      <text x="42" y="199" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="53"
        font-weight="750" letter-spacing="-1.7">READS</text>
      <text x="42" y="253" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="53"
        font-weight="750" letter-spacing="-1.7">IT AGAIN.</text>
      <line x1="42" y1="280" x2="288" y2="280" stroke="${ink}" stroke-width="1"/>
      <text x="42" y="309" fill="#3f403b" font-family="Ubuntu Sans, Arial, sans-serif" font-size="12.5"
        font-weight="500">One bounded claim.</text>
      <text x="42" y="332" fill="#3f403b" font-family="Ubuntu Sans, Arial, sans-serif" font-size="12.5"
        font-weight="500">One different target.</text>
      <text x="42" y="355" fill="#3f403b" font-family="Ubuntu Sans, Arial, sans-serif" font-size="12.5"
        font-weight="500">One typed second opinion.</text>
      <text x="42" y="399" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8.5"
        font-weight="600" letter-spacing="1">POSSIBLE OUTCOMES</text>
      <text x="42" y="423" fill="${emerald}" font-family="Ubuntu Sans Mono, monospace" font-size="9.5"
        font-weight="700" letter-spacing="0.75">CONFIRMED</text>
      <text x="120" y="423" fill="#9b9a92" font-family="Ubuntu Sans Mono, monospace" font-size="9.5">/</text>
      <text x="136" y="423" fill="${signalRed}" font-family="Ubuntu Sans Mono, monospace" font-size="9.5"
        font-weight="700" letter-spacing="0.75">REFUTED</text>
      <text x="204" y="423" fill="#9b9a92" font-family="Ubuntu Sans Mono, monospace" font-size="9.5">/</text>
      <text x="220" y="423" fill="#595a54" font-family="Ubuntu Sans Mono, monospace" font-size="9.5"
        font-weight="700" letter-spacing="0.75">UNCLEAR</text>

      <line x1="330" y1="104" x2="330" y2="486" stroke="${ink}" stroke-width="1"/>

      <text x="366" y="142" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8.5"
        font-weight="700" letter-spacing="1.3">01 / DECLARED SOURCE</text>
      <text x="365" y="211" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="76"
        font-weight="700" letter-spacing="-3">A</text>
      <text x="431" y="183" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="11"
        font-weight="700" letter-spacing="0.5">OPENAI</text>
      <text x="431" y="203" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="600" letter-spacing="0.7">AUTHORED BEFORE XERIFY</text>

      <text x="674" y="142" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8.5"
        font-weight="700" letter-spacing="1.3">02 / TARGET CALL</text>
      <text x="672" y="211" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="76"
        font-weight="700" letter-spacing="-3">B</text>
      <text x="742" y="183" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="11"
        font-weight="700" letter-spacing="0.5">ANTHROPIC</text>
      <text x="742" y="203" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="600" letter-spacing="0.7">ATTEMPT FALSIFICATION</text>

      <line x1="366" y1="378" x2="896" y2="378" stroke="#a9a79e" stroke-width="1"/>
      <circle cx="378" cy="378" r="4" fill="${ink}"/>
      <circle cx="600" cy="378" r="4" fill="${emerald}"/>
      <circle cx="884" cy="378" r="4" fill="${reviewProgress > 0.4 ? signalRed : '#a9a79e'}"/>
      <text x="366" y="401" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="600" letter-spacing="0.7">EXISTING CLAIM</text>
      <text x="565" y="401" fill="${emerald}" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="700" letter-spacing="0.7">XERIFY</text>
      <text x="826" y="401" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="600" letter-spacing="0.7">SECOND OPINION</text>

      <text x="366" y="477" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="600" letter-spacing="1">ONLY PROVIDER B IS INVOKED</text>
      <text x="819" y="477" fill="${ink}" font-family="Ubuntu Sans Mono, monospace" font-size="8"
        font-weight="700" letter-spacing="0.8">A → XERIFY → B</text>
    </g>

    <g opacity="${documentOpacity.toFixed(3)}" filter="url(#paper-shadow)"
      transform="translate(${documentX.toFixed(2)} 236)">
      <rect width="177" height="112" fill="#fffefa" stroke="${ink}" stroke-width="1.1"/>
      <rect x="0" y="0" width="7" height="112" fill="${emerald}"/>
      <text x="22" y="24" fill="#77766e" font-family="Ubuntu Sans Mono, monospace" font-size="7.8"
        font-weight="700" letter-spacing="1.1">CLAIM / A</text>
      <text x="22" y="55" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="17"
        font-weight="650">“This change</text>
      <text x="22" y="79" fill="${ink}" font-family="Ubuntu Sans, Arial, sans-serif" font-size="17"
        font-weight="650">is safe.”</text>
      <text x="22" y="99" fill="#8a8981" font-family="Ubuntu Sans Mono, monospace" font-size="7.2"
        font-weight="600" letter-spacing="0.6">BOUNDED EVIDENCE</text>
      <path d="M69 83 C87 78 111 86 146 80" fill="none" stroke="${signalRed}" stroke-width="2.2"
        stroke-linecap="round" stroke-dasharray="77" stroke-dashoffset="${(77 - proofLength).toFixed(2)}"
        opacity="${reviewProgress.toFixed(3)}"/>
    </g>

    <g opacity="${globalOpacity.toFixed(3)}" transform="translate(0 ${bandOffset.toFixed(2)})">
      <rect x="558" y="116" width="84" height="246" fill="${ink}"/>
      <image href="data:image/svg+xml;base64,${icon}" x="574" y="130" width="52" height="52"/>
      <line x1="571" y1="199" x2="629" y2="199" stroke="#4c4d48"/>
      <rect x="571" y="222" width="5" height="5" fill="${gateProgress > 0.15 ? '#10b981' : '#555650'}"/>
      <text x="585" y="228" fill="#ffffff" font-family="Ubuntu Sans Mono, monospace" font-size="7.7"
        font-weight="700" letter-spacing="0.65">BOUND</text>
      <rect x="571" y="251" width="5" height="5" fill="${gateProgress > 0.52 ? '#10b981' : '#555650'}"/>
      <text x="585" y="257" fill="#ffffff" font-family="Ubuntu Sans Mono, monospace" font-size="7.7"
        font-weight="700" letter-spacing="0.65">ROUTE</text>
      <rect x="571" y="280" width="5" height="5" fill="${returnProgress > 0.2 ? '#10b981' : '#555650'}"/>
      <text x="585" y="286" fill="#ffffff" font-family="Ubuntu Sans Mono, monospace" font-size="7.7"
        font-weight="700" letter-spacing="0.65">RETURN</text>
      <line x1="571" y1="308" x2="629" y2="308" stroke="#4c4d48"/>
      <text x="571" y="333" fill="#a7a8a2" font-family="Ubuntu Sans Mono, monospace" font-size="6.8"
        font-weight="600" letter-spacing="0.45">DIFFERENT-</text>
      <text x="571" y="344" fill="#a7a8a2" font-family="Ubuntu Sans Mono, monospace" font-size="6.8"
        font-weight="600" letter-spacing="0.45">PROVIDER GATE</text>
    </g>

    <g opacity="${(globalOpacity * resultProgress).toFixed(3)}"
      transform="translate(744 438) rotate(-2) scale(${stampScale.toFixed(3)}) translate(-744 -438)">
      <rect x="682" y="414" width="124" height="48" fill="${paperWhite}" fill-opacity="0.94"
        stroke="${signalRed}" stroke-width="2"/>
      <rect x="687" y="419" width="114" height="38" fill="none" stroke="${signalRed}" stroke-width="0.8"/>
      <text x="698" y="446" fill="${signalRed}" font-family="Ubuntu Sans Mono, monospace" font-size="17"
        font-weight="700" letter-spacing="1.3">REFUTED</text>
      <text x="820" y="430" fill="${ink}" font-family="Ubuntu Sans Mono, monospace" font-size="7.4"
        font-weight="700" letter-spacing="0.5">COUNTEREXAMPLE</text>
      <text x="820" y="443" fill="${ink}" font-family="Ubuntu Sans Mono, monospace" font-size="7.4"
        font-weight="700" letter-spacing="0.5">FOUND</text>
    </g>
  </svg>`;
}

function renderPng(svg, outputPath, outputWidth = width) {
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'width', value: outputWidth },
    font: {
      fontFiles,
      loadSystemFonts: true,
      defaultFontFamily: 'Ubuntu Sans'
    }
  });
  writeFileSync(outputPath, renderer.render().asPng());
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'xerify-readme-flow-'));

try {
  for (let index = 0; index < frameCount; index += 1) {
    renderPng(
      createSvg(index / framesPerSecond),
      join(temporaryDirectory, `frame-${String(index).padStart(3, '0')}.png`)
    );
  }

  const palettePath = join(temporaryDirectory, 'palette.png');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      String(framesPerSecond),
      '-i',
      join(temporaryDirectory, 'frame-%03d.png'),
      '-vf',
      `fps=${framesPerSecond},palettegen=max_colors=96:stats_mode=diff`,
      palettePath
    ],
    { stdio: 'inherit' }
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      String(framesPerSecond),
      '-i',
      join(temporaryDirectory, 'frame-%03d.png'),
      '-i',
      palettePath,
      '-lavfi',
      `fps=${framesPerSecond}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
      '-loop',
      '0',
      resolve(assetDirectory, 'xerify-verification-flow.gif')
    ],
    { stdio: 'inherit' }
  );

  renderPng(createSvg(6.25), resolve(assetDirectory, 'xerify-verification-flow-poster.png'), 1200);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

process.stdout.write(
  `${JSON.stringify({
    ok: true,
    direction: 'editorial-verification-note',
    source: 'assets/readme/render-verification-flow.mjs',
    gif: 'assets/readme/xerify-verification-flow.gif',
    poster: 'assets/readme/xerify-verification-flow-poster.png'
  })}\n`
);
