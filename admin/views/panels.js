import { listFolder, listCommits, rawUrl, repoBranch } from '../lib/api.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSize(bytes) {
  if (!bytes) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
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

export async function renderMedia(root) {
  root.innerHTML = `
    <div class="adm-page">
      <header class="adm-pagehead adm-pagehead--plain">
        <div class="adm-pagehead__text">
          <p class="adm-eyebrow">Assets</p>
          <h1 class="adm-pagetitle">Media</h1>
          <p class="adm-pagesub">
            Every image referenced by an entry. They live in
            <code>assets/images/uploads</code> in the repository.
          </p>
        </div>
      </header>

      <div class="adm-media" data-media><p class="adm-loading">Loading…</p></div>
    </div>
  `;

  const target = root.querySelector('[data-media]');

  try {
    const files = await listFolder('assets/images/uploads', repoBranch());
    const images = files.filter(
      (f) => f.type === 'file' && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f.name),
    );

    if (!images.length) {
      target.innerHTML = `<p class="adm-empty">
        No files yet. Set a cover image on an entry and it shows up here.
      </p>`;
      return;
    }

    target.innerHTML = images
      .map(
        (f) => `
        <figure class="adm-media__item">
          <a href="${rawUrl(f.path, repoBranch())}" target="_blank" rel="noopener">
            <img src="${rawUrl(f.path, repoBranch())}" alt="" loading="lazy" />
          </a>
          <figcaption>
            <span class="adm-media__name">${escapeHtml(f.name)}</span>
            <span class="adm-media__size">${formatSize(f.size)}</span>
          </figcaption>
        </figure>`,
      )
      .join('');
  } catch (error) {
    if (error.status === 404) {
      target.innerHTML = `<p class="adm-empty">
        The folder <code>assets/images/uploads</code> does not exist yet. It is created with the
        first image you add to an entry.
      </p>`;
      return;
    }
    target.innerHTML = `<p class="adm-error">${escapeHtml(error.message)}</p>`;
  }
}

const STEPS = [
  {
    title: 'Edit in the CMS',
    text: 'You write here. The CMS writes a Markdown file with its frontmatter.',
  },
  {
    title: 'Commit to main',
    text: 'Publishing is a commit on the main branch, with a message that says what changed.',
  },
  {
    title: 'The site rebuilds',
    text: 'GitHub Actions builds the site and publishes it to aethergroup.github.io.',
  },
];

export async function renderWorkflow(root) {
  root.innerHTML = `
    <div class="adm-page">
      <header class="adm-pagehead adm-pagehead--plain">
        <div class="adm-pagehead__text">
          <p class="adm-eyebrow">Publishing</p>
          <h1 class="adm-pagetitle">Workflow</h1>
          <p class="adm-pagesub">
            This site publishes straight to main. There is no review queue, because every change is
            a commit that triggers a deploy.
          </p>
        </div>
      </header>

      <ol class="adm-steps">
        ${STEPS.map(
          (step, index) => `
          <li class="adm-step">
            <span class="adm-step__number">${index + 1}</span>
            <h2 class="adm-step__title">${step.title}</h2>
            <p class="adm-step__text">${step.text}</p>
          </li>`,
        ).join('')}
      </ol>

      <section class="adm-panel adm-panel--block">
        <h2 class="adm-panel__title">Recent commits</h2>
        <ul class="adm-activity" data-activity>
          <li class="adm-activity__empty">Loading…</li>
        </ul>
      </section>
    </div>
  `;

  const activityHost = root.querySelector('[data-activity]');

  try {
    const commits = await listCommits('content', repoBranch());
    activityHost.innerHTML = commits.length
      ? commits
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
          .join('')
      : '<li class="adm-activity__empty">No commits yet.</li>';
  } catch {
    activityHost.innerHTML = '<li class="adm-activity__empty">Could not load the history.</li>';
  }
}
