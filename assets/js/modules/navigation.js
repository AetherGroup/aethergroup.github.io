import { qs, qsa } from '../lib/dom.js';

export function initNavigation() {
  const nav = qs('[data-nav]');
  if (nav) initMobileMenu(nav);
  initScrollSpy();
}

function initMobileMenu(nav) {
  const toggle = qs('[data-nav-toggle]', nav);
  const links = qs('[data-nav-links]', nav);
  if (!toggle || !links) return;

  const setOpen = (open) => {
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  setOpen(false);

  toggle.addEventListener('click', () => {
    setOpen(nav.dataset.open !== 'true');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.dataset.open === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  links.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false);
  });

  window.matchMedia('(min-width: 981px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function initScrollSpy() {
  const links = qsa('[data-nav-links] a[href^="#"]');
  if (!links.length) return;

  const sections = links
    .map((link) => {
      const id = link.getAttribute('href')?.slice(1);
      const section = id ? document.getElementById(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const { link, section } of sections) {
          link.setAttribute('aria-current', section.id === entry.target.id ? 'true' : 'false');
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );

  for (const { section } of sections) observer.observe(section);
}
