import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const iconsSource = readFileSync(join(root, 'src', 'data', 'icons.ts'), 'utf8');

const icons = {};
const re = /^\s{2}(\w+):\s*'((?:[^'\\]|\\.)*)',$/gm;
let match;
while ((match = re.exec(iconsSource)) !== null) {
  icons[match[1]] = match[2].replace(/\\'/g, "'");
}

const extra = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M19 12H5M10.5 6.5L5 12l5.5 5.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  exit: '<path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M10 12h11m0 0-3-3m3 3-3 3"/>',
  github:
    '<path fill="currentColor" stroke="none" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.1-.5-1.6.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 3.1.2 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/>',
};

const all = { ...icons, ...extra };

const sprite = Object.entries(all)
  .map(([name, body]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`)
  .join('\n        ');

const htmlFile = join(root, 'admin', 'index.html');
let html = readFileSync(htmlFile, 'utf8');

const block = `<svg width="0" height="0" style="position: absolute" aria-hidden="true">
        <defs>
        ${sprite}
        </defs>
      </svg>`;

const spriteBlock = /<svg width="0" height="0" style="position: absolute" aria-hidden="true">[\s\S]*?<\/svg>/;

if (!spriteBlock.test(html)) {
  console.error('✗ no se encontró el bloque del sprite en admin/index.html');
  process.exit(1);
}

writeFileSync(htmlFile, html.replace(spriteBlock, block), 'utf8');
console.log(`✓ admin/index.html: sprite con ${Object.keys(all).length} iconos`);
