import releaseData from '../data/releases.json';

export type ReleaseAsset = {
  name: string;
  url: string;
  size: number;
  downloads: number;
};

export type Release = {
  tag: string | null;
  name: string | null;
  publishedAt: string | null;
  url: string | null;
  page: string;
  assets: Partial<Record<'installer' | 'portable' | 'other', ReleaseAsset>>;
};

export const release = releaseData as Release;

export const installer = release.assets.installer ?? null;
export const portable = release.assets.portable ?? null;

export function formatSize(bytes: number): string {
  if (!bytes) return '';
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(0)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

export function formatReleaseDate(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(
    new Date(iso),
  );
}
