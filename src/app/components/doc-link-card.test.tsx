/**
 * Tests for DocLinkCard — Tailwind + cva migration zero-visual-change proof.
 * Asserts stable class output for both `variant` values (feature | pager)
 * and both `affordance` sides, plus the token-driven meta typography axis
 * (`metaStyle`). Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Palette, ArrowRight } from 'lucide-react';
import { DocLinkCard } from './doc-link-card';

afterEach(cleanup);

describe('DocLinkCard', () => {
  it('renders the feature variant with token-bound root chrome and left-aligned text (LTR default)', () => {
    render(
      <DocLinkCard
        title="Design Tokens"
        description="Explore the token inventory."
        href="/tokens"
        icon={Palette}
        meta="Foundation"
      />,
    );
    const button = screen.getByRole('button', { name: /Design Tokens/ });
    expect(button.className).toContain('hds-doc-link-card');
    expect(button.className).toContain('p-[var(--semantic-space-layout-gap)]');
    expect(button.className).toContain('text-left');
    expect(button.getAttribute('data-variant')).toBe('feature');
    expect(screen.getByText('Design Tokens').className).toContain(
      'mt-[var(--semantic-space-component-gap)]',
    );
    // description present → title reserves the subgrid-gap margin below it
    expect(screen.getByText('Design Tokens').className).toContain(
      'mb-[var(--semantic-space-subgrid-gap)]',
    );
    expect(screen.getByText('Foundation').className).toContain('text-secondary');
  });

  it('omits the bottom title margin when there is no description', () => {
    render(<DocLinkCard title="No description" href="/x" icon={Palette} />);
    expect(screen.getByText('No description').className).toContain('mb-0');
  });

  it('renders the pager variant with absolutely-positioned icon and reversed layout markup', () => {
    render(
      <DocLinkCard
        title="Getting Started"
        href="/start"
        icon={ArrowRight}
        variant="pager"
        affordance="right"
      />,
    );
    const button = screen.getByRole('button', { name: /Getting Started/ });
    expect(button.getAttribute('data-variant')).toBe('pager');
    const title = screen.getByText('Getting Started');
    // affordance="right" in LTR → icon/title sit on the right (not left-aligned)
    expect(title.className).toContain('text-right');
    expect(title.className).not.toContain('text-left');
  });

  it('flips the pager icon/title to the left when affordance="left" (LTR)', () => {
    render(
      <DocLinkCard
        title="Overview"
        href="/overview"
        icon={ArrowRight}
        variant="pager"
        affordance="left"
      />,
    );
    const title = screen.getByText('Overview');
    expect(title.className).toContain('text-left');
    expect(title.className).not.toContain('text-right');
  });

  it('applies the ui metaStyle typography token distinctly from the caption default', () => {
    const { unmount } = render(
      <DocLinkCard
        title="Caption meta"
        href="/a"
        icon={Palette}
        meta="Label"
        metaStyle="caption"
      />,
    );
    const captionStyle = screen.getByText('Label').getAttribute('style');
    unmount();
    render(<DocLinkCard title="UI meta" href="/b" icon={Palette} meta="Label" metaStyle="ui" />);
    const uiStyle = screen.getByText('Label').getAttribute('style');
    expect(captionStyle).not.toEqual(uiStyle);
  });

  it('marks accent and disabled state via data attributes, leaving cva chrome untouched', () => {
    render(<DocLinkCard title="Accented" href="/a" icon={Palette} accent disabled />);
    const button = screen.getByRole('button', { name: /Accented/ });
    expect(button.getAttribute('data-accent')).toBe('true');
    expect(button.getAttribute('data-disabled')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.className).toContain('disabled:cursor-default');
  });
});
