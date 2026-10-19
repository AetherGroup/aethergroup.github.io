const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  return window.matchMedia(QUERY).matches;
}

export function onReducedMotionChange(handler) {
  const mq = window.matchMedia(QUERY);
  const listener = (event) => handler(event.matches);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

export function scrollToElement(element, offset = 84) {
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
