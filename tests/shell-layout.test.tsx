/**
 * hds#863 slice 4 (Roleforge shell layout): Container `shell` width (1180px)
 * with the token-driven page gutter, and TabsList `align="start"`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Container } from '../src/app/components/container';
import { Tabs, TabsList, TabsTrigger } from '../src/app/components/tabs';

afterEach(cleanup);

const tokens = JSON.parse(readFileSync(resolve(__dirname, '../hirobius.tokens.json'), 'utf8'));
const css = readFileSync(resolve(__dirname, '../src/styles/tokens.generated.css'), 'utf8');

describe('Container shell width', () => {
  it('semantic.layout.width.shell resolves to the 1180px primitive', () => {
    expect(tokens.semantic.layout.width.shell.$value).toBe('{primitive.size.width.1180}');
    expect(tokens.primitive.size.width['1180'].$value).toEqual({ value: 1180, unit: 'px' });
    expect(css).toMatch(/--semantic-layout-width-shell:\s*var\(--primitive-size-width-1180\)/);
  });

  it('maxWidth="shell" maps to the shell token var, not a literal', () => {
    const { container } = render(<Container maxWidth="shell">x</Container>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.maxWidth).toBe('var(--semantic-layout-width-shell)');
    expect(el.style.marginLeft).toBe('auto');
  });

  it('gutter pads inline from the region gutter token (fluid per viewport and density)', () => {
    const { container } = render(
      <Container maxWidth="shell" gutter>
        x
      </Container>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.paddingInline).toBe('var(--semantic-space-region-gutter)');
    // The token itself retunes per density and viewport in theme.css, never a raw px.
    expect(tokens.semantic.space.region.gutter.$value).toBe('{semantic.space.scale.lg}');
  });

  it('existing sizes and the no-gutter default are unchanged', () => {
    const html = renderToStaticMarkup(<Container maxWidth="max">x</Container>);
    expect(html).toBe(
      '<div style="margin-left:auto;margin-right:auto;max-width:var(--semantic-layout-width-max)">x</div>',
    );
  });
});

function Strip(props: { align?: 'start' }) {
  return (
    <Tabs defaultValue="a">
      <TabsList aria-label="Sections" {...props}>
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

describe('TabsList align', () => {
  it('align="start" pulls the strip flush to the column start', () => {
    const { getByRole } = render(<Strip align="start" />);
    const list = getByRole('tablist');
    expect(list.getAttribute('data-align')).toBe('start');
    expect(list.className).toContain('-ms-fixed-xs');
  });

  it('the default renders the same markup as before', () => {
    const { getByRole } = render(<Strip />);
    const list = getByRole('tablist');
    expect(list.hasAttribute('data-align')).toBe(false);
    expect(list.className).not.toContain('-ms-fixed-xs');
    expect(list.className).toBe(
      'flex h-10 items-center gap-fixed-md overflow-x-auto whitespace-nowrap mb-fixed-md [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
    );
  });
});
