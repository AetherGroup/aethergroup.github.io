import { getToken } from './auth-store.js';

const API = 'https://api.github.com';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  if (!token) throw new ApiError('Not signed in', 401);

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) throw new ApiError('Your session expired. Sign in again.', 401);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).message || detail;
    } catch {}
    throw new ApiError(detail, res.status);
  }

  return res.status === 204 ? null : res.json();
}

export const listFolder = (folder, branch) =>
  request(`/repos/${repoPath()}/contents/${folder}?ref=${branch}&t=${Date.now()}`);

export const readFile = (path, branch) =>
  request(`/repos/${repoPath()}/contents/${path}?ref=${branch}&t=${Date.now()}`);

export function writeFile(path, content, sha, message, branch) {
  return request(`/repos/${repoPath()}/contents/${path}`, {
    method: 'PUT',
    body: {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      ...(sha ? { sha } : {}),
      branch,
    },
  });
}

export function deleteFile(path, sha, message, branch) {
  return request(`/repos/${repoPath()}/contents/${path}`, {
    method: 'DELETE',
    body: { message, sha, branch },
  });
}

export const currentUser = () => request('/user');

export const listCommits = (path, branch) =>
  request(
    `/repos/${repoPath()}/commits?path=${path}&sha=${branch}&per_page=10`,
  );

export const rawUrl = (path, branch) =>
  `https://raw.githubusercontent.com/${repoPath()}/${branch}/${path}`;

let repo = null;

export function setRepo(name, branch) {
  repo = { name, branch };
}

export function repoPath() {
  if (!repo) throw new Error('Repo not set');
  return repo.name;
}

export function repoBranch() {
  if (!repo) throw new Error('Repo not set');
  return repo.branch;
}
