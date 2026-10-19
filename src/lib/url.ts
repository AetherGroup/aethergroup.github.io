const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}`;
}

export function canonical(path: string): string {
  return new URL(withBase(path), import.meta.env.SITE).href;
}

export function absoluteUrl(path: string): string {
  return new URL(withBase(path), import.meta.env.SITE).href;
}
