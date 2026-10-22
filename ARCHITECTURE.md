# Aetherfox — Arquitectura del sitio

> Documento de arquitectura para la web de Aetherfox.
> Base: mockup `Aetherfox — the browser with the extras left out.html`.
> Objetivo: sitio estático, mantenible, publicable en GitHub Pages y preparado para Decap CMS.

---

## 0. Resumen ejecutivo

| Decisión | Elección | Motivo |
|---|---|---|
| Generador | **Astro 7** (salida 100 % estática) | Entiende Markdown nativo, rutas por colección, cero JS por defecto y salida que GitHub Pages sirve tal cual. |
| Estilo | CSS nativo con **cascade layers** + tokens | Sin dependencias, sin runtime, control total del orden de especificidad. |
| Interactividad | **ES Modules** sin framework | Theme, menú, reveal, TOC, copiado. Nada más necesita JS. |
| Contenido | Markdown en `content/` | Formato nativo de Decap; el CMS será solo una capa de edición sobre los mismos archivos. |
| CMS | Decap en `/admin` (fase 5) | La arquitectura ya usa las rutas y carpetas que Decap espera. Autenticación con **worker propio en Cloudflare** (gratis); el sitio no se mueve de GitHub Pages (§6.5). |
| Despliegue | `withastro/action` → GitHub Pages | Acción oficial de Astro. Build reproducible, sin servidor. Sin dominio propio: `base: '/'` |
| Privacidad | Cero terceros: fuentes propias, cero analytics | Coherente con el producto. La web no puede pedir lo que el navegador no da. |

**Regla de oro:** el repositorio es la fuente de verdad. `content/` son los datos, `src/` la lógica de presentación, `assets/` la capa estática, `admin/` la capa de edición. Nada se duplica.

### 0.1 Datos del proyecto (decididos)

> **Fuente de verdad del branding:** la paleta y el panel de escudos **no** se inventan aquí. Vienen del repositorio del navegador (AetherGroup/aetherfox):
>
> | Qué | Dónde |
> |---|---|
> | Tokens del tema claro y oscuro | patches/core/14-protection-panels.patch (bloque --aether-* con light-dark()) |
> | Protecciones de fingerprinting y sus nombres | patches/core/13-fingerprinting-core.patch |
> | Logo y fondo de nueva pestaña | randing/source/aether-mark.png, randing/source/aether-bg.png |
>
> ssets/css/00-tokens.css refleja esos valores con los nombres de token de la web. Si cambia el tema del navegador, hay que actualizarlos ahí.

| Dato | Valor | Estado |
|---|---|---|
| Organización | `AetherGroup` (GitHub) | ✅ Decidido |
| Repo del navegador | `github.com/AetherGroup/aetherfox` | ✅ Existe |
| **Repo de la web** | **`github.com/AetherGroup/aethergroup.github.io`** | ✅ **Decidido** (ya creado, público, con Pages activado) |
| **URL pública** | **`https://aethergroup.github.io/`** | ✅ **Decidido** |
| `site` (Astro) | `https://aethergroup.github.io` | ✅ Decidido |
| `base` (Astro) | `/` ← raíz, sin subpath | ✅ Decidido |
| Dominio propio | **No** | ✅ Decidido |
| Worker OAuth (CMS) | `https://aetherfox-cms-auth.<subdomain>.workers.dev` | Pendiente de Fase 5 |
| Lenguaje del contenido | Inglés (el copy del mockup) | Propuesto |

> **El repo debe llamarse `aethergroup.github.io` en minúsculas**: GitHub exige minúsculas cuando el nombre de la cuenta u organización contiene mayúsculas.
>
> ⚠️ **Restricción dura de GitHub Pages:** la URL raíz de una organización solo puede servirla un repo llamado exactamente `<org>.github.io`. Por eso el nombre del repo **es** la URL, y cambiarlo después obligaría a cambiar todas las URLs publicadas.
>
> **Revisión futura:** si AetherGroup sacara más productos con web propia, la raíz ya está ocupada. Se resolvería con un subpath (`https://aethergroup.github.io/<producto>/`) o con un dominio propio. No es una preocupación actual: la web vive en la raíz y Aetherfox es el producto principal de la organización.

**Por qué `aethergroup.github.io` y no `aetherfox.github.io`:** el nombre `aetherfox` está ocupado por la cuenta personal `AetherFox` (creada en 2010), y los usernames y las organizaciones comparten namespace, así que una org con ese nombre no es posible. Renombrar la cuenta personal para liberarlo se descartó por no estar justificado: la URL de la organización es coherente con la marca (`AetherGroup` = "Aether Group") y el coste del renombrado (URLs de repos, clones, CI) no compensa.

---

## 1. Análisis del mockup

### 1.1 Tokens extraídos (fidelidad de diseño)

El mockup usa un único bloque `<style>` con variables CSS. Se conservan **los valores exactos**; solo se renombran para que la jerarquía sea legible.

| Mockup | Token nuevo | Valor (aetherlight) | Uso |
|---|---|---|---|
| `--bg` | `--c-bg` | `#D8D0F6` | Fondo de página |
| `--bgi` | `--c-bg-image` | 2 radial-gradients + base | Fondo con profundidad |
| `--sf` | `--c-surface` | `#F6F3FF` | Tarjetas, paneles, header |
| `--sf2` | `--c-surface-2` | `#E6E0FB` | Zonas hundidas, chips, botón secundario |
| `--ed` | `--c-border` | `#BEB2EC` | Bordes de 1px |
| `--text` | `--c-text` | `#2B2160` | Texto corrido |
| `--st` | `--c-text-strong` | `#33258A` | Títulos, `color:var(--st)` |
| `--muted` | `--c-text-muted` | `#5E5590` | Texto secundario |
| `--ac` | `--c-accent` | `#6C5CE7` | Iconos, acentos, focus ring |
| `--ac2` | `--c-accent-2` | `#B9AEEF` | Gradientes, toggles |
| `--sh` | `--c-shadow` | `rgba(75,59,200,.38)` | Base de todas las sombras |
| `--btn` | `--c-gradient-primary` | `linear-gradient(135deg,#7B6BF0,#5B4BD8)` | Botón primario y panel de descarga |

**Los 6 temas del mockup se conservan** (`:root`, `data-theme=dark|purple|black|aetherlight|aetherdark`). El sistema de tema será extensible sin tocar CSS: añadir un tema = añadir un bloque `[data-theme=x]` en `00-tokens.css`.

### 1.2 Escala tipográfica

- Display: **Bricolage Grotesque** 600/800, `letter-spacing:-.025em` → `h1`, `h2`, `.disp`.
- Texto: **Plus Jakarta Sans** 500/600/700, `16px/1.55`.
- Escala: `clamp(40px,5.6vw,68px)/1.02` (h1) · `clamp(30px,4vw,46px)/1.08` (h2) · `20px/800` (h3) · `18px` (lead) · `16px` (body) · `14px` (small) · `12.5px` (badge).

### 1.3 Espaciado, radios, sombras, movimiento

- Contenedor `1180px`, gutter `28px` (`18px` en móvil).
- Secciones `84px 0` → escala responsive (84 / 64 / 48).
- Radios: `8` (chips, iconos) · `10` (botones, filas) · `14` (tarjetas, ventana).
- Sombras: 4 niveles derivados de `--c-shadow` (`--sh-sm` botón, `--sh-md` panel flotante, `--sh-lg` panel de privacidad, `--sh-xl` ventana del navegador).
- Movimiento: `--ease: cubic-bezier(.2,.8,.2,1)`; duraciones `.18s` / `.22s` / `.7s`; animación `rise`; transiciones de *view transition*; bloqueo completo con `prefers-reduced-motion`.

### 1.4 Inventario de componentes

| # | Componente | Notas de implementación |
|---|---|---|
| 1 | Header sticky con blur | `backdrop-filter` + `color-mix` sobre `--c-bg` |
| 2 | Navegación + CTA | Links a rutas reales, no a `#anclas` |
| 3 | Botón primario / secundario | Primario = gradiente; secundario = `--c-surface-2` |
| 4 | Hero 2 columnas | Grid `1.02fr 1fr`, `gap:48px` |
| 5 | **Mockup de navegador** | **100 % CSS/HTML** (pestañas, barra, página). No es una imagen: es responsive y accesible |
| 6 | Panel flotante *Shields* | Card superpuesta con toggles; decorativo (`role="img"`) |
| 7 | Lista de privacidad | 5 filas: icono + título + descripción |
| 8 | Bento de 3 tarjetas | Grid `repeat(3,1fr)` + chips "eliminado" con `line-through` |
| 9 | Panel de descarga | Gradiente, texto invertido, `grid-template-columns:1fr auto` |
| 10 | Footer | Marca, copyright, enlaces |
| 11 | Toggle | 34×19, knob 13px, gradiente acento |
| 12 | Iconografía | Sprite SVG inline: 17 símbolos, 24×24, `stroke-width:1.8`, `currentColor` |

### 1.5 Deuda técnica que el mockup arrastra (y que se corrige)

| Problema | Solución en la arquitectura |
|---|---|
| 12 KB de CSS en un `<style>` inline | 9 archivos por responsabilidad, cacheados por separado |
| Logo en base64 de 44 KB inyectado por JS | Archivo real en `assets/images/brand/`, `<img>` nativo con `width/height` |
| Enlaces a `#anclas` y `href="#"` | Rutas reales (`/news`, `/changelog`, `/download`) |
| Tema elegido solo por `prefers-color-scheme` | 6 temas seleccionables + `auto`, persistidos |
| Fuentes desde Google Fonts (petición a terceros) | Fuentes **autoalojadas** (OFL) en `assets/fonts/` |
| Sin `<head>` SEO, ni OG, ni sitemap, ni RSS | Capa `SEO.astro` + `@astrojs/sitemap` + `rss.xml.ts` |
| Sin skip-link, sin `prefers-reduced-motion` completo | Incluidos en `02-reset.css` / `03-base.css` |
| Sin errores 404 ni 500 | `src/pages/404.astro` |

---

## 2. Estructura completa de carpetas

```text
aetherfox/
├── .github/
│   └── workflows/
│       └── deploy.yml              # build + deploy a GitHub Pages (y deploy en PR)
├── admin/                           # ── Decap CMS (copiado a /admin)
│   ├── index.html                   # carga decap-cms.js
│   └── config.yml                   # colecciones, backend, media
├── assets/                          # ── Estáticos servidos en /assets/*
│   ├── css/
│   │   ├── 00-tokens.css            # color, tipografía, spacing, sombras, motion, z-index
│   │   ├── 01-fonts.css             # @font-face autoalojadas
│   │   ├── 02-reset.css             # reset moderno
│   │   ├── 03-base.css              # elementos + escala tipográfica
│   │   ├── 04-layout.css            # contenedores, rejillas, ritmo de sección
│   │   ├── 05-components.css        # todos los componentes reutilizables
│   │   ├── 06-pages.css             # estilos exclusivos por página
│   │   ├── 07-utilities.css         # utilidades atómicas
│   │   └── 08-print.css             # impresión de artículos (opcional)
│   ├── js/
│   │   ├── main.js                  # entry point; orquesta los módulos
│   │   ├── modules/
│   │   │   ├── theme.js             # 6 temas + auto + persistencia + theme-color
│   │   │   ├── navigation.js        # menú móvil, scroll-spy, sombra del header
│   │   │   ├── reveal.js            # animaciones de entrada (IntersectionObserver)
│   │   │   ├── toc.js               # tabla de contenidos + scroll-spy
│   │   │   ├── copy-code.js         # botón "copiar" en bloques de código
│   │   │   ├── downloads.js         # detección de SO + versión publicada
│   │   │   ├── search.js            # búsqueda local (fase 5)
│   │   │   └── forms.js             # validación de formularios sin terceros
│   │   └── lib/
│   │       ├── dom.js               # qs/qsa/on/delegate/ready
│   │       ├── storage.js           # localStorage seguro con namespace
│   │       └── motion.js            # prefers-reduced-motion + scrollTo
│   ├── images/
│   │   ├── brand/                   # logo webp/svg, mark, favicons derivados
│   │   ├── icons/                   # favicon.svg, apple-touch-icon, mask-icon
│   │   ├── social/                  # OG image por defecto + OG de artículos
│   │   ├── ui/                      # gráficos, capturas, texturas
│   │   └── uploads/                 # media folder de Decap (.gitkeep)
│   ├── fonts/                       # woff2 autoalojadas (OFL)
│   │   ├── bricolage-grotesque-var.woff2
│   │   └── plus-jakarta-sans-var.woff2
│   └── data/
│       └── releases.json            # versiones, checksums, plataformas
├── content/                         # ── Markdown (fuente de verdad, editada por Decap)
│   ├── news/
│   │   ├── new-settings-page.md
│   │   └── aetherfox-1-0.md
│   ├── changelog/
│   │   ├── 1.0.0.md
│   │   └── 1.1.0.md
│   ├── pages/                      # páginas estáticas (privacidad, licencia…)
│   │   ├── privacy.md
│   │   └── license.md
│   └── home/                       # copy editable de la home (opcional)
│       └── hero.md
├── src/                             # ── Código del sitio (Astro)
│   ├── components/
│   │   ├── layout/                 # Header, Footer, ThemeSwitcher, SkipLink
│   │   ├── ui/                     # Button, Card, Icon, Badge, Chip, Toggle, Section
│   │   ├── marketing/              # Hero, BrowserMock, ShieldsPanel, FeatureGrid…
│   │   └── content/                # PostCard, ChangelogEntry, Toc, Prose, Pagination
│   ├── content.config.ts           # colecciones (Content Layer API) + esquemas Zod
│   ├── data/
│   │   ├── site.ts                 # nombre, url, navegación, redes, legal
│   │   ├── features.ts             # contenido de /features, /faq, /roadmap
│   │   ├── downloads.ts            # plataformas, requisitos, enlaces
│   │   └── icons.ts                # mapa de los 17 símbolos SVG
│   ├── layouts/
│   │   ├── BaseLayout.astro        # <head>, SEO, fuentes, sprite, scripts
│   │   ├── PageLayout.astro        # header + main + footer, ancho y ritmo
│   │   ├── ArticleLayout.astro     # wrapper de artículo (TOC, meta, hero)
│   │   └── ChangelogLayout.astro    # wrapper de entrada de changelog
│   ├── lib/
│   │   ├── url.ts                  # withBase(), canonical(), rutas absolutas
│   │   ├── date.ts                 # formateo i18n, relative time
│   │   └── markdown.ts             # configuración de remark/rehype
│   └── pages/
│       ├── index.astro             # /
│       ├── news/
│       │   ├── index.astro         # /news
│       │   └── [...slug].astro     # /news/<slug>
│       ├── changelog/
│       │   ├── index.astro         # /changelog
│       │   └── [...slug].astro     # /changelog/<version>
│       ├── features.astro          # /features
│       ├── download.astro          # /download
│       ├── faq.astro               # /faq
│       ├── roadmap.astro           # /roadmap
│       ├── docs/index.astro        # /docs
│       ├── privacy.astro           # /privacy  (desde content/pages)
│       ├── 404.astro               # /404
│       └── rss.xml.ts              # /rss.xml
├── reference/                        # ── Material de trabajo (no se publica)
│   ├── mockup-original.html         # copia del mockup de referencia
│   └── brand/
│       └── aetherfox-logo.webp      # logo decodificado del base64 (44 KB)
├── static/                          # publicDir de Astro (vacía; los estáticos van en assets/)
│   └── .gitkeep
├── oauth-worker/                    # ── Cloudflare Worker: autenticación OAuth de Decap
│   ├── src/
│   │   └── index.ts                 # /api/auth y /api/callback
│   ├── wrangler.toml
│   ├── package.json
│   └── README.md
├── scripts/
│   └── copy-static.mjs             # copia assets/ y admin/ → dist/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── .gitignore
├── .nojekyll                       # GitHub Pages no debe pasar por Jekyll
├── README.md
└── ARCHITECTURE.md                 # este documento
```

### 2.1 Mapa URL → archivo

**El sitio vive en la raíz de `https://aethergroup.github.io/`** (`base: '/'`, sin subpath). La tabla muestra la URL absoluta:

| URL relativa | URL real | Archivo en `dist/` | Origen en el repo |
|---|---|---|---|
| `/` | `https://aethergroup.github.io/` | `index.html` | `src/pages/index.astro` |
| `/news` | `https://aethergroup.github.io/news/` | `news/index.html` | `src/pages/news/index.astro` |
| `/news/new-settings-page` | `https://aethergroup.github.io/news/new-settings-page/` | `news/new-settings-page/index.html` | `src/pages/news/[...slug].astro` |
| `/changelog` | `https://aethergroup.github.io/changelog/` | `changelog/index.html` | `src/pages/changelog/index.astro` |
| `/changelog/1.1.0` | `https://aethergroup.github.io/changelog/1.1.0/` | `changelog/1.1.0/index.html` | `src/pages/changelog/[...slug].astro` |
| `/assets/css/05-components.css` | `https://aethergroup.github.io/assets/css/…` | idéntico | `assets/css/05-components.css` |
| `/assets/js/main.js` | `https://aethergroup.github.io/assets/js/main.js` | idéntico | `assets/js/main.js` |
| `/admin` | `https://aethergroup.github.io/admin/` | `admin/index.html` | `admin/index.html` |
| `/admin/config.yml` | `https://aethergroup.github.io/admin/config.yml` | idéntico | `admin/config.yml` |
| `/rss.xml` | `https://aethergroup.github.io/rss.xml` | `rss.xml` | `src/pages/rss.xml.ts` |
| — | `https://aetherfox-cms-auth.<sub>.workers.dev/api/auth` | (fuera de Pages) | `oauth-worker/src/index.ts` |

> **Nota de implementación (verificada contra la documentación de Astro 7):** en Astro, `publicDir` es de tipo `string` — **`publicDir: false` ya no es válido** y provocaría un error de configuración. La solución es `publicDir: './static'` (carpeta vacía con un `.gitkeep`) más `scripts/copy-static.mjs`, que copia `assets/` y `admin/` a `dist/` tras el build. Alternativa equivalente: mover `assets/` y `admin/` dentro de `public/`; la URL pública no cambia.

---

## 3. Justificación arquitectónica (por carpeta)

### Raíz del repo
Contiene **solo** configuración y directorios de primer nivel. Nada más compite por atención en la raíz: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.nojekyll`.

### `assets/`
Capa estática **sin procesar**: CSS, JS, imágenes, fuentes, datos. Se sirve 1:1. Se separa de `src/` a propósito: `src/` es código que el build compila; `assets/` son archivos que el navegador consume tal cual. Editar `assets/css/05-components.css` es editar el resultado final, sin paso intermedio.

### `assets/css/`
Dividido por **ejes de cambio**, no por tamaño. Un cambio de espaciado toca `00-tokens.css`; un cambio de un botón, `05-components.css`; un cambio en la home, `06-pages.css`. Los archivos se cachean de forma independiente: una corrección de un componente no invalida todo el CSS.

### `assets/js/`
Módulos ES nativos, sin framework, sin bundle. El mockup solo necesitaba 4 líneas de JS; la web real necesita ~10 módulos pequeños, cada uno con una responsabilidad y una API clara. Se separa `modules/` (comportamiento de página) de `lib/` (utilidades reutilizables sin conocimiento del dominio).

### `assets/images/`, `assets/fonts/`
Los medios del sitio. Las fuentes se autoalojan porque **la web de un navegador sin telemetría no puede llamar a Google Fonts**: sería una fuga de IP, User-Agent y Referer en cada visita, incoherente con el producto.

### `content/`
Fuente de verdad del contenido en Markdown. Separada de `src/` porque su ciclo de vida es distinto: la edita un redactor (no un desarrollador), tiene control de versiones por sí misma y en el futuro la editará Decap desde `/admin`. `content/` **no** se publica en `dist/`.

### `admin/`
Configuración de Decap. Vive fuera de `src/` porque es una *herramienta de edición*, no parte del sitio: se puede eliminar entero sin tocar el resto. El `config.yml` de Decap es la primera documentación del modelo de contenido.

### `src/`
Todo el código de presentación: componentes, layouts, páginas, datos tipados y helpers. Los layouts son la base de la consistencia: `BaseLayout` define el esqueleto HTML, el `head`, la carga de fuentes, el sprite de iconos y los scripts; los demás heredan y añaden.

### `src/data/`
Contenido **estructurado y tipado** (navegación, features, FAQ, roadmap, descargas). Se separa de `src/components` porque son datos, no vista: se pueden testear, reutilizar en varias páginas y, cuando toque, migrar a colecciones de Decap sin reescribir componentes.

### `src/pages/`
El router. Una página = una ruta. El sistema de archivos hace de router: añadir `/blog` es crear `src/pages/blog/index.astro` y ya está publicado, sin registrar nada.

### `src/lib/`
Utilidades de bajo nivel sin dependencias del dominio (`url`, `date`, `markdown`). Todo lo que se usa en más de un módulo y no es un componente va aquí.

### `oauth-worker/`
El único componente del proyecto que **no** se despliega en GitHub Pages. Es un Cloudflare Worker diminuto que hace el intercambio OAuth de Decap (guarda el `client_secret`, que no puede vivir en un repo público). Vive en el mismo repo por cercanía al código que lo consume, pero se despliega por separado (`wrangler deploy`) y no se copia a `dist/`.

### `scripts/`
Automatizaciones de build. Empezamos con un solo script (copiar estáticos) y crece con lo que haga falta (minificación, generar `releases.json`, validar frontmatter).

### `.github/workflows/`
CI/CD. Build en cada push, deploy a Pages, y **preview deploy** en cada Pull Request para revisar cambios de contenido sin tocar `main`.

### `reference/`
Material de trabajo: el mockup original y el logo ya decodificado. **No se publica** ni se despliega: sirve para comprobar la paridad visual durante la migración y como punto de partida de `assets/images/brand/`.

### `ARCHITECTURE.md` y `README.md`
El primero es este documento (decisiones y porqués). El segundo es la guía de arranque para cualquiera que clone el repo. Separados porque tienen audiencias y ciclos de vida distintos.

---

## 4. División del CSS

### 4.1 Orden de carga

```html
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/bricolage-grotesque-var.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/plus-jakarta-sans-var.woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/00-tokens.css">
<link rel="stylesheet" href="/assets/css/01-fonts.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/02-reset.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/03-base.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/04-layout.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/05-components.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/06-pages.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/07-utilities.css?v=1.0.0">
<link rel="stylesheet" href="/assets/css/08-print.css?v=1.0.0" media="print">
```

`<link>` en paralelo (HTTP/2 en GitHub Pages) en vez de `@import` (que serializa). Los prefijos numéricos mantienen el orden legible y estable aunque alguien aplane las capas.

**El `?v=` no es opcional.** GitHub Pages no permite controlar `Cache-Control` y sirve los estáticos con `max-age=600` (10 minutos). Sin versionado en la query, un usuario que ya tenga el CSS cacheado puede seguir viendo la versión anterior tras un despliegue. El parámetro sale de `src/data/site.ts` (`site.assetVersion`) y se incrementa en cada release.

### 4.2 Cascade layers

Declaradas una sola vez, en `00-tokens.css`:

```css
@layer reset, base, layout, components, pages, utilities;
```

Consecuencia práctica: una utilidad (`utilities`) gana siempre a un componente, y un componente gana a la base, **sin wars de especificidad**. Se puede escribir `.hero__title { color: var(--c-text-strong) }` sinributar `!important` en ningún sitio.

### 4.3 Contenido de cada archivo

| Archivo | Capa | Contenido | Origen en el mockup |
|---|---|---|---|
| `00-tokens.css` | — | `:root` + 6 temas, escalas de color/espaciado/tipografía/sombra/motion/z-index | Bloques `:root` (líneas 8–13) |
| `01-fonts.css` | — | `@font-face` de las 2 familias variables, `font-display:swap`, `unicode-range` | `<link>` a Google Fonts (línea 6) |
| `02-reset.css` | `reset` | `box-sizing`, márgenes, `img/svg` display, `button/input` heredados, `:focus-visible`, `::selection`, scrollbar, `[hidden]` | Reglas `*,*::before,*::after` y `button,a` (líneas 14–18) |
| `03-base.css` | `base` | `body` (fondo, tipografía, `background-attachment:fixed`), `h1–h4`, `p`, `a`, listas, `code/pre`, `blockquote`, `table`, `hr`, `.display`/`.lead`/`.muted`/`.eyebrow` | `body`, `h1`, `.disp`, `.lead` (líneas 16–20, 30–32) |
| `04-layout.css` | `layout` | `.wrap` (1180px), `.section` (ritmo 84/64/48), `.grid-2/3`, `.split`, `.stack`, `.cluster`, `.page-shell` | `.wrap`, `section`, grids `.hero/.priv/.bento` (19, 29, 49, 51, 56) |
| `05-components.css` | `components` | `.btn` (+`.btn--secondary`, `.btn--ghost`, `.btn--lg`), `.site-header`, `.site-nav`, `.site-footer`, `.icon`, `.card`, `.bento__card`, `.browser-mock` (+`.mock__tab`, `.mock__bar`, `.mock__url`, `.mock__page`), `.shields`, `.toggle`, `.feature-row`, `.chip`, `.download-panel`, `.theme-switcher`, `.post-card`, `.toc`, `.prose` | Bloque de estilos principal (26–68) |
| `06-pages.css` | `pages` | `.page-home` (hero, secciones), `.page-news` (listado, filtros), `.page-article` (cabecera, meta, ancho de lectura), `.page-changelog` (timeline, badges de versión), `.page-download` (tabla de plataformas, checksums), `.page-faq` (acordeón), `.page-404` | — (nuevo) |
| `07-utilities.css` | `utilities` | `.u-visually-hidden`, `.u-mono`, `.u-center`, `.u-stack-*`, `.u-mt-*`, `.u-hide-sm`, `.u-badge-*` | — (nuevo) |
| `08-print.css` | `print` | Oculta navegación, fuerza fondo blanco, muestra URLs tras enlaces | — (pendiente, fase 7) |

### 4.4 Reglas de convención

- **BEM plano**: `.block__element--modifier`. Sin `::` salvo pseudo-elementos reales.
- **Prefijo de bloque** coherente con el archivo que lo define.
- **Nada de colores literales** fuera de `00-tokens.css`. Si aparece un `#6C5CE7` en `05-components.css`, es un bug.
- **Nada de `!important`** (salvo en `print.css`).
- Tokens siempre referenciados como `var(--c-*)`, `var(--sp-*)`, `var(--fs-*)`, `var(--sh-*)`.
- Un componente = un bloque contiguo en `05-components.css`, precedido por un comentario `/* ===== .block ===== */`.

---

## 5. División del JavaScript

### 5.1 Principio

Cero JS en el HTML inicial: todo lo que se puede hacer con HTML y CSS se hace con HTML y CSS (el mockup del navegador es CSS puro, el reveal es *progressive enhancement*). JS solo añade lo que CSS no puede: persistencia de preferencia, menú móvil, clipboard, datos de red.

### 5.2 Módulos

| Módulo | API pública | Responsabilidad |
|---|---|---|
| `main.js` | — | Entry point. Importa los módulos y los inicializa en `DOMContentLoaded`. Único punto de entrada; cada módulo es autónomo. |
| `modules/theme.js` | `initTheme()`, `getTheme()`, `setTheme(t)`, `cycleTheme()` | Lee `localStorage['aetherfox:theme']`; si no hay, usa `prefers-color-scheme` → `aetherdark`/`aetherlight`. Aplica `data-theme` en `<html>`, sincroniza `<meta name="theme-color">`, emite `themechange`. |
| `modules/navigation.js` | `initNav()` | Toggle del menú móvil (`aria-expanded`, `inert` fuera de pantalla, cierre con `Esc`), scroll-spy del link activo, sombra del header al hacer scroll. |
| `modules/reveal.js` | `initReveal()` | Un único `IntersectionObserver` para todos los `[data-reveal]`; añade `.is-visible`; se desactiva con `prefers-reduced-motion`. |
| `modules/toc.js` | `initToc()` | Construye/activa la TOC de los artículos, scroll-spy de encabezados, scroll suave compensado por la altura del header. |
| `modules/copy-code.js` | `initCopyCode()` | Botón "copiar" en cada `pre > code`, con feedback "Copiado" y fallback `execCommand`. |
| `modules/downloads.js` | `initDownloads()` | Detecta el SO por UA y sugiere la build correcta; lee `assets/data/releases.json`; marca "última versión". |
| `modules/search.js` | `initSearch()` | Búsqueda local sobre un índice JSON pregenerado en build. (Fase 5) |
| `modules/forms.js` | `initForms()` | Validación y estados de envío **sin servicios de terceros**. (Fase 5) |
| `lib/dom.js` | `qs`, `qsa`, `on`, `delegate`, `ready` | Azúcar sintáctico mínimo sobre el DOM. |
| `lib/storage.js` | `get(key, fallback)`, `set(key, value)`, `remove(key)` | `localStorage` con `try/catch` (modo privado, cuota llena) y namespace `aetherfox:`. |
| `lib/motion.js` | `prefersReducedMotion()`, `scrollToEl(el, offset)` | Única fuente de verdad sobre la preferencia de movimiento. |

### 5.3 Script anti-flash (el único JS inline)

Va en el `<head>` de `BaseLayout.astro`, antes de la hoja de estilos. Es la única forma de evitar el destello de tema incorrecto:

```html
<script>
  (() => {
    const t = localStorage.getItem('aetherfox:theme');
    const s = matchMedia('(prefers-color-scheme: dark)').matches ? 'aetherdark' : 'aetherlight';
    document.documentElement.dataset.theme = (!t || t === 'auto') ? s : t;
  })();
</script>
```

### 5.4 Carga

```html
<script type="module" src="/assets/js/main.js"></script>
```

Los módulos ES se aplazan por defecto. Un solo `<script type="module">` → un solo request (el resto son imports, en paralelo).

---

## 6. Sistema de contenidos

### 6.1 Colecciones (`src/content.config.ts`)

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default('Aetherfox Team'),
    category: z.enum(['Release', 'Privacy', 'Design', 'Engineering']).default('Release'),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/changelog' }),
  schema: z.object({
    version: z.string(),            // "1.1.0"
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['major', 'minor', 'patch']),
    platforms: z.array(z.enum(['windows', 'linux', 'macos'])).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    template: z.enum(['default', 'wide']).default('default'),
    order: z.number().default(0),
  }),
});

export const collections = { news, changelog, pages };
```

El esquema Zod es la **documentación ejecutable** del contenido: si un editor guarda un `date` inválido, el build falla con un mensaje claro en lugar de publicar una página rota.

### 6.2 Frontmatter de ejemplo

`content/news/new-settings-page.md`:

```yaml
---
title: "A new settings page"
description: "Aetherfox now ships with a rebuilt settings experience."
date: 2026-03-14
author: "Aetherfox Team"
category: "Design"
tags: ["ui", "release"]
cover: "/assets/images/uploads/new-settings-page.png"
coverAlt: "The new Aetherfox settings page"
featured: true
draft: false
---
```

`content/changelog/1.1.0.md`:

```yaml
---
version: "1.1.0"
title: "Shields panel, faster startup"
date: 2026-05-02
type: "minor"
platforms: ["windows", "linux"]
summary: "Rebuilt Shields panel, 18% faster cold start, and no telemetry — as always."
draft: false
---
```

El **nombre del archivo es el slug**: `1.1.0.md` → `/changelog/1.1.0`. Sin campo `slug` en el frontmatter, sin lógica extra.

### 6.3 Decap CMS (fase 5 — arquitectura ya preparada)

`admin/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <!-- Descubrimiento de la config: ruta relativa a /admin/ -->
    <link href="config.yml" type="text/yaml" rel="cms-config-url" />
    <title>Aetherfox CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/decap-cms@^3.1.2/dist/decap-cms.js"></script>
  </body>
</html>
```

> El `rel="cms-config-url"` es la forma canónica de que Decap encuentre la configuración. Con la ruta relativa `config.yml`, resuelve a `/admin/config.yml` tanto en la raíz como en un subpath (`/aetherfox/admin/config.yml`), porque el enlace es relativo a la página actual. **Nunca escribir `/admin/config.yml` con barra inicial**: en un subpath daría error.
>
> El fichero se llama `index.html` (no `admin.html`) a propósito: en GitHub Pages, `/admin/` sirve `dist/admin/index.html`. Un `admin.html` suelto serviría `/admin.html`, no `/admin/`.

`admin/config.yml` (la versión final, con la opción A, está en §6.5.6; aquí la estructura):

```yaml
backend:
  name: github
  repo: AetherGroup/aethergroup.github.io
  branch: main
  squash_merges: true
  commit_messages:
    create: "cms: create {{collection}} «{{slug}}»"
    update: "cms: update {{collection}} «{{slug}}»"
    delete: "cms: delete {{collection}} «{{slug}}»"

local_backend: true
publish_mode: editorial_workflow

media_folder: "assets/images/uploads"
# El sitio vive en la raíz: el subpath no aplica.
public_folder: "/assets/images/uploads"

# El sitio vive en la raíz (https://aethergroup.github.io/): no hay subpath.
base_url: /

collections:
  - name: news
    label: News
    folder: content/news
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields: &news_fields
      - { label: Title, name: title, widget: string }
      - { label: Description, name: description, widget: text }
      - { label: Published on, name: date, widget: datetime }
      - { label: Updated on, name: updated, widget: datetime, required: false }
      - { label: Author, name: author, widget: string, default: "Aetherfox Team" }
      - { label: Category, name: category, widget: select, options: [Release, Privacy, Design, Engineering] }
      - { label: Tags, name: tags, widget: list }
      - { label: Cover, name: cover, widget: image, required: false }
      - { label: Cover alt text, name: coverAlt, widget: string, required: false }
      - { label: Featured, name: featured, widget: boolean, default: false }
      - { label: Draft, name: draft, widget: boolean, default: false }
    body: body

  - name: changelog
    label: Changelog
    folder: content/changelog
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - { label: Version, name: version, widget: string }
      - { label: Title, name: title, widget: string }
      - { label: Released on, name: date, widget: datetime }
      - { label: Type, name: type, widget: select, options: [major, minor, patch] }
      - { label: Platforms, name: platforms, widget: list }
      - { label: Summary, name: summary, widget: text }
      - { label: Draft, name: draft, widget: boolean, default: false }
    body: body

  - name: pages
    label: Static pages
    folder: content/pages
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - { label: Title, name: title, widget: string }
      - { label: Description, name: description, widget: text }
      - { label: Date, name: date, widget: datetime }
      - { label: Template, name: template, widget: select, options: [default, wide] }
      - { label: Order, name: order, widget: number, default: 0 }
    body: body
```

**Puntos de acuerdo entre Decap y Astro:**

| Concepto | Decap | Astro | Coincide |
|---|---|---|---|
| Carpeta de contenido | `folder: content/news` | `base: './content/news'` | ✅ |
| Extensión | `extension: md` | `pattern: '**/*.md'` | ✅ |
| Media | `media_folder: assets/images/uploads` | `public_folder: /assets/images/uploads` | ✅ |
| Slug | nombre de archivo | id del loader = nombre de archivo | ✅ |
| Descubrimiento de config | `rel="cms-config-url"` → `config.yml` | carpeta `admin/` copiada a `dist/admin/` | ✅ |

`local_backend: true` permite escribir en local con `npx decap-server` sin ningún servicio externo: es la vía de desarrollo normal.

### 6.4 Autenticación de Decap en GitHub Pages — el límite real

> **Este es el único punto de todo el proyecto que GitHub Pages no puede resolver por sí solo.**

GitHub Pages sirve **archivos estáticos**: no hay PHP, ni Node, ni funciones. La autenticación OAuth de Decap necesita un servidor que:

1. Guarde el secreto de la GitHub OAuth App (nunca puede ir en el repo).
2. Emita tokens de sesión (JWT).
3. Acts como proxy hacia la API de GitHub (para no agotar la cuota con la IP del usuario).

Por eso **la web funciona perfecto en GitHub Pages, pero el login de `/admin` necesita un servicio externo**. No es un defecto de la arquitectura: es una limitación del hosting estático, y hay soluciones estándar.

| Opción | Qué es | Coste | Notas |
|---|---|---|---|
| **A. `github` backend + OAuth client serverless** | Un proxy (p. ej. `decap-proxy`, en Cloudflare Workers) que hace de OAuth + proxy GitHub | Gratis (Workers free tier) | **Recomendada.** El sitio sigue 100 % en GitHub Pages; solo el login vive fuera. `backend: { name: 'github', repo: 'AetherGroup/aethergroup.github.io', base_url: 'https://aetherfox-cms-auth.<sub>.workers.dev' }` |
| **B. `git-gateway` + Git Gateway propio** | `netlify/git-gateway` autoalojado + GoTrue (o cualquier emisor de JWT) | Un servidor mínimo | Funciona, pero implica mantener un servicio en marcha |
| **C. `git-gateway` + Netlify Identity** | La vía clásica de Decap | Cuenta de Netlify | El repo sigue en GitHub Pages; Netlify solo sirve Identity. Cero código extra, pero añade un proveedor externo |
| **D. Decap Turbo** | Backend OAuth alojado por Decap | De pago, con plan gratuito | Lo más simple de operar, menos control |
| **E. Sin CMS en producción** | Editar el Markdown en GitHub directamente | 0 | **Plan B sólido**: la arquitectura de contenido ya funciona sin Decap |

**Cómo se traduce en el `config.yml`** (opción A, la recomendada):

```yaml
backend:
  name: github
  repo: AetherGroup/aethergroup.github.io
  branch: main
  base_url: https://aetherfox-cms-auth.<subdomain>.workers.dev
  auth_endpoint: api/auth
  site_domain: https://aethergroup.github.io
```

El sitio vive en la **raíz**, así que el `base_url` de Decap es `/` y `public_folder` no lleva prefijo. La configuración completa y definitiva está en §6.5.6.

**Decisión de proyecto: opción A** (OAuth client serverless gratuito en Cloudflare Workers). El sitio **no** se mueve de GitHub Pages: solo el login vive fuera. Se implementa en la Fase 5.

### 6.5 Opción A — implementación concreta

#### 6.5.1 El flujo

```text
1. Editor abre https://aethergroup.github.io/admin/
2. Decap hace clic en "Login with GitHub"
3. Decap abre un POPUP en  https://aetherfox-cms-auth.<sub>.workers.dev/api/auth
4. El worker redirige a https://github.com/login/oauth/authorize
      ?client_id=…&redirect_uri=…/api/callback&scope=repo+user&state=…
5. GitHub autentica al editor y redirige a  …/api/callback?code=…
6. El worker cambia el `code` por un access_token (llamada server-side a GitHub)
7. El worker responde con una página que hace
      window.opener.postMessage('authorization:github:success:{"token":…}', origin)
8. Decap recibe el token en la ventana principal y ya puede hablar con api.github.com
```

**Clave: la API de GitHub la llama el navegador directamente** (`https://api.github.com`, con CORS habilitado por GitHub). El worker **solo** hace el intercambio del `code` por el token, que es la única operación que exige guardar el `client_secret`. Por eso un worker de ~80 líneas basta, y por eso el plan gratuito de Cloudflare Workers (100 000 req/día) es de sobra para un equipo editorial.

#### 6.5.2 Estructura en el repo

```text
oauth-worker/                       # proyecto independiente, mismo repo
├── src/
│   └── index.ts                    # los 2 endpoints
├── wrangler.toml                   # configuración de Cloudflare
├── package.json
└── README.md
```

> `oauth-worker/` **no** se copia a `dist/` (el script de estáticos solo copia `assets/` y `admin/`), así que no afecta al sitio. Es un despliegue aparte: `wrangler deploy` publica el worker; el sitio sigue en GitHub Pages.

#### 6.5.3 `wrangler.toml`

```toml
name = "aetherfox-cms-auth"
main = "src/index.ts"
compatibility_date = "2026-01-01"

# Secretos: NUNCA en el repo.
#   npx wrangler secret put GITHUB_CLIENT_ID
#   npx wrangler secret put GITHUB_CLIENT_SECRET
```

#### 6.5.4 `src/index.ts` (esqueleto)

```ts
interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  CMS_ORIGIN: string;          // "https://aethergroup.github.io"
  STATE_SECRET: string;        // para firmar el state (HMAC)
}

const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth') return handleAuth(url, env);
    if (url.pathname === '/api/callback') return handleCallback(request, url, env);
    return new Response('Aetherfox CMS auth', { status: 200 });
  },
};

// 1. Inicia el flujo OAuth: redirige a GitHub.
async function handleAuth(url: URL, env: Env): Promise<Response> {
  // El state va firmado con HMAC: no se necesita estado servidor-side.
  const nonce = crypto.randomUUID();
  const state = await sign(nonce, env.STATE_SECRET);

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', 'repo user');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': cookie('aetherfox_oauth_state', state, 600),
    },
  });
}

// 2. Canjea el code por un token y se lo pasa a la ventana de Decap.
async function handleCallback(request: Request, url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return new Response('Missing code or state', { status: 400 });

  // Validación del state: evita OAuth injection / CSRF.
  const sent = readCookie(request, 'aetherfox_oauth_state');
  if (!sent || sent !== state || !(await verify(state, env.STATE_SECRET))) {
    return new Response('Invalid state', { status: 400 });
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    return new Response(`OAuth error: ${data.error ?? 'unknown'}`, { status: 401 });
  }

  // Formato exacto que espera Decap (verificado en el backend de Decap).
  const payload = { token: data.access_token, provider: 'github' };
  const html = `<!doctype html><html><body><script>
    (function () {
      var msg = 'authorization:github:success:' + JSON.stringify(${JSON.stringify(payload)});
      window.opener.postMessage(msg, ${JSON.stringify(env.CMS_ORIGIN)});
      window.close();
    })();
  </script></body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'set-cookie': cookie('aetherfox_oauth_state', '', 0),   // limpiar
    },
  });
}

// --- helpers de state y cookies (omitidos por brevedad) ---
```

> **Dos mejoras sobre las implementaciones comunitarias** (p. ej. `i40west/netlify-cms-cloudflare-pages`, ★165, que es la más usada):
>
> 1. **Validación del `state`.** Esas versiones generan un `state` aleatorio en `/api/auth` pero **no lo comprueban** en el callback. Eso deja abierta la OAuth injection. Aquí el `state` va firmado con HMAC **y** en una cookie `httpOnly`, y se verifican ambas cosas.
> 2. **`postMessage` con origen explícito.** Ellos usan `'*'`, lo que entrega el token a cualquier origen que sea el `opener`. Aquí se envía a `CMS_ORIGIN` (el origen exacto del CMS), que es lo correcto cuando se conoce.
>
> `CMS_ORIGIN` y `STATE_SECRET` van como secretos de Wrangler (`npx wrangler secret put CMS_ORIGIN`), no como variables de texto plano.

#### 6.5.5 GitHub OAuth App (pasos manuales, una sola vez)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL**: `https://aethergroup.github.io/` (la del sitio).
3. **Authorization callback URL**: `https://aetherfox-cms-auth.<subdomain>.workers.dev/api/callback` — **exactamente** esta. GitHub exige coincidencia exacta.
   - Sin dominio propio (decidido) se usa la URL `workers.dev`. Funciona igual; solo es menos elegante. Si algún día se añade un dominio, la callback URL se cambia en GitHub y en el worker, en el mismo commit.
4. GitHub genera **Client ID** y **Client Secret**.
5. `npx wrangler secret put GITHUB_CLIENT_ID` y `… GITHUB_CLIENT_SECRET`, más `CMS_ORIGIN` (`https://aethergroup.github.io`) y `STATE_SECRET` (un string aleatorio largo).
6. `npx wrangler deploy` → URL del worker: `https://aetherfox-cms-auth.<subdomain>.workers.dev`.

#### 6.5.6 `admin/config.yml` final (opción A + sitio en la raíz)

```yaml
backend:
  name: github
  repo: AetherGroup/aethergroup.github.io
  branch: main
  squash_merges: true
  commit_messages:
    create: "cms: create {{collection}} «{{slug}}»"
    update: "cms: update {{collection}} «{{slug}}»"
    delete: "cms: delete {{collection}} «{{slug}}»"

  # ── Autenticación: nuestro worker de Cloudflare ──
  base_url: https://aetherfox-cms-auth.<subdomain>.workers.dev
  auth_endpoint: api/auth
  site_domain: https://aethergroup.github.io

# ── El sitio vive en la RAÍZ: no hay subpath que resolver ──
base_url: /

# ── Media ──
media_folder: assets/images/uploads
public_folder: /assets/images/uploads

local_backend: true
publish_mode: editorial_workflow
```

**Los tres `base_url` distintos, explicados:**

| Clave | Valor | Para qué sirve |
|---|---|---|
| `backend.base_url` | `https://…workers.dev` | Dónde está el **worker** que hace el OAuth. No es la URL del sitio. |
| `backend.site_domain` | `https://aethergroup.github.io` | La URL del **sitio**, para volver a `/admin/` tras el login. |
| `base_url` (raíz) | `/` | El sitio vive en la raíz: no hay subpath que resolver. |

⚠️ **Los tres son obligatorios y se confunden con facilidad.** Con el sitio en un subpath, si `base_url` (raíz) falta, las imágenes subidas se rompen; si `backend.base_url` apunta al sitio en vez de al worker, el login falla con un 404 en `/api/auth`.

#### 6.5.7 Verificación de la opción A

- [ ] `GET https://aetherfox-cms-auth.<sub>.workers.dev/api/auth` → 302 a `github.com/login/oauth/authorize` con `redirect_uri` y `state` correctos.
- [ ] El popup se abre y GitHub pide permisos (`repo user`).
- [ ] Tras autorizar, el popup se cierra solo y el CMS aparece logueado.
- [ ] Se crea un artículo de prueba → commit en `main` → el build lo publica en `/news/<slug>/`.
- [ ] La imagen subida en el editor es visible en el artículo publicado.
- [ ] Un usuario **sin** acceso de escritura al repo recibe el error de permisos claro (no un 500).

---

### 6.6 El CMS propio (estado actual) - Decap quedó atrás

Lo descrito en 6.3 y 6.5 es el plan original con Decap. **No es lo que hay desplegado.** Decap se eliminó porque su aplicación es una SPA de React con su propia estructura visual: no se puede reorganizar con CSS, solo maquillar. Cada vez que se tocaba el tema el resultado seguía siendo un dashboard genérico, que es justo lo que no queremos.

El CMS actual está escrito desde cero en `admin/`:

```
admin/
  index.html          # shell, cabecera, pie y sprite de iconos
  app.js              # arranque, router por hash, tema, menús
  admin.css           # diseño del CMS (tokens de la marca, claro y oscuro)
  schema.json         # fuente única: colecciones, campos, rutas y textos
  config.yml          # generado desde schema.json (compatibilidad)
  lib/
    api.js            # llamadas a la API de GitHub
    auth-store.js     # token y usuario en localStorage
    markdown.js       # frontmatter y formato de fecha
  views/
    collection.js     # vista de contenidos (lista y panel de estado)
    editor.js         # editor con escritura, vista previa y borrado
    login.js          # pantalla de acceso
    panels.js         # media y workflow
```

**Una sola fuente de verdad: `admin/schema.json`.** Define colecciones, carpeta, etiqueta, singular, icono, descripción y ruta pública de cada una, además de los campos. De ahí se genera `admin/config.yml` (`scripts/generate-admin-config.mjs`) y se valida contra el esquema Zod de Astro (`scripts/check-schema.mjs`, corre en `prebuild` y falla si divergen). El CMS nunca describe una colección por su cuenta.

#### 6.6.1 Estructura: barra superior y espacio de trabajo

El CMS no es un dashboard de tarjetas. Es una aplicación con dos zonas y una jerarquía clara:

**Barra superior (fija):** marca a la izquierda, secciones (`Contents`, `Workflow`, `Media`), buscador, y a la derecha el botón **New entry** con chevron (que abre el menú de colecciones) junto al conmutador de tema y al avatar.

**Espacio de trabajo (dos columnas):**

- **Columna principal**: cabecera de página (eyebrow con la carpeta, título, descripción) y el **selector de colección** en forma de pestañas con recuento (`All 6 · News 3 · Changelog 2 · Static pages 1`). Debajo, **una sola lista de entradas**, no una rejilla de tarjetas repetida por colección:
  - La pestaña `All` mezcla todo y ordena por fecha.
  - Cada fila es una fila, no una tarjeta: miniatura, título, línea de metadatos (fecha, colección, categoría, estado) y acciones.
  - Solo `Edit` está siempre visible. `Ver publicado` y `Abrir el fichero en GitHub` aparecen al pasar por encima.
  - El buscador de la cabecera filtra la lista en vivo.
- **Panel lateral**: estado (publicados, borradores, entradas, colecciones), actividad reciente (los commits que tocan `content/`) y enlaces al sitio, al repositorio y a las releases.

**Editor:** el formulario son dos tarjetas (`Details` y `Content markdown`), con los campos cortos en rejilla de dos columnas, la vista previa en vivo a la derecha, y en la barra las acciones `Save`/`Publish` y `Delete`. El área de texto lleva una barra de herramientas que escribe el Markdown (ver 6.6.2).

#### 6.6.2 Escribir en Markdown sin saber Markdown

El contenido es un fichero Markdown, pero quien publica no debería tener que recordar la sintaxis. El editor lleva una **barra de herramientas** sobre el área de texto (`admin/lib/markdown-toolbar.js`) con todo lo que el sitio sabe renderizar:

| Botones | Qué hacen |
| --- | --- |
| `H1` `H2` `H3` `H4` `¶` | Tamaño del texto. `¶` devuelve el párrafo a texto normal |
| negrita, cursiva, tachado, código | Envuelven la selección. Si ya está envuelta, la desenvuelven |
| viñetas, numeración, cita | Prefijan las líneas seleccionadas. Si ya llevan el prefijo, lo quitan |
| enlace, imagen, bloque de código, tabla, línea | Insertan el bloque con el texto seleccionado ya dentro |

La barra no escribe el Markdown a mano: parte de lo que hay seleccionado y devuelve el Markdown equivalente. En un enlace o una imagen, el texto queda seleccionado para escribirlo y la URL queda marcada para sustituirla.

Atajos: `Ctrl+B` negrita, `Ctrl+I` cursiva, `Ctrl+K` código.

Junto al botón de **Publicar** hay un **Cheat sheet** que abre la lista de las trece sintaxis que el sitio entiende, con el resultado de cada una. Y un contador de palabras al lado del título del panel.

La vista previa se actualiza mientras se escribe, con el mismo renderizado que usa el sitio (GFM), así que lo que se ve en el CMS es lo que sale en la web.

#### 6.6.3 Colores en el texto

En un changelog no siempre sirve el mismo estilo: un cambio que rompe la API no debería leerse igual que un arreglo. El CMS tiene un botón de paleta que marca la selección con un color **semántico**, no libre:

| Clase | Color | Para qué |
| --- | --- | --- |
| `c-breaking` | rojo | Rompe la API o el formato |
| `c-added` | verde | Novedad |
| `c-fixed` | azul | Arreglo |
| `c-changed` | morado (acento) | Cambio de comportamiento |
| `c-deprecated` | ámbar | Obsoleto |

La barra escribe `<span class="c-breaking">texto</span>` alrededor de lo seleccionado. Si el texto ya tenía un color, se cambia el color en lugar de anidar otro span, y la opción **Quitar el color** lo deja limpio.

El sitio pinta esas clases en `05-components.css` con los tokens `--c-danger`, `--c-success`, `--c-info`, `--c-accent` y `--c-warning`, que se definieron para los seis temas. La vista previa del CMS carga ese mismo fichero, así que el color que se ve al escribir es exactamente el que sale en la web.

> Markdown no tiene colores. Se usa HTML en linea, que Astro y `marked` dejan pasar tal cual. Es HTML minimo y controlado: solo la clase `c-*`, sin estilos en linea.

#### 6.6.4 Todos los estilos de texto

La barra de herramientas tiene 29 botones. Markdown se queda corto, asi que lo que no existe en el se escribe con HTML en linea, que Astro y `marked` dejan pasar tal cual.

**Tamanos:** `H1` `H2` `H3` `H4` `¶` (párrafo normal), `A+` y `A−` (`<span class="tx-big">` y `tx-small`).

**Enfasis:** negrita, cursiva, negrita+cursiva, tachado, subrayado (`<u>`) y resaltado (`<mark>`).

**Marcas:** superindice (`<sup>`), subindice (`<sub>`) y tecla de teclado (`<kbd>`), que en un navegador tiene sentido.

**Codigo:** en linea y bloque.

**Listas:** con vinetas, numerada, de tareas (`- [ ]` y `- [x]`, con un boton que alterna entre pendiente y hecha) y cita.

**Bloques:** enlace, imagen, tabla, linea horizontal, desplegable (`<details class="md-details">` con su `<summary>`) y salto de linea (`<br>`).

**Limpiar formato** quita todo el marcado de la seleccion: `**negrita**`, `*cursiva*`, `~~tachado~~`, `` `codigo` ``, etiquetas y enlaces.

**Color:** la paleta escribe el color del texto o del fondo. La diferencia se elige con el interruptor `Text` / `Background` de la propia paleta, y da cinco colores semanticos en cada modo (`c-breaking` y `bg-breaking`, etc.).

> La lista de tareas la produce el sitio con `remark-gfm`, que marca el `<ul>` con `contains-task-list` y cada `<li>` con `task-list-item`. `marked`, que es lo que usa el preview, no lo hace, asi que el CMS le anade las mismas clases con un renderer propio. Si no, el preview se veria con vinetas y el sitio sin ellas.

#### 6.6.5 Tema

El CMS sigue al tema del sistema, igual que la web, con un conmutador en la cabecera (sol/luna) que recuerda la elección en `aetherfox:admin-theme`. El bootstrap va en un script inline en `admin/index.html` para que no haya parpadeo.

#### 6.6.6 Autenticación y publicación

El worker de `oauth-worker/` hace el OAuth de GitHub y pasa el token al CMS por `postMessage`. El token se guarda en `localStorage` (`aetherfox-admin:token`) y se usa contra la API de GitHub para listar, leer, escribir y borrar. Publicar es un commit: el sitio se reconstruye en el push.

El listado de la API de GitHub va con un parámetro de caché (`?t=<timestamp>`): sin él, una entrada recién publicada no aparecía en la lista hasta que expiraba la caché del listing. El frontmatter se lee de `raw.githubusercontent.com` y se cachea 60 segundos en memoria, invalidándose al guardar.

#### 6.6.7 Descargas

`scripts/fetch-release.mjs` resuelve la última release de GitHub en tiempo de build y escribe `src/data/releases.json`. Si la API falla, el build **no falla**: conserva el `releases.json` anterior. Un workflow diario vuelve a lanzarlo.

El botón de descarga es uno solo y partido: `src/components/marketing/DownloadSplit.astro`, con la parte principal apuntando al instalador y un chevron que abre un menú con **Portable** e **Installer**. Hay tres variantes:

| Variante | Dónde | Aspecto |
| --- | --- | --- |
| `compact` | cabecera de todas las páginas | Botón `Download` con chevron |
| `panel` | página `/download/` | Botón con versión y tamaño debajo |
| `inverse` | panel de descarga de la home | Botón blanco sobre el degradado |

El menú se voltea hacia arriba cuando no cabe abajo (`is-up`), y el script cablea **todos** los `[data-split]` de la página, no solo el primero.

---

## 7. BaseLayout, SEO y datos de la web

### 7.1 Cabecera (`BaseLayout.astro`)

Responsabilidades: `<head>` completo, `lang`, `dir`, `theme-color`, favicons, fuentes precargadas, sprite de iconos, JSON-LD, script anti-flash, y el `slot` del contenido.

```astro
---
import { withBase, canonical } from '../lib/url';
import { site } from '../data/site';
const { title, description, image, type = 'website' } = Astro.props;
---
<!doctype html>
<html lang={site.lang} data-theme="aetherlight">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>{title ? `${title} — ${site.name}` : site.name}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical(Astro.url.pathname)} />
    <meta property="og:title" content={title ?? site.name} />
    <meta property="og:description" content={description} />
    <meta property="og:type" content={type} />
    <meta property="og:url" content={canonical(Astro.url.pathname)} />
    <meta property="og:image" content={new URL(withBase(image ?? '/assets/images/social/og-default.png'), Astro.site)} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#D8D0F6" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0F0D16" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href={withBase('/assets/images/icons/favicon.svg')} type="image/svg+xml" />
    <link rel="apple-touch-icon" href={withBase('/assets/images/icons/apple-touch-icon.png')} />
    <link rel="alternate" type="application/rss+xml" title="Aetherfox" href={withBase('/rss.xml')} />
    <!-- preload de fuentes + CSS -->
    <script is:inline>/* anti-flash, 6 líneas */</script>
    <script type="application/ld+json" set:html={JSON.stringify(schema)} />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <slot />
    <script type="module" src={withBase('/assets/js/main.js')}></script>
  </body>
</html>
```

### 7.2 Regla de oro: `withBase()`

El repo definitivo es `aethergroup.github.io`, así que `base: '/'` y **no hay subpath**. Aun así, `withBase()` se usa en **todas** las URLs internas. Motivo: si mañana el repo se renombra, o si hay que mover el sitio, o si alguien despliega una rama de pruebas, la web sigue funcionando sin tocar un solo componente. Con `base: '/'` la función es un no-op; con cualquier otro `base` es la red de seguridad.

```ts
// src/lib/url.ts
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');   // "" con base '/', "/repo" con subpath

export const withBase = (path: string) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
export const canonical = (path: string) =>
  new URL(withBase(path), import.meta.env.SITE).href;
```

**Regla:** ningún `href="/..."` escrito a mano en los componentes. Siempre `href={withBase('/news')}`.

| Elemento | Con `base: '/'` (definitivo) | Si algún día hay subpath |
|---|---|---|
| Enlaces internos | `withBase('/news')` → `/news` | → `/<repo>/news` |
| Canonical | `https://aethergroup.github.io/news/` | `https://…/<repo>/news/` |
| Imagen OG | `new URL(withBase('/assets/…/og.png'), SITE)` | idéntico, pero **sin `withBase` da 404** |
| Favicon, manifest, RSS | `withBase(...)` | idéntico |
| `sitemap.xml` | Astro lo genera con `site` + `base` | comprobar que lleva el prefijo |
| `robots.txt` | `Sitemap: https://aethergroup.github.io/sitemap-index.xml` | con el subpath |
| Rutas del CMS | Decap: `base_url: /` y `public_folder: /assets/images/uploads` | `base_url: /<repo>` |

> **La trampa que la sonda (Fase 0) va a reproducir a propósito:** `new URL('/assets/x.png', Astro.site)` resuelve contra la **raíz del dominio** e ignora el `base`. Con `Astro.site = https://aethergroup.github.io/aetherfox-probe` (la sonda) produciría `https://aethergroup.github.io/assets/x.png` → 404, porque se ha saltado el prefijo. **Siempre `withBase()` antes de `new URL()`.** Es el bug nº1 al desplegar bajo un subpath, y la sonda existe justo para verlo fallar antes de que llegue a producción.

> **La sonda valida el subpath aunque el repo final esté en la raíz.** Es intencionado: si `withBase()` funciona con `/aetherfox-probe`, funciona con `/` y con cualquier otro valor. Si no lo hiciera, se descubriría en un repo desechable en vez de en el definitivo.

### 7.3 JSON-LD

- `@type: SoftwareApplication` en la home y en `/download`.
- `@type: BlogPosting` en artículos, con `headline`, `datePublished`, `dateModified`, `author`, `image`.
- `@type: BreadcrumbList` en artículos y changelog.

---

## 8. GitHub Pages

### 8.1 `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  // Repo: AetherGroup/aethergroup.github.io → URL https://aethergroup.github.io/
  site: 'https://aethergroup.github.io',
  base: '/',                                 // raíz: el repo es el org site
  trailingSlash: 'always',                   // /news/ y /news → una sola URL
  output: 'static',
  publicDir: './static',                     // carpeta vacía; assets/ y admin/ los copia scripts/copy-static.mjs
  build: { format: 'directory' },
  // Renombrar una URL no rompe nada: Astro genera la página de redirección estática.
  // En salida estática es un <meta http-equiv="refresh">, NO un 301 (Pages no permite headers).
  redirects: {
    '/news/old-post': '/news/new-post',
  },
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
  },
});
```

> **El `base` es la variable más importante del proyecto.** Con `base: '/'` no hay subpath y `withBase()` es inocuo; si algún día el repo se renombra, hay que cambiar `base` **y** `site` en el mismo commit, y `withBase()` se encarga del resto sin tocar componentes.
>
> La Fase 0 (sonda) valida el caso **con** subpath a propósito, para que `withBase()` quede demostrado antes de producción.

### 8.2 `.github/workflows/deploy.yml`

Astro mantiene una **acción oficial** (`withastro/action`) que ya se encarga de detectar el gestor de paquetes, del `base` y del artefacto. Es la vía recomendada y la que se usa aquí:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
      - name: Install, build and upload
        uses: withastro/action@v6
        with:
          node-version: 24
          # build-cmd: npm run build   # por defecto ya ejecuta el script "build"

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

En el repo: **Settings → Pages → Source: GitHub Actions**.

**Sobre los PR:** el job `build` se ejecuta en cada PR y **sube el artefacto** (se puede descargar y previsualizar localmente), pero **no despliega**. Solo `main` despliega. Esto es deliberado: desplegar cada PR en GitHub Pages requiere un *environment* distinto por PR (el `github-pages` solo admite un despliegue activo) y consume entornos con límite. La previsualización real de un PR, si se quiere, se añade en la Fase 8 con un environment por PR — pero no es necesario para que el sitio funcione.

> `.nojekyll` solo hace falta si se despliega desde una rama (source: branch). Con **Source: GitHub Actions**, GitHub no pasa el output por Jekyll. Se mantiene igualmente en `dist/` por si algún día se cambia a despliegue por rama.

### 8.3 Restricciones de GitHub Pages a respetar

| Restricción | Cómo se resuelve |
|---|---|
| Sin servidor | Todo es HTML/CSS/JS estático. Astro `output: 'static'` |
| Sin PHP, sin `.htaccess`, sin `.htaccess` de redirecciones | Sin 301. Se usa `redirects:` de Astro → genera una página con `<meta http-equiv="refresh">`. Para SEO real, mejor mantener las URLs estables |
| Sin headers personalizados | CSP vía `<meta http-equiv="Content-Security-Policy">` (limitado: no admite `frame-ancestors` ni `report-uri`). Si se migra a Cloudflare, `_headers` toma el relevo |
| Cache propia y corta | GitHub Pages sirve con `Cache-Control: max-age=600`. Se añade `?v=<versión>` a los `<link>` de CSS/JS y a los scripts para invalidar en cada release |
| Un solo despliegue activo por environment | `main` despliega en `github-pages`; los PR solo compilan y suben artefacto (§8.2) |
| Sin `.git` en el output | Astro no lo genera. `.nojekyll` se añade por si se pasa a despliegue por rama |
| `base` distinto según el repo | **Decisión: `aethergroup.github.io`, en la raíz.** `base: '/'`. El linking pasa por `withBase()` (§7.2), que es inocuo con `base: '/'` |
| 404 propio | Astro genera `dist/404.html`; GitHub Pages lo sirve automáticamente |
| HTTPS obligatorio | GitHub lo fuerza. Decap necesita `base_url: /` y `site_domain: https://aethergroup.github.io` en su `config.yml` (§6.5.6) |
| Sin dominio propio | `sitemap.xml` y canonical usan `site` + `base`. Las URLs absolutas (OG, RSS) deben pasar por `withBase()` |

### 8.4 Verificación de compatibilidad con GitHub Pages

Checklist que se ejecuta **antes** de dar por buena cualquier fase:

- [ ] `npm run build` no deja ni un `href="/ruta"` sin pasar por `withBase()` (grep: `href="/`).
- [ ] Ninguna URL absoluta se construye sin `withBase()` (revisar OG images, RSS, favicons).
- [ ] `dist/` contiene `index.html`, `404.html`, `sitemap-index.xml`, `rss.xml`.
- [ ] `dist/admin/index.html` y `dist/admin/config.yml` existen (si la fase de CMS está activa).
- [ ] `dist/assets/css/` y `dist/assets/js/` están poblados.
- [ ] Ninguna URL canónica apunta a `localhost` ni a un dominio de desarrollo.
- [ ] `robots.txt` y `sitemap.xml` con `site: https://aethergroup.github.io` y **sin** prefijo de subpath.
- [ ] `base: '/'` y `site: 'https://aethergroup.github.io'` en `astro.config.mjs`; `base_url: /`, `site_domain: https://aethergroup.github.io` y `public_folder: /assets/images/uploads` en `admin/config.yml`. Sin restos de `/aetherfox-probe`.
- [ ] Probado en la URL real (`https://aethergroup.github.io/`). La Fase 0 (sonda) ya valida `base` y `withBase()` con un subpath, que es el caso más duro.

---

## 9. Plan de migración (mockup → arquitectura)

Orden recomendado: cada paso deja el sitio funcionando.

### Paso 0 — Congelar la referencia
Guardar el mockup en `docs/reference/` (o en el PR inicial) y capturar 6 capturas: una por tema, en escritorio y móvil. Sirve para comparar después de cada fase.

### Paso 1 — Andamiaje del proyecto
1. `npm create astro@latest` (plantilla mínima, TypeScript estricto).
2. Desactivar `publicDir`, crear `assets/`, `admin/`, `content/`, `scripts/copy-static.mjs`.
3. `astro.config.mjs` con `site`, `base`, `trailingSlash`, `sitemap`.
4. `.gitignore` (node_modules, dist, .astro, .DS_Store) y `.nojekyll`.
5. Verificar que `npm run build` genera `dist/index.html` + `dist/assets/...` + `dist/admin/...`.

### Paso 2 — Extraer el sistema de diseño
1. Copiar los 6 bloques `:root` del mockup a `00-tokens.css` y renombrar las variables según la tabla §1.1.
2. Declarar `@layer reset, base, layout, components, pages, utilities;`.
3. Crear las escalas nuevas: `--sp-*`, `--fs-*`, `--lh-*`, `--r-*`, `--sh-*`, `--ease`, `--dur-*`, `--z-*`.
4. Mover el reset a `02-reset.css` y los estilos de elemento a `03-base.css`.
5. **Punto de control:** la home renderizada con el mockup original y con el nuevo CSS deben ser indistinguibles.

### Paso 3 — Extraer los assets
1. Decodificar el base64 del logo → `assets/images/brand/aetherfox-logo.webp` (44 KB, 640×597).
2. Reconstruir el logo en vector → `assets/images/brand/aetherfox-logo.svg` (para favicon y pantallas HiDPI) y `aetherfox-mark.svg` (ícono de pestaña).
3. Generar `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` (180×180), `mask-icon.svg`.
4. Descargar las woff2 variables de Bricolage Grotesque y Plus Jakarta Sans (OFL) → `assets/fonts/`.
5. Generar `assets/images/social/og-default.png` (1200×630).
6. Sustituir en el código los `<img class="lg">` con `<img src="/assets/images/brand/aetherfox-logo.webp" width="34" height="32" alt="">` — **se elimina la inyección por JS**.

### Paso 4 — Sistema de iconos
1. Extraer los 17 `<symbol>` del mockup a `src/data/icons.ts` (id + paths).
2. Crear `src/components/ui/Icon.astro` con prop `name`; renderiza `<svg class="i"><use href="#i-{name}"/></svg>`.
3. Inyectar el sprite una sola vez desde `BaseLayout.astro` (`<svg hidden><defs><symbol/></defs></svg>`).
4. Mantener el contrato: 24×24, `stroke-width:1.8`, `fill:none`, `stroke:currentColor`, `stroke-linecap/linejoin:round`.

### Paso 5 — Layout y componentes base
1. `src/layouts/BaseLayout.astro` (head, SEO, fuentes, sprite, scripts).
2. `src/layouts/PageLayout.astro` (header + `<main id="main">` + footer + skip-link).
3. `src/components/layout/Header.astro`, `Footer.astro`, `ThemeSwitcher.astro`, `SkipLink.astro`.
4. `src/data/site.ts` con la navegación: `Download, Features, News, Changelog, Docs` (rutas reales, no `#`).
5. `src/components/ui/Button.astro`, `Card.astro`, `Section.astro`, `Badge.astro`, `Chip.astro`, `Toggle.astro`.
6. `src/components/marketing/BrowserMock.astro` y `ShieldsPanel.astro` — **DOM equivalente al del mockup**, para que el CSS nuevo aplique sin cambios visuales.

### Paso 6 — Reconstruir la home
1. `src/pages/index.astro` con las 4 secciones del mockup: hero, privacidad, "what we left out", descarga.
2. Los datos de las secciones salen de `src/data/features.ts` (o de `content/home/*.md` en la fase 4).
3. `06-pages.css` con los estilos exclusivos de la home.
4. **Punto de control:** paridad visual con el mockup en los 6 temas, escritorio y móvil.

### Paso 7 — Sistema de contenido y rutas
1. `src/content.config.ts` con las colecciones `news`, `changelog`, `pages`.
2. Crear 2 entradas de ejemplo en cada una.
3. `src/pages/news/index.astro` (listado con tarjetas, paginado simple) y `news/[...slug].astro` (artículo).
4. `src/pages/changelog/index.astro` (lista de versiones agrupada por tipo) y `changelog/[...slug].astro`.
5. `src/layouts/ArticleLayout.astro` y `ChangelogLayout.astro`.
6. `src/components/content/PostCard.astro`, `ChangelogEntry.astro`, `Toc.astro`, `Prose.astro`, `Pagination.astro`.
7. `src/pages/privacy.astro` leyendo de `content/pages/privacy.md`.

### Paso 8 — JavaScript
1. `assets/js/lib/*` (dom, storage, motion).
2. `assets/js/modules/theme.js` + el script anti-flash inline.
3. `navigation.js`, `reveal.js`, `toc.js`, `copy-code.js`.
4. `main.js` como orquestador.
5. Verificar con el tema aplicado **antes** de que cargue el CSS (sin destello).

### Paso 9 — SEO, feeds y metadatos
1. `SEO.astro` (meta OG/Twitter, canonical, JSON-LD).
2. `src/pages/rss.xml.ts` + `@astrojs/rss`.
3. `src/pages/404.astro` con estilo propio.
4. `public/robots.txt` y `public/site.webmanifest`.

### Paso 10 — Decap CMS
1. `admin/index.html` + `admin/config.yml` (ver §6.3).
2. Instalar la app **Decap CMS** (Identity) en el repo y activarla.
3. Configurar el gateway en `https://aethergroup.github.io/admin/`.
4. Probar el flujo completo: crear artículo → commit → build → publicado.
5. **Ajustar** los campos de Decap si el esquema Zod y el YAML divergen (el YAML manda; el Zod valida).

### Paso 11 — Páginas escalables
`/features`, `/download`, `/faq`, `/roadmap`, `/docs`. Cada una es un `src/pages/*.astro` + su bloque en `06-pages.css` + sus datos en `src/data/features.ts`. Ninguna requiere tocar lo anterior.

### Paso 12 — Despliegue
1. Workflow con `withastro/action@v6` (build + deploy en `main`; PR solo compila).
2. `.nojekyll` en `dist/`.
3. `robots.txt` con la URL del sitemap en el subpath.
4. **Probar en `https://aethergroup.github.io/`** — esta es la URL de producción real; no hay dominio propio que cambiar después.
5. Verificación: Lighthouse, enlaces rotos, `sitemap.xml`, `robots.txt`, 404, RSS, y el checklist §8.4.

### 12.1 Tabla de correspondencia mockup → arquitectura

| Mockup | Archivo nuevo |
|---|---|
| `<style>` (líneas 8–70) | `assets/css/00→08` |
| `<script>` con `const L=base64…` | `assets/images/brand/aetherfox-logo.webp` + `src/components/ui/Icon.astro` |
| `<script>` con `matchMedia` | `assets/js/modules/theme.js` + script anti-flash inline |
| `<svg><defs><symbol>` (17 iconos) | `src/data/icons.ts` + `src/components/ui/Icon.astro` |
| `<header>` | `src/components/layout/Header.astro` |
| `<footer>` | `src/components/layout/Footer.astro` |
| `.hero` | `src/components/marketing/Hero.astro` |
| `.win` (mockup de navegador) | `src/components/marketing/BrowserMock.astro` |
| `.shield` | `src/components/marketing/ShieldsPanel.astro` |
| `.plist` / `.prow` | `src/components/marketing/PrivacyList.astro` |
| `.bento` / `.cd` | `src/components/marketing/FeatureGrid.astro` + `src/data/features.ts` |
| `.dl` (panel de descarga) | `src/components/marketing/DownloadPanel.astro` |
| `section#privacy/#feel/#download` | Secciones de `src/pages/index.astro` |

---

## 10. Roadmap

Estimaciones en días de trabajo efectivo (1 dev). Cada fase termina con el sitio desplegado y funcionando.

### Fase 0 — Sonda: validar GitHub Pages antes de tocar el repo bueno (0,5 d)

> **Esta fase va PRIMERO y no es una decisión pendiente: es validación técnica.** El repo `aethergroup.github.io` ya existe, pero no se sube nada a él hasta que el pipeline esté probado en un repo desechable. Así, si algo del build o del despliegue está mal, se rompe en un repo que se borra con un clic y no en el sitio público.

- [ ] Crear `AetherGroup/aetherfox-probe` (público, **desechable**).
- [ ] therein: Astro mínimo (`npm create astro@latest` → template mínima, TS estricto).
- [ ] `astro.config.mjs` con `site: 'https://aethergroup.github.io/aetherfox-probe'` y `base: '/aetherfox-probe'`.
- [ ] Workflow con `withastro/action@v6`.
- [ ] Settings → Pages → Source: GitHub Actions.
- [ ] Un `index.astro` con un enlace interno (`href={withBase('/prueba')}`) y una segunda página, para validar el subpath.
- [ ] **Verificar en el navegador**:
  - [ ] La página carga en `https://aethergroup.github.io/aetherfox-probe/`
  - [ ] El enlace interno apunta a `…/aetherfox-probe/prueba/` y **no** a `…/prueba/` (el bug clásico del subpath)
  - [ ] El CSS y el JS se cargan (Network → 200, no 404)
  - [ ] `dist/` tiene `404.html`, `sitemap-index.xml`
  - [ ] `curl -I` devuelve 200 y `Content-Type: text/html`
- [ ] Comprobar el **ciclo completo**: push en `main` → se publica → esperar 1–2 min.
- [ ] **Borrar el repo de sonda** una vez validado.

**Definition of done:** un push en `main` publica correctamente en `https://aethergroup.github.io/aetherfox-probe/`, los enlaces internos respetan el subpath, y no hay un solo 404 en Network.

**Lo que esta fase descarta:** `base` mal configurado, `withBase()` roto, workflow mal definido, Pages sin activar, 404 que no se sirve, sitemap mal formado, problemas de caché, `.nojekyll` necesario… **todo eso se rompe aquí, en un repo que se borra con un clic.**

### Fase 0b — Cimientos (0,5 d)
- [ ] Inicializar el proyecto Astro (TS estricto, plantilla mínima).
- [ ] `astro.config.mjs` con `site`, `base`, `trailingSlash: 'always'`, `output: 'static'`, sitemap.
- [ ] `publicDir: './static'` (vacía) + `scripts/copy-static.mjs` (assets/ + admin/ → dist/).
- [ ] `.gitignore`, `.nojekyll`, `README.md`.
- [ ] `npm run build` verde y `dist/` con la estructura esperada.

**Definition of done:** `npm run build` produce `dist/index.html` y `dist/assets/...`.

### Fase 1 — Sistema de diseño (1,5 d)
- [ ] `00-tokens.css` con los 6 temas y la escala completa.
- [ ] `@layer` declaradas.
- [ ] `01-fonts.css` + autoalojadas + `preload`.
- [ ] `02-reset.css`, `03-base.css`.
- [ ] `04-layout.css` (`.wrap`, `.section`, grids).
- [ ] `05-components.css` con los 12 componentes del §1.4.
- [ ] `07-utilities.css`.
- [ ] `Icon.astro` + sprite de 17 iconos.
- [ ] Checklist de paridad visual contra el mockup en los 6 temas.

**Definition of done:** una página de pruebas (`/styleguide`) muestra todos los componentes en todos los temas.

### Fase 2 — Home (1 d)
- [ ] `BaseLayout.astro` + `PageLayout.astro`.
- [ ] `Header.astro`, `Footer.astro`, `SkipLink.astro`, `ThemeSwitcher.astro`.
- [ ] `src/data/site.ts` (navegación real).
- [ ] `index.astro` con hero, privacidad, "left out" y descarga.
- [ ] `06-pages.css` con los estilos de home.
- [ ] `theme.js` + anti-flash sin destello.
- [ ] `navigation.js` (menú móvil) y `reveal.js`.

**Definition of done:** la home es indistinguible del mockup, con navegación real y los 6 temas funcionando.

### Fase 3 — Contenido y rutas (2 d)
- [ ] `src/content.config.ts` (news, changelog, pages) con esquemas Zod.
- [ ] 2 artículos + 2 entradas de changelog + 1 página de ejemplo.
- [ ] `/news` y `/news/[slug]` con listado, tarjetas y metadatos.
- [ ] `/changelog` y `/changelog/[version]` con badges de tipo de versión.
- [ ] `ArticleLayout.astro`, `ChangelogLayout.astro`, `Toc.astro`, `Prose.astro`.
- [ ] `toc.js` y `copy-code.js`.
- [ ] `rss.xml.ts`.

**Definition of done:** publicar un `.md` en `content/news/` produce una página nueva en `/news/<slug>` sin tocar código.

### Fase 4 — Despliegue (0,5 d)
- [ ] Volcar el proyecto sobre `AetherGroup/aethergroup.github.io` (el repo ya existe, público, Pages ya activado).
- [ ] `base: '/'` y `site: 'https://aethergroup.github.io'` — **verificar que no queda rastro de la sonda** (`/aetherfox-probe` no debe aparecer en `astro.config.mjs`).
- [ ] Workflow con `withastro/action@v6` (build + deploy en `main`; los PR solo compilan y suben artefacto).
- [ ] Settings → Pages → Source: GitHub Actions.
- [ ] `.nojekyll` en `dist/`.
- [ ] `robots.txt` con `Sitemap: https://aethergroup.github.io/sitemap-index.xml`, `site.webmanifest`, `404.html`.
- [ ] Verificar `sitemap.xml` y `rss.xml` en producción.
- [ ] Publicar en la URL real `https://aethergroup.github.io/` y pasar el checklist §8.4.

**Definition of done:** cada push a `main` publica el sitio en `https://aethergroup.github.io/`, y el checklist §8.4 pasa entero.

### Fase 5 — CMS Decap + worker OAuth (2 d)
- [ ] `admin/index.html` (con `rel="cms-config-url"`) + `admin/config.yml` con las 3 colecciones.
- [ ] `oauth-worker/` en el repo: `src/index.ts`, `wrangler.toml`, `package.json`.
- [ ] `npx wrangler deploy` → obtener la URL `https://aetherfox-cms-auth.<sub>.workers.dev`.
- [ ] Crear la GitHub OAuth App con la callback URL exacta del worker.
- [ ] `npx wrangler secret put GITHUB_CLIENT_ID` / `…GITHUB_CLIENT_SECRET`.
- [ ] Rellenar los **tres** `base_url`/`site_domain` de `admin/config.yml` (§6.5.6).
- [ ] Probar el login y la publicación de un artículo de prueba.
- [ ] Validación cruzada Decap ↔ esquemas Zod.
- [ ] Guía de contribución (`README`): editar contenido sin tocar código.
- [ ] Fallback documentado: si el CMS no está disponible, editar el Markdown en GitHub y el build lo publica.

**Definition of done:** un redactor crea, edita y publica un artículo desde `/admin/` sin tocar el repositorio a mano.

### Fase 6 — Páginas escalables (1,5 d)
- [ ] `/features` (showcase).
- [ ] `/download` (tabla de plataformas, checksums, detección de SO con `downloads.js`).
- [ ] `/faq` (acordeón accesible).
- [ ] `/roadmap`.
- [ ] `/docs` (base para documentación).
- [ ] `/blog` (colección nueva, solo si aplica).

**Definition of done:** cada página nueva es un `src/pages/*.astro` + datos + CSS, sin tocar componentes existentes.

### Fase 7 — Endurecido (1 d)
- [ ] Auditoría de accesibilidad (teclado, foco visible, contraste en los 6 temas).
- [ ] Lighthouse ≥ 95 en las 4 categorías.
- [ ] `prefers-reduced-motion` respetado en todas las animaciones.
- [ ] `astro check` sin errores; TypeScript estricto.
- [ ] Revisión de enlaces internos y `404`.
- [ ] Presupuesto de rendimiento: CSS < 30 KB, JS < 15 KB, **0 peticiones a terceros**.

**Definition of done:** checklist de calidad completa en verde.

### Fase 8 — Mejora continua (backlog)
- [ ] Índice de búsqueda local (`search.js` + `search-index.json`).
- [ ] Comparador de versiones en `/changelog`.
- [ ] Traducción ES/EN (i18n) con `src/pages/[lang]/…`.
- [ ] PWA / instalable.
- [ ] Build preview por PR con comentarios de Lighthouse.
- [ ] Migración del contenido de `src/data/` a colecciones Decap.

---

## 11. Decisiones abiertas (requieren tu confirmación)

| # | Pregunta | Recomendación | Impacto |
|---|---|---|---|
| 1 | ¿Astro, Eleventy o Hugo? | **Astro 7** — colecciones nativas, JS por defecto 0, salida estática pura | Alto: define todo lo anterior |
| 2 | ¿Contenido en inglés o en español? | **Inglés**, igual que el mockup y la marca; añadir `/es/` en la fase 8 | Medio |
| 3 | ¿Dominio propio o `*.github.io`? | **`aethergroup.github.io` (decidido).** Sin dominio propio; `base: '/'`, raíz de la org. El nombre `aetherfox` está ocupado por una cuenta personal y las orgs comparten namespace con los usernames | ✅ Cerrado: §0.1 |
| 4 | ¿Fuentes autoalojadas o CDN? | **Autoalojadas** — coherente con el producto y sin fuga de IP | Alto: privacy |
| 5 | ¿Analítica? | **Ninguna**. Si algún día hace falta, solo con consentimiento explícito | Alto: marca |
| 6 | ¿Descarga de binarios desde el sitio? | Enlazar a releases de GitHub; `assets/data/releases.json` generado en CI | Medio |
| 7 | ¿Backend de Decap? | **Opción A (decidida):** `github` backend + Cloudflare Worker propio para el OAuth. Gratis, sin terceros, el sitio sigue en GitHub Pages | Resuelto: §6.5 |
| 8 | ¿Nombre del repo? | Fija el `base` de Astro y los tres `base_url` de Decap | Bajo: cambiarlo exige tocar 4 sitios |

---

## 12. Checklist de calidad (aplicable a cada fase)

- [ ] Cero peticiones a terceros (verificable en DevTools → Network).
- [ ] Los 6 temas se ven correctos, incluidos los estados hover/focus.
- [ ] Navegación completa por teclado; `:focus-visible` visible en todo.
- [ ] Contraste AA en texto de cuerpo sobre fondo.
- [ ] `prefers-reduced-motion` desactiva animaciones y scroll suave.
- [ ] Sin destello de tema en la primera pintada.
- [ ] Lighthouse ≥ 95 / 95 / 95 / 95.
- [ ] `npm run build` sin warnings; `astro check` limpio.
- [ ] Enlaces internos resueltos; ningún `href="#"`.
- [ ] `sitemap.xml`, `rss.xml` y `robots.txt` presentes y correctos.
- [ ] Checklist §8.4 (compatibilidad con GitHub Pages) en verde.

---

*Documento generado a partir del mockup `Aetherfox — the browser with the extras left out.html`. Los valores de color, tipografía, espaciado, radios, sombras y movimiento son los del original; la estructura técnica es nueva.*
