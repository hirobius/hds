/**
 * Interactive states must be visibly distinct (hds#748 escape check).
 *
 * #753 shipped correct accent tokens, yet in dark the Primary button pressed
 * 1/255 off hover: the button never read the pressed token. Two checks so that
 * cannot pass again:
 *  1. every rest/hover/pressed token set differs step to step in both themes;
 *  2. every Button variant that binds a hover fill token binds a pressed fill
 *     token too, and the two resolve apart in both themes.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import tokens from '../../../hirobius.tokens.json';
import { Button } from './button';

afterEach(cleanup);

type Node = { $value?: unknown; $extensions?: Record<string, { modes?: Record<string, unknown> }> };
const MODES = ['Light', 'Dark'] as const;
// 1.05:1 is well past a 1/255 step (~1.01) and below the smallest step the
// system ships today; raise it, never lower it.
const MIN_RATIO = 1.05;
// Known pairs under the floor, tracked in hds#769. Each must still be under it:
// once one is fixed this fails, so the entry gets removed (a ratchet, not a skip).
const KNOWN_UNDER = new Set([
  'semantic.color.surface.pressed Light',
  'component.button.secondary.bg.pressed Light',
  'component.button.secondary.border.pressed Light',
  'component.button.secondary.border.pressed Dark',
]);

const at = (path: string): Node => {
  let node: unknown = tokens;
  for (const p of path.split('.')) node = (node as Record<string, unknown>)?.[p];
  if (!node || typeof node !== 'object' || !('$value' in node)) throw new Error(`No token ${path}`);
  return node as Node;
};

const resolve = (path: string, mode: string): string => {
  const node = at(path);
  const v = node.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node.$value;
  if (typeof v === 'string' && v.startsWith('{')) return resolve(v.slice(1, -1), mode);
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}/i.test(v))
    throw new Error(`${path} is not a hex colour`);
  return v;
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Every token group holding a hover and a pressed state, found by walking the
// tree so a new state set is covered without editing this list.
const stateSets = (): Array<{ group: string; steps: string[] }> => {
  const out: Array<{ group: string; steps: string[] }> = [];
  const walk = (node: Record<string, unknown>, path: string[]) => {
    if ('$value' in node) return;
    const keys = Object.keys(node).filter((k) => !k.startsWith('$'));
    const pick = (...names: string[]) => names.find((n) => keys.includes(n));
    const hover = pick('hover', 'bgHover');
    const pressed = pick('pressed', 'bgPressed');
    if (hover && pressed) {
      const rest = pick('rest', 'bg');
      const steps = [rest, hover, pressed].filter(Boolean) as string[];
      if (steps.every((s) => '$value' in (node[s] as object))) {
        out.push({ group: path.join('.'), steps: steps.map((s) => [...path, s].join('.')) });
      }
    }
    for (const k of keys) {
      const child = node[k];
      if (child && typeof child === 'object') walk(child as Record<string, unknown>, [...path, k]);
    }
  };
  walk(tokens as unknown as Record<string, unknown>, []);
  return out;
};

describe('interactive state tokens differ step to step', () => {
  const sets = stateSets();

  it('finds the state sets (accent, primary and secondary button)', () => {
    const groups = sets.map((s) => s.group);
    expect(groups).toEqual(
      expect.arrayContaining([
        'semantic.accent',
        'component.button',
        'component.button.secondary.bg',
      ]),
    );
  });

  for (const { steps } of sets) {
    for (let i = 1; i < steps.length; i++) {
      for (const mode of MODES) {
        const known = KNOWN_UNDER.has(`${steps[i]} ${mode}`);
        it(`${steps[i - 1]} → ${steps[i]} (${mode}) is at least ${MIN_RATIO}:1 apart${known ? ' (known under, hds#769)' : ''}`, () => {
          const r = ratio(resolve(steps[i - 1], mode), resolve(steps[i], mode));
          if (known) expect(r, 'fixed: remove it from KNOWN_UNDER').toBeLessThan(MIN_RATIO);
          else expect(r).toBeGreaterThanOrEqual(MIN_RATIO);
        });
      }
    }
  }
});

describe('Button pressed fill differs from its hover fill', () => {
  const VARIANTS = ['primary', 'secondary', 'tertiary'] as const;
  const fillVar = (classes: string[], state: 'hover' | 'active') =>
    classes
      .map((c) => c.match(new RegExp(`^${state}:bg-\\[(?:color:)?var\\(--([\\w-]+)\\)\\]$`))?.[1])
      .find(Boolean);

  for (const variant of VARIANTS) {
    it(`${variant}: a hover fill token implies a distinct pressed fill token in both themes`, () => {
      const { getByRole } = render(<Button variant={variant}>Go</Button>);
      const classes = getByRole('button').className.split(/\s+/);
      const hover = fillVar(classes, 'hover');
      if (!hover) return; // hover is a utility class, not a bound token
      const active = fillVar(classes, 'active');
      expect(active, `${variant} binds hover --${hover} but no pressed fill token`).toBeDefined();
      for (const mode of MODES) {
        const r = ratio(
          resolve(hover.replace(/-/g, '.'), mode),
          resolve(active!.replace(/-/g, '.'), mode),
        );
        expect(r, `${variant} ${mode} hover vs pressed`).toBeGreaterThanOrEqual(MIN_RATIO);
      }
    });
  }
});
