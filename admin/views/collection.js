import { listFolder, readFile, rawUrl, repoBranch } from '../lib/api.js';
import { parseFrontmatter, formatDate } from '../lib/markdown.js';

const dateFields = ['date', 'updated'];

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function withFrontmatter(file) {
  try {
    const full = await readFile(file.path, repoBranch());
    return { ...file, frontmatter: parseFrontmatter(decodeBase64(full.content)).data };
  } catch {
    return file;
  }
}

function entryMeta(file, collection) {
  const data = file.frontmatter || {};
  const idField = collection.identifier_field || 'title';
  const title = data[idField] || file.name.replace(/\.md$/, '').replace(/^\d+-/, '');
  const date = dateFields.map((f) => data[f]).find(Boolean);
  const description = data.description || data.summary || '';
  return { title, date, description };
}

export async function renderCollection(root, schema, collection) {
  root.innerHTML = `
    <div class="adm-shell">
      <aside class="adm-collections">
        <div class="adm-collections__title">Collections</div>
        ${schema.collections
          .map(
            (c) =>
              `<a class="adm-collection ${c.name === collection.name ? 'is-active' : ''}" href="#/collections/${c.name}">${c.label}</a>`,
          )
          .join('')}
      </aside>

      <div class="adm-content">
        <div class="adm-page-head">
          <div>
            <h1 class="adm-title">${collection.label}</h1>
            <p class="adm-sub">${collection.description || 'Entries in this collection.'}</p>
          </div>
          <a class="btn" href="#/collections/${collection.name}/new">
            <svg class="icon" aria-hidden="true"><use href="#i-plus" /></svg>
            New ${collection.label_singular.toLowerCase()}
          </a>
        </div>

        <div class="adm-entries" data-entries>
          <p class="adm-loading">Loading…</p>
        </div>
      </div>
    </div>
  `;

  const target = root.querySelector('[data-entries]');

  let files = [];
  try {
    files = await listFolder(collection.folder, repoBranch());
  } catch (error) {
    target.innerHTML = `<p class="adm-error">${error.message}</p>`;
    return;
  }

  const entries = (
    await Promise.all(
      files
        .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
        .map((f) => withFrontmatter(f)),
    )
  )
    .map((f) => ({ file: f, meta: entryMeta(f, collection) }))
    .sort((a, b) => String(b.meta.date || '').localeCompare(String(a.meta.date || '')));

  if (!entries.length) {
    target.innerHTML = `<p class="adm-empty">Nothing published yet.</p>`;
    return;
  }

  target.innerHTML = entries
    .map(({ file, meta }) => {
      const cover = file.frontmatter?.cover;
      const coverImg = cover
        ? `<img class="adm-entry__cover" src="${rawUrl(cover, repoBranch())}" alt="" />`
        : '';
      return `
      <a class="adm-entry" href="#/collections/${collection.name}/${file.name}">
        ${coverImg}
        <div class="adm-entry__body">
          <div class="adm-entry__chips">
            ${meta.date ? `<span class="adm-chip">${formatDate(meta.date)}</span>` : ''}
            ${file.frontmatter?.category ? `<span class="adm-chip">${file.frontmatter.category}</span>` : ''}
            ${file.frontmatter?.draft ? '<span class="adm-chip adm-chip--warn">Draft</span>' : ''}
            ${file.frontmatter?.featured ? '<span class="adm-chip adm-chip--accent">Featured</span>' : ''}
          </div>
          <h2 class="adm-entry__title">${meta.title}</h2>
          ${meta.description ? `<p class="adm-entry__text">${meta.description}</p>` : ''}
        </div>
      </a>`;
    })
    .join('');
}

export async function renderOverview(root, schema) {
  root.innerHTML = `
    <div class="adm-shell">
      <aside class="adm-collections">
        <div class="adm-collections__title">Collections</div>
        ${schema.collections
          .map(
            (c) =>
              `<a class="adm-collection" href="#/collections/${c.name}">${c.label}</a>`,
          )
          .join('')}
      </aside>

      <div class="adm-content">
        <div class="adm-page-head">
          <div>
            <p class="adm-eyebrow">Dashboard</p>
            <h1 class="adm-title">Contents</h1>
            <p class="adm-sub">Everything published on aethergroup.github.io.</p>
          </div>
        </div>

        <div class="adm-collection-grid" data-collections>
          ${schema.collections
            .map(
              (c) => `
            <a class="adm-collection-card" href="#/collections/${c.name}">
              <span class="adm-collection-card__icon">
                <svg class="icon" aria-hidden="true"><use href="#i-${c.icon}" /></svg>
              </span>
              <span class="adm-collection-card__label">${c.label}</span>
              <span class="adm-collection-card__path">${c.folder}</span>
              <span class="adm-chip" data-count="${c.name}">…</span>
            </a>`,
            )
            .join('')}
        </div>

        <div class="adm-hint">
          <p>
            Every change is a commit. Publishing pushes to <code>main</code> and the site rebuilds in
            about two minutes.
          </p>
        </div>
      </div>
    </div>
  `;

  await Promise.all(
    schema.collections.map(async (collection) => {
      const slot = root.querySelector(`[data-count="${collection.name}"]`);
      if (!slot) return;
      try {
        const files = await listFolder(collection.folder, repoBranch());
        const count = files.filter((f) => f.type === 'file' && f.name.endsWith('.md')).length;
        slot.textContent = count === 1 ? '1 entry' : `${count} entries`;
      } catch {
        slot.textContent = '';
      }
    }),
  );
}

export { entryMeta };
