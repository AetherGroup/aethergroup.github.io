import { getToken, setUser, clearToken } from './lib/auth-store.js';
import { setRepo, currentUser } from './lib/api.js';
import { renderLogin } from './views/login.js';
import { renderCollection, renderOverview } from './views/collection.js';
import { renderEditor } from './views/editor.js';
import { renderMedia, renderWorkflow } from './views/panels.js';

const view = document.querySelector('[data-view]');
const newButton = document.querySelector('[data-new]');
const avatar = document.querySelector('[data-menu-toggle]');
const toasts = document.querySelector('[data-toasts]');

let schema = null;
let currentCollection = null;

async function boot() {
  schema = await (await fetch('/admin/schema.json')).json();
  setRepo(schema.repo, schema.branch);

  if (!getToken()) {
    renderLogin(view, () => location.reload());
    return;
  }

  await loadUser();
  window.addEventListener('hashchange', route);
  route();
}

async function loadUser() {
  try {
    const user = await currentUser();
    setUser(user);
    const img = avatar.querySelector('img');
    if (img) img.src = user.avatar_url;
    avatar.title = user.login;
    avatar.hidden = false;
    document.querySelector('[data-menu-name]').textContent = user.name || user.login;
    document.querySelector('[data-menu-login]').textContent = `@${user.login}`;
  } catch (error) {
    if (error.status === 401) clearToken();
    view.innerHTML = `<div class="adm-content"><p class="adm-error">${error.message}</p></div>`;
  }
}

function setupUserMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!toggle || !menu) return;

  const close = () => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== toggle) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  document.querySelector('[data-signout]').addEventListener('click', () => {
    localStorage.removeItem('aetherfox-admin:token');
    localStorage.removeItem('aetherfox-admin:user');
    location.reload();
  });
}

function setNav(name) {
  for (const link of document.querySelectorAll('[data-nav]')) {
    link.toggleAttribute('aria-current', link.dataset.nav === name);
    if (link.dataset.nav === name) link.setAttribute('aria-current', 'page');
  }
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (!parts.length) {
    setNav('contents');
    newButton.hidden = true;
    renderOverview(view, schema);
    return;
  }

  if (parts[0] === 'media') {
    setNav('media');
    newButton.hidden = true;
    renderMedia(view);
    return;
  }

  if (parts[0] === 'workflow') {
    setNav('workflow');
    newButton.hidden = true;
    renderWorkflow(view);
    return;
  }

  if (parts[0] !== 'collections' || !parts[1]) {
    setNav('contents');
    newButton.hidden = true;
    renderOverview(view, schema);
    return;
  }

  const collection = schema.collections.find((c) => c.name === parts[1]);
  if (!collection) {
    setNav('contents');
    newButton.hidden = true;
    renderOverview(view, schema);
    return;
  }

  currentCollection = collection;
  setNav('contents');

  if (parts[2] === 'new') {
    newButton.hidden = true;
    renderEditor(view, schema, collection, null);
    return;
  }

  if (parts[2]) {
    newButton.hidden = true;
    renderEditor(view, schema, collection, decodeURIComponent(parts.slice(2).join('/')));
    return;
  }

  newButton.hidden = false;
  newButton.onclick = () => {
    location.hash = `#/collections/${collection.name}/new`;
  };
  renderCollection(view, schema, collection);
}

newButton?.addEventListener('click', () => {
  if (currentCollection) location.hash = `#/collections/${currentCollection.name}/new`;
});

setupUserMenu();

const THEME_KEY = 'aetherfox:admin-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.querySelector('[data-theme-icon] use');
  if (icon) icon.setAttribute('href', theme === 'aetherdark' ? '#i-moon' : '#i-sun');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

function setupThemeToggle() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;

  const current = document.documentElement.dataset.theme || 'aetherlight';
  const icon = button.querySelector('[data-theme-icon] use');
  if (icon) icon.setAttribute('href', current === 'aetherdark' ? '#i-moon' : '#i-sun');

  button.addEventListener('click', () => {
    const next =
      document.documentElement.dataset.theme === 'aetherdark' ? 'aetherlight' : 'aetherdark';
    applyTheme(next);
  });
}

setupThemeToggle();

boot().catch((error) => {
  view.innerHTML = `<div class="adm-content"><p class="adm-error">${error.message}</p></div>`;
});
