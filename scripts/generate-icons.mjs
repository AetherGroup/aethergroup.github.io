import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const icons = join(root, 'assets', 'images', 'icons');
const social = join(root, 'assets', 'images', 'social');
const logo = join(root, 'assets', 'images', 'brand', 'aetherfox-logo.webp');

await mkdir(icons, { recursive: true });
await mkdir(social, { recursive: true });

const logoPng = await sharp(logo).png().toBuffer();
const logoData = `data:image/png;base64,${logoPng.toString('base64')}`;

const gradient = (id) => `
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#EFEBFE"/>
      <stop offset="1" stop-color="#8B7CF0"/>
    </linearGradient>
  </defs>`;

const mark = (x, y, size) =>
  `<image x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="${logoData}"/>`;

async function icon(size, { rounded = false, out }) {
  const rx = rounded ? 112 : 0;
  const pad = 58;
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    ${gradient('g')}
    <rect width="512" height="512" rx="${rx}" fill="url(#g)"/>
    ${mark(pad, pad, 512 - pad * 2)}
  </svg>`;

  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(icons, out));
  console.log(`✓ icons/${out}`);
}

await icon(16, { out: 'favicon-16.png' });
await icon(32, { out: 'favicon-32.png' });
await icon(180, { rounded: true, out: 'apple-touch-icon.png' });
await icon(192, { rounded: true, out: 'icon-192.png' });
await icon(512, { rounded: true, out: 'icon-512.png' });

const ogSvg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="a" cx="0.1" cy="0" r="0.9">
      <stop offset="0" stop-color="#2A2447"/>
      <stop offset="1" stop-color="#0F0D16"/>
    </radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#EFEBFE"/>
      <stop offset="1" stop-color="#8B7CF0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect x="80" y="150" width="330" height="330" rx="72" fill="url(#b)"/>
  ${mark(120, 190, 250)}
  <text x="480" y="290" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="bold" fill="#FFFFFF">Aetherfox</text>
  <text x="480" y="350" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#A29DB8">The browser with the extras left out.</text>
  <text x="480" y="410" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#9B8CFF">No telemetry. No sync. No clutter.</text>
</svg>`;

await sharp(Buffer.from(ogSvg)).png().toFile(join(social, 'og-default.png'));
console.log('✓ social/og-default.png');
