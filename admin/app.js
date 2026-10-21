import { getToken, setUser, clearToken } from './lib/auth-store.js';
import { setRepo, currentUser } from './lib/api.js';
import { renderLogin } from './views/login.js';
import { renderContents } from './views/collection.js';
import { renderEditor } from './views/editor.js';
import { renderMedia, renderWorkflow } from './views/panels.js';

const view = document.querySelector('[data-view]');
const avatar = document.querySelector('[data-menu-toggle]');
const toasts = document.querySelector('[data-toasts]');
const searchBox = document.querySelector('[data-search]');
const searchInput = document.querySelector('[data-search-input]');
const newMenu = document.querySelector('[data-newmenu]');
const newToggle = document.querySelector('[data-new-toggle]');
const newList = document.querySelector('[data-new-list]');

let schema = null;

async function boot() {
  schema = await (await fetch('/admin/schema.json')).json();
  setRepo(schema.repo, schema.branch);
  buildNewMenu();

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

function buildNewMenu() {
  newList.innerHTML = schema.collections
    .map(
      (collection) => `
      <button class="adm-newmenu__item" type="button" role="menuitem" data-new-collection="${collection.name}">
        <span class="adm-newmenu__icon"><svg class="icon" aria-hidden="true"><use href="#i-${collection.icon}" /></svg></span>
        <span class="adm-newmenu__text">
          <strong>New ${collection.label_singular.toLowerCase()}</strong>
          <small>${collection.folder}</small>
        </span>
      </button>`,
    )
    .join('');

  newToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = newList.hidden;
    newList.hidden = !open;
    newToggle.setAttribute('aria-expanded', String(open));
  });

  newList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-new-collection]');
    if (!item) return;
    newList.hidden = true;
    newToggle.setAttribute('aria-expanded', 'false');
    location.hash = `#/collections/${item.dataset.newCollection}/new`;
  });

  document.addEventListener('click', (event) => {
    if (!newList.hidden && !newMenu.contains(event.target)) {
      newList.hidden = true;
      newToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function setupSearch() {
  searchInput.addEventListener('input', () => {
    document.dispatchEvent(
      new CustomEvent('adm:search', { detail: searchInput.value }),
    );
  });
}

function setSearchVisible(visible) {
  searchBox.hidden = !visible;
  if (!visible && searchInput.value) {
    searchInput.value = '';
    document.dispatchEvent(new CustomEvent('adm:search', { detail: '' }));
  }
}

function setNav(name) {
  for (const link of document.querySelectorAll('[data-nav]')) {
    const on = link.dataset.nav === name;
    link.classList.toggle('is-active', on);
    if (on) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (!parts.length) {
    setNav('contents');
    setSearchVisible(true);
    renderContents(view, schema, '');
    return;
  }

  if (parts[0] === 'media') {
    setNav('media');
    setSearchVisible(false);
    renderMedia(view);
    return;
  }

  if (parts[0] === 'workflow') {
    setNav('workflow');
    setSearchVisible(false);
    renderWorkflow(view);
    return;
  }

  if (parts[0] !== 'collections' || !parts[1]) {
    setNav('contents');
    setSearchVisible(true);
    renderContents(view, schema, '');
    return;
  }

  const collection = schema.collections.find((c) => c.name === parts[1]);
  if (!collection) {
    setNav('contents');
    setSearchVisible(true);
    renderContents(view, schema, '');
    return;
  }

  setNav('contents');

  if (parts[2] === 'new') {
    setSearchVisible(false);
    renderEditor(view, schema, collection, null);
    return;
  }

  if (parts[2]) {
    setSearchVisible(false);
    renderEditor(view, schema, collection, decodeURIComponent(parts.slice(2).join('/')));
    return;
  }

  setSearchVisible(true);
  renderContents(view, schema, collection.name);
}

setupUserMenu();
setupSearch();

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
