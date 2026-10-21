import { cp, mkdir, readdir, readFile, stat, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'dist');

const SOURCES = ['assets', 'admin'];

const ROOT_FILES = ['.nojekyll', 'robots.txt'];

/** Ficheros de desarrollo que no se publican. */
const EXCLUDE = new Set([]);

function buildVersion() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return Date.now().toString(36);
  }
}

async function filesIn(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    out.push(join(entry.parentPath ?? dir, entry.name));
  }
  return out;
}

async function stampHtml(dir, version) {
  let count = 0;
  for (const file of await filesIn(dir)) {
    if (!file.endsWith('.html')) continue;
    const text = await readFile(file, 'utf8');
    const next = text.replace(/\?v=[^"'&\s]+/g, `?v=${version}`);
    if (next !== text) {
      await writeFile(file, next);
      count += 1;
    }
  }
  return count;
}

async function stampModules(dir, version) {
  let count = 0;
  for (const file of await filesIn(dir)) {
    if (!file.endsWith('.js')) continue;
    const text = await readFile(file, 'utf8');
    const next = text.replace(
      /((?:from|import)\s*\(?\s*)(['"])(\.\.?\/[^'"]+?)\2/g,
      (match, head, quote, path) => `${head}${quote}${path.replace(/\?.*$/, '')}?v=${version}${quote}`,
    );
    if (next !== text) {
      await writeFile(file, next);
      count += 1;
    }
  }
  return count;
}

async function copyDir(from, to) {
  await cp(from, to, {
    recursive: true,
    filter: (src) => {
      const name = src.split(/[\\/]/).pop() ?? '';
      if (name.startsWith('.')) return false;
      if (EXCLUDE.has(name)) return false;
      return true;
    },
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

  const version = buildVersion();
  const htmlStamped = await stampHtml(outDir, version);
  const modulesStamped = await stampModules(join(outDir, 'admin'), version);
  console.log(`✓ assets versionados con ${version}`);
  console.log(`  → ${htmlStamped} html, ${modulesStamped} módulos`);

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
