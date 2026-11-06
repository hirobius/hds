import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock NumberFlow so the test reads the props HDS passes, without the custom
// element's Web Animations in jsdom.
const seen: Array<Record<string, unknown>> = [];
vi.mock('@number-flow/react', () => ({
  default: (props: Record<string, unknown>) => {
    seen.push(props);
    return React.createElement('span', { 'data-testid': 'flow' }, String(props.value));
  },
}));

import { NumberValue } from './number-value';

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('NumberValue', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    seen.length = 0;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('animates a change with the productive motion token', () => {
    mockReducedMotion(false);
    act(() => root.render(<NumberValue value={42} />));
    const props = seen.at(-1)!;
    expect(props.value).toBe(42);
    expect(props.animated).toBe(true);
    expect(props.transformTiming).toEqual({ duration: 150, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
    expect(props.opacityTiming).toEqual({ duration: 150, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
    expect(props.spinTiming).toEqual({ duration: 150, easing: 'cubic-bezier(0, 0, 0.2, 1)' });
  });

  it('renders the final value with no animation under reduced motion', () => {
    mockReducedMotion(true);
    act(() => root.render(<NumberValue value={7} />));
    act(() => root.render(<NumberValue value={8} />));
    const props = seen.at(-1)!;
    expect(props.value).toBe(8);
    expect(props.animated).toBe(false);
    expect(container.textContent).toBe('8');
  });

  it('passes format, locales, prefix and suffix through', () => {
    mockReducedMotion(false);
    act(() =>
      root.render(
        <NumberValue
          value={0.5}
          format={{ style: 'percent' }}
          locales="en-GB"
          prefix="~"
          suffix="!"
        />,
      ),
    );
    expect(seen.at(-1)).toMatchObject({
      format: { style: 'percent' },
      locales: 'en-GB',
      prefix: '~',
      suffix: '!',
    });
  });
});

describe('the ./number subpath', () => {
  const repo = join(__dirname, '../..');
  const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));

  it('is a package export, and NumberFlow is an optional peer', () => {
    expect(pkg.exports['./number']).toEqual({
      types: './dist/types/src/number/index.d.ts',
      import: './dist/number.js',
      default: './dist/number.js',
    });
    expect(pkg.peerDependencies['@number-flow/react']).toBeTruthy();
    expect(pkg.peerDependenciesMeta['@number-flow/react']).toEqual({ optional: true });
    expect(pkg.dependencies?.['@number-flow/react']).toBeUndefined();
  });

  it('is the only place that imports NumberFlow', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });
    const importers = walk(join(repo, 'src'))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => /from ['"]@number-flow\//.test(readFileSync(f, 'utf8')))
      .map((f) => relative(repo, f));
    expect(importers).toEqual(['src/number/number-value.tsx']);
  });
});
