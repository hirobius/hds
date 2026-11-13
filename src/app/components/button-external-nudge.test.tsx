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
    expect(link.textContent).toBe('Docs (opens in new tab)');
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

describe('Button external new-tab hint (hds#1537)', () => {
  it('says "(opens in new tab)" in visually hidden text, as InlineLink does', () => {
    render(<Button external>Docs</Button>);
    const btn = screen.getByRole('button');
    const hint = btn.querySelector('.sr-only');
    expect(hint?.textContent).toBe(' (opens in new tab)');
    expect(btn.textContent).toBe('Docs (opens in new tab)');
  });

  it('puts the hint inside an asChild link, so the link name includes it', () => {
    render(
      <Button asChild external>
        <a href="https://example.com">Docs</a>
      </Button>,
    );
    expect(screen.getByRole('link').textContent).toBe('Docs (opens in new tab)');
  });

  it('keeps the hint with an explicit iconRight', () => {
    render(
      <Button external iconRight={<i />}>
        Docs
      </Button>,
    );
    expect(screen.getByRole('button').textContent).toBe('Docs (opens in new tab)');
  });

  it('adds no hint without external', () => {
    render(<Button>Docs</Button>);
    expect(screen.getByRole('button').querySelector('.sr-only')).toBeNull();
  });

  it('shares one hint with InlineLink', async () => {
    const { NewTabHint } = await import('./new-tab-hint');
    const { InlineLink } = await import('./inline-link');
    render(<NewTabHint />);
    const shared = document.body.lastElementChild?.innerHTML;
    cleanup();
    render(<InlineLink href="https://example.com">Docs</InlineLink>);
    expect(screen.getByRole('link').innerHTML).toContain(shared);
  });
});

describe('Button external keeps the hint when an aria-label names it (hds#1537 review)', () => {
  it('appends the hint to label when label replaces the text', () => {
    render(
      <Button external label="Release notes for 0.44">
        Notes
      </Button>,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'Release notes for 0.44 (opens in new tab)',
    );
  });

  it('appends the hint to an aria-label prop', () => {
    render(
      <Button external aria-label="Figma file">
        Figma
      </Button>,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      'Figma file (opens in new tab)',
    );
  });

  it('appends the hint to an aria-label on the slotted link', () => {
    render(
      <Button asChild external>
        <a href="https://example.com" aria-label="Figma file">
          Figma
        </a>
      </Button>,
    );
    expect(screen.getByRole('link').getAttribute('aria-label')).toBe(
      'Figma file (opens in new tab)',
    );
  });

  it('leaves aria-label alone without external', () => {
    render(<Button aria-label="Figma file">Figma</Button>);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Figma file');
  });
});
