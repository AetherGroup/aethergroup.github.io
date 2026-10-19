import { ready } from './lib/dom.js';
import { initTheme } from './modules/theme.js';
import { initNavigation } from './modules/navigation.js';
import { initReveal } from './modules/reveal.js';

ready(() => {
  initTheme();
  initNavigation();
  initReveal();
});
