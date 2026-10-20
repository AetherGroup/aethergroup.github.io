import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const outFile = join(root, 'src', 'data', 'releases.json');
const REPO = 'AetherGroup/aetherfox';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

const classify = (name) => {
  if (/\.exe$/i.test(name)) return 'installer';
  if (/\.zip$/i.test(name)) return 'portable';
  if (/\.(dmg|pkg|appimage|deb|rpm|7z)$/i.test(name)) return 'other';
  return 'other';
};

const previous = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : null;

const res = await fetch(API, {
  headers: {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'aetherfox-web',
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

if (!res.ok) {
  console.warn(`⚠ no se pudo consultar la última release (HTTP ${res.status})`);
  if (previous) {
    console.warn(`  se conserva la anterior: ${previous.tag}`);
    process.exit(0);
  }
  console.warn('  no hay releases.json previo: los botones enlazarán a la página de releases');
  writeFileSync(
    outFile,
    `${JSON.stringify({ tag: null, url: `https://github.com/${REPO}/releases/latest`, assets: {} }, null, 2)}\n`,
    'utf8',
  );
  process.exit(0);
}

const release = await res.json();

const assets = {};
for (const asset of release.assets || []) {
  const kind = classify(asset.name);
  if (kind === 'other' || assets[kind]) continue;
  assets[kind] = {
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
    downloads: asset.download_count,
  };
}

const data = {
  tag: release.tag_name,
  name: release.name,
  publishedAt: release.published_at,
  url: release.html_url,
  page: `https://github.com/${REPO}/releases/latest`,
  assets,
};

writeFileSync(outFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

console.log(`✓ ${release.tag_name}`);
for (const [kind, asset] of Object.entries(assets)) {
  console.log(`  ${kind.padEnd(9)} ${asset.name}  ${(asset.size / 1024 / 1024).toFixed(1)} MB`);
}
