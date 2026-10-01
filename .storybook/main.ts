/**
 * Storybook 8 configuration for the Hirobius Design System (HDS).
 *
 * Tool selection ledger (12n-api-storybook-setup):
 *   - Storybook 8 selected over Histoire and Ladle per Adrian directive 2026-05-02.
 *   - Reason: largest ecosystem, first-class a11y addon, visual-regression
 *     integration via Chromatic, MDX support for docs pages, and long-term
 *     roadmap alignment with the HDS public API surface.
 *   - Histoire rejected: Vue-first origin, thin React adapter, narrower addon
 *     ecosystem.
 *   - Ladle rejected: fastest setup but lacks a11y addon, MDX docs, and
 *     Chromatic integration — all required for the 29-primitive external API.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const STORIES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/stories');

const INTERNAL_STORY_FILES = ['history-card'];

const config: StorybookConfig = {
  // Internals (#308): engineering scaffolding, not public API (HistoryCard;
  // the other five were deleted in 0.20.0, hds#389). Their metas carry `tags: ['!dev']`, which hides them in the dev
  // sidebar; a static build still lists tagged entries in index.json, so the
  // PUBLISHED Storybook also leaves those files out. That is opt-in
  // (HDS_STORYBOOK_PUBLIC=1, set only in vercel.json) because the docs-site and
  // Chromatic builds embed and snapshot the internals' stories.
  stories: () =>
    [
      process.env.HDS_STORYBOOK_PUBLIC === '1'
        ? // Explicit files, not an extglob: `!(token)` also swallowed tokenizer.
          (readdirSync(STORIES_DIR, { recursive: true }) as string[])
            .map((f) => f.split('\\').join('/'))
            .filter((f) => /\.stories\.tsx?$/.test(f))
            .filter((f) => !INTERNAL_STORY_FILES.includes(f.replace(/\.stories\.tsx?$/, '')))
            .map((f) => `../src/stories/${f}`)
        : '../src/stories/**/*.stories.@(ts|tsx)',
      '../src/stories/**/*.mdx',
    ].flat(),
  // Serves public/ at the Storybook root so fonts.css's absolute
  // `/fonts/satoshi/*.woff2` URLs resolve. Without this every story
  // renders in a fallback face, not Satoshi.
  staticDirs: ['../public', '../.storybook/static'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    // Renders `parameters.design` as the Design tab. Stories set it through
    // designParameters('<Name>') (src/stories/design-parameters.ts), which reads
    // componentSpecs[].figmaUrl — the same field `pnpm figma:links` projects
    // into the README. Without this addon the parameter is inert and the
    // README's "Storybook reads the same field" claim has nothing behind it.
    '@storybook/addon-designs',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};

export default config;
