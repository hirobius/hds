import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkTokenTables } from './lib/remark-token-tables';

// Content source is the repo's own MDX (content/docs/**), not a copy.
export const docs = defineDocs({
  dir: '../content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkTokenTables],
  },
});
