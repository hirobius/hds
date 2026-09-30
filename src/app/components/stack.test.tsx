/**
 * hds#206 item 4: Stack's `gap` and Box's `sx` spacing resolve through one
 * resolver (box-sx.ts `resolveSpacingValue`), each with its own vocabulary
 * frozen at what it rendered before hds#206.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import hds from '../design-system/tokens';
import { Stack, type StackProps } from './stack';
import { resolveSx } from './box-sx';

afterEach(cleanup);

type Gap = NonNullable<StackProps['gap']>;

/** What every Stack `gap` value rendered before the single resolver. It must not move. */
const TODAY: Record<string, string> = {
  tight: 'var(--semantic-space-scale-sm)',
  normal: 'var(--semantic-space-scale-md)',
  inset: 'var(--semantic-space-scale-lg)',
  spacious: 'var(--semantic-space-scale-xl)',
  stack: 'var(--semantic-space-section-stack)',
  gap: 'var(--semantic-space-scale-xs)',
  medium: 'var(--semantic-space-component-medium)',
  hairline: 'var(--semantic-space-subgrid-hairline)',
  // The 2px subgrid step, not scale.xs (8px): see STACK_GAP in stack.tsx.
  xs: 'var(--semantic-space-subgrid-xs)',
  ...(hds.space as Record<string, string>),
};

const gapOf = (gap: Gap) => {
  render(
    <Stack gap={gap}>
      <span>a</span>
    </Stack>,
  );
  const el = screen.getByText('a').parentElement as HTMLElement;
  return el.style.getPropertyValue('gap');
};

describe('Stack gap', () => {
  it.each(Object.entries(TODAY))('renders %s as %s, unchanged', (gap, css) => {
    expect(gapOf(gap as Gap)).toBe(css);
  });

  it('defaults to tight', () => {
    render(
      <Stack>
        <span>a</span>
      </Stack>,
    );
    expect((screen.getByText('a').parentElement as HTMLElement).style.gap).toBe(TODAY.tight);
  });

  it.each([
    ['gap', 'xs'],
    ['tight', 'sm'],
    ['normal', 'md'],
    ['inset', 'lg'],
    ['spacious', 'xl'],
  ])('renders %s as the scale step Box sx names %s', (gap, step) => {
    const [rule] = resolveSx({ gap: step }, 'c');
    expect(`.c{gap:${gapOf(gap as Gap)}}`).toBe(rule);
  });

  // Untyped strings ('sm'..'xl') pass through too; jsdom drops them as invalid
  // CSS, so spacing-computed-lock.test.mjs checks those from the SSR markup.
  it.each([
    [4, '4px'],
    [0, '0px'],
  ])('keeps an untyped number %s as raw px, as before hds#206', (gap, css) => {
    expect(gapOf(gap as unknown as Gap)).toBe(css);
  });

  it('has no resolver of its own: it calls box-sx resolveSpacingValue', () => {
    const source = readFileSync(join(__dirname, 'stack.tsx'), 'utf8');
    expect(source).toMatch(/import \{[^}]*\bresolveSpacingValue\b[^}]*\} from '\.\/box-sx'/);
    expect(source).not.toMatch(/getGapValue/);
  });
});
