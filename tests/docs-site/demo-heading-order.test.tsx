/**
 * Every component page puts its live demo straight under the page h1, before
 * the first h2 ("Best practices"). A demo whose own headings are h3 (Card.Title)
 * broke axe heading-order. ComponentDemo opens the frame with a visually hidden
 * h2, so whatever the demo renders sits one level under it.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

const { ComponentDemo } = await import('../../docs-site/components/component-demo-client');

describe('ComponentDemo heading order', () => {
  it('opens with an h2 before the Card demo’s h3 titles', () => {
    const { container } = render(<ComponentDemo name="Card" />);
    const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    expect(headings[0]?.tagName).toBe('H2');
    expect(headings.some((h) => h.tagName === 'H3')).toBe(true);
  });
});
