# Aetherfox CMS auth worker

Cloudflare Worker that does the OAuth handshake for Decap CMS. The site stays
on GitHub Pages; only the login lives here, because exchanging an OAuth code
for a token requires a server that can keep the client secret.

## Endpoints

| Path | What it does |
|---|---|
| `GET /api/auth` | Redirects to GitHub with a signed `state` |
| `GET /api/callback` | Swaps the code for a token and posts it to the CMS window |

## Setup

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Homepage URL: `https://aethergroup.github.io/`
3. Authorization callback URL: `https://aetherfox-cms-auth.<subdomain>.workers.dev/api/callback`
   (must match exactly).
4. Install and deploy:

```bash
npm install
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put CMS_ORIGIN
npx wrangler secret put STATE_SECRET
npm run deploy
```

5. Put the worker URL in `admin/config.yml` under `backend.base_url`.

`CMS_ORIGIN` must be the exact origin of the site (`https://aethergroup.github.io`)
so the token is only posted to the CMS window.

## Local development

```bash
npx wrangler dev
```

The Decap admin can then be run against the local worker with
`npx decap-server` (see `local_backend: true` in `admin/config.yml`).
