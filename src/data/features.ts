import { type IconName } from './icons';

export type Feature = {
  icon: IconName;
  title: string;
  description: string;
};

export const fingerprinting: Feature[] = [
  {
    icon: 'canvas',
    title: 'Canvas images',
    description: 'Pictures look the same to you, but sites read slightly different pixels.',
  },
  {
    icon: 'text',
    title: 'Text measurements',
    description: 'Measured text widths differ a tiny bit per site.',
  },
  {
    icon: 'webgl',
    title: '3D graphics',
    description: 'Graphics card details change per site.',
  },
  {
    icon: 'audio',
    title: 'Audio',
    description: 'Sound analysis reads differ per site.',
  },
  {
    icon: 'cpu',
    title: 'Processor',
    description: 'Sites always see 8 cores.',
  },
];

export type LeftOut = {
  icon: IconName;
  title: string;
  description: string;
  removed: string[];
};

export const leftOut: LeftOut[] = [
  {
    icon: 'ban',
    title: 'No telemetry',
    description: 'Aetherfox sends nothing back about you. There is nothing to opt out of.',
    removed: ['Sites you visit', 'Searches', 'Device ID'],
  },
  {
    icon: 'cloud',
    title: 'No sync',
    description: 'No account and no cloud profile. Bookmarks and passwords stay on your device.',
    removed: ['Account', 'Cloud profile'],
  },
  {
    icon: 'lay',
    title: 'A clean interface',
    description: 'A toolbar and your pages. No sponsored tiles or promos getting in the way.',
    removed: ['Sponsored tiles', 'Promos'],
  },
];

export const shields: { icon: IconName; label: string }[] = [
  { icon: 'canvas', label: 'Canvas images' },
  { icon: 'audio', label: 'Audio' },
  { icon: 'cpu', label: 'Processor' },
];

export const platforms = [
  { id: 'windows', label: 'Windows', primary: true },
  { id: 'linux', label: 'Linux', primary: false },
] as const;
