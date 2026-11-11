/**
 * Taller, bolder buttons (hds#760): one height step up (sm 36, md 44, lg 52)
 * and a semibold (600, Sora SemiBold) label, both carried by `component.button.*` tokens the component
 * binds by var(), so the tokens and the rendered box cannot drift apart.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { Button } from '@/app/components/button';

afterEach(cleanup);

const ROOT = resolve(__dirname, '..');
const tokensCss = readFileSync(resolve(ROOT, 'src/styles/tokens.generated.css'), 'utf8');

const rootStart = tokensCss.indexOf(':root {');
const rootBody = tokensCss.slice(rootStart, tokensCss.indexOf('\n}', rootStart));
const vars: Record<string, string> = {};
for (const m of rootBody.matchAll(/^\s*(--[\w-]+):\s*(.+?);/gm)) vars[m[1]] = m[2];

function resolveVar(name: string): string {
  let value = vars[name];
  for (let i = 0; value !== undefined && i < 10; i++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) return value;
    value = vars[ref[1]];
  }
  throw new Error(`could not resolve ${name}`);
}

const HEIGHT = { sm: '36px', md: '44px', lg: '52px' } as const;

describe('Button height tokens (hds#760)', () => {
  it.each(Object.entries(HEIGHT))('%s height token resolves to %s', (size, px) => {
    expect(resolveVar(`--component-button-size-${size}-height`)).toBe(px);
  });

  it.each(Object.keys(HEIGHT) as Array<keyof typeof HEIGHT>)(
    '%s binds its height token, and icon-only binds it as the width too',
    (size) => {
      const { getByRole, rerender } = render(<Button size={size}>Go</Button>);
      const token = `var(--component-button-size-${size}-height)`;
      expect(getByRole('button').className).toContain(`h-[${token}]`);
      rerender(<Button size={size} iconOnly label="Go" iconLeft={<svg />} />);
      expect(getByRole('button').className).toContain(`w-[${token}]`);
    },
  );
});

describe('Button label weight token (hds#760)', () => {
  it('resolves to 600', () => {
    expect(resolveVar('--component-button-fontWeight')).toBe('600');
  });

  it.each(['sm', 'md', 'lg'] as const)('%s label binds the weight token', (size) => {
    const { getByRole } = render(<Button size={size}>Go</Button>);
    expect(getByRole('button').className).toContain(
      '[font-weight:var(--component-button-fontWeight)]',
    );
  });
});
