#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-type-ramp.mjs
 *
 * hds#486 — the type ramp is 5 roles plus mono: display, title, body, ui,
 * caption, mono (Adrian's decision, 2026-10-07, epic hds#483). This gate keeps
 * src/ on it. It fails when src/ uses
 *
 *   - a font size, weight or line height that is not a role: any Tailwind
 *     `text-<size>`, `font-<weight>` or `leading-*` utility, a `text-[12px]`
 *     arbitrary size, an inline or CSS `font-size` / `font-weight` /
 *     `line-height` whose value is a literal, or a raw rung of the primitive
 *     scale (`--primitive-typography-size-*`). Type comes from a role instead:
 *     `<Text variant="…">`, `hds.typeStyles.<role>`, or the `.hds-type-<role>`
 *     class (src/styles/theme.css). A value of `var(--semantic-typography-<role>-…)`,
 *     `inherit`, `unset` or `initial` is fine.
 *   - a deprecated composite: `typeStyles.h1`, `typeStyles.heading2`,
 *     `typeStyles.technical`, `--semantic-typography-h2-*`,
 *     `semantic.typography.eyebrow`, `<Text variant="heading1">` and the rest.
 *     They still resolve (so no consumer breaks) and are removed in 1.0.0.
 *
 * It also checks hirobius.tokens.json: exactly six live composites under
 * semantic.typography, and each deprecated alias (h1, h2, h3 to title, eyebrow
 * to caption) holding the same value as the role it points at.
 *
 * Exempt files: tokens.ts and text.tsx (they define the deprecated names),
 * generated CSS and TS, fonts.css (@font-face descriptors), and tests.
 * Exempt a line with `// type-ramp-ok: <reason>` on the same line or either of
 * the two lines above it.
 *
 * Known limit: a value reached through an identifier (`fontSize: size`) is not
 * followed, and class names assembled at runtime are not seen. Review catches
 * those.
 *
 * Run: node scripts/check-type-ramp.mjs [--json]
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';
import { readTokenSource } from './lib/token-source.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

/** The six roles of the ramp. */
export const ROLES = Object.freeze(['display', 'title', 'body', 'ui', 'caption', 'mono']);

/** Deprecated composite to the role it now points at (semantic.typography.*). */
export const TOKEN_ALIASES = Object.freeze({
  h1: 'title',
  h2: 'title',
  h3: 'title',
  eyebrow: 'caption',
});

const ROLE_ALT = ROLES.join('|');
const DEPRECATED_TYPE_STYLES =
  'h1|h2|h3|heading1|heading2|heading3|headingHero|headingSection|display1|display2|displayXl|' +
  'body2|bodyLarge|small|bodySmall|label|labelDescriptive|eyebrow|badge|micro|' +
  'technical|monoXs|monoSm|labelTechnical';
const DEPRECATED_VARIANTS =
  'heading1|heading2|heading3|technical|eyebrow|badge|docLede|docBody|docSmall|docCode';

const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__tests__']);
const EXEMPT_FILES = new Set([
  'src/app/design-system/tokens.ts',
  'src/app/components/text.tsx',
  'src/styles/tokens.css',
  'src/styles/tokens.generated.css',
  'src/styles/static.css',
  'src/styles/tenants.css',
  'src/styles/fonts.css',
]);

/** Whether a repo-relative path is out of scope. */
export function isExempt(rel) {
  return (
    EXEMPT_FILES.has(rel) ||
    /(^|\/)generated-[^/]+$/.test(rel) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(basename(rel))
  );
}

/** Blanks comments (keeping every newline) so a comment never reads as code. */
function maskComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[ \t])\/\/[^\n]*/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

const OFF_RAMP_PATTERNS = [
  [/(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g, 'a Tailwind text size'],
  [/(?<![\w-])text-\[\s*[\d.]+[a-z%]*\s*\]/g, 'an arbitrary text size'],
  [
    /(?<![\w-])font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?![\w-])/g,
    'a Tailwind font weight',
  ],
  [
    /(?<![\w-])leading-(?:none|tight|snug|normal|relaxed|loose|\d+(?:\.\d+)?|\[[^\]\s]*\])(?![\w-])/g,
    'a Tailwind line height',
  ],
  [
    /--primitive-typography-(?:size|weight|lineHeight)-[\w-]+|primitive\.typography\.(?:size|weight|lineHeight)\b/g,
    'a raw rung of the primitive type scale',
  ],
];

const DEPRECATED_PATTERNS = [
  [new RegExp(`typeStyles\\.(?:${DEPRECATED_TYPE_STYLES})\\b`, 'g'), 'typeStyles'],
  [new RegExp(`typeStyles\\[\\s*['"](?:${DEPRECATED_TYPE_STYLES})['"]`, 'g'), 'typeStyles'],
  [/--semantic-typography-(?:h1|h2|h3|eyebrow)-[\w-]+/g, 'composite var'],
  [/typography\.(?:h1|h2|h3|eyebrow|label|labelDescriptive|labelTechnical)\b/g, 'token path'],
  [
    new RegExp(`variant\\s*[=:]\\s*\\{?\\s*['"](?:${DEPRECATED_VARIANTS})['"]`, 'g'),
    'Text variant',
  ],
];

const PROPERTY =
  /(?<![\w-])(font-size|fontSize|font-weight|fontWeight|line-height|lineHeight)\s*:\s*([^;,}\n\]]*)/g;
// A role var (or a template literal that builds one) and the CSS-wide keywords.
const ALLOWED_VALUE = new RegExp(
  `^(?:var\\(\\s*--semantic-typography-(?:${ROLE_ALT}|\\$\\{[^}]*\\})-(?:font-size|font-weight|line-height)\\s*\\)|inherit|unset|initial)`,
);

/**
 * Violations in one file's text: { file, line, rule, message, sample }.
 * Rules: off-ramp-style, deprecated-composite.
 */
export function findViolationsInText(text, file) {
  const raw = text.split('\n');
  const masked = maskComments(text).split('\n');
  const isCss = file.endsWith('.css');
  const out = [];

  const exempt = (i) =>
    [i, i - 1, i - 2].some((j) => j >= 0 && /type-ramp-ok:\s*\S/.test(raw[j] ?? ''));
  const push = (i, col, rule, message) =>
    out.push({ file, line: i + 1, col, rule, message, sample: raw[i].trim().slice(0, 140) });

  masked.forEach((line, i) => {
    if (!line.trim() || exempt(i)) return;
    const found = [];

    for (const [re, what] of OFF_RAMP_PATTERNS) {
      for (const m of line.matchAll(re)) {
        found.push([m.index, 'off-ramp-style', `${m[0]}: ${what}, not a role`]);
      }
    }
    for (const m of line.matchAll(PROPERTY)) {
      const value = m[2].trim().replace(/^['"`]|['"`]$/g, '');
      const after = line
        .slice(m.index + m[0].length - m[2].length)
        .trim()
        .replace(/^['"`]/, '');
      if (ALLOWED_VALUE.test(after)) continue;
      // In TS an identifier or a type annotation is not a literal; only a
      // literal can be proven off the ramp. In CSS every value is a literal.
      const literal =
        /^['"`]|^-?[\d.]/.test(m[2].trim()) || /^(?:clamp|calc|var|min|max)\(/.test(value);
      if (!isCss && !literal) continue;
      found.push([m.index, 'off-ramp-style', `${m[1]}: ${value || '(empty)'} is not a role value`]);
    }
    for (const [re, what] of DEPRECATED_PATTERNS) {
      for (const m of line.matchAll(re)) {
        found.push([
          m.index,
          'deprecated-composite',
          `${m[0].trim()}: deprecated ${what}, use a role (${ROLES.join(', ')})`,
        ]);
      }
    }
    found.sort((a, b) => a[0] - b[0]);
    for (const [col, rule, message] of found) push(i, col, rule, message);
  });
  return out;
}

/**
 * Violations in the token file: the live composites must be exactly the six
 * roles, and each deprecated alias must still equal its role.
 * @param {object} tokens parsed hirobius.tokens.json
 * @param {Record<string,string>} [aliases] alias name to role name
 */
export function findTokenViolations(tokens, aliases = TOKEN_ALIASES) {
  const file = 'hirobius.tokens.json';
  const typo = tokens?.semantic?.typography ?? {};
  const out = [];
  const composites = Object.entries(typo).filter(
    ([k, v]) =>
      !k.startsWith('$') && v && typeof v === 'object' && v.$value && typeof v.$value === 'object',
  );
  const live = composites.filter(([, v]) => !v.$deprecated).map(([k]) => k);
  const unexpected = live.filter((k) => !ROLES.includes(k));
  const missing = ROLES.filter((r) => !live.includes(r));
  if (unexpected.length || missing.length) {
    out.push({
      file,
      line: null,
      rule: 'ramp-size',
      message: `semantic.typography must hold exactly ${ROLES.join(', ')}; unexpected: [${unexpected.join(', ')}], missing: [${missing.join(', ')}]`,
    });
  }
  for (const [alias, role] of Object.entries(aliases)) {
    const a = typo[alias];
    const r = typo[role];
    if (!a || !r) continue;
    if (!a.$deprecated) {
      out.push({
        file,
        line: null,
        rule: 'alias-undeprecated',
        message: `semantic.typography.${alias} must carry $deprecated naming ${role}`,
      });
    }
    if (JSON.stringify(a.$value) !== JSON.stringify(r.$value)) {
      out.push({
        file,
        line: null,
        rule: 'alias-drift',
        message: `semantic.typography.${alias} no longer equals ${role}; a deprecated alias must resolve to its role`,
      });
    }
  }
  return out;
}

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, results);
    else if (EXTENSIONS.has(extname(entry))) results.push(full);
  }
  return results;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files =
    isFixtureMode && fixtureFile
      ? [resolve(fixtureFile)]
      : collectFiles(SRC).filter((f) => !isExempt(relative(ROOT, f).replace(/\\/g, '/')));

  const violations = [];
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    violations.push(...findViolationsInText(readFileSync(f, 'utf-8'), rel));
  }
  if (!(isFixtureMode && fixtureFile)) {
    violations.push(...findTokenViolations(readTokenSource(join(ROOT, 'hirobius.tokens.json'))));
  }

  if (jsonMode) {
    emitResult(
      {
        violations: violations.map((v) => ({
          file: v.file,
          line: v.line,
          rule: v.rule,
          severity: 'error',
          message: v.message,
          ...(v.sample ? { sample: v.sample } : {}),
        })),
        summary: { total: violations.length },
        ok: violations.length === 0,
      },
      true,
    );
    process.exit(violations.length === 0 ? 0 : 1);
  }

  if (violations.length === 0) {
    console.log(
      '[ok] check-type-ramp: src/ uses the six roles only (display, title, body, ui, caption, mono)',
    );
    process.exit(0);
  }
  console.error(
    `\n✗ check-type-ramp: ${violations.length} use${violations.length === 1 ? '' : 's'} off the type ramp (hds#486):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}${v.line ? `:${v.line}` : ''}  [${v.rule}] ${v.message}`);
    if (v.sample) console.error(`    ${v.sample}`);
  }
  console.error(
    '\nFix: use <Text variant="…">, hds.typeStyles.<role> or the .hds-type-<role> class,',
  );
  console.error('  or suppress with // type-ramp-ok: <reason>\n');
  process.exit(1);
}
