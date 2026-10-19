const NAMESPACE = 'aetherfox:';

export const key = (name) => `${NAMESPACE}${name}`;

export function get(name, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key(name));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(name, value) {
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(name) {
  try {
    window.localStorage.removeItem(key(name));
    return true;
  } catch {
    return false;
  }
}
