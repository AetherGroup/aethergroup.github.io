import { ready } from './lib/dom.js';
import { initTheme } from './modules/theme.js';
import { initNavigation } from './modules/navigation.js';
import { initReveal } from './modules/reveal.js';
import { initShields } from './modules/shields.js';

ready(() => {
  initTheme();
  initNavigation();
  initReveal();
  initShields();
});
