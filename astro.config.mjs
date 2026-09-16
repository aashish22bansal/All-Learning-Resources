// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import pagefind from 'astro-pagefind';
import { wikilinks } from './src/lib/wikilinks.mjs';

export default defineConfig({
  site: 'https://all-learning-resources.vercel.app',
  integrations: [pagefind()],
  markdown: {
    processor: satteri({
      features: { wikilinks: true },
      mdastPlugins: [wikilinks()],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-default' },
      wrap: true,
    },
  },
});
