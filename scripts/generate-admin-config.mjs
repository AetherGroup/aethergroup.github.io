import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const schema = JSON.parse(readFileSync(join(root, 'admin', 'schema.json'), 'utf8'));

const quote = (v) => `'${String(v).replace(/'/g, "''")}'`;

function field(f) {
  const parts = [`label: ${quote(f.label)}`, `name: ${quote(f.name)}`, `widget: ${quote(f.widget)}`];
  if (f.required === false) parts.push('required: false');
  if (f.default !== undefined) {
    parts.push(`default: ${Array.isArray(f.default) ? `[${f.default.map(quote).join(', ')}]` : quote(f.default)}`);
  }
  if (f.options) parts.push(`options: [${f.options.map(quote).join(', ')}]`);
  if (f.min !== undefined) parts.push(`min: ${f.min}`);
  return `      - { ${parts.join(', ')} }`;
}

const collections = schema.collections
  .map((c) => {
    const lines = [
      `  - name: ${quote(c.name)}`,
      `    label: ${quote(c.label)}`,
      `    label_singular: ${quote(c.label_singular)}`,
      `    folder: ${quote(c.folder)}`,
      `    create: true`,
      `    identifier_field: ${quote(c.identifier_field)}`,
      `    slug: '{{slug}}'`,
      `    extension: md`,
      `    format: frontmatter`,
    ];
    if (c.summary) lines.push(`    summary: ${quote(c.summary)}`);
    lines.push('    fields:');
    for (const f of c.fields) lines.push(field(f));
    lines.push('    body: body');
    return lines.join('\n');
  })
  .join('\n');

const yaml = `backend:
  name: github
  repo: ${schema.repo}
  branch: ${schema.branch}
  squash_merges: true
  commit_messages:
    create: 'cms: create {{collection}} «{{slug}}»'
    update: 'cms: update {{collection}} «{{slug}}»'
    delete: 'cms: delete {{collection}} «{{slug}}»'

base_url: /

media_folder: assets/images/uploads
public_folder: /assets/images/uploads

local_backend: true
publish_mode: editorial_workflow

collections:
${collections}
`;

writeFileSync(join(root, 'admin', 'config.yml'), yaml, 'utf8');
console.log('✓ admin/config.yml generado desde admin/schema.json');
