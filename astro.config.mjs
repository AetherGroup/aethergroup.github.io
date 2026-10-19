// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Repo: AetherGroup/aethergroup.github.io → https://aethergroup.github.io/
  site: 'https://aethergroup.github.io',
  base: '/',
  trailingSlash: 'always',
  output: 'static',

  // Carpeta vacía: los estáticos viven en assets/ y admin/, y los copia
  // scripts/copy-static.mjs tras el build. Ver ARCHITECTURE.md §2.1.
  publicDir: './static',

  build: {
    format: 'directory',
  },

  // Renombrar una URL no rompe nada: Astro genera la página de redirección.
  // En salida estática es <meta http-equiv="refresh">, no un 301.
  redirects: {},

  integrations: [sitemap()],

  devToolbar: {
    enabled: false,
  },
});
