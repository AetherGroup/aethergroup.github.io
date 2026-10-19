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

`/admin` is a Decap CMS instance, restyled to look like the public site
rather than a tinted version of Decap's own layout.

- `admin/index.html` — the shell: fonts, theme bootstrap, the brand block
- `admin/admin.css` — the whole theme
- `admin/config.yml` — collections, backend, media

Decap compiles its styles with Emotion, which injects them at runtime and
wins on order. The overrides therefore target the label embedded in each
generated class name (`[class*="LoginButton"]`, `[class*="SidebarContainer"]`,
`[class*="CollectionTopRow"]`…) and use `!important`. Those labels are stable
between Decap versions, but check them after upgrading Decap:

```bash
node scripts/check-admin-selectors.mjs
```

**Bump the version** in `admin/index.html` when you change `admin.css`, or
browsers will keep the cached copy for up to ten minutes:

```html
<link rel="stylesheet" href="/admin/admin.css?v=1.0.0" />
```

### Local development

`admin/dev.html` loads `admin/config.test.yml`, which uses the same
collections against a local backend, so the interface can be worked on without
touching the repository. It is excluded from the published site.

## Architecture

See `ARCHITECTURE.md` for the full rationale: folder structure, CSS and JS
split, Decap integration, GitHub Pages constraints and the roadmap.
