/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-surface-radius.mjs
 *
 * Radius scales with the element (DESIGN.md "Corner-Radius Policy"):
 *
 *   control  semantic.radius.control  small glyphs: checkbox box, kbd, tooltip
 *   action   semantic.radius.action   controls: button, input, select trigger, badge (rounded-md)
 *   surface  semantic.radius.surface  surfaces: Card, Callout, Alert, Dialog, Popover,
 *                                     Menu, Select listbox, Toast, CodeBlock (rounded-lg,
 *                                     the same as Card)
 *
 * A nested element sits one step down so its corners stay concentric:
 * inner radius = outer radius − padding.
 *
 * This gate scans the surface components (SURFACES below) and fails when:
 *
 *   1. NO SURFACE RADIUS — the file never uses the surface radius (rounded-lg or
 *      larger), so the surface is tighter than Card.
 *   2. BELOW SURFACE — a radius below the surface level (rounded, rounded-none/sm/md,
 *      var(--semantic-radius-action|control), hds.borderRadius[n]) with no
 *      `radius-ok: <reason>` note on the same line or up to two lines above. Nested
 *      elements (menu items, a close button) carry that note.
 *   3. RAW RADIUS — an arbitrary value (rounded-[6px], rounded-[var(--primitive-radius-4)],
 *      rounded-[var(--semantic-radius-surface)], rounded-[var(--component-card-radius)])
 *      or a literal borderRadius (borderRadius: 6, '6px'). These ignore the tenant's
 *      role.radius, which rounded-lg follows; no note exempts them.
 *
 * Usage:   node scripts/check-surface-radius.mjs
 * Fixture: node scripts/check-surface-radius.mjs --fixture-mode  (FIXTURE_FILE=<file>)
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

// The surface-type components. A new surface joins this list (and takes rounded-lg).
export const SURFACES = [
  'alert',
  'alert-dialog',
  'callout',
  'card',
  'code-block',
  'dialog',
  'menu',
  'popover',
  'select',
  'status-tile',
  'surface',
  'toast',
];

const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';

const SIDE = '(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?';
const ROUNDED = new RegExp(
  `(?<![\\w-])rounded${SIDE}(?:-(none|sm|md|lg|xl|2xl|3xl|full|\\[[^\\]\\s]+\\]))?(?![\\w-])`,
  'g',
);
const BORDER_RADIUS = /borderRadius:\s*([^,}\n]+)/g;

const SURFACE_SIZES = new Set(['lg', 'xl', '2xl', '3xl', 'full']);
const BELOW_SIZES = new Set([undefined, 'none', 'sm', 'md']);

/** Classify one radius value: 'surface' | 'below' | 'raw'. */
function classifyArbitrary(inner) {
  if (/^var\(--semantic-radius-(action|control)\)$/.test(inner)) return 'below';
  return 'raw';
}

function classifyClass(size) {
  if (SURFACE_SIZES.has(size)) return 'surface';
  if (BELOW_SIZES.has(size)) return 'below';
  return classifyArbitrary(size.slice(1, -1));
}

function classifyStyle(value) {
  const v = value.trim();
  if (/^hds\.borderRadius(\.full|\[['"]full['"]\])$/.test(v)) return 'surface';
  if (/^hds\.borderRadius/.test(v)) return 'below';
  const str = v.match(/^['"`](.*)['"`]$/);
  if (str) return classifyArbitrary(str[1]);
  return 'raw';
}

function isComment(trimmed) {
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/** Scan one surface file; returns violation strings. */
export function scanSurface(source, label) {
  const lines = source.split('\n');
  const violations = [];
  let hasSurface = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (isComment(trimmed)) return;
    // Drop a trailing `// …` comment so prose about a class never counts as the class.
    const code = line.replace(/\s\/\/\s.*$/, '');
    // The note sits on the line or up to two lines above (prettier puts it over an object key).
    const noted = lines.slice(Math.max(0, i - 2), i + 1).some((l) => l.includes('radius-ok:'));
    const where = `${label}:${i + 1}`;

    const found = [];
    for (const m of code.matchAll(ROUNDED)) found.push([m[0], classifyClass(m[1])]);
    for (const m of code.matchAll(BORDER_RADIUS)) {
      found.push([`borderRadius: ${m[1].trim()}`, classifyStyle(m[1])]);
    }

    for (const [token, kind] of found) {
      if (kind === 'surface') hasSurface = true;
      else if (kind === 'raw') {
        violations.push(
          `${where}  RAW RADIUS  ${token} — use rounded-lg (it follows the tenant's role.radius)`,
        );
      } else if (!noted) {
        violations.push(
          `${where}  BELOW SURFACE  ${token} — a surface takes rounded-lg (the Card radius); ` +
            'a nested element one step down needs a `radius-ok: <reason>` note',
        );
      }
    }
  });

  if (!hasSurface) {
    violations.push(`${label}  NO SURFACE RADIUS — a surface takes rounded-lg, the same as Card`);
  }
  return violations;
}

function main() {
  const files = isFixtureMode
    ? [process.env.FIXTURE_FILE]
    : SURFACES.map((name) => join(ROOT, 'src/app/components', `${name}.tsx`));

  const violations = [];
  for (const file of files) {
    if (!file || !existsSync(file)) {
      console.error(`check-surface-radius: missing surface file ${file}`);
      process.exit(1);
    }
    violations.push(...scanSurface(readFileSync(file, 'utf8'), relative(ROOT, file)));
  }

  if (violations.length) {
    console.error(`check-surface-radius: ${violations.length} violation(s)\n`);
    for (const v of violations) console.error(`  ${v}`);
    console.error('\nRule: DESIGN.md "Corner-Radius Policy".');
    process.exit(1);
  }
  console.log(`check-surface-radius: ${files.length} surface file(s) on the surface radius`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
