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

const verify = async (nonce: string, signature: string, secret: string) => {
  const expected = await sign(nonce, secret);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
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

const postMessagePage = (env: Env, status: 'success' | 'error', content: unknown) => {
  const target = JSON.stringify(env.CMS_ORIGIN);
  const success = JSON.stringify(`authorization:github:success:${JSON.stringify(content)}`);
  const error = JSON.stringify(`authorization:github:error:${JSON.stringify(content)}`);
  return `<!doctype html><html><body><script>
    (function () {
      if (!window.opener) { document.body.textContent = 'Open this page from the CMS.'; return; }
      var target = ${target};
      window.opener.postMessage('authorizing:github', target);
      window.opener.postMessage(${status === 'success' ? success : error}, target);
      window.close();
    })();
  </script></body></html>`;
};

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

  const fail = (message: string) =>
    new Response(postMessagePage(env, 'error', { message }), {
      status: 200,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    });

  if (!code || !state) return fail('Missing code or state');

  const sent = readCookie(request, 'aetherfox_oauth_state');
  if (!sent || sent !== state) return fail('Invalid state');

  const [nonce, signature] = state.split('.');
  if (!nonce || !signature || !(await verify(nonce, signature, env.STATE_SECRET))) {
    return fail('Invalid state');
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

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token) {
    return fail(data.error_description || data.error || 'OAuth exchange failed');
  }

  return new Response(
    postMessagePage(env, 'success', { token: data.access_token, provider: 'github' }),
    {
      status: 200,
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'set-cookie': stateCookie('', 0),
      },
    },
  );
};

const REQUIRED = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'CMS_ORIGIN', 'STATE_SECRET'] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const missing = REQUIRED.filter((name) => !env[name]);
    if (missing.length) {
      return new Response(`Worker not configured. Missing secrets: ${missing.join(', ')}`, {
        status: 503,
      });
    }

    if (url.pathname === '/api/auth') return handleAuth(url, env);
    if (url.pathname === '/api/callback') return handleCallback(request, url, env);

    return new Response('Aetherfox CMS auth', { status: 200 });
  },
};
