import { qsa } from '../lib/dom.js';
import { prefersReducedMotion } from '../lib/motion.js';

export function initReveal() {
  const targets = qsa('[data-reveal]');
  if (!targets.length) return;

  if (prefersReducedMotion()) {
    for (const el of targets) el.classList.add('is-visible');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );

  for (const el of targets) observer.observe(el);
}
