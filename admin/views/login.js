import { getToken, setToken } from '../lib/auth-store.js';

const WORKER = 'https://aetherfox-cms-auth.aetherfox-cms-auth.workers.dev';

export function renderLogin(root, onSignedIn) {
  root.innerHTML = `
    <div class="adm-login">
      <div class="adm-login__card">
        <img class="adm-login__mark" src="/assets/images/brand/aetherfox-logo.webp" alt="" width="72" height="70" />
        <h1 class="adm-login__title">Aetherfox</h1>
        <p class="adm-login__text">
          Sign in with GitHub to publish news and changelog entries.
          Your credentials go straight to GitHub and never reach Aetherfox.
        </p>
        <button class="btn adm-login__button" type="button" data-login>
          <svg class="icon" aria-hidden="true"><use href="#i-github" /></svg>
          Login with GitHub
        </button>
        <p class="adm-login__note" data-status></p>
      </div>
    </div>
  `;

  const status = root.querySelector('[data-status]');
  const button = root.querySelector('[data-login]');

  button.addEventListener('click', () => {
    button.disabled = true;
    status.textContent = 'Opening GitHub…';

    const popup = window.open(
      `${WORKER}/api/auth?provider=github&site_id=${location.hostname}`,
      'aetherfox-cms-auth',
      'width=680,height=760',
    );

    if (!popup) {
      status.textContent = 'The popup was blocked. Allow popups for this site.';
      button.disabled = false;
      return;
    }

    const onMessage = (event) => {
      if (event.data === 'authorizing:github') return;

      const prefix = 'authorization:github:success:';
      if (typeof event.data === 'string' && event.data.startsWith(prefix)) {
        window.removeEventListener('message', onMessage);
        const payload = JSON.parse(event.data.slice(prefix.length));
        setToken(payload.token);
        status.textContent = 'Signed in. Loading…';
        onSignedIn();
        return;
      }

      if (typeof event.data === 'string' && event.data.startsWith('authorization:github:error:')) {
        window.removeEventListener('message', onMessage);
        status.textContent = 'Sign in was cancelled.';
        button.disabled = false;
      }
    };

    window.addEventListener('message', onMessage);

    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        if (getToken()) return;
        status.textContent = 'Sign in was closed before finishing.';
        button.disabled = false;
      }
    }, 600);
  });
}
