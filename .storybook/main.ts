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

const INTERNAL_STORY_FILES = [
  'cinematic-link',
  'component-instance-matrix',
  'foundation-swatch',
  'history-card',
  'sketch',
  'token',
];

const config: StorybookConfig = {
  // Internals (#308): six components are engineering scaffolding, not public
  // API. Their metas carry `tags: ['!dev']`, which hides them in the dev
  // sidebar; a static build still lists tagged entries in index.json, so the
  // published Storybook also leaves those files out of the glob.
  stories: (_entries, { configType }) => [
    configType === 'PRODUCTION'
      ? // Explicit files, not an extglob: `!(token)` also swallowed tokenizer.
        readdirSync(STORIES_DIR)
          .filter((f) => f.endsWith('.stories.tsx') || f.endsWith('.stories.ts'))
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
