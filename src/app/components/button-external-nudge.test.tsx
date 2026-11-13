/**
 * hds#751 (components: indicator / nudge), Button half: a Button with `external`
 * shows the external-link arrow after its label, marked for the shared nudge in
 * theme.css (see external-icon-nudge.test.ts for the motion: eased in and out,
 * a translate, none under reduced motion).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button } from './button';

afterEach(cleanup);

const icon = (el: HTMLElement) => el.querySelector('svg') as SVGElement;

describe('Button external icon nudge (hds#751)', () => {
  it('shows no icon and no group unless external is set', () => {
    render(<Button>Docs</Button>);
    const btn = screen.getByRole('button');
    expect(icon(btn)).toBeNull();
    expect(btn.className).not.toMatch(/hds-ext/);
  });

  it('marks the button as the nudge root and the icon as the nudged element', () => {
    render(<Button external>Docs</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/(^|\s)hds-ext(\s|$)/);
    expect(icon(btn).getAttribute('class') ?? '').toContain('hds-ext-icon');
  });

  it('hides the icon from assistive tech', () => {
    render(<Button external>Docs</Button>);
    expect(icon(screen.getByRole('button')).getAttribute('aria-hidden')).toBe('true');
  });

  it('adds the icon inside an asChild link and keeps the link', () => {
    render(
      <Button asChild external>
        <a href="https://example.com">Docs</a>
      </Button>,
    );
    const link = screen.getByRole('link');
    expect(link.className).toMatch(/(^|\s)hds-ext(\s|$)/);
    expect(link.textContent).toBe('Docs');
    expect(icon(link)).not.toBeNull();
  });

  it('leaves an explicit iconRight alone', () => {
    render(
      <Button external iconRight={<i data-testid="mine" />}>
        Docs
      </Button>,
    );
    expect(screen.getByTestId('mine')).toBeTruthy();
    expect(icon(screen.getByRole('button'))).toBeNull();
  });
});
