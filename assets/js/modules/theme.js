import { get, set } from '../lib/storage.js';

export const THEMES = ['aetherlight', 'aetherdark', 'light', 'dark', 'purple', 'black'];

const systemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'aetherdark' : 'aetherlight';

const root = document.documentElement;

export function getTheme() {
  return root.dataset.theme || systemTheme();
}

export function setTheme(theme) {
  const resolved = theme === 'auto' || !THEMES.includes(theme) ? systemTheme() : theme;

  root.dataset.theme = resolved;
  root.dataset.themePreference = theme === 'auto' ? 'auto' : theme;

  set('theme', theme === 'auto' ? 'auto' : theme);
  syncMetaThemeColor(resolved);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: resolved, preference: theme } }));

  return resolved;
}

export function cycleTheme() {
  const current = getTheme();
  const next = current === 'aetherdark' ? 'aetherlight' : 'aetherdark';
  return setTheme(next);
}

function syncMetaThemeColor(theme) {
  const colors = {
    aetherlight: '#D8D0F6',
    aetherdark: '#0F0D16',
    light: '#F4F4F7',
    dark: '#16151B',
    purple: '#14112B',
    black: '#000000',
  };
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', colors[theme] ?? colors.aetherlight);
}

export function initTheme() {
  const stored = get('theme', 'auto');
  setTheme(stored);

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if ((get('theme', 'auto') ?? 'auto') === 'auto') setTheme('auto');
  });

  const select = document.querySelector('[data-theme-select]');
  if (select) {
    select.value = get('theme', 'auto') ?? 'auto';
    select.addEventListener('change', (event) => {
      setTheme(event.target.value);
    });
  }

  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.addEventListener('click', () => cycleTheme());
  }
}
