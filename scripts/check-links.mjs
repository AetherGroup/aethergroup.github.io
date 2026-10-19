import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const htmlFiles = walk(dist).filter((f) => f.endsWith('.html'));
const broken = [];
const external = new Set();
let checked = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

  for (const ref of refs) {
    if (/^(https?:|mailto:|data:|#)/.test(ref)) {
      if (/^https?:/.test(ref)) external.add(ref);
      continue;
    }
    checked++;

    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;

    const target = clean.startsWith('/') ? join(dist, clean) : join(file, '..', clean);
    const candidates = [target, join(target, 'index.html'), `${target}.html`];

    if (!candidates.some((c) => existsSync(c))) {
      broken.push(`${relative(dist, file)}  →  ${ref}`);
    }
  }
}

console.log(`páginas html: ${htmlFiles.length}`);
console.log(`referencias internas comprobadas: ${checked}`);
console.log(`referencias externas: ${external.size}`);
console.log(`\nrotas: ${broken.length}`);
for (const b of broken) console.log('  ✗', b);

console.log('\nrecursos externos:');
for (const e of [...external].sort()) console.log('  →', e);
