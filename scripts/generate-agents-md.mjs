#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * generate-agents-md.mjs — the AGENTS.md shipped in the npm package.
 *
 * Agents that consume @hirobius/design-system read
 * node_modules/@hirobius/design-system/AGENTS.md first. Everything above
 * REPO_NOTES_MARKER is a projection of:
 *   - mcp/guide.mjs                        which component answers which need
 *   - src/app/data/component-api.json      that each named component exists
 *   - codemods/patterns-subpath.names.json which names import from /patterns
 * Below the marker, the repo-notes front door (hds#613, spec hirobius/ops#576)
 * is generated too, between FRONT_DOOR_START and FRONT_DOOR_END: what the repo
 * is, the read order, where live state is, and an index of every document in
 * docs/state-surfaces.json grouped by kind. After the block come hand-written
 * notes for agents working IN this repo (the Ralph quality bar that
 * ralph/prompt.md reads); the generator keeps those byte for byte. Root
 * AGENTS.md has to serve both readers because the package ships the repo
 * root's file and ralph/ (vendored) reads the same path.
 *
 * Usage:
 *   node scripts/generate-agents-md.mjs           write AGENTS.md
 *   node scripts/generate-agents-md.mjs --check   exit 1 when AGENTS.md is stale
 *   --root <dir>  read and write under <dir> instead of the repo (tests)
 *
 * Deterministic (no run dates; the index prints each editorial doc's reviewedAt
 * from the registry), so --check compares exact bytes.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HOOKS, recommendedComponents } from '../mcp/guide.mjs';
import { NEEDS_INTRO, needsMarkdown } from './lib/guide-markdown.mjs';
import { readVoice, voiceMarkdown } from './lib/voice.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const AGENTS_PATH = 'AGENTS.md';
const REGISTRY_PATH = 'docs/state-surfaces.json';
export const REPO_NOTES_MARKER =
  '<!-- hds:repo-notes — everything below is hand-written, for agents working in the hds repo itself; consumers can stop here. -->';

export const FRONT_DOOR_START =
  '<!-- hds:front-door:start — generated from docs/state-surfaces.json by scripts/generate-agents-md.mjs (pnpm agents:generate); do not hand-edit until the end marker. -->';
export const FRONT_DOOR_END = '<!-- hds:front-door:end -->';

const PKG = '@hirobius/design-system';
const code = (name) => `\`${name}\``;

const KIND_ORDER = [
  [
    'generated',
    'Generated',
    'A script builds it; its `--check` fails when it is stale. Do not hand-edit.',
  ],
  ['checked', 'Checked', 'Hand-kept, but a gate compares it with the code.'],
  [
    'editorial',
    'Editorial',
    'Written by a person; the registry carries who, and when it was last re-read.',
  ],
];

/** The tail of a registry entry: how the document is kept true. */
function upkeep(s) {
  if (s.kind === 'editorial') {
    return `${s.owner}, reviewed ${s.reviewedAt}, re-read within ${s.maxAgeDays} days.`;
  }
  return `${s.kind === 'generated' ? 'Built' : 'Checked'} by ${code(s.by)}.`;
}

/**
 * The generated front door of the repo notes: what the repo is, the read order,
 * where live state lives, and every registered document by kind. Holds no
 * versions, counts or open work: those are derived, and ops states them live.
 * @param {{ alwaysOn?: string[], surfaces: object[] }} registry docs/state-surfaces.json
 */
export function buildFrontDoor(registry) {
  const first = registry.alwaysOn ?? [];
  const index = KIND_ORDER.flatMap(([kind, title, gloss]) => {
    const rows = registry.surfaces.filter((s) => s.kind === kind);
    if (rows.length === 0) return [];
    return [
      `### ${title}`,
      '',
      gloss,
      '',
      ...rows.map(
        (s) =>
          `- ${code(s.path)}${s.section ? ` (${s.section})` : ''}: ${s.describes}. ${upkeep(s)}`,
      ),
      '',
    ];
  });
  return [
    FRONT_DOOR_START,
    '',
    '## Front door: working in the hds repo',
    '',
    `${PKG} is a token-first React product foundation: one opinionated, re-themeable system, published as an npm package, with the token layer portable to other front ends.`,
    '',
    '### Read order',
    '',
    `1. ${first.length ? first.map(code).join(', then ') : code('CLAUDE.md')}. These are the always-on files: rules, read order and pointers, no state.`,
    `2. ${code('docs/ENGINEERING.md')}: how the system is built (sources of truth, gates, release, design and code sync).`,
    `3. For the task at hand: ${code('public/hds-manifest.json')} and ${code('src/app/data/component-api.json')} (inventory and props), ${code('DESIGN.md')} (visual spec), ${code('docs/guardrails/registry.json')} (every gate and where it fires).`,
    '',
    '### Where live state is',
    '',
    `Nothing in the repo records the release, the open work or what is blocked: ops derives them. Read ops \`/ops/standing\` (every verdict from live data) and \`GET https://<ops host>/api/projects?status=hirobius/hds\` (this repo's derived state; the ops host is not recorded in this repo, ask for it). ${code('status.json')} holds only the hand-written focus and phase. Open work is GitHub Issues in this repo.`,
    '',
    '### Documents and what keeps them true',
    '',
    `Built from ${code('docs/state-surfaces.json')}, which ${code('scripts/check-state-surfaces.mjs')} gates. Re-read an editorial document, bump its \`reviewedAt\` there, then run \`pnpm agents:generate\`.`,
    '',
    ...index,
    FRONT_DOOR_END,
    '',
  ].join('\n');
}

/**
 * @param {{ componentApi: { components: Record<string, unknown> }, patternNames: string[], repoNotes: string, voice?: object, registry?: { alwaysOn?: string[], surfaces: object[] } }} input
 */
export function buildAgentsMd({ componentApi, patternNames, repoNotes, voice, registry }) {
  const api = componentApi.components;
  const fromPatterns = new Set(patternNames);
  const needs = needsMarkdown(api);
  const core = recommendedComponents().filter((n) => api[n]);
  const rootNames = [...core.filter((n) => !fromPatterns.has(n)), ...Object.keys(HOOKS)].sort();
  const patterns = core.filter((n) => fromPatterns.has(n));

  const body = [
    '# AGENTS.md — @hirobius/design-system',
    '',
    '<!-- Generated by scripts/generate-agents-md.mjs from mcp/guide.mjs, src/app/data/component-api.json and content/docs/voice.mdx. Do not hand-edit above the repo-notes marker: pnpm agents:generate -->',
    '',
    `For agents building UI with \`${PKG}\`. Read this first. It settles the choices the rest of the docs leave open, so two agents given the same screen build it the same way.`,
    '',
    '## Look things up, do not guess',
    '',
    '- **MCP server `hds`** (stdio, ships in this package, no network): `npx hds-mcp` from an app that has the package installed. Client config:',
    '  `{ "mcpServers": { "hds": { "command": "npx", "args": ["hds-mcp"] } } }`',
    '- Tools: `list_core` (call first), `search_components` (by name or need), `get_component` (props, usage contract, compound parts), `search_tokens` (by path, prefix or words). Each answer is under 2 KB.',
    '- Without the server, the same data is in `src/app/data/component-api.json` (props, `usage`), `public/hds-manifest.json` (tokens, compound parts), `llms.txt` and `DESIGN.md` in this package.',
    '',
    '## Imports',
    '',
    'These are the recommended components: the ratified core set plus every component the needs below name. The ratified core alone is the `core: true` flag in the manifest.',
    '',
    `- \`${PKG}\`: ${rootNames.map(code).join(', ')}.`,
    `- \`${PKG}/patterns\`: ${patterns.map(code).join(', ')}. These are not in the root barrel.`,
    '- Load one stylesheet once at the app root and put `data-hds` on the root element (`CONSUMING.md`).',
    '',
    '## Pick by need',
    '',
    NEEDS_INTRO,
    '',
    needs,
    '',
    '## Rules',
    '',
    '- Tokens only: no raw hex or rgb, no raw `px`, no Tailwind classes, no custom CSS files. Spacing comes from component props (`Stack` `gap`), colour from component `tone` props or `semantic.*` tokens (`search_tokens`).',
    '- No raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<form>`: use `Button`, `Input`, `Select`, `Textarea`, `Form`.',
    '- Every control has an accessible name: fields take `label`, a repeated row action takes an `aria-label` naming its row.',
    '- Section headings come from the pattern that owns the section (`title` props). Do not add a `Text` heading the screen does not ask for.',
    '',
    ...(voice ? ['## Voice', '', voiceMarkdown(voice), ''] : []),
    '## Finish with the lint plugin',
    '',
    'The ESLint plugin ships in this package. Pass its `recommended` rules before you report done:',
    '',
    '```js',
    '// eslint.config.mjs',
    `import hds from '${PKG}/eslint-plugin';`,
    '',
    'export default [...hds.configs.recommended];',
    '```',
    '',
  ].join('\n');

  const door = registry ? `\n${buildFrontDoor(registry)}` : '';
  return `${body}\n${REPO_NOTES_MARKER}\n${door}${repoNotes ? `\n${repoNotes}` : ''}`;
}

/** The hand-written notes below the marker in an existing AGENTS.md ('' when absent). The generated front door is not one of them. */
export function readRepoNotes(existing) {
  if (!existing) return '';
  const at = existing.indexOf(REPO_NOTES_MARKER);
  if (at < 0) return '';
  let notes = existing.slice(at + REPO_NOTES_MARKER.length);
  const start = notes.indexOf(FRONT_DOOR_START);
  const end = notes.indexOf(FRONT_DOOR_END);
  if (start >= 0 && end > start)
    notes = notes.slice(0, start) + notes.slice(end + FRONT_DOOR_END.length);
  return notes.replace(/^\n+/, '');
}

function main() {
  const rootFlag = process.argv.indexOf('--root');
  const root = rootFlag >= 0 ? resolve(process.argv[rootFlag + 1]) : ROOT;
  const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
  const outPath = join(root, AGENTS_PATH);
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
  const apiPath = 'src/app/data/component-api.json';
  if (!existsSync(join(root, apiPath))) {
    console.error(
      `✗ ${apiPath} is missing (it is generated). Run: node scripts/generate-component-api.mjs`,
    );
    process.exit(1);
  }
  const content = buildAgentsMd({
    componentApi: readJson(apiPath),
    patternNames: readJson('codemods/patterns-subpath.names.json').names,
    repoNotes: readRepoNotes(current),
    voice: readVoice(root),
    registry: readJson(REGISTRY_PATH),
  });

  if (process.argv.includes('--check')) {
    if (current !== content) {
      console.error(
        `✗ ${AGENTS_PATH} is out of date with mcp/guide.mjs, component-api.json, content/docs/voice.mdx or docs/state-surfaces.json. Run: pnpm agents:generate (hand-edit only below the front-door end marker).`,
      );
      process.exit(1);
    }
    console.log(`✓ ${AGENTS_PATH} is up to date`);
    return;
  }
  writeFileSync(outPath, content);
  console.log(`✓ wrote ${AGENTS_PATH}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
