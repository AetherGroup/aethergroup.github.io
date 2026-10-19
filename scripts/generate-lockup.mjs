import sharp from 'sharp';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const brand = join(root, 'assets', 'images', 'brand');

const mark = await sharp(join(brand, 'aetherfox-logo.webp'))
  .resize({ width: 160, height: 160, fit: 'inside' })
  .png()
  .toBuffer();

const svg = `<svg width="520" height="160" xmlns="http://www.w3.org/2000/svg">
  <image x="0" y="0" width="160" height="160" href="data:image/png;base64,${mark.toString('base64')}"/>
  <text x="196" y="110" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="72" font-weight="700" letter-spacing="-1" fill="#3B2F8F">Aetherfox</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(join(brand, 'aetherfox-lockup.png'));
console.log('✓ assets/images/brand/aetherfox-lockup.png');
