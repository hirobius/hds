/**
 * Soft surfaces (hds#891) + default hard shadow and wipe (hds#888): a Button is a soft
 * filled, borderless control with the zero-blur shadow and the directional wipe unless it
 * opts out (`shadow="none"`, `hoverEffect="none"`). Tertiary stays quiet: no shadow.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

describe('theme.css hard shadow', () => {
  const rule = (sel: string) => {
    const at = theme.indexOf(sel + ' {');
    expect(at).toBeGreaterThan(-1);
    return theme.slice(at, theme.indexOf('}', at));
  };

  it('rests at 3px in semantic.color.shadow.hard and composes with ring + inset wash', () => {
    const r = rule(".hds-btn-hard:not(:disabled, [aria-disabled='true'])");
    expect(r).toContain('--tw-shadow: var(--hds-hs, 3px 3px) 0 var(--semantic-color-shadow-hard)');
    expect(r).toMatch(/box-shadow:[^;]*--tw-inset-shadow[^;]*--tw-ring-shadow[^;]*--tw-shadow/);
  });

  it('lifts to 5px on hover and sinks to 1px on press; disabled never carries it', () => {
    expect(rule(".hds-btn-hard:not(:disabled, [aria-disabled='true']):hover")).toMatch(
      /--hds-hs: 5px 5px;\s*translate: -2px -2px/,
    );
    expect(rule(".hds-btn-hard:not(:disabled, [aria-disabled='true']):active")).toMatch(
      /--hds-hs: 1px 1px;\s*translate: 2px 2px/,
    );
  });

  it('Kbd follows the same light source by default: 2px hard key shadow, border.strong edge', () => {
    expect(rule('.hds-kbd')).toContain(
      'var(--semantic-shadow-key, 2px 2px 0 var(--semantic-color-shadow-hard))',
    );
    render(<Kbd>K</Kbd>);
    expect(classes(screen.getByText('K'))).toContain(
      'border-[color:var(--semantic-color-border-strong)]',
    );
  });
});
