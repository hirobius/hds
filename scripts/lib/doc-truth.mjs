/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Doc truth (Fable eval #1): the generated rule documents (DESIGN.md, llms*.txt)
 * must never recommend an API that `deprecations.json` marks deprecated. The
 * generators read the same file, so a deprecation in code reaches the docs on the
 * next `pnpm tokens` instead of being taught for weeks.
 *
 * A line may still NAME a deprecated API when it says so: a line that contains
 * "deprecated", "was `X`", "replaces" or "Not:" is a migration note, not a
 * recommendation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Deprecated names from a parsed deprecations.json: exports and Text variants. */
export function deprecatedNames(deprecations) {
  const exportsSet = new Set(
    (deprecations?.exports ?? [])
      .filter((e) => e.kind === 'export' && !e.typeOnly && /^[A-Z][A-Za-z]+$/.test(e.name))
      .map((e) => e.name),
  );
  const textVariants = new Set(
    (deprecations?.propValues ?? []).filter((p) => p.owner === 'TextVariant').map((p) => p.name),
  );
  return { exports: exportsSet, textVariants };
}

/** A root without deprecations.json (a test fixture) has nothing deprecated. */
export function loadDeprecatedNames(root) {
  const path = join(root, 'deprecations.json');
  if (!existsSync(path)) return deprecatedNames({});
  return deprecatedNames(JSON.parse(readFileSync(path, 'utf8')));
}

const MIGRATION_NOTE = /deprecated|\bwas `|\breplaces\b|no replacement|removed in/i;
/** A heading over a migration table (removed or moved exports, upgrade steps). */
const MIGRATION_HEADING = /removed|renamed|moved|migrat|upgrad|deprecat|changelog/i;

/**
 * Every line of `text` that recommends a deprecated API, as `{ line, name }`.
 * Inside each backticked span, a `Name` or `Compound.Part` (folded to `CompoundPart`)
 * counts when it is a deprecated export, and a whole-span Text variant counts when it
 * is a deprecated one. Text after "Not:" (the avoid list), a migration note line and
 * a section under a migration heading are skipped.
 */
export function findDeprecatedRecommendations(text, names) {
  const hits = [];
  let inMigration = false;
  text.split('\n').forEach((line, i) => {
    const heading = line.match(/^#{1,6}\s+(.*)/);
    if (heading) inMigration = MIGRATION_HEADING.test(heading[1]);
    if (inMigration || MIGRATION_NOTE.test(line)) return;
    const scanned = line.split(/\bNot:/)[0];
    for (const m of scanned.matchAll(/`([^`]+)`/g)) {
      const span = m[1];
      const seen = new Set();
      if (names.textVariants.has(span.trim())) seen.add(span.trim());
      for (const id of span.matchAll(/\b([A-Z][A-Za-z]*(?:\.[A-Z][A-Za-z]*)?)\b/g)) {
        const token = id[1];
        if (names.exports.has(token) || names.exports.has(token.replace(/\./g, '')))
          seen.add(token);
      }
      for (const name of seen) hits.push({ line: i + 1, name, text: line.trim().slice(0, 160) });
    }
  });
  return hits;
}

/** Throws with each hit when `text` (from `label`) recommends a deprecated API. */
export function assertNoDeprecatedRecommendations(text, names, label) {
  const hits = findDeprecatedRecommendations(text, names);
  if (hits.length) {
    const list = hits.map((h) => `  ${label}:${h.line} \`${h.name}\` — ${h.text}`).join('\n');
    throw new Error(
      `${label} recommends ${hits.length} deprecated API(s) (deprecations.json):\n${list}\n` +
        'Fix the source (DESIGN.source.md, mcp/guide.mjs, scripts/lib/*.mjs), not the generated file.',
    );
  }
}
