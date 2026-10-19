import { readFileSync } from 'node:fs';

const css = readFileSync('C:\\Users\\vic\\Projects\\aetherfox-web\\admin\\admin.css', 'utf8');
const bundle = await (await fetch('https://unpkg.com/decap-cms-app@3.17.1/dist/decap-cms-app.js')).text();

const labels = new Set();
for (const m of bundle.matchAll(/label:"([A-Za-z][A-Za-z0-9_]{3,40})"/g)) labels.add(m[1]);
for (const m of bundle.matchAll(/label:\s*`([A-Za-z][A-Za-z0-9_]{3,40})`/g)) labels.add(m[1]);

const used = [...new Set([...css.matchAll(/\[class\*='([^']+)'\]/g)].map((m) => m[1]))];

// "AppHeader" viene de un CSS plano, no de una etiqueta de Emotion.
// "LoginButton-button" lo genera Emotion al componer estilos de boton.
const KNOWN_EXTRAS = new Set(['LoginButton-button', 'AppHeader']);

const unknown = used.filter((u) => !labels.has(u) && !KNOWN_EXTRAS.has(u));
const ok = used.filter((u) => labels.has(u) || KNOWN_EXTRAS.has(u));

console.log(`selectores: ${used.length} (${ok.length} confirmados, ${unknown.length} sin confirmar)`);
if (unknown.length) {
  console.log('\nNO CONFIRMADOS:');
  for (const u of unknown) console.log('  ✗', u);
  process.exitCode = 1;
} else {
  console.log('\n✓ todos los selectores existen en el bundle de Decap');
}
