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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8L20 20"/>',
  trash:
    '<path d="M5.5 7h13M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M7 7l.8 11.2A1.8 1.8 0 0 0 9.6 20h4.8a1.8 1.8 0 0 0 1.8-1.8L17 7"/>',
  dots: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  external:
    '<path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 13.5v4.5A1.5 1.5 0 0 1 15.5 19.5h-9A1.5 1.5 0 0 1 5 18v-9A1.5 1.5 0 0 1 6.5 7.5H11"/>',
  clock: '<circle cx="12" cy="12" r="7.5"/><path d="M12 7.5V12l3 2"/>',
  file: '<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5zM13.5 3.5v5h5"/>',
  eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
  branch:
    '<circle cx="7" cy="6" r="2.5"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="9" r="2.5"/><path d="M7 8.5v7M17 11.5c0 2.5-2 3.5-4.5 4"/>',
  list: '<path d="M9 6h10.5M9 12h10.5M9 18h10.5M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  image:
    '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 16l4.5-4 3 2.5 3-3L20 16"/>',
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
