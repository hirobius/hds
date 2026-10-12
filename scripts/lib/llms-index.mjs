/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * llms-index.mjs — the llms.txt index: one base URL, one list of links.
 *
 * LLMS_BASE_URL is the ONE place the host lives. Every link in public/llms.txt
 * is `${LLMS_BASE_URL}/<path inside the npm package>`, so moving the host (for
 * example to the docs site once it serves every file) is a one-line change here
 * and `pnpm llms:generate`. unpkg serves any file of the published package at
 * that path, which the docs site does not (it 404s AGENTS.md, UPGRADING.md and
 * hirobius.tokens.json).
 */

export const LLMS_BASE_URL = 'https://unpkg.com/@hirobius/design-system';

export const llmsUrl = (pkgPath) => `${LLMS_BASE_URL}/${pkgPath}`;

const link = (name, path, note) => `- [${name}](${llmsUrl(path)}): ${note}`;

/**
 * The index text. `slices` is [{ name, blurb }]; `summary` the one-line `> `
 * blockquote. No timestamp: the output is a pure function of its inputs.
 */
export function buildLlmsIndex({ summary, slices }) {
  const sections = [
    [
      'Start here',
      [
        link(
          'AGENTS.md',
          'AGENTS.md',
          'which component to use for each screen need, the imports, and the rules. Read it first.',
        ),
        link(
          'hds-mcp',
          'mcp/hds-mcp.mjs',
          'MCP server over stdio: run `npx hds-mcp`. Tools `list_core`, `search_components`, `get_component`, `search_tokens`; each answer is under 2 KB.',
        ),
        link(
          'ESLint plugin',
          'scripts/eslint-plugin-hds/index.mjs',
          "lint before you finish: `import hds from '@hirobius/design-system/eslint-plugin'` and spread `hds.configs.recommended` into `eslint.config.mjs`.",
        ),
      ],
    ],
    [
      'Full bundle',
      [
        link(
          'llms-full.txt',
          'public/llms-full.txt',
          'everything in one file: voice, pick by need, layout and scroll recipes, card anatomy, tokens, DESIGN.md and a props digest for every component.',
        ),
      ],
    ],
    [
      'Topic slices',
      slices.map((sl) => link(`${sl.name}.txt`, `public/llms/${sl.name}.txt`, sl.blurb)),
    ],
    [
      'Reference data',
      [
        link(
          'hds-manifest.json',
          'public/hds-manifest.json',
          'component and pattern inventory, metadata and phase status.',
        ),
        link(
          'component-api.json',
          'src/app/data/component-api.json',
          'prop types, unions, defaults and descriptions for every component.',
        ),
        link(
          'hirobius.tokens.json',
          'hirobius.tokens.json',
          'token source of truth (W3C DTCG). Prefer `semantic.*` and `component.*` over `primitive.*`.',
        ),
      ],
    ],
    [
      'Docs',
      [
        link('DESIGN.md', 'DESIGN.md', 'the visual spec: surfaces, type, spacing, motion.'),
        link('CONSUMING.md', 'CONSUMING.md', 'install, set up and use the package in an app.'),
        link(
          'UPGRADING.md',
          'UPGRADING.md',
          'move between versions: what changed and what to run.',
        ),
      ],
    ],
    [
      'Optional',
      [
        link('MIGRATIONS.md', 'MIGRATIONS.md', 'step-by-step notes for breaking changes.'),
        link('CHANGELOG.md', 'CHANGELOG.md', 'release history.'),
      ],
    ],
  ];
  const body = sections.map(([title, lines]) => `## ${title}\n\n${lines.join('\n')}`).join('\n\n');
  return `# Hirobius Design System\n\n> ${summary}\n\n${body}\n`;
}
