import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const FAMILIES = [
  {
    css: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap',
    slug: 'bricolage-grotesque',
  },
  {
    css: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap',
    slug: 'plus-jakarta-sans',
  },
];

const outDir = resolve(import.meta.dirname, '..', 'assets', 'fonts');

function parseFaces(css) {
  const faces = [];
  const blocks = css.split('@font-face').slice(1);
  for (const block of blocks) {
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim();
    const style = /font-style:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? 'normal';
    const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    if (family && url) faces.push({ family, weight, style, url, range });
  }
  return faces;
}

function fileName(family, weight, range) {
  const subset = range
    ? range.includes('U+0000-00FF')
      ? 'latin'
      : range.includes('U+0100-02BA')
        ? 'latin-ext'
        : 'other'
    : 'latin';
  const fam = family.toLowerCase().replace(/\s+/g, '-');
  return `${fam}-${weight.replace(/\s+/g, '-')}-${subset}.woff2`;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const manifest = [];

  for (const { css, slug } of FAMILIES) {
    const res = await fetch(css, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
    const faces = parseFaces(await res.text());

    const wanted = faces.filter((f) => f.range && f.range.includes('U+0000-00FF'));

    for (const face of wanted) {
      const bin = await fetch(face.url, { headers: { 'User-Agent': UA } });
      if (!bin.ok) throw new Error(`${face.url}: HTTP ${bin.status}`);
      const buf = Buffer.from(await bin.arrayBuffer());
      const name = fileName(face.family, face.weight, face.range);
      await writeFile(join(outDir, name), buf);
      manifest.push({ ...face, file: name, bytes: buf.length });
      console.log(`✓ ${name}  (${(buf.length / 1024).toFixed(1)} KB)`);
    }
  }

  console.log(`\n${manifest.length} ficheros en assets/fonts/`);
  console.log('\n--- @font-face para 01-fonts.css ---');
  for (const m of manifest) {
    console.log(
      `@font-face{font-family:'${m.family}';font-style:${m.style};font-weight:${m.weight};font-display:swap;src:url('/assets/fonts/${m.file}') format('woff2');unicode-range:${m.range};}`,
    );
  }
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
