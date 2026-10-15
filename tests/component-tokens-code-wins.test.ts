/**
 * Component tokens equal what the component renders today ("code wins",
 * hds#595). Each token below was re-valued from its old design value to the
 * value the shipped React component resolves to, so Figma (which reads the
 * token) draws what the browser draws.
 *
 * The expected values are the resolved results of the Tailwind classes in
 * `src/app/components/{button,card,input,tag}.tsx`, not copies of the token
 * file, so a token edit that drifts from the code fails here.
 * `scripts/check-component-token-binding.mjs` is the repo-wide ratchet.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const tokensCss = readFileSync(resolve(ROOT, 'src/styles/tokens.generated.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = tokensCss.indexOf(`${selector} {`);
  expect(start, `no ${selector} block in tokens.generated.css`).toBeGreaterThanOrEqual(0);
  const body = tokensCss.slice(start, tokensCss.indexOf('\n}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*(.+?);/gm)) out[m[1]] = m[2];
  return out;
}
const light = block(':root');
const dark = { ...light, ...block('[data-theme="dark"]') };

function resolveVar(vars: Record<string, string>, name: string): string {
  let value = vars[name];
  for (let i = 0; value !== undefined && i < 10; i++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) return value;
    value = vars[ref[1]];
  }
  throw new Error(`could not resolve ${name}`);
}

/** token var -> [what the code renders, as a px string or the var of the semantic role it resolves to] */
const PX: Array<[string, string, string]> = [
  ['--component-button-paddingY', '8px', 'py-2'],
  ['--component-button-size-md-paddingY', '8px', 'py-2'],
  ['--component-button-size-sm-paddingX', '12px', 'px-3'],
  ['--component-button-size-sm-height', '32px', 'h-8'],
  ['--component-button-size-sm-itemSpacing', '8px', 'base gap-2'],
  ['--component-button-size-lg-fontSize', '16px', 'hds-type-ui'],
  ['--component-input-paddingX', '12px', 'pl-3 pr-3'],
  ['--component-card-radius', '12px', 'rounded-lg (role.radius + 4px)'],
  ['--component-card-gap', '16px', "gap='tight' = semantic.space.scale.sm"],
];

const COLOR: Array<[string, string, string]> = [
  [
    '--component-button-secondary-bg-hover',
    '--semantic-color-surface-accentSubtle',
    'hover:bg-accent',
  ],
  [
    '--component-button-secondary-border-hover',
    '--semantic-color-border-accent',
    'hover:border-ring',
  ],
  [
    '--component-button-secondary-border-pressed',
    '--semantic-color-border-accent',
    'hover:border-ring (still applies while pressed)',
  ],
  [
    '--component-button-secondary-border-disabled',
    '--semantic-color-border-subdued',
    'disabled:border-[color:var(--component-button-secondary-border-disabled)] (hds#595 decision 4)',
  ],
  ['--component-input-bg', '--semantic-color-surface-page', 'bg-background'],
  [
    '--component-tag-background',
    '--semantic-color-surface-raised',
    'bg-[var(--semantic-color-surface-raised)]',
  ],
  [
    '--component-tag-text',
    '--semantic-color-content-secondary',
    'text-[var(--semantic-color-content-secondary)]',
  ],
];

describe('component dimension tokens equal the rendered code value', () => {
  it.each(PX)('%s is %s (%s)', (name, px) => {
    expect(resolveVar(light, name)).toBe(px);
    expect(resolveVar(dark, name)).toBe(px);
  });
});

describe('component colour tokens equal the rendered code colour', () => {
  it.each(COLOR)('%s resolves like %s (%s) in light and dark', (name, role) => {
    expect(resolveVar(light, name)).toBe(resolveVar(light, role));
    expect(resolveVar(dark, name)).toBe(resolveVar(dark, role));
  });
});
