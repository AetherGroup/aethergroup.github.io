import { cp, mkdir, readdir, stat, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'dist');

const SOURCES = ['assets', 'admin'];

const ROOT_FILES = ['.nojekyll', 'robots.txt'];

async function copyDir(from, to) {
  await cp(from, to, {
    recursive: true,
    filter: (src) => !src.split(/[\\/]/).pop()?.startsWith('.'),
  });
  return countFiles(to);
}

async function countFiles(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) total += await countFiles(full);
    else total += 1;
  }
  return total;
}

async function main() {
  if (!existsSync(outDir)) {
    console.error('✗ dist/ no existe. Ejecuta primero `astro build`.');
    process.exit(1);
  }

  let copied = 0;

  for (const name of SOURCES) {
    const from = join(root, name);
    if (!existsSync(from)) {
      console.warn(`⚠ ${name}/ no existe, se omite.`);
      continue;
    }
    const to = join(outDir, name);
    await rm(to, { recursive: true, force: true });
    copied += await copyDir(from, to);
    console.log(`✓ ${name}/ → dist/${name}/`);
  }

  for (const name of ROOT_FILES) {
    const from = join(root, name);
    if (!existsSync(from)) continue;
    await cp(from, join(outDir, name));
    copied += 1;
    console.log(`✓ ${name} → dist/${name}`);
  }

  const nojekyll = join(outDir, '.nojekyll');
  if (!existsSync(nojekyll)) await writeFile(nojekyll, '');

  const bytes = (await stat(outDir)).size;
  console.log(`\n✓ ${copied} ficheros estáticos copiados a dist/`);
  console.log(`  → ${relative(process.cwd(), outDir)}/`);
  void bytes;
}

main().catch((err) => {
  console.error('✗ copy-static:', err.message);
  process.exit(1);
});

void mkdir;
