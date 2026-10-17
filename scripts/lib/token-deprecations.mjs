/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * One record per `$deprecated` token, shared by the build (which writes them to
 * scripts/eslint-plugin-hds/rules/deprecated-tokens.json), the
 * hds/no-deprecated-token lint rule.
 *
 * The `$deprecated` string stays the human source: "<why> — use <path>", and
 * optionally "removed in <semver>". The replacement is the first token path
 * after "use " that resolves to a live leaf; anything else ("one per tone")
 * leaves it null, so the lint quotes the note instead.
 *
 * Pure: no fs, no process.
 */
import { walkTokens } from './token-tree.mjs';

/** Version a deprecation leaves in when its note names none (ADR-014: the 1.0 cut). */
export const DEFAULT_REMOVE_IN = '1.0.0';

const USE_RE = /\buse\s+((?:primitive|semantic|role|component)(?:\.[\w-]+)+)/;
const REMOVED_RE = /\bremoved in\s+(\d+\.\d+\.\d+)/;

/** The version a `$deprecated` note says it leaves in, else DEFAULT_REMOVE_IN. */
export const removeInOf = (note) => REMOVED_RE.exec(String(note))?.[1] ?? DEFAULT_REMOVE_IN;

/** Token types that compile to several `<var>-<prop>` vars instead of one. */
const COMPOSITE_TYPES = new Set(['typography', 'motion', 'transition', 'elevation']);

const cssVarOf = (path) => `--${path.replaceAll('.', '-')}`;

/** The Tailwind key the preset emits for a token (tailwind.config.tokens.cjs), or null. */
export function tailwindKeyOf(path) {
  const p = path.split('.');
  if (p[0] === 'semantic' && p[1] === 'space') return p.slice(2).join('-');
  if (p[0] === 'semantic' && p[1] === 'radius' && p[2] === 'scale') return p.slice(2).join('-');
  if (p[0] === 'primitive' && p[1] === 'space') return p[2];
  return null;
}

/**
 * @param {object} tree a DTCG token tree (hirobius.tokens.json)
 * @returns {{ path: string, cssVar: string, composite: boolean, tailwind: string|null, replacement: string|null,
 *   replacementCssVar: string|null, replacementTailwind: string|null, removeIn: string, note: string }[]}
 */
export function collectDeprecations(tree) {
  const live = new Set();
  const deprecated = [];
  for (const t of walkTokens(tree)) {
    const path = t.path.join('.');
    if (t.deprecated) {
      deprecated.push({ path, note: String(t.deprecated), composite: COMPOSITE_TYPES.has(t.type) });
    } else live.add(path);
  }
  return deprecated.map(({ path, note, composite }) => {
    const named = USE_RE.exec(note)?.[1] ?? null;
    const replacement = named && live.has(named) ? named : null;
    return {
      path,
      cssVar: cssVarOf(path),
      composite,
      tailwind: tailwindKeyOf(path),
      replacement,
      replacementCssVar: replacement && cssVarOf(replacement),
      replacementTailwind: replacement && tailwindKeyOf(replacement),
      removeIn: removeInOf(note),
      note,
    };
  });
}
