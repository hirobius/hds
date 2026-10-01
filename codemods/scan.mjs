/**
 * A small JS/TS/JSX scanner for the codemods in this directory (hds#389 R1a
 * review). It tells code from text: which identifiers are code, and where the
 * string literals, template text, comments, regex literals, JSX text and JSX
 * attribute names are. The codemods ship as package bins and run under `npx`,
 * so this has no dependencies; it is a scanner, not a parser.
 *
 * `<` starts JSX only where an expression can start (after `=`, `(`, `return`,
 * `=>` and the like). When a JSX guess does not close cleanly (a TypeScript
 * `<T>` assertion or `<T,>` generic), the scan backs up and reads the `<` as an
 * operator. When the file still does not scan (an unterminated string, a stray
 * `}`), `ok` is false and a caller must not rely on `isCode`.
 */

const ID_START = /[A-Za-z_$\u0080-￿]/;
const ID_PART = /[\w$\u0080-￿]/;
// After these words an expression starts, so `/` is a regex and `<` is JSX.
const EXPR_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
  'default',
]);

class ScanError extends Error {}

/**
 * @param {string} src
 * @returns {{ ok: boolean, isCode: (at: number) => boolean,
 *   strings: { start: number, end: number, value: string }[] }}
 *   `isCode(at)`: the identifier starting at `at` is code (a JSX tag name
 *   counts; a JSX attribute name does not). `strings`: every quoted string and
 *   every template literal without `${}`, `start` at the opening quote and
 *   `end` after the closing one.
 */
export function scanSource(src) {
  const n = src.length;
  const code = new Uint8Array(n);
  const strings = [];
  // `<` positions already read as JSX and failed: a retry would fail the same way.
  const notJsx = new Set();
  let i = 0;
  // Kind of the last significant token: 'start' | 'punct' | 'word' | 'operand'
  let prev = 'start';
  let prevWord = '';

  const fail = (why) => {
    throw new ScanError(`${why} at ${i}`);
  };
  const exprStart = () =>
    prev === 'start' || prev === 'punct' || (prev === 'word' && EXPR_KEYWORDS.has(prevWord));

  function identifier(mark) {
    const start = i;
    while (i < n && ID_PART.test(src[i])) i++;
    if (mark) code.fill(1, start, i);
    return src.slice(start, i);
  }

  function skipComment() {
    if (src[i] !== '/') return false;
    if (src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      return true;
    }
    if (src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end < 0) fail('unterminated comment');
      i = end + 2;
      return true;
    }
    return false;
  }

  function skipSpaceAndComments() {
    for (;;) {
      while (i < n && /\s/.test(src[i])) i++;
      if (!skipComment()) return;
    }
  }

  function quoted(jsx) {
    const quote = src[i];
    const start = i++;
    while (i < n && src[i] !== quote) {
      if (src[i] === '\\' && !jsx) i++;
      else if (src[i] === '\n' && !jsx) fail('newline in string');
      i++;
    }
    if (i >= n) fail('unterminated string');
    i++;
    strings.push({ start, end: i, value: src.slice(start + 1, i - 1) });
  }

  function template() {
    const start = i++;
    let plain = true;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') i += 2;
      else if (src[i] === '$' && src[i + 1] === '{') {
        plain = false;
        i += 2;
        codeUntilBrace();
      } else i++;
    }
    if (i >= n) fail('unterminated template');
    i++;
    if (plain) strings.push({ start, end: i, value: src.slice(start + 1, i - 1) });
  }

  /** A regex literal at `/`; false (nothing consumed) when it cannot be one. */
  function regex() {
    let j = i + 1;
    let inClass = false;
    while (j < n && src[j] !== '\n') {
      const c = src[j];
      if (c === '\\') j++;
      else if (inClass) inClass = c !== ']';
      else if (c === '[') inClass = true;
      else if (c === '/') {
        j++;
        while (j < n && /[a-z]/i.test(src[j])) j++;
        i = j;
        return true;
      }
      j++;
    }
    return false;
  }

  function jsxName(mark) {
    let name = '';
    for (;;) {
      if (!ID_START.test(src[i] ?? '')) fail('bad JSX name');
      name += identifier(mark);
      // `my-element`, `svg:rect`, `Ns.Member`
      while (src[i] === '-') name += src[i++] + identifier(false);
      if (src[i] !== '.' && src[i] !== ':') return name;
      name += src[i++];
    }
  }

  /** A JSX element or fragment at `<`. */
  function jsxElement() {
    i++;
    skipSpaceAndComments();
    if (src[i] === '>') {
      i++;
      jsxChildren('');
      return;
    }
    const name = jsxName(true);
    for (;;) {
      skipSpaceAndComments();
      const c = src[i];
      if (c === '/' && src[i + 1] === '>') {
        i += 2;
        return;
      }
      if (c === '>') {
        i++;
        jsxChildren(name);
        return;
      }
      if (c === '{') {
        i++;
        codeUntilBrace();
        continue;
      }
      if (!ID_START.test(c ?? '')) fail('bad JSX attribute');
      jsxName(false);
      skipSpaceAndComments();
      if (src[i] !== '=') continue;
      i++;
      skipSpaceAndComments();
      if (src[i] === '"' || src[i] === "'") quoted(true);
      else if (src[i] === '{') {
        i++;
        codeUntilBrace();
      } else if (src[i] === '<') jsxElement();
      else fail('bad JSX attribute value');
    }
  }

  function jsxChildren(name) {
    while (i < n) {
      const c = src[i];
      if (c === '{') {
        i++;
        codeUntilBrace();
      } else if (c === '<' && src[i + 1] === '/') {
        i += 2;
        skipSpaceAndComments();
        const close = src[i] === '>' ? '' : jsxName(true);
        skipSpaceAndComments();
        if (close !== name || src[i] !== '>') fail('mismatched JSX close');
        i++;
        return;
      } else if (c === '<') jsxElement();
      else i++;
    }
    fail('unterminated JSX');
  }

  /** Code up to the `}` that closes an already-consumed `{` (template, JSX). */
  function codeUntilBrace() {
    const outer = [prev, prevWord];
    prev = 'start';
    codeBody(true);
    [prev, prevWord] = outer;
  }

  function codeBody(untilBrace) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (/\s/.test(c)) {
        i++;
      } else if (skipComment()) {
        // comment skipped
      } else if (c === '"' || c === "'") {
        quoted(false);
        prev = 'operand';
      } else if (c === '`') {
        template();
        prev = 'operand';
      } else if (ID_START.test(c)) {
        prevWord = identifier(true);
        prev = 'word';
      } else if (/[0-9]/.test(c)) {
        while (i < n && /[\w.]/.test(src[i])) i++;
        prev = 'operand';
      } else if (c === '/' && exprStart() && regex()) {
        prev = 'operand';
      } else if (
        c === '<' &&
        exprStart() &&
        !notJsx.has(i) &&
        /[A-Za-z_$>]/.test(src[i + 1] ?? '')
      ) {
        const at = i;
        const kept = strings.length;
        try {
          jsxElement();
          prev = 'operand';
        } catch (e) {
          if (!(e instanceof ScanError)) throw e;
          // Not JSX after all (a `<T>` assertion or `<T,>` generic): read `<` as an operator.
          notJsx.add(at);
          code.fill(0, at);
          strings.length = kept;
          i = at + 1;
          prev = 'punct';
        }
      } else if (c === '{') {
        depth++;
        i++;
        prev = 'punct';
      } else if (c === '}') {
        if (depth === 0) {
          if (!untilBrace) fail('unbalanced }');
          i++;
          return;
        }
        depth--;
        i++;
        // A block end starts a statement; an object literal end rarely precedes `/` or `<`.
        prev = 'punct';
      } else if (c === ')' || c === ']') {
        i++;
        prev = 'operand';
      } else {
        i++;
        prev = 'punct';
      }
    }
    if (untilBrace) fail('unterminated {');
  }

  let ok = true;
  try {
    if (src.startsWith('#!')) while (i < n && src[i] !== '\n') i++;
    codeBody(false);
  } catch (e) {
    if (!(e instanceof ScanError)) throw e;
    ok = false;
  }
  return { ok, isCode: (at) => ok && code[at] === 1, strings: ok ? strings : [] };
}
