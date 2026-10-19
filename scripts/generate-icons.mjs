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
    <radialGradient id="a" cx="0.12" cy="0" r="1">
      <stop offset="0" stop-color="#2A2447"/>
      <stop offset="1" stop-color="#0F0D16"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect x="0" y="0" width="1200" height="4" fill="#6C5CE7"/>
</svg>`;

const lockup = await sharp(join(root, 'assets', 'images', 'brand', 'aetherfox-lockup-light.png'))
  .resize({ width: 460 })
  .png()
  .toBuffer();

const lockupBox = await sharp(lockup).metadata();

await sharp(Buffer.from(ogSvg))
  .composite([
    { input: lockup, top: 150, left: 90 },
    {
      input: Buffer.from(
        `<svg width="720" height="80" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="40" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="600" fill="#E2DEF5">The browser with the extras left out.</text>
        </svg>`,
      ),
      top: 150 + lockupBox.height + 34,
      left: 90,
    },
  ])
  .png()
  .toFile(join(social, 'og-default.png'));
console.log('✓ social/og-default.png');
