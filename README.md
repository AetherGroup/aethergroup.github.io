# Aetherfox web

The website for Aetherfox, a Firefox-based browser with no telemetry, no sync
and no clutter.

**Live:** https://aethergroup.github.io/

## Stack

Astro 7, static output, no client framework. Plain CSS with cascade layers,
plain ES modules, Markdown content managed with Decap CMS.

## Commands

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # serve dist/ locally
npm run check      # astro check (types)
```

## Layout

```
assets/        static files served as-is: css, js, images, fonts
admin/         Decap CMS (served at /admin)
content/       Markdown: news, changelog, pages
src/           components, layouts, pages, data
scripts/       build helpers
oauth-worker/  Cloudflare Worker for the Decap OAuth (separate deploy)
```

`assets/` and `admin/` live outside `public/` on purpose, and
`scripts/copy-static.mjs` copies them into `dist/` after the build. The public
URLs are the same either way.

## Content

| Collection | Folder | URL |
|---|---|---|
| `news` | `content/news/` | `/news/<slug>/` |
| `changelog` | `content/changelog/` | `/changelog/<version>/` |
| `pages` | `content/pages/` | `/privacy/` |

The changelog URL comes from the `version` field, not the file name, so the
route stays `/changelog/1.1.0/` no matter how the file is named.

## Editing content

With the CMS deployed, go to https://aethergroup.github.io/admin/ and log in
with GitHub. Without it, edit the Markdown files in `content/` directly and
push; the site rebuilds automatically.

## Deploying

Push to `main`. GitHub Actions builds and publishes to GitHub Pages.

Required repository setting: **Settings → Pages → Source: GitHub Actions**.

## Assets

Fonts are self-hosted (`assets/fonts/`) so the site makes no third-party
requests. Regenerate or update them with:

```bash
node scripts/fetch-fonts.mjs
```

Icons and the social image are generated from the brand logo:

```bash
node scripts/generate-icons.mjs
```

## Brand source of truth

The palette and the Shields panel are not invented here. They come from the
browser repository, so the site and the product stay in sync:

| What | Where |
|---|---|
| Light and dark theme tokens | `AetherGroup/aetherfox` → `patches/core/14-protection-panels.patch` (`--aether-*` block) |
| Fingerprinting protections and their names | `patches/core/13-fingerprinting-core.patch` |
| Logo and new tab artwork | `branding/source/aether-mark.png`, `branding/source/aether-bg.png` |

`assets/css/00-tokens.css` mirrors those values in the site's own token names.
When the browser theme changes, the same values have to be updated there.

## The admin

`/admin` is a **CMS built for this site**, not a reskinned third party. It has
the same structure as the public site: a header with the brand, a sidebar of
collections, entries as cards, and a single column editor that reads like a
page rather than a form in a panel.

| File | What it does |
|---|---|
| `admin/index.html` | The shell: header, main area, icon sprite |
| `admin/admin.css` | The design, on the site's own tokens |
| `admin/app.js` | Boot, router, navigation |
| `admin/lib/api.js` | GitHub API: read, list, commit |
| `admin/lib/auth-store.js` | Where the token lives |
| `admin/lib/markdown.js` | Frontmatter parsing and writing |
| `admin/schema.json` | **The single source of truth** for collections and fields |
| `admin/views/*.js` | Login, collection list, editor, media and workflow panels |

### How it saves

Every change is a commit. The editor writes the Markdown file through the
GitHub API, which triggers the deploy. There is no database and no server.

```
admin/schema.json  →  scripts/generate-admin-config.mjs  →  admin/config.yml
```

`schema.json` is the source of truth. `config.yml` is generated from it, so the
two can never drift apart.

### Authentication

The Cloudflare Worker in `oauth-worker/` performs the GitHub OAuth handshake and
posts the token back to the admin window. The admin only needs the worker URL
and the token it receives.

### The CMS it replaces

The admin was first built on Decap CMS. Decap is a React application with its
own layout, and CSS can only recolour it, not restructure it: the editor kept
its two column layout with a preview pane, and the fields were a different
component tree entirely. The admin is now written from scratch so the
structure matches the site.

Decap's `config.yml` is still generated, so it can be brought back if needed.

## Architecture

See `ARCHITECTURE.md` for the full rationale: folder structure, CSS and JS
split, Decap integration, GitHub Pages constraints and the roadmap.
