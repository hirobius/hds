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
    const out = JSON.parse(
      execFileSync('node', ['scripts/check-component-token-binding.mjs', '--json'], {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
      }),
    );
    const rows = new Map(
      (out.cssResults ?? [])
        .filter((r: { id: string }) => r.id.startsWith('button.'))
        .map((r: { id: string; class: string }) => [r.id.slice('button.'.length), r.class]),
    );
    for (const leaf of MIRRORED) expect(rows.get(leaf), leaf).toBe('BOUND');
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
});
