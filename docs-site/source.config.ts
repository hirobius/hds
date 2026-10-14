import { defineDocs, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import { remarkTokenTables } from './lib/remark-token-tables';
import { remarkRepoDoc } from './lib/remark-repo-doc';

// Content source is the repo's own MDX (content/docs/**), not a copy.
export const docs = defineDocs({
  dir: '../content/docs',
  docs: {
    // content-model.md frontmatter (component, status, since, related) rides along
    // beside Fumadocs' own fields; scripts/check-docs.mjs enforces its shape.
    schema: frontmatterSchema.loose(),
  },
});

export default defineConfig({
  mdxOptions: {
    // <RepoDoc path /> splices a repo doc in before Fumadocs' own plugins run,
    // so its headings get ids, the contents rail and search like any page.
    remarkPlugins: (defaults) => [remarkRepoDoc as never, ...defaults, remarkTokenTables as never],
  },
});
