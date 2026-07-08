import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pin } from './pin';

describe('Pin', () => {
  it('renders children with the hds-pin class and default top of 0', () => {
    const html = renderToStaticMarkup(<Pin>hi</Pin>);
    expect(html).toContain('class="hds-pin"');
    expect(html).toContain('data-hds-component="Pin"');
    expect(html).toContain('--hds-pin-top:0');
    expect(html).toContain('hi');
  });

  it('sets the sticky offset from the top prop', () => {
    const html = renderToStaticMarkup(<Pin top="24px">x</Pin>);
    expect(html).toContain('--hds-pin-top:24px');
  });

  it('composes an extra className and honors the as prop', () => {
    const html = renderToStaticMarkup(
      <Pin as="aside" className="mt-4">
        x
      </Pin>,
    );
    expect(html).toMatch(/<aside[^>]*class="hds-pin mt-4"/);
  });
});
