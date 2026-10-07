/**
 * The upgrade steps the 0.21.0 changesets carry (hds#448), tried on consumer
 * code: each detect finds what it should and leaves alone what it should not,
 * and each `done` says when a by-hand step is finished.
 *
 * Before `changeset version` a step lives in upgrade/pending/<changeset>.json
 * with an id such as `removed/StatusDot`; once the compiler (hds#451) merges
 * the notes it lives in upgrade/releases/<version>.json as
 * `<version>/removed/StatusDot`. So this test reads both places, finds a step
 * by its id's tail, and names no pending file: it holds on both sides of the
 * release, the way tests/removed-0.20-release-notes.test.ts names no changeset.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const PACKAGE = '@hirobius/design-system';

const readJsonDir = (rel) => {
  const dir = join(REPO, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
};

const STEPS = [
  ...readJsonDir('upgrade/pending').flatMap((note) => note.steps ?? []),
  ...readJsonDir('upgrade/releases').flatMap((release) => release.steps),
];

/** The step whose id is `tail` or ends in `/<tail>`. */
function step(tail) {
  const found = STEPS.filter((s) => s.id === tail || s.id.endsWith(`/${tail}`));
  expect(
    found.map((s) => s.id),
    `one step ending in ${tail}`,
  ).toHaveLength(1);
  return found[0];
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Does `detect` (the shape in scripts/upgrade/schema.mjs) find a use in one
 * consumer file? Enough of the upgrade command's matcher (hds#452) to try the
 * steps here: named imports, JSX tags, var() reads, bare imports and regexes.
 */
function finds(detect, code) {
  if (!detect) return false;
  const imports = (detect.imports ?? []).some(({ from, names }) =>
    [...code.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)].some(
      ([, list, specifier]) =>
        specifier === from &&
        list.split(',').some((part) => names.includes(part.trim().split(/\s+as\s+/)[0])),
    ),
  );
  const jsx = (detect.jsx ?? []).some((tag) => new RegExp(`<${escape(tag)}[\\s/>]`).test(code));
  const cssVars = (detect.cssVars ?? []).some((name) =>
    new RegExp(`var\\(\\s*${escape(name)}\\b`).test(code),
  );
  const bare = (detect.bareImports ?? []).some((name) =>
    new RegExp(`(?:from\\s*|import\\s*\\(?\\s*|require\\s*\\(\\s*)['"]${escape(name)}['"]`).test(
      code,
    ),
  );
  const regex = (detect.regex ?? []).some((source) => new RegExp(source).test(code));
  return imports || jsx || cssVars || bare || regex;
}

describe('0.21.0 upgrade steps', () => {
  it('StatusDot: found by import and by JSX tag, Badge dot by hand, no codemod', () => {
    const removal = step('removed/StatusDot');
    expect(removal).toMatchObject({ kind: 'removed', impact: 'breaking' });
    expect(removal.facts).toEqual(['removed:.:StatusDot', 'removed:.:StatusDotProps']);
    expect(removal.auto).toBeUndefined();
    expect(removal.plain).toMatch(/<Badge dot/);
    expect(
      finds(
        removal.detect,
        `import { StatusDot } from '${PACKAGE}';\n<StatusDot tone="success" />`,
      ),
    ).toBe(true);
    expect(finds(removal.detect, `import type { StatusDotProps } from '${PACKAGE}';`)).toBe(true);
    expect(finds(removal.detect, '<StatusDot label="Live" />')).toBe(true);
    expect(finds(removal.detect, `import { Badge } from '${PACKAGE}';\n<Badge dot />`)).toBe(false);
  });

  it('fonts.css: asked of every tokens.css or styles.css importer, done once fonts.css is imported', () => {
    const fonts = step('manual/fonts-css');
    expect(fonts).toMatchObject({ kind: 'manual', impact: 'look' });
    expect(fonts.facts).toContain('exports-key-added:./fonts.css');
    expect(fonts.plain).toContain(`import '${PACKAGE}/fonts.css'`);
    expect(finds(fonts.detect, `import '${PACKAGE}/tokens.css';`)).toBe(true);
    expect(finds(fonts.detect, `@import "${PACKAGE}/styles.css";`)).toBe(true);
    expect(finds(fonts.detect, `import '${PACKAGE}/fonts.css';`)).toBe(false);
    expect(finds(fonts.done, `import '${PACKAGE}/fonts.css';`)).toBe(true);
    expect(finds(fonts.done, `import '${PACKAGE}/tokens.css';`)).toBe(false);
  });

  it('type ramp: a look step, the old names deprecated until 1.0.0 and found by name only', () => {
    expect(step('look/type-ramp')).toMatchObject({ kind: 'look', impact: 'look' });

    const variants = step('deprecated/Text-variants');
    expect(variants).toMatchObject({ kind: 'deprecated', impact: 'none', removeIn: '1.0.0' });
    expect(finds(variants.detect, '<Text variant="heading1">Title</Text>')).toBe(true);
    expect(finds(variants.detect, '<Text as="h2" variant={\'eyebrow\'}>Kicker</Text>')).toBe(true);
    expect(finds(variants.detect, '<Text variant="docCode">x</Text>')).toBe(true);
    expect(finds(variants.detect, '<Text variant="title">Title</Text>')).toBe(false);
    expect(finds(variants.detect, '<Text variant="caption">Note</Text>')).toBe(false);

    const styles = step('deprecated/typeStyles-aliases');
    expect(styles).toMatchObject({ kind: 'deprecated', impact: 'none', removeIn: '1.0.0' });
    expect(finds(styles.detect, 'style={hds.typeStyles.h1}')).toBe(true);
    expect(finds(styles.detect, 'style={hds.typeStyles.eyebrow}')).toBe(true);
    expect(finds(styles.detect, 'style={hds.semantic.typography.labelTechnical}')).toBe(true);
    expect(finds(styles.detect, 'style={hds.typeStyles.title}')).toBe(false);
    expect(finds(styles.detect, 'style={hds.typeStyles.bodyMuted}')).toBe(false);

    const transform = step('removed/--semantic-typography-eyebrow-text-transform');
    expect(transform).toMatchObject({ kind: 'removed', impact: 'look' });
    expect(
      finds(
        transform.detect,
        '.kicker { text-transform: var(--semantic-typography-eyebrow-text-transform); }',
      ),
    ).toBe(true);
  });

  it('ESLint plugin: no-raw-controls is breaking for the git plugin, and the subpath replaces it', () => {
    const rule = step('behavior/eslint-no-raw-controls');
    expect(rule).toMatchObject({ kind: 'behavior', impact: 'breaking' });
    expect(rule.plain).toContain("'off'");
    const config =
      "import hds from '@hirobius/eslint-plugin-hds';\nexport default [hds.configs.recommended];";
    expect(finds(rule.detect, config)).toBe(true);
    expect(finds(rule.detect, `import hds from '${PACKAGE}/eslint-plugin';`)).toBe(false);

    const subpath = step('exports/./eslint-plugin');
    expect(subpath).toMatchObject({ kind: 'exports', impact: 'additive' });
    expect(subpath.facts).toEqual(['exports-key-added:./eslint-plugin']);
    expect(finds(subpath.detect, config)).toBe(true);
    expect(finds(subpath.done, `import hds from '${PACKAGE}/eslint-plugin';`)).toBe(true);
  });

  it('tone: a toned Button or Card with a className is found, either order; a bare tone is not', () => {
    const tone = step('behavior/Button-Card-tone-className');
    expect(tone).toMatchObject({ kind: 'behavior', impact: 'behavior' });
    expect(finds(tone.detect, '<Button tone="danger" className="bg-red-700" />')).toBe(true);
    expect(finds(tone.detect, '<Card className="border-0" tone="success">')).toBe(true);
    expect(finds(tone.detect, '<Button tone="danger" label="Delete" />')).toBe(false);
    expect(finds(tone.detect, '<Button className="w-full" label="Save" />')).toBe(false);
  });

  it('bug bash: each layout change names its way back, and each role change is a behavior', () => {
    expect(step('look/Grid-align-start').plain).toContain('align="stretch"');
    expect(step('look/Table-flush').plain).toContain('flush={false}');
    expect(step('look/ErrorPattern-fullPage').plain).toContain('fullPage');
    expect(step('look/form-control-width').plain).toContain('--hds-form-control-max-width');
    for (const tail of [
      'behavior/Alert-role',
      'behavior/Toggle-role-switch',
      'behavior/Badge-dot-role',
      'behavior/one-tab-stop',
    ]) {
      expect(step(tail)).toMatchObject({ kind: 'behavior', impact: 'behavior' });
    }
    const badge = step('behavior/Badge-dot-role');
    expect(finds(badge.detect, '<Badge dot tone="success" label="Live" />')).toBe(true);
    expect(finds(badge.detect, '<Badge tone="success">Live</Badge>')).toBe(false);
  });
});
