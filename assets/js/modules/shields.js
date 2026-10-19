import { qsa } from '../lib/dom.js';

export function initShields() {
  const switches = qsa('[data-shield]');
  if (!switches.length) return;

  for (const control of switches) {
    const id = control.dataset.shield;
    const probe = document.querySelector(`[data-probe="${id}"]`);

    control.addEventListener('click', () => {
      const enabled = control.getAttribute('aria-checked') !== 'true';
      control.setAttribute('aria-checked', String(enabled));
      if (probe) probe.dataset.exposed = String(!enabled);
    });
  }
}
