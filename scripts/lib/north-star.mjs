/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * north-star.mjs — reads the one North Star brief, content/docs/north-star.mdx.
 *
 * That page is the source; everything else is derived from it so nothing can
 * drift: the docs site renders it at /docs/north-star, AGENTS.md and llms.txt
 * carry its Voice section (generated), and check-docs fails any docs page that
 * uses a phrase from its "Words we don't use" list.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const NORTH_STAR_FILE = 'content/docs/north-star.mdx';
export const NORTH_STAR_URL = '/docs/north-star';

/** The `- ` bullets under one `## ` heading, in order. */
function bullets(source, heading) {
  const start = source.search(new RegExp(`^## ${heading}\\s*$`, 'm'));
  if (start < 0) return [];
  const rest = source.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end))
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim());
}

/**
 * @param {string} source  contents of content/docs/north-star.mdx
 * @returns {{ description: string, voice: string[], avoid: string[] }}
 */
export function parseNorthStar(source) {
  const description = /^description:\s*['"](.*)['"]\s*$/m.exec(source)?.[1] ?? '';
  return {
    description,
    voice: bullets(source, 'Voice'),
    avoid: bullets(source, "Words we don't use").map((w) => w.replace(/^["'`]|["'`]$/g, '')),
  };
}

/** @param {string} root repo root */
export function readNorthStar(root) {
  return parseNorthStar(readFileSync(join(root, NORTH_STAR_FILE), 'utf8'));
}

/** The Voice block AGENTS.md and llms.txt both print (same text in both). */
export function voiceMarkdown(ns) {
  return [
    `${ns.description} Source: \`${NORTH_STAR_FILE}\` (published at \`${NORTH_STAR_URL}\`).`,
    '',
    ...ns.voice.map((v) => `- ${v}`),
    ...(ns.avoid.length ? [`- Don't use: ${ns.avoid.map((w) => `"${w}"`).join(', ')}.`] : []),
  ].join('\n');
}

/**
 * Phrases from the avoid list found in a text, case-insensitive, whole words.
 * @param {string} text
 * @param {string[]} avoid
 */
export function avoidedPhrases(text, avoid) {
  return avoid.filter((w) =>
    new RegExp(`(^|[^\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w-])`, 'i').test(
      text,
    ),
  );
}
