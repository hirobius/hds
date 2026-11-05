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
 * Text-style variants (VARIANTS: bodyStrong, uiItalic) are a role with one
 * property changed; the token file must keep each equal to its role otherwise.
 *
 * Marketing-only extensions (MARKETING_ROLES: hero, ADR-052 addendum) are live
 * tokens for covers and marketing headers. They sit outside the ramp, so src/
 * may not use them: `typeStyles.hero` or `--semantic-typography-hero-*` fails
 * as `marketing-only` (the display dial line in theme.css is exempted inline).
 *
 * It also checks hirobius.tokens.json: exactly the live composites under
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

import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scanSources,
  suppressionFor,
  maskComments,
  isSpecFile,
  reportLineViolations,
  gateContext,
  textViolations,
} from './lib/source-scan.mjs';
import { readTokenSource } from './lib/token-source.mjs';

const { ROOT, jsonMode, isFixtureMode, fixtureFile } = gateContext(import.meta.url);

/** The seven roles of the ramp. */
export const ROLES = Object.freeze([
  'display',
  'title',
  'titleSm',
  'body',
  'ui',
  'caption',
  'mono',
]);

/**
 * Marketing-only extensions above the ramp (ADR-052 addendum, 2026-11-05).
 * Live in the token file and in Figma; never used by product UI in src/.
 */
export const MARKETING_ROLES = Object.freeze(['hero']);

/**
 * Text-style variants (ADR-052 addendum, 2026-11-05): a role with one property
 * changed, so Figma's text styles are 1:1 with what code renders. Each must
 * equal its role except for `set`, and carry the role's $extensions (modes).
 */
export const VARIANTS = Object.freeze({
  bodyStrong: { of: 'body', set: { fontWeight: '{primitive.typography.weight.bold}' } },
  uiItalic: { of: 'ui', set: { fontStyle: 'italic' } },
});

/** Deprecated composite to the role it now points at (semantic.typography.*). */
export const TOKEN_ALIASES = Object.freeze({
  h1: 'title',
  h2: 'title',
  h3: 'title',
  eyebrow: 'caption',
});

const ROLE_ALT = [...ROLES, ...Object.keys(VARIANTS)].join('|');
const DEPRECATED_TYPE_STYLES =
  'h1|h2|h3|heading1|heading2|heading3|headingHero|headingSection|display1|display2|displayXl|' +
  'body2|bodyLarge|small|bodySmall|label|labelDescriptive|eyebrow|badge|micro|' +
  'technical|monoXs|monoSm|labelTechnical';
const DEPRECATED_VARIANTS =
  'heading1|heading2|heading3|technical|eyebrow|badge|docLede|docBody|docSmall|docCode';

const EXTENSIONS = ['.ts', '.tsx', '.css'];
const SKIP_DIRS = ['node_modules', '.git', 'dist', '__tests__'];
const isExemptedLine = suppressionFor('type-ramp-ok', { requireReason: true, lookback: 2 });
const EXEMPT_FILES = new Set([
  'src/app/design-system/tokens.ts',
  'src/app/components/text.tsx',
  'src/styles/tokens.generated.css',
  // hds#449: keeps already-shipped utilities emitted; it adds none.
  'src/styles/utility-safelist.generated.css',
  'src/styles/static.css',
  'src/styles/tenants.css',
  'src/styles/fonts.css',
]);

/** Whether a repo-relative path is out of scope. */
export function isExempt(rel) {
  return EXEMPT_FILES.has(rel) || /(^|\/)generated-[^/]+$/.test(rel) || isSpecFile(rel);
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

const MARKETING_ALT = MARKETING_ROLES.join('|');
const MARKETING_PATTERNS = [
  new RegExp(`typeStyles(?:\\.(?:${MARKETING_ALT})\\b|\\[\\s*['"](?:${MARKETING_ALT})['"])`, 'g'),
  new RegExp(`--semantic-typography-(?:${MARKETING_ALT})-[\\w-]+`, 'g'),
  new RegExp(`typography\\.(?:${MARKETING_ALT})\\b`, 'g'),
];

const PROPERTY =
  /(?<![\w-])(font-size|fontSize|font-weight|fontWeight|line-height|lineHeight)\s*:\s*([^;,}\n\]]*)/g;
// A role var (or a template literal that builds one) and the CSS-wide keywords.
const ALLOWED_VALUE = new RegExp(
  `^(?:var\\(\\s*--semantic-typography-(?:${ROLE_ALT}|\\$\\{[^}]*\\})-(?:font-size|font-weight|line-height)\\s*\\)|inherit|unset|initial)`,
);

/**
 * Violations in one file's text: { file, line, rule, message, sample }.
 * Rules: off-ramp-style, deprecated-composite, marketing-only.
 */
export function findViolationsInText(text, file) {
  const raw = text.split('\n');
  const masked = maskComments(text).split('\n');
  const isCss = file.endsWith('.css');
  const out = [];

  const exempt = (i) => isExemptedLine(raw, i);
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
    for (const re of MARKETING_PATTERNS) {
      for (const m of line.matchAll(re)) {
        found.push([
          m.index,
          'marketing-only',
          `${m[0].trim()}: marketing-only extension (ADR-052 addendum), product UI uses a role (${ROLES.join(', ')})`,
        ]);
      }
    }
    found.sort((a, b) => a[0] - b[0]);
    for (const [col, rule, message] of found) push(i, col, rule, message);
  });
  return out;
}

/**
 * Violations in the token file: the live composites must be exactly the seven
 * roles plus the marketing-only extensions, and each deprecated alias must
 * still equal its role.
 * @param {object} tokens parsed hirobius.tokens.json
 * @param {Record<string,string>} [aliases] alias name to role name
 */
export function findTokenViolations(
  tokens,
  aliases = TOKEN_ALIASES,
  extensions = MARKETING_ROLES,
  variants = VARIANTS,
) {
  const file = 'hirobius.tokens.json';
  const typo = tokens?.semantic?.typography ?? {};
  const out = [];
  const composites = Object.entries(typo).filter(
    ([k, v]) =>
      !k.startsWith('$') && v && typeof v === 'object' && v.$value && typeof v.$value === 'object',
  );
  const live = composites.filter(([, v]) => !v.$deprecated).map(([k]) => k);
  const unexpected = live.filter(
    (k) => !ROLES.includes(k) && !extensions.includes(k) && !(k in variants),
  );
  const missing = ROLES.filter((r) => !live.includes(r));
  if (unexpected.length || missing.length) {
    out.push({
      file,
      line: null,
      rule: 'ramp-size',
      message: `semantic.typography must hold exactly ${ROLES.join(', ')} (plus marketing-only ${extensions.join(', ') || 'none'}); unexpected: [${unexpected.join(', ')}], missing: [${missing.join(', ')}]`,
    });
  }
  for (const [name, { of, set }] of Object.entries(variants)) {
    const a = typo[name];
    const r = typo[of];
    if (!a || !r) continue;
    const want = { ...r.$value, ...set };
    const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
    const keys = new Set([...Object.keys(want), ...Object.keys(a.$value)]);
    const exact = [...keys].every((k) => same(a.$value[k], want[k]));
    if (!exact || !same(a.$extensions, r.$extensions)) {
      out.push({
        file,
        line: null,
        rule: 'variant-drift',
        message: `semantic.typography.${name} must equal ${of} except ${Object.keys(set).join(', ')} (and share its $extensions)`,
      });
    }
  }
  for (const ext of extensions) {
    if (typo[ext] && !/marketing-only/i.test(typo[ext].$description ?? '')) {
      out.push({
        file,
        line: null,
        rule: 'extension-unscoped',
        message: `semantic.typography.${ext} must say "Marketing-only" in its $description`,
      });
    }
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

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files =
    isFixtureMode && fixtureFile
      ? [resolve(fixtureFile)]
      : scanSources({
          root: ROOT,
          gate: 'check-type-ramp',
          roots: ['src'],
          exts: EXTENSIONS,
          skipDirs: SKIP_DIRS,
        }).filter((f) => !isExempt(relative(ROOT, f).replace(/\\/g, '/')));

  const violations = textViolations(ROOT, files, findViolationsInText);
  if (!(isFixtureMode && fixtureFile)) {
    violations.push(...findTokenViolations(readTokenSource(join(ROOT, 'hirobius.tokens.json'))));
  }
  process.exit(
    reportLineViolations(violations, jsonMode, {
      gate: 'check-type-ramp',
      ok: 'src/ uses the seven roles only (display, title, titleSm, body, ui, caption, mono)',
      noun: (n) => `use${n === 1 ? '' : 's'} off the type ramp (hds#486):`,
      fix: [
        '\nFix: use <Text variant="…">, hds.typeStyles.<role> or the .hds-type-<role> class,',
        '  or suppress with // type-ramp-ok: <reason>\n',
      ],
    }),
  );
}
