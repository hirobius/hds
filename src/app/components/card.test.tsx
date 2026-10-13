/**
 * Tests for the Card compound assembly (hds#363): the parts hang off the root
 * through one pure `Object.assign`, not top-level property writes, so a
 * Button-only consumer bundle can drop the whole module.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  CardProgress,
  CardMetric,
} from './card';

afterEach(cleanup);

describe('Card compound assembly (hds#363)', () => {
  it('keeps every static part and the display name', () => {
    expect(Card.displayName).toBe('Card');
    expect(Card.Header).toBe(CardHeader);
    expect(Card.Title).toBe(CardTitle);
    expect(Card.Description).toBe(CardDescription);
    expect(Card.Body).toBe(CardBody);
    expect(Card.Footer).toBe(CardFooter);
    expect(Card.Progress).toBe(CardProgress);
    expect(Card.Metric).toBe(CardMetric);
  });

  it('forwards the ref and renders the anatomy', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Card ref={ref} variant="accent" padding="none">
        <Card.Header>
          <Card.Title>Discovery</Card.Title>
        </Card.Header>
        <Card.Body>Body</Card.Body>
      </Card>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('data-variant')).toBe('accent');
    expect(screen.getByText('Discovery')).toBeTruthy();
  });
});

// ── hds#393: selectable ──────────────────────────────────────────────────────

describe('Card selectable (hds#393)', () => {
  it('is a focusable checkbox that reports selected', () => {
    render(
      <Card selectable selected onSelectedChange={() => {}}>
        Plan A
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan A' });
    expect(card.getAttribute('aria-checked')).toBe('true');
    expect(card.tabIndex).toBe(0);
    expect(card.getAttribute('data-selected')).toBe('true');
  });

  it('click asks for the other state; the prop, not the click, decides it', () => {
    const onSelectedChange = vi.fn();
    render(
      <Card selectable selected={false} onSelectedChange={onSelectedChange}>
        Plan B
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan B' });
    fireEvent.click(card);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(card.getAttribute('aria-checked')).toBe('false');
  });

  it('Space toggles and does not scroll the page', () => {
    const onSelectedChange = vi.fn();
    render(
      <Card selectable selected onSelectedChange={onSelectedChange}>
        Plan C
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan C' });
    const notCancelled = fireEvent.keyDown(card, { key: ' ' });
    expect(onSelectedChange).toHaveBeenCalledWith(false);
    expect(notCancelled).toBe(false);
  });

  it('ignores other keys', () => {
    const onSelectedChange = vi.fn();
    render(
      <Card selectable onSelectedChange={onSelectedChange}>
        Plan D
      </Card>,
    );
    fireEvent.keyDown(screen.getByRole('checkbox'), { key: 'Enter' });
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('Space typed in a nested field is left alone', () => {
    const onSelectedChange = vi.fn();
    render(
      <Card selectable onSelectedChange={onSelectedChange}>
        <input aria-label="Note" />
      </Card>,
    );
    const field = screen.getByRole('textbox', { name: 'Note' });
    const notCancelled = fireEvent.keyDown(field, { key: ' ' });
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });

  it('a click on a control inside the card is left to that control', () => {
    const onSelectedChange = vi.fn();
    const onDetails = vi.fn();
    render(
      <Card selectable onSelectedChange={onSelectedChange}>
        <p>Plan F</p>
        <button type="button" onClick={onDetails}>
          Details
        </button>
      </Card>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Plan F'));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it('draws selection inside the edge, apart from the focus outline', () => {
    // hds-focus paints its outline outside the card's edge (a positive
    // outline-offset). Selection must not land on those pixels, or a focused
    // card looks selected and focusing a selected card shows nothing (2.4.7).
    const themeCss = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8');
    const focusRule = themeCss.match(/\.hds-focus:focus-visible\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(focusRule).toMatch(/outline-offset:\s*[1-9]/);

    render(
      <Card selectable selected onSelectedChange={() => {}}>
        Plan E
      </Card>,
    );
    const card = screen.getByRole('checkbox', { name: 'Plan E' });
    const classes = card.className.split(/\s+/);
    expect(classes).toContain('hds-focus');
    const selection = classes.filter((c) => c.startsWith('data-[selected=true]:'));
    expect(selection).toContain('data-[selected=true]:ring-inset');
    expect(selection.filter((c) => c.includes('ring-offset'))).toEqual([]);
    expect(selection.filter((c) => c.includes('outline'))).toEqual([]);
  });

  it('a plain Card stays a plain surface', () => {
    const { container } = render(<Card>Plain</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.hasAttribute('role')).toBe(false);
    expect(card.hasAttribute('tabindex')).toBe(false);
    expect(card.hasAttribute('aria-checked')).toBe(false);
  });
});

describe('Card.Metric deprecation', () => {
  it('is marked deprecated in the manifest with no replacement', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/hds-manifest.json'), 'utf8'),
    );
    const spec = manifest.componentSpecs.CardMetric;
    expect(spec.deprecated).toMatch(/No replacement planned/);
    expect(spec.useInstead).toBeUndefined();
  });

  it('still renders (deprecated, not removed)', () => {
    render(<CardMetric label="Retainer" value="$3,500" sub="Active" />);
    expect(screen.getByText('$3,500')).toBeTruthy();
  });
});

describe('Card asChild (a whole card that is one link)', () => {
  it('renders the card as its child element, with no wrapper', () => {
    const { container } = render(
      <Card asChild>
        <a href="/ops/leads">
          <Card.Title>Leads</Card.Title>
        </a>
      </Card>,
    );
    const link = screen.getByRole('link', { name: 'Leads' });
    expect(link.getAttribute('href')).toBe('/ops/leads');
    // The link IS the card: the root carries the card surface, no div around it.
    expect(container.firstElementChild).toBe(link);
    expect(link.getAttribute('data-variant')).toBe('default');
    expect(link.className).toContain('rounded-lg');
  });

  it('marks the card interactive: a focus ring and the hover lift, none under reduced motion', () => {
    render(
      <Card asChild>
        <a href="/x">Go</a>
      </Card>,
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link.getAttribute('data-interactive')).toBe('true');
    expect(link.className).toContain('hds-focus');
    expect(link.className).toContain('hover:scale-102');
    expect(link.className).toContain('motion-reduce:hover:scale-100');
    // Tailwind 4 `scale-*` sets the `scale` property, so that is what must ease.
    expect(link.className).toContain('transition-[scale,box-shadow]');
  });

  it('keeps a plain Card non-interactive', () => {
    const { container } = render(<Card>Plain</Card>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe('DIV');
    expect(root.hasAttribute('data-interactive')).toBe(false);
    expect(root.className).not.toContain('hover:scale-102');
  });
});
