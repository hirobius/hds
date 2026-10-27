import { createRef } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Box } from './box';

afterEach(cleanup);

describe('Box', () => {
  it('renders a div by default and forwards children', () => {
    render(<Box>content</Box>);
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    render(
      <Box as="section" data-testid="box">
        content
      </Box>,
    );
    expect(screen.getByTestId('box').tagName).toBe('SECTION');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Box ref={ref}>content</Box>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('merges the generated sx class with a caller-provided className', () => {
    render(
      <Box sx={{ p: 'xs' }} className="hds-caller-class" data-testid="box">
        content
      </Box>,
    );
    const el = screen.getByTestId('box');
    expect(el.className).toContain('hds-caller-class');
    expect(el.className).toMatch(/hds-sx-/);
  });

  it('renders without an sx class when sx is omitted', () => {
    render(
      <Box className="hds-only-class" data-testid="box">
        content
      </Box>,
    );
    expect(screen.getByTestId('box').className).toBe('hds-only-class');
  });

  it('applies the resolved sx CSS to the element', () => {
    render(
      <Box sx={{ color: 'content.primary' }} data-testid="box">
        content
      </Box>,
    );
    const el = screen.getByTestId('box');
    const sheetRules = Array.from(document.querySelectorAll('style[data-hds-sx]'))
      .flatMap((style) => Array.from((style as HTMLStyleElement).sheet?.cssRules ?? []))
      .map((r) => r.cssText);
    expect(sheetRules.some((r) => r.includes('color: var(--semantic-color-content-primary)'))).toBe(
      true,
    );
    expect(el.className).toMatch(/hds-sx-/);
  });

  it('server-renders its sx rules as a React 19 style resource (hds#770)', async () => {
    vi.resetModules();
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return { ...actual, default: { ...actual, version: '19.0.0' }, version: '19.0.0' };
    });
    try {
      const { Box: Box19 } = await import('./box');
      const { renderToStaticMarkup } = await import('react-dom/server');
      const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
      const html = renderToStaticMarkup(<Box19 sx={{ color: 'content.primary' }}>content</Box19>);
      silence.mockRestore();
      const cls = /class="(hds-sx-[^"\s]+)/.exec(html)?.[1];
      expect(cls).toBeTruthy();
      expect(html).toContain(`href="${cls}"`);
      expect(html).toContain(`.${cls}{color:var(--semantic-color-content-primary)}`);
    } finally {
      vi.doUnmock('react');
      vi.resetModules();
    }
  });
});
