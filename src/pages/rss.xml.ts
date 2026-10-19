import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';
import { withBase } from '../lib/url';

export async function GET(context: { site: URL }) {
  const posts = (await getCollection('news', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: site.name,
    description: site.description,
    site: context.site,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: withBase(`/news/${post.id}/`),
    })),
  });
}
