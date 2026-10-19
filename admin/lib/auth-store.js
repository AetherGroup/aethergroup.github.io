import { get, set, remove } from './storage.js';

const TOKEN = 'token';
const USER = 'user';

export const getToken = () => get(TOKEN);
export const setToken = (t) => set(TOKEN, t);
export const clearToken = () => {
  remove(TOKEN);
  remove(USER);
};

export function getUser() {
  return get(USER);
}

export const setUser = (u) => set(USER, u);
