import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const idFromFilename = ({ entry }: { entry: string }) =>
  entry.split(/[\\/]/).pop()!.replace(/\.md$/, '');

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/news', generateId: idFromFilename }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default('Aetherfox Team'),
    category: z.enum(['Release', 'Privacy', 'Design', 'Engineering']).default('Release'),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/changelog', generateId: idFromFilename }),
  schema: z.object({
    version: z.string(),
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['major', 'minor', 'patch']),
    platforms: z.array(z.enum(['windows', 'linux', 'macos'])).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages', generateId: idFromFilename }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    template: z.enum(['default', 'wide']).default('default'),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news, changelog, pages };
