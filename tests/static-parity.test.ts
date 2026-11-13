// @vitest-environment node
/**
 * `.hds-button` in static.css (CSS-only consumers, e.g. folio styling an <a> as
 * a Button without the JS root entry) stays in parity with the Button
 * component: every variant and size Button renders has a class, every Button
 * token the mirror maps is BOUND to the same `--component-button-*` variable,
 * and the disabled and focus states exist for <a> as well as <button>.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('src/styles/static.css');
const button = read('src/app/components/button.tsx');

/** The binding gate's static.css rows for one component group: leaf -> class. */
function cssRows(group: string): Map<string, string> {
  const out = JSON.parse(
    execFileSync('node', ['scripts/check-component-token-binding.mjs', '--json'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    }),
  );
  return new Map(
    (out.cssResults ?? [])
      .filter((r: { id: string }) => r.id.startsWith(`${group}.`))
      .map((r: { id: string; class: string }) => [r.id.slice(group.length + 1), r.class]),
  );
}

/** The keys of one cva variant group in button.tsx. */
function variantKeys(group: string): string[] {
  const start = button.indexOf(`${group}: {`, button.indexOf('const buttonVariants'));
  const body = button.slice(start, button.indexOf('\n      },', start));
  return [...body.matchAll(/^\s{8}([a-z]+):/gm)].map((m) => m[1]);
}

/** The Button token leaves the static.css mirror must bind. */
const MIRRORED = [
  'bg',
  'bgHover',
  'bgPressed',
  'text',
  'radius',
  'fontWeight',
  'primary.bgDisabled',
  'primary.textDisabled',
  'secondary.bg.rest',
  'secondary.bg.hover',
  'secondary.bg.pressed',
  'secondary.text',
  'tertiary.bg.hover',
  'tertiary.bg.pressed',
  ...['sm', 'md', 'lg'].flatMap((s) =>
    ['height', 'paddingX', 'iconSize'].map((leaf) => `size.${s}.${leaf}`),
  ),
  'size.md.paddingY',
];

describe('.hds-button in static.css', () => {
  it.each(variantKeys('variant'))('has a class for variant %s', (variant) => {
    expect(css).toContain(`.hds-button--${variant}`);
  });

  it.each(variantKeys('size'))('has a class for size %s', (size) => {
    expect(css).toContain(`.hds-button--${size}`);
  });

  it('every mirrored Button token is BOUND in static.css', () => {
    const rows = cssRows('button');
    for (const leaf of MIRRORED) expect(rows.get(leaf), leaf).toBe('BOUND');
  });

  it('extends the sm hit area to the 44px touch target without moving the layout', () => {
    const rule = css.slice(css.indexOf('.hds-button--sm::before {'));
    expect(rule.slice(0, rule.indexOf('}'))).toMatch(/height: var\(--semantic-size-touchTarget\)/);
  });

  it('transitions on the productive motion tokens', () => {
    const rule = css.slice(css.indexOf('.hds-button {'));
    const body = rule.slice(0, rule.indexOf('}'));
    expect(body).toMatch(
      /var\(--hds-motion-productive-duration\) var\(--hds-motion-productive-easing\)/,
    );
    expect(body).not.toMatch(/\bease\b/);
  });

  it('disables an <a> through aria-disabled as well as a <button> through :disabled', () => {
    expect(css).toMatch(/\.hds-button:disabled,\s*\.hds-button\[aria-disabled='true'\]\s*\{/);
  });

  it('rings on keyboard focus with the shared focus tokens', () => {
    const rule = css.slice(css.indexOf('.hds-button:focus-visible {'));
    expect(rule).toMatch(
      /outline: var\(--semantic-focus-ring-width\) solid var\(--semantic-focus-ring-color\)/,
    );
    expect(rule).toMatch(/outline-offset: var\(--semantic-focus-gap-width\)/);
  });

  describe('hard edge (hds#1507, folio #338)', () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
    const sheet = strip(css);
    /** Every rule whose selector list contains `needle`, as { selector, body }. */
    const rules = (needle: string) =>
      [...sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .map((m) => ({ selector: m[1].trim(), body: m[2] }))
        .filter((r) => r.selector.includes(needle));

    it('draws the edge as a zero-blur box-shadow on the depth and edge tokens', () => {
      const raised = rules('.hds-button').find((r) => /box-shadow:/.test(r.body));
      expect(raised, 'a raised rule').toBeDefined();
      expect(raised!.body).toMatch(
        /box-shadow:\s*0 var\(--hds-hs, var\(--component-button-depth-edge\)\) 0\s+var\(--hds-edge, var\(--component-button-edge-secondary\)\)/,
      );
      expect(raised!.body).toMatch(/translate: 0 var\(--hds-ty, 0px\)/);
      expect(raised!.selector).toMatch(/:not\([^)]*:disabled[^)]*\)/);
    });

    it('keeps tertiary, link and --flat flat', () => {
      const raised = rules('.hds-button').find((r) => /box-shadow:/.test(r.body))!;
      for (const k of ['--tertiary', '--link', '--flat']) expect(raised.selector).toContain(k);
    });

    it('primary paints the per-accent primary edge, and its hover edge on hover', () => {
      expect(
        rules('.hds-button--primary')
          .map((r) => r.body)
          .join(),
      ).toContain('--hds-edge: var(--hds-edge-primary)');
      expect(sheet).toContain('--hds-edge: var(--hds-edge-primaryHover)');
    });

    it('sinks by hoverOffset on hover (hover-capable pointers) and pressedOffset on press', () => {
      const hover = sheet.slice(sheet.indexOf('@media (hover: hover)'));
      expect(hover).toContain('--hds-ty: var(--component-button-depth-hoverOffset)');
      const press = rules('.hds-button:active')
        .map((r) => r.body)
        .join();
      expect(press).toContain('--hds-ty: var(--component-button-depth-pressedOffset)');
    });

    it('moves under no transition when motion is reduced', () => {
      const base = rules('.hds-button').find((r) => r.selector === '.hds-button')!;
      expect(base.body).toMatch(/transition:[^;]*translate[^;]*box-shadow/s);
      expect(sheet).toMatch(
        /prefers-reduced-motion: reduce\)\s*\{\s*\.hds-button\s*\{\s*transition: none/,
      );
    });

    it('keeps the edge as the first focus layer, so the gap never paints over it (hds#1545)', () => {
      const focus = rules('.hds-button').find(
        (r) => r.selector.endsWith(':focus-visible') && /box-shadow:/.test(r.body),
      )!;
      expect(focus.body).toMatch(
        /box-shadow:\s*0 var\(--hds-hs, var\(--component-button-depth-edge\)\) 0\s+var\(--hds-edge, var\(--component-button-edge-secondary\)\),/,
      );
    });

    it('outlines focus in Highlight under forced colors, as .hds-btn-hard does (hds#1545)', () => {
      const forced = sheet.slice(sheet.indexOf('@media (forced-colors: active)'));
      expect(forced).toMatch(
        /^@media \(forced-colors: active\)\s*\{\s*\.hds-button:focus-visible\s*\{[^}]*outline: var\(--semantic-focus-ring-width\) solid Highlight/,
      );
    });

    it('wraps the focus ring around face and edge, with a transparent outline that forced colors repaint', () => {
      expect(sheet).toMatch(/\.hds-button[^{]*:focus-visible\s*\{[^}]*box-shadow:/);
      expect(sheet).toMatch(/\):focus-visible\s*\{[^}]*outline-color: transparent/);
    });
  });
});

/**
 * `.hds-link` (InlineLink) in static.css: the same declarations as theme.css's
 * `.hds-link`, `.hds-link:hover` and `.hds-link-standalone` (the JS bundle's
 * copy), plus the external form's no-wrap tail and icon, bound to the
 * InlineLink tokens.
 */
describe('.hds-link in static.css', () => {
  const theme = read('src/styles/theme.css');
  // variables.css ships the productive duration and easing, not theme.css's composite.
  const strip = (s: string) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(
        /var\(--hds-motion-productive\)/g,
        'var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)',
      );
  /** The declarations of the first rule whose whole selector is `selector`. */
  const decls = (text: string, selector: string) => {
    const t = strip(text);
    const re = new RegExp(
      `(^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
    );
    const m = re.exec(t);
    if (!m) return null;
    return m[2]
      .split(';')
      .map((d) => d.trim().replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')'))
      .filter(Boolean)
      .sort();
  };

  it.each(['.hds-link', '.hds-link:hover', '.hds-link-standalone'])(
    '%s declares what theme.css declares',
    (selector) => {
      expect(decls(theme, selector)).not.toBeNull();
      expect(decls(css, selector)).toEqual(decls(theme, selector));
    },
  );

  it.each(['sm', 'md', 'lg'])('has a class for InlineLink size %s', (size) => {
    expect(css).toContain(`.hds-link--${size}`);
  });

  it('every mirrored InlineLink token is BOUND in static.css', () => {
    const rows = cssRows('inlineLink');
    for (const leaf of [
      'iconSize',
      'iconGap',
      'size.sm.fontSize',
      'size.md.fontSize',
      'size.lg.fontSize',
    ]) {
      expect(rows.get(leaf), leaf).toBe('BOUND');
    }
  });

  it('keeps the external icon on the line of the last word, and rings on focus', () => {
    expect(decls(css, '.hds-link__tail')).toContain('white-space: nowrap');
    expect(decls(css, '.hds-link:focus-visible')).toEqual(
      [
        'outline: var(--semantic-focus-ring-width) solid var(--semantic-focus-ring-color)',
        'outline-offset: var(--semantic-focus-gap-width)',
      ].sort(),
    );
  });
});

/**
 * The external arrow (hds#1545): Button `external` and InlineLink's arrow in static.css.
 * Same contract as theme.css's .hds-ext-icon (hds#1530): a translate on the productive
 * motion token, on the resting icon so it eases out too, applied on focus-visible and on
 * hover for hover-capable pointers, and never under reduced motion.
 */
describe('external arrow motion in static.css (hds#1545)', () => {
  const sheet = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const noPref = (() => {
    const i = sheet.indexOf('@media (prefers-reduced-motion: no-preference)');
    return i < 0 ? '' : sheet.slice(i);
  })();

  it('times .hds-ext-icon and .hds-link__icon on the productive motion token', () => {
    for (const sel of ['.hds-ext-icon', '.hds-link__icon']) {
      const rule = sheet.slice(sheet.indexOf(`${sel} {`));
      expect(rule.slice(0, rule.indexOf('}')), sel).toMatch(
        /transition: translate var\(--hds-motion-productive-duration\) var\(--hds-motion-productive-easing\)/,
      );
    }
  });

  it('moves the arrow only inside prefers-reduced-motion: no-preference', () => {
    const moves = [...sheet.matchAll(/translate: 0\.125em -0\.125em/g)].map((m) => m.index!);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    const start = sheet.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(start).toBeGreaterThan(-1);
    for (const i of moves) expect(i).toBeGreaterThan(start);
  });

  it('nudges on focus-visible and on hover only for hover-capable pointers', () => {
    expect(noPref).toMatch(/\.hds-ext:focus-visible \.hds-ext-icon/);
    expect(noPref).toMatch(/\.hds-link:focus-visible \.hds-link__icon/);
    const hover = noPref.slice(noPref.indexOf('@media (hover: hover)'));
    expect(hover).toMatch(/\.hds-ext:hover \.hds-ext-icon/);
    expect(hover).toMatch(/\.hds-link:hover \.hds-link__icon/);
  });
});
