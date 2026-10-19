export const qs = (selector, scope = document) => scope.querySelector(selector);

export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function on(target, type, handler, options) {
  if (!target) return () => {};
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}

export function delegate(root, type, selector, handler) {
  if (!root) return () => {};
  const listener = (event) => {
    const match = event.target instanceof Element ? event.target.closest(selector) : null;
    if (match && root.contains(match)) handler(event, match);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

export function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

export function truncate(text, max = 160) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
