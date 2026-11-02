#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * figma-text-style-verification.mjs — turns a raw `use_figma` read of the
 * library (text layers with no text style, per component; the read script is
 * in figma/reads/text-style-read.js) into figma/text-style-verification.json.
 *
 * Components on the Archive or Deprecated pages get a reason: they are kept
 * only because the library never deletes (ADR-026 amendment), so binding
 * styles there buys nothing. Everything else is live and should be bound.
 *
 *   node scripts/figma-text-style-verification.mjs <raw-read.json> [--date YYYY-MM-DD]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FILE_KEY = '2VgBbVpKiDnu0aftJEVyBQ';
const REASONS = {
  Archive:
    'On the Archive page: retired component, kept because the library never deletes (ADR-026 amendment). Not bound.',
  Deprecated: 'On the Deprecated page: kept for existing instances only. Not bound.',
};

export function buildVerification(read, { readAt }) {
  const components = read.componentsWithUnstyledText.map((c) => ({
    ...c,
    reason: REASONS[c.page] ?? null,
  }));
  const live = components.filter((c) => !c.reason).reduce((s, c) => s + c.unstyled, 0);
  return {
    fileKey: FILE_KEY,
    readAt,
    source: 'one read-only use_figma pass (figma/MCP-LEDGER.md, 2026-11-02, hds#302)',
    totalTextLayers: read.totalTextLayers,
    textLayersWithoutStyle: read.textLayersWithoutStyle,
    liveTextLayersWithoutStyle: live,
    components,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [input] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const i = process.argv.indexOf('--date');
  const readAt = i > 0 ? process.argv[i + 1] : new Date().toISOString().slice(0, 10);
  const out = buildVerification(JSON.parse(readFileSync(input, 'utf8')), { readAt });
  const target = new URL('../figma/text-style-verification.json', import.meta.url);
  writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `wrote ${fileURLToPath(target)}: ${out.textLayersWithoutStyle} unstyled, ${out.liveTextLayersWithoutStyle} live`,
  );
}
