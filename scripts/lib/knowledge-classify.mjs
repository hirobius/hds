/**
 * scripts/lib/knowledge-classify.mjs
 *
 * Rule-based classifier for AI-conversation ingestion (ChatGPT, Gemini, etc).
 * Returns { pillar, score, client, tags } for a normalized conversation.
 *
 * Pillars (from docs/knowledge/README.md):
 *   build = HDS, client deliverables, Concrete Creations product
 *   grow  = agency pipeline, brand, marketing, content, sales, LinkedIn, YouTube
 *   run   = AI infra, tools, research, processes, automation (this repo)
 *
 * Client detection runs first. Any unambiguous client mention quarantines the
 * conversation under build/clients/<slug>/ regardless of pillar score.
 *
 * Stub-quality: keyword weights, no LLM. Easy to swap for a Hermes pass later.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PILLAR_TERMS = {
  build: [
    ['hirobius', 5],
    ['\\bhds\\b', 5],
    ['design system', 4],
    ['design tokens', 4],
    ['component library', 3],
    ['shadcn', 3],
    ['radix', 2],
    ['storybook', 2],
    ['figma plugin', 4],
    ['figma variables', 3],
    ['code connect', 3],
    ['concrete creations', 5],
    ['resin', 1],
    ['mold', 1],
    ['react component', 2],
    ['tailwind', 2],
  ],
  grow: [
    ['linkedin', 3],
    ['youtube channel', 2],
    ['brand', 2],
    ['marketing', 2],
    ['copywriting', 3],
    ['headline', 2],
    ['landing page copy', 3],
    ['pitch deck', 3],
    ['sales', 2],
    ['agency', 3],
    ['client pipeline', 3],
    ['portfolio', 1],
    ['positioning', 2],
    ['content strategy', 3],
    ['social media', 2],
    ['newsletter', 2],
  ],
  run: [
    ['claude code', 4],
    ['anthropic', 3],
    ['ollama', 4],
    ['hermes', 3],
    ['mcp server', 4],
    ['model context protocol', 4],
    ['ingestion pipeline', 4],
    ['orchestration', 3],
    ['automation script', 3],
    ['cron', 1],
    ['n8n', 2],
    ['zapier', 2],
    ['vector db', 2],
    ['embeddings', 2],
    ['rag', 2],
    ['claude api', 3],
    ['openai api', 2],
    ['llm pipeline', 3],
  ],
};

// ── Client detection rules ──────────────────────────────────────────────────
// Client names are personal/business data and this repo is public, so the
// rules live in a gitignored local file, never in source. Shape (see the
// checked-in example): { "clients": [{ "slug", "anyOf": [[regex, ...], ...] }] }
// — each anyOf group is a list of case-insensitive regex sources that must ALL
// match; the first client (in file order) with a matching group wins.
const LIB_DIR = dirname(fileURLToPath(import.meta.url));
export const CLIENT_RULES_FILE = join(LIB_DIR, 'knowledge-clients.local.json');
export const CLIENT_RULES_EXAMPLE_FILE = join(LIB_DIR, 'knowledge-clients.example.json');

/**
 * Load client detection rules. Fails loud with the file to create when missing.
 *
 * @param {string} [file] - rules file (defaults to the gitignored local file)
 * @returns {{ slug: string, anyOf: string[][] }[]}
 */
export function loadClientRules(file = CLIENT_RULES_FILE) {
  if (!existsSync(file)) {
    throw new Error(
      `knowledge-classify: client rules file not found: ${file}. ` +
        `Copy ${CLIENT_RULES_EXAMPLE_FILE} to that path and fill in your real client slugs and ` +
        `patterns. The file is gitignored — never commit it.`,
    );
  }
  let clients;
  try {
    ({ clients } = JSON.parse(readFileSync(file, 'utf8')));
  } catch (err) {
    throw new Error(
      `knowledge-classify: client rules file is not valid JSON: ${file} (${err.message})`,
    );
  }
  const valid =
    Array.isArray(clients) &&
    clients.every(
      (c) =>
        typeof c?.slug === 'string' &&
        Array.isArray(c.anyOf) &&
        c.anyOf.every(
          (g) => Array.isArray(g) && g.length > 0 && g.every((p) => typeof p === 'string'),
        ),
    );
  if (!valid) {
    throw new Error(
      `knowledge-classify: malformed client rules in ${file} — expected ` +
        `{ "clients": [{ "slug": string, "anyOf": string[][] }] }. See ${CLIENT_RULES_EXAMPLE_FILE}.`,
    );
  }
  return clients;
}

// Read the local rules file once per process, on first use — not per classify()
// call, which runs once per conversation during a bulk ingestion.
let defaultClientRules;
function getDefaultClientRules() {
  defaultClientRules ??= loadClientRules();
  return defaultClientRules;
}

function matchClient(haystack, clientRules) {
  const hit = clientRules.find((rule) =>
    rule.anyOf.some((group) => group.every((source) => new RegExp(source, 'i').test(haystack))),
  );
  return hit?.slug ?? null;
}

/**
 * Classify normalized conversation text.
 *
 * @param {object} input
 * @param {string} input.title - conversation title
 * @param {string} input.text  - full concatenated message text (lowercased recommended)
 * @param {object} [options]
 * @param {{ slug: string, anyOf: string[][] }[]} [options.clientRules] - defaults to the local rules file (loaded once)
 * @returns {{ pillar: 'build'|'grow'|'run'|'_unclassified', score: object, client: string|null, tags: string[] }}
 */
export function classify(
  { title = '', text = '' },
  { clientRules = getDefaultClientRules() } = {},
) {
  const haystack = `${title}\n${text}`.toLowerCase();

  const client = matchClient(haystack, clientRules);

  const score = { build: 0, grow: 0, run: 0 };
  for (const [pillar, terms] of Object.entries(PILLAR_TERMS)) {
    for (const [pattern, weight] of terms) {
      const re = new RegExp(pattern, 'gi');
      const hits = haystack.match(re);
      if (hits) score[pillar] += weight * hits.length;
    }
  }

  const top = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  const pillar = top[1] >= 2 ? top[0] : '_unclassified';

  const tags = [];
  if (client) tags.push(`client:${client}`);
  // Extract a couple of broad tags from term hits for downstream search
  if (/\bfigma\b/i.test(haystack)) tags.push('figma');
  if (/\b(midjourney|dall.?e|stable diffusion|whisk|imagen)\b/i.test(haystack))
    tags.push('image-gen');
  if (/\bthree\.?js\b/i.test(haystack)) tags.push('threejs');

  return { pillar, score, client, tags };
}

/** Deterministic short ID for filenames — last 6 chars of conv_id. */
export function shortId(convId) {
  return (
    (convId || '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(-6)
      .toLowerCase() || 'noid'
  );
}

/** kebab-case slug, max 60 chars. */
export function slugify(s, max = 60) {
  return (
    (s || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max) || 'untitled'
  );
}
