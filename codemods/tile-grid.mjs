#!/usr/bin/env node
/**
 * tile-grid codemod (hds#395, hds#389's 2026-10-01 decision update)
 *
 * 0.20.0 removed TileGrid from the package root. Grid renders its recipe since
 * hds#393: `layout="auto-fill"` with `minItemWidth`, and the fixed 12px
 * `medium` gap step. TileGrid defaulted to 260px tiles on a 12px gap; Grid
 * defaults to 280px and 32px, so the rewrite always writes both:
 *
 *   <TileGrid minTileWidth="280px">            <Grid layout="auto-fill" minItemWidth="280px" gap="medium">
 *   <TileGrid minTileWidth="260px" gap="sm">   <Grid layout="auto-fill" minItemWidth="260px" gap="medium">
 *   <TileGrid>                                 <Grid layout="auto-fill" minItemWidth="260px" gap="medium">
 *
 * The rendered tracks and gap are the same under every tenant and density
 * (scripts/__tests__/grid-tile-grid-parity.test.mjs). An expression width keeps
 * TileGrid's fallback where it can be undefined: `minTileWidth={w}` becomes
 * `minItemWidth={w ?? '260px'}`. One that never is (a string or template
 * literal, a conditional whose branches all are) is written through as it is,
 * since TypeScript rejects `??` on it (TS2869). The codemod reads that the way
 * TypeScript does, from the syntax.
 * Every other attribute, comment and line break stays, and the import names Grid
 * (an alias stays the file's name; a file that binds Grid to something else keeps
 * `Grid as TileGrid`; a file that already imports Grid reuses it).
 *
 * Left for a manual edit (codemods/jsx-fold.mjs): `gap="xs"` and `gap="md"`,
 * which were fixed 8px and 16px where Grid's nearest steps (`tight`, `normal`)
 * tighten under compact density; a gap or a spread the codemod cannot read; a
 * width that is always undefined, or one it does not read (an operator other
 * than a conditional or a logical one, a cast, an arrow); a self-closing tag
 * (Grid needs children); any use that is not a JSX tag; and `TileGridProps`.
 * Running it twice changes nothing.
 *
 *   node codemods/tile-grid.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 while a rewrite is needed or a site needs
 *                 a manual edit (a namespace or dynamic import that reads the
 *                 name, or a file that cannot be read to its end, included)
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { ROOT_PKG, foldComponent, insertionPoint, isEntry, main, runFold } from './jsx-fold.mjs';
import { maskSource } from './unrewritable.mjs';

/** TileGrid's default width, which Grid does not share. */
const TILE_WIDTH = '260px';

/** TileGrid's fixed gaps Grid has no fixed step for, and Grid's nearest density-aware one. */
const NO_STEP = {
  xs: '8px, and gap="tight" is 8px but 6px under compact density',
  md: '16px, and gap="normal" is 16px but 12px under compact density',
};

// TypeScript's syntactic nullishness of an expression (checker.ts
// getSyntacticNullishnessSemantics), which decides TS2869 and TS2871 on `x ?? y`.
const ALWAYS = 1;
const NEVER = 2;
const SOMETIMES = ALWAYS | NEVER;

const OPEN = '([{';
const CLOSE = ')]}';

/** The bracket that closes the one at `at` in masked code, or -1. */
function closing(m, at) {
  let depth = 0;
  for (let i = at; i < m.length; i++) {
    if (OPEN.includes(m[i])) depth++;
    else if (CLOSE.includes(m[i]) && --depth === 0) return i;
  }
  return -1;
}

/** The backtick that closes the template whose opening backtick is at `at`, or -1. */
function templateEnd(m, at) {
  let depth = 0;
  for (let i = at + 1; i < m.length; i++) {
    if (m[i] === '{') depth++;
    else if (m[i] === '}') depth--;
    else if (m[i] === '`' && depth === 0) return i;
  }
  return -1;
}

/**
 * The operators of masked code outside brackets that decide its shape: `,`,
 * `=>`, an assignment, the conditional's `?` and `:`, `??`, `||`, `&&`, and the
 * `as` and `satisfies` keywords.
 */
function topLevel(m) {
  const ops = [];
  let depth = 0;
  for (let i = 0; i < m.length; i++) {
    const ch = m[i];
    if (OPEN.includes(ch)) depth++;
    else if (CLOSE.includes(ch)) depth--;
    else if (depth > 0) continue;
    else if (ch === ',') ops.push({ at: i, op: ',' });
    else if (ch === '=') {
      if (m[i + 1] === '>') ops.push({ at: i++, op: '=>' });
      else if (m[i + 1] === '=') while (m[i + 1] === '=') i++;
      else if (
        m[i - 1] === '!' ||
        ((m[i - 1] === '<' || m[i - 1] === '>') && m[i - 2] !== m[i - 1])
      )
        continue;
      else ops.push({ at: i, op: '=' });
    } else if (ch === '?') {
      if (m[i + 1] === '?') {
        ops.push({ at: i, op: m[i + 2] === '=' ? '=' : '??' });
        i += m[i + 2] === '=' ? 2 : 1;
      } else if (m[i + 1] === '.' && !/\d/.test(m[i + 2] ?? '')) i++;
      else ops.push({ at: i, op: '?' });
    } else if (ch === ':') ops.push({ at: i, op: ':' });
    else if ((ch === '|' || ch === '&') && m[i + 1] === ch) {
      ops.push({ at: i, op: m[i + 2] === '=' ? '=' : '||' });
      i += m[i + 2] === '=' ? 2 : 1;
    } else if (/[\w$]/.test(ch) && !/[\w$.]/.test(m[i - 1] ?? '')) {
      const word = /^[\w$]+/.exec(m.slice(i))[0];
      if (word === 'as' || word === 'satisfies') ops.push({ at: i, op: 'as' });
      i += word.length - 1;
    }
  }
  return ops;
}

/**
 * TypeScript's nullishness of a name, a member access, a call, an element
 * access or a tagged template (each optional), with any `!`; null for anything
 * else. `chain`: it binds tighter than `??`, so it takes no parentheses.
 */
function chainNullishness(m) {
  const id = /^[A-Za-z_$][\w$]*/.exec(m);
  const group = m[0] === '(' ? closing(m, 0) : -1;
  if (!id && group < 0) return null;
  const base = id ? id[0] : m.slice(1, group);
  let i = id ? base.length : group + 1;
  let access = false;
  while (i < m.length) {
    const [step, optional] = /^\s*(\?\.)?\s*/.exec(m.slice(i));
    const at = i + step.length;
    const rest = m.slice(at);
    const prop = (optional ? /^[A-Za-z_$][\w$]*/ : /^\.\s*[A-Za-z_$][\w$]*/).exec(rest);
    if (prop) i = at + prop[0].length;
    else if (rest[0] === '[' || rest[0] === '(') i = closing(m, at) + 1;
    else if (rest[0] === '`' && !optional) i = templateEnd(m, at) + 1;
    else if (rest[0] === '!' && rest[1] !== '=' && !optional) {
      i = at + 1;
      continue;
    } else return null;
    if (i === 0) return null; // closing() or templateEnd() found no end
    access = true;
  }
  if (access) return { nullish: SOMETIMES, chain: true };
  if (!id) {
    const inner = nullishness(base);
    return inner && { nullish: inner.nullish, chain: true };
  }
  if (base === 'undefined' || base === 'null') return { nullish: ALWAYS, chain: true };
  if (base === 'true' || base === 'false') return { nullish: NEVER, chain: true };
  if (/^(?:typeof|void|delete|await|new|yield|function|class)$/.test(base)) return null;
  return { nullish: SOMETIMES, chain: true };
}

/**
 * Whether an expression (masked code: strings, templates and comments blanked)
 * can be null or undefined, the way TypeScript reads it from the syntax:
 * ALWAYS, NEVER or SOMETIMES, or null where the codemod does not read it (an
 * assignment, an arrow, a comma, a cast, an operator other than a conditional
 * or a logical one). `chain`: it needs no parentheses in front of `??`.
 * @param {string} code
 * @returns {{ nullish: number, chain: boolean } | null}
 */
function nullishness(code) {
  let m = code.trim();
  while (m[0] === '(' && closing(m, 0) === m.length - 1) m = m.slice(1, -1).trim();
  if (m === '') return null;
  const ops = topLevel(m);
  if (ops.some((o) => o.op === ',' || o.op === '=>' || o.op === '=')) return null;
  const q = ops.findIndex((o) => o.op === '?');
  if (q >= 0) {
    // The conditional's own `:`, past any nested conditional in its true branch.
    let colon = -1;
    for (let k = q + 1, open = 0; k < ops.length && colon < 0; k++)
      if (ops[k].op === '?') open++;
      else if (ops[k].op === ':' && open-- === 0) colon = ops[k].at;
    if (colon < 0 || ops[q].at === 0) return null;
    const yes = nullishness(m.slice(ops[q].at + 1, colon));
    const no = nullishness(m.slice(colon + 1));
    return yes && no && { nullish: yes.nullish | no.nullish, chain: false };
  }
  if (ops.some((o) => o.op === 'as' || o.op === ':')) return null;
  const coalesce = ops.filter((o) => o.op === '??').pop();
  if (coalesce) {
    const right = nullishness(m.slice(coalesce.at + 2));
    return right && { nullish: right.nullish, chain: false };
  }
  if (ops.some((o) => o.op === '||')) return { nullish: SOMETIMES, chain: false };
  if (/^(['"])\s*\1$/.test(m)) return { nullish: NEVER, chain: true };
  if (m[0] === '`' && templateEnd(m, 0) === m.length - 1) return { nullish: NEVER, chain: true };
  return chainNullishness(m);
}

/** @type {import('./jsx-fold.mjs').FoldRule} */
export const RULE = Object.freeze({
  name: 'TileGrid',
  survivor: 'Grid',
  survivorFrom: ROOT_PKG,
  types: { TileGridProps: "GridProps: minTileWidth is minItemWidth, gap 'sm' is 'medium'" },
  rewrite(tag, source) {
    if (tag.selfClosing && !tag.attrs.some((a) => a.name === 'children'))
      return { manual: 'Grid needs children; rewrite it by hand' };
    if (tag.attrs.some((a) => a.kind === 'spread'))
      return { manual: 'a spread can carry minTileWidth or gap; rewrite it by hand' };
    const gap = tag.attrs.find((a) => a.name === 'gap');
    if (gap && !(gap.kind === 'string' && gap.value === 'sm')) {
      const text = source.slice(gap.start, gap.end);
      const why = gap.kind === 'string' && NO_STEP[gap.value];
      return {
        manual: why
          ? `${text}: TileGrid's gap was a fixed ${why}; rewrite it by hand`
          : `${text}: the codemod cannot read the gap; rewrite it by hand`,
      };
    }
    const width = tag.attrs.find((a) => a.name === 'minTileWidth');
    if (width && width.kind === 'bare')
      return { manual: 'minTileWidth has no value; rewrite it by hand' };
    const edits = [];
    if (gap) edits.push({ start: gap.valueStart + 1, end: gap.valueEnd - 1, text: 'medium' });
    if (width) {
      const { sep } = insertionPoint(source, tag, width);
      edits.push(
        { start: width.start, end: width.start, text: `layout="auto-fill"${sep}` },
        { start: width.start, end: width.start + 'minTileWidth'.length, text: 'minItemWidth' },
      );
      if (width.kind === 'expr') {
        const { code, unterminated } = maskSource(width.value);
        const kind = unterminated ? null : nullishness(code);
        const text = source.slice(width.start, width.end);
        if (!kind)
          return {
            manual: `the codemod cannot tell whether ${text} can be undefined, where TileGrid drew ${TILE_WIDTH} tiles and Grid draws 280px; rewrite it by hand`,
          };
        if (kind.nullish === ALWAYS)
          return {
            manual: `${text} is always null or undefined, which drew TileGrid's ${TILE_WIDTH} tiles; write minItemWidth="${TILE_WIDTH}" by hand`,
          };
        if (kind.nullish === SOMETIMES) {
          // In masked code a comment is blank, so the expression's own text starts
          // and ends at its first and last non-blank character.
          const first = width.valueStart + 1 + code.search(/\S/);
          const last = width.valueStart + 1 + code.trimEnd().length;
          const fallback = ` ?? '${TILE_WIDTH}'`;
          if (kind.chain) edits.push({ start: last, end: last, text: fallback });
          else
            edits.push(
              { start: first, end: first, text: '(' },
              { start: last, end: last, text: `)${fallback}` },
            );
        }
      }
      if (!gap) edits.push({ start: width.end, end: width.end, text: `${sep}gap="medium"` });
    } else {
      const { at, sep } = insertionPoint(source, tag, null);
      const attrs = ['layout="auto-fill"', `minItemWidth="${TILE_WIDTH}"`];
      if (!gap) attrs.push('gap="medium"');
      edits.push({ start: at, end: at, text: attrs.map((a) => `${sep}${a}`).join('') });
    }
    return { edits };
  },
});

/** Pure transform of one file's source (codemods/jsx-fold.mjs `foldComponent`). */
export function transformSource(source) {
  return foldComponent(source, RULE);
}

/** Scan a directory. Writes only when `write` is true. */
export function runCodemod({ root, write = false }) {
  return runFold({ root, write, rule: RULE });
}

if (isEntry(import.meta.url)) {
  process.exit(main(process.argv.slice(2), { bin: 'hds-tile-grid', rule: RULE }));
}
