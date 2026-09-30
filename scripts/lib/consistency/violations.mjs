/** @internal — pure helpers for scripts/eval-consistency.mjs (hds#343). */
/**
 * Design-system violation scanner for agent-built apps.
 *
 * Counts, per app, the things a consumer of HDS must never hand-write: raw
 * hex / colour-function values, raw px values, Tailwind utility classes, raw
 * HTML form controls and custom CSS. Comments are stripped first: in the
 * 2026-09-29 review run every regex hit was inside a comment.
 *
 * Pure: takes { relativePath: sourceText } and returns hit objects.
 */

const CODE_EXT = /\.(?:[cm]?[jt]sx?|html?)$/i;
const CSS_EXT = /\.(?:css|scss|sass|less)$/i;

/**
 * Blank out `//` and block comments, leaving string literals intact and every
 * newline in place so line numbers survive. Single/double-quoted strings end
 * at a newline (an apostrophe in JSX text must not swallow the rest of the
 * file); template literals may span lines.
 */
export function stripComments(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') out += '\n';
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += c;
      i += 1;
      while (i < src.length) {
        const d = src[i];
        if (d === '\\') {
          out += d + (src[i + 1] ?? '');
          i += 2;
          continue;
        }
        if (d === '\n' && quote !== '`') break;
        out += d;
        i += 1;
        if (d === quote) break;
      }
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

const HEX_RE = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const COLOUR_FN_RE = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;
const PX_RE = /(?<![\w.#])\d*\.?\d+px\b/g;
const RAW_CONTROL_RE = /<(?:button|input|select|textarea)\b/g;
const STYLE_EL_RE = /<style\b/g;

const BARE_UTILITIES = [
  'flex',
  'grid',
  'block',
  'inline',
  'inline-block',
  'inline-flex',
  'inline-grid',
  'hidden',
  'contents',
  'table',
  'static',
  'fixed',
  'absolute',
  'relative',
  'sticky',
  'truncate',
  'underline',
  'uppercase',
  'lowercase',
  'capitalize',
  'italic',
  'sr-only',
  'container',
  'visible',
  'invisible',
  'grow',
  'shrink',
  'isolate',
  'antialiased',
  'border',
  'rounded',
  'shadow',
  'transition',
  'ring',
  'outline',
  'blur',
];
const UTILITY_PREFIXES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'ps',
  'pe',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'ms',
  'me',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'w',
  'h',
  'size',
  'min-w',
  'max-w',
  'min-h',
  'max-h',
  'text',
  'bg',
  'border',
  'border-t',
  'border-r',
  'border-b',
  'border-l',
  'border-x',
  'border-y',
  'rounded',
  'rounded-t',
  'rounded-b',
  'rounded-l',
  'rounded-r',
  'shadow',
  'font',
  'leading',
  'tracking',
  'items',
  'justify',
  'self',
  'place-items',
  'place-content',
  'content',
  'col',
  'row',
  'overflow',
  'overflow-x',
  'overflow-y',
  'opacity',
  'z',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-x',
  'inset-y',
  'flex',
  'grid',
  'grid-cols',
  'grid-rows',
  'cursor',
  'transition',
  'duration',
  'ease',
  'ring',
  'outline',
  'fill',
  'stroke',
  'object',
  'aspect',
  'order',
  'basis',
  'whitespace',
  'break',
  'list',
  'divide',
  'from',
  'to',
  'via',
  'translate-x',
  'translate-y',
  'scale',
  'rotate',
  'blur',
  'backdrop-blur',
  'pointer-events',
  'select',
  'resize',
  'animate',
];
const TAILWIND_RE = new RegExp(
  `^(?:[a-z0-9-]+:)*!?-?(?:${BARE_UTILITIES.join('|')}|(?:${UTILITY_PREFIXES.join('|')})-[\\w./[\\]%#:()-]+)$`,
);

/** String-literal bodies inside a JS expression (balanced braces already cut). */
function stringLiterals(expr) {
  const out = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(expr))) out.push({ text: m[1] ?? m[2] ?? m[3], offset: m.index + 1 });
  return out;
}

/** Yields { text, offset } for every class-name string in `class=` / `className=`. */
function classStrings(src) {
  const out = [];
  const re = /\bclass(?:Name)?\s*=\s*/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    const c = src[i];
    if (c === '"' || c === "'") {
      const end = src.indexOf(c, i + 1);
      if (end > -1) out.push({ text: src.slice(i + 1, end), offset: i + 1 });
    } else if (c === '{') {
      let depth = 0;
      let j = i;
      for (; j < src.length; j += 1) {
        if (src[j] === '{') depth += 1;
        else if (src[j] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      for (const s of stringLiterals(src.slice(i, j))) {
        out.push({ text: s.text, offset: i + s.offset });
      }
    }
  }
  return out;
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

function collect(src, file, kind, re, hits) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(src))) {
    hits.push({ kind, file, line: lineOf(src, m.index), match: m[0], index: m.index });
  }
}

/**
 * @param {Record<string,string>} files relative path -> source text for one app
 * @returns {{kind:string,file:string,line:number,match:string}[]}
 */
export function scanApp(files) {
  const all = [];
  for (const file of Object.keys(files).sort()) {
    if (CSS_EXT.test(file)) {
      all.push({ kind: 'custom-css', file, line: 1, match: file, index: 0 });
      continue;
    }
    if (!CODE_EXT.test(file)) continue;
    const src = stripComments(files[file]);
    const hits = [];
    collect(src, file, 'hex', HEX_RE, hits);
    collect(src, file, 'colour-fn', COLOUR_FN_RE, hits);
    collect(src, file, 'px', PX_RE, hits);
    collect(src, file, 'raw-control', RAW_CONTROL_RE, hits);
    const style = [];
    collect(src, file, 'custom-css', STYLE_EL_RE, style);
    if (style[0]) hits.push(style[0]);
    for (const { text, offset } of classStrings(src)) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(text))) {
        if (!TAILWIND_RE.test(m[0])) continue;
        const index = offset + m.index;
        hits.push({ kind: 'tailwind', file, line: lineOf(src, index), match: m[0], index });
      }
    }
    hits.sort((a, b) => a.index - b.index);
    all.push(...hits);
  }
  return all.map(({ kind, file, line, match }) => ({ kind, file, line, match }));
}
