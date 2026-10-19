import { qsa } from '../lib/dom.js';

export function initShields() {
  const switches = qsa('[data-shield]');
  if (!switches.length) return;

  for (const control of switches) {
    const id = control.dataset.shield;
    const probe = document.querySelector(`[data-probe="${id}"]`);
    const state = control.querySelector('.shields__state');

    control.addEventListener('click', () => {
      const enabled = control.getAttribute('aria-checked') !== 'true';
      control.setAttribute('aria-checked', String(enabled));
      if (state) {
        state.dataset.on = String(enabled);
        state.textContent = enabled ? 'On' : 'Off';
      }
      if (probe) probe.dataset.exposed = String(!enabled);
    });
  }
}
