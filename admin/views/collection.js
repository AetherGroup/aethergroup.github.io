import { listFolder, rawUrl, repoBranch } from '../lib/api.js';
import { parseFrontmatter, formatDate } from '../lib/markdown.js';

const dateFields = ['date', 'updated'];

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function withFrontmatter(file) {
  try {
    const full = await readFileSafe(file.path);
    return { ...file, frontmatter: parseFrontmatter(decodeBase64(full.content)).data };
  } catch {
    return file;
  }
}

async function readFileSafe(path) {
  const { readFile } = await import('../lib/api.js');
  return readFile(path, repoBranch());
}

function entryMeta(file, collection) {
  const data = file.frontmatter || {};
  const idField = collection.identifier_field || 'title';
  const title = data[idField] || file.name.replace(/\.md$/, '').replace(/^\d+-/, '');
  const date = dateFields.map((f) => data[f]).find(Boolean);
  const description = data.description || data.summary || '';
  return { title, date, description };
}

async function loadEntries(collection) {
  const files = await listFolder(collection.folder, repoBranch());
  const withMeta = await Promise.all(
    files
      .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
      .map((f) => withFrontmatter(f)),
  );

  return withMeta
    .map((f) => ({ file: f, meta: entryMeta(f, collection) }))
    .sort((a, b) => String(b.meta.date || '').localeCompare(String(a.meta.date || '')));
}

function entryCard(collection, { file, meta }) {
  const cover = file.frontmatter?.cover;
  const coverImg = cover
    ? `<img class="adm-entry__cover" src="${rawUrl(cover, repoBranch())}" alt="" />`
    : '';

  const chips = [
    meta.date ? `<span class="adm-chip">${formatDate(meta.date)}</span>` : '',
    file.frontmatter?.category ? `<span class="adm-chip">${file.frontmatter.category}</span>` : '',
    file.frontmatter?.draft ? '<span class="adm-chip adm-chip--warn">Draft</span>' : '',
    file.frontmatter?.featured ? '<span class="adm-chip adm-chip--accent">Featured</span>' : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <a class="adm-entry" href="#/collections/${collection.name}/${file.name}">
      ${coverImg}
      <div class="adm-entry__body">
        ${chips ? `<div class="adm-entry__chips">${chips}</div>` : ''}
        <span class="adm-entry__title">${meta.title}</span>
        ${meta.description ? `<p class="adm-entry__text">${meta.description}</p>` : ''}
      </div>
    </a>`;
}

function sectionHead(collection, count) {
  return `
    <div class="adm-section__head">
      <div>
        <p class="adm-eyebrow">${collection.folder}</p>
        <h2 class="adm-section__title">${collection.label}</h2>
      </div>
      <div class="adm-section__aside">
        <span class="adm-chip">${count === 1 ? '1 entry' : `${count} entries`}</span>
        <a class="adm-section__more" href="#/collections/${collection.name}">
          See all
          <svg class="icon" aria-hidden="true"><use href="#i-chev" /></svg>
        </a>
      </div>
    </div>`;
}

export async function renderOverview(root, schema) {
  const loaded = await Promise.all(
    schema.collections.map(async (collection) => {
      try {
        return { collection, entries: await loadEntries(collection) };
      } catch {
        return { collection, entries: [] };
      }
    }),
  );

  const total = loaded.reduce((sum, group) => sum + group.entries.length, 0);

  root.innerHTML = `
    <section class="adm-hero">
      <div class="adm-hero__text">
        <p class="adm-eyebrow">Content manager</p>
        <h1 class="adm-hero__title">Everything published on aethergroup.github.io.</h1>
        <p class="adm-hero__lead">
          ${total} ${total === 1 ? 'entry' : 'entries'} across ${schema.collections.length} collections.
          Every change is a commit, and the site rebuilds on every push to main.
        </p>
      </div>
      <div class="adm-hero__panel">
        <div class="adm-hero__panel-icon">
          <svg class="icon" aria-hidden="true"><use href="#i-dl" /></svg>
        </div>
        <h2 class="adm-hero__panel-title">Start writing</h2>
        <p class="adm-hero__panel-text">
          Pick a collection below and publish a new entry straight to the repository.
        </p>
        <a class="btn adm-hero__cta" href="#/collections/news/new">
          <svg class="icon" aria-hidden="true"><use href="#i-plus" /></svg>
          New post
        </a>
      </div>
    </section>

    ${loaded
      .map(
        ({ collection, entries }) => `
      <section class="adm-section">
        ${sectionHead(collection, entries.length)}
        <div class="adm-entries">
          ${
            entries.length
              ? entries.slice(0, 3).map((entry) => entryCard(collection, entry)).join('')
              : '<p class="adm-empty">Nothing here yet.</p>'
          }
        </div>
      </section>`,
      )
      .join('')}
  `;
}

export async function renderCollection(root, schema, collection) {
  root.innerHTML = `
    <section class="adm-section adm-section--single">
      <div class="adm-section__head">
        <div>
          <p class="adm-eyebrow">${collection.folder}</p>
          <h1 class="adm-section__title">${collection.label}</h1>
        </div>
        <div class="adm-section__aside">
          <a class="btn" href="#/collections/${collection.name}/new">
            <svg class="icon" aria-hidden="true"><use href="#i-plus" /></svg>
            New ${collection.label_singular.toLowerCase()}
          </a>
        </div>
      </div>
      <div class="adm-entries" data-entries>
        <p class="adm-loading">Loading…</p>
      </div>
    </section>
  `;

  const target = root.querySelector('[data-entries]');

  try {
    const entries = await loadEntries(collection);
    if (!entries.length) {
      target.innerHTML = `<p class="adm-empty">Nothing published yet.</p>`;
      return;
    }
    target.innerHTML = entries.map((entry) => entryCard(collection, entry)).join('');
  } catch (error) {
    target.innerHTML = `<p class="adm-error">${error.message}</p>`;
  }
}
