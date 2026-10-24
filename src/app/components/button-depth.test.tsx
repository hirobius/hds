/**
 * C2 button depth: one fixed base. The hard edge sits under the box, and the face moves
 * while the edge grows or shrinks by the same amount, so the bottom of the edge never
 * moves (rest 0 / 3px, hover -1px / 4px, press 2px / 1px). No top highlight, no soft drop
 * shadow. Tertiary is the ghost: no edge, no movement. Selected states take the primary
 * fill and the primary edge.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from './button';
import { Tag } from './tag';
import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const classes = (el: Element) => el.className.split(/\s+/);

/** The body of the first rule whose selector is exactly `sel`. */
function rule(sel: string): string {
  const at = theme.indexOf(sel + ' {');
  expect(at, sel).toBeGreaterThan(-1);
  return theme.slice(at, theme.indexOf('}', at));
}
const prop = (body: string, name: string) =>
  body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
const px = (v: string | undefined) => Number.parseFloat(v ?? '0');

describe('fixed base: the bottom of the edge never moves', () => {
  const base = rule(".hds-btn-hard:not(:disabled, [aria-disabled='true'])");
  const states = {
    rest: { ty: '0px', hs: '3px' },
    hover: {
      ty: prop(rule('.hds-btn-hard:hover'), '--hds-ty'),
      hs: prop(rule('.hds-btn-hard:hover'), '--hds-hs'),
    },
    active: {
      ty: prop(rule('.hds-btn-hard:active'), '--hds-ty'),
      hs: prop(rule('.hds-btn-hard:active'), '--hds-hs'),
    },
  };

  it('rest: translateY(0) with a 3px edge', () => {
    expect(base.replace(/\s+/g, ' ')).toContain('0 var(--hds-hs, 3px) 0');
    expect(prop(base, 'translate')).toBe('0 var(--hds-ty, 0px)');
  });

  it('hover lifts 1px onto a 4px edge, on hover-capable pointers only', () => {
    expect(states.hover).toEqual({ ty: '-1px', hs: '4px' });
    const at = theme.indexOf('.hds-btn-hard:hover');
    expect(theme.slice(at - 40, at)).toContain('(hover: hover)');
  });

  it('press sinks 2px onto a 1px edge', () => {
    expect(states.active).toEqual({ ty: '2px', hs: '1px' });
  });

  it('translate + edge offset is the same in every state', () => {
    const sums = Object.values(states).map((s) => px(s.ty) + px(s.hs));
    expect(new Set(sums)).toEqual(new Set([3]));
  });

  it('a hit band over the travel keeps a lifting or sinking button under the pointer', () => {
    expect(prop(base, 'position')).toBe('relative');
    const band = rule(".hds-btn-hard:not(:disabled, [aria-disabled='true'])::after");
    expect(prop(band, 'position')).toBe('absolute');
    expect(prop(band, 'inset')).toBe('-2px 0 -4px');
  });

  it('moves on the productive motion token (zeroed under reduced motion)', () => {
    const t = prop(base, 'transition') ?? '';
    expect(t).toMatch(/translate var\(--hds-motion-productive\)/);
    expect(t).toMatch(/box-shadow var\(--hds-motion-productive\)/);
    expect(theme).toMatch(
      /prefers-reduced-motion: reduce\)\s*{\s*:root\s*{[^}]*--hds-motion-productive-duration: 0s/,
    );
  });

  it('only the hard edge: no top highlight, no blurred drop shadow', () => {
    const all = [base, rule('.hds-btn-hard:hover'), rule('.hds-btn-hard:active')].join('\n');
    expect(all).not.toMatch(/inset 0 1px/);
    expect(all).not.toMatch(/0 \d+px [1-9]\d*px/); // a blur radius
    expect(theme).not.toMatch(/box never moves/);
  });

  it('Button transitions translate and box-shadow itself (its utility beats the layer)', () => {
    render(<Button>Go</Button>);
    const c = classes(screen.getByRole('button'));
    const t = c.find((k) => k.startsWith('transition-['));
    expect(t).toMatch(/translate/);
    expect(t).toMatch(/box-shadow/);
    expect(c).toContain('duration-[var(--hds-motion-productive-duration)]');
    expect(c).toContain('ease-[var(--hds-motion-productive-easing)]');
  });
});

describe('every variant shares one box per size', () => {
  const geometry = (el: Element) =>
    classes(el).filter((k) =>
      /^(h-|py-|pt-|pb-|border(-[trbl])?(-\d)?$|leading-|hds-type-|translate-)/.test(k),
    );

  it.each(['sm', 'md', 'lg'] as const)('size=%s: same height, padding and type role', (size) => {
    render(
      <>
        <Button size={size} variant="primary">
          A
        </Button>
        <Button size={size} variant="secondary">
          B
        </Button>
        <Button size={size} variant="tertiary">
          C
        </Button>
        <Button size={size} tone="danger">
          D
        </Button>
        <Button size={size} defaultPressed>
          E
        </Button>
      </>,
    );
    const [first, ...rest] = screen.getAllByRole('button').map(geometry);
    expect(first.some((k) => k.startsWith('h-'))).toBe(true);
    for (const g of rest) expect(g).toEqual(first);
  });
});

describe('ghost (tertiary)', () => {
  it('has no edge and no movement', () => {
    render(<Button variant="tertiary">Clear filters</Button>);
    const el = screen.getByRole('button');
    expect(classes(el)).not.toContain('hds-btn-hard');
    expect(el.style.getPropertyValue('--hds-edge')).toBe('');
  });

  it('rests transparent, wipes in its hover fill, and presses deeper', () => {
    render(<Button variant="tertiary">Clear filters</Button>);
    const el = screen.getByRole('button');
    const c = classes(el);
    expect(c.some((k) => /^bg-(?!transparent)/.test(k) && !k.includes(':'))).toBe(false);
    expect(classes(el)).toContain('hds-btn-wipe');
    expect(el.style.getPropertyValue('--hds-wipe-fill')).toBe(
      'var(--component-button-tertiary-bg-hover)',
    );
    expect(c).toContain('active:bg-[color:var(--component-button-tertiary-bg-pressed)]');
    expect(c).toContain('active:inset-shadow-transparent');
  });

  it('without the wipe, hover fills in place', () => {
    render(
      <Button variant="tertiary" hoverEffect="none">
        Clear
      </Button>,
    );
    expect(classes(screen.getByRole('button'))).toContain(
      'hover:bg-[color:var(--component-button-tertiary-bg-hover)]',
    );
  });

  it('binds surface.hover and a deeper press fill', () => {
    const tokens = JSON.parse(
      readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
    );
    expect(tokens.component.button.tertiary.bg.hover.$value).toBe('{semantic.color.surface.hover}');
    expect(tokens.component.button.tertiary.bg.pressed.$value).toBe(
      '{semantic.color.surface.soft}',
    );
  });
});

describe('wipe', () => {
  it('the layer is clipped by the button radius (overflow + isolate) and eases on the productive curve', () => {
    render(<Button>Go</Button>);
    const c = classes(screen.getByRole('button'));
    expect(c).toEqual(expect.arrayContaining(['rounded-md', 'isolate']));
    // No overflow clip on the button: it would clip the .hds-btn-hard::after hit band.
    expect(c).not.toContain('overflow-hidden');
    expect(prop(rule('.hds-btn-wipe::before'), 'border-radius')).toBe('inherit');
    expect(prop(rule('.hds-btn-wipe::before'), 'transition')).toContain(
      'var(--hds-motion-productive)',
    );
  });

  it('a pressed toggle wipes in the primary hover fill, not the secondary one', () => {
    render(<Button defaultPressed>On</Button>);
    expect(screen.getByRole('button').style.getPropertyValue('--hds-wipe-fill')).toBe(
      'var(--component-button-bgHover)',
    );
  });
});

describe('selected states take the primary fill and the primary edge', () => {
  it('pressed toggle', () => {
    render(<Button defaultPressed>On</Button>);
    const el = screen.getByRole('button');
    expect(classes(el)).toContain('data-[pressed=true]:bg-primary');
    expect(el.style.getPropertyValue('--hds-edge')).toBe('var(--hds-edge-primary)');
  });

  it('selected filter chip (Tag)', () => {
    render(<Tag active>Hiring now</Tag>);
    const pill = screen.getByText('Hiring now');
    expect(classes(pill)).toContain('bg-[var(--component-tag-activeBackground)]');
    expect(classes(pill)).toContain('shadow-[0_3px_0_var(--hds-edge-primary)]');
  });

  it('selected segment (primary variant)', () => {
    render(
      <SegmentedControl
        aria-label="View"
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Watched' },
          { value: 'b', label: 'Apply now' },
        ]}
      />,
    );
    const radio = screen.getByRole('radio', { name: /Watched/ });
    const indicator = radio.querySelector('[class*="--semantic-accent-rest"]')!;
    expect(indicator).not.toBeNull();
    expect(classes(indicator)).toContain('shadow-[inset_0_-3px_0_var(--hds-edge-primary)]');
  });
});
