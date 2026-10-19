export const site = {
  name: 'Aetherfox',
  tagline: 'The browser with the extras left out.',
  description:
    'No telemetry, no sync, no clutter. Aetherfox also keeps websites from measuring you.',
  lang: 'en',
  url: 'https://aethergroup.github.io',
  repo: 'https://github.com/AetherGroup/aethergroup.github.io',
  browserRepo: 'https://github.com/AetherGroup/aetherfox',
  assetVersion: '1.0.0',
  copyright: '2026 Aetherfox',
} as const;

export type NavItem = {
  label: string;
  href: string;
};

export const navigation: NavItem[] = [
  { label: 'Privacy', href: '/#privacy' },
  { label: 'Left out', href: '/#left-out' },
  { label: 'Features', href: '/features' },
  { label: 'News', href: '/news' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Download', href: '/download' },
];

export const footerLinks: NavItem[] = [
  { label: 'Source on GitHub', href: 'https://github.com/AetherGroup/aetherfox' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'News', href: '/news' },
  { label: 'Privacy', href: '/privacy' },
];
