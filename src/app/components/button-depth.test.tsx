/**
 * C2 button depth: one fixed base. The hard edge sits under the box, and the face moves
 * while the edge shrinks by the same amount, so the bottom of the edge never moves and
 * the button compresses (hds#1196: rest 0 / 3px, hover 1px / 2px, press 3px / 0px). The
 * depth is one token set, component.button.depth.{edge,hoverOffset,pressedOffset}
 * (hds#1387), shared by every raised variant, tone, size and icon-only Button. No top
 * highlight, no soft drop shadow. Tertiary is the ghost: no edge, no movement. Selected
 * states take the primary fill and the primary edge.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
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
const tokens = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
);
const DEPTH = 'var(--component-button-depth-edge)';
const HOVER = 'var(--component-button-depth-hoverOffset)';
const PRESS = 'var(--component-button-depth-pressedOffset)';
/** A depth token's px value, following the alias to its primitive. */
function depthPx(key: 'edge' | 'hoverOffset' | 'pressedOffset'): number {
  const ref: string = tokens.component.button.depth[key].$value;
  const node = ref
    .slice(1, -1)
    .split('.')
    .reduce((n: Record<string, unknown>, k) => n[k] as Record<string, unknown>, tokens);
  const v = node.$value as { value: number; unit: string };
  expect(v.unit).toBe('px');
  return v.value;
}
/** Resolve a state's CSS value (a depth var, or a calc of two) to px. */
function px(v: string | undefined): number {
  const vars: Record<string, number> = {
    [DEPTH]: depthPx('edge'),
    [HOVER]: depthPx('hoverOffset'),
    [PRESS]: depthPx('pressedOffset'),
  };
  const s = (v ?? '0').replace(/\s+/g, ' ').trim();
  if (s in vars) return vars[s];
  const m = s.match(/^calc\( ?(var\([^)]+\)) - (var\([^)]+\)) ?\)$/);
  if (m) return vars[m[1]] - vars[m[2]];
  return Number.parseFloat(s);
}

describe('fixed base: the bottom of the edge never moves', () => {
  const base = rule(".hds-btn-hard:not(:disabled, [aria-disabled='true'])");
  const states = {
    rest: { ty: '0px', hs: DEPTH },
    hover: {
      ty: prop(rule('.hds-btn-hard:hover'), '--hds-ty'),
      hs: prop(rule('.hds-btn-hard:hover'), '--hds-hs'),
    },
    active: {
      ty: prop(rule('.hds-btn-hard:active'), '--hds-ty'),
      hs: prop(rule('.hds-btn-hard:active'), '--hds-hs'),
    },
  };

  it('the depth tokens hold the C2 values: a 3px edge, 1px hover, 3px press', () => {
    expect([depthPx('edge'), depthPx('hoverOffset'), depthPx('pressedOffset')]).toEqual([3, 1, 3]);
  });

  it('rest: translateY(0) on the depth.edge token', () => {
    expect(base.replace(/\s+/g, ' ')).toContain(`0 var(--hds-hs, ${DEPTH}) 0`);
    expect(prop(base, 'translate')).toBe('0 var(--hds-ty, 0px)');
  });

  it('hover compresses: the face sinks 1px onto a 2px edge, on hover-capable pointers only', () => {
    expect(states.hover.ty).toBe(HOVER);
    expect([px(states.hover.ty), px(states.hover.hs)]).toEqual([1, 2]);
    const at = theme.indexOf('.hds-btn-hard:hover');
    expect(theme.slice(at - 40, at)).toContain('(hover: hover)');
  });

  it('press compresses fully: the face sinks 3px onto a 0px edge', () => {
    expect(states.active.ty).toBe(PRESS);
    expect([px(states.active.ty), px(states.active.hs)]).toEqual([3, 0]);
  });

  it('the edge only shrinks: rest > hover > press, and the face never rises', () => {
    expect(px(states.rest.hs)).toBeGreaterThan(px(states.hover.hs));
    expect(px(states.hover.hs)).toBeGreaterThan(px(states.active.hs));
    for (const s of Object.values(states)) expect(px(s.ty)).toBeGreaterThanOrEqual(0);
  });

  it('translate + edge offset is the same in every state', () => {
    const sums = Object.values(states).map((s) => px(s.ty) + px(s.hs));
    expect(new Set(sums)).toEqual(new Set([3]));
  });

  it('a hit band over the travel keeps a sinking button under the pointer', () => {
    expect(prop(base, 'position')).toBe('relative');
    const band = rule(".hds-btn-hard:not(:disabled, [aria-disabled='true'])::after");
    expect(prop(band, 'position')).toBe('absolute');
    expect(prop(band, 'inset')).toBe(`calc(-1 * ${DEPTH}) 0`);
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

// hds#1387: every Button looks raised. Every filled variant, tone, size, icon-only and toggle
// Button takes the same .hds-btn-hard depth (component.button.depth.*) and an edge colour;
// only the ghost (tertiary) and link stay flat, by design.
describe('one raised treatment for every filled Button (hds#1387)', () => {
  const cases: [string, () => React.ReactElement][] = [
    ['primary', () => <Button variant="primary">A</Button>],
    ['secondary', () => <Button variant="secondary">A</Button>],
    [
      'danger',
      () => (
        <Button variant="primary" tone="danger">
          A
        </Button>
      ),
    ],
    ['success', () => <Button tone="success">A</Button>],
    ['warning', () => <Button tone="warning">A</Button>],
    ['info', () => <Button tone="info">A</Button>],
    [
      'primary sm',
      () => (
        <Button variant="primary" size="sm">
          A
        </Button>
      ),
    ],
    [
      'primary lg',
      () => (
        <Button variant="primary" size="lg">
          A
        </Button>
      ),
    ],
    [
      'icon-only primary',
      () => <Button variant="primary" iconOnly label="Add" iconLeft={<svg />} />,
    ],
    ['icon-only secondary', () => <Button iconOnly size="sm" label="Add" iconLeft={<svg />} />],
    ['toggle on', () => <Button defaultPressed>On</Button>],
    ['toggle off', () => <Button defaultPressed={false}>Off</Button>],
  ];

  it.each(cases)('%s is raised, with an edge colour', (_, make) => {
    render(make());
    const btn = screen.getByRole('button');
    expect(classes(btn)).toContain('hds-btn-hard');
    expect(btn.style.getPropertyValue('--hds-edge')).toMatch(
      /^var\(--(hds|component-button)-edge-/,
    );
  });

  it('primary paints its own edge token in light and dark', () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole('button').style.getPropertyValue('--hds-edge')).toBe(
      'var(--hds-edge-primary)',
    );
  });

  it.each([
    ['ghost', () => <Button variant="tertiary">A</Button>],
    ['link', () => <Button variant="link">A</Button>],
  ] as [string, () => React.ReactElement][])('%s is the flat exception', (_, make) => {
    render(make());
    expect(classes(screen.getByRole('button'))).not.toContain('hds-btn-hard');
  });

  it('the theme carries no literal depth: every offset reads a depth token', () => {
    const at = theme.indexOf('@layer components {\n  .hds-btn-hard');
    const block = theme.slice(at, theme.indexOf('/* Focus wraps face AND edge', at));
    expect(block).not.toMatch(/--hds-(ty|hs):\s*\d/);
    expect(block).not.toMatch(/-?\dpx 0 -?\dpx/);
  });
});

// Adrian 2026-11-05: a primary Button's hover fill is component.button.bgHover, so its hover
// edge is that fill's own step (--hds-edge-primaryHover), not the rest edge.
describe('primary hover edge', () => {
  it('primary carries its hover edge; secondary does not', () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button variant="secondary">Cancel</Button>
      </>,
    );
    const [primary, secondary] = screen.getAllByRole('button');
    expect(primary!.style.getPropertyValue('--hds-edge-hover')).toBe(
      'var(--hds-edge-primaryHover)',
    );
    expect(secondary!.style.getPropertyValue('--hds-edge-hover')).toBe('');
  });
});
