/**
 * What the codemods in this directory cannot rewrite (hds#389 R1a), shared by
 * hds-prefix.mjs and patterns-subpath.mjs. Both ship as package bins and run
 * under `npx`, so this has no dependencies.
 *
 * A codemod rewrites the named imports and re-exports of the package root. It
 * cannot see which names a file reads through:
 *   - `export * from '<pkg>'` or `export type * from '<pkg>'`: its importers are
 *     in other files, so it is always listed;
 *   - a namespace import (`import * as X from '<pkg>'`, `import type * as X`), or
 *     a call that loads the package by name (`import()`, `require()`, `vi.mock`,
 *     `jest.mock`, `jest.requireMock`, `jest.unstable_mockModule`,
 *     `requireActual`, `importActual` and the like, with type arguments such as
 *     `vi.importActual<T>(…)` and comments allowed before the specifier): listed
 *     only when the file reads a removed name off something, as a member
 *     (`m.Page`, `m?.Page`), a string key (`m['Page']`) or a destructuring
 *     pattern (`const { Page } =`, `({ Page: P }) =>`). A bare identifier (a
 *     local binding, a type, the alias a codemod wrote) is not a read, so a
 *     migrated file reaches `--check` exit 0.
 *
 * `maskSource` tells code from text in one linear pass with one regular
 * expression: no recursion and no JSX parsing, so the cost does not grow with
 * `<T>` casts or nesting. It is a tokenizer, not a parser, so JSX text can
 * mislead it (hds#434):
 *   - a lone quote, or `//` other than in a URL, blanks at most the rest of its
 *     line;
 *   - a lone backtick opens a template, and `/*` (as in `src/*.ts`) opens a
 *     block comment. Either one blanks everything up to the next backtick or
 *     comment close, which can be the end of the file.
 * A regex literal read as a division (a `/` after `)`, `]` or a name) can do
 * the same through a quote or backtick in its body. A `/` that starts a line
 * right after a comment is read as a regex, so a commented list of patterns
 * reads correctly. Valid code cannot end inside a block comment or template, so
 * when the masking does, `findUnrewritable` lists the file as unreadable
 * instead of passing it.
 */

const ID = String.raw`[A-Za-z_$][\w$]*`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The body and flags of a regex literal, after its opening `/`.
const REGEX_BODY = String.raw`[^/\\\n[]*(?:(?:\\.|\[[^\]\\\n]*(?:\\.[^\]\\\n]*)*\])[^/\\\n[]*)*\/[A-Za-z]*`;
// A regex literal: a `/` where an expression can start, so it does not divide.
// The lookbehind runs only at a `/`, which keeps the pass linear.
const REGEX_LITERAL =
  String.raw`\/(?![*/])(?<=(?:^|[(,=:[!&|?;{+\-*%~^>]|(?<![\w$])(?:return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await))\s*\/)` +
  REGEX_BODY;
// A `/` that starts a line, shaped like a regex literal. `maskSource` reads it as
// one only when a comment ends right before it (hds#434): the comment hides the
// token that decides, and a line that starts with a division is rare.
const LINE_START_REGEX = String.raw`(?<lineStart>\/(?![*/])(?<=(?:^|\n)[ \t]*\/)${REGEX_BODY})`;
const TOKEN = new RegExp(
  [
    // A line comment; `https://` in JSX text is not one.
    String.raw`\/\/(?<!(?<![\w$])(?:https?|wss?|ftp|file|git|ssh):\/\/)[^\n]*`,
    String.raw`\/\*[\s\S]*?(?:\*\/|$)`,
    String.raw`'[^'\\\n]*(?:\\[\s\S][^'\\\n]*)*'`,
    String.raw`"[^"\\\n]*(?:\\[\s\S][^"\\\n]*)*"`,
    '`',
    '[{}]',
    REGEX_LITERAL,
    LINE_START_REGEX,
  ].join('|'),
  'g',
);
const BOM = '\uFEFF';
// Template text up to the closing backtick or the next `${`.
const TEMPLATE_TEXT = /[^`\\$]*(?:(?:\\[\s\S]|\$(?!\{))[^`\\$]*)*/y;

/**
 * The source with every comment, the text of every string and template, and
 * every regex literal body blanked to spaces. Same length, newlines kept, so an
 * index into `code` is an index into `source`. Quotes and backticks stay, and so
 * does the code inside `${}`. A byte order mark at the start is blanked too.
 * @param {string} source
 * @returns {{ code: string, strings: { start: number, end: number, value: string }[],
 *   unterminated: { kind: 'comment' | 'template', at: number, line: number } | null }}
 *   `strings`: each quoted string and each template without `${}`, `start` at the
 *   opening quote and `end` after the closing one. `unterminated`: the block
 *   comment or template the source ends inside (the outermost one), which valid
 *   code cannot do, or null.
 */
export function maskSource(source) {
  const n = source.length;
  const blanks = source.startsWith(BOM) ? [[0, 1]] : [];
  const strings = [];
  const resume = []; // brace depth outside each open `${`
  const open = []; // where each template still open starts
  let depth = 0;
  let commentEnd = -1; // the end of the last token, while that token is a comment
  let openComment = -1; // a block comment the source ends inside
  let i = 0;

  /** Template text from `from`; returns where code resumes. */
  const templateText = (from) => {
    TEMPLATE_TEXT.lastIndex = from;
    TEMPLATE_TEXT.exec(source);
    const j = TEMPLATE_TEXT.lastIndex;
    blanks.push([from, j]);
    if (j >= n) return n;
    if (source[j] === '`') {
      const opened = open.pop();
      // A template with no `${}` is a plain string; one resumed after a `}` is not.
      if (opened === from - 1)
        strings.push({ start: opened, end: j + 1, value: source.slice(opened + 1, j) });
      return j + 1;
    }
    resume.push(depth);
    depth = 0;
    return j + 2;
  };

  while (i < n) {
    TOKEN.lastIndex = i;
    const m = TOKEN.exec(source);
    if (!m) break;
    const at = m.index;
    const t = m[0];
    if (m.groups.lineStart !== undefined) {
      // Only whitespace since a comment: the comment hid the token before the `/`.
      const afterComment = commentEnd >= 0 && /^\s*$/.test(source.slice(commentEnd, at));
      commentEnd = -1;
      if (!afterComment) {
        i = at + 1;
        continue;
      }
    }
    i = at + t.length;
    const c = t[0];
    commentEnd = c === '/' && (t[1] === '/' || t[1] === '*') ? i : -1;
    if (t === '{') depth++;
    else if (t === '}') {
      if (depth > 0) depth--;
      else if (resume.length > 0) {
        depth = resume.pop();
        i = templateText(i);
      }
    } else if (t === '`') {
      open.push(at);
      i = templateText(i);
    } else if (c === "'" || c === '"') {
      blanks.push([at + 1, i - 1]);
      strings.push({ start: at, end: i, value: t.slice(1, -1) });
    } else if (t[1] === '/') blanks.push([at, i]);
    else if (t[1] === '*') {
      blanks.push([at, i]);
      if (t.length < 4 || !t.endsWith('*/')) openComment = at;
    } else blanks.push([at + 1, i]);
  }

  let code = '';
  let last = 0;
  for (const [start, end] of blanks) {
    if (end <= start) continue;
    code += source.slice(last, start) + source.slice(start, end).replace(/[^\n]/g, ' ');
    last = end;
  }
  code += source.slice(last);

  let unterminated = null;
  const at = open.length > 0 ? open[0] : openComment;
  if (at >= 0)
    unterminated = {
      kind: open.length > 0 ? 'template' : 'comment',
      at,
      line: source.slice(0, at).split('\n').length,
    };
  return { code, strings, unterminated };
}

// Calls that load a module by name: `import()`, `require()` and the test-runner forms.
const LOADERS = [
  'import',
  'require',
  'requireActual',
  'importActual',
  'requireMock',
  'importMock',
  'mock',
  'doMock',
  'unstable_mockModule',
  'createMockFromModule',
];
const KEYWORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'void', 'yield', 'await']);

/**
 * The names in `names` that the code reads off something: `.Name`, `['Name']`,
 * or a key or shorthand in a destructuring pattern.
 */
function readNames(code, strings, names) {
  const read = new Set();
  for (const m of code.matchAll(new RegExp(String.raw`(?<!\.)\.\s*(${ID})`, 'g')))
    if (names.has(m[1])) read.add(m[1]);

  for (const s of strings) {
    if (!names.has(s.value)) continue;
    const before = /(\?\.|[)\]]|[\w$]+)\s*\[\s*$/.exec(
      code.slice(Math.max(0, s.start - 80), s.start),
    );
    if (before && !KEYWORDS.has(before[1]) && /^\s*\]/.test(code.slice(s.end, s.end + 80)))
      read.add(s.value);
  }

  const open = [];
  for (const m of code.matchAll(/[{}]/g)) {
    if (m[0] === '{') {
      open.push(m.index);
      continue;
    }
    const start = open.pop();
    if (start === undefined) continue;
    const end = m.index;
    const before = code.slice(Math.max(0, start - 16), start);
    const after = code.slice(end + 1, end + 201);
    const pattern =
      /(?:(?<![\w$])(?:const|let|var)|[(,])\s*$/.test(before) &&
      /^\s*(?:=(?![=>])|of\b|(?::[^;{}()=]*)?\)\s*(?::[^;{}()=]*)?(?:=>|\{))/.test(after);
    if (!pattern) continue;
    for (const k of code
      .slice(start, end)
      .matchAll(new RegExp(String.raw`[{,]\s*(${ID})\s*(?=[,}:=]|$)`, 'g')))
      if (names.has(k[1])) read.add(k[1]);
  }
  return [...read].sort();
}

// Type arguments between a loader and its `(`: `vi.importActual<typeof import('…')>(…)`.
// Bounded and lazy, so a stray `<` costs at most this many characters.
const TYPE_ARGS = String.raw`(?:<[\s\S]{0,400}?>\s*)?`;

const UNREADABLE = {
  comment: "a block comment never closes (in JSX text, write /* as {'/*'})",
  template: "a template literal never closes (in JSX text, write a backtick as {'`'})",
};

/**
 * Statements that hide which names a file takes from `pkg`, each as one line for
 * a `--check` report: `export * from '<pkg>'` always; a namespace import or a
 * module-loading call of `pkg` with `(uses A, B)` when the file reads one of
 * `names` off something; and, for a file that names `pkg` but ends inside a
 * block comment or template, `unreadable from line N: …`, since its imports
 * after that line cannot be read.
 * @param {string} source
 * @param {string} pkg the package root specifier, matched exactly
 * @param {Iterable<string>} names the names the root no longer exports
 * @returns {string[]}
 */
export function findUnrewritable(source, pkg, names) {
  const { code, strings, unterminated } = maskSource(source);
  // `code` keeps quotes but blanks the specifier, so compare it in `source`.
  const isPkg = (quoteAt) =>
    source.startsWith(pkg, quoteAt + 1) && source[quoteAt + 1 + pkg.length] === source[quoteAt];
  const blank = `(['"\`]) {${pkg.length}}`;
  const found = [];
  for (const m of code.matchAll(
    new RegExp(
      String.raw`(?:^|(?<=;))[ \t]*export\s+(?:type\s+)?\*(?:\s*as\s+${ID})?\s*from\s*${blank}\1`,
      'gm',
    ),
  )) {
    const quoteAt = m.index + m[0].length - pkg.length - 2;
    if (isPkg(quoteAt)) found.push(source.slice(m.index, m.index + m[0].length).trim());
  }

  const hidden = new Set();
  for (const m of code.matchAll(
    new RegExp(
      String.raw`(?:^|(?<=;))[ \t]*import\s+(?:type\s+)?(?:${ID}\s*,\s*)?\*\s*as\s+${ID}\s*from\s*${blank}\1`,
      'gm',
    ),
  )) {
    const quoteAt = m.index + m[0].length - pkg.length - 2;
    if (isPkg(quoteAt)) hidden.add(source.slice(m.index, m.index + m[0].length).trim());
  }
  for (const m of code.matchAll(
    new RegExp(
      String.raw`(?<![\w$])(${LOADERS.map(esc).join('|')})\s*${TYPE_ARGS}\(\s*${blank}\2`,
      'g',
    ),
  )) {
    const quoteAt = m.index + m[0].length - pkg.length - 2;
    if (isPkg(quoteAt)) hidden.add(`${m[1]}('${pkg}')`);
  }
  if (hidden.size > 0) {
    const read = readNames(code, strings, new Set(names));
    if (read.length > 0) for (const h of hidden) found.push(`${h} (uses ${read.join(', ')})`);
  }
  if (unterminated && source.includes(pkg))
    found.push(`unreadable from line ${unterminated.line}: ${UNREADABLE[unterminated.kind]}`);
  return found;
}
