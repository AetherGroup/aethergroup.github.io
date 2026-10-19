import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKER = 'https://aetherfox-cms-auth.aetherfox-cms-auth.workers.dev';
const CMS_ORIGIN = 'https://aethergroup.github.io';
const PROVIDER = 'github';

const baseUrl = WORKER;

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const authRes = await fetch(`${WORKER}/api/auth`, { redirect: 'manual' });
if (authRes.status !== 302) fail(`/api/auth devolvió ${authRes.status}, esperaba 302`);

const location = authRes.headers.get('location');
if (!location) fail('/api/auth no devolvió Location');

const authUrl = new URL(location);
if (authUrl.host !== 'github.com') fail(`el popup no apunta a GitHub: ${authUrl.host}`);
if (!authUrl.searchParams.get('client_id')) fail('falta client_id');
if (authUrl.searchParams.get('redirect_uri') !== `${WORKER}/api/callback`)
  fail('redirect_uri inesperado');

const state = authUrl.searchParams.get('state');
const cookie = (authRes.headers.get('set-cookie') || '').split(';')[0];

console.log('✓ /api/auth -> 302 a GitHub con state firmado');

const callbackRes = await fetch(`${WORKER}/api/callback?code=fakecode&state=${encodeURIComponent(state)}`, {
  headers: { cookie },
});
const html = await callbackRes.text();

const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
if (!script) fail('la respuesta del callback no contiene un script');

const messages = [];
const fakeWindow = {
  opener: {
    postMessage(data, target) {
      messages.push({ data, target });
    },
  },
  close() {},
};
new Function('window', 'document', script)(fakeWindow, { body: {} });

const byOrigin = (m) => m.target === CMS_ORIGIN;
const all = messages.filter(byOrigin);

if (all.length !== 2) fail(`se esperaban 2 postMessage, llegaron ${all.length}: ${JSON.stringify(messages)}`);

const [first, second] = all;
if (first.data !== `authorizing:${PROVIDER}`)
  fail(`el primer mensaje debe ser "authorizing:${PROVIDER}", llegó "${first.data}"`);

console.log('✓ mensaje 1: "authorizing:github" (el handshake de Decap)');

if (!second.data.startsWith(`authorization:${PROVIDER}:`))
  fail(`el segundo mensaje debe empezar por "authorization:${PROVIDER}:"`);

const match = second.data.match(new RegExp(`^authorization:${PROVIDER}:(success|error):(.+)$`));
if (!match) fail(`el segundo mensaje no tiene el formato esperado: "${second.data}"`);

let payload;
try {
  payload = JSON.parse(match[2]);
} catch {
  fail(`el payload no es JSON válido: "${match[2]}"`);
}

console.log(`✓ mensaje 2: "authorization:github:${match[1]}:<json>"`);

if (match[1] === 'error') {
  console.log(`  (error esperado con un code falso: ${JSON.stringify(payload)})`);
} else {
  if (!payload.token) fail('el payload de éxito no trae token');
  if (payload.provider !== PROVIDER) fail('provider incorrecto en el payload');
  console.log('  payload con token y provider');
}

console.log('\nSimulando el listener de Decap:');
let phase = 'handshake';
const onMessage = (m) => {
  if (phase === 'handshake' && m.data === `authorizing:${PROVIDER}` && m.origin === baseUrl) {
    phase = 'authorize';
    console.log('  handshake -> cambia a authorizeCallback');
  }
  if (phase === 'authorize' && m.origin === baseUrl) {
    if (m.data.startsWith(`authorization:${PROVIDER}:success:`)) {
      const p = JSON.parse(m.data.match(new RegExp(`^authorization:${PROVIDER}:success:(.+)$`))[1]);
      console.log(`  authorizeCallback -> login OK, token ${String(p.token).slice(0, 10)}...`);
    } else if (m.data.startsWith(`authorization:${PROVIDER}:error:`)) {
      const p = JSON.parse(m.data.match(new RegExp(`^authorization:${PROVIDER}:error:(.+)$`))[1]);
      console.log(`  authorizeCallback -> error de GitHub: ${JSON.stringify(p)}`);
    }
  }
};
for (const m of all) onMessage({ data: m.data, origin: baseUrl });

if (phase !== 'authorize') fail('Decap nunca habría cambiado de listener');

console.log('\n✓ el protocolo de Decap se cumple');
