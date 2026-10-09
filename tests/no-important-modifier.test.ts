// @vitest-environment node
/**
 * No Tailwind important modifier in component class strings (hds#372,
 * ADR-030), and none in test or doc text either.
 *
 * The modifier has two spellings: a `!` opening the utility, after any
 * variants (`!<utility>`, `<variant>:!<utility>`, Tailwind v3's only form and
 * still valid in v4), and v4's `!` closing the class (`<utility>!`).
 *
 * Button's and Card's `tone` once beat `variant` with important-modified
 * utilities. Precedence now comes from tailwind-merge class-group replacement
 * inside `cn`: the later tone class replaces the variant class in the same
 * group, and a consumer `className` replaces either. An important utility sits
 * outside that model (twMerge files it in a different group from the plain
 * utility, so both survive and CSS `!important` decides), which is also why a
 * consumer could not override a tone before. Cases A and B keep the modifier
 * out of component class strings.
 *
 * Case C is about the published CSS. Tailwind v4's automatic source detection
 * reads every file the repo does not .gitignore (`@import 'tailwindcss'` in
 * src/styles/theme.css sets no `source()`), tests and docs included, and
 * compiles every token there that parses as a utility. A literal important
 * token in a test fixture or an ADR example therefore ships an `!important`
 * rule in `dist/styles.css` and `dist/tokens.css` that no component renders.
 * This file's own fixtures are assembled at run time for that reason (see
 * `leading` and `trailing`), and its comments write the forms with `<…>`
 * placeholders, which Tailwind cannot parse as a class.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { twMerge } from 'tailwind-merge';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const COMPONENTS_DIR = 'src/app/components';

/**
 * Leading form in a class string: a `!` opening a utility, after start,
 * whitespace, a quote or a variant's colon. Inside a component's string
 * literals a `!` before a lowercase word is always a class, so shape decides.
 */
const LEADING_IMPORTANT = /(^|[\s'"`:])!(?:[a-z-]+:)*[a-z]/;

/**
 * Tokens the way Tailwind's extractor splits text: runs between whitespace,
 * quotes, backticks and the `<` `>` `{` `}` of HTML and JSX. It does not start
 * a class after `(`, so `if (!block)` is no candidate for either.
 */
const TOKEN = /[^\s'"`<>{}]+/g;

/**
 * A token carrying the important modifier, in either form. The named group is
 * the class with the `!` taken off: the utility alone for the leading form, the
 * variants and utility for the trailing form.
 */
const IMPORTANT_TOKEN = /^(?:\S*:)?!(?<leading>[a-z]\S*)$|^(?<trailing>[^!]\S*)!$/;

/**
 * True when tailwind-merge treats `cls` as a utility: it collapses a repeated
 * utility (`'border border'` to `'border'`) and keeps a repeated unknown word
 * (`'re-run re-run'`). Prose ends in `!` (`'Saved!'`) and code negates
 * (`!loading`), so a `!` token counts only when the class under it is a
 * utility. Tailwind makes a class important only for its own utilities, and
 * twMerge v3 follows the v4 utility set. twMerge is the looser of the two (it
 * takes any colour name), so this errs toward flagging. A lowercase word that
 * is itself a utility, `fixed` or `block` in prose ending in `!`, is flagged,
 * and rightly: Tailwind compiles it too.
 */
const isUtility = (cls: string) => twMerge(`${cls} ${cls}`) === cls;

/** The important-modified utility tokens in one line of text. */
function importantUtilities(text: string): string[] {
  return (text.match(TOKEN) ?? []).filter((token) => {
    const groups = IMPORTANT_TOKEN.exec(token)?.groups;
    const cls = groups?.leading ?? groups?.trailing;
    return cls !== undefined && isUtility(cls);
  });
}

/**
 * `path:line` entries that may keep a `!` utility. Empty, and meant to stay
 * that way: a new entry needs an ADR that supersedes ADR-030.
 */
const ALLOWED: readonly string[] = [];

interface LiteralLine {
  line: number;
  text: string;
}

/** Every line of every string literal in `source`, with its 1-based line number. */
function stringLiteralLines(source: string): LiteralLine[] {
  const file = ts.createSourceFile(
    'scan.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const lines: LiteralLine[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const first = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      node
        .getText(file)
        .split('\n')
        .forEach((text, i) => lines.push({ line: first + i, text: text.trim() }));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return lines;
}

/**
 * The string-literal lines in `source` that carry an important-modified
 * utility. Only literals are read (quoted strings, template text, JSX attribute
 * strings): raw source lines would flag every JS negation written after a
 * space (`a && !loading`), and a comment may still name the banned form.
 */
function scan(source: string): LiteralLine[] {
  return stringLiteralLines(source).filter(
    ({ text }) => LEADING_IMPORTANT.test(text) || importantUtilities(text).length > 0,
  );
}

/**
 * Test and doc files, as git tracks them: everything under tests/, docs/,
 * fixtures/ and .changeset/, every `__tests__` folder and `*.test.*` or
 * `*.spec.*` file, and every Markdown file (README, CHANGELOG and the rest at
 * the root). The components are case A's.
 */
const isTestOrDoc = (rel: string) =>
  /^(tests|docs|fixtures|\.changeset)\//.test(rel) ||
  /(^|\/)__tests__\//.test(rel) ||
  /\.(test|spec)\.[cm]?[jt]sx?$/.test(rel) ||
  /\.mdx?$/.test(rel);

/**
 * Paths src/styles/theme.css keeps from Tailwind with `@source not`: the
 * release snapshots (hds#449) record every class each published stylesheet
 * carried, `!` utilities of old releases included, and Tailwind never reads them.
 */
const NOT_SCANNED = /^docs\/api\/releases\//;

function testAndDocFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(
      (rel) => rel && isTestOrDoc(rel) && !NOT_SCANNED.test(rel) && existsSync(join(ROOT, rel)),
    );
}

/**
 * Fixture classes get their `!` here, at run time, so no literal important
 * token sits in this file for Tailwind to compile (case C). The classes passed
 * in are ones the build already emits, so the fixtures add no rule of any kind.
 */
const BANG = '!';

/** `cls` with a `!` opening its utility, after any variants. */
const leading = (cls: string) => cls.replace(/^(.*:)?/, `$1${BANG}`);

/** `cls` with v4's `!` closing it. */
const trailing = (cls: string) => `${cls}${BANG}`;

describe('no important modifier in component class strings', () => {
  it('relies on theme.css keeping the release snapshots from Tailwind', () => {
    expect(readFileSync(join(ROOT, 'src/styles/theme.css'), 'utf8')).toContain(
      '@source not "../../docs/api/releases";',
    );
  });

  it('finds no important-modified utility in src/app/components/*.tsx', () => {
    const violations = readdirSync(join(ROOT, COMPONENTS_DIR))
      .filter((name) => name.endsWith('.tsx'))
      .flatMap((name) => {
        const rel = `${COMPONENTS_DIR}/${name}`;
        return scan(readFileSync(join(ROOT, rel), 'utf8'))
          .filter(({ line }) => !ALLOWED.includes(`${rel}:${line}`))
          .map(({ line, text }) => `${rel}:${line}  ${text}`);
      });

    expect(violations).toEqual([]);
  });

  it('flags a !-prefixed utility in a class string, and nothing in comments or JS negation', () => {
    const danger = leading('bg-feedback-bg-danger');
    const fixture = [
      `// A comment may name the banned form: '${danger}'.`,
      `const tone = { danger: 'border-transparent ${danger} text-feedback-danger' };`,
      "if (iconOnly && !iconLeft && !loading) warn('Saved!');",
    ].join('\n');

    expect(scan(fixture)).toEqual([
      { line: 2, text: `'border-transparent ${danger} text-feedback-danger'` },
    ]);
  });

  // The leading `!` after a variant (Tailwind v3's only form) and v4's trailing
  // `!` each mark a utility important on their own, with no leading-`!` class
  // on the same line to catch them by accident.
  it.each([
    ['after a variant', `'${leading('hover:bg-feedback-bg-danger')}'`],
    ['after stacked variants', `'text-sm ${leading('dark:hover:brightness-110')}'`],
    ['trailing (v4)', `'${trailing('bg-feedback-bg-danger')}'`],
    ['trailing after a variant', `'${trailing('hover:bg-primary/90')} text-sm'`],
    ['trailing on a bare utility after a variant', `'${trailing('focus-visible:outline')}'`],
    ['trailing on a bare utility', `'${trailing('border')}'`],
  ])('flags the important modifier %s: %s', (_form, literal) => {
    expect(scan(`const cls = ${literal};`)).toEqual([{ line: 1, text: literal }]);
  });

  it.each([
    ['a word', "'Saved!'"],
    ['a sentence', "'Copied to clipboard. Done!'"],
    ['a label with a colon', "'Note: done!'"],
    ['a hyphenated word', "'re-run!'"],
    ['a sentence ending in a hyphenated word', "'Please sign-up!'"],
  ])('does not flag %s ending in !: %s', (_form, literal) => {
    expect(scan(`const label = ${literal};`)).toEqual([]);
  });

  it('flags an important token in doc text, and not !important, an image, a negation or prose', () => {
    const doc = [
      `Old tone: \`${leading('border-transparent')} ${leading('hover:bg-feedback-bg-danger')}\`.`,
      `v4 spells it <code>${trailing('border')}</code>, or ${trailing('hover:bg-primary/90')}`,
      'Never `!important`. See ![the tone matrix](tone-matrix.png).',
      'if (!block && !loading) return;',
      'Saved! Please sign-up!',
    ];

    expect(doc.map(importantUtilities)).toEqual([
      [leading('border-transparent'), leading('hover:bg-feedback-bg-danger')],
      [trailing('border'), trailing('hover:bg-primary/90')],
      [],
      [],
      [],
    ]);
  });

  it('leaves no important-modified utility in test or doc text for Tailwind to compile', () => {
    const violations = testAndDocFiles().flatMap((rel) => {
      const text = readFileSync(join(ROOT, rel), 'utf8');
      if (text.includes('\0')) return [];
      return text
        .split('\n')
        .flatMap((line, i) => importantUtilities(line).map((token) => `${rel}:${i + 1}  ${token}`));
    });

    expect(violations).toEqual([]);
  });
});
