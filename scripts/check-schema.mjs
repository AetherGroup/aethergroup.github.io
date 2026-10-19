import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const schema = JSON.parse(readFileSync(resolve(root, 'admin/schema.json'), 'utf8'));
const contentConfig = readFileSync(resolve(root, 'src/content.config.ts'), 'utf8');

const errors = [];
const notes = [];

for (const collection of schema.collections) {
  const block = new RegExp(
    `const ${collection.name} = defineCollection\\(\\{([\\s\\S]*?)\\n\\}\\);`,
  ).exec(contentConfig);
  if (!block) {
    errors.push(`${collection.name}: no está en src/content.config.ts`);
    continue;
  }

  const body = block[1];
  const zodFields = [...body.matchAll(/^\s{4}(\w+):\s*z\./gm)].map((m) => m[1]);
  const schemaFields = collection.fields.map((f) => f.name);

  for (const name of schemaFields) {
    if (!zodFields.includes(name)) {
      errors.push(`${collection.name}.${name}: está en el CMS pero no en el esquema de Astro`);
    }
  }
  for (const name of zodFields) {
    if (!schemaFields.includes(name)) {
      errors.push(`${collection.name}.${name}: está en el esquema de Astro pero no en el CMS`);
    }
  }

  for (const field of collection.fields) {
    const line = body.split('\n').find((l) => l.trim().startsWith(`${field.name}:`)) || '';
    const astroOptional = /\.optional\(\)/.test(line) || /\.default\(/.test(line);
    const cmsOptional = field.required === false && field.default === undefined;

    if (cmsOptional && !astroOptional) {
      errors.push(
        `${collection.name}.${field.name}: el CMS lo deja vacío y Astro lo exige (el build fallaría)`,
      );
    }
    if (!cmsOptional && astroOptional) {
      notes.push(`${collection.name}.${field.name}: el CMS lo exige y Astro lo acepta vacío`);
    }
  }
}

if (notes.length) {
  console.log('notas:');
  for (const n of notes) console.log(`  · ${n}`);
  console.log('');
}

if (errors.length) {
  console.error('✗ El CMS y el esquema de Astro no coinciden:\n');
  for (const e of errors) console.error(`  · ${e}`);
  console.error('\n  Un campo que el CMS deje vacío y Astro exija rompe el build.');
  process.exit(1);
}

console.log('✓ El CMS y el esquema de Astro coinciden: ningún campo puede romper el build');
