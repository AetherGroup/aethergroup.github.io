const NAMESPACE = 'aetherfox-admin:';

export function get(name, fallback = null) {
  try {
    const raw = localStorage.getItem(NAMESPACE + name);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(name, value) {
  try {
    localStorage.setItem(NAMESPACE + name, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(name) {
  try {
    localStorage.removeItem(NAMESPACE + name);
    return true;
  } catch {
    return false;
  }
}
