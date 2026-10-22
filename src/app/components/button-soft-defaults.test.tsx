/**
 * Soft surfaces (hds#891) + default hard shadow and wipe (hds#888): a Button is a soft
 * filled, borderless control with the zero-blur shadow and the directional wipe unless it
 * opts out (`shadow="none"`, `hoverEffect="none"`). Tertiary stays quiet: no shadow.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type * as React from 'react';
import { Button } from './button';
import { Kbd } from './kbd';

afterEach(cleanup);

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const classes = (el: HTMLElement) => el.className.split(/\s+/);

describe('Button defaults (hds#888, hds#891)', () => {
  it.each(['primary', 'secondary', undefined] as const)(
    'variant=%s carries the hard shadow and the wipe by default',
    (variant) => {
      render(<Button variant={variant}>Go</Button>);
      const c = classes(screen.getByRole('button'));
      expect(c).toContain('hds-btn-hard');
      expect(c).toContain('hds-btn-wipe');
    },
  );

  it('shadow="none" opts out of the hard shadow and keeps the wipe', () => {
    render(<Button shadow="none">Go</Button>);
    const c = classes(screen.getByRole('button'));
    expect(c).not.toContain('hds-btn-hard');
    expect(c).toContain('hds-btn-wipe');
  });

  it('both opt-outs together render neither', () => {
    render(
      <Button shadow="none" hoverEffect="none">
        Go
      </Button>,
    );
    const c = classes(screen.getByRole('button'));
    expect(c).not.toContain('hds-btn-hard');
    expect(c).not.toContain('hds-btn-wipe');
  });

  it('tertiary is quiet: never the hard shadow, even when asked', () => {
    render(
      <Button variant="tertiary" shadow="hard">
        Go
      </Button>,
    );
    expect(classes(screen.getByRole('button'))).not.toContain('hds-btn-hard');
  });

  it('a status tone keeps the hard shadow', () => {
    render(<Button tone="danger">Delete</Button>);
    expect(classes(screen.getByRole('button'))).toContain('hds-btn-hard');
  });

  it('asChild links get the same defaults', () => {
    render(
      <Button asChild>
        <a href="/x">Go</a>
      </Button>,
    );
    const c = classes(screen.getByRole('link'));
    expect(c).toContain('hds-btn-hard');
    expect(c).toContain('hds-btn-wipe');
  });

  it('secondary is soft: a tonal fill, no border at rest', () => {
    render(<Button>Go</Button>);
    const c = classes(screen.getByRole('button'));
    expect(c).toContain('bg-[color:var(--component-button-secondary-bg-rest)]');
    expect(c.filter((k) => /^border(-|$)/.test(k))).toEqual([]);
  });
});

describe('Button own-colour edge (hds#896)', () => {
  const edge = (el: HTMLElement) => el.style.getPropertyValue('--hds-edge');

  it.each([
    ['primary', undefined, 'primary'],
    ['secondary', undefined, 'secondary'],
    [undefined, undefined, 'secondary'],
    ['primary', 'danger', 'danger'],
    ['secondary', 'info', 'info'],
    ['secondary', 'neutral', 'secondary'],
  ] as const)('variant=%s tone=%s sets --hds-edge to --hds-edge-%s', (variant, tone, key) => {
    render(
      <Button variant={variant} tone={tone}>
        Go
      </Button>,
    );
    expect(edge(screen.getByRole('button'))).toBe(`var(--hds-edge-${key})`);
  });

  it('sets no edge without the shadow (tertiary, shadow="none"), with or without the wipe', () => {
    render(
      <>
        <Button variant="tertiary">A</Button>
        <Button shadow="none">B</Button>
        <Button hoverEffect="none">C</Button>
      </>,
    );
    expect(edge(screen.getByText('A').closest('button')!)).toBe('');
    expect(edge(screen.getByText('B').closest('button')!)).toBe('');
    expect(edge(screen.getByText('C').closest('button')!)).toBe('var(--hds-edge-secondary)');
  });

  it('a consumer style still wins, and --hds-btn-edge outranks the default in theme.css', () => {
    render(<Button style={{ '--hds-edge': 'red' } as React.CSSProperties}>Go</Button>);
    expect(edge(screen.getByRole('button'))).toBe('red');
    expect(theme).toContain('var(--hds-btn-edge, var(--hds-edge))');
  });
});

describe('theme.css hard shadow', () => {
  const rule = (sel: string) => {
    const at = theme.indexOf(sel + ' {');
    expect(at).toBeGreaterThan(-1);
    return theme.slice(at, theme.indexOf('}', at));
  };

  it('rests 3px straight down in --hds-btn-edge (default: own-colour edge), composing with ring + inset wash', () => {
    const r = rule(".hds-btn-hard:not(:disabled, [aria-disabled='true'])");
    expect(r).toContain('--tw-shadow: 0 var(--hds-hs, 3px) 0 var(--hds-btn-edge, var(--hds-edge))');
    expect(r).toMatch(/box-shadow:[^;]*--tw-inset-shadow[^;]*--tw-ring-shadow[^;]*--tw-shadow/);
  });

  it('grows to 5px on hover (hover pointers only) and sinks to 1px on press, without moving the box', () => {
    expect(rule('.hds-btn-hard:hover')).toContain('--hds-hs: 5px;');
    const hoverAt = theme.indexOf('.hds-btn-hard:hover');
    expect(theme.slice(hoverAt - 40, hoverAt)).toContain('(hover: hover)');
    expect(rule('.hds-btn-hard:active')).toContain('--hds-hs: 1px;');
    const start = theme.indexOf('.hds-btn-hard:not(');
    expect(theme.slice(start, theme.indexOf('.hds-btn-hard:active', start))).not.toMatch(
      /translate:/,
    );
  });

  it('lives in the components layer, so a consumer shadow utility still wins', () => {
    const at = theme.indexOf(".hds-btn-hard:not(:disabled, [aria-disabled='true'])");
    expect(theme.slice(theme.lastIndexOf('*/', at), at)).toContain('@layer components {');
  });

  it('Kbd follows the same light source by default: 2px straight-down key shadow, border.strong edge', () => {
    expect(rule('.hds-kbd').replace(/\s+/g, ' ')).toContain(
      'var( --semantic-shadow-key, 0 2px 0 var(--hds-kbd-edge, var(--hds-edge-kbd)) )',
    );
    render(<Kbd>K</Kbd>);
    expect(classes(screen.getByText('K'))).toContain(
      'border-[color:var(--semantic-color-border-strong)]',
    );
  });
});
