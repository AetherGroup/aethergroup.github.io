import sharp from 'sharp';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const brand = join(root, 'assets', 'images', 'brand');

const mark = await sharp(join(brand, 'aetherfox-logo.webp'))
  .resize({ width: 160, height: 160, fit: 'inside' })
  .png()
  .toBuffer();

const markData = mark.toString('base64');

async function lockup(color, out) {
  const svg = `<svg width="520" height="160" xmlns="http://www.w3.org/2000/svg">
  <image x="0" y="0" width="160" height="160" href="data:image/png;base64,${markData}"/>
  <text x="196" y="110" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="70" font-weight="700" letter-spacing="-1" fill="${color}">Aetherfox</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(brand, out));
  console.log(`✓ assets/images/brand/${out}`);
}

await lockup('#3B2F8F', 'aetherfox-lockup.png');
await lockup('#FFFFFF', 'aetherfox-lockup-light.png');
