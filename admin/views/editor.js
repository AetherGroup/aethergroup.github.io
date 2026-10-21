import { readFile, writeFile, deleteFile, repoBranch } from '../lib/api.js';
import { marked } from '../vendor/marked.js';
import { parseFrontmatter, stringifyFrontmatter, slugify, formatDate } from '../lib/markdown.js';
import { invalidateFrontmatter } from './collection.js';

const dateFields = ['date', 'updated'];

const wideWidgets = new Set(['text', 'image']);

function fieldValue(field, data) {
  const value = data[field.name];
  if (value === undefined || value === null) {
    if (field.widget === 'boolean') return field.default ?? false;
    if (field.widget === 'list') return field.default ?? [];
    if (field.default !== undefined) return field.default;
    return '';
  }
  if (field.widget === 'datetime' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return value;
}

function renderField(field, data, wide) {
  const id = `f-${field.name}`;
  const value = fieldValue(field, data);
  const required = field.required === false ? '' : ' required';

  const label = `<label class="adm-field__label" for="${id}">${field.label}${
    field.required === false ? ' <span class="adm-field__optional">optional</span>' : ''
  }</label>`;

  let control = '';

  switch (field.widget) {
    case 'text':
      control = `<textarea class="adm-input adm-input--area" id="${id}" name="${field.name}"${required}>${escapeHtml(
        value,
      )}</textarea>`;
      break;

    case 'boolean':
      control = `
        <button class="adm-switch" type="button" role="switch" aria-checked="${value ? 'true' : 'false'}"
                data-switch="${field.name}" id="${id}">
          <i></i>
          <span>${value ? 'Yes' : 'No'}</span>
        </button>`;
      break;

    case 'select':
      control = `<select class="adm-input" id="${id}" name="${field.name}"${required}>
        ${(field.options || [])
          .map((o) => `<option value="${o}"${o === value ? ' selected' : ''}>${o}</option>`)
          .join('')}
      </select>`;
      break;

    case 'list':
      control = `<input class="adm-input" id="${id}" name="${field.name}" value="${escapeHtml(
        Array.isArray(value) ? value.join(', ') : value,
      )}" placeholder="comma separated" />`;
      break;

    case 'number':
      control = `<input class="adm-input" type="number" id="${id}" name="${field.name}" value="${escapeHtml(
        value,
      )}"${field.min !== undefined ? ` min="${field.min}"` : ''}${required} />`;
      break;

    case 'image':
      control = `
        <div class="adm-image">
          ${
            value
              ? `<img class="adm-image__preview" src="${value.startsWith('/') ? value : '/' + value}" alt="" />`
              : ''
          }
          <input class="adm-input" id="${id}" name="${field.name}" value="${escapeHtml(value)}"
                 placeholder="/assets/images/uploads/cover.png" />
        </div>`;
      break;

    case 'datetime':
      control = `<input class="adm-input" type="date" id="${id}" name="${field.name}" value="${escapeHtml(
        value,
      )}"${required} />`;
      break;

    default:
      control = `<input class="adm-input" id="${id}" name="${field.name}" value="${escapeHtml(
        value,
      )}"${required} />`;
  }

  return `<div class="adm-field adm-field--${field.widget}${wide ? ' adm-field--wide' : ''}">${label}${control}</div>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderEditor(root, schema, collection, fileName) {
  const isNew = !fileName;

  let data = {};
  let body = '';
  let sha = null;

  if (!isNew) {
    try {
      const file = await readFile(`${collection.folder}/${fileName}`, repoBranch());
      sha = file.sha;
      const text = decodeBase64(file.content);
      const parsed = parseFrontmatter(text);
      data = parsed.data;
      body = parsed.body;
    } catch (error) {
      root.innerHTML = `<div class="adm-content"><p class="adm-error">${error.message}</p></div>`;
      return;
    }
  } else {
    for (const field of collection.fields) {
      if (field.default !== undefined) data[field.name] = field.default;
    }
  }

  const idField = collection.identifier_field || 'title';

  root.innerHTML = `
    <div class="adm-editor">
      <div class="adm-editor__bar">
        <div class="adm-editor__bar-inner">
          <a class="adm-back" href="#/collections/${collection.name}">
            <svg class="icon" aria-hidden="true"><use href="#i-back" /></svg>
            ${collection.label}
          </a>
          <div class="adm-editor__bar-actions">
            <span class="adm-status" data-status></span>
            ${
              isNew
                ? ''
                : `<button class="adm-btn adm-btn--danger" type="button" data-delete>
                     <svg class="icon" aria-hidden="true"><use href="#i-trash" /></svg>
                     Delete
                   </button>`
            }
            <button class="btn" type="button" data-save>
              <svg class="icon" aria-hidden="true"><use href="#i-check" /></svg>
              ${isNew ? 'Publish' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div class="adm-editor__body">
        <div class="adm-editor__split">
          <div class="adm-editor__write">
            <p class="adm-eyebrow">${isNew ? 'New' : 'Editing'} ${collection.label_singular.toLowerCase()}</p>
            <h1 class="adm-editor__title" data-title-preview>${
              data[idField] || `Untitled ${collection.label_singular.toLowerCase()}`
            }</h1>

            <form class="adm-form" data-form>
              <section class="adm-formpanel">
                <h2 class="adm-formpanel__title">Details</h2>
                <div class="adm-formgrid">
                  ${collection.fields
                    .map((field) =>
                      renderField(
                        field,
                        data,
                        field.name === idField || wideWidgets.has(field.widget),
                      ),
                    )
                    .join('')}
                </div>
              </section>

              <section class="adm-formpanel">
                <h2 class="adm-formpanel__title">
                  Content <span class="adm-field__optional">markdown</span>
                </h2>
                <textarea class="adm-input adm-input--body" id="f-body" name="body" rows="18">${escapeHtml(
                  body,
                )}</textarea>
              </section>
            </form>
          </div>

          <div class="adm-editor__preview">
            <div class="adm-editor__preview-head">Preview</div>
            <article class="adm-preview" data-preview>
              <p class="adm-loading">Rendering…</p>
            </article>
          </div>
        </div>
      </div>
    </div>
  `;

  const form = root.querySelector('[data-form]');
  const status = root.querySelector('[data-status]');
  const saveButton = root.querySelector('[data-save]');
  const deleteButton = root.querySelector('[data-delete]');
  const titlePreview = root.querySelector('[data-title-preview]');
  const previewHost = root.querySelector('[data-preview]');

  const missingRequired = () => {
    const missing = [];
    for (const field of collection.fields) {
      if (field.required === false) continue;
      if (field.widget === 'boolean' || field.widget === 'list') continue;
      const input = form.querySelector(`[name="${field.name}"]`);
      if (!input || !String(input.value).trim()) missing.push(field.label);
    }
    return missing;
  };

  const readValues = () => {
    const values = {};
    for (const field of collection.fields) {
      if (field.widget === 'boolean') {
        const toggle = form.querySelector(`[data-switch="${field.name}"]`);
        values[field.name] = toggle?.getAttribute('aria-checked') === 'true';
        continue;
      }
      const input = form.querySelector(`[name="${field.name}"]`);
      if (!input) continue;
      let value = input.value;
      if (field.widget === 'list') {
        value = value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean);
      }
      values[field.name] = value;
    }
    return values;
  };

  const renderPreview = async () => {
    const values = readValues();
    const markdown = form.querySelector('[name="body"]').value;

    let html = '';
    try {
      html = marked.parse(markdown || '_No content yet._', { gfm: true, breaks: false });
    } catch (error) {
      previewHost.innerHTML = `<p class="adm-error">${error.message}</p>`;
      return;
    }

    const date = values.date ? formatDate(values.date) : '';
    const meta = [date, values.category, values.author].filter(Boolean).join(' · ');

    previewHost.innerHTML = `
      <div class="page-article__head">
        <h1 class="adm-preview__title">${escapeHtml(values[idField] || 'Untitled')}</h1>
        ${meta ? `<div class="page-article__meta">${escapeHtml(meta)}</div>` : ''}
      </div>
      <div class="prose">${html}</div>
    `;
  };

  let previewTimer = null;
  const schedulePreview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 500);
  };

  form.addEventListener('input', schedulePreview);

  const idInput = form.querySelector(`[name="${idField}"]`);
  idInput?.addEventListener('input', () => {
    titlePreview.textContent = idInput.value || `Untitled ${collection.label_singular.toLowerCase()}`;
  });

  renderPreview();

  for (const toggle of form.querySelectorAll('[data-switch]')) {
    toggle.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(on));
      toggle.querySelector('span').textContent = on ? 'Yes' : 'No';
    });
  }

  saveButton.addEventListener('click', async () => {
    const missing = missingRequired();
    if (missing.length) {
      status.textContent = 'Fill the required fields';
      status.classList.add('is-error');
      for (const label of missing) {
        const field = collection.fields.find((f) => f.label === label);
        const input = field && form.querySelector(`[name="${field.name}"]`);
        input?.classList.add('is-invalid');
        input?.focus();
      }
      return;
    }
    status.classList.remove('is-error');
    for (const el of form.querySelectorAll('.is-invalid')) el.classList.remove('is-invalid');

    const values = readValues();
    const markdown = form.querySelector('[name="body"]').value;
    const content = stringifyFrontmatter(values, markdown);

    const target = isNew
      ? `${collection.folder}/${slugify(values[idField] || 'entry')}.md`
      : `${collection.folder}/${fileName}`;

    const message = isNew
      ? `cms: create ${collection.name} «${slugify(values[idField] || 'entry')}»`
      : `cms: update ${collection.name} «${slugify(values[idField] || fileName)}»`;

    saveButton.disabled = true;
    status.textContent = 'Saving…';

    try {
      await writeFile(target, content, sha, message, repoBranch());
      invalidateFrontmatter(`${collection.folder}/${target.split('/').pop()}`);
      status.textContent = 'Saved';
      setTimeout(() => {
        location.hash = `#/collections/${collection.name}`;
      }, 600);
    } catch (error) {
      status.textContent = '';
      saveButton.disabled = false;
      alert(`Could not save: ${error.message}`);
    }
  });

  deleteButton?.addEventListener('click', async () => {
    const title = data[idField] || fileName;
    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThe file is removed from the repository in a commit. The site rebuilds without it.`,
    );
    if (!confirmed) return;

    deleteButton.disabled = true;
    status.textContent = 'Deleting…';

    try {
      await deleteFile(
        `${collection.folder}/${fileName}`,
        sha,
        `cms: delete ${collection.name} «${slugify(title)}»`,
        repoBranch(),
      );
      invalidateFrontmatter(`${collection.folder}/${fileName}`);
      status.textContent = 'Deleted';
      setTimeout(() => {
        location.hash = `#/collections/${collection.name}`;
      }, 600);
    } catch (error) {
      status.textContent = '';
      status.classList.add('is-error');
      deleteButton.disabled = false;
      alert(`Could not delete: ${error.message}`);
    }
  });
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export { formatDate };
