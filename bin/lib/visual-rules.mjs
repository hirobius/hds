/**
 * visual-rules.mjs — the one rule core behind `hds-check` (hds#664) and the
 * internal scripts/check-no-uppercase.mjs gate, so the two cannot drift.
 *
 * Ships in the package (`bin/`), so it imports nothing outside node: and the
 * hirobius.tokens.json next to it. Every rule reads one file's text and returns
 * violations as { file, line, col, rule, message, sample } (line 1-based, col
 * 0-based). Rules:
 *
 *   no-uppercase  nothing transforms text to ALL CAPS or small caps
 *   fonts         font-family / font only names HDS faces and their fallbacks
 *   shadows       box-shadow only through var(--semantic-shadow-*) or --shadow
 *   raw-colors    no hex, rgb() or hsl() outside a var(--x, fallback)
 *
 * Each rule has a `// <marker>: <reason>` exemption (also inside a CSS or HTML
 * comment): uppercase-ok (on the line or the two above), font-ok, shadow-ok and
 * color-ok (on the line or the one above). The reason is required.
 *
 * Known limits: a value is read on its own line, so one split across lines is
 * not checked; a `${…}` interpolation, a class built at runtime and a named
 * color (`red`) are not followed.
 */
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

export const RULES = ['no-uppercase', 'fonts', 'shadows', 'raw-colors'];

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
// A `//` comment may also follow punctuation here (`{ // note`, `f(// note`).
const COMMENT_LEADS = ' \t;,{(';

/**
 * Blank comments, keeping every newline, so prose never reads as code and a
 * match's line number is unchanged. A `//` only opens a comment at the start of
 * a line or after one of `leadChars`, so `http://` survives.
 *
 * @param {string} text
 * @param {{leadChars?: string}} [options]  characters that may precede a `//`
 *   comment (default space and tab)
 */
export function maskComments(text, { leadChars = ' \t' } = {}) {
  const lead = leadChars.replace(/[\]\\^-]/g, '\\$&');
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(
      new RegExp(`(^|[${lead}])\\/\\/[^\\n]*`, 'gm'),
      (m, l) => l + ' '.repeat(m.length - l.length),
    );
}

const blank = (m) => m.replace(/[^\n]/g, ' ');

/** The file's lines with comments blanked: code comments, or <!-- --> in HTML. */
function maskedLines(text, file) {
  if (CODE_EXTENSIONS.has(extname(file)))
    return maskComments(text, { leadChars: COMMENT_LEADS }).split('\n');
  if (file.endsWith('.html')) return text.replace(/<!--[\s\S]*?-->/g, blank).split('\n');
  return text.split('\n');
}

/** 'ok' when `marker: <reason>` sits on line i or `lookback` lines above, 'bare' without a reason. */
function markerAt(lines, i, marker, lookback) {
  const needle = `${marker}:`;
  for (let j = i; j >= Math.max(0, i - lookback); j--) {
    const at = (lines[j] ?? '').indexOf(needle);
    if (at !== -1) return /[A-Za-z]{3}/.test(lines[j].slice(at + needle.length)) ? 'ok' : 'bare';
  }
  return null;
}

// ── no-uppercase ──────────────────────────────────────────────────────────────

/** [regex, message] pairs applied to every line. */
const UPPERCASE_PATTERNS = [
  [
    /(?<![\w-])text-transform\s*:\s*uppercase\b/gi,
    'text-transform: uppercase (CSS or a Tailwind arbitrary property)',
  ],
  [/@apply\b[^;}\n]*(?<![\w-])uppercase(?![\w-])/g, '@apply uppercase'],
  [
    /(?<![\w-])(?:font-variant(?:-caps)?|fontVariant(?:Caps)?)\s*:\s*['"`]?(?:all-)?(?:small|petite)-caps\b/g,
    'small caps (font-variant)',
  ],
  [/(?<![\w-])titling-caps\b/g, 'titling caps (font-variant)'],
  [/['"]?\btextTransform['"]?\s*:\s*['"`]uppercase['"`]/g, 'textTransform: uppercase'],
  [
    /['"]?\btextCase['"]?\s*:\s*['"`](?:UPPER|SMALL_CAPS|SMALL_CAPS_FORCED)['"`]/g,
    'textCase: UPPER (all caps in the Figma model)',
  ],
  [
    /(?<!charAt\(0\))(?<!\[0\])\.(?:toUpperCase|toLocaleUpperCase)\s*\(/g,
    '.toUpperCase() for display (only a first-letter capital, charAt(0) or [0], is sentence case)',
  ],
];

// A string literal, single line, no nested quote of its own kind.
const STRING_LITERAL = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g;
const CLASSY_TOKEN = /^[\w:/[\].()%#!&>*=,-]*[-:[\]/][\w:/[\].()%#!&>*=,-]*$/;

/** Tailwind `uppercase` inside a class-list string literal. */
function findClassUppercase(line) {
  const hits = [];
  for (const m of line.matchAll(STRING_LITERAL)) {
    const body = m[1] ?? m[2] ?? m[3] ?? '';
    const tokens = body.split(/\s+/).filter(Boolean);
    const at = tokens.findIndex((t) => /^(?:[\w-]+:)*!?uppercase$/.test(t));
    if (at === -1) continue;
    // `textTransform: 'uppercase'` is its own pattern, not a class list.
    if (/textTransform['"]?\s*:\s*$/.test(line.slice(0, m.index))) continue;
    const others = tokens.filter((_, i) => i !== at);
    if (others.length === 0 || others.some((t) => CLASSY_TOKEN.test(t))) {
      hits.push(m.index + m[0].indexOf('uppercase'));
    }
  }
  return hits;
}

/**
 * Places that make ALL CAPS text. The Tailwind class is recognised inside a
 * string literal that also holds another class-shaped token (`text-xs
 * uppercase`) or is exactly `uppercase`, so a sentence like "must be uppercase"
 * is not read as a class.
 * @param {string} text
 * @param {string} file path (extension decides comment masking)
 */
export function findUppercase(text, file) {
  const raw = text.split('\n');
  const isCode = CODE_EXTENSIONS.has(extname(file));
  const masked = (isCode ? maskComments(text, { leadChars: COMMENT_LEADS }) : text).split('\n');
  const out = [];

  masked.forEach((line, i) => {
    if (!line.trim()) return;
    const found = [];
    for (const [re, what] of UPPERCASE_PATTERNS) {
      if (re.source.includes('toUpperCase') && !isCode) continue;
      for (const m of line.matchAll(re)) found.push([m.index, what]);
    }
    if (isCode || file.endsWith('.html')) {
      for (const col of findClassUppercase(line)) found.push([col, 'Tailwind uppercase class']);
    }
    if (found.length === 0) return;
    const mk = markerAt(raw, i, 'uppercase-ok', 2);
    if (mk === 'ok') return;
    found.sort((a, b) => a[0] - b[0]);
    const seen = new Set();
    for (const [col, what] of found) {
      if (seen.has(col)) continue;
      seen.add(col);
      out.push({
        file,
        line: i + 1,
        col,
        rule: mk === 'bare' ? 'uppercase-ok-needs-reason' : 'no-uppercase',
        message:
          mk === 'bare'
            ? `${what}: the uppercase-ok marker needs a reason after the colon`
            : `${what}: the system never produces ALL CAPS, use sentence case`,
        sample: raw[i].trim().slice(0, 140),
      });
    }
  });
  return out;
}

// ── declaration values (fonts, shadows) ───────────────────────────────────────

/**
 * The value of a declaration that starts at `from`, read the way CSS, an HTML
 * style attribute and a JS style object all write it. A quote that opens an
 * item is part of the value; any other quote ends it (the attribute or string
 * closing), as do `;`, `}` and the line end. In a JS object (`fontFamily:
 * 'A, B'`) a value that is one whole string is that string's text.
 */
function declValue(line, from, camel) {
  const rest = line.slice(from);
  if (camel) {
    const q = rest.match(/^(['"`])([^'"`]*)\1/);
    if (q) return q[2];
  }
  let depth = 0;
  let i = 0;
  let itemStart = true;
  for (; i < rest.length; i++) {
    const c = rest[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && (c === ';' || c === '}' || c === '>')) break;
    else if (c === "'" || c === '"' || c === '`') {
      if (!itemStart) break;
      const close = rest.indexOf(c, i + 1);
      if (close === -1) break;
      i = close;
      itemStart = false;
      continue;
    }
    if (c === ',' && depth === 0) itemStart = true;
    else if (!/\s/.test(c)) itemStart = false;
  }
  return rest.slice(0, i).trim();
}

/** Split on commas that are not inside parentheses or quotes. */
function splitTopLevel(value) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === "'" || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out.filter(Boolean);
}

/** Run `check(value, name)` on every `prop: value` in the masked lines. */
function scanDeclarations(text, file, { props, rule, marker, check }) {
  const raw = text.split('\n');
  const masked = maskedLines(text, file);
  // `prop: value` in CSS, a style attribute or a JS object; `el.style.prop = value` in JS.
  const re = new RegExp(`(?<![\\w-])(['"]?)(${props.join('|')})\\1\\s*(?::|=(?!=))\\s*`, 'g');
  const out = [];
  masked.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      const name = m[2];
      const value = declValue(line, m.index + m[0].length, /[A-Z]/.test(name));
      // A `${…}` interpolation is checked where the code that fills it lives.
      const problem = value && !value.includes('${') && check(value, name);
      if (!problem || markerAt(raw, i, marker, 1) === 'ok') continue;
      out.push({
        file,
        line: i + 1,
        col: m.index,
        rule,
        message: problem,
        sample: raw[i].trim().slice(0, 140),
      });
    }
  });
  return out;
}

const CSS_WIDE = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none']);

// ── fonts ─────────────────────────────────────────────────────────────────────

/** Every family the HDS font tokens name (faces and fallbacks), lowercased. */
function hdsFamilies() {
  const tokens = JSON.parse(
    readFileSync(new URL('../../hirobius.tokens.json', import.meta.url), 'utf8'),
  );
  const families = Object.values(tokens.primitive.typography.family)
    .filter((t) => t && Array.isArray(t.$value))
    .flatMap((t) => t.$value);
  return new Set(families.map((f) => f.toLowerCase()));
}
let FAMILIES;

const FONT_SIZE =
  /(?:^|\s)(?:[\d.]+(?:px|rem|em|pt|%|vw|vh)|xx?-small|small|medium|large|xx?-large)(?:\/\S+)?\s+(.+)$/;

function checkFamilies(value, name) {
  if (CSS_WIDE.has(value) || /^var\(/.test(value)) return null;
  let list = value;
  if (name === 'font') {
    const m = value.match(FONT_SIZE);
    if (!m) return null; // `font: inherit`, a system font keyword or a var(): no family list
    list = m[1];
  }
  FAMILIES ??= hdsFamilies();
  const bad = splitTopLevel(list)
    .map((f) => f.replace(/^['"]|['"]$/g, '').trim())
    .filter(
      (f) => !/^var\(/.test(f) && !CSS_WIDE.has(f.toLowerCase()) && !FAMILIES.has(f.toLowerCase()),
    );
  if (bad.length === 0) return null;
  const serif = bad.some((f) => /^serif$/i.test(f));
  return `font ${bad.map((f) => `"${f}"`).join(', ')} is not an HDS face${serif ? ' (no serif faces)' : ''}: use var(--primitive-typography-family-primary | display | mono)`;
}

/** font-family / fontFamily / font shorthand naming anything but HDS faces and their fallbacks. */
export function findFonts(text, file) {
  return scanDeclarations(text, file, {
    props: ['font-family', 'fontFamily', 'font'],
    rule: 'fonts',
    marker: 'font-ok',
    check: checkFamilies,
  });
}

// ── shadows ───────────────────────────────────────────────────────────────────

const SHADOW_TOKEN = /^var\(\s*--(?:semantic-shadow-[\w-]+|shadow(?:-[\w-]+)?)\s*(?:,[^)]*)?\)$/;

function checkShadow(value) {
  if (CSS_WIDE.has(value)) return null;
  if (splitTopLevel(value).every((part) => SHADOW_TOKEN.test(part))) return null;
  return 'ad-hoc box-shadow: use var(--semantic-shadow-subtle | floating | overlay) (or the kit’s var(--shadow))';
}

/** box-shadow / boxShadow set to anything but HDS shadow tokens. */
export function findShadows(text, file) {
  return scanDeclarations(text, file, {
    props: ['box-shadow', '-webkit-box-shadow', 'boxShadow'],
    rule: 'shadows',
    marker: 'shadow-ok',
    check: checkShadow,
  });
}

// ── raw colors ────────────────────────────────────────────────────────────────

const HEX = /(?<![\w&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const COLOR_FN = /(?<![\w-])(?:rgba?|hsla?)\(/gi;
const URL_ATTR = /\b(?:href|src|action|xlink:href)\s*=\s*(["'])[^"'\n]*\1/g;
const URL_TEXT = /\b[a-z][\w+.-]*:\/\/[^\s'"`)]*/gi;

/** Blank every var(...) (its fallback is allowed to be raw) and URL attribute. */
function maskAllowed(line) {
  let out = line.replace(URL_ATTR, blank).replace(URL_TEXT, blank);
  for (let at = out.indexOf('var('); at !== -1; at = out.indexOf('var(', at + 1)) {
    let depth = 0;
    let end = at + 3;
    for (; end < out.length; end++) {
      if (out[end] === '(') depth++;
      else if (out[end] === ')' && --depth === 0) break;
    }
    out = out.slice(0, at) + ' '.repeat(end + 1 - at) + out.slice(end + 1);
  }
  return out;
}

/** Hex, rgb() and hsl() colors in a declaration value, outside var() fallbacks. */
export function findRawColors(text, file) {
  const raw = text.split('\n');
  const out = [];
  maskedLines(text, file).forEach((line, i) => {
    const scan = maskAllowed(line);
    for (const re of [HEX, COLOR_FN]) {
      for (const m of scan.matchAll(re)) {
        // Only a declaration value is a color: a `prop:` (or `.prop =`) precedes
        // it in the same declaration. That keeps `#id` selectors and `'#anchor'`
        // strings out.
        const before = scan.slice(0, m.index);
        if (!/:[^;{}]*$|\.\w+\s*=\s*['"`]?$/.test(before)) continue;
        if (markerAt(raw, i, 'color-ok', 1) === 'ok') continue;
        out.push({
          file,
          line: i + 1,
          col: m.index,
          rule: 'raw-colors',
          message: `raw color ${m[0].replace(/\($/, '()')}: use an HDS color token, var(--semantic-color-…, fallback)`,
          sample: raw[i].trim().slice(0, 140),
        });
      }
    }
  });
  return out;
}

// ── all rules ─────────────────────────────────────────────────────────────────

const FINDERS = {
  'no-uppercase': findUppercase,
  fonts: findFonts,
  shadows: findShadows,
  'raw-colors': findRawColors,
};

/**
 * Every violation in one file's text, sorted by line then column.
 * @param {string} text
 * @param {string} file
 * @param {{ rules?: string[] }} [options] defaults to every rule in RULES
 */
export function checkText(text, file, { rules = RULES } = {}) {
  return rules
    .flatMap((r) => FINDERS[r](text, file))
    .sort((a, b) => a.line - b.line || a.col - b.col);
}
