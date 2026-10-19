interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  CMS_ORIGIN: string;
  STATE_SECRET: string;
}

const encoder = new TextEncoder();

const sign = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const verify = async (value: string, secret: string) => {
  const expected = await sign(value, secret);
  if (expected.length !== value.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ value.charCodeAt(i);
  return diff === 0;
};

const readCookie = (request: Request, name: string) => {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
};

const stateCookie = (value: string, maxAge: number) =>
  `aetherfox_oauth_state=${encodeURIComponent(value)}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

const handleAuth = async (url: URL, env: Env) => {
  const nonce = crypto.randomUUID();
  const state = `${nonce}.${await sign(nonce, env.STATE_SECRET)}`;

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', 'repo user');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': stateCookie(state, 600),
    },
  });
};

const handleCallback = async (request: Request, url: URL, env: Env) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) return new Response('Missing code or state', { status: 400 });

  const sent = readCookie(request, 'aetherfox_oauth_state');
  if (!sent || sent !== state) return new Response('Invalid state', { status: 400 });

  const [nonce, signature] = state.split('.');
  if (!nonce || !signature || !(await verify(nonce, env.STATE_SECRET))) {
    return new Response('Invalid state', { status: 400 });
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    return new Response(`OAuth error: ${data.error ?? 'unknown'}`, { status: 401 });
  }

  const payload = JSON.stringify({ token: data.access_token, provider: 'github' });
  const html = `<!doctype html><html><body><script>
    (function () {
      var msg = 'authorization:github:success:' + ${JSON.stringify(payload)};
      window.opener.postMessage(msg, ${JSON.stringify(env.CMS_ORIGIN)});
      window.close();
    })();
  </script></body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'set-cookie': stateCookie('', 0),
    },
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/auth') return handleAuth(url, env);
    if (url.pathname === '/api/callback') return handleCallback(request, url, env);

    return new Response('Aetherfox CMS auth', { status: 200 });
  },
};
