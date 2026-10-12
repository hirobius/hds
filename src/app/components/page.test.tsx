import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Page } from './page';

afterEach(cleanup);

const shell = (c: HTMLElement) => c.querySelector('[data-hds-component="Page"]') as HTMLElement;

describe('Page', () => {
  // Layout contract v1 rule 2: Page is one of the containers that pads. Without a
  // side gutter, every page touched the screen edge below the 1200px max width.
  it('pads both sides with the responsive region gutter', () => {
    const { container } = render(<Page>content</Page>);
    expect(shell(container).style.paddingInline).toBe('var(--semantic-space-region-gutter)');
  });

  it('keeps its vertical padding steps', () => {
    const { container } = render(<Page paddingY="none">content</Page>);
    expect(shell(container).style.paddingTop).toBe('0px');
    expect(shell(container).style.paddingInline).toBe('var(--semantic-space-region-gutter)');
  });

  it('lets a page opt out of the gutter through style', () => {
    const { container } = render(<Page style={{ paddingInline: 0 }}>full bleed</Page>);
    expect(shell(container).style.paddingInline).toBe('0px');
  });
});
