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

export type Shield = {
  id: string;
  icon: IconName;
  label: string;
};

export const shields: Shield[] = [
  { id: 'canvas', icon: 'canvas', label: 'Canvas images' },
  { id: 'text', icon: 'text', label: 'Text measurements' },
  { id: 'webgl', icon: 'webgl', label: '3D graphics' },
  { id: 'audio', icon: 'audio', label: 'Audio' },
  { id: 'cores', icon: 'cpu', label: 'Processor' },
];

export type Probe = {
  id: string;
  label: string;
  safeValue: string;
  exposedValue: string;
  safeNote: string;
  exposedNote: string;
};

export const probes: Probe[] = [
  {
    id: 'canvas',
    label: 'Canvas',
    safeValue: 'a7f2·9c1e',
    exposedValue: 'a7f2·9c1e',
    safeNote: 'different on every site',
    exposedNote: 'the same on every site',
  },
  {
    id: 'text',
    label: 'Text',
    safeValue: '8.42 px',
    exposedValue: '8.42 px',
    safeNote: 'different on every site',
    exposedNote: 'the same on every site',
  },
  {
    id: 'webgl',
    label: 'WebGL',
    safeValue: 'generic',
    exposedValue: 'your GPU',
    safeNote: 'the same on every site',
    exposedNote: 'your real graphics card',
  },
  {
    id: 'audio',
    label: 'Audio',
    safeValue: '41c9·0d77',
    exposedValue: '41c9·0d77',
    safeNote: 'different on every site',
    exposedNote: 'the same on every site',
  },
  {
    id: 'cores',
    label: 'Cores',
    safeValue: '8',
    exposedValue: '16',
    safeNote: 'always the same',
    exposedNote: 'your real hardware',
  },
];

export const demoHost = 'example.com';

export const platforms = [
  { id: 'windows', label: 'Windows', primary: true },
  { id: 'linux', label: 'Linux', primary: false },
] as const;
