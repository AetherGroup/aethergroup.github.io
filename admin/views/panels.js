import { listFolder, rawUrl, repoBranch } from '../lib/api.js';

export async function renderMedia(root) {
  root.innerHTML = `
    <div class="adm-content adm-content--wide">
      <div class="adm-page-head">
        <div>
          <h1 class="adm-title">Media</h1>
          <p class="adm-sub">Files uploaded from the CMS live in <code>assets/images/uploads</code>.</p>
        </div>
      </div>
      <div class="adm-media" data-media><p class="adm-loading">Loading…</p></div>
    </div>
  `;

  const target = root.querySelector('[data-media]');

  try {
    const files = await listFolder('assets/images/uploads', repoBranch());
    const images = files.filter((f) => f.type === 'file' && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f.name));

    if (!images.length) {
      target.innerHTML = `<p class="adm-empty">No files yet. Add a cover image to an entry and its URL goes here.</p>`;
      return;
    }

    target.innerHTML = images
      .map(
        (f) => `
        <figure class="adm-media__item">
          <img src="${rawUrl(f.path, repoBranch())}" alt="" loading="lazy" />
          <figcaption>${f.name}</figcaption>
        </figure>`,
      )
      .join('');
  } catch (error) {
    target.innerHTML = `<p class="adm-error">${error.message}</p>`;
  }
}

export async function renderWorkflow(root) {
  root.innerHTML = `
    <div class="adm-content adm-content--wide">
      <div class="adm-page-head">
        <div>
          <h1 class="adm-title">Workflow</h1>
          <p class="adm-sub">Every change is a commit. The site rebuilds on every push to main.</p>
        </div>
      </div>
      <div class="adm-workflow">
        <div class="adm-workflow__card">
          <h2>Editorial workflow</h2>
          <p>
            This site publishes straight to <code>main</code>. There are no pending review entries,
            because every change is a commit that triggers a deploy.
          </p>
        </div>
        <div class="adm-workflow__card">
          <h2>Deploy</h2>
          <p>
            A push to <code>main</code> builds the site and publishes it to
            <a href="https://aethergroup.github.io/" target="_blank" rel="noopener">aethergroup.github.io</a>
            in about two minutes.
          </p>
        </div>
      </div>
    </div>
  `;
}
