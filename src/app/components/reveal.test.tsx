import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Reveal } from './reveal';

describe('Reveal', () => {
  it('renders children with the hds-reveal class and default fade-up', () => {
    const html = renderToStaticMarkup(<Reveal>hi</Reveal>);
    expect(html).toContain('class="hds-reveal"');
    expect(html).toContain('data-reveal="fade-up"');
    expect(html).toContain('data-hds-component="Reveal"');
    expect(html).toContain('hi');
  });

  it('reflects the animation prop on data-reveal', () => {
    for (const a of ['fade', 'fade-up', 'fade-down', 'scale'] as const) {
      const html = renderToStaticMarkup(<Reveal animation={a}>x</Reveal>);
      expect(html).toContain(`data-reveal="${a}"`);
    }
  });

  it('composes an extra className and honors the as prop', () => {
    const html = renderToStaticMarkup(
      <Reveal as="section" className="mt-4">
        x
      </Reveal>,
    );
    expect(html).toMatch(/<section[^>]*class="hds-reveal mt-4"/);
  });
});
