/**
 * Contract test: touch size for small controls (hds#750). The .hds-touch-row and
 * .hds-touch-target hooks lift a control to semantic.size.touchTarget on a coarse
 * pointer (and on a narrow viewport, as before), so a phone gets 44px targets with
 * no host CSS. A fine pointer on a wide viewport matches neither query, so desktop
 * density is unchanged. The components that carry the hooks are pinned below.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, it, expect } from 'vitest';
import { Button } from '../../app/components/button';
import { Tag } from '../../app/components/tag';
import { Disclosure } from '../../app/components/disclosure';
import { Tabs, TabsList, TabsTrigger } from '../../app/components/tabs';
import { Input } from '../../app/components/input';

afterEach(cleanup);

const css = readFileSync(resolve(__dirname, '../theme.css'), 'utf8');
const tokens = readFileSync(resolve(__dirname, '../tokens.generated.css'), 'utf8');

const TOUCH_QUERY = '@media (max-width: 639px), (pointer: coarse)';

function touchBlock(): string {
  const start = css.indexOf(TOUCH_QUERY);
  if (start === -1) throw new Error(`${TOUCH_QUERY} not found in theme.css`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error('unbalanced touch media block');
}

describe('touch target token', () => {
  it('ships semantic.size.touchTarget at the 44px interactive minimum', () => {
    expect(tokens).toMatch(
      /--semantic-size-touchTarget:\s*var\(--primitive-size-interactive-min\)/,
    );
  });
});

describe('touch target CSS', () => {
  it('lifts .hds-touch-row to the token on a coarse pointer or narrow viewport', () => {
    const rule = touchBlock().match(/\.hds-touch-row\s*\{([^}]*)\}/);
    expect(rule, '.hds-touch-row inside the touch query').toBeTruthy();
    expect(rule![1]).toMatch(/min-height:\s*var\(--semantic-size-touchTarget\)/);
  });

  it('lifts .hds-touch-target in both axes', () => {
    const rule = touchBlock().match(/\.hds-touch-target\s*\{([^}]*)\}/)![1];
    expect(rule).toMatch(/min-height:\s*var\(--semantic-size-touchTarget\)/);
    expect(rule).toMatch(/min-width:\s*var\(--semantic-size-touchTarget\)/);
  });

  it('declares the hooks nowhere else, so a fine pointer on desktop is unchanged', () => {
    const outside = css.replace(touchBlock(), '');
    expect(outside).not.toMatch(/\.hds-touch-(row|target)\s*\{/);
  });
});

describe('small controls carry a touch hook', () => {
  it('Button sm lifts its height; icon-only sm lifts both axes', () => {
    render(
      <>
        <Button size="sm">Save</Button>
        <Button size="sm" iconOnly aria-label="Close">
          ×
        </Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Save' }).className).toContain('hds-touch-row');
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('hds-touch-target');
  });

  it('Button md and lg keep their own size (no touch hook)', () => {
    render(<Button size="lg">Big</Button>);
    expect(screen.getByRole('button', { name: 'Big' }).className).not.toMatch(/hds-touch-/);
  });

  it('Tag, Disclosure trigger and Tabs trigger carry hds-touch-row', () => {
    render(
      <>
        <Tag>Design</Tag>
        <Disclosure label="More">Body</Disclosure>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Alpha</TabsTrigger>
          </TabsList>
        </Tabs>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Design' }).className).toContain('hds-touch-row');
    expect(screen.getByRole('button', { name: /More/ }).className).toContain('hds-touch-row');
    expect(screen.getByRole('tab', { name: 'Alpha' }).className).toContain('hds-touch-row');
  });

  it('Input clear button carries hds-touch-target', () => {
    render(<Input aria-label="Name" defaultValue="Ada" />);
    expect(screen.getByRole('button', { name: 'Clear input' }).className).toContain(
      'hds-touch-target',
    );
  });
});
