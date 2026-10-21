import { listFolder, listCommits, rawUrl, repoBranch } from '../lib/api.js';
import { parseFrontmatter, formatDate } from '../lib/markdown.js';

const frontmatterCache = new Map();
const CACHE_TTL = 60000;

export function invalidateFrontmatter(path) {
  frontmatterCache.delete(path);
}

async function readFrontmatter(path) {
  const hit = frontmatterCache.get(path);
  if (hit && Date.now() - hit.time < CACHE_TTL) return hit.data;

  const promise = (async () => {
    try {
      const res = await fetch(`${rawUrl(path, repoBranch())}?t=${Date.now()}`);
      if (!res.ok) return {};
      return parseFrontmatter(await res.text()).data;
    } catch {
      return {};
    }
  })();

  frontmatterCache.set(path, { time: Date.now(), data: promise });
  return promise;
}

async function loadCollection(collection) {
  const files = await listFolder(collection.folder, repoBranch());
  const entries = await Promise.all(
    files
      .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
      .map(async (file) => ({
        collection,
        file,
        data: await readFrontmatter(file.path),
      })),
  );
  return entries;
}

function entryDate(data) {
  return String(data.date || data.updated || '');
}

function byDate(a, b) {
  const diff = entryDate(b.data).localeCompare(entryDate(a.data));
  if (diff !== 0) return diff;
  return a.file.name.localeCompare(b.file.name);
}

function slugOf(file) {
  return file.name.replace(/\.md$/, '');
}

function titleOf(collection, data, file) {
  const fallback = slugOf(file).replace(/^\d+-/, '');
  return data.title || data[collection.identifier_field] || fallback;
}

function publicUrl(collection, file, data, baseUrl) {
  if (!collection.route) return null;
  if (collection.routed && !collection.routed.includes(slugOf(file))) return null;
  const slug = collection.identifier_field === 'version' ? data.version || slugOf(file) : slugOf(file);
  return `${baseUrl}${collection.route.replace('{slug}', slug)}`;
}

function fileUrl(collection, file) {
  return `https://github.com/AetherGroup/aethergroup.github.io/blob/${repoBranch()}/${file.path}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of units) {
    const amount = Math.floor(seconds / size);
    if (amount >= 1) return `${amount} ${name}${amount === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

function metaFor(collection, data) {
  const parts = [];
  if (data.date) parts.push(formatDate(data.date));
  if (collection.name === 'changelog' && data.version) parts.push(data.version);
  if (data.category) parts.push(data.category);
  if (data.type) parts.push(data.type);
  if (data.template) parts.push(data.template);
  return parts;
}

function rowMarkup(entry, baseUrl, showCollection) {
  const { collection, file, data } = entry;
  const title = titleOf(collection, data, file);
  const href = `#/collections/${collection.name}/${file.name}`;
  const live = publicUrl(collection, file, data, baseUrl);

  const cover = data.cover
    ? `<img src="${escapeHtml(data.cover.startsWith('/') ? data.cover : '/' + data.cover)}" alt="" loading="lazy" />`
    : `<svg class="icon" aria-hidden="true"><use href="#i-${collection.icon}" /></svg>`;

  const meta = metaFor(collection, data);
  const badges = [
    data.draft ? '<span class="adm-badge adm-badge--draft">Draft</span>' : '',
    data.featured ? '<span class="adm-badge adm-badge--star">Featured</span>' : '',
  ]
    .filter(Boolean)
    .join('');

  const collectionTag = showCollection
    ? `<span class="adm-tag adm-tag--${collection.name}">${collection.label}</span>`
    : '';

  const search = [title, data.description, data.category, collection.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return `
    <article class="adm-row" data-entry data-search="${escapeHtml(search)}">
      <a class="adm-row__thumb" href="${href}" tabindex="-1" aria-hidden="true">${cover}</a>
      <div class="adm-row__body">
        <h3 class="adm-row__title"><a href="${href}">${escapeHtml(title)}</a></h3>
        <p class="adm-row__meta">
          ${collectionTag}
          ${meta.map((m) => `<span>${escapeHtml(m)}</span>`).join('<i class="adm-dot"></i>')}
          ${badges}
        </p>
      </div>
      <div class="adm-row__actions">
        <a class="adm-btn" href="${href}">Edit</a>
        ${
          live
            ? `<a class="adm-btn adm-btn--icon" href="${live}" target="_blank" rel="noopener" title="View published"><svg class="icon" aria-hidden="true"><use href="#i-eye" /></svg></a>`
            : ''
        }
        <a class="adm-btn adm-btn--icon" href="${fileUrl(collection, file)}" target="_blank" rel="noopener" title="Open the file on GitHub"><svg class="icon" aria-hidden="true"><use href="#i-file" /></svg></a>
      </div>
    </article>`;
}

function statsMarkup(entries) {
  const drafts = entries.filter((e) => e.data.draft).length;
  const published = entries.length - drafts;
  return [
    { value: published, label: 'Published' },
    { value: drafts, label: 'Drafts' },
    { value: entries.length, label: 'Entries' },
    { value: new Set(entries.map((e) => e.collection.name)).size, label: 'Collections' },
  ]
    .map(
      (s) => `
      <div class="adm-stat">
        <strong>${s.value}</strong>
        <span>${s.label}</span>
      </div>`,
    )
    .join('');
}

function activityMarkup(commits) {
  if (!commits.length) {
    return '<li class="adm-activity__empty">No commits yet.</li>';
  }
  return commits
    .map((c) => {
      const message = String(c.commit?.message || '').split('\n')[0];
      return `
      <li>
        <a href="${c.html_url}" target="_blank" rel="noopener">
          <span class="adm-activity__msg">${escapeHtml(message)}</span>
          <span class="adm-activity__time">${timeAgo(c.commit?.author?.date)}</span>
        </a>
      </li>`;
    })
    .join('');
}

export async function renderContents(root, schema, collectionName = '') {
  const baseUrl = schema.base_url || '';

  root.innerHTML = `
    <div class="adm-workspace">
      <section class="adm-workspace__main">
        <header class="adm-pagehead">
          <div class="adm-pagehead__text">
            <p class="adm-eyebrow" data-eyebrow>Contents</p>
            <h1 class="adm-pagetitle" data-title>All content</h1>
            <p class="adm-pagesub" data-sub>Everything published on the site, newest first.</p>
          </div>
          <div class="adm-tabs" role="tablist" data-tabs></div>
        </header>

        <div class="adm-list" data-list>
          <p class="adm-loading">Loading…</p>
        </div>
      </section>

      <aside class="adm-rail">
        <section class="adm-panel">
          <h2 class="adm-panel__title">Status</h2>
          <div class="adm-stats" data-stats></div>
        </section>

        <section class="adm-panel">
          <h2 class="adm-panel__title">Recent activity</h2>
          <ul class="adm-activity" data-activity>
            <li class="adm-activity__empty">Loading…</li>
          </ul>
        </section>

        <section class="adm-panel">
          <h2 class="adm-panel__title">Site</h2>
          <ul class="adm-links">
            <li>
              <a href="${baseUrl}/" target="_blank" rel="noopener">
                <svg class="icon" aria-hidden="true"><use href="#i-external" /></svg>
                Open the site
              </a>
            </li>
            <li>
              <a href="https://github.com/AetherGroup/aethergroup.github.io" target="_blank" rel="noopener">
                <svg class="icon" aria-hidden="true"><use href="#i-github" /></svg>
                Repository
              </a>
            </li>
            <li>
              <a href="https://github.com/AetherGroup/Aetherfox/releases" target="_blank" rel="noopener">
                <svg class="icon" aria-hidden="true"><use href="#i-branch" /></svg>
                Releases
              </a>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  `;

  const tabsHost = root.querySelector('[data-tabs]');
  const listHost = root.querySelector('[data-list]');
  const statsHost = root.querySelector('[data-stats]');
  const activityHost = root.querySelector('[data-activity]');
  const titleHost = root.querySelector('[data-title]');
  const subHost = root.querySelector('[data-sub]');
  const eyebrowHost = root.querySelector('[data-eyebrow]');

  let entries = [];
  const byCollection = new Map();
  let active = collectionName;
  let query = '';

  const currentEntries = () => (active ? byCollection.get(active) || [] : entries);

  const paint = () => {
    const list = currentEntries();
    const visible = query
      ? list.filter((e) => {
          const haystack = [
            titleOf(e.collection, e.data, e.file),
            e.data.description || '',
            e.data.category || '',
            e.collection.label,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(query);
        })
      : list;

    if (!visible.length) {
      listHost.innerHTML = `<p class="adm-empty">${
        query ? 'Nothing matches that search.' : 'Nothing published here yet.'
      }</p>`;
    } else {
      listHost.innerHTML = visible
        .map((entry) => rowMarkup(entry, baseUrl, !active))
        .join('');
    }

    statsHost.innerHTML = statsMarkup(list);
  };

  const paintHead = () => {
    if (active) {
      const collection = schema.collections.find((c) => c.name === active);
      eyebrowHost.textContent = collection.folder;
      titleHost.textContent = collection.label;
      subHost.textContent = collection.description || '';
    } else {
      eyebrowHost.textContent = 'Contents';
      titleHost.textContent = 'All content';
      subHost.textContent = 'Everything published on the site, newest first.';
    }
  };

  tabsHost.innerHTML = [
    `<button class="adm-tab${active ? '' : ' is-active'}" role="tab" data-tab="" aria-selected="${
      active ? 'false' : 'true'
    }">All<span class="adm-tab__count" data-count="">–</span></button>`,
    ...schema.collections.map(
      (c) => `
      <button class="adm-tab${active === c.name ? ' is-active' : ''}" role="tab" data-tab="${c.name}"
              aria-selected="${active === c.name ? 'true' : 'false'}">
        ${c.label}<span class="adm-tab__count" data-count="${c.name}">–</span>
      </button>`,
    ),
  ].join('');

  tabsHost.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (!tab) return;
    active = tab.dataset.tab;
    for (const button of tabsHost.querySelectorAll('[data-tab]')) {
      const on = button.dataset.tab === active;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-selected', String(on));
    }
    paintHead();
    paint();
  });

  const onSearch = (event) => {
    query = String(event.detail || '').trim().toLowerCase();
    paint();
  };
  document.addEventListener('adm:search', onSearch);

  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      document.removeEventListener('adm:search', onSearch);
      observer.disconnect();
    }
  });
  observer.observe(root, { childList: true });

  try {
    const groups = await Promise.all(
      schema.collections.map(async (collection) => {
        try {
          return [collection.name, await loadCollection(collection)];
        } catch {
          return [collection.name, []];
        }
      }),
    );

    for (const [name, list] of groups) byCollection.set(name, list);
    entries = groups.flatMap(([, list]) => list).sort(byDate);

    const allCount = tabsHost.querySelector('[data-count=""]');
    if (allCount) allCount.textContent = String(entries.length);
    for (const collection of schema.collections) {
      const badge = tabsHost.querySelector(`[data-count="${collection.name}"]`);
      if (badge) badge.textContent = String((byCollection.get(collection.name) || []).length);
    }

    paintHead();
    paint();
  } catch (error) {
    listHost.innerHTML = `<p class="adm-error">${escapeHtml(error.message)}</p>`;
  }

  listCommits('content', repoBranch())
    .then((commits) => {
      if (activityHost.isConnected) activityHost.innerHTML = activityMarkup(commits);
    })
    .catch(() => {
      if (activityHost.isConnected) {
        activityHost.innerHTML = '<li class="adm-activity__empty">No activity yet.</li>';
      }
    });
}
